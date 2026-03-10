from rest_framework import serializers
from .models import ChatSession, ChatMessage, AICommand, CommandExecution


class ChatSessionSerializer(serializers.ModelSerializer):
    """Serializer para sessões de chat"""
    
    message_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatSession
        fields = [
            'id', 'session_id', 'title', 'created_at', 'updated_at',
            'is_active', 'message_count', 'last_message'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_message_count(self, obj):
        return obj.messages.count()
    
    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return {
                'content': last_msg.content[:100] + '...' if len(last_msg.content) > 100 else last_msg.content,
                'created_at': last_msg.created_at,
                'message_type': last_msg.message_type
            }
        return None


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer para mensagens de chat"""
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'message_type', 'content', 'command_executed',
            'execution_result', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ChatMessageCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de mensagens de chat"""
    
    class Meta:
        model = ChatMessage
        fields = ['content']
    
    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError("A mensagem não pode estar vazia.")
        return value.strip()


class AICommandSerializer(serializers.ModelSerializer):
    """Serializer para comandos de IA"""
    
    execution_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AICommand
        fields = [
            'id', 'name', 'description', 'keywords', 'function_name',
            'required_permissions', 'is_active', 'created_at', 'execution_count'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_execution_count(self, obj):
        return obj.executions.count()


class CommandExecutionSerializer(serializers.ModelSerializer):
    """Serializer para execuções de comando"""
    
    command_name = serializers.CharField(source='command.name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = CommandExecution
        fields = [
            'id', 'command_name', 'user_username', 'input_text',
            'status', 'result_data', 'error_message', 'execution_time',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ChatRequestSerializer(serializers.Serializer):
    """Serializer para requisições de chat"""
    
    message = serializers.CharField(max_length=1000)
    session_id = serializers.CharField(max_length=100, required=False)
    
    def validate_message(self, value):
        if not value.strip():
            raise serializers.ValidationError("A mensagem não pode estar vazia.")
        return value.strip()


class ChatResponseSerializer(serializers.Serializer):
    """Serializer para respostas de chat"""
    
    session_id = serializers.CharField()
    message_id = serializers.IntegerField()
    response = serializers.CharField()
    command_executed = serializers.CharField(required=False, allow_null=True)
    execution_result = serializers.JSONField(required=False, allow_null=True)
    suggestions = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
    success = serializers.BooleanField()
    execution_time = serializers.FloatField(required=False, allow_null=True)

