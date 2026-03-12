import uuid
import logging
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from .models import AutomatedNotification

logger = logging.getLogger(__name__)


def send_email_notification(notification: AutomatedNotification) -> bool:
    """Envia notificação por email. Retorna True se sucesso."""
    try:
        recipient_email = notification.recipient_client.email
        if not recipient_email:
            notification.status = AutomatedNotification.NotificationStatus.FAILED
            notification.error_message = 'Cliente sem email cadastrado.'
            notification.save(update_fields=['status', 'error_message'])
            return False

        send_mail(
            subject=notification.title,
            message=notification.content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )

        notification.status = AutomatedNotification.NotificationStatus.SENT
        notification.sent_at = timezone.now()
        notification.save(update_fields=['status', 'sent_at'])
        return True

    except Exception as e:
        logger.error(f'Erro ao enviar email para notificação {notification.id}: {e}')
        notification.status = AutomatedNotification.NotificationStatus.FAILED
        notification.error_message = str(e)
        notification.save(update_fields=['status', 'error_message'])
        return False


def create_conversation_session() -> str:
    """Gera session_id único para nova conversa."""
    return str(uuid.uuid4())
