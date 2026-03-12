from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from decimal import Decimal


class PayrollPeriod(models.Model):
    """Período de folha de pagamento"""

    year = models.IntegerField(_('Ano'))
    month = models.IntegerField(_('Mês'))
    reference_date = models.DateField(_('Data de Referência'))

    is_closed = models.BooleanField(_('Fechada'), default=False)
    closed_at = models.DateTimeField(_('Fechada em'), null=True, blank=True)
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='closed_payrolls',
        verbose_name=_('Fechada por')
    )

    total_gross_salary = models.DecimalField(_('Total Salário Bruto'),  max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_deductions   = models.DecimalField(_('Total Descontos'),      max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_net_salary   = models.DecimalField(_('Total Salário Líquido'), max_digits=12, decimal_places=2, default=Decimal('0.00'))

    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)

    class Meta:
        verbose_name = _('Período de Folha')
        verbose_name_plural = _('Períodos de Folha')
        unique_together = ['year', 'month']
        ordering = ['-year', '-month']

    def __str__(self):
        return f"Folha {self.month:02d}/{self.year}"


class PayrollEntry(models.Model):
    """Entrada individual na folha de pagamento — referencia EmployeeProfile (modelo canônico)."""

    period = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.CASCADE,
        related_name='entries',
        verbose_name=_('Período')
    )
    # FK agora aponta diretamente para o modelo canônico de funcionários
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='payroll_entries',
        verbose_name=_('Funcionário')
    )

    # Valores base
    base_salary   = models.DecimalField(_('Salário Base'),      max_digits=10, decimal_places=2)
    worked_days   = models.IntegerField(_('Dias Trabalhados'),   default=30)
    worked_hours  = models.DecimalField(_('Horas Trabalhadas'),  max_digits=6,  decimal_places=2, default=Decimal('220.00'))

    # Adicionais
    overtime_hours  = models.DecimalField(_('Horas Extras'),        max_digits=6,  decimal_places=2, default=Decimal('0.00'))
    overtime_amount = models.DecimalField(_('Valor Horas Extras'),   max_digits=10, decimal_places=2, default=Decimal('0.00'))
    bonus           = models.DecimalField(_('Bonificação'),          max_digits=10, decimal_places=2, default=Decimal('0.00'))
    commission      = models.DecimalField(_('Comissão'),             max_digits=10, decimal_places=2, default=Decimal('0.00'))

    # Benefícios
    transport_allowance = models.DecimalField(_('Vale Transporte'), max_digits=8,  decimal_places=2, default=Decimal('0.00'))
    meal_allowance      = models.DecimalField(_('Vale Refeição'),   max_digits=8,  decimal_places=2, default=Decimal('0.00'))

    # Descontos
    inss_discount             = models.DecimalField(_('Desconto INSS'),          max_digits=10, decimal_places=2, default=Decimal('0.00'))
    irrf_discount             = models.DecimalField(_('Desconto IRRF'),          max_digits=10, decimal_places=2, default=Decimal('0.00'))
    health_insurance_discount = models.DecimalField(_('Desconto Plano de Saúde'), max_digits=8,  decimal_places=2, default=Decimal('0.00'))
    other_discounts           = models.DecimalField(_('Outros Descontos'),        max_digits=10, decimal_places=2, default=Decimal('0.00'))

    # Totais calculados
    gross_salary     = models.DecimalField(_('Salário Bruto'),   max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_deductions = models.DecimalField(_('Total Descontos'), max_digits=12, decimal_places=2, default=Decimal('0.00'))
    net_salary       = models.DecimalField(_('Salário Líquido'), max_digits=12, decimal_places=2, default=Decimal('0.00'))

    notes = models.TextField(_('Observações'), blank=True)

    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)

    class Meta:
        verbose_name = _('Entrada de Folha')
        verbose_name_plural = _('Entradas de Folha')
        unique_together = ['period', 'employee']
        ordering = ['employee__name']

    def __str__(self):
        return f"{self.employee.name} - {self.period}"

    def calculate_totals(self):
        self.gross_salary = (
            self.base_salary + self.overtime_amount + self.bonus + self.commission
        )
        self.total_deductions = (
            self.inss_discount + self.irrf_discount +
            self.health_insurance_discount + self.other_discounts
        )
        self.net_salary = (
            self.gross_salary - self.total_deductions +
            self.transport_allowance + self.meal_allowance
        )

    def save(self, *args, **kwargs):
        self.calculate_totals()
        super().save(*args, **kwargs)


class FinancialReport(models.Model):
    """Relatórios financeiros do laboratório"""

    class ReportType(models.TextChoices):
        MONTHLY_CLOSING = 'monthly_closing', _('Fechamento Mensal')
        ANNUAL_BALANCE  = 'annual_balance',  _('Balanço Anual')
        CASH_FLOW       = 'cash_flow',       _('Fluxo de Caixa')
        PROFIT_LOSS     = 'profit_loss',     _('DRE - Demonstração de Resultado')

    report_type = models.CharField(_('Tipo de Relatório'), max_length=20, choices=ReportType.choices)

    start_date = models.DateField(_('Data Início'))
    end_date   = models.DateField(_('Data Fim'))
    year       = models.IntegerField(_('Ano'))
    month      = models.IntegerField(_('Mês'), null=True, blank=True)

    total_revenue        = models.DecimalField(_('Receita Total'),         max_digits=15, decimal_places=2, default=Decimal('0.00'))
    total_expenses       = models.DecimalField(_('Despesas Totais'),       max_digits=15, decimal_places=2, default=Decimal('0.00'))
    payroll_expenses     = models.DecimalField(_('Despesas com Folha'),    max_digits=15, decimal_places=2, default=Decimal('0.00'))
    operational_expenses = models.DecimalField(_('Despesas Operacionais'), max_digits=15, decimal_places=2, default=Decimal('0.00'))
    net_profit           = models.DecimalField(_('Lucro Líquido'),         max_digits=15, decimal_places=2, default=Decimal('0.00'))

    total_jobs      = models.IntegerField(_('Total de Trabalhos'),    default=0)
    completed_jobs  = models.IntegerField(_('Trabalhos Concluídos'),  default=0)
    pending_jobs    = models.IntegerField(_('Trabalhos Pendentes'),   default=0)

    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='generated_reports',
        verbose_name=_('Gerado por')
    )
    report_data = models.JSONField(_('Dados do Relatório'), default=dict)

    created_at = models.DateTimeField(_('Gerado em'), auto_now_add=True)

    class Meta:
        verbose_name = _('Relatório Financeiro')
        verbose_name_plural = _('Relatórios Financeiros')
        ordering = ['-created_at']

    def __str__(self):
        if self.month:
            return f"{self.get_report_type_display()} - {self.month:02d}/{self.year}"
        return f"{self.get_report_type_display()} - {self.year}"
