# apps/licensing/admin.py
from django.contrib import admin
from .models import License, LicensePlan, LicenseCheck

@admin.register(LicensePlan)
class LicensePlanAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'name', 'price_monthly', 'price_yearly', 'max_clients', 'max_jobs_per_month', 'is_active']
    list_filter = ['name', 'is_active']
    search_fields = ['display_name', 'description']
    ordering = ['price_monthly']

@admin.register(License)
class LicenseAdmin(admin.ModelAdmin):
    list_display = ['organization_name', 'plan', 'status', 'created_at', 'expires_at', 'is_valid_display']
    list_filter = ['status', 'plan', 'created_at']
    search_fields = ['organization_name', 'contact_email', 'license_key']
    readonly_fields = ['license_key', 'created_at', 'last_check']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('license_key', 'organization_name', 'contact_email', 'contact_phone')
        }),
        ('Plano e Status', {
            'fields': ('plan', 'status', 'created_at', 'activated_at', 'expires_at')
        }),
        ('Uso Atual', {
            'fields': ('current_clients_count', 'current_jobs_this_month', 'current_price_tables_count', 'current_users_count', 'last_check')
        }),
        ('Sistema', {
            'fields': ('installation_id', 'last_ip'),
            'classes': ('collapse',)
        })
    )
    
    def is_valid_display(self, obj):
        return "✅ Válida" if obj.is_valid() else "❌ Inválida"
    is_valid_display.short_description = 'Status'
    
    actions = ['update_usage_counts', 'activate_license', 'suspend_license']
    
    def update_usage_counts(self, request, queryset):
        for license in queryset:
            license.update_usage_counts()
        self.message_user(request, f"Contadores atualizados para {queryset.count()} licenças.")
    update_usage_counts.short_description = "Atualizar contadores de uso"
    
    def activate_license(self, request, queryset):
        queryset.update(status='ACTIVE')
        self.message_user(request, f"{queryset.count()} licenças ativadas.")
    activate_license.short_description = "Ativar licenças selecionadas"
    
    def suspend_license(self, request, queryset):
        queryset.update(status='SUSPENDED')
        self.message_user(request, f"{queryset.count()} licenças suspensas.")
    suspend_license.short_description = "Suspender licenças selecionadas"

@admin.register(LicenseCheck)
class LicenseCheckAdmin(admin.ModelAdmin):
    list_display = ['license', 'check_time', 'ip_address', 'is_valid']
    list_filter = ['is_valid', 'check_time']
    search_fields = ['license__organization_name', 'ip_address']
    ordering = ['-check_time']
    readonly_fields = ['license', 'check_time', 'ip_address', 'user_agent', 'is_valid', 'error_message']

