from rest_framework import viewsets, permissions
from .models import Client
from .serializers import ClientSerializer
from apps.employees.permissions import IsRecepcao

# Create your views here.

class ClientViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows clients to be viewed or edited.
    Provides list, create, retrieve, update, partial_update, destroy actions.
    """
    queryset = Client.objects.filter(is_active=True).order_by("name")
    serializer_class = ClientSerializer
    serializer_class = ClientSerializer
    permission_classes = [IsRecepcao]

    # Optional: Add custom filtering, search, or pagination
    # filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    # search_fields = [\"name\", \"document_number\", \"email\"]
    # ordering_fields = [\"name\", \"created_at\"]
    # pagination_class = YourPaginationClass

