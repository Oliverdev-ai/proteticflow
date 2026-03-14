import logging
from datetime import date, timedelta
from decimal import Decimal

from celery import shared_task
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.db.models import Sum, Count

logger = logging.getLogger(__name__)


@shared_task(name='apps.financial.tasks.generate_monthly_closing')
def generate_monthly_closing():
    """
    Executa no dia 1 de cada mês (via Celery Beat).
    Agrega os Jobs COMP do mês anterior e grava um FinancialClosing.
    """
    from apps.financial.models import FinancialClosing
    from apps.jobs.models import Job

    today = date.today()
    # Mês anterior
    first_day = date(today.year if today.month > 1 else today.year - 1,
                     today.month - 1 if today.month > 1 else 12, 1)
    last_day = today - timedelta(days=1)  # dia anterior ao dia 1 atual

    # Evitar duplicata
    if FinancialClosing.objects.filter(
        closing_type='monthly', period_start=first_day, period_end=last_day
    ).exists():
        logger.info(f'Fechamento mensal {first_day} já existe. Pulando.')
        return {'skipped': True}

    completed_jobs = Job.objects.filter(
        status='COMP',
        updated_at__date__gte=first_day,
        updated_at__date__lte=last_day,
    )

    agg = completed_jobs.aggregate(
        total_revenue=Sum('total_price'),
        total_jobs=Count('id'),
        total_clients=Count('client', distinct=True),
    )

    # Breakdown por tipo de prótese
    by_type = (
        completed_jobs.values('prosthesis_type')
        .annotate(count=Count('id'), revenue=Sum('total_price'))
        .order_by('-revenue')
    )

    closing = FinancialClosing.objects.create(
        closing_type='monthly',
        period_start=first_day,
        period_end=last_day,
        total_revenue=agg['total_revenue'] or Decimal('0.00'),
        total_jobs=agg['total_jobs'] or 0,
        total_clients=agg['total_clients'] or 0,
        breakdown_data={
            'by_prosthesis_type': list(by_type),
            'period': {'start': str(first_day), 'end': str(last_day)},
        },
    )

    # Gerar comissões automaticamente para cada técnico
    _generate_commissions_for_period(completed_jobs, first_day, last_day)

    logger.info(
        f'Fechamento mensal criado: {closing.id} | '
        f'Jobs: {closing.total_jobs} | Receita: R$ {closing.total_revenue}'
    )
    return {
        'closing_id': closing.id,
        'period': f'{first_day} → {last_day}',
        'total_revenue': str(closing.total_revenue),
        'total_jobs': closing.total_jobs,
    }


def _generate_commissions_for_period(completed_jobs, start_date, end_date):
    """Helper: gera CommissionPayment para cada técnico com assignments no período."""
    from apps.employees.models import EmployeeProfile, JobAssignment, CommissionPayment
    from datetime import date

    technicians = EmployeeProfile.objects.filter(
        job_assignments__job__in=completed_jobs,
        job_assignments__is_completed=True,
    ).distinct()

    for tech in technicians:
        assignments = JobAssignment.objects.filter(
            employee=tech,
            job__in=completed_jobs,
            is_completed=True,
            commission_amount__gt=0,
        )
        if not assignments.exists():
            continue

        # Evitar duplicata por período
        if CommissionPayment.objects.filter(
            employee=tech,
            start_period=start_date,
            end_period=end_date,
        ).exists():
            continue

        total = assignments.aggregate(Sum('commission_amount'))['commission_amount__sum'] or Decimal('0')

        payment = CommissionPayment.objects.create(
            employee=tech,
            payment_date=date.today(),      # BUG FIX: payment_date is mandatory
            start_period=start_date,
            end_period=end_date,
            total_amount=total,
            payment_method='A Pagar',       # BUG FIX: more descriptive
        )

        # Criar itens individuais
        from apps.employees.models import CommissionPaymentItem
        for a in assignments:
            CommissionPaymentItem.objects.create(
                payment=payment,
                job_assignment=a,
                amount=a.commission_amount,
            )

        logger.info(f'Comissão gerada para {tech}: R$ {total}')


