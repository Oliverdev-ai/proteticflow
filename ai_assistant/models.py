from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class ChatSession(models.Model):
    """Modelo para armazenar sessões de chat com o assistente de IA"""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_sessions',
        verbose_name=_('Usuário')
    )
    
    session_id = models.CharField(
        _('ID da Sessão'),
        max_length=100,
        unique=True,
        help_text=_('Identificador único da sessão de chat')
    )
    
    title = models.CharField(
        _('Título'),
        max_length=200,
        blank=True,
        help_text=_('Título da conversa baseado no primeiro comando')
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    is_active = models.BooleanField(_('Ativo'), default=True)
    
    class Meta:
        verbose_name = _('Sessão de Chat')
        verbose_name_plural = _('Sessões de Chat')
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Chat {self.session_id} - {self.user.username}"


class ChatMessage(models.Model):
    """Modelo para armazenar mensagens individuais do chat"""
    
    class MessageType(models.TextChoices):
        USER = 'user', _('Usuário')
        ASSISTANT = 'assistant', _('Assistente')
        SYSTEM = 'system', _('Sistema')
    
    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name=_('Sessão')
    )
    
    message_type = models.CharField(
        _('Tipo de Mensagem'),
        max_length=10,
        choices=MessageType.choices
    )
    
    content = models.TextField(_('Conteúdo'))
    
    # Metadados para comandos executados
    command_executed = models.CharField(
        _('Comando Executado'),
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Comando do sistema que foi executado')
    )
    
    execution_result = models.JSONField(
        _('Resultado da Execução'),
        blank=True,
        null=True,
        help_text=_('Dados retornados pela execução do comando')
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Mensagem de Chat')
        verbose_name_plural = _('Mensagens de Chat')
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.message_type}: {self.content[:50]}..."


class AICommand(models.Model):
    """Modelo para mapear comandos em linguagem natural para funções do sistema"""
    
    name = models.CharField(
        _('Nome do Comando'),
        max_length=100,
        unique=True,
        help_text=_('Nome identificador do comando')
    )
    
    description = models.TextField(
        _('Descrição'),
        help_text=_('Descrição do que o comando faz')
    )
    
    keywords = models.JSONField(
        _('Palavras-chave'),
        help_text=_('Lista de palavras-chave que ativam este comando')
    )
    
    function_name = models.CharField(
        _('Nome da Função'),
        max_length=100,
        help_text=_('Nome da função Python que executa o comando')
    )
    
    required_permissions = models.JSONField(
        _('Permissões Necessárias'),
        default=list,
        help_text=_('Lista de permissões necessárias para executar o comando')
    )
    
    is_active = models.BooleanField(_('Ativo'), default=True)
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Comando de IA')
        verbose_name_plural = _('Comandos de IA')
        ordering = ['name']
    
    def __str__(self):
        return self.name


class CommandExecution(models.Model):
    """Modelo para registrar execuções de comandos"""
    
    class ExecutionStatus(models.TextChoices):
        SUCCESS = 'success', _('Sucesso')
        ERROR = 'error', _('Erro')
        PERMISSION_DENIED = 'permission_denied', _('Permissão Negada')
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='command_executions',
        verbose_name=_('Usuário')
    )
    
    command = models.ForeignKey(
        AICommand,
        on_delete=models.CASCADE,
        related_name='executions',
        verbose_name=_('Comando')
    )
    
    message = models.ForeignKey(
        ChatMessage,
        on_delete=models.CASCADE,
        related_name='executions',
        verbose_name=_('Mensagem'),
        null=True,
        blank=True
    )
    
    input_text = models.TextField(
        _('Texto de Entrada'),
        help_text=_('Comando original digitado pelo usuário')
    )
    
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=ExecutionStatus.choices
    )
    
    result_data = models.JSONField(
        _('Dados do Resultado'),
        blank=True,
        null=True
    )
    
    error_message = models.TextField(
        _('Mensagem de Erro'),
        blank=True,
        null=True
    )
    
    execution_time = models.FloatField(
        _('Tempo de Execução'),
        help_text=_('Tempo em segundos para executar o comando')
    )
    
    created_at = models.DateTimeField(_('Executado em'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Execução de Comando')
        verbose_name_plural = _('Execuções de Comando')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.command.name} - {self.status} - {self.user.username}"

