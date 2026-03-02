# apps/licensing/middleware.py
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from .models import License
import json

class LicenseMiddleware(MiddlewareMixin):
    """Middleware para verificar limites de licenciamento"""
    
    # URLs que devem ser verificadas
    PROTECTED_ENDPOINTS = {
        '/api/v1/clients/': 'client',
        '/api/v1/jobs/': 'job',
        '/api/v1/price-tables/': 'price_table',
    }
    
    def process_request(self, request):
        # Pular verificação para URLs de licenciamento e autenticação
        if (request.path.startswith('/api/v1/licensing/') or 
            request.path.startswith('/api/token/') or
            request.path.startswith('/admin/') or
            request.method == 'GET'):
            return None
        
        # Verificar apenas para operações POST (criação)
        if request.method != 'POST':
            return None
        
        # Verificar se é um endpoint protegido
        endpoint_type = None
        for endpoint, type_name in self.PROTECTED_ENDPOINTS.items():
            if request.path.startswith(endpoint):
                endpoint_type = type_name
                break
        
        if not endpoint_type:
            return None
        
        try:
            # Obter licença ativa
            license = License.objects.filter(status='ACTIVE').first()
            
            if not license or not license.is_valid():
                return JsonResponse({
                    'error': 'Licença inválida ou expirada',
                    'code': 'LICENSE_INVALID',
                    'action_required': 'upgrade_license'
                }, status=403)
            
            # Atualizar contadores
            license.update_usage_counts()
            
            # Verificar limite específico
            can_perform = False
            limit_message = ""
            
            if endpoint_type == 'client':
                can_perform = license.check_client_limit()
                limit_message = f"Limite de {license.plan.max_clients} clientes atingido"
            elif endpoint_type == 'job':
                can_perform = license.check_job_limit()
                limit_message = f"Limite de {license.plan.max_jobs_per_month} trabalhos/mês atingido"
            elif endpoint_type == 'price_table':
                can_perform = license.check_price_table_limit()
                limit_message = f"Limite de {license.plan.max_price_tables} tabelas atingido"
            
            if not can_perform:
                return JsonResponse({
                    'error': limit_message,
                    'code': 'LIMIT_EXCEEDED',
                    'current_plan': license.plan.display_name,
                    'action_required': 'upgrade_plan',
                    'limits': license.get_limits_status()
                }, status=403)
        
        except Exception as e:
            # Em caso de erro, permitir a operação (fail-safe)
            pass
        
        return None

