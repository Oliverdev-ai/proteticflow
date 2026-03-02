from rest_framework import serializers
from .models import (
    SubscriptionPlan, UserRole, UserSubscription, UserProfile,
    UsageTracking, AccessRestriction
)


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    plan_type_display = serializers.CharField(source='get_plan_type_display', read_only=True)
    
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'plan_type', 'plan_type_display', 'description',
            'flow_commands_per_day', 'flow_commands_per_month',
            'intelligent_scheduling_enabled', 'scheduling_optimizations_per_day',
            'predictive_analytics_enabled', 'revenue_predictions_per_month',
            'trend_analysis_per_month', 'automated_support_enabled',
            'chatbot_conversations_per_month', 'automated_notifications_per_month',
            'smart_orders_enabled', 'ai_suggestions_per_day',
            'custom_ai_training_enabled', 'api_access_enabled', 'priority_support',
            'max_users', 'max_technicians', 'monthly_price', 'annual_price',
            'is_active', 'created_at'
        ]


class UserRoleSerializer(serializers.ModelSerializer):
    role_type_display = serializers.CharField(source='get_role_type_display', read_only=True)
    
    class Meta:
        model = UserRole
        fields = [
            'id', 'name', 'role_type', 'role_type_display', 'description',
            'can_manage_users', 'can_manage_settings', 'can_view_reports',
            'can_manage_clients', 'can_manage_jobs', 'can_use_flow_commands',
            'can_use_advanced_flow', 'can_optimize_schedules',
            'can_manage_technician_profiles', 'can_view_bottleneck_alerts',
            'can_generate_predictions', 'can_view_trend_analysis',
            'can_manage_predictive_alerts', 'can_configure_dashboard',
            'can_manage_chatbot', 'can_view_conversations',
            'can_manage_notifications', 'can_manage_support_tickets',
            'can_view_financial_data', 'can_generate_financial_reports',
            'can_manage_pricing', 'flow_commands_multiplier', 'priority_level',
            'is_active', 'created_at'
        ]


class UserSubscriptionSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_type = serializers.CharField(source='plan.plan_type', read_only=True)
    is_active_status = serializers.SerializerMethodField()
    is_trial_status = serializers.SerializerMethodField()
    days_remaining_count = serializers.SerializerMethodField()
    
    class Meta:
        model = UserSubscription
        fields = [
            'id', 'plan', 'plan_name', 'plan_type', 'status', 'status_display',
            'start_date', 'end_date', 'trial_end_date', 'auto_renew',
            'custom_limits', 'payment_method', 'last_payment_date',
            'next_payment_date', 'is_active_status', 'is_trial_status',
            'days_remaining_count', 'created_at', 'updated_at'
        ]
    
    def get_is_active_status(self, obj):
        return obj.is_active()
    
    def get_is_trial_status(self, obj):
        return obj.is_trial()
    
    def get_days_remaining_count(self, obj):
        return obj.days_remaining()


class UserProfileSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)
    role_type = serializers.CharField(source='role.role_type', read_only=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'user_full_name', 'user_email', 'role', 'role_name',
            'role_type', 'preferred_language', 'timezone',
            'custom_flow_limit_daily', 'custom_flow_limit_monthly',
            'email_notifications', 'sms_notifications', 'push_notifications',
            'flow_auto_suggestions', 'flow_learning_mode',
            'total_flow_commands_used', 'last_flow_command_date',
            'dashboard_layout', 'is_active', 'created_at', 'updated_at'
        ]


class UsageTrackingSerializer(serializers.ModelSerializer):
    feature_type_display = serializers.CharField(source='get_feature_type_display', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = UsageTracking
        fields = [
            'id', 'user', 'user_name', 'feature_type', 'feature_type_display',
            'feature_name', 'usage_date', 'execution_time_ms', 'success',
            'error_message'
        ]


class AccessRestrictionSerializer(serializers.ModelSerializer):
    restriction_type_display = serializers.CharField(source='get_restriction_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    is_active_status = serializers.SerializerMethodField()
    
    class Meta:
        model = AccessRestriction
        fields = [
            'id', 'user', 'user_name', 'restriction_type', 'restriction_type_display',
            'feature_affected', 'reason', 'status', 'status_display',
            'start_date', 'end_date', 'restriction_config', 'created_by',
            'created_by_name', 'lifted_by', 'lifted_at', 'is_active_status',
            'created_at'
        ]
    
    def get_is_active_status(self, obj):
        return obj.is_active()


class AccessControlStatusSerializer(serializers.Serializer):
    """Serializer para status de controle de acesso"""
    can_access = serializers.BooleanField()
    message = serializers.CharField()
    subscription_plan = serializers.CharField()
    user_role = serializers.CharField()
    remaining_limits = serializers.DictField()
    permissions = serializers.DictField()


class UsageSummarySerializer(serializers.Serializer):
    """Serializer para resumo de uso"""
    period_days = serializers.IntegerField()
    usage_by_feature = serializers.ListField()
    total_commands = serializers.IntegerField()
    success_rate = serializers.FloatField()


class FeatureAccessRequestSerializer(serializers.Serializer):
    """Serializer para requisições de acesso a funcionalidades"""
    feature_name = serializers.CharField(max_length=100)
    command_name = serializers.CharField(max_length=100, required=False)


class FeatureAccessResponseSerializer(serializers.Serializer):
    """Serializer para respostas de acesso a funcionalidades"""
    can_access = serializers.BooleanField()
    message = serializers.CharField()
    remaining_daily = serializers.IntegerField(required=False)
    remaining_monthly = serializers.IntegerField(required=False)


class UserLimitsUpdateSerializer(serializers.Serializer):
    """Serializer para atualização de limites de usuário"""
    custom_flow_limit_daily = serializers.IntegerField(min_value=0, required=False)
    custom_flow_limit_monthly = serializers.IntegerField(min_value=0, required=False)
    role_id = serializers.IntegerField(required=False)


class SubscriptionUpgradeSerializer(serializers.Serializer):
    """Serializer para upgrade de assinatura"""
    new_plan_id = serializers.IntegerField()
    payment_method = serializers.CharField(max_length=50, required=False)
    auto_renew = serializers.BooleanField(default=True)


class RestrictionCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de restrições"""
    
    class Meta:
        model = AccessRestriction
        fields = [
            'user', 'restriction_type', 'feature_affected', 'reason',
            'start_date', 'end_date', 'restriction_config'
        ]
    
    def validate(self, data):
        """Validação customizada"""
        if data.get('end_date') and data.get('start_date'):
            if data['end_date'] <= data['start_date']:
                raise serializers.ValidationError(
                    "Data de fim deve ser posterior à data de início"
                )
        return data

