import logging
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import ChatbotConversation, ChatbotMessage, AutomatedNotification
from .serializers import (
    ChatbotConversationSerializer, ConversationCreateSerializer,
    MessageCreateSerializer, AutomatedNotificationSerializer,
    NotificationCreateSerializer
)
from .services import send_email_notification, create_conversation_session
from apps.employees.permissions import IsGerente, AnyRole

logger = logging.getLogger(__name__)


class ConversationListCreateView(generics.ListCreateAPIView):
    """Lista conversas ou inicia nova conversa."""
    permission_classes = [IsGerente]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ConversationCreateSerializer
        return ChatbotConversationSerializer

    def get_queryset(self):
        return ChatbotConversation.objects.prefetch_related('messages').order_by('-created_at')

    def create(self, request, *args, **kwargs):
        serializer = ConversationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation = serializer.save(session_id=create_conversation_session())
        return Response(
            ChatbotConversationSerializer(conversation).data,
            status=status.HTTP_201_CREATED
        )


class ConversationDetailView(generics.RetrieveUpdateAPIView):
    """Detalha ou atualiza status de uma conversa."""
    permission_classes = [IsGerente]
    serializer_class = ChatbotConversationSerializer
    queryset = ChatbotConversation.objects.prefetch_related('messages')
    lookup_field = 'session_id'


@api_view(['POST'])
@permission_classes([IsGerente])
def add_message(request, session_id):
    """Adiciona mensagem a uma conversa existente."""
    try:
        conversation = ChatbotConversation.objects.get(session_id=session_id)
    except ChatbotConversation.DoesNotExist:
        return Response({'error': 'Conversa não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = MessageCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    message = ChatbotMessage.objects.create(
        conversation=conversation,
        message_type=ChatbotMessage.MessageType.USER,
        content=serializer.validated_data['content']
    )

    # Resposta automática simples — extensível para NLP futuramente
    bot_response = ChatbotMessage.objects.create(
        conversation=conversation,
        message_type=ChatbotMessage.MessageType.BOT,
        content='Sua mensagem foi recebida. Nossa equipe entrará em contato em breve.'
    )

    return Response({
        'user_message': MessageCreateSerializer(message).data,
        'bot_response': MessageCreateSerializer(bot_response).data,
    }, status=status.HTTP_201_CREATED)


class NotificationListCreateView(generics.ListCreateAPIView):
    """Lista notificações ou cria nova."""
    permission_classes = [IsGerente]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return NotificationCreateSerializer
        return AutomatedNotificationSerializer

    def get_queryset(self):
        return AutomatedNotification.objects.select_related(
            'recipient_client', 'related_job'
        ).order_by('-scheduled_for')

    def create(self, request, *args, **kwargs):
        serializer = NotificationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        notification = serializer.save()

        # Envio imediato se canal for email e scheduled_for for agora ou passado
        sent = False
        if (notification.channel == 'email' and
                notification.scheduled_for <= timezone.now()):
            sent = send_email_notification(notification)

        return Response({
            'notification': AutomatedNotificationSerializer(notification).data,
            'email_sent': sent
        }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsGerente])
def send_notification_now(request, pk):
    """Força envio imediato de uma notificação pendente por email."""
    try:
        notification = AutomatedNotification.objects.get(pk=pk)
    except AutomatedNotification.DoesNotExist:
        return Response({'error': 'Notificação não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    if notification.status != AutomatedNotification.NotificationStatus.PENDING:
        return Response(
            {'error': f'Notificação já está com status: {notification.status}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if notification.channel != 'email':
        return Response(
            {'error': 'Envio imediato disponível apenas para canal email no momento.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    success = send_email_notification(notification)
    return Response({
        'success': success,
        'status': notification.status,
        'error': notification.error_message if not success else None
    })
