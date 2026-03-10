from django.contrib import admin
from .models import (
    RevenuePredictor, TrendAnalysis, PerformanceMetric,
    SeasonalityPattern, PredictiveAlert, DashboardWidget
)


@admin.register(RevenuePredictor)
class RevenuePredictorAdmin(admin.ModelAdmin):
    list_display = [
        'period_type', 'start_date', 'end_date', 'predicted_revenue',
        'confidence_score', 'trend_direction', 'created_at'
    ]
    list_filter = ['period_type', 'trend_direction', 'created_at']
    search_fields = ['predicted_revenue']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Período', {
            'fields': ('period_type', 'start_date', 'end_date')
        }),
        ('Predição', {
            'fields': ('predicted_revenue', 'confidence_score', 'trend_direction')
        }),
        ('Análise', {
            'fields': ('factors_analysis', 'seasonality_impact'),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(TrendAnalysis)
class TrendAnalysisAdmin(admin.ModelAdmin):
    list_display = [
        'trend_type', 'percentage_change', 'trend_strength',
        'analysis_period_start', 'analysis_period_end', 'created_at'
    ]
    list_filter = ['trend_type', 'trend_strength', 'created_at']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Análise', {
            'fields': ('trend_type', 'analysis_period_start', 'analysis_period_end')
        }),
        ('Resultados', {
            'fields': ('current_value', 'previous_value', 'percentage_change', 'trend_strength')
        }),
        ('Estatísticas', {
            'fields': ('statistical_significance',)
        }),
        ('Insights', {
            'fields': ('insights', 'recommendations'),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )


@admin.register(PerformanceMetric)
class PerformanceMetricAdmin(admin.ModelAdmin):
    list_display = [
        'metric_type', 'date', 'value', 'target_value',
        'variance_from_target', 'created_at'
    ]
    list_filter = ['metric_type', 'date', 'created_at']
    search_fields = ['notes']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Métrica', {
            'fields': ('metric_type', 'date', 'value')
        }),
        ('Metas e Benchmarks', {
            'fields': ('target_value', 'variance_from_target', 'benchmark_value')
        }),
        ('Observações', {
            'fields': ('notes',)
        }),
        ('Timestamp', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )


@admin.register(SeasonalityPattern)
class SeasonalityPatternAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'pattern_type', 'impact_factor', 'confidence_level',
        'is_active', 'created_at'
    ]
    list_filter = ['pattern_type', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Padrão', {
            'fields': ('pattern_type', 'name', 'description')
        }),
        ('Período', {
            'fields': ('start_period', 'end_period')
        }),
        ('Impacto', {
            'fields': ('impact_factor', 'confidence_level')
        }),
        ('Dados', {
            'fields': ('historical_data',),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active', 'created_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(PredictiveAlert)
class PredictiveAlertAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'alert_type', 'severity', 'probability',
        'is_acknowledged', 'created_at'
    ]
    list_filter = ['alert_type', 'severity', 'is_acknowledged', 'created_at']
    search_fields = ['title', 'description']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Alerta', {
            'fields': ('alert_type', 'severity', 'title', 'description')
        }),
        ('Predição', {
            'fields': ('predicted_impact', 'probability', 'time_horizon')
        }),
        ('Recomendações', {
            'fields': ('recommended_actions',)
        }),
        ('Dados Relacionados', {
            'fields': ('related_metrics',),
            'classes': ('collapse',)
        }),
        ('Reconhecimento', {
            'fields': ('is_acknowledged', 'acknowledged_by', 'acknowledged_at'),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )


@admin.register(DashboardWidget)
class DashboardWidgetAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'widget_type', 'user', 'position_x', 'position_y',
        'is_visible', 'created_at'
    ]
    list_filter = ['widget_type', 'is_visible', 'created_at']
    search_fields = ['title', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Widget', {
            'fields': ('widget_type', 'title', 'description', 'user')
        }),
        ('Layout', {
            'fields': ('position_x', 'position_y', 'width', 'height')
        }),
        ('Configuração', {
            'fields': ('configuration', 'is_visible', 'refresh_interval')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

