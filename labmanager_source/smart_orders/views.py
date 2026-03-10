import time
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q, Count, Sum, Avg
from datetime import timedelta
from .models import (
    ClientOrderHistory, SmartOrderTemplate, MaterialSuggestion,
    PriceEstimationModel, SmartOrderSuggestion, ReworkPattern,
    SmartOrderMetrics
)
from .serializers import (
    ClientOrderHistorySerializer, SmartOrderTemplateSerializer,
    MaterialSuggestionSerializer, PriceEstimationModelSerializer,
    SmartOrderSuggestionSerializer, ReworkPatternSerializer,
    SmartOrderMetricsSerializer, AutoFillRequestSerializer,
    AutoFillResponseSerializer, PricePredictionRequestSerializer,
    PricePredictionResponseSerializer, SuggestionFeedbackSerializer
)
from .ml_engine import SmartOrderEngine, PricePredictionEngine, ReworkDetectionEngine
from apps.clients.models import Client
import logging
from rest_framework.exceptions import NotFound

logger = logging.getLogger(__name__)
User = get_user_model()


class ClientOrderHistoryListView(generics.ListAPIView):
    """View para histórico de pedidos do cliente"""
    serializer_class = ClientOrderHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        client_id = self.request.query_params.get('client_id')
        queryset = ClientOrderHistory.objects.select_related('client').all()
        
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        
        return queryset.order_by('-created_at')


class SmartOrderTemplateListView(generics.ListCreateAPIView):
    """View para templates de pedidos inteligentes"""
    serializer_class = SmartOrderTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return SmartOrderTemplate.objects.select_related('created_by').filter(is_active=True).order_by('-priority')


class MaterialSuggestionListView(generics.ListAPIView):
    """View para sugestões de materiais"""
    serializer_class = MaterialSuggestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        service_type = self.request.query_params.get('service_type')
        queryset = MaterialSuggestion.objects.all()
        
        if service_type:
            queryset = queryset.filter(service_type__icontains=service_type)
        
        return queryset.order_by('-confidence_score')


class SmartOrderSuggestionListView(generics.ListAPIView):
    """View para sugestões de pedidos"""
    serializer_class = SmartOrderSuggestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        client_id = self.request.query_params.get('client_id')
        status_filter = self.request.query_params.get('status')
        
        queryset = SmartOrderSuggestion.objects.select_related('client').all()
        
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-created_at')


class ReworkPatternListView(generics.ListAPIView):
    """View para padrões de retrabalho"""
    serializer_class = ReworkPatternSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ReworkPattern.objects.filter(is_active=True).order_by('-frequency_score')


