import django_filters
from .models import Material, StockMovement, PurchaseOrder

class MaterialFilter(django_filters.FilterSet):
    class Meta:
        model = Material
        fields = ['category', 'is_active']

class StockMovementFilter(django_filters.FilterSet):
    class Meta:
        model = StockMovement
        fields = ['material', 'movement_type']

class PurchaseOrderFilter(django_filters.FilterSet):
    class Meta:
        model = PurchaseOrder
        fields = ['supplier', 'status']
