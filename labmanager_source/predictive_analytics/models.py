from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.jobs.models import Job
from apps.clients.models import Client
import json


class RevenuePredictor(models.Model):
    """Modelo para armazenar predições de receita"""
    
    class PredictionPeriod(models.TextChoices):
        MONTHLY = 'monthly', _('Mensal')
        QUARTERLY = 'quarterly', _('Trimestral')
        SEMI_ANNUAL = 'semi_annual', _('Semestral')
        ANNUAL = 'annual', _('Anual')
    
    period_type = models.CharField(
        _('Tipo de Período'),
        max_length=20,
        choices=PredictionPeriod.choices
    )
    
    start_date = models.DateField(_('Data de Início'))
    end_date = models.DateField(_('Data de Fim'))
    
    predicted_revenue = models.DecimalField(
        _('Receita Prevista'),
        max_digits=15,
        decimal_places=2
    )
    
    confidence_score = models.FloatField(
        _('Score de Confiança'),
        help_text=_('Confiança da predição (0-1)')
    )
    
    factors_analysis = models.JSONField(
        _('Análise de Fatores'),
        default=dict,
        help_text=_('Fatores que influenciam a predição')
    )
    
    seasonality_impact = models.FloatField(
        _('Impacto da Sazonalidade'),
        default=0.0,
        help_text=_('Impacto sazonal na receita (-1 a 1)')
    )
    
    trend_direction = models.CharField(
        _('Direção da Tendência'),
        max_length=20,
        choices=[
            ('up', _('Crescimento')),
            ('stable', _('Estável')),
            ('down', _('Declínio'))
        ],
        default='stable'
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('Criado por')
    )
    
    class Meta:
        verbose_name = _('Predição de Receita')
        verbose_name_plural = _('Predições de Receita')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Predição {self.get_period_type_display()} - R$ {self.predicted_revenue}"


class TrendAnalysis(models.Model):
    """Análise de tendências do laboratório"""
    
    class TrendType(models.TextChoices):
        REVENUE = 'revenue', _('Receita')
        JOBS_VOLUME = 'jobs_volume', _('Volume de Trabalhos')
        CLIENT_ACQUISITION = 'client_acquisition', _('Aquisição de Clientes')
        AVERAGE_TICKET = 'average_ticket', _('Ticket Médio')
        PRODUCTION_TIME = 'production_time', _('Tempo de Produção')
        CLIENT_SATISFACTION = 'client_satisfaction', _('Satisfação do Cliente')
    
    trend_type = models.CharField(
        _('Tipo de Tendência'),
        max_length=30,
        choices=TrendType.choices
    )
    
    analysis_period_start = models.DateField(_('Início do Período'))
    analysis_period_end = models.DateField(_('Fim do Período'))
    
    current_value = models.FloatField(_('Valor Atual'))
    previous_value = models.FloatField(_('Valor Anterior'))
    
    percentage_change = models.FloatField(
        _('Mudança Percentual'),
        help_text=_('Mudança em relação ao período anterior')
    )
    
    trend_strength = models.CharField(
        _('Força da Tendência'),
        max_length=20,
        choices=[
            ('weak', _('Fraca')),
            ('moderate', _('Moderada')),
            ('strong', _('Forte')),
            ('very_strong', _('Muito Forte'))
        ]
    )
    
    statistical_significance = models.FloatField(
        _('Significância Estatística'),
        help_text=_('P-value da análise estatística')
    )
    
    insights = models.JSONField(
        _('Insights'),
        default=list,
        help_text=_('Lista de insights gerados pela análise')
    )
    
    recommendations = models.JSONField(
        _('Recomendações'),
        default=list,
        help_text=_('Recomendações baseadas na tendência')
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Análise de Tendência')
        verbose_name_plural = _('Análises de Tendências')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_trend_type_display()} - {self.percentage_change:+.1f}%"


