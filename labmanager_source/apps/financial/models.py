from django.db import models
from django.utils.translation import gettext_lazy as _
from decimal import Decimal

class AccountsReceivable(models.Model):
    """Model for accounts receivable - money owed by clients."""
    
    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        PAID = 'paid', _('Paid')
        OVERDUE = 'overdue', _('Overdue')
        CANCELLED = 'cancelled', _('Cancelled')
    
    job = models.ForeignKey(
        'jobs.Job', 
        on_delete=models.CASCADE, 
        related_name='receivables',
        verbose_name=_("Job")
    )
    client = models.ForeignKey(
        'clients.Client', 
        on_delete=models.CASCADE, 
        related_name='receivables',
        verbose_name=_("Client")
    )
    
    amount = models.DecimalField(
        _("Amount"), 
        max_digits=10, 
        decimal_places=2
    )
    adjusted_amount = models.DecimalField(
        _("Adjusted Amount"), 
        max_digits=10, 
        decimal_places=2,
        help_text=_("Amount after client-specific percentage adjustment")
    )
    
    due_date = models.DateField(_("Due Date"))
    paid_date = models.DateField(_("Paid Date"), null=True, blank=True)
    
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    notes = models.TextField(_("Notes"), blank=True)
    
    created_at = models.DateTimeField(_("Created At"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Updated At"), auto_now=True)
    
    def save(self, *args, **kwargs):
        # Calculate adjusted amount based on client's price adjustment
        if self.client and self.amount:
            adjustment = self.client.price_adjustment_percentage / 100
            self.adjusted_amount = self.amount * (1 + adjustment)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.client.name} - {self.job.order_number} - R$ {self.adjusted_amount}"
    
    class Meta:
        verbose_name = _("Accounts Receivable")
        verbose_name_plural = _("Accounts Receivable")
        ordering = ['-created_at']


class FinancialClosing(models.Model):
    """Model for financial closings - monthly, annual, or by completed jobs."""
    
    class ClosingType(models.TextChoices):
        MONTHLY = 'monthly', _('Monthly')
        ANNUAL = 'annual', _('Annual')
        BY_JOB = 'by_job', _('By Completed Job')
    
    closing_type = models.CharField(
        _("Closing Type"),
        max_length=20,
        choices=ClosingType.choices
    )
    
    period_start = models.DateField(_("Period Start"))
    period_end = models.DateField(_("Period End"))
    
    total_revenue = models.DecimalField(
        _("Total Revenue"), 
        max_digits=12, 
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_jobs = models.IntegerField(_("Total Jobs"), default=0)
    total_clients = models.IntegerField(_("Total Clients"), default=0)
    
    # JSON field to store detailed breakdown
    breakdown_data = models.JSONField(
        _("Breakdown Data"),
        default=dict,
        help_text=_("Detailed breakdown of revenue by client, job type, etc.")
    )
    
    notes = models.TextField(_("Notes"), blank=True)
    
    created_at = models.DateTimeField(_("Created At"), auto_now_add=True)
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_("Created By")
    )
    
    def __str__(self):
        return f"{self.get_closing_type_display()} - {self.period_start} to {self.period_end}"
    
    class Meta:
        verbose_name = _("Financial Closing")
        verbose_name_plural = _("Financial Closings")
        ordering = ['-period_end']


class DeliverySchedule(models.Model):
    """Model for delivery schedules and routes."""
    
    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', _('Scheduled')
        IN_TRANSIT = 'in_transit', _('In Transit')
        DELIVERED = 'delivered', _('Delivered')
        FAILED = 'failed', _('Failed Delivery')
    
    date = models.DateField(_("Delivery Date"))
    route_name = models.CharField(_("Route Name"), max_length=100, blank=True)
    
    jobs = models.ManyToManyField(
        'jobs.Job',
        related_name='delivery_schedules',
        verbose_name=_("Jobs")
    )
    
    driver_name = models.CharField(_("Driver Name"), max_length=100, blank=True)
    vehicle_info = models.CharField(_("Vehicle Info"), max_length=100, blank=True)
    
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED
    )
    
    notes = models.TextField(_("Notes"), blank=True)
    
    created_at = models.DateTimeField(_("Created At"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Updated At"), auto_now=True)
    
    def __str__(self):
        return f"Delivery {self.date} - {self.route_name}"
    
    class Meta:
        verbose_name = _("Delivery Schedule")
        verbose_name_plural = _("Delivery Schedules")
        ordering = ['date']


class LabSettings(models.Model):
    """Model for laboratory settings including logo and customization."""
    
    lab_name = models.CharField(_("Laboratory Name"), max_length=200)
    logo = models.ImageField(
        _("Logo"), 
        upload_to='lab_logos/', 
        null=True, 
        blank=True,
        help_text=_("Logo to be used in reports and documents")
    )
    
    # Contact information
    address = models.TextField(_("Address"), blank=True)
    phone = models.CharField(_("Phone"), max_length=20, blank=True)
    email = models.EmailField(_("Email"), blank=True)
    website = models.URLField(_("Website"), blank=True)
    
    # Document customization
    report_header_text = models.TextField(
        _("Report Header Text"), 
        blank=True,
        help_text=_("Custom text to appear in report headers")
    )
    report_footer_text = models.TextField(
        _("Report Footer Text"), 
        blank=True,
        help_text=_("Custom text to appear in report footers")
    )
    
    # Colors for branding
    primary_color = models.CharField(
        _("Primary Color"), 
        max_length=7, 
        default="#2563eb",
        help_text=_("Hex color code for primary brand color")
    )
    secondary_color = models.CharField(
        _("Secondary Color"), 
        max_length=7, 
        default="#64748b",
        help_text=_("Hex color code for secondary brand color")
    )
    
    created_at = models.DateTimeField(_("Created At"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Updated At"), auto_now=True)
    
    def __str__(self):
        return self.lab_name
    
    class Meta:
        verbose_name = _("Laboratory Settings")
        verbose_name_plural = _("Laboratory Settings")

