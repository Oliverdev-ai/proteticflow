from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.jobs.models import Job
from apps.clients.models import Client
from apps.pricing.models import ServiceItem
import json


class ClientOrderHistory(models.Model):
    """Histórico de pedidos do cliente para análise de padrões"""
    
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='order_history',
        verbose_name=_('Cliente')
    )
    
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='order_history_entries',
        verbose_name=_('Trabalho')
    )
    
    # Dados extraídos do trabalho para análise
    service_types = models.JSONField(
        _('Tipos de Serviço'),
        default=list,
        help_text=_('Lista de tipos de serviço do trabalho')
    )
    
    materials_used = models.JSONField(
        _('Materiais Utilizados'),
        default=list,
        help_text=_('Lista de materiais utilizados')
    )
    
    total_value = models.DecimalField(
        _('Valor Total'),
        max_digits=10,
        decimal_places=2,
        help_text=_('Valor total do trabalho')
    )
    
    completion_time_days = models.IntegerField(
        _('Tempo de Conclusão (dias)'),
        help_text=_('Dias para completar o trabalho')
    )
    
    client_satisfaction = models.IntegerField(
        _('Satisfação do Cliente'),
        null=True,
        blank=True,
        help_text=_('Score de satisfação (1-5)')
    )
    
    # Dados contextuais
    season = models.CharField(
        _('Estação'),
        max_length=20,
        choices=[
            ('spring', _('Primavera')),
            ('summer', _('Verão')),
            ('autumn', _('Outono')),
            ('winter', _('Inverno'))
        ]
    )
    
    day_of_week = models.CharField(
        _('Dia da Semana'),
        max_length=10,
        choices=[
            ('monday', _('Segunda')),
            ('tuesday', _('Terça')),
            ('wednesday', _('Quarta')),
            ('thursday', _('Quinta')),
            ('friday', _('Sexta')),
            ('saturday', _('Sábado')),
            ('sunday', _('Domingo'))
        ]
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Histórico de Pedidos do Cliente')
        verbose_name_plural = _('Históricos de Pedidos dos Clientes')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client', '-created_at']),
            models.Index(fields=['service_types']),
        ]
    
    def __str__(self):
        return f"{self.client.name} - {self.job.id} - {self.created_at.date()}"