class PerformanceMetric(models.Model):
    """Métricas de performance em tempo real"""
    
    class MetricType(models.TextChoices):
        DAILY_REVENUE = 'daily_revenue', _('Receita Diária')
        JOBS_COMPLETED = 'jobs_completed', _('Trabalhos Concluídos')
        AVERAGE_PRODUCTION_TIME = 'avg_production_time', _('Tempo Médio de Produção')
        CLIENT_SATISFACTION = 'client_satisfaction', _('Satisfação do Cliente')
        TECHNICIAN_EFFICIENCY = 'technician_efficiency', _('Eficiência dos Técnicos')
        BOTTLENECK_INCIDENTS = 'bottleneck_incidents', _('Incidentes de Gargalo')
        ON_TIME_DELIVERY = 'on_time_delivery', _('Entregas no Prazo')
        REWORK_RATE = 'rework_rate', _('Taxa de Retrabalho')
    
    metric_type = models.CharField(
        _('Tipo de Métrica'),
        max_length=30,
        choices=MetricType.choices
    )
    
    date = models.DateField(_('Data'))
    value = models.FloatField(_('Valor'))
    
    target_value = models.FloatField(
        _('Valor Meta'),
        null=True,
        blank=True,
        help_text=_('Meta estabelecida para esta métrica')
    )
    
    variance_from_target = models.FloatField(
        _('Variação da Meta'),
        null=True,
        blank=True,
        help_text=_('Diferença percentual da meta')
    )
    
    benchmark_value = models.FloatField(
        _('Valor de Benchmark'),
        null=True,
        blank=True,
        help_text=_('Valor de referência do mercado')
    )
    
    notes = models.TextField(
        _('Observações'),
        blank=True,
        help_text=_('Observações sobre a métrica')
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Métrica de Performance')
        verbose_name_plural = _('Métricas de Performance')
        unique_together = ['metric_type', 'date']
        ordering = ['-date', 'metric_type']
    
    def __str__(self):
        return f"{self.get_metric_type_display()} - {self.date} - {self.value}"


class SeasonalityPattern(models.Model):
    """Padrões de sazonalidade identificados"""
    
    class PatternType(models.TextChoices):
        MONTHLY = 'monthly', _('Mensal')
        QUARTERLY = 'quarterly', _('Trimestral')
        WEEKLY = 'weekly', _('Semanal')
        HOLIDAY = 'holiday', _('Feriados')
        CUSTOM = 'custom', _('Personalizado')
    
    pattern_type = models.CharField(
        _('Tipo de Padrão'),
        max_length=20,
        choices=PatternType.choices
    )
    
    name = models.CharField(
        _('Nome do Padrão'),
        max_length=100,
        help_text=_('Nome descritivo do padrão sazonal')
    )
    
    description = models.TextField(
        _('Descrição'),
        help_text=_('Descrição detalhada do padrão')
    )
    
    impact_factor = models.FloatField(
        _('Fator de Impacto'),
        help_text=_('Multiplicador do impacto (1.0 = neutro, >1.0 = positivo, <1.0 = negativo)')
    )
    
    start_period = models.CharField(
        _('Período de Início'),
        max_length=50,
        help_text=_('Quando o padrão começa (ex: Janeiro, Q1, Semana 1)')
    )
    
    end_period = models.CharField(
        _('Período de Fim'),
        max_length=50,
        help_text=_('Quando o padrão termina')
    )
    
    confidence_level = models.FloatField(
        _('Nível de Confiança'),
        help_text=_('Confiança estatística do padrão (0-1)')
    )
    
    historical_data = models.JSONField(
        _('Dados Históricos'),
        default=dict,
        help_text=_('Dados históricos que suportam o padrão')
    )
    
    is_active = models.BooleanField(_('Ativo'), default=True)
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Padrão de Sazonalidade')
        verbose_name_plural = _('Padrões de Sazonalidade')
        ordering = ['-confidence_level', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_pattern_type_display()})"


