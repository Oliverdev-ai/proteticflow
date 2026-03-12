from rest_framework import generics, status, permissions
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from .models import CustomUser
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    LoginSerializer, PasswordChangeSerializer
)
from .services.two_factor import TwoFactorService


class LoginView(APIView):
    """View para autenticação de usuários"""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # 2FA Interception para cargos sensíveis
            if user.role in ['superadmin', 'gerente']:
                return Response({
                    'require_2fa': True,
                    'is_setup_required': not user.is_two_factor_enabled,
                    'user_id': user.id
                })
            
            # Gera tokens JWT direto para roles normais
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            # Adiciona informações customizadas ao token
            access_token['role'] = getattr(user, 'role', 'admin')
            access_token['username'] = user.username
            
            return Response({
                'access': str(access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyLogin2FAView(APIView):
    """View para validar o código 2FA de login"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        user_id = request.data.get('user_id')
        code = request.data.get('code')
        
        if not user_id or not code:
            return Response({'detail': 'user_id e code são obrigatórios'}, status=400)
            
        try:
            user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'Usuário inválido'}, status=404)
            
        # Verifica se o 2FA está ativo
        if not user.is_two_factor_enabled:
            return Response({'detail': '2FA não configurado'}, status=400)
            
        # Verifica o TOTP
        if not TwoFactorService.verify_token(user.two_factor_secret, str(code)):
            return Response({'detail': 'Código inválido'}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Sucesso! Gera os tokens reais
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        access_token['role'] = getattr(user, 'role', 'admin')
        access_token['username'] = user.username
        
        return Response({
            'access': str(access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })

class Setup2FAView(APIView):
    """View para configurar 2FA"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        if user.is_two_factor_enabled:
            return Response({'detail': '2FA já está ativo para este usuário'}, status=400)
            
        # Gera secret novo cada vez que pede configuração (se não estiver ativado)
        secret = TwoFactorService.generate_secret()
        user.two_factor_secret = secret
        user.save(update_fields=['two_factor_secret'])
        
        uri = TwoFactorService.get_totp_uri(secret, user.username)
        qr_base64 = TwoFactorService.generate_qr_code_base64(uri)
        
        return Response({
            'qr_code': qr_base64,
            'secret': secret
        })

class VerifySetup2FAView(APIView):
    """View para confirmar a configuração do 2FA"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        code = request.data.get('code')
        
        if not code:
            return Response({'detail': 'Código é obrigatório'}, status=400)
            
        if user.is_two_factor_enabled:
            return Response({'detail': '2FA já configurado'}, status=400)
            
        if not user.two_factor_secret:
            return Response({'detail': 'Inicie a configuração do 2FA primeiro'}, status=400)
            
        if not TwoFactorService.verify_token(user.two_factor_secret, str(code)):
            return Response({'detail': 'Código inválido'}, status=400)
            
        # Sucesso
        user.is_two_factor_enabled = True
        user.save(update_fields=['is_two_factor_enabled'])
        
        return Response({'detail': 'Autenticação em Dois Fatores ativada com sucesso!'})


class LogoutView(APIView):
    """View para logout de usuários"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            return Response({'message': 'Logout realizado com sucesso.'})
        except Exception as e:
            return Response({'error': 'Erro ao realizar logout.'}, 
                          status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """View para visualizar e atualizar perfil do usuário"""
    serializer_class = UserUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return UserSerializer
        return UserUpdateSerializer


class UserListCreateView(generics.ListCreateAPIView):
    """View para listar e criar usuários (apenas admins)"""
    queryset = CustomUser.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Apenas admins podem ver todos os usuários
        if user.is_admin() or user.is_superuser:
            return CustomUser.objects.all()
        
        # Colaboradores só veem a si mesmos
        return CustomUser.objects.filter(id=user.id)
    def perform_create(self, serializer):
        # Apenas admins podem criar usuários
        if not (self.request.user.is_admin() or self.request.user.is_superuser):
            raise permissions.PermissionDenied(
                'Apenas administradores podem criar usuários.'
            )
        
        serializer.save()


class UserAuthCreateView(generics.CreateAPIView):
    """View dedicada para criação de usuários (Roadmap v2.0)"""
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Apenas superadmin ou gerentes podem criar novos usuários
        if not (self.request.user.role == 'superadmin' or self.request.user.role == 'gerente'):
            raise permissions.PermissionDenied(
                'Apenas superadmins ou gerentes podem criar novos usuários.'
            )
        serializer.save()


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View para operações detalhadas em usuários específicos"""
    queryset = CustomUser.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Admins podem ver todos os usuários
        if user.is_admin() or user.is_superuser:
            return CustomUser.objects.all()
        
        # Colaboradores só podem ver a si mesmos
        return CustomUser.objects.filter(id=user.id)
    
    def perform_destroy(self, instance):
        # Apenas admins podem excluir usuários
        if not (self.request.user.is_admin() or self.request.user.is_superuser):
            raise permissions.PermissionDenied(
                'Apenas administradores podem excluir usuários.'
            )
        
        # Não permite excluir a si mesmo
        if instance == self.request.user:
            raise permissions.PermissionDenied(
                'Você não pode excluir sua própria conta.'
            )
        
        instance.delete()


class PasswordChangeView(APIView):
    """View para alteração de senha"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data, 
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Senha alterada com sucesso.'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_permissions(request):
    """Endpoint para verificar permissões do usuário atual"""
    user = request.user
    
    permissions_data = {
        'role': getattr(user, 'role', 'admin'),
        'can_access_financial_reports': user.can_access_financial_reports() if hasattr(user, 'can_access_financial_reports') else True,
        'can_modify_settings': user.can_modify_settings() if hasattr(user, 'can_modify_settings') else True,
        'can_delete_records': user.can_delete_records() if hasattr(user, 'can_delete_records') else True,
        'can_access_ai_assistant': user.can_access_ai_assistant() if hasattr(user, 'can_access_ai_assistant') else True,
        'can_use_ai_for_reports': user.can_use_ai_for_reports() if hasattr(user, 'can_use_ai_for_reports') else True,
        'is_admin': user.is_admin() if hasattr(user, 'is_admin') else True,
        'is_collaborator': user.is_collaborator() if hasattr(user, 'is_collaborator') else False,
    }
    
    return Response(permissions_data)


class UserRoleUpdateView(APIView):
    """View para alteração de papel (role) — exclusivo para superadmin"""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role != 'superadmin':
            return Response(
                {'detail': 'Apenas o superadmin pode alterar papéis de usuário.'},
                status=status.HTTP_403_FORBIDDEN
            )

        new_role = request.data.get('role')
        valid_roles = [r[0] for r in CustomUser.UserRole.choices]
        if not new_role or new_role not in valid_roles:
            return Response(
                {'detail': f'Papel inválido. Escolha entre: {", ".join(valid_roles)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            target_user = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'Usuário não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        target_user.role = new_role
        target_user.save(update_fields=['role'])
        return Response(UserSerializer(target_user).data)
