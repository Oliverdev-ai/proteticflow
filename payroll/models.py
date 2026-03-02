from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from decimal import Decimal


class Employee(models.Model):
    """Modelo para funcionários do laboratório"""
    
    class EmployeeType(models.TextChoices):
        TECHNICIAN = 'technician', _('Técnico em Prótese')
        ASSISTANT = 'assistant', _('Auxiliar')
        RECEPTIONIST = 'receptionist', _('Recepcionista')
        MANAGER = 'manager', _('Gerente')
        OWNER = 'owner', _('Proprietário')
        OTHER = 'other', _('Outro')
    
    class ContractType(models.TextChoices):
        CLT = 'clt', _('CLT')
        FREELANCER = 'freelancer', _('Freelancer')
        INTERN = 'intern', _('Estagiário')
        PARTNER = 'partner', _('Sócio')
    
    # Dados pessoais
    full_name = models.CharField(_('Nome Completo'), max_length=255)
    cpf = models.CharField(_('CPF'), max_length=14, unique=True)
    rg = models.CharField(_('RG'), max_length=20, blank=True)
    birth_date = models.DateField(_('Data de Nascimento'))
    
    # Contato
    phone = models.CharField(_('Telefone'), max_length=20)
    email = models.EmailField(_('Email'), blank=True)
    
    # Endereço
    address_street = models.CharField(_('Rua'), max_length=255)
    address_number = models.CharField(_('Número'), max_length=20)
    address_complement = models.CharField(_('Complemento'), max_length=100, blank=True)
    address_neighborhood = models.CharField(_('Bairro'), max_length=100)
    address_city = models.CharField(_('Cidade'), max_length=100)
    address_state = models.CharField(_('Estado'), max_length=2)
    address_zip_code = models.CharField(_('CEP'), max_length=10)
    
    # Dados profissionais
    employee_type = models.CharField(
        _('Tipo de Funcionário'),
        max_length=20,
        choices=EmployeeType.choices
    )
    contract_type = models.CharField(
        _('Tipo de Contrato'),
        max_length=20,
        choices=ContractType.choices
    )
    
    # Dados contratuais
    hire_date = models.DateField(_('Data de Admissão'))
    termination_date = models.DateField(_('Data de Demissão'), null=True, blank=True)
    base_salary = models.DecimalField(
        _('Salário Base'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Benefícios
    transport_allowance = models.DecimalField(
        _('Vale Transporte'),
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00')
    )
    meal_allowance = models.DecimalField(
        _('Vale Refeição'),
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00')
    )
    health_insurance = models.DecimalField(
        _('Plano de Saúde'),
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Dados bancários
    bank_name = models.CharField(_('Banco'), max_length=100, blank=True)
    bank_agency = models.CharField(_('Agência'), max_length=20, blank=True)
    bank_account = models.CharField(_('Conta'), max_length=30, blank=True)
    
    # Status
    is_active = models.BooleanField(_('Ativo'), default=True)
    
    # Relacionamento com usuário do sistema (opcional)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employee_profile',
        verbose_name=_('Usuário do Sistema')
    )
    
    # Metadados
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('Funcionário')
        verbose_name_plural = _('Funcionários')
        ordering = ['full_name']
    
    def __str__(self):
        return self.full_name
    
    @property
    def is_employed(self):
        """Verifica se o funcionário está atualmente empregado"""
        return self.is_active and self.termination_date is None


class PayrollPeriod(models.Model):
    """Período de folha de pagamento"""
    
    year = models.IntegerField(_('Ano'))
    month = models.IntegerField(_('Mês'))
    reference_date = models.DateField(_('Data de Referência'))
    
    # Status da folha
    is_closed = models.BooleanField(_('Fechada'), default=False)
    closed_at = models.DateTimeField(_('Fechada em'), null=True, blank=True)
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='closed_payrolls',
        verbose_name=_('Fechada por')
    )
    
    # Totais
    total_gross_salary = models.DecimalField(
        _('Total Salário Bruto'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_deductions = models.DecimalField(
        _('Total Descontos'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_net_salary = models.DecimalField(
        _('Total Salário Líquido'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
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
    """Entrada individual na folha de pagamento"""
    
    period = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.CASCADE,
        related_name='entries',
        verbose_name=_('Período')
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='payroll_entries',
        verbose_name=_('Funcionário')
    )
    
    # Valores base
    base_salary = models.DecimalField(
        _('Salário Base'),
        max_digits=10,
        decimal_places=2
    )
    worked_days = models.IntegerField(_('Dias Trabalhados'), default=30)
    worked_hours = models.DecimalField(
        _('Horas Trabalhadas'),
        max_digits=6,
        decimal_places=2,
        default=Decimal('220.00')
    )
    
    # Adicionais
    overtime_hours = models.DecimalField(
        _('Horas Extras'),
        max_digits=6,
        decimal_places=2,
        default=Decimal('0.00')
    )
    overtime_amount = models.DecimalField(
        _('Valor Horas Extras'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    bonus = models.DecimalField(
        _('Bonificação'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    commission = models.DecimalField(
        _('Comissão'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Benefícios
    transport_allowance = models.DecimalField(
        _('Vale Transporte'),
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00')
    )
    meal_allowance = models.DecimalField(
        _('Vale Refeição'),
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Descontos
    inss_discount = models.DecimalField(
        _('Desconto INSS'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    irrf_discount = models.DecimalField(
        _('Desconto IRRF'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    health_insurance_discount = models.DecimalField(
        _('Desconto Plano de Saúde'),
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00')
    )
    other_discounts = models.DecimalField(
        _('Outros Descontos'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Totais calculados
    gross_salary = models.DecimalField(
        _('Salário Bruto'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_deductions = models.DecimalField(
        _('Total Descontos'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    net_salary = models.DecimalField(
        _('Salário Líquido'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Observações
    notes = models.TextField(_('Observações'), blank=True)
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('Entrada de Folha')
        verbose_name_plural = _('Entradas de Folha')
        unique_together = ['period', 'employee']
        ordering = ['employee__full_name']
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.period}"
    
    def calculate_totals(self):
        """Calcula os totais da entrada"""
        # Salário bruto = salário base + horas extras + bonificação + comissão
        self.gross_salary = (
            self.base_salary + 
            self.overtime_amount + 
            self.bonus + 
            self.commission
        )
        
        # Total de descontos
        self.total_deductions = (
            self.inss_discount + 
            self.irrf_discount + 
            self.health_insurance_discount + 
            self.other_discounts
        )
        
        # Salário líquido = salário bruto - descontos + benefícios
        self.net_salary = (
            self.gross_salary - 
            self.total_deductions + 
            self.transport_allowance + 
            self.meal_allowance
        )
    
    def save(self, *args, **kwargs):
        self.calculate_totals()
        super().save(*args, **kwargs)


class FinancialReport(models.Model):
    """Relatórios financeiros do laboratório"""
    
    class ReportType(models.TextChoices):
        MONTHLY_CLOSING = 'monthly_closing', _('Fechamento Mensal')
        ANNUAL_BALANCE = 'annual_balance', _('Balanço Anual')
        CASH_FLOW = 'cash_flow', _('Fluxo de Caixa')
        PROFIT_LOSS = 'profit_loss', _('DRE - Demonstração de Resultado')
    
    report_type = models.CharField(
        _('Tipo de Relatório'),
        max_length=20,
        choices=ReportType.choices
    )
    
    # Período
    start_date = models.DateField(_('Data Início'))
    end_date = models.DateField(_('Data Fim'))
    year = models.IntegerField(_('Ano'))
    month = models.IntegerField(_('Mês'), null=True, blank=True)
    
    # Dados financeiros
    total_revenue = models.DecimalField(
        _('Receita Total'),
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_expenses = models.DecimalField(
        _('Despesas Totais'),
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    payroll_expenses = models.DecimalField(
        _('Despesas com Folha'),
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    operational_expenses = models.DecimalField(
        _('Despesas Operacionais'),
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    net_profit = models.DecimalField(
        _('Lucro Líquido'),
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Dados operacionais
    total_jobs = models.IntegerField(_('Total de Trabalhos'), default=0)
    completed_jobs = models.IntegerField(_('Trabalhos Concluídos'), default=0)
    pending_jobs = models.IntegerField(_('Trabalhos Pendentes'), default=0)
    
    # Metadados do relatório
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_reports',
        verbose_name=_('Gerado por')
    )
    report_data = models.JSONField(
        _('Dados do Relatório'),
        default=dict,
        help_text=_('Dados detalhados do relatório em formato JSON')
    )
    
    created_at = models.DateTimeField(_('Gerado em'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Relatório Financeiro')
        verbose_name_plural = _('Relatórios Financeiros')
        ordering = ['-created_at']
    
    def __str__(self):
        if self.month:
            return f"{self.get_report_type_display()} - {self.month:02d}/{self.year}"
        return f"{self.get_report_type_display()} - {self.year}"

