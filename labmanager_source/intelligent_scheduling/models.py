from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.jobs.models import Job, JobStage
from apps.clients.models import Client
import json


class TechnicianProfile(models.Model):
    """Perfil de técnico com especialidades e capacidades"""
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='technician_profile',
        verbose_name=_('Usuário')
    )
    
    specialties = models.JSONField(
        _('Especialidades'),
        default=list,
        help_text=_('Lista de tipos de prótese que o técnico domina')
    )
    
    skill_level = models.IntegerField(
        _('Nível de Habilidade'),
        choices=[(1, 'Iniciante'), (2, 'Intermediário'), (3, 'Avançado'), (4, 'Expert')],
        default=2
    )
    
    average_work_time = models.FloatField(
        _('Tempo Médio de Trabalho (horas)'),
        default=8.0,
        help_text=_('Horas médias de trabalho por dia')
    )
    
    efficiency_rating = models.FloatField(
        _('Rating de Eficiência'),
        default=1.0,
        help_text=_('Multiplicador de eficiência (1.0 = normal, >1.0 = mais eficiente)')
    )
    
    is_available = models.BooleanField(_('Disponível'), default=True)
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('Perfil de Técnico')
        verbose_name_plural = _('Perfis de Técnicos')
    
    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.get_skill_level_display()}"


