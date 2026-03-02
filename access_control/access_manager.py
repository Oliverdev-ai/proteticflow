from django.utils import timezone
from datetime import timedelta, datetime
from django.db.models import Count, Q
from .models import (
    SubscriptionPlan, UserRole, UserSubscription, UserProfile,
    UsageTracking, AccessRestriction
)
import logging

logger = logging.getLogger(__name__)


class AccessControlManager:
    """Gerenciador central de controle de acesso"""
    
    def __init__(self, user):
        self.user = user
        self._subscription = None
        self._profile = None
        self._role = None
    
    @property
    def subscription(self):
        """Obtém assinatura do usuário"""
        if not self._subscription:
            try:
                self._subscription = UserSubscription.objects.get(user=self.user)
            except UserSubscription.DoesNotExist:
                # Criar assinatura gratuita padrão
                self._subscription = self._create_default_subscription()
        return self._subscription
    
    @property
    def profile(self):
        """Obtém perfil do usuário"""
        if not self._profile:
            try:
                self._profile = UserProfile.objects.get(user=self.user)
            except UserProfile.DoesNotExist:
                # Criar perfil padrão
                self._profile = self._create_default_profile()
        return self._profile
    
    @property
    def role(self):
        """Obtém papel do usuário"""
        if not self._role:
            self._role = self.profile.role
        return self._role
    
    def _create_default_subscription(self):
        """Cria assinatura padrão (gratuita)"""
        try:
            free_plan = SubscriptionPlan.objects.get(plan_type=SubscriptionPlan.PlanType.FREE)
        except SubscriptionPlan.DoesNotExist:
            # Criar plano gratuito se não existir
            free_plan = SubscriptionPlan.objects.create(
                name="Plano Gratuito",
                plan_type=SubscriptionPlan.PlanType.FREE,
                description="Plano gratuito com funcionalidades básicas",
                flow_commands_per_day=5,
                flow_commands_per_month=100,
                is_default=True
            )
        
        # Período de teste de 30 dias
        trial_end = timezone.now() + timedelta(days=30)
        
        subscription = UserSubscription.objects.create(
            user=self.user,
            plan=free_plan,
            status=UserSubscription.SubscriptionStatus.TRIAL,
            start_date=timezone.now(),
            trial_end_date=trial_end
        )
        
        return subscription
    
    def _create_default_profile(self):
        """Cria perfil padrão do usuário"""
        # Determinar papel baseado no tipo de usuário
        if hasattr(self.user, 'user_type'):
            if self.user.user_type == 'admin':
                role_type = UserRole.RoleType.ADMIN
            elif self.user.user_type == 'technician':
                role_type = UserRole.RoleType.TECHNICIAN
            else:
                role_type = UserRole.RoleType.ASSISTANT
        else:
            role_type = UserRole.RoleType.ASSISTANT
        
        try:
            role = UserRole.objects.get(role_type=role_type)
        except UserRole.DoesNotExist:
            # Criar papel padrão se não existir
            role = self._create_default_roles()[role_type]
        
        profile = UserProfile.objects.create(
            user=self.user,
            role=role
        )
        
        return profile
    
    def _create_default_roles(self):
        """Cria papéis padrão do sistema"""
        roles = {}
        
        # Papel de Proprietário/Admin
        roles[UserRole.RoleType.ADMIN] = UserRole.objects.create(
            name="Administrador",
            role_type=UserRole.RoleType.ADMIN,
            description="Acesso completo a todas as funcionalidades",
            can_manage_users=True,
            can_manage_settings=True,
            can_view_reports=True,
            can_manage_clients=True,
            can_manage_jobs=True,
            can_use_flow_commands=True,
            can_use_advanced_flow=True,
            can_optimize_schedules=True,
            can_manage_technician_profiles=True,
            can_view_bottleneck_alerts=True,
            can_generate_predictions=True,
            can_view_trend_analysis=True,
            can_manage_predictive_alerts=True,
            can_configure_dashboard=True,
            can_manage_chatbot=True,
            can_view_conversations=True,
            can_manage_notifications=True,
            can_manage_support_tickets=True,
            can_view_financial_data=True,
            can_generate_financial_reports=True,
            can_manage_pricing=True,
            flow_commands_multiplier=2.0,
            priority_level=100
        )
        
        # Papel de Técnico
        roles[UserRole.RoleType.TECHNICIAN] = UserRole.objects.create(
            name="Técnico",
            role_type=UserRole.RoleType.TECHNICIAN,
            description="Acesso a funcionalidades de produção e Flow básica",
            can_manage_users=False,
            can_manage_settings=False,
            can_view_reports=True,
            can_manage_clients=False,
            can_manage_jobs=True,
            can_use_flow_commands=True,
            can_use_advanced_flow=False,
            can_optimize_schedules=False,
            can_manage_technician_profiles=False,
            can_view_bottleneck_alerts=True,
            can_generate_predictions=False,
            can_view_trend_analysis=True,
            can_manage_predictive_alerts=False,
            can_configure_dashboard=False,
            can_manage_chatbot=False,
            can_view_conversations=False,
            can_manage_notifications=False,
            can_manage_support_tickets=False,
            can_view_financial_data=False,
            can_generate_financial_reports=False,
            can_manage_pricing=False,
            flow_commands_multiplier=0.5,
            priority_level=30
        )
        
        # Papel de Assistente
        roles[UserRole.RoleType.ASSISTANT] = UserRole.objects.create(
            name="Assistente",
            role_type=UserRole.RoleType.ASSISTANT,
            description="Acesso básico para assistentes administrativos",
            can_manage_users=False,
            can_manage_settings=False,
            can_view_reports=True,
            can_manage_clients=True,
            can_manage_jobs=True,
            can_use_flow_commands=True,
            can_use_advanced_flow=False,
            can_optimize_schedules=False,
            can_manage_technician_profiles=False,
            can_view_bottleneck_alerts=False,
            can_generate_predictions=False,
            can_view_trend_analysis=False,
            can_manage_predictive_alerts=False,
            can_configure_dashboard=False,
            can_manage_chatbot=False,
            can_view_conversations=True,
            can_manage_notifications=False,
            can_manage_support_tickets=False,
            can_view_financial_data=False,
            can_generate_financial_reports=False,
            can_manage_pricing=False,
            flow_commands_multiplier=0.8,
            priority_level=20
        )
        
        return roles
    
    def can_use_feature(self, feature_name):
        """Verifica se o usuário pode usar uma funcionalidade"""
        # Verificar restrições ativas
        if self._has_active_restriction(feature_name):
            return False, "Funcionalidade restrita"
        
        # Verificar permissões do papel
        permission_map = {
            'flow_commands': 'can_use_flow_commands',
            'advanced_flow': 'can_use_advanced_flow',
            'intelligent_scheduling': 'can_optimize_schedules',
            'predictive_analytics': 'can_generate_predictions',
            'automated_support': 'can_manage_chatbot',
            'smart_orders': 'can_use_advanced_flow',  # Usar permissão avançada
            'financial_reports': 'can_generate_financial_reports',
        }
        
        permission_attr = permission_map.get(feature_name)
        if permission_attr and not getattr(self.role, permission_attr, False):
            return False, "Permissão insuficiente"
        
        # Verificar limites do plano
        plan_check = self._check_plan_limits(feature_name)
        if not plan_check[0]:
            return plan_check
        
        return True, "Acesso permitido"
    
    def _has_active_restriction(self, feature_name):
        """Verifica se há restrições ativas"""
        return AccessRestriction.objects.filter(
            user=self.user,
            status=AccessRestriction.RestrictionStatus.ACTIVE,
            start_date__lte=timezone.now()
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=timezone.now())
        ).filter(
            Q(feature_affected='') | Q(feature_affected=feature_name)
        ).exists()
    
    def _check_plan_limits(self, feature_name):
        """Verifica limites do plano"""
        plan = self.subscription.plan
        
        # Mapear funcionalidades para atributos do plano
        feature_map = {
            'intelligent_scheduling': 'intelligent_scheduling_enabled',
            'predictive_analytics': 'predictive_analytics_enabled',
            'automated_support': 'automated_support_enabled',
            'smart_orders': 'smart_orders_enabled',
        }
        
        plan_attr = feature_map.get(feature_name)
        if plan_attr and not getattr(plan, plan_attr, True):
            return False, f"Funcionalidade não disponível no plano {plan.name}"
        
        return True, "Limite do plano OK"
    
    def check_usage_limit(self, feature_type, period='daily'):
        """Verifica limites de uso"""
        # Calcular período
        now = timezone.now()
        if period == 'daily':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            limit_attr = 'flow_commands_per_day'
        elif period == 'monthly':
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            limit_attr = 'flow_commands_per_month'
        else:
            return True, "Período inválido"
        
        # Contar uso atual
        current_usage = UsageTracking.objects.filter(
            user=self.user,
            feature_type=feature_type,
            usage_date__gte=start_date,
            success=True
        ).count()
        
        # Obter limite
        base_limit = getattr(self.subscription.plan, limit_attr, 0)
        
        # Aplicar multiplicador do papel
        role_multiplier = self.role.flow_commands_multiplier
        effective_limit = int(base_limit * role_multiplier)
        
        # Aplicar limites personalizados
        if period == 'daily' and self.profile.custom_flow_limit_daily:
            effective_limit = self.profile.custom_flow_limit_daily
        elif period == 'monthly' and self.profile.custom_flow_limit_monthly:
            effective_limit = self.profile.custom_flow_limit_monthly
        
        # Verificar limite
        if current_usage >= effective_limit:
            return False, f"Limite {period} excedido ({current_usage}/{effective_limit})"
        
        return True, f"Uso atual: {current_usage}/{effective_limit}"
    
    def track_usage(self, feature_type, feature_name, request_data=None, response_data=None, 
                   execution_time_ms=None, success=True, error_message=''):
        """Registra uso de funcionalidade"""
        try:
            UsageTracking.objects.create(
                user=self.user,
                feature_type=feature_type,
                feature_name=feature_name,
                request_data=request_data or {},
                response_data=response_data or {},
                execution_time_ms=execution_time_ms,
                success=success,
                error_message=error_message
            )
            
            # Atualizar estatísticas do perfil
            if feature_type == UsageTracking.FeatureType.FLOW_COMMAND and success:
                self.profile.total_flow_commands_used += 1
                self.profile.last_flow_command_date = timezone.now()
                self.profile.save(update_fields=['total_flow_commands_used', 'last_flow_command_date'])
                
        except Exception as e:
            logger.error(f"Erro ao registrar uso: {e}")
    
    def get_usage_summary(self, days=30):
        """Obtém resumo de uso"""
        start_date = timezone.now() - timedelta(days=days)
        
        usage_data = UsageTracking.objects.filter(
            user=self.user,
            usage_date__gte=start_date
        ).values('feature_type').annotate(
            total_uses=Count('id'),
            successful_uses=Count('id', filter=Q(success=True))
        )
        
        return {
            'period_days': days,
            'usage_by_feature': list(usage_data),
            'total_commands': sum(item['total_uses'] for item in usage_data),
            'success_rate': (
                sum(item['successful_uses'] for item in usage_data) / 
                max(sum(item['total_uses'] for item in usage_data), 1)
            ) * 100
        }
    
    def get_remaining_limits(self):
        """Obtém limites restantes"""
        now = timezone.now()
        
        # Limite diário
        daily_check = self.check_usage_limit(
            UsageTracking.FeatureType.FLOW_COMMAND, 
            'daily'
        )
        
        # Limite mensal
        monthly_check = self.check_usage_limit(
            UsageTracking.FeatureType.FLOW_COMMAND, 
            'monthly'
        )
        
        return {
            'daily': {
                'available': daily_check[0],
                'message': daily_check[1]
            },
            'monthly': {
                'available': monthly_check[0],
                'message': monthly_check[1]
            },
            'subscription_status': self.subscription.status,
            'subscription_plan': self.subscription.plan.name,
            'days_remaining': self.subscription.days_remaining()
        }


