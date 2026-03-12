from rest_framework import serializers
from .models import ChatbotConversation, ChatbotMessage, AutomatedNotification


class ChatbotMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotMessage
        fields = ['id', 'message_type', 'content', 'intent_detected',
                  'confidence_score', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatbotConversationSerializer(serializers.ModelSerializer):
    messages = ChatbotMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatbotConversation
        fields = ['id', 'session_id', 'client', 'conversation_type', 'status',
                  'client_phone', 'client_email', 'satisfaction_score',
                  'created_at', 'updated_at', 'messages']
        read_only_fields = ['id', 'session_id', 'created_at', 'updated_at']


class ConversationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotConversation
        fields = ['conversation_type', 'client_phone', 'client_email', 'client']


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotMessage
        fields = ['content']


class AutomatedNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomatedNotification
        fields = ['id', 'notification_type', 'channel', 'recipient_client',
                  'related_job', 'title', 'content', 'scheduled_for',
                  'status', 'sent_at', 'error_message', 'created_at']
        read_only_fields = ['id', 'status', 'sent_at', 'error_message', 'created_at']


class NotificationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomatedNotification
        fields = ['notification_type', 'channel', 'recipient_client',
                  'related_job', 'title', 'content', 'scheduled_for']
