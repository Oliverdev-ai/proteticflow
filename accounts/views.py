from rest_framework import generics, status, permissions
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
    CollaboratorCreateSerializer, LoginSerializer, PasswordChangeSerializer
)


class LoginView(APIView):
    """View para autenticação de usuários"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Gera tokens JWT
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            # Adiciona informações customizadas ao token
            access_token['user_type'] = user.user_type
            access_token['username'] = user.username
            
            return Response({
                'access': str(access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


class CollaboratorCreateView(generics.CreateAPIView):
    """View específica para criação de colaboradores"""
    serializer_class = CollaboratorCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        # Apenas admins podem criar colaboradores
        if not (self.request.user.is_admin() or self.request.user.is_superuser):
            raise permissions.PermissionDenied(
                'Apenas administradores podem criar colaboradores.'
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
        'user_type': getattr(user, 'user_type', 'admin'),
        'can_access_financial_reports': user.can_access_financial_reports() if hasattr(user, 'can_access_financial_reports') else True,
        'can_modify_settings': user.can_modify_settings() if hasattr(user, 'can_modify_settings') else True,
        'can_delete_records': user.can_delete_records() if hasattr(user, 'can_delete_records') else True,
        'can_access_ai_assistant': user.can_access_ai_assistant() if hasattr(user, 'can_access_ai_assistant') else True,
        'can_use_ai_for_reports': user.can_use_ai_for_reports() if hasattr(user, 'can_use_ai_for_reports') else True,
        'is_admin': user.is_admin() if hasattr(user, 'is_admin') else True,
        'is_collaborator': user.is_collaborator() if hasattr(user, 'is_collaborator') else False,
    }
    
    return Response(permissions_data)