class PermissionChecker:
    """Verificador de permissões específicas"""
    
    @staticmethod
    def can_access_command(user, command_name):
        """Verifica se usuário pode executar comando específico"""
        access_manager = AccessControlManager(user)
        
        # Mapear comandos para funcionalidades
        command_feature_map = {
            # Comandos de agendamento inteligente
            'optimize_production_schedule': 'intelligent_scheduling',
            'find_best_technician_for_job': 'intelligent_scheduling',
            'reorganize_schedule_for_absence': 'intelligent_scheduling',
            'identify_production_bottlenecks': 'intelligent_scheduling',
            'suggest_optimal_firing_time': 'intelligent_scheduling',
            
            # Comandos de análise preditiva
            'predict_revenue_next_months': 'predictive_analytics',
            'analyze_performance_trends': 'predictive_analytics',
            'identify_market_opportunities': 'predictive_analytics',
            'generate_financial_forecast': 'predictive_analytics',
            
            # Comandos financeiros
            'generate_accounts_receivable_report': 'financial_reports',
            'generate_monthly_closing': 'financial_reports',
            'generate_annual_balance': 'financial_reports',
            
            # Comandos básicos (sempre permitidos se tiver acesso à Flow)
            'list_clients': 'flow_commands',
            'search_client': 'flow_commands',
            'help_register_client': 'flow_commands',
            'help_register_job': 'flow_commands',
            'help_complete_job': 'flow_commands',
        }
        
        feature = command_feature_map.get(command_name, 'flow_commands')
        
        # Verificar acesso à funcionalidade
        can_use, message = access_manager.can_use_feature(feature)
        if not can_use:
            return False, message
        
        # Verificar limites de uso para comandos Flow
        if feature in ['flow_commands', 'intelligent_scheduling', 'predictive_analytics']:
            # Verificar limite diário primeiro
            daily_check = access_manager.check_usage_limit(
                UsageTracking.FeatureType.FLOW_COMMAND, 
                'daily'
            )
            if not daily_check[0]:
                return False, daily_check[1]
            
            # Verificar limite mensal
            monthly_check = access_manager.check_usage_limit(
                UsageTracking.FeatureType.FLOW_COMMAND, 
                'monthly'
            )
            if not monthly_check[0]:
                return False, monthly_check[1]
        
        return True, "Comando autorizado"
    
    @staticmethod
    def get_user_permissions(user):
        """Obtém todas as permissões do usuário"""
        try:
            profile = UserProfile.objects.get(user=user)
            role = profile.role
            
            permissions = {}
            
            # Extrair todas as permissões do papel
            for field in role._meta.fields:
                if field.name.startswith('can_'):
                    permissions[field.name] = getattr(role, field.name)
            
            return permissions
            
        except UserProfile.DoesNotExist:
            return {}