class SmartOrderTemplate(models.Model):
    """Templates inteligentes para auto-preenchimento de pedidos"""
    
    class TemplateType(models.TextChoices):
        CLIENT_PATTERN = 'client_pattern', _('Padrão do Cliente')
        SERVICE_COMBO = 'service_combo', _('Combo de Serviços')
        SEASONAL = 'seasonal', _('Sazonal')
        POPULAR = 'popular', _('Popular')
        CUSTOM = 'custom', _('Personalizado')
    
    name = models.CharField(_('Nome do Template'), max_length=200)
    template_type = models.CharField(
        _('Tipo do Template'),
        max_length=20,
        choices=TemplateType.choices
    )
    
    # Critérios de aplicação
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='smart_templates',
        verbose_name=_('Cliente Específico')
    )
    
    service_types_pattern = models.JSONField(
        _('Padrão de Tipos de Serviço'),
        default=list,
        help_text=_('Tipos de serviço que ativam este template')
    )
    
    # Dados do template
    suggested_services = models.JSONField(
        _('Serviços Sugeridos'),
        default=list,
        help_text=_('Lista de serviços a serem sugeridos')
    )
    
    suggested_materials = models.JSONField(
        _('Materiais Sugeridos'),
        default=list,
        help_text=_('Lista de materiais a serem sugeridos')
    )
    
    estimated_price_range = models.JSONField(
        _('Faixa de Preço Estimada'),
        default=dict,
        help_text=_('Faixa de preço mínimo e máximo')
    )
    
    estimated_completion_days = models.IntegerField(
        _('Dias Estimados para Conclusão'),
        default=7
    )
    
    # Configurações de aplicação
    confidence_score = models.FloatField(
        _('Score de Confiança'),
        default=0.0,
        help_text=_('Confiança na sugestão (0-1)')
    )
    
    usage_count = models.IntegerField(_('Contagem de Uso'), default=0)
    success_rate = models.FloatField(
        _('Taxa de Sucesso'),
        default=0.0,
        help_text=_('Taxa de aceitação das sugestões')
    )
    
    # Condições contextuais
    seasonal_conditions = models.JSONField(
        _('Condições Sazonais'),
        default=dict,
        help_text=_('Condições de estação, mês, etc.')
    )
    
    is_active = models.BooleanField(_('Ativo'), default=True)
    priority = models.IntegerField(
        _('Prioridade'),
        default=0,
        help_text=_('Maior número = maior prioridade')
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('Template de Pedido Inteligente')
        verbose_name_plural = _('Templates de Pedidos Inteligentes')
        ordering = ['-priority', '-confidence_score']
    
    def __str__(self):
        return f"{self.name} ({self.get_template_type_display()})"


class MaterialSuggestion(models.Model):
    """Sugestões inteligentes de materiais baseadas em padrões"""
    
    # Contexto da sugestão
    service_type = models.CharField(
        _('Tipo de Serviço'),
        max_length=100,
        help_text=_('Tipo de serviço que gera a sugestão')
    )
    
    client_profile = models.JSONField(
        _('Perfil do Cliente'),
        default=dict,
        help_text=_('Características do cliente que influenciam a sugestão')
    )
    
    # Material sugerido
    material_name = models.CharField(_('Nome do Material'), max_length=200)
    material_category = models.CharField(_('Categoria do Material'), max_length=100)
    
    # Dados da sugestão
    suggested_quantity = models.FloatField(
        _('Quantidade Sugerida'),
        help_text=_('Quantidade típica para este contexto')
    )
    
    unit_of_measure = models.CharField(
        _('Unidade de Medida'),
        max_length=20,
        default='un'
    )
    
    estimated_cost = models.DecimalField(
        _('Custo Estimado'),
        max_digits=10,
        decimal_places=2,
        help_text=_('Custo estimado do material')
    )
    
    # Métricas de qualidade da sugestão
    confidence_score = models.FloatField(
        _('Score de Confiança'),
        help_text=_('Confiança na sugestão (0-1)')
    )
    
    frequency_score = models.FloatField(
        _('Score de Frequência'),
        help_text=_('Frequência de uso em contextos similares')
    )
    
    # Dados de aprendizado
    times_suggested = models.IntegerField(_('Vezes Sugerido'), default=0)
    times_accepted = models.IntegerField(_('Vezes Aceito'), default=0)
    
    # Condições de aplicação
    seasonal_relevance = models.JSONField(
        _('Relevância Sazonal'),
        default=dict,
        help_text=_('Relevância por estação/mês')
    )
    
    alternative_materials = models.JSONField(
        _('Materiais Alternativos'),
        default=list,
        help_text=_('Lista de materiais alternativos')
    )
    
    is_active = models.BooleanField(_('Ativo'), default=True)
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('Sugestão de Material')
        verbose_name_plural = _('Sugestões de Materiais')
        ordering = ['-confidence_score', '-frequency_score']
        indexes = [
            models.Index(fields=['service_type', 'is_active']),
            models.Index(fields=['material_category']),
        ]
    
    def __str__(self):
        return f"{self.material_name} para {self.service_type}"
    
    @property
    def acceptance_rate(self):
        """Taxa de aceitação da sugestão"""
        if self.times_suggested == 0:
            return 0.0
        return (self.times_accepted / self.times_suggested) * 100


class PriceEstimationModel(models.Model):
    """Modelos de estimativa de preço baseados em ML"""
    
    class ModelType(models.TextChoices):
        LINEAR_REGRESSION = 'linear_regression', _('Regressão Linear')
        RANDOM_FOREST = 'random_forest', _('Random Forest')
        NEURAL_NETWORK = 'neural_network', _('Rede Neural')
        ENSEMBLE = 'ensemble', _('Ensemble')
    
    name = models.CharField(_('Nome do Modelo'), max_length=100)
    model_type = models.CharField(
        _('Tipo do Modelo'),
        max_length=20,
        choices=ModelType.choices
    )
    
    # Escopo do modelo
    service_categories = models.JSONField(
        _('Categorias de Serviço'),
        default=list,
        help_text=_('Categorias de serviço cobertas pelo modelo')
    )
    
    # Parâmetros do modelo
    model_parameters = models.JSONField(
        _('Parâmetros do Modelo'),
        default=dict,
        help_text=_('Parâmetros e configurações do modelo ML')
    )
    
    feature_weights = models.JSONField(
        _('Pesos das Features'),
        default=dict,
        help_text=_('Importância de cada feature na predição')
    )
    
    # Métricas de performance
    accuracy_score = models.FloatField(
        _('Score de Acurácia'),
        default=0.0,
        help_text=_('Acurácia do modelo (0-1)')
    )
    
    mean_absolute_error = models.FloatField(
        _('Erro Absoluto Médio'),
        default=0.0,
        help_text=_('MAE do modelo')
    )
    
    r2_score = models.FloatField(
        _('R² Score'),
        default=0.0,
        help_text=_('Coeficiente de determinação')
    )
    
    # Dados de treinamento
    training_data_size = models.IntegerField(
        _('Tamanho dos Dados de Treinamento'),
        default=0
    )
    
    last_training_date = models.DateTimeField(
        _('Última Data de Treinamento'),
        null=True,
        blank=True
    )
    
    # Configurações
    is_active = models.BooleanField(_('Ativo'), default=True)
    auto_retrain = models.BooleanField(_('Retreinamento Automático'), default=True)
    
    retrain_threshold = models.FloatField(
        _('Limite para Retreinamento'),
        default=0.1,
        help_text=_('Queda de acurácia que dispara retreinamento')
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('Modelo de Estimativa de Preço')
        verbose_name_plural = _('Modelos de Estimativa de Preço')
        ordering = ['-accuracy_score', '-updated_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_model_type_display()}) - {self.accuracy_score:.2%}"


class SmartOrderSuggestion(models.Model):
    """Sugestões geradas automaticamente para pedidos"""
    
    class SuggestionType(models.TextChoices):
        AUTO_FILL = 'auto_fill', _('Auto-preenchimento')
        MATERIAL_ADD = 'material_add', _('Adicionar Material')
        SERVICE_UPGRADE = 'service_upgrade', _('Upgrade de Serviço')
        PRICE_ADJUSTMENT = 'price_adjustment', _('Ajuste de Preço')
        TIMELINE_OPTIMIZATION = 'timeline_optimization', _('Otimização de Prazo')
    
    class SuggestionStatus(models.TextChoices):
        PENDING = 'pending', _('Pendente')
        ACCEPTED = 'accepted', _('Aceita')
        REJECTED = 'rejected', _('Rejeitada')
        PARTIALLY_ACCEPTED = 'partially_accepted', _('Parcialmente Aceita')
    
    # Contexto da sugestão
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='smart_suggestions',
        verbose_name=_('Cliente')
    )
    
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='smart_suggestions',
        verbose_name=_('Trabalho')
    )
    
    suggestion_type = models.CharField(
        _('Tipo de Sugestão'),
        max_length=30,
        choices=SuggestionType.choices
    )
    
    # Dados da sugestão
    title = models.CharField(_('Título'), max_length=200)
    description = models.TextField(_('Descrição'))
    
    suggested_data = models.JSONField(
        _('Dados Sugeridos'),
        default=dict,
        help_text=_('Dados específicos da sugestão')
    )
    
    # Métricas da sugestão
    confidence_score = models.FloatField(
        _('Score de Confiança'),
        help_text=_('Confiança na sugestão (0-1)')
    )
    
    potential_value_impact = models.DecimalField(
        _('Impacto Potencial no Valor'),
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text=_('Impacto estimado no valor do pedido')
    )
    
    # Raciocínio da IA
    ai_reasoning = models.TextField(
        _('Raciocínio da IA'),
        help_text=_('Explicação de por que a sugestão foi feita')
    )
    
    source_template = models.ForeignKey(
        SmartOrderTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_suggestions',
        verbose_name=_('Template de Origem')
    )
    
    # Status e feedback
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=SuggestionStatus.choices,
        default=SuggestionStatus.PENDING
    )
    
    user_feedback = models.TextField(
        _('Feedback do Usuário'),
        blank=True,
        help_text=_('Feedback sobre a sugestão')
    )
    
    applied_data = models.JSONField(
        _('Dados Aplicados'),
        default=dict,
        help_text=_('Dados que foram efetivamente aplicados')
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    responded_at = models.DateTimeField(_('Respondido em'), null=True, blank=True)
    
    class Meta:
        verbose_name = _('Sugestão de Pedido Inteligente')
        verbose_name_plural = _('Sugestões de Pedidos Inteligentes')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client', 'status']),
            models.Index(fields=['suggestion_type', 'status']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.client.name}"


class ReworkPattern(models.Model):
    """Padrões de retrabalho identificados automaticamente"""
    
    # Identificação do padrão
    pattern_name = models.CharField(_('Nome do Padrão'), max_length=200)
    pattern_description = models.TextField(_('Descrição do Padrão'))
    
    # Contexto do retrabalho
    service_types_affected = models.JSONField(
        _('Tipos de Serviço Afetados'),
        default=list
    )
    
    materials_involved = models.JSONField(
        _('Materiais Envolvidos'),
        default=list
    )
    
    common_causes = models.JSONField(
        _('Causas Comuns'),
        default=list,
        help_text=_('Causas mais frequentes do retrabalho')
    )
    
    # Métricas do padrão
    frequency_score = models.FloatField(
        _('Score de Frequência'),
        help_text=_('Frequência de ocorrência do padrão')
    )
    
    cost_impact = models.DecimalField(
        _('Impacto no Custo'),
        max_digits=10,
        decimal_places=2,
        help_text=_('Custo médio do retrabalho')
    )
    
    time_impact_hours = models.FloatField(
        _('Impacto no Tempo (horas)'),
        help_text=_('Horas adicionais médias')
    )
    
    # Prevenção
    prevention_suggestions = models.JSONField(
        _('Sugestões de Prevenção'),
        default=list,
        help_text=_('Sugestões para evitar o retrabalho')
    )
    
    early_warning_indicators = models.JSONField(
        _('Indicadores de Alerta Precoce'),
        default=list,
        help_text=_('Sinais que indicam risco de retrabalho')
    )
    
    # Dados de detecção
    detection_confidence = models.FloatField(
        _('Confiança na Detecção'),
        help_text=_('Confiança na identificação do padrão (0-1)')
    )
    
    sample_size = models.IntegerField(
        _('Tamanho da Amostra'),
        help_text=_('Número de casos analisados')
    )
    
    # Status
    is_active = models.BooleanField(_('Ativo'), default=True)
    requires_attention = models.BooleanField(_('Requer Atenção'), default=False)
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('Padrão de Retrabalho')
        verbose_name_plural = _('Padrões de Retrabalho')
        ordering = ['-frequency_score', '-cost_impact']
    
    def __str__(self):
        return f"{self.pattern_name} (Freq: {self.frequency_score:.2f})"


class SmartOrderMetrics(models.Model):
    """Métricas de performance do sistema de pedidos inteligentes"""
    
    # Período das métricas
    date = models.DateField(_('Data'))
    
    # Métricas de sugestões
    total_suggestions_generated = models.IntegerField(
        _('Total de Sugestões Geradas'),
        default=0
    )
    
    suggestions_accepted = models.IntegerField(
        _('Sugestões Aceitas'),
        default=0
    )
    
    suggestions_rejected = models.IntegerField(
        _('Sugestões Rejeitadas'),
        default=0
    )
    
    # Métricas de auto-preenchimento
    auto_fill_usage_count = models.IntegerField(
        _('Uso de Auto-preenchimento'),
        default=0
    )
    
    auto_fill_accuracy = models.FloatField(
        _('Acurácia do Auto-preenchimento'),
        default=0.0
    )
    
    # Métricas de estimativa de preço
    price_estimations_generated = models.IntegerField(
        _('Estimativas de Preço Geradas'),
        default=0
    )
    
    price_estimation_accuracy = models.FloatField(
        _('Acurácia das Estimativas'),
        default=0.0
    )
    
    # Métricas de materiais
    material_suggestions_count = models.IntegerField(
        _('Sugestões de Materiais'),
        default=0
    )
    
    material_suggestions_accepted = models.IntegerField(
        _('Sugestões de Materiais Aceitas'),
        default=0
    )
    
    # Métricas de retrabalho
    rework_patterns_detected = models.IntegerField(
        _('Padrões de Retrabalho Detectados'),
        default=0
    )
    
    rework_prevention_success = models.FloatField(
        _('Sucesso na Prevenção de Retrabalho'),
        default=0.0
    )
    
    # Impacto financeiro
    estimated_time_saved_hours = models.FloatField(
        _('Tempo Economizado (horas)'),
        default=0.0
    )
    
    estimated_cost_savings = models.DecimalField(
        _('Economia Estimada'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    
    revenue_impact = models.DecimalField(
        _('Impacto na Receita'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Métricas de Pedidos Inteligentes')
        verbose_name_plural = _('Métricas de Pedidos Inteligentes')
        ordering = ['-date']
        unique_together = ['date']
    
    def __str__(self):
        return f"Métricas {self.date}"
    
    @property
    def suggestion_acceptance_rate(self):
        """Taxa de aceitação de sugestões"""
        total = self.suggestions_accepted + self.suggestions_rejected
        if total == 0:
            return 0.0
        return (self.suggestions_accepted / total) * 100
    
    @property
    def material_suggestion_acceptance_rate(self):
        """Taxa de aceitação de sugestões de materiais"""
        if self.material_suggestions_count == 0:
            return 0.0
        return (self.material_suggestions_accepted / self.material_suggestions_count) * 100

