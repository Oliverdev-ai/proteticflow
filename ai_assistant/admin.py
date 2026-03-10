from django.contrib import admin
from .models import ChatSession, ChatMessage, AICommand, CommandExecution


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'user', 'title', 'created_at', 'is_active')
    list_filter = ('is_active', 'created_at', 'user__user_type')
    search_fields = ('session_id', 'title', 'user__username')
    readonly_fields = ('session_id', 'created_at', 'updated_at')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        # Admins veem todas as sessões, colaboradores só as suas
        if hasattr(request.user, 'is_admin') and request.user.is_admin():
            return qs
        return qs.filter(user=request.user)


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('session', 'message_type', 'content_preview', 'command_executed', 'created_at')
    list_filter = ('message_type', 'created_at', 'command_executed')
    search_fields = ('content', 'command_executed')
    readonly_fields = ('created_at',)
    
    def content_preview(self, obj):
        return obj.content[:100] + '...' if len(obj.content) > 100 else obj.content
    content_preview.short_description = 'Conteúdo'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        # Filtra por usuário se não for superuser
        if hasattr(request.user, 'is_admin') and request.user.is_admin():
            return qs
        return qs.filter(session__user=request.user)


@admin.register(AICommand)
class AICommandAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'function_name', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description', 'function_name')
    readonly_fields = ('created_at',)
    
    def has_change_permission(self, request, obj=None):
        # Apenas superusers podem alterar comandos
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        # Apenas superusers podem excluir comandos
        return request.user.is_superuser


@admin.register(CommandExecution)
class CommandExecutionAdmin(admin.ModelAdmin):
    list_display = ('command', 'user', 'status', 'execution_time', 'created_at')
    list_filter = ('status', 'created_at', 'command__name')
    search_fields = ('input_text', 'user__username', 'command__name')
    readonly_fields = ('created_at', 'execution_time')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        # Admins veem todas as execuções, colaboradores só as suas
        if hasattr(request.user, 'is_admin') and request.user.is_admin():
            return qs
        return qs.filter(user=request.user)

