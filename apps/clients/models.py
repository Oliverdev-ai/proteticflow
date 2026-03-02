from django.db import models
from django.utils.translation import gettext_lazy as _

# Create your models here.

class Client(models.Model):
    """Model to store information about dentists and clinics."""

    class DocumentType(models.TextChoices):
        CPF = 'CPF', _('CPF')
        CNPJ = 'CNPJ', _('CNPJ')

    name = models.CharField(_("Name"), max_length=255)
    document_type = models.CharField(
        _("Document Type"),
        max_length=4,
        choices=DocumentType.choices,
        blank=True,
        null=True
    )
    document_number = models.CharField(
        _("Document Number"),
        max_length=20,
        unique=True,
        blank=True,
        null=True
    )
    contact_person = models.CharField(_("Contact Person"), max_length=255, blank=True)
    email = models.EmailField(_("Email"), max_length=254, unique=True, blank=True, null=True)
    phone_primary = models.CharField(_("Primary Phone"), max_length=20)
    phone_secondary = models.CharField(_("Secondary Phone"), max_length=20, blank=True)

    # Address fields
    address_street = models.CharField(_("Street"), max_length=255, blank=True)
    address_number = models.CharField(_("Number"), max_length=20, blank=True)
    address_complement = models.CharField(_("Complement"), max_length=100, blank=True)
    address_neighborhood = models.CharField(_("Neighborhood"), max_length=100, blank=True)
    address_city = models.CharField(_("City"), max_length=100, blank=True)
    address_state = models.CharField(_("State"), max_length=2, blank=True) # UF
    address_zip_code = models.CharField(_("ZIP Code"), max_length=10, blank=True) # CEP

    technical_preferences = models.TextField(_("Technical Preferences"), blank=True)
    
    # Pricing adjustment field
    price_adjustment_percentage = models.DecimalField(
        _("Price Adjustment (%)"), 
        max_digits=5, 
        decimal_places=2, 
        default=0.00,
        help_text=_("Percentage adjustment for this client's prices. Positive for markup, negative for discount.")
    )
    
    # ForeignKey to PriceTable will be added after PriceTable model is defined
    # price_table = models.ForeignKey('pricing.PriceTable', on_delete=models.SET_NULL, null=True, blank=True, related_name='clients')

    is_active = models.BooleanField(_("Is Active"), default=True)
    created_at = models.DateTimeField(_("Created At"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Updated At"), auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Client")
        verbose_name_plural = _("Clients")
        ordering = ['name']

