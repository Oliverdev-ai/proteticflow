import time
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from apps.employees.permissions import IsSuperAdmin
from django.db.models import Q, Count, Sum
from datetime import timedelta
from .models import (
    SubscriptionPlan, UserRole, UserSubscription, UserProfile,
    UsageTracking, AccessRestriction
)
from .serializers import (
    SubscriptionPlanSerializer, UserRoleSerializer, UserSubscriptionSerializer,
    UserProfileSerializer, UsageTrackingSerializer, AccessRestrictionSerializer,
    AccessControlStatusSerializer, UsageSummarySerializer,
    FeatureAccessRequestSerializer, FeatureAccessResponseSerializer,
    UserLimitsUpdateSerializer, SubscriptionUpgradeSerializer,
    RestrictionCreateSerializer
)
from .access_manager import AccessControlManager, PermissionChecker
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class SubscriptionPlanListView(generics.ListAPIView):
    """View para listar planos de assinatura"""
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return SubscriptionPlan.objects.filter(is_active=True).order_by('monthly_price')


class UserRoleListView(generics.ListAPIView):
    """View para listar papéis de usuário"""
    serializer_class = UserRoleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Apenas admins podem ver todos os papéis
        access_manager = AccessControlManager(self.request.user)
        if access_manager.role.can_manage_users:
            return UserRole.objects.filter(is_active=True)
        else:
            # Usuários normais só veem seu próprio papel
            return UserRole.objects.filter(id=access_manager.role.id)


class UserSubscriptionDetailView(generics.RetrieveAPIView):
    """View para detalhes da assinatura do usuário"""
    serializer_class = UserSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        access_manager = AccessControlManager(self.request.user)
        return access_manager.subscription


