from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class CustomUser(AbstractUser):
    """
    Modelo de usuário customizado que estende o User padrão do Django
    para incluir tipos de usuário (admin/colaborador)
    """
    
    class UserType(models.TextChoices):
        ADMIN = 'admin', _('Administrador')
        COLLABORATOR = 'collaborator', _('Colaborador')
    
    user_type = models.CharField(
        _('Tipo de Usuário'),
        max_length=12,
        choices=UserType.choices,
        default=UserType.ADMIN,
        help_text=_('Define o nível de acesso do usuário no sistema')
    )
    
    phone = models.CharField(
        _('Telefone'),
        max_length=20,
        blank=True,
        null=True
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    def is_admin(self):
        """Verifica se o usuário é administrador"""
        return self.user_type == self.UserType.ADMIN
    
    def is_collaborator(self):
        """Verifica se o usuário é colaborador"""
        return self.user_type == self.UserType.COLLABORATOR
    
    def can_access_financial_reports(self):
        """Verifica se o usuário pode acessar relatórios financeiros"""
        return self.is_admin()
    
    def can_modify_settings(self):
        """Verifica se o usuário pode modificar configurações do sistema"""
        return self.is_admin()
    
    def can_delete_records(self):
        """Verifica se o usuário pode excluir registros"""
        return self.is_admin()
    
    def can_access_ai_assistant(self):
        """Verifica se o usuário pode acessar o assistente de IA"""
        # Colaboradores só podem usar IA para cadastros e baixas
        return True
    
    def can_use_ai_for_reports(self):
        """Verifica se o usuário pode usar IA para relatórios"""
        return self.is_admin()
    
    class Meta:
        verbose_name = _('Usuário')
        verbose_name_plural = _('Usuários')
        db_table = 'auth_user'  # Mantém compatibilidade com tabela padrão