class SmartOrderMetricsListView(generics.ListAPIView):
    """View para métricas de pedidos inteligentes"""
    serializer_class = SmartOrderMetricsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        days = int(self.request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        
        return SmartOrderMetrics.objects.filter(
            date__gte=start_date
        ).order_by('-date')


class AutoFillSuggestionsView(APIView):
    """View para sugestões de auto-preenchimento"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Gera sugestões de auto-preenchimento"""
        try:
            serializer = AutoFillRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            client_id = serializer.validated_data['client_id']
            partial_order_data = serializer.validated_data.get('partial_order_data', {})
            
            # Obter cliente
            try:
                client = Client.objects.get(id=client_id)
            except Client.DoesNotExist:
                logger.warning(f"Cliente não encontrado: {client_id}")
                raise NotFound(detail='Cliente não encontrado')
            
            # Gerar sugestões
            try:
                engine = SmartOrderEngine()
                suggestions = engine.generate_auto_fill_suggestions(client, partial_order_data)
            except (ValueError, RuntimeError) as ml_error:
                logger.error(f"Erro específico de ML: {ml_error}")
                return Response({'error': 'Erro ao executar modelo de sugestão'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response(suggestions)
        
        except NotFound as nf:
            return Response({'error': str(nf)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Erro ao gerar sugestões de auto-preenchimento: {e}", exc_info=True)
            return Response(
                {'error': 'Erro interno do servidor'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PricePredictionView(APIView):
    """View para predição de preços"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Prediz preço para um pedido"""
        try:
            serializer = PricePredictionRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            order_data = serializer.validated_data['order_data']
            service_category = serializer.validated_data.get('service_category')
            
            # Fazer predição
            engine = PricePredictionEngine()
            prediction = engine.predict_price(order_data, service_category)
            
            return Response(prediction)
        
        except Exception as e:
            logger.error(f"Erro na predição de preço: {e}")
            return Response(
                {'error': 'Erro interno do servidor'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SuggestionFeedbackView(APIView):
    """View para feedback de sugestões"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Registra feedback de uma sugestão"""
        try:
            serializer = SuggestionFeedbackSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            suggestion_id = serializer.validated_data['suggestion_id']
            new_status = serializer.validated_data['status']
            user_feedback = serializer.validated_data.get('user_feedback', '')
            applied_data = serializer.validated_data.get('applied_data', {})
            
            # Obter sugestão
            try:
                suggestion = SmartOrderSuggestion.objects.get(id=suggestion_id)
            except SmartOrderSuggestion.DoesNotExist:
                return Response(
                    {'error': 'Sugestão não encontrada'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Atualizar sugestão
            suggestion.status = new_status
            suggestion.user_feedback = user_feedback
            suggestion.applied_data = applied_data
            suggestion.responded_at = timezone.now()
            suggestion.save()
            
            # Atualizar métricas do template se aplicável
            if suggestion.source_template:
                template = suggestion.source_template
                template.usage_count += 1
                
                if new_status == SmartOrderSuggestion.SuggestionStatus.ACCEPTED:
                    # Calcular nova taxa de sucesso
                    total_suggestions = SmartOrderSuggestion.objects.filter(
                        source_template=template
                    ).count()
                    accepted_suggestions = SmartOrderSuggestion.objects.filter(
                        source_template=template,
                        status=SmartOrderSuggestion.SuggestionStatus.ACCEPTED
                    ).count()
                    
                    template.success_rate = (accepted_suggestions / total_suggestions) * 100
                
                template.save()
            
            return Response({
                'success': True,
                'message': 'Feedback registrado com sucesso'
            })
        
        except Exception as e:
            logger.error(f"Erro ao registrar feedback: {e}")
            return Response(
                {'error': 'Erro interno do servidor'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def analyze_client_patterns(request):
    """Analisa padrões de um cliente específico"""
    try:
        client_id = request.data.get('client_id')
        if not client_id:
            return Response(
                {'error': 'client_id é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            client = Client.objects.get(id=client_id)
        except Client.DoesNotExist:
            return Response(
                {'error': 'Cliente não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        engine = SmartOrderEngine()
        patterns = engine.analyze_client_patterns(client)
        
        return Response({
            'client_id': client_id,
            'client_name': client.name,
            'patterns': patterns
        })
    
    except Exception as e:
        logger.error(f"Erro na análise de padrões: {e}")
        return Response(
            {'error': 'Erro interno do servidor'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def train_price_model(request):
    """Treina modelo de predição de preços"""
    try:
        service_category = request.data.get('service_category')
        
        engine = PricePredictionEngine()
        success = engine.train_price_model(service_category)
        
        if success:
            return Response({
                'success': True,
                'message': f'Modelo treinado com sucesso para {service_category or "geral"}'
            })
        else:
            return Response({
                'success': False,
                'message': 'Falha no treinamento do modelo'
            })
    
    except Exception as e:
        logger.error(f"Erro no treinamento do modelo: {e}")
        return Response(
            {'error': 'Erro interno do servidor'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def analyze_rework_patterns(request):
    """Analisa padrões de retrabalho"""
    try:
        engine = ReworkDetectionEngine()
        patterns = engine.analyze_rework_patterns()
        
        return Response({
            'patterns_detected': len(patterns),
            'patterns': patterns
        })
    
    except Exception as e:
        logger.error(f"Erro na análise de retrabalho: {e}")
        return Response(
            {'error': 'Erro interno do servidor'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def smart_orders_dashboard(request):
    """Dashboard de pedidos inteligentes"""
    try:
        # Métricas dos últimos 30 dias
        thirty_days_ago = timezone.now().date() - timedelta(days=30)
        
        # Sugestões
        total_suggestions = SmartOrderSuggestion.objects.filter(
            created_at__date__gte=thirty_days_ago
        ).count()
        
        accepted_suggestions = SmartOrderSuggestion.objects.filter(
            created_at__date__gte=thirty_days_ago,
            status=SmartOrderSuggestion.SuggestionStatus.ACCEPTED
        ).count()
        
        # Templates ativos
        active_templates = SmartOrderTemplate.objects.filter(is_active=True).count()
        
        # Padrões de retrabalho
        rework_patterns = ReworkPattern.objects.filter(
            is_active=True,
            requires_attention=True
        ).count()
        
        # Modelos de preço
        price_models = PriceEstimationModel.objects.filter(is_active=True)
        avg_accuracy = price_models.aggregate(avg_acc=Avg('accuracy_score'))['avg_acc'] or 0
        
        # Sugestões por tipo
        suggestions_by_type = SmartOrderSuggestion.objects.filter(
            created_at__date__gte=thirty_days_ago
        ).values('suggestion_type').annotate(count=Count('id'))
        
        # Taxa de aceitação por template
        template_performance = []
        for template in SmartOrderTemplate.objects.filter(is_active=True)[:10]:
            template_suggestions = SmartOrderSuggestion.objects.filter(
                source_template=template,
                created_at__date__gte=thirty_days_ago
            )
            total = template_suggestions.count()
            accepted = template_suggestions.filter(
                status=SmartOrderSuggestion.SuggestionStatus.ACCEPTED
            ).count()
            
            if total > 0:
                template_performance.append({
                    'template_name': template.name,
                    'total_suggestions': total,
                    'accepted_suggestions': accepted,
                    'acceptance_rate': (accepted / total) * 100
                })
        
        return Response({
            'summary': {
                'total_suggestions': total_suggestions,
                'accepted_suggestions': accepted_suggestions,
                'acceptance_rate': (accepted_suggestions / max(total_suggestions, 1)) * 100,
                'active_templates': active_templates,
                'rework_patterns_attention': rework_patterns,
                'avg_model_accuracy': avg_accuracy * 100
            },
            'suggestions_by_type': list(suggestions_by_type),
            'template_performance': template_performance
        })
    
    except Exception as e:
        logger.error(f"Erro no dashboard: {e}")
        return Response(
            {'error': 'Erro interno do servidor'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

