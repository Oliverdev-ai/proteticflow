from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from apps.core.models import TimeStampedModel

class Supplier(TimeStampedModel):
    """Model to store information about material suppliers."""
    name = models.CharField(_("Name"), max_length=255)
    document_number = models.CharField(_("Document Number (CNPJ)"), max_length=20, unique=True)
    contact_person = models.CharField(_("Contact Person"), max_length=255, blank=True)
    email = models.EmailField(_("Email"), max_length=254, blank=True, null=True)
    phone = models.CharField(_("Phone"), max_length=20, blank=True)
    address = models.TextField(_("Address"), blank=True)
    notes = models.TextField(_("Notes"), blank=True)
    is_active = models.BooleanField(_("Is Active"), default=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Supplier")
        verbose_name_plural = _("Suppliers")
        ordering = ['name']


class MaterialCategory(TimeStampedModel):
    """Model to categorize materials."""
    name = models.CharField(_("Name"), max_length=100)
    description = models.TextField(_("Description"), blank=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = _("Material Category")
        verbose_name_plural = _("Material Categories")
        ordering = ['name']


class Material(TimeStampedModel):
    """Model to store information about materials."""
    name = models.CharField(_("Name"), max_length=255)
    code = models.CharField(_("Code"), max_length=50, unique=True)
    barcode = models.CharField(_("Barcode"), max_length=100, blank=True, null=True)
    description = models.TextField(_("Description"), blank=True)
    category = models.ForeignKey(
        MaterialCategory, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name="materials",
        verbose_name=_("Category")
    )
    unit = models.CharField(_("Unit"), max_length=20, default="un")
    minimum_stock = models.DecimalField(
        _("Minimum Stock"), 
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    current_stock = models.DecimalField(
        _("Current Stock"), 
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    average_cost = models.DecimalField(
        _("Average Cost"), 
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    last_purchase_price = models.DecimalField(
        _("Last Purchase Price"), 
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    is_active = models.BooleanField(_("Is Active"), default=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

    def is_below_minimum(self):
        return self.current_stock < self.minimum_stock

    class Meta:
        verbose_name = _("Material")
        verbose_name_plural = _("Materials")
        ordering = ['name']


class StockMovement(TimeStampedModel):
    """Model to track stock movements (in/out)."""
    
    class MovementType(models.TextChoices):
        IN = 'IN', _('Entry')
        OUT = 'OUT', _('Exit')
        ADJUSTMENT = 'ADJ', _('Adjustment')
    
    material = models.ForeignKey(
        Material, 
        on_delete=models.CASCADE,
        related_name="movements",
        verbose_name=_("Material")
    )
    movement_type = models.CharField(
        _("Movement Type"),
        max_length=3,
        choices=MovementType.choices,
        default=MovementType.IN
    )
    quantity = models.DecimalField(
        _("Quantity"), 
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    unit_price = models.DecimalField(
        _("Unit Price"), 
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    total_price = models.DecimalField(
        _("Total Price"), 
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    reference = models.CharField(_("Reference"), max_length=100, blank=True)
    notes = models.TextField(_("Notes"), blank=True)
    
    # Optional relations
    supplier = models.ForeignKey(
        Supplier, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name="movements",
        verbose_name=_("Supplier")
    )
    job = models.ForeignKey(
        'jobs.Job', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name="material_movements",
        verbose_name=_("Job")
    )
    
    def __str__(self):
        return f"{self.get_movement_type_display()} - {self.material.name} - {self.quantity} {self.material.unit}"
    
    def save(self, *args, **kwargs):
        # Calculate total price if not set
        if not self.total_price:
            self.total_price = self.quantity * self.unit_price
            
        # Update material stock
        if self.movement_type == self.MovementType.IN:
            # Update average cost for entries
            total_value = (self.material.current_stock * self.material.average_cost) + self.total_price
            new_stock = self.material.current_stock + self.quantity
            if new_stock > 0:
                self.material.average_cost = total_value / new_stock
            self.material.current_stock = new_stock
            self.material.last_purchase_price = self.unit_price
        elif self.movement_type == self.MovementType.OUT:
            self.material.current_stock = max(0, self.material.current_stock - self.quantity)
        elif self.movement_type == self.MovementType.ADJUSTMENT:
            self.material.current_stock = max(0, self.quantity)
            
        self.material.save()
        super().save(*args, **kwargs)
    
    class Meta:
        verbose_name = _("Stock Movement")
        verbose_name_plural = _("Stock Movements")
        ordering = ['-created_at']


class PurchaseOrder(TimeStampedModel):
    """Model to store purchase orders."""
    
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        PENDING = 'PEND', _('Pending')
        APPROVED = 'APPR', _('Approved')
        RECEIVED = 'RECV', _('Received')
        CANCELLED = 'CANC', _('Cancelled')
    
    order_number = models.CharField(_("Order Number"), max_length=50, unique=True)
    supplier = models.ForeignKey(
        Supplier, 
        on_delete=models.CASCADE,
        related_name="purchase_orders",
        verbose_name=_("Supplier")
    )
    status = models.CharField(
        _("Status"),
        max_length=5,
        choices=Status.choices,
        default=Status.DRAFT
    )
    order_date = models.DateField(_("Order Date"))
    expected_delivery_date = models.DateField(_("Expected Delivery Date"), null=True, blank=True)
    delivery_date = models.DateField(_("Delivery Date"), null=True, blank=True)
    invoice_number = models.CharField(_("Invoice Number"), max_length=50, blank=True)
    invoice_xml = models.FileField(_("Invoice XML"), upload_to='invoices/', null=True, blank=True)
    notes = models.TextField(_("Notes"), blank=True)
    total_amount = models.DecimalField(
        _("Total Amount"), 
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    
    def __str__(self):
        return f"{self.order_number} - {self.supplier.name}"
    
    def update_total(self):
        """Update the total amount based on items."""
        self.total_amount = sum(item.total_price for item in self.items.all())
        self.save()
    
    class Meta:
        verbose_name = _("Purchase Order")
        verbose_name_plural = _("Purchase Orders")
        ordering = ['-order_date']


class PurchaseOrderItem(TimeStampedModel):
    """Model to store purchase order items."""
    purchase_order = models.ForeignKey(
        PurchaseOrder, 
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name=_("Purchase Order")
    )
    material = models.ForeignKey(
        Material, 
        on_delete=models.CASCADE,
        related_name="purchase_items",
        verbose_name=_("Material")
    )
    quantity = models.DecimalField(
        _("Quantity"), 
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    unit_price = models.DecimalField(
        _("Unit Price"), 
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    total_price = models.DecimalField(
        _("Total Price"), 
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    received_quantity = models.DecimalField(
        _("Received Quantity"), 
        max_digits=10, 
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    
    def __str__(self):
        return f"{self.material.name} - {self.quantity} {self.material.unit}"
    
    def save(self, *args, **kwargs):
        # Calculate total price if not set
        if not self.total_price:
            self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)
        
        # Update purchase order total
        self.purchase_order.update_total()
    
    class Meta:
        verbose_name = _("Purchase Order Item")
        verbose_name_plural = _("Purchase Order Items")
