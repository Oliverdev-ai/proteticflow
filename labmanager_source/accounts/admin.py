from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """Admin customizado para o modelo CustomUser"""
    
    # Campos exibidos na lista
    list_display = ('username', 'email', 'first_name', 'last_name', 'user_type', 'is_active', 'date_joined')
    list_filter = ('user_type', 'is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    
    # Campos no formulário de edição
    fieldsets = UserAdmin.fieldsets + (
        ('Informações Adicionais', {
            'fields': ('user_type', 'phone')
        }),
    )
    
    # Campos no formulário de criação
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Informações Adicionais', {
            'fields': ('user_type', 'phone', 'email', 'first_name', 'last_name')
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Admins podem ver todos os usuários
        if request.user.is_superuser:
            return qs
        # Outros usuários só veem colaboradores
        return qs.filter(user_type=CustomUser.UserType.COLLABORATOR)
    
    def has_delete_permission(self, request, obj=None):
        # Apenas superusers podem excluir usuários
        return request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        # Superusers podem alterar qualquer usuário
        if request.user.is_superuser:
            return True
        
        # Admins podem alterar colaboradores
        if hasattr(request.user, 'is_admin') and request.user.is_admin():
            if obj and obj.user_type == CustomUser.UserType.COLLABORATOR:
                return True
        
        # Usuários podem alterar apenas a si mesmos
        if obj and obj == request.user:
            return True
        
        return False

