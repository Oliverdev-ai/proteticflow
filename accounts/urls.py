from django.urls import path
from .views import (
    LoginView, LogoutView, UserProfileView, UserListCreateView,
    CollaboratorCreateView, UserDetailView, PasswordChangeView,
    user_permissions
)

app_name = 'accounts'

urlpatterns = [
    # Autenticação
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    
    # Perfil do usuário
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('change-password/', PasswordChangeView.as_view(), name='change-password'),
    path('permissions/', user_permissions, name='user-permissions'),
    
    # Gerenciamento de usuários (apenas admins)
    path('users/', UserListCreateView.as_view(), name='user-list-create'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    
    # Criação específica de colaboradores
    path('collaborators/', CollaboratorCreateView.as_view(), name='collaborator-create'),
]

