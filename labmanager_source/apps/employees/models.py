from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.core.models import TimeStampedModel

class EmployeeProfile(TimeStampedModel):
    """Model to store information about employees — canonical employee record."""

    class EmployeeType(models.TextChoices):
        TECHNICIAN   = 'technician',   _('Técnico em Prótese')
        ASSISTANT    = 'assistant',    _('Auxiliar')
        RECEPTIONIST = 'receptionist', _('Recepcionista')
        MANAGER      = 'manager',      _('Gerente')
        OWNER        = 'owner',        _('Proprietário')
        OTHER        = 'other',        _('Outro')

    class ContractType(models.TextChoices):
        CLT        = 'clt',        _('CLT')
        PJ         = 'pj',         _('PJ / MEI')
        FREELANCER = 'freelancer', _('Freelancer')
        INTERN     = 'estagio',    _('Estagiário')
        PARTNER    = 'autonomo',   _('Autônomo')
        TEMPORARY  = 'temporario', _('Temporário')

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='employee_profile',
        verbose_name=_('Usuário do Sistema')
    )
    name = models.CharField(_("Name"), max_length=255)
    document_number = models.CharField(_("CPF"), max_length=14, unique=True)

    # ── Dados pessoais ─────────────────────────────────────────
    rg = models.CharField(_("RG"), max_length=20, blank=True)
    birth_date = models.DateField(_("Birth Date"), null=True, blank=True)
    email = models.EmailField(_("Email"), max_length=254, blank=True, null=True)
    phone = models.CharField(_("Phone"), max_length=20, blank=True)

    # ── Endereço ────────────────────────────────────────────────
    address_street       = models.CharField(_("Street"),       max_length=255, blank=True)
    address_number       = models.CharField(_("Number"),       max_length=20,  blank=True)
    address_complement   = models.CharField(_("Complement"),   max_length=100, blank=True)
    address_neighborhood = models.CharField(_("Neighborhood"), max_length=100, blank=True)
    address_city         = models.CharField(_("City"),         max_length=100, blank=True)
    address_state        = models.CharField(_("State"),        max_length=2,   blank=True)
    address_zip_code     = models.CharField(_("ZIP Code"),     max_length=10,  blank=True)

    # ── Vínculo empregatício ────────────────────────────────────
    hire_date         = models.DateField(_("Hire Date"))
    termination_date  = models.DateField(_("Termination Date"), null=True, blank=True)
    position          = models.CharField(_("Position"),          max_length=100)
    department        = models.CharField(_("Department"),        max_length=100, blank=True)
    employee_type     = models.CharField(
        _("Employee Type"), max_length=20,
        choices=EmployeeType.choices, blank=True
    )
    contract_type     = models.CharField(
        _("Contract Type"), max_length=20,
        choices=ContractType.choices, blank=True
    )

    # ── Remuneração e benefícios ────────────────────────────────
    base_salary = models.DecimalField(
        _("Base Salary"), max_digits=10, decimal_places=2, default=0,
        help_text=_("Salário base mensal")
    )
    transport_allowance = models.DecimalField(
        _("Transport Allowance"), max_digits=8, decimal_places=2, default=0
    )
    meal_allowance = models.DecimalField(
        _("Meal Allowance"), max_digits=8, decimal_places=2, default=0
    )
    health_insurance = models.DecimalField(
        _("Health Insurance"), max_digits=8, decimal_places=2, default=0
    )

    # ── Comissão ────────────────────────────────────────────────
    commission_percentage = models.DecimalField(
        _("Commission Percentage"),
        max_digits=5,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text=_("Percentage of job value that employee receives as commission")
    )

    # ── Dados bancários ─────────────────────────────────────────
    bank_name    = models.CharField(_("Bank Name"),    max_length=100, blank=True)
    bank_branch  = models.CharField(_("Bank Branch"),  max_length=20,  blank=True)
    bank_account = models.CharField(_("Bank Account"), max_length=30,  blank=True)

    # ── Observações / status ────────────────────────────────────
    notes     = models.TextField(_("Notes"),     blank=True)
    is_active = models.BooleanField(_("Is Active"), default=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Employee")
        verbose_name_plural = _("Employees")
        ordering = ['name']


class EmployeeSkill(TimeStampedModel):
    """Model to store employee skills and specializations."""
    employee = models.ForeignKey(
        EmployeeProfile, 
        on_delete=models.CASCADE,
        related_name="skills",
        verbose_name=_("Employee")
    )
    skill_name = models.CharField(_("Skill Name"), max_length=100)
    description = models.TextField(_("Description"), blank=True)
    proficiency_level = models.PositiveSmallIntegerField(
        _("Proficiency Level"),
        choices=[(1, _("Basic")), (2, _("Intermediate")), (3, _("Advanced")), (4, _("Expert"))],
        default=1
    )
    
    def __str__(self):
        return f"{self.employee.name} - {self.skill_name}"
    
    class Meta:
        verbose_name = _("Employee Skill")
        verbose_name_plural = _("Employee Skills")
        unique_together = ['employee', 'skill_name']


class JobAssignment(TimeStampedModel):
    """Model to track job assignments to employees."""
    job = models.ForeignKey(
        'jobs.Job',
        on_delete=models.CASCADE,
        related_name="assignments",
        verbose_name=_("Job")
    )
    employee = models.ForeignKey(
        EmployeeProfile,
        on_delete=models.CASCADE,
        related_name="job_assignments",
        verbose_name=_("Employee")
    )
    assigned_date = models.DateField(_("Assigned Date"), auto_now_add=True)
    completed_date = models.DateField(_("Completed Date"), null=True, blank=True)
    
    # Specific tasks within the job
    task_description = models.CharField(_("Task Description"), max_length=255)
    
    # Status tracking
    is_completed = models.BooleanField(_("Is Completed"), default=False)
    completion_notes = models.TextField(_("Completion Notes"), blank=True)
    
    # Commission calculation
    commission_percentage = models.DecimalField(
        _("Commission Percentage"), 
        max_digits=5, 
        decimal_places=2, 
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text=_("Override default commission percentage if needed")
    )
    commission_amount = models.DecimalField(
        _("Commission Amount"), 
        max_digits=10, 
        decimal_places=2, 
        default=0.00,
        validators=[MinValueValidator(0)]
    )
    
    def __str__(self):
        return f"{self.job.order_number} - {self.employee.name} - {self.task_description}"
    
    def save(self, *args, **kwargs):
        # Calculate commission amount if job is completed
        if self.is_completed and self.completed_date:
            # Use assignment-specific commission percentage if set, otherwise use employee's default
            commission_pct = self.commission_percentage if self.commission_percentage is not None else self.employee.commission_percentage
            
            # Calculate commission based on job total price
            if hasattr(self.job, 'total_price') and self.job.total_price:
                self.commission_amount = self.job.total_price * (commission_pct / 100)
        
        super().save(*args, **kwargs)
    
    class Meta:
        verbose_name = _("Job Assignment")
        verbose_name_plural = _("Job Assignments")
        ordering = ['-assigned_date']


class CommissionPayment(TimeStampedModel):
    """Model to track commission payments to employees."""
    employee = models.ForeignKey(
        EmployeeProfile,
        on_delete=models.CASCADE,
        related_name="commission_payments",
        verbose_name=_("Employee")
    )
    payment_date = models.DateField(_("Payment Date"))
    start_period = models.DateField(_("Start Period"))
    end_period = models.DateField(_("End Period"))
    
    total_amount = models.DecimalField(
        _("Total Amount"), 
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    payment_method = models.CharField(_("Payment Method"), max_length=50)
    reference_number = models.CharField(_("Reference Number"), max_length=50, blank=True)
    notes = models.TextField(_("Notes"), blank=True)
    
    def __str__(self):
        return f"{self.employee.name} - {self.payment_date} - {self.total_amount}"
    
    class Meta:
        verbose_name = _("Commission Payment")
        verbose_name_plural = _("Commission Payments")
        ordering = ['-payment_date']


class CommissionPaymentItem(TimeStampedModel):
    """Model to store individual items in a commission payment."""
    payment = models.ForeignKey(
        CommissionPayment,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name=_("Payment")
    )
    job_assignment = models.ForeignKey(
        JobAssignment,
        on_delete=models.CASCADE,
        related_name="payment_items",
        verbose_name=_("Job Assignment")
    )
    amount = models.DecimalField(
        _("Amount"), 
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    def __str__(self):
        return f"{self.payment} - {self.job_assignment}"
    
    class Meta:
        verbose_name = _("Commission Payment Item")
        verbose_name_plural = _("Commission Payment Items")
