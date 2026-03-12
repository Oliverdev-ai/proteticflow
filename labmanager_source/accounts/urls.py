from django.urls import path
from .views import (
    LoginView, LogoutView, UserProfileView, UserListCreateView,
    UserDetailView, PasswordChangeView,
    user_permissions, VerifyLogin2FAView, Setup2FAView, VerifySetup2FAView,
    UserRoleUpdateView
)

app_name = 'accounts'

urlpatterns = [
    # Autenticação
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/login/2fa/', VerifyLogin2FAView.as_view(), name='login-2fa'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    
    # 2FA Management
    path('auth/2fa/setup/', Setup2FAView.as_view(), name='setup-2fa'),
    path('auth/2fa/verify-setup/', VerifySetup2FAView.as_view(), name='verify-setup-2fa'),
    
    # Perfil do usuário
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('change-password/', PasswordChangeView.as_view(), name='change-password'),
    path('permissions/', user_permissions, name='user-permissions'),
    
    # Gerenciamento de usuários (apenas admins)
    path('users/', UserListCreateView.as_view(), name='user-list-create'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('users/<int:pk>/role/', UserRoleUpdateView.as_view(), name='user-role-update'),
    
]

