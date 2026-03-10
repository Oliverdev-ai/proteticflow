from django.contrib import admin
from .models import Employee, PayrollPeriod, PayrollEntry, FinancialReport


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'employee_type', 'contract_type', 'base_salary', 'hire_date', 'is_active']
    list_filter = ['employee_type', 'contract_type', 'is_active', 'hire_date']
    search_fields = ['full_name', 'cpf', 'email']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Dados Pessoais', {
            'fields': ('full_name', 'cpf', 'rg', 'birth_date', 'phone', 'email')
        }),
        ('Endereço', {
            'fields': ('address_street', 'address_number', 'address_complement', 
                      'address_neighborhood', 'address_city', 'address_state', 'address_zip_code')
        }),
        ('Dados Profissionais', {
            'fields': ('employee_type', 'contract_type', 'hire_date', 'termination_date', 'base_salary')
        }),
        ('Benefícios', {
            'fields': ('transport_allowance', 'meal_allowance', 'health_insurance')
        }),
        ('Dados Bancários', {
            'fields': ('bank_name', 'bank_agency', 'bank_account')
        }),
        ('Sistema', {
            'fields': ('user', 'is_active', 'created_at', 'updated_at')
        }),
    )


@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'reference_date', 'total_gross_salary', 'total_net_salary', 'is_closed', 'closed_at']
    list_filter = ['year', 'is_closed', 'closed_at']
    readonly_fields = ['created_at', 'updated_at', 'closed_at', 'closed_by']


@admin.register(PayrollEntry)
class PayrollEntryAdmin(admin.ModelAdmin):
    list_display = ['employee', 'period', 'base_salary', 'gross_salary', 'net_salary']
    list_filter = ['period__year', 'period__month', 'employee__employee_type']
    search_fields = ['employee__full_name']
    readonly_fields = ['created_at', 'updated_at', 'gross_salary', 'total_deductions', 'net_salary']


@admin.register(FinancialReport)
class FinancialReportAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'report_type', 'total_revenue', 'net_profit', 'generated_by', 'created_at']
    list_filter = ['report_type', 'year', 'created_at']
    readonly_fields = ['created_at', 'generated_by']

