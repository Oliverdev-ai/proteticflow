from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from datetime import timedelta
import json


class SubscriptionPlan(models.Model):
    """Planos de assinatura com diferentes níveis de acesso"""
    
    class PlanType(models.TextChoices):
        FREE = 'free', _('Gratuito')
        BASIC = 'basic', _('Básico')
        PROFESSIONAL = 'professional', _('Profissional')
        ENTERPRISE = 'enterprise', _('Empresarial')
        CUSTOM = 'custom', _('Personalizado')
    
    name = models.CharField(_('Nome do Plano'), max_length=100)
    plan_type = models.CharField(
        _('Tipo do Plano'),
        max_length=20,
        choices=PlanType.choices,
        unique=True
    )
    
    description = models.TextField(_('Descrição'), blank=True)
    
    # Limites de uso da Flow IA
    flow_commands_per_day = models.IntegerField(
        _('Comandos Flow por Dia'),
        default=10,
        help_text=_('Número máximo de comandos IA por dia')
    )
    
    flow_commands_per_month = models.IntegerField(
        _('Comandos Flow por Mês'),
        default=300,
        help_text=_('Número máximo de comandos IA por mês')
    )
    
    # Funcionalidades de Agendamento Inteligente
    intelligent_scheduling_enabled = models.BooleanField(
        _('Agendamento Inteligente'),
        default=False
    )
    
    scheduling_optimizations_per_day = models.IntegerField(
        _('Otimizações de Agenda por Dia'),
        default=0
    )
    
    # Funcionalidades de Análise Preditiva
    predictive_analytics_enabled = models.BooleanField(
        _('Análise Preditiva'),
        default=False
    )
    
    revenue_predictions_per_month = models.IntegerField(
        _('Predições de Receita por Mês'),
        default=0
    )
    
    trend_analysis_per_month = models.IntegerField(
        _('Análises de Tendência por Mês'),
        default=0
    )
    
    # Funcionalidades de Atendimento Automatizado
    automated_support_enabled = models.BooleanField(
        _('Atendimento Automatizado'),
        default=False
    )
    
    chatbot_conversations_per_month = models.IntegerField(
        _('Conversas do Chatbot por Mês'),
        default=0
    )
    
    automated_notifications_per_month = models.IntegerField(
        _('Notificações Automáticas por Mês'),
        default=0
    )
    
    # Funcionalidades de Gestão Inteligente
    smart_orders_enabled = models.BooleanField(
        _('Gestão Inteligente de Ordens'),
        default=False
    )
    
    ai_suggestions_per_day = models.IntegerField(
        _('Sugestões IA por Dia'),
        default=0
    )
    
    # Recursos Avançados
    custom_ai_training_enabled = models.BooleanField(
        _('Treinamento IA Personalizado'),
        default=False
    )
    
    api_access_enabled = models.BooleanField(
        _('Acesso à API'),
        default=False
    )
    
    priority_support = models.BooleanField(
        _('Suporte Prioritário'),
        default=False
    )
    
    # Configurações de Usuários
    max_users = models.IntegerField(
        _('Máximo de Usuários'),
        default=1,
        help_text=_('Número máximo de usuários no laboratório')
    )
    
    max_technicians = models.IntegerField(
        _('Máximo de Técnicos'),
        default=1,
        help_text=_('Número máximo de técnicos cadastrados')
    )
    
    # Preços
    monthly_price = models.DecimalField(
        _('Preço Mensal'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    
    annual_price = models.DecimalField(
        _('Preço Anual'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    
    # Configurações
    is_active = models.BooleanField(_('Ativo'), default=True)
    is_default = models.BooleanField(_('Padrão'), default=False)
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('Plano de Assinatura')
        verbose_name_plural = _('Planos de Assinatura')
        ordering = ['monthly_price']
    
    def __str__(self):
        return f"{self.name} ({self.get_plan_type_display()})"


class UserRole(models.Model):
    """Papéis de usuário com permissões específicas"""
    
    class RoleType(models.TextChoices):
        OWNER = 'owner', _('Proprietário')
        ADMIN = 'admin', _('Administrador')
        MANAGER = 'manager', _('Gerente')
        TECHNICIAN = 'technician', _('Técnico')
        ASSISTANT = 'assistant', _('Assistente')
        VIEWER = 'viewer', _('Visualizador')
    
    name = models.CharField(_('Nome do Papel'), max_length=100)
    role_type = models.CharField(
        _('Tipo do Papel'),
        max_length=20,
        choices=RoleType.choices
    )
    
    description = models.TextField(_('Descrição'), blank=True)
    
    # Permissões Gerais
    can_manage_users = models.BooleanField(_('Gerenciar Usuários'), default=False)
    can_manage_settings = models.BooleanField(_('Gerenciar Configurações'), default=False)
    can_view_reports = models.BooleanField(_('Ver Relatórios'), default=True)
    can_manage_clients = models.BooleanField(_('Gerenciar Clientes'), default=True)
    can_manage_jobs = models.BooleanField(_('Gerenciar Trabalhos'), default=True)
    
    # Permissões da Flow IA
    can_use_flow_commands = models.BooleanField(_('Usar Comandos Flow'), default=True)
    can_use_advanced_flow = models.BooleanField(_('Usar Flow Avançada'), default=False)
    
    # Permissões de Agendamento Inteligente
    can_optimize_schedules = models.BooleanField(_('Otimizar Cronogramas'), default=False)
    can_manage_technician_profiles = models.BooleanField(_('Gerenciar Perfis de Técnicos'), default=False)
    can_view_bottleneck_alerts = models.BooleanField(_('Ver Alertas de Gargalo'), default=True)
    
    # Permissões de Análise Preditiva
    can_generate_predictions = models.BooleanField(_('Gerar Predições'), default=False)
    can_view_trend_analysis = models.BooleanField(_('Ver Análise de Tendências'), default=True)
    can_manage_predictive_alerts = models.BooleanField(_('Gerenciar Alertas Preditivos'), default=False)
    can_configure_dashboard = models.BooleanField(_('Configurar Dashboard'), default=False)
    
    # Permissões de Atendimento Automatizado
    can_manage_chatbot = models.BooleanField(_('Gerenciar Chatbot'), default=False)
    can_view_conversations = models.BooleanField(_('Ver Conversas'), default=True)
    can_manage_notifications = models.BooleanField(_('Gerenciar Notificações'), default=False)
    can_manage_support_tickets = models.BooleanField(_('Gerenciar Tickets'), default=False)
    
    # Permissões Financeiras
    can_view_financial_data = models.BooleanField(_('Ver Dados Financeiros'), default=False)
    can_generate_financial_reports = models.BooleanField(_('Gerar Relatórios Financeiros'), default=False)
    can_manage_pricing = models.BooleanField(_('Gerenciar Preços'), default=False)
    
    # Limites Específicos do Papel
    flow_commands_multiplier = models.FloatField(
        _('Multiplicador de Comandos Flow'),
        default=1.0,
        help_text=_('Multiplicador aplicado aos limites do plano')
    )
    
    priority_level = models.IntegerField(
        _('Nível de Prioridade'),
        default=0,
        help_text=_('Maior número = maior prioridade')
    )
    
    is_active = models.BooleanField(_('Ativo'), default=True)
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Papel de Usuário')
        verbose_name_plural = _('Papéis de Usuário')
        ordering = ['-priority_level', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_role_type_display()})"


class UserSubscription(models.Model):
    """Assinatura do usuário/laboratório"""
    
    class SubscriptionStatus(models.TextChoices):
        ACTIVE = 'active', _('Ativa')
        TRIAL = 'trial', _('Período de Teste')
        SUSPENDED = 'suspended', _('Suspensa')
        CANCELLED = 'cancelled', _('Cancelada')
        EXPIRED = 'expired', _('Expirada')
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscription',
        verbose_name=_('Usuário')
    )
    
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='subscriptions',
        verbose_name=_('Plano')
    )
    
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.TRIAL
    )
    
    start_date = models.DateTimeField(_('Data de Início'))
    end_date = models.DateTimeField(_('Data de Fim'), null=True, blank=True)
    
    trial_end_date = models.DateTimeField(
        _('Fim do Período de Teste'),
        null=True,
        blank=True
    )
    
    auto_renew = models.BooleanField(_('Renovação Automática'), default=True)
    
    # Customizações específicas
    custom_limits = models.JSONField(
        _('Limites Personalizados'),
        default=dict,
        help_text=_('Limites específicos que sobrescrevem o plano')
    )
    
    # Informações de pagamento
    payment_method = models.CharField(
        _('Método de Pagamento'),
        max_length=50,
        blank=True
    )
    
    last_payment_date = models.DateTimeField(
        _('Última Data de Pagamento'),
        null=True,
        blank=True
    )
    
    next_payment_date = models.DateTimeField(
        _('Próxima Data de Pagamento'),
        null=True,
        blank=True
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('Assinatura de Usuário')
        verbose_name_plural = _('Assinaturas de Usuário')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.plan.name}"
    
    def is_active(self):
        """Verifica se a assinatura está ativa"""
        if self.status == self.SubscriptionStatus.CANCELLED:
            return False
        
        if self.status == self.SubscriptionStatus.EXPIRED:
            return False
        
        if self.end_date and timezone.now() > self.end_date:
            return False
        
        return True
    
    def is_trial(self):
        """Verifica se está em período de teste"""
        return (
            self.status == self.SubscriptionStatus.TRIAL and
            self.trial_end_date and
            timezone.now() <= self.trial_end_date
        )
    
    def days_remaining(self):
        """Retorna dias restantes da assinatura"""
        if not self.end_date:
            return None
        
        remaining = self.end_date - timezone.now()
        return max(0, remaining.days)


