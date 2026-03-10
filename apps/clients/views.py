from rest_framework import viewsets, permissions
from .models import Client
from .serializers import ClientSerializer

# Create your views here.

class ClientViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows clients to be viewed or edited.
    Provides list, create, retrieve, update, partial_update, destroy actions.
    """
    queryset = Client.objects.filter(is_active=True).order_by("name")
    serializer_class = ClientSerializer
    # Add permissions later, e.g., IsAuthenticated
    permission_classes = [permissions.AllowAny] # Start with AllowAny for initial testing

    # Optional: Add custom filtering, search, or pagination
    # filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    # search_fields = [\"name\", \"document_number\", \"email\"]
    # ordering_fields = [\"name\", \"created_at\"]
    # pagination_class = YourPaginationClass

