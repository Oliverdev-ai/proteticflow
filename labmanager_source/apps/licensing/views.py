# apps/licensing/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.conf import settings
from .models import License, LicensePlan, LicenseCheck
from .serializers import LicenseSerializer, LicensePlanSerializer
import json

class LicensePlanViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para visualizar planos de licenciamento"""
    queryset = LicensePlan.objects.filter(is_active=True)
    serializer_class = LicensePlanSerializer
    permission_classes = [IsAuthenticated]

class LicenseViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar licenças"""
    queryset = License.objects.all()
    serializer_class = LicenseSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Retorna a licença atual do sistema"""
        try:
            # Por simplicidade, assumimos uma licença por instalação
            license = License.objects.filter(status='ACTIVE').first()
            
            if not license:
                # Criar licença gratuita se não existir
                free_plan = LicensePlan.objects.get(name='FREE')
                license = License.objects.create(
                    organization_name="Laboratório Demo",
                    contact_email="demo@labmanager.com",
                    plan=free_plan,
                    status='ACTIVE'
                )
            
            # Atualizar contadores de uso
            license.update_usage_counts()
            
            # Registrar verificação
            LicenseCheck.objects.create(
                license=license,
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                is_valid=license.is_valid()
            )
            
            serializer = self.get_serializer(license)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def limits(self, request):
        """Retorna status dos limites da licença atual"""
        try:
            license = License.objects.filter(status='ACTIVE').first()
            if not license:
                return Response(
                    {'error': 'Nenhuma licença ativa encontrada'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            license.update_usage_counts()
            limits_status = license.get_limits_status()
            
            return Response({
                'license_key': license.license_key[:8] + '...',
                'plan': license.plan.display_name,
                'status': license.status,
                'limits': limits_status,
                'expires_at': license.expires_at,
                'features': {
                    'advanced_reports': license.plan.has_advanced_reports,
                    'client_portal': license.plan.has_client_portal,
                    'api_access': license.plan.has_api_access,
                    'priority_support': license.plan.has_priority_support,
                }
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def check_limit(self, request):
        """Verifica se uma ação específica pode ser realizada"""
        action_type = request.data.get('action')  # 'client', 'job', 'price_table'
        
        try:
            license = License.objects.filter(status='ACTIVE').first()
            if not license or not license.is_valid():
                return Response(
                    {'can_perform': False, 'reason': 'Licença inválida ou expirada'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            license.update_usage_counts()
            
            if action_type == 'client':
                can_perform = license.check_client_limit()
                reason = f"Limite de {license.plan.max_clients} clientes atingido" if not can_perform else ""
            elif action_type == 'job':
                can_perform = license.check_job_limit()
                reason = f"Limite de {license.plan.max_jobs_per_month} trabalhos/mês atingido" if not can_perform else ""
            elif action_type == 'price_table':
                can_perform = license.check_price_table_limit()
                reason = f"Limite de {license.plan.max_price_tables} tabelas atingido" if not can_perform else ""
            else:
                return Response(
                    {'error': 'Tipo de ação inválido'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response({
                'can_perform': can_perform,
                'reason': reason,
                'current_plan': license.plan.display_name,
                'upgrade_available': license.plan.name != 'PREMIUM'
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def upgrade_plan(self, request, pk=None):
        """Simula upgrade de plano (em produção seria integrado com gateway de pagamento)"""
        license = self.get_object()
        new_plan_name = request.data.get('plan')
        
        try:
            new_plan = LicensePlan.objects.get(name=new_plan_name)
            license.plan = new_plan
            
            # Em produção, aqui seria validado o pagamento
            # Por enquanto, apenas simula o upgrade
            if new_plan.name != 'FREE':
                license.expires_at = timezone.now() + timezone.timedelta(days=30)
            
            license.save()
            
            return Response({
                'message': f'Plano atualizado para {new_plan.display_name}',
                'new_plan': new_plan.display_name,
                'expires_at': license.expires_at
            })
            
        except LicensePlan.DoesNotExist:
            return Response(
                {'error': 'Plano não encontrado'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_client_ip(self, request):
        """Obtém o IP do cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

