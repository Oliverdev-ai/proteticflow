from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.jobs.models import Job
from apps.clients.models import Client
import json


class ChatbotConversation(models.Model):
    """Conversas do chatbot especializado"""
    
    class ConversationType(models.TextChoices):
        STATUS_INQUIRY = 'status_inquiry', _('Consulta de Status')
        SCHEDULING = 'scheduling', _('Agendamento')
        PRICING = 'pricing', _('Orçamento')
        TECHNICAL_SUPPORT = 'technical_support', _('Suporte Técnico')
        GENERAL_INFO = 'general_info', _('Informações Gerais')
        COMPLAINT = 'complaint', _('Reclamação')
    
    class ConversationStatus(models.TextChoices):
        ACTIVE = 'active', _('Ativa')
        RESOLVED = 'resolved', _('Resolvida')
        ESCALATED = 'escalated', _('Escalada')
        ABANDONED = 'abandoned', _('Abandonada')
    
    session_id = models.CharField(
        _('ID da Sessão'),
        max_length=100,
        unique=True,
        help_text=_('Identificador único da conversa')
    )
    
    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chatbot_conversations',
        verbose_name=_('Cliente')
    )
    
    conversation_type = models.CharField(
        _('Tipo de Conversa'),
        max_length=30,
        choices=ConversationType.choices,
        default=ConversationType.GENERAL_INFO
    )
    
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=ConversationStatus.choices,
        default=ConversationStatus.ACTIVE
    )
    
    client_phone = models.CharField(
        _('Telefone do Cliente'),
        max_length=20,
        blank=True,
        help_text=_('Telefone para identificação')
    )
    
    client_email = models.EmailField(
        _('Email do Cliente'),
        blank=True,
        help_text=_('Email para identificação')
    )
    
    context_data = models.JSONField(
        _('Dados de Contexto'),
        default=dict,
        help_text=_('Informações coletadas durante a conversa')
    )
    
    satisfaction_score = models.IntegerField(
        _('Score de Satisfação'),
        null=True,
        blank=True,
        help_text=_('Avaliação do cliente (1-5)')
    )
    
    escalated_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='escalated_conversations',
        verbose_name=_('Escalado para')
    )
    
    escalation_reason = models.TextField(
        _('Motivo da Escalação'),
        blank=True,
        help_text=_('Por que foi escalado para atendimento humano')
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    resolved_at = models.DateTimeField(_('Resolvido em'), null=True, blank=True)
    
    class Meta:
        verbose_name = _('Conversa do Chatbot')
        verbose_name_plural = _('Conversas do Chatbot')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Conversa {self.session_id} - {self.get_conversation_type_display()}"


class ChatbotMessage(models.Model):
    """Mensagens individuais do chatbot"""
    
    class MessageType(models.TextChoices):
        USER = 'user', _('Usuário')
        BOT = 'bot', _('Bot')
        SYSTEM = 'system', _('Sistema')
    
    conversation = models.ForeignKey(
        ChatbotConversation,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name=_('Conversa')
    )
    
    message_type = models.CharField(
        _('Tipo de Mensagem'),
        max_length=10,
        choices=MessageType.choices
    )
    
    content = models.TextField(_('Conteúdo'))
    
    intent_detected = models.CharField(
        _('Intenção Detectada'),
        max_length=100,
        blank=True,
        help_text=_('Intenção identificada pelo NLP')
    )
    
    confidence_score = models.FloatField(
        _('Score de Confiança'),
        null=True,
        blank=True,
        help_text=_('Confiança na detecção da intenção (0-1)')
    )
    
    entities_extracted = models.JSONField(
        _('Entidades Extraídas'),
        default=dict,
        help_text=_('Entidades identificadas na mensagem')
    )
    
    response_time_ms = models.IntegerField(
        _('Tempo de Resposta (ms)'),
        null=True,
        blank=True,
        help_text=_('Tempo para gerar resposta')
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Mensagem do Chatbot')
        verbose_name_plural = _('Mensagens do Chatbot')
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.get_message_type_display()}: {self.content[:50]}..."


class AutomatedNotification(models.Model):
    """Notificações automáticas inteligentes"""
    
    class NotificationType(models.TextChoices):
        JOB_STATUS_UPDATE = 'job_status_update', _('Atualização de Status')
        DELIVERY_REMINDER = 'delivery_reminder', _('Lembrete de Entrega')
        PAYMENT_REMINDER = 'payment_reminder', _('Lembrete de Pagamento')
        APPOINTMENT_REMINDER = 'appointment_reminder', _('Lembrete de Consulta')
        QUALITY_FEEDBACK = 'quality_feedback', _('Feedback de Qualidade')
        PROMOTIONAL = 'promotional', _('Promocional')
        MAINTENANCE_ALERT = 'maintenance_alert', _('Alerta de Manutenção')
    
    class NotificationChannel(models.TextChoices):
        EMAIL = 'email', _('Email')
        SMS = 'sms', _('SMS')
        WHATSAPP = 'whatsapp', _('WhatsApp')
        PUSH = 'push', _('Push Notification')
        IN_APP = 'in_app', _('No App')
    
    class NotificationStatus(models.TextChoices):
        PENDING = 'pending', _('Pendente')
        SENT = 'sent', _('Enviada')
        DELIVERED = 'delivered', _('Entregue')
        FAILED = 'failed', _('Falhou')
        CANCELLED = 'cancelled', _('Cancelada')
    
    notification_type = models.CharField(
        _('Tipo de Notificação'),
        max_length=30,
        choices=NotificationType.choices
    )
    
    channel = models.CharField(
        _('Canal'),
        max_length=20,
        choices=NotificationChannel.choices
    )
    
    recipient_client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='automated_notifications',
        verbose_name=_('Cliente Destinatário')
    )
    
    related_job = models.ForeignKey(
        Job,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='automated_notifications',
        verbose_name=_('Trabalho Relacionado')
    )
    
    title = models.CharField(_('Título'), max_length=200)
    content = models.TextField(_('Conteúdo'))
    
    personalization_data = models.JSONField(
        _('Dados de Personalização'),
        default=dict,
        help_text=_('Dados usados para personalizar a mensagem')
    )
    
    scheduled_for = models.DateTimeField(
        _('Agendado para'),
        help_text=_('Quando a notificação deve ser enviada')
    )
    
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=NotificationStatus.choices,
        default=NotificationStatus.PENDING
    )
    
    sent_at = models.DateTimeField(_('Enviado em'), null=True, blank=True)
    delivered_at = models.DateTimeField(_('Entregue em'), null=True, blank=True)
    
    error_message = models.TextField(
        _('Mensagem de Erro'),
        blank=True,
        help_text=_('Detalhes do erro se falhou')
    )
    
    engagement_data = models.JSONField(
        _('Dados de Engajamento'),
        default=dict,
        help_text=_('Dados sobre abertura, cliques, etc.')
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Notificação Automatizada')
        verbose_name_plural = _('Notificações Automatizadas')
        ordering = ['-scheduled_for']
    
    def __str__(self):
        return f"{self.get_notification_type_display()} - {self.recipient_client.name}"


class AutoResponseTemplate(models.Model):
    """Templates para respostas automáticas"""
    
    class TemplateCategory(models.TextChoices):
        STATUS_RESPONSE = 'status_response', _('Resposta de Status')
        PRICING_INFO = 'pricing_info', _('Informação de Preço')
        SCHEDULING_INFO = 'scheduling_info', _('Informação de Agendamento')
        TECHNICAL_INFO = 'technical_info', _('Informação Técnica')
        GENERAL_INFO = 'general_info', _('Informação Geral')
        ERROR_HANDLING = 'error_handling', _('Tratamento de Erro')
    
    name = models.CharField(_('Nome'), max_length=100)
    category = models.CharField(
        _('Categoria'),
        max_length=30,
        choices=TemplateCategory.choices
    )
    
    trigger_keywords = models.JSONField(
        _('Palavras-chave de Ativação'),
        default=list,
        help_text=_('Palavras que ativam este template')
    )
    
    intent_patterns = models.JSONField(
        _('Padrões de Intenção'),
        default=list,
        help_text=_('Padrões regex para detectar intenção')
    )
    
    template_content = models.TextField(
        _('Conteúdo do Template'),
        help_text=_('Template com variáveis {variavel}')
    )
    
    required_context = models.JSONField(
        _('Contexto Necessário'),
        default=list,
        help_text=_('Dados necessários para usar o template')
    )
    
    fallback_template = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('Template de Fallback')
    )
    
    is_active = models.BooleanField(_('Ativo'), default=True)
    priority = models.IntegerField(
        _('Prioridade'),
        default=0,
        help_text=_('Maior número = maior prioridade')
    )
    
    usage_count = models.IntegerField(_('Contagem de Uso'), default=0)
    success_rate = models.FloatField(
        _('Taxa de Sucesso'),
        default=0.0,
        help_text=_('Taxa de respostas bem-sucedidas')
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('Template de Resposta Automática')
        verbose_name_plural = _('Templates de Resposta Automática')
        ordering = ['-priority', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class SmartScheduling(models.Model):
    """Agendamento automático inteligente"""
    
    class SchedulingType(models.TextChoices):
        CONSULTATION = 'consultation', _('Consulta')
        DELIVERY = 'delivery', _('Entrega')
        FITTING = 'fitting', _('Prova')
        FOLLOW_UP = 'follow_up', _('Acompanhamento')
        MAINTENANCE = 'maintenance', _('Manutenção')
    
    class SchedulingStatus(models.TextChoices):
        SUGGESTED = 'suggested', _('Sugerido')
        CONFIRMED = 'confirmed', _('Confirmado')
        CANCELLED = 'cancelled', _('Cancelado')
        COMPLETED = 'completed', _('Concluído')
        RESCHEDULED = 'rescheduled', _('Reagendado')
    
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='smart_schedules',
        verbose_name=_('Cliente')
    )
    
    related_job = models.ForeignKey(
        Job,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='smart_schedules',
        verbose_name=_('Trabalho Relacionado')
    )
    
    scheduling_type = models.CharField(
        _('Tipo de Agendamento'),
        max_length=20,
        choices=SchedulingType.choices
    )
    
    suggested_datetime = models.DateTimeField(
        _('Data/Hora Sugerida'),
        help_text=_('Data e hora sugeridas pelo sistema')
    )
    
    alternative_datetimes = models.JSONField(
        _('Alternativas'),
        default=list,
        help_text=_('Outras opções de data/hora')
    )
    
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=SchedulingStatus.choices,
        default=SchedulingStatus.SUGGESTED
    )
    
    ai_reasoning = models.TextField(
        _('Raciocínio da IA'),
        help_text=_('Por que esta data/hora foi sugerida')
    )
    
    confidence_score = models.FloatField(
        _('Score de Confiança'),
        help_text=_('Confiança na sugestão (0-1)')
    )
    
    client_preferences = models.JSONField(
        _('Preferências do Cliente'),
        default=dict,
        help_text=_('Preferências identificadas do cliente')
    )
    
    confirmed_datetime = models.DateTimeField(
        _('Data/Hora Confirmada'),
        null=True,
        blank=True
    )
    
    confirmation_method = models.CharField(
        _('Método de Confirmação'),
        max_length=20,
        choices=[
            ('chatbot', _('Chatbot')),
            ('phone', _('Telefone')),
            ('email', _('Email')),
            ('whatsapp', _('WhatsApp')),
            ('manual', _('Manual'))
        ],
        blank=True
    )
    
    notes = models.TextField(_('Observações'), blank=True)
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('Agendamento Inteligente')
        verbose_name_plural = _('Agendamentos Inteligentes')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_scheduling_type_display()} - {self.client.name} - {self.suggested_datetime}"


