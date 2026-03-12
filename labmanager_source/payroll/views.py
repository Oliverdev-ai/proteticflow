from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import calendar

from .models import PayrollPeriod, PayrollEntry, FinancialReport
from .serializers import (
    PayrollPeriodSerializer,
    PayrollEntrySerializer,
    FinancialReportSerializer,
)
from apps.employees.models import EmployeeProfile
from apps.jobs.models import Job


# ── Períodos de Folha ─────────────────────────────────────────────────────────

class PayrollPeriodListCreateView(generics.ListCreateAPIView):
    queryset = PayrollPeriod.objects.all()
    serializer_class = PayrollPeriodSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        year = serializer.validated_data['year']
        month = serializer.validated_data['month']
        last_day = calendar.monthrange(year, month)[1]
        reference_date = datetime(year, month, last_day).date()
        serializer.save(reference_date=reference_date)


class PayrollPeriodDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PayrollPeriod.objects.all()
    serializer_class = PayrollPeriodSerializer
    permission_classes = [IsAuthenticated]


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def close_payroll_period(request, period_id):
    """Fecha um período de folha de pagamento"""
    try:
        period = PayrollPeriod.objects.get(id=period_id)

        if period.is_closed:
            return Response({'error': 'Este período já está fechado'}, status=status.HTTP_400_BAD_REQUEST)

        entries = period.entries.all()
        total_gross = entries.aggregate(Sum('gross_salary'))['gross_salary__sum'] or Decimal('0.00')
        total_deductions = entries.aggregate(Sum('total_deductions'))['total_deductions__sum'] or Decimal('0.00')
        total_net = entries.aggregate(Sum('net_salary'))['net_salary__sum'] or Decimal('0.00')

        period.total_gross_salary = total_gross
        period.total_deductions = total_deductions
        period.total_net_salary = total_net
        period.is_closed = True
        period.closed_at = timezone.now()
        period.closed_by = request.user
        period.save()

        return Response({'message': 'Período fechado com sucesso', 'period': PayrollPeriodSerializer(period).data})

    except PayrollPeriod.DoesNotExist:
        return Response({'error': 'Período não encontrado'}, status=status.HTTP_404_NOT_FOUND)


# ── Entradas de Folha ─────────────────────────────────────────────────────────

class PayrollEntryListCreateView(generics.ListCreateAPIView):
    serializer_class = PayrollEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = PayrollEntry.objects.select_related('employee', 'period').all()
        period_id = self.request.query_params.get('period')
        if period_id:
            queryset = queryset.filter(period_id=period_id)
        return queryset.order_by('employee__name')


class PayrollEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PayrollEntry.objects.select_related('employee', 'period').all()
    serializer_class = PayrollEntrySerializer
    permission_classes = [IsAuthenticated]


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_payroll_entries(request, period_id):
    """Gera entradas de folha para todos os funcionários ativos (usa EmployeeProfile)."""
    try:
        period = PayrollPeriod.objects.get(id=period_id)

        if period.is_closed:
            return Response(
                {'error': 'Não é possível gerar entradas para um período fechado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        active_employees = EmployeeProfile.objects.filter(is_active=True)
        created_entries = []

        for employee in active_employees:
            entry, created = PayrollEntry.objects.get_or_create(
                period=period,
                employee=employee,
                defaults={
                    'base_salary':          employee.base_salary,
                    'transport_allowance':  employee.transport_allowance,
                    'meal_allowance':       employee.meal_allowance,
                }
            )
            if created:
                created_entries.append(entry)

        return Response({
            'message': f'{len(created_entries)} entradas criadas com sucesso',
            'created_count': len(created_entries),
            'total_employees': active_employees.count(),
        })

    except PayrollPeriod.DoesNotExist:
        return Response({'error': 'Período não encontrado'}, status=status.HTTP_404_NOT_FOUND)


# ── Relatórios Financeiros ────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_monthly_closing(request):
    """Gera fechamento mensal"""
    year  = request.data.get('year',  timezone.now().year)
    month = request.data.get('month', timezone.now().month)

    try:
        start_date = datetime(year, month, 1).date()
        last_day   = calendar.monthrange(year, month)[1]
        end_date   = datetime(year, month, last_day).date()

        jobs_period    = Job.objects.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
        completed_jobs = jobs_period.filter(status='completed')
        total_revenue  = completed_jobs.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')

        try:
            payroll_period   = PayrollPeriod.objects.get(year=year, month=month)
            payroll_expenses = payroll_period.total_net_salary
        except PayrollPeriod.DoesNotExist:
            payroll_expenses = Decimal('0.00')

        total_jobs         = jobs_period.count()
        completed_jobs_count = completed_jobs.count()
        pending_jobs_count   = jobs_period.filter(status='pending').count()
        operational_expenses = total_revenue * Decimal('0.30')
        total_expenses       = payroll_expenses + operational_expenses
        net_profit           = total_revenue - total_expenses

        report = FinancialReport.objects.create(
            report_type='monthly_closing',
            start_date=start_date, end_date=end_date,
            year=year, month=month,
            total_revenue=total_revenue, total_expenses=total_expenses,
            payroll_expenses=payroll_expenses, operational_expenses=operational_expenses,
            net_profit=net_profit, total_jobs=total_jobs,
            completed_jobs=completed_jobs_count, pending_jobs=pending_jobs_count,
            generated_by=request.user,
            report_data={
                'period': f"{month:02d}/{year}",
                'revenue_breakdown': {'completed_jobs': float(total_revenue), 'jobs_count': completed_jobs_count},
                'expense_breakdown': {'payroll': float(payroll_expenses), 'operational': float(operational_expenses), 'total': float(total_expenses)},
                'profitability': {
                    'gross_margin': float((total_revenue - operational_expenses) / total_revenue * 100) if total_revenue > 0 else 0,
                    'net_margin':   float(net_profit / total_revenue * 100) if total_revenue > 0 else 0,
                },
            }
        )

        return Response({'message': 'Fechamento mensal gerado com sucesso', 'report': FinancialReportSerializer(report).data})

    except Exception as e:
        return Response({'error': f'Erro ao gerar fechamento: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_annual_balance(request):
    """Gera balanço anual"""
    year = request.data.get('year', timezone.now().year)

    try:
        start_date = datetime(year, 1, 1).date()
        end_date   = datetime(year, 12, 31).date()

        jobs_year      = Job.objects.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
        completed_jobs = jobs_year.filter(status='completed')
        total_revenue  = completed_jobs.aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')

        payroll_periods  = PayrollPeriod.objects.filter(year=year)
        payroll_expenses = payroll_periods.aggregate(Sum('total_net_salary'))['total_net_salary__sum'] or Decimal('0.00')

        monthly_data = []
        for month in range(1, 13):
            month_start = datetime(year, month, 1).date()
            month_end   = datetime(year, month, calendar.monthrange(year, month)[1]).date()
            month_jobs  = jobs_year.filter(created_at__date__gte=month_start, created_at__date__lte=month_end)
            month_revenue = month_jobs.filter(status='completed').aggregate(Sum('total_price'))['total_price__sum'] or Decimal('0.00')
            try:
                month_payroll_expense = PayrollPeriod.objects.get(year=year, month=month).total_net_salary
            except PayrollPeriod.DoesNotExist:
                month_payroll_expense = Decimal('0.00')

            monthly_data.append({
                'month': month, 'month_name': calendar.month_name[month],
                'revenue': float(month_revenue), 'payroll_expense': float(month_payroll_expense),
                'jobs_count': month_jobs.count(), 'completed_jobs': month_jobs.filter(status='completed').count(),
            })

        total_jobs           = jobs_year.count()
        completed_jobs_count = completed_jobs.count()
        pending_jobs_count   = jobs_year.filter(status='pending').count()
        operational_expenses = total_revenue * Decimal('0.30')
        total_expenses       = payroll_expenses + operational_expenses
        net_profit           = total_revenue - total_expenses

        report = FinancialReport.objects.create(
            report_type='annual_balance',
            start_date=start_date, end_date=end_date, year=year,
            total_revenue=total_revenue, total_expenses=total_expenses,
            payroll_expenses=payroll_expenses, operational_expenses=operational_expenses,
            net_profit=net_profit, total_jobs=total_jobs,
            completed_jobs=completed_jobs_count, pending_jobs=pending_jobs_count,
            generated_by=request.user,
            report_data={
                'year': year, 'monthly_breakdown': monthly_data,
                'annual_summary': {'total_revenue': float(total_revenue), 'total_expenses': float(total_expenses), 'net_profit': float(net_profit),
                                   'profit_margin': float(net_profit / total_revenue * 100) if total_revenue > 0 else 0},
                'operational_metrics': {'total_jobs': total_jobs, 'completed_jobs': completed_jobs_count,
                                        'completion_rate': float(completed_jobs_count / total_jobs * 100) if total_jobs > 0 else 0,
                                        'average_job_value': float(total_revenue / completed_jobs_count) if completed_jobs_count > 0 else 0},
            }
        )

        return Response({'message': 'Balanço anual gerado com sucesso', 'report': FinancialReportSerializer(report).data})

    except Exception as e:
        return Response({'error': f'Erro ao gerar balanço: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FinancialReportListView(generics.ListAPIView):
    queryset = FinancialReport.objects.all()
    serializer_class = FinancialReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = FinancialReport.objects.all()
        if report_type := self.request.query_params.get('type'):
            queryset = queryset.filter(report_type=report_type)
        if year := self.request.query_params.get('year'):
            queryset = queryset.filter(year=year)
        return queryset.order_by('-created_at')