class UserProfile(models.Model):
    """Perfil estendido do usuário com papel e limites"""
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name=_('Usuário')
    )
    
    role = models.ForeignKey(
        UserRole,
        on_delete=models.PROTECT,
        related_name='user_profiles',
        verbose_name=_('Papel')
    )
    
    # Configurações pessoais
    preferred_language = models.CharField(
        _('Idioma Preferido'),
        max_length=10,
        default='pt-br'
    )
    
    timezone = models.CharField(
        _('Fuso Horário'),
        max_length=50,
        default='America/Sao_Paulo'
    )
    
    # Limites personalizados (sobrescreve papel e plano)
    custom_flow_limit_daily = models.IntegerField(
        _('Limite Diário Flow Personalizado'),
        null=True,
        blank=True
    )
    
    custom_flow_limit_monthly = models.IntegerField(
        _('Limite Mensal Flow Personalizado'),
        null=True,
        blank=True
    )
    
    # Configurações de notificação
    email_notifications = models.BooleanField(_('Notificações por Email'), default=True)
    sms_notifications = models.BooleanField(_('Notificações por SMS'), default=False)
    push_notifications = models.BooleanField(_('Notificações Push'), default=True)
    
    # Configurações da Flow
    flow_auto_suggestions = models.BooleanField(_('Sugestões Automáticas Flow'), default=True)
    flow_learning_mode = models.BooleanField(_('Modo Aprendizado Flow'), default=True)
    
    # Estatísticas
    total_flow_commands_used = models.IntegerField(_('Total de Comandos Flow Usados'), default=0)
    last_flow_command_date = models.DateTimeField(_('Último Comando Flow'), null=True, blank=True)
    
    # Configurações de dashboard
    dashboard_layout = models.JSONField(
        _('Layout do Dashboard'),
        default=dict,
        help_text=_('Configuração personalizada do dashboard')
    )
    
    is_active = models.BooleanField(_('Ativo'), default=True)
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('Perfil de Usuário')
        verbose_name_plural = _('Perfis de Usuário')
        ordering = ['user__first_name', 'user__last_name']
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.role.name}"


