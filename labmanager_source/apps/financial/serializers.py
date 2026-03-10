from rest_framework import serializers
from .models import AccountsReceivable, AccountsPayable, FinancialClosing, DeliverySchedule, LabSettings

class AccountsReceivableSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    job_order_number = serializers.CharField(source='job.order_number', read_only=True)
    
    class Meta:
        model = AccountsReceivable
        fields = [
            'id', 'job', 'client', 'client_name', 'job_order_number',
            'amount', 'adjusted_amount', 'due_date', 'paid_date',
            'status', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['adjusted_amount', 'created_at', 'updated_at']

class AccountsPayableSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    
    class Meta:
        model = AccountsPayable
        fields = [
            'id', 'supplier', 'supplier_name', 'description',
            'amount', 'issue_date', 'due_date', 'payment_date', 'status',
            'reference_number', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

class FinancialClosingSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = FinancialClosing
        fields = [
            'id', 'closing_type', 'period_start', 'period_end',
            'total_revenue', 'total_jobs', 'total_clients',
            'breakdown_data', 'notes', 'created_at', 'created_by',
            'created_by_name'
        ]
        read_only_fields = ['created_at']

class DeliveryScheduleSerializer(serializers.ModelSerializer):
    jobs_count = serializers.IntegerField(source='jobs.count', read_only=True)
    jobs_details = serializers.SerializerMethodField()
    
    class Meta:
        model = DeliverySchedule
        fields = [
            'id', 'date', 'route_name', 'jobs', 'jobs_count', 'jobs_details',
            'driver_name', 'vehicle_info', 'status', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_jobs_details(self, obj):
        """Get basic details of jobs in this delivery schedule."""
        jobs = obj.jobs.all().select_related('client')
        return [
            {
                'id': job.id,
                'order_number': job.order_number,
                'client_name': job.client.name,
                'patient_name': job.patient_name,
                'status': job.status
            }
            for job in jobs
        ]

class LabSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = LabSettings
        fields = [
            'id', 'lab_name', 'logo', 'logo_url', 'address', 'phone',
            'email', 'website', 'report_header_text', 'report_footer_text',
            'primary_color', 'secondary_color', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_logo_url(self, obj):
        """Get the full URL for the logo image."""
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None

