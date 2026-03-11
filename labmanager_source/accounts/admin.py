from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """Admin customizado para o modelo CustomUser"""
    
    # Campos exibidos na lista
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    
    # Campos no formulário de edição
    fieldsets = UserAdmin.fieldsets + (
        ('Informações Adicionais', {
            'fields': ('role', 'phone')
        }),
    )
    
    # Campos no formulário de criação
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Informações Adicionais', {
            'fields': ('role', 'phone', 'email', 'first_name', 'last_name')
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Admins podem ver todos os usuários
        if request.user.is_superuser:
            return qs
        # Outros usuários só veem a produção
        return qs.filter(role=CustomUser.UserRole.PRODUCAO)
    
    def has_delete_permission(self, request, obj=None):
        # Apenas superusers podem excluir usuários
        return request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        # Superusers podem alterar qualquer usuário
        if request.user.is_superuser:
            return True
        
        # Gerentes podem alterar producao, recepcao e contabil
        if hasattr(request.user, 'is_gerente') and request.user.is_gerente():
            if obj and obj.role in [CustomUser.UserRole.PRODUCAO, CustomUser.UserRole.RECEPCAO, CustomUser.UserRole.CONTABIL]:
                return True
        
        # Usuários podem alterar apenas a si mesmos
        if obj and obj == request.user:
            return True
        
        return False

