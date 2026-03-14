from django.contrib import admin
from .models import ScanCase

@admin.register(ScanCase)
class ScanCaseAdmin(admin.ModelAdmin):
    list_display  = ['order_id', 'patient_name', 'doctor_name', 'procedure',
                     'scan_date', 'print_status', 'client', 'job', 'created_at']
    list_filter   = ['scanner_brand', 'print_status', 'scan_date']
    search_fields = ['order_id', 'patient_name', 'doctor_name']
    readonly_fields = ['raw_metadata', 'created_at', 'updated_at', 'print_sent_at']
