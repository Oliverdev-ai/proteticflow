from rest_framework import serializers
from .models import ScanCase


class ScanCaseSerializer(serializers.ModelSerializer):
    job_order_number  = serializers.CharField(source='job.order_number',  read_only=True)
    client_name       = serializers.CharField(source='client.name',       read_only=True)
    print_status_display = serializers.CharField(source='get_print_status_display', read_only=True)

    class Meta:
        model  = ScanCase
        fields = [
            'id', 'order_id', 'order_code', 'scanner_brand',
            'doctor_name', 'doctor_license', 'patient_name',
            'procedure', 'scan_date', 'due_date', 'ship_to_address',
            'notes', 'print_status', 'print_status_display', 'print_sent_at',
            'job', 'job_order_number', 'client', 'client_name',
            'xml_file', 'stl_upper', 'stl_lower', 'gallery_image',
            'raw_metadata', 'created_at', 'updated_at',
        ]
        read_only_fields = ('created_at', 'updated_at', 'print_sent_at', 'raw_metadata')