class PredictiveAlert(models.Model):
    """Alertas preditivos baseados em análises"""
    
    class AlertType(models.TextChoices):
        REVENUE_DROP = 'revenue_drop', _('Queda de Receita')
        CAPACITY_OVERLOAD = 'capacity_overload', _('Sobrecarga de Capacidade')
        CLIENT_CHURN_RISK = 'client_churn_risk', _('Risco de Perda de Cliente')
        SEASONAL_OPPORTUNITY = 'seasonal_opportunity', _('Oportunidade Sazonal')
        EFFICIENCY_DECLINE = 'efficiency_decline', _('Declínio de Eficiência')
        MARKET_TREND = 'market_trend', _('Tendência de Mercado')
    
    class AlertSeverity(models.TextChoices):
        INFO = 'info', _('Informativo')
        LOW = 'low', _('Baixa')
        MEDIUM = 'medium', _('Média')
        HIGH = 'high', _('Alta')
        CRITICAL = 'critical', _('Crítica')
    
    alert_type = models.CharField(
        _('Tipo de Alerta'),
        max_length=30,
        choices=AlertType.choices
    )
    
    severity = models.CharField(
        _('Severidade'),
        max_length=10,
        choices=AlertSeverity.choices
    )
    
    title = models.CharField(_('Título'), max_length=200)
    description = models.TextField(_('Descrição'))
    
    predicted_impact = models.TextField(
        _('Impacto Previsto'),
        help_text=_('Descrição do impacto esperado')
    )
    
    probability = models.FloatField(
        _('Probabilidade'),
        help_text=_('Probabilidade do evento ocorrer (0-1)')
    )
    
    time_horizon = models.CharField(
        _('Horizonte Temporal'),
        max_length=50,
        help_text=_('Quando o evento pode ocorrer')
    )
    
    recommended_actions = models.JSONField(
        _('Ações Recomendadas'),
        default=list,
        help_text=_('Lista de ações recomendadas')
    )
    
    related_metrics = models.JSONField(
        _('Métricas Relacionadas'),
        default=dict,
        help_text=_('Métricas que geraram o alerta')
    )
    
    is_acknowledged = models.BooleanField(_('Reconhecido'), default=False)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='acknowledged_alerts',
        verbose_name=_('Reconhecido por')
    )
    acknowledged_at = models.DateTimeField(_('Reconhecido em'), null=True, blank=True)
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Alerta Preditivo')
        verbose_name_plural = _('Alertas Preditivos')
        ordering = ['-severity', '-created_at']
    
    def __str__(self):
        return f"{self.get_severity_display()}: {self.title}"


class DashboardWidget(models.Model):
    """Configuração de widgets do dashboard"""
    
    class WidgetType(models.TextChoices):
        REVENUE_CHART = 'revenue_chart', _('Gráfico de Receita')
        JOBS_METRICS = 'jobs_metrics', _('Métricas de Trabalhos')
        TREND_ANALYSIS = 'trend_analysis', _('Análise de Tendências')
        PERFORMANCE_KPI = 'performance_kpi', _('KPIs de Performance')
        PREDICTIVE_ALERTS = 'predictive_alerts', _('Alertas Preditivos')
        SEASONALITY_VIEW = 'seasonality_view', _('Visualização de Sazonalidade')
        CLIENT_INSIGHTS = 'client_insights', _('Insights de Clientes')
        EFFICIENCY_TRACKER = 'efficiency_tracker', _('Rastreador de Eficiência')
    
    widget_type = models.CharField(
        _('Tipo de Widget'),
        max_length=30,
        choices=WidgetType.choices
    )
    
    title = models.CharField(_('Título'), max_length=100)
    description = models.TextField(_('Descrição'), blank=True)
    
    position_x = models.IntegerField(_('Posição X'), default=0)
    position_y = models.IntegerField(_('Posição Y'), default=0)
    width = models.IntegerField(_('Largura'), default=4)
    height = models.IntegerField(_('Altura'), default=3)
    
    configuration = models.JSONField(
        _('Configuração'),
        default=dict,
        help_text=_('Configurações específicas do widget')
    )
    
    is_visible = models.BooleanField(_('Visível'), default=True)
    refresh_interval = models.IntegerField(
        _('Intervalo de Atualização (segundos)'),
        default=300
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='dashboard_widgets',
        verbose_name=_('Usuário')
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('Widget do Dashboard')
        verbose_name_plural = _('Widgets do Dashboard')
        ordering = ['position_y', 'position_x']
    
    def __str__(self):
        return f"{self.title} ({self.get_widget_type_display()})"

