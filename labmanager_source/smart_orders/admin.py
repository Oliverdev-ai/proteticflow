from django.contrib import admin
from .models import (
    ClientOrderHistory, SmartOrderTemplate, MaterialSuggestion,
    PriceEstimationModel, SmartOrderSuggestion, ReworkPattern,
    SmartOrderMetrics
)


@admin.register(ClientOrderHistory)
class ClientOrderHistoryAdmin(admin.ModelAdmin):
    list_display = [
        'client', 'job', 'total_value', 'completion_time_days',
        'client_satisfaction', 'season', 'created_at'
    ]
    list_filter = ['season', 'day_of_week', 'client_satisfaction', 'created_at']
    search_fields = ['client__name', 'job__id']
    readonly_fields = ['created_at']


@admin.register(SmartOrderTemplate)
class SmartOrderTemplateAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'template_type', 'client', 'confidence_score',
        'usage_count', 'success_rate', 'is_active', 'priority'
    ]
    list_filter = ['template_type', 'is_active', 'created_at']
    search_fields = ['name', 'client__name']
    readonly_fields = ['usage_count', 'success_rate', 'created_at', 'updated_at']


@admin.register(MaterialSuggestion)
class MaterialSuggestionAdmin(admin.ModelAdmin):
    list_display = [
        'material_name', 'service_type', 'material_category',
        'confidence_score', 'times_suggested', 'times_accepted',
        'is_active'
    ]
    list_filter = ['material_category', 'is_active', 'created_at']
    search_fields = ['material_name', 'service_type']
    readonly_fields = ['times_suggested', 'times_accepted', 'created_at', 'updated_at']


@admin.register(PriceEstimationModel)
class PriceEstimationModelAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'model_type', 'accuracy_score', 'mean_absolute_error',
        'training_data_size', 'last_training_date', 'is_active'
    ]
    list_filter = ['model_type', 'is_active', 'auto_retrain']
    search_fields = ['name']
    readonly_fields = ['last_training_date', 'created_at', 'updated_at']


@admin.register(SmartOrderSuggestion)
class SmartOrderSuggestionAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'client', 'suggestion_type', 'confidence_score',
        'status', 'created_at', 'responded_at'
    ]
    list_filter = ['suggestion_type', 'status', 'created_at']
    search_fields = ['title', 'client__name']
    readonly_fields = ['created_at', 'responded_at']


@admin.register(ReworkPattern)
class ReworkPatternAdmin(admin.ModelAdmin):
    list_display = [
        'pattern_name', 'frequency_score', 'cost_impact',
        'time_impact_hours', 'requires_attention', 'is_active'
    ]
    list_filter = ['requires_attention', 'is_active', 'created_at']
    search_fields = ['pattern_name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(SmartOrderMetrics)
class SmartOrderMetricsAdmin(admin.ModelAdmin):
    list_display = [
        'date', 'total_suggestions_generated', 'suggestions_accepted',
        'auto_fill_usage_count', 'price_estimations_generated',
        'estimated_cost_savings'
    ]
    list_filter = ['date']
    readonly_fields = ['created_at']
    date_hierarchy = 'date'