@shared_task(name='apps.financial.tasks.send_overdue_reminders')
def send_overdue_reminders():
    """
    Executa diariamente às 08h (via Celery Beat).
    Envia e-mail para clientes com contas vencendo em 3 dias
    e marca como 'overdue' as que já venceram.
    """
    from apps.financial.models import AccountsReceivable

    today = date.today()
    in_3_days = today + timedelta(days=3)

    # Vencendo em exatamente 3 dias → enviar lembrete
    # BUG FIX: Status choices are 'pending' (lowercase)
    upcoming = AccountsReceivable.objects.filter(
        due_date=in_3_days,
        status='pending',
        client__email__isnull=False,
    ).select_related('client', 'job')

    sent = 0
    for ar in upcoming:
        if not ar.client.email:
            continue
        try:
            _send_invoice_email(ar, reminder=True)
            sent += 1
        except Exception as e:
            logger.error(f'Erro ao enviar lembrete para {ar.client.email}: {e}')

    # Marcar vencidas
    # BUG FIX: Status choices are 'pending' (lowercase)
    overdue_count = AccountsReceivable.objects.filter(
        due_date__lt=today,
        status='pending',
    ).update(status='overdue')

    logger.info(f'Lembretes enviados: {sent} | Marcadas vencidas: {overdue_count}')
    return {'sent': sent, 'marked_overdue': overdue_count}


@shared_task(name='apps.financial.tasks.send_invoice_email')
def send_invoice_email(accounts_receivable_id: int):
    """
    Task avulsa: envia e-mail de cobrança para uma AR específica.
    Chamada manualmente via endpoint ou pelo frontend.
    """
    from apps.financial.models import AccountsReceivable
    try:
        ar = AccountsReceivable.objects.select_related('client', 'job').get(
            pk=accounts_receivable_id
        )
        _send_invoice_email(ar, reminder=False)
        logger.info(f'E-mail de cobrança enviado para {ar.client.email} | AR {ar.id}')
        return {'success': True, 'email': ar.client.email}
    except AccountsReceivable.DoesNotExist:
        logger.error(f'AccountsReceivable {accounts_receivable_id} não encontrada.')
        return {'success': False, 'error': 'Not found'}
    except Exception as e:
        logger.error(f'Erro ao enviar e-mail de cobrança: {e}')
        return {'success': False, 'error': str(e)}


def _send_invoice_email(ar, reminder: bool = False):
    """Helper interno: monta e envia o e-mail."""
    from apps.financial.models import LabSettings
    from django.conf import settings as django_settings

    lab = LabSettings.objects.first()
    lab_name = lab.lab_name if lab else 'ProteticFlow Lab'
    from_email = (lab.email if lab and lab.email else None) or \
                 django_settings.EMAIL_HOST_USER or \
                 'noreply@proteticflow.com'

    subject = (
        f'[LEMBRETE] Conta vence em 3 dias — {lab_name}'
        if reminder else
        f'Cobrança — Trabalho {ar.job.order_number} — {lab_name}'
    )

    context = {
        'lab_name':    lab_name,
        'client_name': ar.client.name,
        'job_number':  ar.job.order_number,
        'amount':      ar.adjusted_amount or ar.amount,
        'due_date':    ar.due_date,
        'reminder':    reminder,
        'lab_phone':   lab.phone if lab else '',
        'lab_email':   lab.email if lab else '',
    }

    html_body = render_to_string('financial/invoice_email.html', context)

    email = EmailMessage(
        subject=subject,
        body=html_body,
        from_email=from_email,
        to=[ar.client.email],
    )
    email.content_subtype = 'html'
    email.send(fail_silently=False)
