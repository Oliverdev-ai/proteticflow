from django.contrib import admin
from .models import PayrollPeriod, PayrollEntry, FinancialReport


@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'reference_date', 'total_gross_salary', 'total_net_salary', 'is_closed', 'closed_at']
    list_filter = ['year', 'is_closed', 'closed_at']
    readonly_fields = ['created_at', 'updated_at', 'closed_at', 'closed_by']


@admin.register(PayrollEntry)
class PayrollEntryAdmin(admin.ModelAdmin):
    list_display = ['employee', 'period', 'base_salary', 'gross_salary', 'net_salary']
    list_filter = ['period__year', 'period__month']
    search_fields = ['employee__name', 'employee__document_number']
    readonly_fields = ['created_at', 'updated_at', 'gross_salary', 'total_deductions', 'net_salary']


@admin.register(FinancialReport)
class FinancialReportAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'report_type', 'total_revenue', 'net_profit', 'generated_by', 'created_at']
    list_filter = ['report_type', 'year', 'created_at']
    readonly_fields = ['created_at', 'generated_by']