class UserProfileDetailView(generics.RetrieveUpdateAPIView):
    """View para perfil do usuário"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        access_manager = AccessControlManager(self.request.user)
        return access_manager.profile


class UsageTrackingListView(generics.ListAPIView):
    """View para histórico de uso"""
    serializer_class = UsageTrackingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Usuários veem apenas seu próprio uso
        queryset = UsageTracking.objects.filter(user=self.request.user)
        
        # Filtros opcionais
        feature_type = self.request.query_params.get('feature_type')
        if feature_type:
            queryset = queryset.filter(feature_type=feature_type)
        
        days = self.request.query_params.get('days', 30)
        try:
            days = int(days)
            start_date = timezone.now() - timedelta(days=days)
            queryset = queryset.filter(usage_date__gte=start_date)
        except ValueError:
            pass
        
        return queryset.order_by('-usage_date')


class AccessRestrictionListView(generics.ListAPIView):
    """View para listar restrições de acesso"""
    serializer_class = AccessRestrictionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        access_manager = AccessControlManager(self.request.user)
        
        if access_manager.role.can_manage_users:
            # Admins veem todas as restrições
            return AccessRestriction.objects.all().order_by('-created_at')
        else:
            # Usuários veem apenas suas próprias restrições
            return AccessRestriction.objects.filter(user=self.request.user).order_by('-created_at')


class AccessControlStatusView(APIView):
    """View para status de controle de acesso"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Retorna status completo de acesso do usuário"""
        try:
            access_manager = AccessControlManager(request.user)
            
            # Obter informações básicas
            subscription = access_manager.subscription
            profile = access_manager.profile
            role = access_manager.role
            
            # Obter limites restantes
            remaining_limits = access_manager.get_remaining_limits()
            
            # Obter permissões
            permissions_data = PermissionChecker.get_user_permissions(request.user)
            
            # Verificar funcionalidades principais
            features_status = {}
            main_features = [
                'flow_commands', 'intelligent_scheduling', 'predictive_analytics',
                'automated_support', 'smart_orders', 'financial_reports'
            ]
            
            for feature in main_features:
                can_use, message = access_manager.can_use_feature(feature)
                features_status[feature] = {
                    'can_access': can_use,
                    'message': message
                }
            
            response_data = {
                'can_access': True,
                'message': 'Status obtido com sucesso',
                'subscription_plan': subscription.plan.name,
                'subscription_status': subscription.status,
                'user_role': role.name,
                'remaining_limits': remaining_limits,
                'permissions': permissions_data,
                'features_status': features_status,
                'subscription_details': UserSubscriptionSerializer(subscription).data,
                'profile_details': UserProfileSerializer(profile).data
            }
            
            return Response(response_data)
        
        except Exception as e:
            logger.error(f"Erro ao obter status de acesso: {e}")
            return Response(
                {'error': 'Erro ao obter status de acesso'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FeatureAccessCheckView(APIView):
    """View para verificar acesso a funcionalidades específicas"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Verifica se usuário pode acessar uma funcionalidade"""
        serializer = FeatureAccessRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            feature_name = serializer.validated_data['feature_name']
            command_name = serializer.validated_data.get('command_name')
            
            if command_name:
                # Verificar comando específico
                can_access, message = PermissionChecker.can_access_command(
                    request.user, command_name
                )
            else:
                # Verificar funcionalidade geral
                access_manager = AccessControlManager(request.user)
                can_access, message = access_manager.can_use_feature(feature_name)
            
            # Obter limites restantes se for comando Flow
            remaining_data = {}
            if feature_name in ['flow_commands', 'intelligent_scheduling', 'predictive_analytics']:
                access_manager = AccessControlManager(request.user)
                daily_check = access_manager.check_usage_limit(
                    UsageTracking.FeatureType.FLOW_COMMAND, 'daily'
                )
                monthly_check = access_manager.check_usage_limit(
                    UsageTracking.FeatureType.FLOW_COMMAND, 'monthly'
                )
                
                # Extrair números dos limites
                if daily_check[0]:
                    daily_parts = daily_check[1].split('/')
                    if len(daily_parts) == 2:
                        remaining_data['remaining_daily'] = int(daily_parts[1]) - int(daily_parts[0])
                
                if monthly_check[0]:
                    monthly_parts = monthly_check[1].split('/')
                    if len(monthly_parts) == 2:
                        remaining_data['remaining_monthly'] = int(monthly_parts[1]) - int(monthly_parts[0])
            
            response_data = {
                'can_access': can_access,
                'message': message,
                **remaining_data
            }
            
            return Response(response_data)
        
        except Exception as e:
            logger.error(f"Erro na verificação de acesso: {e}")
            return Response(
                {'error': 'Erro na verificação de acesso'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UsageSummaryView(APIView):
    """View para resumo de uso"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Retorna resumo de uso do usuário"""
        try:
            days = int(request.query_params.get('days', 30))
            access_manager = AccessControlManager(request.user)
            
            usage_summary = access_manager.get_usage_summary(days)
            
            return Response(usage_summary)
        
        except Exception as e:
            logger.error(f"Erro no resumo de uso: {e}")
            return Response(
                {'error': 'Erro ao obter resumo de uso'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserLimitsUpdateView(APIView):
    """View para atualizar limites de usuário (apenas admins)"""
    permission_classes = [IsSuperAdmin]
    
    def post(self, request, user_id):
        """Atualiza limites personalizados de um usuário"""
        try:
            # Verificar se é admin
            access_manager = AccessControlManager(request.user)
            if not access_manager.role.can_manage_users:
                return Response(
                    {'error': 'Permissão insuficiente'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Validar dados
            serializer = UserLimitsUpdateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # Obter usuário alvo
            try:
                target_user = User.objects.get(id=user_id)
                target_access_manager = AccessControlManager(target_user)
                target_profile = target_access_manager.profile
            except User.DoesNotExist:
                return Response(
                    {'error': 'Usuário não encontrado'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Atualizar limites
            validated_data = serializer.validated_data
            
            if 'custom_flow_limit_daily' in validated_data:
                target_profile.custom_flow_limit_daily = validated_data['custom_flow_limit_daily']
            
            if 'custom_flow_limit_monthly' in validated_data:
                target_profile.custom_flow_limit_monthly = validated_data['custom_flow_limit_monthly']
            
            if 'role_id' in validated_data:
                try:
                    new_role = UserRole.objects.get(id=validated_data['role_id'])
                    target_profile.role = new_role
                except UserRole.DoesNotExist:
                    return Response(
                        {'error': 'Papel não encontrado'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            target_profile.save()
            
            return Response({
                'success': True,
                'message': 'Limites atualizados com sucesso',
                'profile': UserProfileSerializer(target_profile).data
            })
        
        except Exception as e:
            logger.error(f"Erro ao atualizar limites: {e}")
            return Response(
                {'error': 'Erro ao atualizar limites'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def track_feature_usage(request):
    """Registra uso de funcionalidade"""
    try:
        feature_type = request.data.get('feature_type')
        feature_name = request.data.get('feature_name')
        execution_time_ms = request.data.get('execution_time_ms')
        success = request.data.get('success', True)
        error_message = request.data.get('error_message', '')
        
        if not feature_type or not feature_name:
            return Response(
                {'error': 'feature_type e feature_name são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        access_manager = AccessControlManager(request.user)
        access_manager.track_usage(
            feature_type=feature_type,
            feature_name=feature_name,
            request_data=request.data.get('request_data', {}),
            response_data=request.data.get('response_data', {}),
            execution_time_ms=execution_time_ms,
            success=success,
            error_message=error_message
        )
        
        return Response({
            'success': True,
            'message': 'Uso registrado com sucesso'
        })
    
    except Exception as e:
        logger.error(f"Erro ao registrar uso: {e}")
        return Response(
            {'error': 'Erro ao registrar uso'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def create_access_restriction(request):
    """Cria restrição de acesso (apenas admins)"""
    try:
        # Verificar se é admin
        access_manager = AccessControlManager(request.user)
        if not access_manager.role.can_manage_users:
            return Response(
                {'error': 'Permissão insuficiente'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = RestrictionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Criar restrição
        restriction = serializer.save(created_by=request.user)
        
        return Response({
            'success': True,
            'message': 'Restrição criada com sucesso',
            'restriction': AccessRestrictionSerializer(restriction).data
        })
    
    except Exception as e:
        logger.error(f"Erro ao criar restrição: {e}")
        return Response(
            {'error': 'Erro ao criar restrição'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def lift_access_restriction(request, restriction_id):
    """Remove restrição de acesso (apenas admins)"""
    try:
        # Verificar se é admin
        access_manager = AccessControlManager(request.user)
        if not access_manager.role.can_manage_users:
            return Response(
                {'error': 'Permissão insuficiente'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Obter restrição
        try:
            restriction = AccessRestriction.objects.get(id=restriction_id)
        except AccessRestriction.DoesNotExist:
            return Response(
                {'error': 'Restrição não encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Remover restrição
        restriction.status = AccessRestriction.RestrictionStatus.LIFTED
        restriction.lifted_by = request.user
        restriction.lifted_at = timezone.now()
        restriction.save()
        
        return Response({
            'success': True,
            'message': 'Restrição removida com sucesso'
        })
    
    except Exception as e:
        logger.error(f"Erro ao remover restrição: {e}")
        return Response(
            {'error': 'Erro ao remover restrição'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def admin_dashboard_data(request):
    """Dados do dashboard administrativo"""
    try:
        # Verificar se é admin
        access_manager = AccessControlManager(request.user)
        if not access_manager.role.can_manage_users:
            return Response(
                {'error': 'Permissão insuficiente'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Estatísticas gerais
        total_users = User.objects.count()
        active_subscriptions = UserSubscription.objects.filter(
            status=UserSubscription.SubscriptionStatus.ACTIVE
        ).count()
        
        # Uso por plano
        usage_by_plan = UserSubscription.objects.values(
            'plan__name'
        ).annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Uso recente (últimos 7 dias)
        week_ago = timezone.now() - timedelta(days=7)
        recent_usage = UsageTracking.objects.filter(
            usage_date__gte=week_ago
        ).values('feature_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Restrições ativas
        active_restrictions = AccessRestriction.objects.filter(
            status=AccessRestriction.RestrictionStatus.ACTIVE
        ).count()
        
        return Response({
            'total_users': total_users,
            'active_subscriptions': active_subscriptions,
            'usage_by_plan': list(usage_by_plan),
            'recent_usage': list(recent_usage),
            'active_restrictions': active_restrictions
        })
    
    except Exception as e:
        logger.error(f"Erro no dashboard admin: {e}")
        return Response(
            {'error': 'Erro ao obter dados do dashboard'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

