# apps/licensing/serializers.py
from rest_framework import serializers
from .models import License, LicensePlan, LicenseCheck

class LicensePlanSerializer(serializers.ModelSerializer):
    """Serializer para planos de licenciamento"""
    
    class Meta:
        model = LicensePlan
        fields = [
            'id', 'name', 'display_name', 'description',
            'price_monthly', 'price_yearly',
            'max_clients', 'max_jobs_per_month', 'max_price_tables', 'max_users',
            'has_advanced_reports', 'has_client_portal', 'has_api_access', 'has_priority_support'
        ]

class LicenseSerializer(serializers.ModelSerializer):
    """Serializer para licenças"""
    plan = LicensePlanSerializer(read_only=True)
    plan_id = serializers.IntegerField(write_only=True)
    limits_status = serializers.SerializerMethodField()
    is_valid = serializers.SerializerMethodField()
    
    class Meta:
        model = License
        fields = [
            'id', 'license_key', 'organization_name', 'contact_email', 'contact_phone',
            'plan', 'plan_id', 'status', 'created_at', 'activated_at', 'expires_at',
            'current_clients_count', 'current_jobs_this_month', 'current_price_tables_count',
            'current_users_count', 'limits_status', 'is_valid'
        ]
        read_only_fields = ['license_key', 'created_at']
    
    def get_limits_status(self, obj):
        """Retorna status dos limites"""
        return obj.get_limits_status()
    
    def get_is_valid(self, obj):
        """Retorna se a licença está válida"""
        return obj.is_valid()

class LicenseCheckSerializer(serializers.ModelSerializer):
    """Serializer para logs de verificação de licença"""
    
    class Meta:
        model = LicenseCheck
        fields = ['id', 'check_time', 'ip_address', 'is_valid', 'error_message']