class UsageTracking(models.Model):
    """Rastreamento de uso das funcionalidades"""
    
    class FeatureType(models.TextChoices):
        FLOW_COMMAND = 'flow_command', _('Comando Flow')
        INTELLIGENT_SCHEDULING = 'intelligent_scheduling', _('Agendamento Inteligente')
        PREDICTIVE_ANALYTICS = 'predictive_analytics', _('Análise Preditiva')
        AUTOMATED_SUPPORT = 'automated_support', _('Atendimento Automatizado')
        SMART_ORDERS = 'smart_orders', _('Gestão Inteligente')
        API_CALL = 'api_call', _('Chamada API')
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='usage_tracking',
        verbose_name=_('Usuário')
    )
    
    feature_type = models.CharField(
        _('Tipo de Funcionalidade'),
        max_length=30,
        choices=FeatureType.choices
    )
    
    feature_name = models.CharField(
        _('Nome da Funcionalidade'),
        max_length=100,
        help_text=_('Nome específico da funcionalidade usada')
    )
    
    usage_date = models.DateTimeField(_('Data de Uso'), auto_now_add=True)
    
    # Dados do uso
    request_data = models.JSONField(
        _('Dados da Requisição'),
        default=dict,
        help_text=_('Dados enviados na requisição')
    )
    
    response_data = models.JSONField(
        _('Dados da Resposta'),
        default=dict,
        help_text=_('Dados retornados')
    )
    
    execution_time_ms = models.IntegerField(
        _('Tempo de Execução (ms)'),
        null=True,
        blank=True
    )
    
    success = models.BooleanField(_('Sucesso'), default=True)
    error_message = models.TextField(_('Mensagem de Erro'), blank=True)
    
    # Metadados
    ip_address = models.GenericIPAddressField(_('Endereço IP'), null=True, blank=True)
    user_agent = models.TextField(_('User Agent'), blank=True)
    
    class Meta:
        verbose_name = _('Rastreamento de Uso')
        verbose_name_plural = _('Rastreamentos de Uso')
        ordering = ['-usage_date']
        indexes = [
            models.Index(fields=['user', 'feature_type', 'usage_date']),
            models.Index(fields=['usage_date']),
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.get_feature_type_display()} - {self.usage_date}"


