from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class CustomUser(AbstractUser):
    """
    Modelo de usuário customizado que estende o User padrão do Django
    para incluir tipos de usuário (admin/colaborador)
    """
    
    class UserRole(models.TextChoices):
        SUPERADMIN = 'superadmin', _('Super Administrador')
        GERENTE = 'gerente', _('Gerente')
        PRODUCAO = 'producao', _('Linha de Produção')
        RECEPCAO = 'recepcao', _('Recepção')
        CONTABIL = 'contabil', _('Contábil')
    
    role = models.CharField(
        _('Papel do Usuário'),
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.PRODUCAO,
        help_text=_('Define o nível de acesso e o papel do usuário no sistema')
    )
    
    phone = models.CharField(
        _('Telefone'),
        max_length=20,
        blank=True,
        null=True
    )
    
    created_at = models.DateTimeField(_('Criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Atualizado em'), auto_now=True)
    
    def is_superadmin(self):
        return self.role == self.UserRole.SUPERADMIN
        
    def is_gerente(self):
        return self.role in [self.UserRole.GERENTE, self.UserRole.SUPERADMIN]
        
    def is_recepcao(self):
        return self.role in [self.UserRole.RECEPCAO, self.UserRole.GERENTE, self.UserRole.SUPERADMIN]
        
    def is_producao(self):
        return self.role in [self.UserRole.PRODUCAO, self.UserRole.GERENTE, self.UserRole.SUPERADMIN]
        
    def is_contabil(self):
        return self.role in [self.UserRole.CONTABIL, self.UserRole.GERENTE, self.UserRole.SUPERADMIN]
    
    def is_admin(self):
        """Verifica se o usuário tem privilégios parecidos com um superadmin/gerente (legado)"""
        return self.is_gerente()
    
    def is_collaborator(self):
        """Verifica se o usuário é colaborador (legado)"""
        return self.role in [self.UserRole.PRODUCAO, self.UserRole.RECEPCAO, self.UserRole.CONTABIL]
    
    def can_access_financial_reports(self):
        return self.is_gerente()
    
    def can_modify_settings(self):
        return self.is_gerente()
    
    def can_delete_records(self):
        return self.is_superadmin()
    
    def can_access_ai_assistant(self):
        return True
    
    def can_use_ai_for_reports(self):
        return self.is_gerente()
    
    class Meta:
        verbose_name = _('Usuário')
        verbose_name_plural = _('Usuários')
        db_table = 'auth_user'  # Mantém compatibilidade com tabela padrão

