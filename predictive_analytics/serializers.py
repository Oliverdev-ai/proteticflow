from rest_framework import serializers
from .models import (
    RevenuePredictor, TrendAnalysis, PerformanceMetric,
    SeasonalityPattern, PredictiveAlert, DashboardWidget
)


class RevenuePredictorSerializer(serializers.ModelSerializer):
    period_display = serializers.CharField(source='get_period_type_display', read_only=True)
    trend_display = serializers.CharField(source='get_trend_direction_display', read_only=True)
    
    class Meta:
        model = RevenuePredictor
        fields = [
            'id', 'period_type', 'period_display', 'start_date', 'end_date',
            'predicted_revenue', 'confidence_score', 'factors_analysis',
            'seasonality_impact', 'trend_direction', 'trend_display',
            'created_at', 'created_by'
        ]


class TrendAnalysisSerializer(serializers.ModelSerializer):
    trend_type_display = serializers.CharField(source='get_trend_type_display', read_only=True)
    trend_strength_display = serializers.CharField(source='get_trend_strength_display', read_only=True)
    
    class Meta:
        model = TrendAnalysis
        fields = [
            'id', 'trend_type', 'trend_type_display', 'analysis_period_start',
            'analysis_period_end', 'current_value', 'previous_value',
            'percentage_change', 'trend_strength', 'trend_strength_display',
            'statistical_significance', 'insights', 'recommendations',
            'created_at'
        ]


class PerformanceMetricSerializer(serializers.ModelSerializer):
    metric_type_display = serializers.CharField(source='get_metric_type_display', read_only=True)
    performance_status = serializers.SerializerMethodField()
    
    class Meta:
        model = PerformanceMetric
        fields = [
            'id', 'metric_type', 'metric_type_display', 'date', 'value',
            'target_value', 'variance_from_target', 'benchmark_value',
            'performance_status', 'notes', 'created_at'
        ]
    
    def get_performance_status(self, obj):
        """Determina status da performance"""
        if obj.target_value is None:
            return 'no_target'
        
        if obj.variance_from_target is None:
            return 'unknown'
        
        if obj.variance_from_target >= 0:
            return 'above_target'
        elif obj.variance_from_target >= -10:
            return 'near_target'
        else:
            return 'below_target'


class SeasonalityPatternSerializer(serializers.ModelSerializer):
    pattern_type_display = serializers.CharField(source='get_pattern_type_display', read_only=True)
    
    class Meta:
        model = SeasonalityPattern
        fields = [
            'id', 'pattern_type', 'pattern_type_display', 'name', 'description',
            'impact_factor', 'start_period', 'end_period', 'confidence_level',
            'historical_data', 'is_active', 'created_at'
        ]


class PredictiveAlertSerializer(serializers.ModelSerializer):
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    acknowledged_by_name = serializers.CharField(source='acknowledged_by.get_full_name', read_only=True)
    
    class Meta:
        model = PredictiveAlert
        fields = [
            'id', 'alert_type', 'alert_type_display', 'severity', 'severity_display',
            'title', 'description', 'predicted_impact', 'probability',
            'time_horizon', 'recommended_actions', 'related_metrics',
            'is_acknowledged', 'acknowledged_by', 'acknowledged_by_name',
            'acknowledged_at', 'created_at'
        ]


class DashboardWidgetSerializer(serializers.ModelSerializer):
    widget_type_display = serializers.CharField(source='get_widget_type_display', read_only=True)
    
    class Meta:
        model = DashboardWidget
        fields = [
            'id', 'widget_type', 'widget_type_display', 'title', 'description',
            'position_x', 'position_y', 'width', 'height', 'configuration',
            'is_visible', 'refresh_interval', 'created_at', 'updated_at'
        ]


class RevenuePredictionRequestSerializer(serializers.Serializer):
    """Serializer para requisições de predição de receita"""
    months_ahead = serializers.IntegerField(min_value=1, max_value=12, default=3)
    include_factors = serializers.BooleanField(default=True)


class RevenuePredictionResponseSerializer(serializers.Serializer):
    """Serializer para respostas de predição de receita"""
    predictions = serializers.ListField(
        child=serializers.DictField(),
        help_text="Lista de predições mensais"
    )
    confidence_average = serializers.FloatField()
    trend_analysis = serializers.DictField(required=False)
    seasonality_factors = serializers.ListField(required=False)


class TrendAnalysisRequestSerializer(serializers.Serializer):
    """Serializer para requisições de análise de tendências"""
    trend_types = serializers.ListField(
        child=serializers.ChoiceField(choices=TrendAnalysis.TrendType.choices),
        required=False,
        help_text="Tipos de tendência a analisar"
    )
    months_back = serializers.IntegerField(min_value=3, max_value=24, default=12)


class TrendAnalysisResponseSerializer(serializers.Serializer):
    """Serializer para respostas de análise de tendências"""
    trends = serializers.ListField(
        child=TrendAnalysisSerializer(),
        help_text="Lista de análises de tendência"
    )
    summary = serializers.DictField(
        help_text="Resumo das tendências"
    )


class DashboardDataRequestSerializer(serializers.Serializer):
    """Serializer para requisições de dados do dashboard"""
    widgets = serializers.ListField(
        child=serializers.ChoiceField(choices=DashboardWidget.WidgetType.choices),
        required=False,
        help_text="Widgets específicos a carregar"
    )
    date_range = serializers.CharField(
        max_length=20,
        required=False,
        default='last_30_days',
        help_text="Período dos dados (last_7_days, last_30_days, last_90_days, last_year)"
    )


class DashboardDataResponseSerializer(serializers.Serializer):
    """Serializer para respostas de dados do dashboard"""
    revenue_metrics = serializers.DictField(required=False)
    performance_kpis = serializers.DictField(required=False)
    trend_summaries = serializers.ListField(required=False)
    active_alerts = serializers.ListField(required=False)
    seasonality_insights = serializers.ListField(required=False)
    last_updated = serializers.DateTimeField()


class AlertAcknowledgeSerializer(serializers.Serializer):
    """Serializer para reconhecimento de alertas"""
    alert_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="IDs dos alertas a reconhecer"
    )
    notes = serializers.CharField(
        max_length=500,
        required=False,
        help_text="Observações sobre o reconhecimento"
    )

