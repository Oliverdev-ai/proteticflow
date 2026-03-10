from rest_framework import serializers
from .models import (
    TechnicianProfile, JobTimeEstimate, ProductionSchedule, 
    BottleneckAlert, MLModelMetrics
)
from apps.jobs.models import Job
from accounts.models import CustomUser


class TechnicianProfileSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = TechnicianProfile
        fields = [
            'id', 'user', 'user_name', 'username', 'specialties', 
            'skill_level', 'average_work_time', 'efficiency_rating',
            'is_available', 'created_at', 'updated_at'
        ]


class JobTimeEstimateSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobTimeEstimate
        fields = [
            'id', 'prosthesis_type', 'material', 'complexity_level',
            'base_time_hours', 'min_time_hours', 'max_time_hours',
            'created_at', 'updated_at'
        ]


class ProductionScheduleSerializer(serializers.ModelSerializer):
    job_order_number = serializers.CharField(source='job.order_number', read_only=True)
    job_client_name = serializers.CharField(source='job.client.name', read_only=True)
    job_due_date = serializers.DateField(source='job.due_date', read_only=True)
    technician_name = serializers.CharField(source='assigned_technician.user.get_full_name', read_only=True)
    
    class Meta:
        model = ProductionSchedule
        fields = [
            'id', 'job', 'job_order_number', 'job_client_name', 'job_due_date',
            'assigned_technician', 'technician_name', 'estimated_start_date',
            'estimated_completion_date', 'estimated_duration_hours',
            'priority_score', 'bottleneck_risk', 'optimization_notes',
            'created_at', 'updated_at'
        ]


class BottleneckAlertSerializer(serializers.ModelSerializer):
    affected_jobs_count = serializers.IntegerField(source='affected_jobs.count', read_only=True)
    technician_name = serializers.CharField(source='affected_technician.user.get_full_name', read_only=True)
    
    class Meta:
        model = BottleneckAlert
        fields = [
            'id', 'alert_type', 'severity', 'title', 'description',
            'affected_jobs_count', 'affected_technician', 'technician_name',
            'suggested_actions', 'is_resolved', 'resolved_at', 'created_at'
        ]


class MLModelMetricsSerializer(serializers.ModelSerializer):
    class Meta:
        model = MLModelMetrics
        fields = [
            'id', 'model_name', 'model_version', 'accuracy_score',
            'mae_score', 'rmse_score', 'training_data_size',
            'last_trained_at', 'feature_importance', 'is_active'
        ]


class TimeEstimationRequestSerializer(serializers.Serializer):
    """Serializer para requisições de estimativa de tempo"""
    prosthesis_type = serializers.CharField(max_length=100)
    material = serializers.CharField(max_length=100, required=False, allow_blank=True)
    complexity_level = serializers.IntegerField(min_value=1, max_value=4, required=False)
    technician_id = serializers.IntegerField(required=False)
    client_id = serializers.IntegerField(required=False)


class TimeEstimationResponseSerializer(serializers.Serializer):
    """Serializer para respostas de estimativa de tempo"""
    estimated_hours = serializers.FloatField()
    estimated_days = serializers.FloatField()
    confidence = serializers.FloatField()
    factors = serializers.DictField(required=False)


class ScheduleOptimizationRequestSerializer(serializers.Serializer):
    """Serializer para requisições de otimização de cronograma"""
    job_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="IDs dos trabalhos a otimizar. Se vazio, otimiza todos os pendentes."
    )
    technician_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="IDs dos técnicos disponíveis. Se vazio, usa todos os disponíveis."
    )
    constraints = serializers.DictField(
        required=False,
        help_text="Restrições adicionais para otimização"
    )


class ScheduleOptimizationResponseSerializer(serializers.Serializer):
    """Serializer para respostas de otimização"""
    success = serializers.BooleanField()
    message = serializers.CharField()
    optimized_jobs = serializers.IntegerField(required=False)
    bottlenecks_identified = serializers.IntegerField(required=False)
    optimization_time = serializers.FloatField(required=False)


class BottleneckAnalysisResponseSerializer(serializers.Serializer):
    """Serializer para análise de gargalos"""
    success = serializers.BooleanField()
    message = serializers.CharField()
    bottlenecks_found = serializers.IntegerField()
    critical_alerts = serializers.IntegerField(required=False)
    recommendations = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )

