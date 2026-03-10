from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.clients.models import Client # Import Client model
from apps.pricing.models import ServiceItem # Import ServiceItem model

# Create your models here.

class JobStage(models.Model):
    """Defines the possible stages in the production workflow."""
    name = models.CharField(_("Name"), max_length=100, unique=True)
    order = models.PositiveIntegerField(_("Order"), default=0, help_text=_("Order in the workflow"))
    description = models.TextField(_("Description"), blank=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Job Stage")
        verbose_name_plural = _("Job Stages")
        ordering = ["order", "name"]

class Job(models.Model):
    """Represents a single job or service order."""

    class JobStatus(models.TextChoices):
        RECEIVED = 'REC', _('Received')
        IN_PRODUCTION = 'PROD', _('In Production')
        QUALITY_CHECK = 'QC', _('Quality Check')
        COMPLETED = 'COMP', _('Completed')
        DELIVERED = 'DEL', _('Delivered')
        CANCELED = 'CANC', _('Canceled')

    order_number = models.CharField(_("Order Number"), max_length=50, unique=True, help_text=_("Unique identifier for the job"))
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="jobs", verbose_name=_("Client"))
    patient_name = models.CharField(_("Patient Name/ID"), max_length=255, blank=True)
    entry_date = models.DateField(_("Entry Date"), auto_now_add=True)
    due_date = models.DateField(_("Due Date"))
    completion_date = models.DateField(_("Completion Date"), null=True, blank=True)
    delivery_date = models.DateField(_("Delivery Date"), null=True, blank=True)

    status = models.CharField(
        _("Status"),
        max_length=4,
        choices=JobStatus.choices,
        default=JobStatus.RECEIVED
    )
    current_stage = models.ForeignKey(
        JobStage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="current_jobs",
        verbose_name=_("Current Stage")
    )

    prosthesis_type = models.CharField(_("Prosthesis Type"), max_length=100, blank=True)
    material = models.CharField(_("Material"), max_length=100, blank=True)
    color = models.CharField(_("Color"), max_length=50, blank=True)
    instructions = models.TextField(_("Specific Instructions"), blank=True)

    # Price will be calculated based on JobItems
    total_price = models.DecimalField(_("Total Price"), max_digits=12, decimal_places=2, null=True, blank=True, help_text=_("Calculated automatically from items"))

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_jobs",
        verbose_name=_("Created By")
    )
    created_at = models.DateTimeField(_("Created At"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Updated At"), auto_now=True)

    # ManyToMany relationship defined through JobItem
    items = models.ManyToManyField(ServiceItem, through='JobItem', related_name='jobs', verbose_name=_("Items"))

    def __str__(self):
        return f"Job {self.order_number} - {self.client.name}"

    class Meta:
        verbose_name = _("Job")
        verbose_name_plural = _("Jobs")
        ordering = ["-entry_date", "due_date"]

class JobItem(models.Model):
    """Associates ServiceItems with a specific Job, including quantity and price at the time."""
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="job_items", verbose_name=_("Job"))
    service_item = models.ForeignKey(ServiceItem, on_delete=models.PROTECT, related_name="job_items", verbose_name=_("Service Item"))
    quantity = models.PositiveIntegerField(_("Quantity"), default=1)
    # Store price at the time the item was added to the job
    unit_price = models.DecimalField(_("Unit Price at Order"), max_digits=10, decimal_places=2)
    total_price = models.DecimalField(_("Total Item Price"), max_digits=12, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        # Calculate total price before saving
        self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)
        # Potentially add logic here to update Job.total_price

    def __str__(self):
        return f"{self.quantity} x {self.service_item.name} for Job {self.job.order_number}"

    class Meta:
        verbose_name = _("Job Item")
        verbose_name_plural = _("Job Items")
        unique_together = [("job", "service_item")] # Prevent adding the same item twice to a job

class JobLog(models.Model):
    """Logs significant events related to a Job."""
    class EventType(models.TextChoices):
        CREATION = 'CREATE', _('Creation')
        STATUS_CHANGE = 'STATUS', _('Status Change')
        STAGE_CHANGE = 'STAGE', _('Stage Change')
        NOTE = 'NOTE', _('Note Added')
        UPDATE = 'UPDATE', _('Job Updated')
        # Add more specific event types as needed

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="logs", verbose_name=_("Job"))
    stage = models.ForeignKey(JobStage, on_delete=models.SET_NULL, null=True, blank=True, verbose_name=_("Associated Stage"))
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_("User")
    )
    timestamp = models.DateTimeField(_("Timestamp"), auto_now_add=True)
    event_type = models.CharField(_("Event Type"), max_length=10, choices=EventType.choices)
    details = models.TextField(_("Details"), blank=True)

    def __str__(self):
        return f"Log for Job {self.job.order_number} at {self.timestamp}"

    class Meta:
        verbose_name = _("Job Log")
        verbose_name_plural = _("Job Logs")
        ordering = ["-timestamp"]

class JobPhoto(models.Model):
    """Stores references to image files associated with a Job."""
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="photos", verbose_name=_("Job"))
    stage = models.ForeignKey(JobStage, on_delete=models.SET_NULL, null=True, blank=True, verbose_name=_("Stage When Taken"))
    # Consider using Django's FileField or ImageField
    image_file = models.ImageField(_("Image File"), upload_to='job_photos/%Y/%m/%d/')
    description = models.CharField(_("Description"), max_length=255, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_("Uploaded By")
    )
    uploaded_at = models.DateTimeField(_("Uploaded At"), auto_now_add=True)

    def __str__(self):
        return f"Photo for Job {self.job.order_number} uploaded at {self.uploaded_at}"

    class Meta:
        verbose_name = _("Job Photo")
        verbose_name_plural = _("Job Photos")
        ordering = ["-uploaded_at"]

