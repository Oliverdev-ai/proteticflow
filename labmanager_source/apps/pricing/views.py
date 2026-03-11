from rest_framework import viewsets, permissions
from .models import PriceTable, ServiceItem
from .serializers import PriceTableSerializer, PriceTableDetailSerializer, ServiceItemSerializer
from apps.employees.permissions import AnyRole, IsGerente

# Create your views here.

class PriceTableViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Price Tables.
    Provides list, create, retrieve, update, partial_update, destroy actions.
    Uses PriceTableDetailSerializer for retrieve action to include items.
    """
    queryset = PriceTable.objects.all().order_by("name")
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AnyRole()]
        return [IsGerente()]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PriceTableDetailSerializer
        return PriceTableSerializer

class ServiceItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Service Items.
    Allows filtering by price_table.
    """
    serializer_class = ServiceItemSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AnyRole()]
        return [IsGerente()]
    # Allow filtering by price_table ID
    filterset_fields = ["price_table"]

    def get_queryset(self):
        """Optionally restricts the returned purchases to a given user,
           by filtering against a `price_table` query parameter in the URL.
        """
        queryset = ServiceItem.objects.filter(is_active=True).order_by("name")
        price_table_id = self.request.query_params.get("price_table")
        if price_table_id is not None:
            queryset = queryset.filter(price_table_id=price_table_id)
        return queryset