class SupportTicket(models.Model):
    """Tickets de suporte gerados automaticamente"""
    
    class TicketPriority(models.TextChoices):
        LOW = 'low', _('Baixa')
        MEDIUM = 'medium', _('Média')
        HIGH = 'high', _('Alta')
        URGENT = 'urgent', _('Urgente')
    
    class TicketStatus(models.TextChoices):
        OPEN = 'open', _('Aberto')
        IN_PROGRESS = 'in_progress', _('Em Andamento')
        WAITING_CLIENT = 'waiting_client', _('Aguardando Cliente')
        RESOLVED = 'resolved', _('Resolvido')
        CLOSED = 'closed', _('Fechado')
    
    ticket_number = models.CharField(
        _('Número do Ticket'),
        max_length=20,
        unique=True
    )
    
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='support_tickets',
        verbose_name=_('Cliente')
    )
    
    related_conversation = models.ForeignKey(
        ChatbotConversation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='support_tickets',
        verbose_name=_('Conversa Relacionada')
    )
    
    related_job = models.ForeignKey(
        Job,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='support_tickets',
        verbose_name=_('Trabalho Relacionado')
    )
    
    title = models.CharField(_('Título'), max_length=200)
    description = models.TextField(_('Descrição'))
    
    priority = models.CharField(
        _('Prioridade'),
        max_length=10,
        choices=TicketPriority.choices,
        default=TicketPriority.MEDIUM
    )
    
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=TicketStatus.choices,
        default=TicketStatus.OPEN
    )
    
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets',
        verbose_name=_('Atribuído a')
    )
    
    auto_generated = models.BooleanField(
        _('Gerado Automaticamente'),
        default=True
    )
    
    ai_analysis = models.JSONField(
        _('Análise da IA'),
        default=dict,
        help_text=_('Análise automática do problema')
    )
    
    suggested_solutions = models.JSONField(
        _('Soluções Sugeridas'),
        default=list,
        help_text=_('Soluções sugeridas pela IA')
    )
    
    resolution_notes = models.TextField(
        _('Notas de Resolução'),
        blank=True
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    resolved_at = models.DateTimeField(_('Resolvido em'), null=True, blank=True)
    
    class Meta:
        verbose_name = _('Ticket de Suporte')
        verbose_name_plural = _('Tickets de Suporte')
        ordering = ['-priority', '-created_at']
    
    def __str__(self):
        return f"#{self.ticket_number} - {self.title}"

