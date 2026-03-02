from django.contrib import admin
from .models import (
    TechnicianProfile, JobTimeEstimate, ProductionSchedule, 
    BottleneckAlert, MLModelMetrics
)


@admin.register(TechnicianProfile)
class TechnicianProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'skill_level', 'efficiency_rating', 'is_available', 'created_at']
    list_filter = ['skill_level', 'is_available', 'created_at']
    search_fields = ['user__username', 'user__first_name', 'user__last_name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('user', 'is_available')
        }),
        ('Habilidades', {
            'fields': ('specialties', 'skill_level', 'efficiency_rating', 'average_work_time')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(JobTimeEstimate)
class JobTimeEstimateAdmin(admin.ModelAdmin):
    list_display = ['prosthesis_type', 'material', 'complexity_level', 'base_time_hours', 'created_at']
    list_filter = ['complexity_level', 'prosthesis_type', 'material']
    search_fields = ['prosthesis_type', 'material']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ProductionSchedule)
class ProductionScheduleAdmin(admin.ModelAdmin):
    list_display = [
        'job', 'assigned_technician', 'priority_score', 'bottleneck_risk',
        'estimated_start_date', 'estimated_completion_date'
    ]
    list_filter = ['assigned_technician', 'bottleneck_risk', 'created_at']
    search_fields = ['job__order_number', 'job__client__name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Trabalho', {
            'fields': ('job', 'assigned_technician')
        }),
        ('Cronograma', {
            'fields': ('estimated_start_date', 'estimated_completion_date', 'estimated_duration_hours')
        }),
        ('Otimização', {
            'fields': ('priority_score', 'bottleneck_risk', 'optimization_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(BottleneckAlert)
class BottleneckAlertAdmin(admin.ModelAdmin):
    list_display = ['title', 'alert_type', 'severity', 'affected_technician', 'is_resolved', 'created_at']
    list_filter = ['alert_type', 'severity', 'is_resolved', 'created_at']
    search_fields = ['title', 'description']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Alerta', {
            'fields': ('alert_type', 'severity', 'title', 'description')
        }),
        ('Afetados', {
            'fields': ('affected_technician', 'affected_jobs')
        }),
        ('Resolução', {
            'fields': ('suggested_actions', 'is_resolved', 'resolved_at')
        }),
        ('Timestamp', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )


@admin.register(MLModelMetrics)
class MLModelMetricsAdmin(admin.ModelAdmin):
    list_display = [
        'model_name', 'model_version', 'accuracy_score', 'mae_score', 
        'training_data_size', 'last_trained_at', 'is_active'
    ]
    list_filter = ['model_name', 'is_active', 'last_trained_at']
    readonly_fields = ['last_trained_at']
    
    fieldsets = (
        ('Modelo', {
            'fields': ('model_name', 'model_version', 'is_active')
        }),
        ('Métricas', {
            'fields': ('accuracy_score', 'mae_score', 'rmse_score', 'training_data_size')
        }),
        ('Features', {
            'fields': ('feature_importance',),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('last_trained_at',),
            'classes': ('collapse',)
        })
    )

