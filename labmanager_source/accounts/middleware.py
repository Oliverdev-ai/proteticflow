from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.urls import resolve
from .models import CustomUser


class PermissionMiddleware(MiddlewareMixin):
    """
    Middleware para verificar permissões baseadas no tipo de usuário
    """
    
    # URLs que requerem permissões de administrador
    ADMIN_ONLY_URLS = [
        'financial',  # Relatórios financeiros
        'settings',   # Configurações do sistema
        'users',      # Gerenciamento de usuários
        'admin',      # Django admin
    ]
    
    # URLs que colaboradores NÃO podem acessar
    COLLABORATOR_RESTRICTED_URLS = [
        'financial',
        'settings', 
        'users',
        'admin',
        'delete',  # Qualquer URL com delete
    ]
    
    # URLs relacionadas ao assistente de IA que colaboradores podem usar
    AI_COLLABORATOR_ALLOWED = [
        'ai-assistant/register-work',
        'ai-assistant/register-client', 
        'ai-assistant/complete-work',
        'ai-assistant/help-register',
    ]
    
    def process_request(self, request):
        # Pula verificação para URLs de autenticação
        if self._is_auth_url(request.path):
            return None
        
        # Pula verificação para usuários não autenticados em URLs públicas
        if not request.user.is_authenticated:
            return None
        
        # Verifica se é um superuser (sempre permitido)
        if request.user.is_superuser:
            return None
        
        # Obtém o papel (role) do usuário
        role = getattr(request.user, 'role', None)

        # Se não tem role definido, permite acesso (compatibilidade)
        if not role:
            return None

        # Verifica restrições para roles colaboradores (producao, recepcao, contabil)
        if request.user.is_collaborator():
            return self._check_collaborator_permissions(request)

        return None
    
    def _is_auth_url(self, path):
        """Verifica se é uma URL de autenticação"""
        auth_urls = [
            '/api/auth/login/',
            '/api/auth/logout/',
            '/api/auth/refresh/',
            '/admin/login/',
        ]
        return any(path.startswith(url) for url in auth_urls)
    
    def _check_collaborator_permissions(self, request):
        """Verifica permissões específicas para colaboradores"""
        path = request.path.lower()
        method = request.method.upper()
        
        # Bloqueia acesso a URLs restritas
        for restricted in self.COLLABORATOR_RESTRICTED_URLS:
            if restricted in path:
                return self._permission_denied_response(
                    'Acesso negado: Você não tem permissão para acessar esta funcionalidade.'
                )
        
        # Bloqueia operações DELETE
        if method == 'DELETE':
            return self._permission_denied_response(
                'Acesso negado: Colaboradores não podem excluir registros.'
            )
        
        # Verifica acesso ao assistente de IA
        if 'ai-assistant' in path:
            return self._check_ai_assistant_access(request, path)
        
        return None
    
    def _check_ai_assistant_access(self, request, path):
        """Verifica acesso específico ao assistente de IA para colaboradores"""
        # Permite apenas comandos específicos para colaboradores
        allowed = False
        for allowed_path in self.AI_COLLABORATOR_ALLOWED:
            if allowed_path in path:
                allowed = True
                break
        
        # Verifica se é um comando de relatório (não permitido)
        if any(keyword in path for keyword in ['report', 'financial', 'billing']):
            allowed = False
        
        if not allowed:
            return self._permission_denied_response(
                'Acesso negado: Colaboradores só podem usar o assistente para cadastros e baixas.'
            )
        
        return None
    
    def _permission_denied_response(self, message):
        """Retorna resposta de permissão negada"""
        return JsonResponse({
            'error': 'permission_denied',
            'message': message
        }, status=403)