def initialize_default_plans():
    """Inicializa planos padrão do sistema"""
    plans_data = [
        {
            'name': 'Plano Gratuito',
            'plan_type': SubscriptionPlan.PlanType.FREE,
            'description': 'Plano gratuito com funcionalidades básicas da Flow',
            'flow_commands_per_day': 5,
            'flow_commands_per_month': 100,
            'intelligent_scheduling_enabled': False,
            'predictive_analytics_enabled': False,
            'automated_support_enabled': False,
            'smart_orders_enabled': False,
            'max_users': 2,
            'max_technicians': 1,
            'monthly_price': 0,
            'is_default': True
        },
        {
            'name': 'Plano Básico',
            'plan_type': SubscriptionPlan.PlanType.BASIC,
            'description': 'Plano básico com Flow avançada e agendamento inteligente',
            'flow_commands_per_day': 25,
            'flow_commands_per_month': 500,
            'intelligent_scheduling_enabled': True,
            'scheduling_optimizations_per_day': 5,
            'predictive_analytics_enabled': False,
            'automated_support_enabled': False,
            'smart_orders_enabled': False,
            'max_users': 5,
            'max_technicians': 3,
            'monthly_price': 97.00
        },
        {
            'name': 'Plano Profissional',
            'plan_type': SubscriptionPlan.PlanType.PROFESSIONAL,
            'description': 'Plano completo com todas as funcionalidades de IA',
            'flow_commands_per_day': 100,
            'flow_commands_per_month': 2000,
            'intelligent_scheduling_enabled': True,
            'scheduling_optimizations_per_day': 20,
            'predictive_analytics_enabled': True,
            'revenue_predictions_per_month': 10,
            'trend_analysis_per_month': 20,
            'automated_support_enabled': True,
            'chatbot_conversations_per_month': 500,
            'automated_notifications_per_month': 1000,
            'smart_orders_enabled': True,
            'ai_suggestions_per_day': 50,
            'api_access_enabled': True,
            'max_users': 15,
            'max_technicians': 10,
            'monthly_price': 197.00
        },
        {
            'name': 'Plano Empresarial',
            'plan_type': SubscriptionPlan.PlanType.ENTERPRISE,
            'description': 'Plano empresarial com recursos ilimitados e suporte prioritário',
            'flow_commands_per_day': 500,
            'flow_commands_per_month': 10000,
            'intelligent_scheduling_enabled': True,
            'scheduling_optimizations_per_day': 100,
            'predictive_analytics_enabled': True,
            'revenue_predictions_per_month': 50,
            'trend_analysis_per_month': 100,
            'automated_support_enabled': True,
            'chatbot_conversations_per_month': 5000,
            'automated_notifications_per_month': 10000,
            'smart_orders_enabled': True,
            'ai_suggestions_per_day': 200,
            'custom_ai_training_enabled': True,
            'api_access_enabled': True,
            'priority_support': True,
            'max_users': 50,
            'max_technicians': 30,
            'monthly_price': 497.00
        }
    ]
    
    for plan_data in plans_data:
        plan, created = SubscriptionPlan.objects.get_or_create(
            plan_type=plan_data['plan_type'],
            defaults=plan_data
        )
        if created:
            logger.info(f"Plano criado: {plan.name}")


def setup_user_access(user):
    """Configura acesso inicial para um usuário"""
    access_manager = AccessControlManager(user)
    
    # Isso irá criar automaticamente a assinatura e perfil padrão
    subscription = access_manager.subscription
    profile = access_manager.profile
    
    logger.info(f"Acesso configurado para {user.get_full_name()}: {subscription.plan.name}, {profile.role.name}")
    
    return access_manager

