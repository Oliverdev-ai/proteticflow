from django.contrib import admin
from .models import (
    SubscriptionPlan, UserRole, UserSubscription, UserProfile,
    UsageTracking, AccessRestriction
)


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'plan_type', 'monthly_price', 'flow_commands_per_day',
        'intelligent_scheduling_enabled', 'predictive_analytics_enabled',
        'is_active', 'created_at'
    ]
    list_filter = [
        'plan_type', 'is_active', 'intelligent_scheduling_enabled',
        'predictive_analytics_enabled', 'automated_support_enabled'
    ]
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'plan_type', 'description', 'is_active', 'is_default')
        }),
        ('Limites da Flow IA', {
            'fields': ('flow_commands_per_day', 'flow_commands_per_month')
        }),
        ('Funcionalidades de Agendamento', {
            'fields': ('intelligent_scheduling_enabled', 'scheduling_optimizations_per_day'),
            'classes': ('collapse',)
        }),
        ('Funcionalidades de Análise Preditiva', {
            'fields': (
                'predictive_analytics_enabled', 'revenue_predictions_per_month',
                'trend_analysis_per_month'
            ),
            'classes': ('collapse',)
        }),
        ('Funcionalidades de Atendimento', {
            'fields': (
                'automated_support_enabled', 'chatbot_conversations_per_month',
                'automated_notifications_per_month'
            ),
            'classes': ('collapse',)
        }),
        ('Recursos Avançados', {
            'fields': (
                'smart_orders_enabled', 'ai_suggestions_per_day',
                'custom_ai_training_enabled', 'api_access_enabled', 'priority_support'
            ),
            'classes': ('collapse',)
        }),
        ('Limites de Usuários', {
            'fields': ('max_users', 'max_technicians')
        }),
        ('Preços', {
            'fields': ('monthly_price', 'annual_price')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'role_type', 'priority_level', 'flow_commands_multiplier',
        'can_use_advanced_flow', 'is_active', 'created_at'
    ]
    list_filter = [
        'role_type', 'is_active', 'can_use_advanced_flow',
        'can_manage_users', 'can_generate_predictions'
    ]
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'role_type', 'description', 'is_active', 'priority_level')
        }),
        ('Permissões Gerais', {
            'fields': (
                'can_manage_users', 'can_manage_settings', 'can_view_reports',
                'can_manage_clients', 'can_manage_jobs'
            )
        }),
        ('Permissões da Flow IA', {
            'fields': ('can_use_flow_commands', 'can_use_advanced_flow', 'flow_commands_multiplier')
        }),
        ('Permissões de Agendamento', {
            'fields': (
                'can_optimize_schedules', 'can_manage_technician_profiles',
                'can_view_bottleneck_alerts'
            ),
            'classes': ('collapse',)
        }),
        ('Permissões de Análise Preditiva', {
            'fields': (
                'can_generate_predictions', 'can_view_trend_analysis',
                'can_manage_predictive_alerts', 'can_configure_dashboard'
            ),
            'classes': ('collapse',)
        }),
        ('Permissões de Atendimento', {
            'fields': (
                'can_manage_chatbot', 'can_view_conversations',
                'can_manage_notifications', 'can_manage_support_tickets'
            ),
            'classes': ('collapse',)
        }),
        ('Permissões Financeiras', {
            'fields': (
                'can_view_financial_data', 'can_generate_financial_reports',
                'can_manage_pricing'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'plan', 'status', 'start_date', 'end_date',
        'auto_renew', 'created_at'
    ]
    list_filter = ['status', 'plan__plan_type', 'auto_renew', 'created_at']
    search_fields = ['user__first_name', 'user__last_name', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Assinatura', {
            'fields': ('user', 'plan', 'status')
        }),
        ('Período', {
            'fields': ('start_date', 'end_date', 'trial_end_date', 'auto_renew')
        }),
        ('Customizações', {
            'fields': ('custom_limits',),
            'classes': ('collapse',)
        }),
        ('Pagamento', {
            'fields': ('payment_method', 'last_payment_date', 'next_payment_date'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'role', 'total_flow_commands_used', 'last_flow_command_date',
        'is_active', 'created_at'
    ]
    list_filter = ['role__role_type', 'is_active', 'flow_auto_suggestions', 'created_at']
    search_fields = ['user__first_name', 'user__last_name', 'user__email']
    readonly_fields = ['total_flow_commands_used', 'last_flow_command_date', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Usuário e Papel', {
            'fields': ('user', 'role', 'is_active')
        }),
        ('Configurações Pessoais', {
            'fields': ('preferred_language', 'timezone')
        }),
        ('Limites Personalizados', {
            'fields': ('custom_flow_limit_daily', 'custom_flow_limit_monthly')
        }),
        ('Notificações', {
            'fields': ('email_notifications', 'sms_notifications', 'push_notifications'),
            'classes': ('collapse',)
        }),
        ('Configurações da Flow', {
            'fields': ('flow_auto_suggestions', 'flow_learning_mode'),
            'classes': ('collapse',)
        }),
        ('Estatísticas', {
            'fields': ('total_flow_commands_used', 'last_flow_command_date'),
            'classes': ('collapse',)
        }),
        ('Dashboard', {
            'fields': ('dashboard_layout',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(UsageTracking)
class UsageTrackingAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'feature_type', 'feature_name', 'usage_date',
        'execution_time_ms', 'success'
    ]
    list_filter = ['feature_type', 'success', 'usage_date']
    search_fields = ['user__first_name', 'user__last_name', 'feature_name']
    readonly_fields = ['usage_date']
    date_hierarchy = 'usage_date'
    
    fieldsets = (
        ('Uso', {
            'fields': ('user', 'feature_type', 'feature_name', 'usage_date')
        }),
        ('Execução', {
            'fields': ('execution_time_ms', 'success', 'error_message')
        }),
        ('Dados', {
            'fields': ('request_data', 'response_data'),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('ip_address', 'user_agent'),
            'classes': ('collapse',)
        })
    )


@admin.register(AccessRestriction)
class AccessRestrictionAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'restriction_type', 'feature_affected', 'status',
        'start_date', 'end_date', 'created_at'
    ]
    list_filter = ['restriction_type', 'status', 'created_at']
    search_fields = ['user__first_name', 'user__last_name', 'reason']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Restrição', {
            'fields': ('user', 'restriction_type', 'feature_affected', 'status')
        }),
        ('Detalhes', {
            'fields': ('reason', 'start_date', 'end_date')
        }),
        ('Configuração', {
            'fields': ('restriction_config',),
            'classes': ('collapse',)
        }),
        ('Controle', {
            'fields': ('created_by', 'lifted_by', 'lifted_at'),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )

