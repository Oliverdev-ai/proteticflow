from rest_framework import serializers
from .models import Client

class ClientSerializer(serializers.ModelSerializer):
    """Serializer for the Client model."""
    class Meta:
        model = Client
        # Include all fields initially, can be refined later
        fields = "__all__"
        read_only_fields = (
            "created_at",
            "updated_at",
        )