class JobTimeEstimate(models.Model):
    """Estimativas de tempo para diferentes tipos de trabalho"""
    
    prosthesis_type = models.CharField(
        _('Tipo de Prótese'),
        max_length=100,
        help_text=_('Tipo específico de prótese')
    )
    
    material = models.CharField(
        _('Material'),
        max_length=100,
        blank=True,
        help_text=_('Material utilizado')
    )
    
    complexity_level = models.IntegerField(
        _('Nível de Complexidade'),
        choices=[(1, 'Simples'), (2, 'Médio'), (3, 'Complexo'), (4, 'Muito Complexo')],
        default=2
    )
    
    base_time_hours = models.FloatField(
        _('Tempo Base (horas)'),
        help_text=_('Tempo base estimado em horas')
    )
    
    min_time_hours = models.FloatField(
        _('Tempo Mínimo (horas)'),
        help_text=_('Tempo mínimo possível')
    )
    
    max_time_hours = models.FloatField(
        _('Tempo Máximo (horas)'),
        help_text=_('Tempo máximo esperado')
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('Estimativa de Tempo')
        verbose_name_plural = _('Estimativas de Tempo')
        unique_together = ['prosthesis_type', 'material', 'complexity_level']
    
    def __str__(self):
        return f"{self.prosthesis_type} - {self.material} - {self.base_time_hours}h"


class ProductionSchedule(models.Model):
    """Cronograma de produção otimizado"""
    
    job = models.OneToOneField(
        Job,
        on_delete=models.CASCADE,
        related_name='schedule',
        verbose_name=_('Trabalho')
    )
    
    assigned_technician = models.ForeignKey(
        TechnicianProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='scheduled_jobs',
        verbose_name=_('Técnico Designado')
    )
    
    estimated_start_date = models.DateTimeField(
        _('Data Estimada de Início'),
        null=True,
        blank=True
    )
    
    estimated_completion_date = models.DateTimeField(
        _('Data Estimada de Conclusão'),
        null=True,
        blank=True
    )
    
    estimated_duration_hours = models.FloatField(
        _('Duração Estimada (horas)'),
        null=True,
        blank=True
    )
    
    priority_score = models.FloatField(
        _('Score de Prioridade'),
        default=0.0,
        help_text=_('Score calculado para priorização (maior = mais prioritário)')
    )
    
    bottleneck_risk = models.FloatField(
        _('Risco de Gargalo'),
        default=0.0,
        help_text=_('Probabilidade de causar gargalo (0-1)')
    )
    
    optimization_notes = models.TextField(
        _('Notas de Otimização'),
        blank=True,
        help_text=_('Observações do algoritmo de otimização')
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('Cronograma de Produção')
        verbose_name_plural = _('Cronogramas de Produção')
        ordering = ['-priority_score', 'estimated_start_date']
    
    def __str__(self):
        return f"Cronograma {self.job.order_number} - Prioridade: {self.priority_score:.2f}"


class BottleneckAlert(models.Model):
    """Alertas de gargalos identificados"""
    
    class AlertType(models.TextChoices):
        TECHNICIAN_OVERLOAD = 'tech_overload', _('Sobrecarga de Técnico')
        DEADLINE_RISK = 'deadline_risk', _('Risco de Prazo')
        RESOURCE_CONFLICT = 'resource_conflict', _('Conflito de Recursos')
        CAPACITY_EXCEEDED = 'capacity_exceeded', _('Capacidade Excedida')
    
    class AlertSeverity(models.TextChoices):
        LOW = 'low', _('Baixa')
        MEDIUM = 'medium', _('Média')
        HIGH = 'high', _('Alta')
        CRITICAL = 'critical', _('Crítica')
    
    alert_type = models.CharField(
        _('Tipo de Alerta'),
        max_length=20,
        choices=AlertType.choices
    )
    
    severity = models.CharField(
        _('Severidade'),
        max_length=10,
        choices=AlertSeverity.choices
    )
    
    title = models.CharField(_('Título'), max_length=200)
    description = models.TextField(_('Descrição'))
    
    affected_jobs = models.ManyToManyField(
        Job,
        related_name='bottleneck_alerts',
        verbose_name=_('Trabalhos Afetados'),
        blank=True
    )
    
    affected_technician = models.ForeignKey(
        TechnicianProfile,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='alerts',
        verbose_name=_('Técnico Afetado')
    )
    
    suggested_actions = models.JSONField(
        _('Ações Sugeridas'),
        default=list,
        help_text=_('Lista de ações sugeridas para resolver o gargalo')
    )
    
    is_resolved = models.BooleanField(_('Resolvido'), default=False)
    resolved_at = models.DateTimeField(_('Resolvido em'), null=True, blank=True)
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Alerta de Gargalo')
        verbose_name_plural = _('Alertas de Gargalos')
        ordering = ['-severity', '-created_at']
    
    def __str__(self):
        return f"{self.get_severity_display()}: {self.title}"


class MLModelMetrics(models.Model):
    """Métricas dos modelos de Machine Learning"""
    
    model_name = models.CharField(
        _('Nome do Modelo'),
        max_length=100,
        help_text=_('Nome identificador do modelo ML')
    )
    
    model_version = models.CharField(
        _('Versão do Modelo'),
        max_length=50,
        default='1.0'
    )
    
    accuracy_score = models.FloatField(
        _('Score de Acurácia'),
        null=True,
        blank=True
    )
    
    mae_score = models.FloatField(
        _('Mean Absolute Error'),
        null=True,
        blank=True
    )
    
    rmse_score = models.FloatField(
        _('Root Mean Square Error'),
        null=True,
        blank=True
    )
    
    training_data_size = models.IntegerField(
        _('Tamanho dos Dados de Treino'),
        default=0
    )
    
    last_trained_at = models.DateTimeField(
        _('Último Treino'),
        auto_now_add=True
    )
    
    feature_importance = models.JSONField(
        _('Importância das Features'),
        default=dict,
        help_text=_('Importância de cada feature no modelo')
    )
    
    is_active = models.BooleanField(_('Ativo'), default=True)
    
    class Meta:
        verbose_name = _('Métricas do Modelo ML')
        verbose_name_plural = _('Métricas dos Modelos ML')
        unique_together = ['model_name', 'model_version']
    
    def __str__(self):
        return f"{self.model_name} v{self.model_version} - Acurácia: {self.accuracy_score:.3f}"

