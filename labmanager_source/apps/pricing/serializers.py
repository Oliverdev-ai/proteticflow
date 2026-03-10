from rest_framework import serializers
from .models import PriceTable, ServiceItem

class ServiceItemSerializer(serializers.ModelSerializer):
    """Serializer for the ServiceItem model."""
    price_table_name = serializers.CharField(source='price_table.name', read_only=True)

    class Meta:
        model = ServiceItem
        fields = ["id", "price_table", "price_table_name", "name", "code", "description", "price", "is_active", "created_at", "updated_at"]
        read_only_fields = ("created_at", "updated_at", "price_table_name")

class PriceTableSerializer(serializers.ModelSerializer):
    """Serializer for the PriceTable model."""
    # Optionally include related service items (can be nested or linked)
    # service_items = ServiceItemSerializer(many=True, read_only=True) # Example of nested serialization

    class Meta:
        model = PriceTable
        fields = ["id", "name", "description", "is_default", "created_at", "updated_at"]
        read_only_fields = ("created_at", "updated_at")

class PriceTableDetailSerializer(PriceTableSerializer):
    """Serializer for PriceTable detail view, including its items."""
    service_items = ServiceItemSerializer(many=True, read_only=True)

    class Meta(PriceTableSerializer.Meta):
        fields = PriceTableSerializer.Meta.fields + ["service_items"]

