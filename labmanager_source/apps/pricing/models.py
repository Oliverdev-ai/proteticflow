from django.db import models
from django.utils.translation import gettext_lazy as _

# Create your models here.

class PriceTable(models.Model):
    """Defines different price lists for services and materials."""
    name = models.CharField(_("Name"), max_length=100, unique=True)
    description = models.TextField(_("Description"), blank=True)
    is_default = models.BooleanField(_("Is Default"), default=False, help_text=_("Is this the default price table for new clients?"))
    created_at = models.DateTimeField(_("Created At"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Updated At"), auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Price Table")
        verbose_name_plural = _("Price Tables")
        ordering = ["name"]

class ServiceItem(models.Model):
    """Represents a specific service or material within a price table."""
    price_table = models.ForeignKey(PriceTable, on_delete=models.CASCADE, related_name="service_items", verbose_name=_("Price Table"))
    name = models.CharField(_("Name"), max_length=255)
    code = models.CharField(_("Internal Code"), max_length=50, blank=True)
    description = models.TextField(_("Description"), blank=True)
    price = models.DecimalField(_("Unit Price"), max_digits=10, decimal_places=2)
    is_active = models.BooleanField(_("Is Active"), default=True)
    created_at = models.DateTimeField(_("Created At"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Updated At"), auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.price_table.name}) - {self.price}"

    class Meta:
        verbose_name = _("Service Item")
        verbose_name_plural = _("Service Items")
        # Ensures that the combination of price table and item name is unique
        unique_together = [("price_table", "name")]
        ordering = ["price_table", "name"]

