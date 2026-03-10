from rest_framework import serializers
from .models import (
    ClientOrderHistory, SmartOrderTemplate, MaterialSuggestion,
    PriceEstimationModel, SmartOrderSuggestion, ReworkPattern,
    SmartOrderMetrics
)


class ClientOrderHistorySerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    job_id = serializers.CharField(source='job.id', read_only=True)
    
    class Meta:
        model = ClientOrderHistory
        fields = [
            'id', 'client', 'client_name', 'job', 'job_id',
            'service_types', 'materials_used', 'total_value',
            'completion_time_days', 'client_satisfaction',
            'season', 'day_of_week', 'created_at'
        ]


class SmartOrderTemplateSerializer(serializers.ModelSerializer):
    template_type_display = serializers.CharField(source='get_template_type_display', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    
    class Meta:
        model = SmartOrderTemplate
        fields = [
            'id', 'name', 'template_type', 'template_type_display',
            'client', 'client_name', 'service_types_pattern',
            'suggested_services', 'suggested_materials',
            'estimated_price_range', 'estimated_completion_days',
            'confidence_score', 'usage_count', 'success_rate',
            'seasonal_conditions', 'is_active', 'priority',
            'created_at', 'updated_at'
        ]


class MaterialSuggestionSerializer(serializers.ModelSerializer):
    acceptance_rate_value = serializers.SerializerMethodField()
    
    class Meta:
        model = MaterialSuggestion
        fields = [
            'id', 'service_type', 'client_profile', 'material_name',
            'material_category', 'suggested_quantity', 'unit_of_measure',
            'estimated_cost', 'confidence_score', 'frequency_score',
            'times_suggested', 'times_accepted', 'acceptance_rate_value',
            'seasonal_relevance', 'alternative_materials', 'is_active',
            'created_at', 'updated_at'
        ]
    
    def get_acceptance_rate_value(self, obj):
        return obj.acceptance_rate


class PriceEstimationModelSerializer(serializers.ModelSerializer):
    model_type_display = serializers.CharField(source='get_model_type_display', read_only=True)
    
    class Meta:
        model = PriceEstimationModel
        fields = [
            'id', 'name', 'model_type', 'model_type_display',
            'service_categories', 'model_parameters', 'feature_weights',
            'accuracy_score', 'mean_absolute_error', 'r2_score',
            'training_data_size', 'last_training_date', 'is_active',
            'auto_retrain', 'retrain_threshold', 'created_at', 'updated_at'
        ]


class SmartOrderSuggestionSerializer(serializers.ModelSerializer):
    suggestion_type_display = serializers.CharField(source='get_suggestion_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    job_id = serializers.CharField(source='job.id', read_only=True)
    template_name = serializers.CharField(source='source_template.name', read_only=True)
    
    class Meta:
        model = SmartOrderSuggestion
        fields = [
            'id', 'client', 'client_name', 'job', 'job_id',
            'suggestion_type', 'suggestion_type_display', 'title',
            'description', 'suggested_data', 'confidence_score',
            'potential_value_impact', 'ai_reasoning', 'source_template',
            'template_name', 'status', 'status_display', 'user_feedback',
            'applied_data', 'created_at', 'responded_at'
        ]


class ReworkPatternSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReworkPattern
        fields = [
            'id', 'pattern_name', 'pattern_description',
            'service_types_affected', 'materials_involved', 'common_causes',
            'frequency_score', 'cost_impact', 'time_impact_hours',
            'prevention_suggestions', 'early_warning_indicators',
            'detection_confidence', 'sample_size', 'is_active',
            'requires_attention', 'created_at', 'updated_at'
        ]


class SmartOrderMetricsSerializer(serializers.ModelSerializer):
    suggestion_acceptance_rate_value = serializers.SerializerMethodField()
    material_suggestion_acceptance_rate_value = serializers.SerializerMethodField()
    
    class Meta:
        model = SmartOrderMetrics
        fields = [
            'id', 'date', 'total_suggestions_generated', 'suggestions_accepted',
            'suggestions_rejected', 'suggestion_acceptance_rate_value',
            'auto_fill_usage_count', 'auto_fill_accuracy',
            'price_estimations_generated', 'price_estimation_accuracy',
            'material_suggestions_count', 'material_suggestions_accepted',
            'material_suggestion_acceptance_rate_value', 'rework_patterns_detected',
            'rework_prevention_success', 'estimated_time_saved_hours',
            'estimated_cost_savings', 'revenue_impact', 'created_at'
        ]
    
    def get_suggestion_acceptance_rate_value(self, obj):
        return obj.suggestion_acceptance_rate
    
    def get_material_suggestion_acceptance_rate_value(self, obj):
        return obj.material_suggestion_acceptance_rate


class AutoFillRequestSerializer(serializers.Serializer):
    """Serializer para requisições de auto-preenchimento"""
    client_id = serializers.IntegerField()
    partial_order_data = serializers.DictField(required=False)


class AutoFillResponseSerializer(serializers.Serializer):
    """Serializer para respostas de auto-preenchimento"""
    services = serializers.ListField()
    materials = serializers.ListField()
    pricing = serializers.DictField()
    timeline = serializers.DictField()
    templates = serializers.ListField()


class PricePredictionRequestSerializer(serializers.Serializer):
    """Serializer para requisições de predição de preço"""
    order_data = serializers.DictField()
    service_category = serializers.CharField(required=False)


class PricePredictionResponseSerializer(serializers.Serializer):
    """Serializer para respostas de predição de preço"""
    predicted_price = serializers.FloatField()
    confidence_interval = serializers.DictField()
    confidence_score = serializers.FloatField()
    model_used = serializers.CharField()


class SuggestionFeedbackSerializer(serializers.Serializer):
    """Serializer para feedback de sugestões"""
    suggestion_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=SmartOrderSuggestion.SuggestionStatus.choices)
    user_feedback = serializers.CharField(required=False)
    applied_data = serializers.DictField(required=False)

