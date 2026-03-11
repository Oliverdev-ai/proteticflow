from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from .models import EmployeeProfile
from accounts.models import CustomUser

@receiver(post_save, sender=EmployeeProfile)
def send_employee_welcome_email(sender, instance, created, **kwargs):
    """Dispara um e-mail de boas-vindas quando um funcionário é criado (LGPD/Integração)."""
    if created and instance.user and instance.user.email:
        subject = 'Bem-vindo(a) ao ProteticFlow!'
        message = f'Olá {instance.user.get_full_name() or instance.user.username},\n\nSeu perfil de funcionário foi cadastrado com sucesso. Cargo: {instance.position}.'
        from_email = settings.EMAIL_HOST_USER or 'noreply@proteticflow.com'
        recipient_list = [instance.user.email]
        
        try:
            send_mail(subject, message, from_email, recipient_list, fail_silently=True)
        except Exception as e:
            pass

@receiver(pre_save, sender=CustomUser)
def track_user_role_change(sender, instance, **kwargs):
    """Armazena o papel antigo para sabermos se houve alteração na hora do post_save."""
    if instance.pk:
        try:
            old_instance = CustomUser.objects.get(pk=instance.pk)
            instance._old_role = old_instance.role
        except CustomUser.DoesNotExist:
            instance._old_role = None
    else:
        instance._old_role = None

@receiver(post_save, sender=CustomUser)
def notify_user_role_change(sender, instance, created, **kwargs):
    """Notifica o funcionário caso o seu nível de acesso/cargo de sistema tenha sido modificado."""
    if not created and hasattr(instance, '_old_role'):
        if instance._old_role != instance.role and instance.email:
            subject = 'Aviso: Alteração de Papel de Acesso'
            message = f'Olá {instance.get_full_name() or instance.username},\n\nSeu nível de acesso no ProteticFlow foi alterado.\nDe: {instance._old_role}\nPara: {instance.role}.'
            from_email = settings.EMAIL_HOST_USER or 'noreply@proteticflow.com'
            recipient_list = [instance.email]
            
            try:
                send_mail(subject, message, from_email, recipient_list, fail_silently=True)
            except Exception as e:
                pass