class AccessRestriction(models.Model):
    """Restrições de acesso temporárias ou permanentes"""
    
    class RestrictionType(models.TextChoices):
        TEMPORARY_LIMIT = 'temporary_limit', _('Limite Temporário')
        FEATURE_BLOCK = 'feature_block', _('Bloqueio de Funcionalidade')
        ACCOUNT_SUSPENSION = 'account_suspension', _('Suspensão de Conta')
        RATE_LIMIT = 'rate_limit', _('Limite de Taxa')
    
    class RestrictionStatus(models.TextChoices):
        ACTIVE = 'active', _('Ativa')
        EXPIRED = 'expired', _('Expirada')
        LIFTED = 'lifted', _('Removida')
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='access_restrictions',
        verbose_name=_('Usuário')
    )
    
    restriction_type = models.CharField(
        _('Tipo de Restrição'),
        max_length=30,
        choices=RestrictionType.choices
    )
    
    feature_affected = models.CharField(
        _('Funcionalidade Afetada'),
        max_length=100,
        blank=True,
        help_text=_('Funcionalidade específica restrita')
    )
    
    reason = models.TextField(_('Motivo da Restrição'))
    
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=RestrictionStatus.choices,
        default=RestrictionStatus.ACTIVE
    )
    
    start_date = models.DateTimeField(_('Data de Início'))
    end_date = models.DateTimeField(_('Data de Fim'), null=True, blank=True)
    
    # Configurações da restrição
    restriction_config = models.JSONField(
        _('Configuração da Restrição'),
        default=dict,
        help_text=_('Configurações específicas da restrição')
    )
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_restrictions',
        verbose_name=_('Criado por')
    )
    
    lifted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lifted_restrictions',
        verbose_name=_('Removido por')
    )
    
    lifted_at = models.DateTimeField(_('Removido em'), null=True, blank=True)
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Restrição de Acesso')
        verbose_name_plural = _('Restrições de Acesso')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.get_restriction_type_display()}"
    
    def is_active(self):
        """Verifica se a restrição está ativa"""
        if self.status != self.RestrictionStatus.ACTIVE:
            return False
        
        now = timezone.now()
        if now < self.start_date:
            return False
        
        if self.end_date and now > self.end_date:
            return False
        
        return True


class RolePermissionsMatrix(models.Model):
    """Matriz de permissões de módulos por papel — singleton (sempre id=1).

    A estrutura do JSON é:
    {
        "producao":  {"dashboard": true, "jobs": true, ...},
        "recepcao":  {"dashboard": true, "clients": true, ...},
        "contabil":  {"dashboard": true, "financial": true, ...},
        "gerente":   { ... },
        "superadmin": { ... }
    }
    """

    DEFAULT_MATRIX = {
        "superadmin": {
            "dashboard": True, "clients": True, "jobs": True,
            "financial": True, "materials": True, "employees": True,
            "auth_settings": True, "pricing": True,
        },
        "gerente": {
            "dashboard": True, "clients": True, "jobs": True,
            "financial": True, "materials": True, "employees": True,
            "auth_settings": False, "pricing": True,
        },
        "recepcao": {
            "dashboard": True, "clients": True, "jobs": True,
            "financial": False, "materials": False, "employees": False,
            "auth_settings": False, "pricing": True,
        },
        "producao": {
            "dashboard": True, "clients": False, "jobs": True,
            "financial": False, "materials": False, "employees": False,
            "auth_settings": False, "pricing": False,
        },
        "contabil": {
            "dashboard": True, "clients": False, "jobs": False,
            "financial": True, "materials": False, "employees": False,
            "auth_settings": False, "pricing": False,
        },
    }

    matrix = models.JSONField(
        _('Matriz de Permissões'),
        default=dict,
        help_text=_('Mapeamento role → módulo → boolean')
    )

    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name=_('Atualizado por')
    )

    class Meta:
        verbose_name = _('Matriz de Permissões')
        verbose_name_plural = _('Matrizes de Permissões')

    def __str__(self):
        return 'Matriz de Permissões RBAC'

    @classmethod
    def get_singleton(cls):
        """Retorna (ou cria) a instância singleton com os defaults."""
        obj, created = cls.objects.get_or_create(
            pk=1,
            defaults={'matrix': cls.DEFAULT_MATRIX}
        )
        if created or not obj.matrix:
            obj.matrix = cls.DEFAULT_MATRIX
            obj.save(update_fields=['matrix'])
        return obj
