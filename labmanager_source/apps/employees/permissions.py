from rest_framework.permissions import BasePermission
from accounts.models import CustomUser

class IsSuperAdmin(BasePermission):
    """
    Permite acesso apenas a Super Administradores.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superadmin())

class IsGerente(BasePermission):
    """
    Permite acesso a Gerentes e Super Administradores.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_gerente())

class IsRecepcao(BasePermission):
    """
    Permite acesso a Recepção, Gerentes e Super Administradores.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_recepcao())

class IsProducao(BasePermission):
    """
    Permite acesso à Linha de Produção, Gerentes e Super Administradores.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_producao())

class IsContabil(BasePermission):
    """
    Permite acesso ao Contábil, Gerentes e Super Administradores.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_contabil())

class IsGerenteOrRecepcao(BasePermission):
    """
    Permite acesso a Gerente ou Recepção (e logicamente Super Administrador, pois todos incluem hierarchy).
    A nossa implementação de is_recepcao e is_gerente já cobre superadmin.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_recepcao() or request.user.is_gerente()))

class IsContabilOrGerente(BasePermission):
    """
    Permite acesso a Contábil ou Gerente.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_contabil() or request.user.is_gerente()))

class AnyRole(BasePermission):
    """
    Permite acesso a usuários autenticados (todas as roles do RBAC).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
