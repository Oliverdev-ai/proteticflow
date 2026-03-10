import time
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q, Count, Avg
from .models import (
    TechnicianProfile, JobTimeEstimate, ProductionSchedule, 
    BottleneckAlert, MLModelMetrics
)
from .serializers import (
    TechnicianProfileSerializer, JobTimeEstimateSerializer,
    ProductionScheduleSerializer, BottleneckAlertSerializer,
    MLModelMetricsSerializer, TimeEstimationRequestSerializer,
    TimeEstimationResponseSerializer, ScheduleOptimizationRequestSerializer,
    ScheduleOptimizationResponseSerializer, BottleneckAnalysisResponseSerializer
)
from .ml_models import JobTimePredictor, ProductionOptimizer
from apps.jobs.models import Job
from apps.clients.models import Client
import logging

logger = logging.getLogger(__name__)


class TechnicianProfileListView(generics.ListCreateAPIView):
    """View para listar e criar perfis de técnicos"""
    serializer_class = TechnicianProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return TechnicianProfile.objects.select_related('user').all()


class TechnicianProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View para operações detalhadas em perfis de técnicos"""
    serializer_class = TechnicianProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = TechnicianProfile.objects.all()


class ProductionScheduleListView(generics.ListAPIView):
    """View para listar cronogramas de produção"""
    serializer_class = ProductionScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = ProductionSchedule.objects.select_related(
            'job', 'job__client', 'assigned_technician', 'assigned_technician__user'
        ).order_by('-priority_score', 'estimated_start_date')
        
        # Filtros opcionais
        technician_id = self.request.query_params.get('technician_id')
        if technician_id:
            queryset = queryset.filter(assigned_technician_id=technician_id)
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(job__status=status_filter)
        
        return queryset


class BottleneckAlertListView(generics.ListAPIView):
    """View para listar alertas de gargalos"""
    serializer_class = BottleneckAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = BottleneckAlert.objects.select_related(
            'affected_technician', 'affected_technician__user'
        ).prefetch_related('affected_jobs').order_by('-severity', '-created_at')
        
        # Filtrar apenas alertas não resolvidos por padrão
        if self.request.query_params.get('include_resolved') != 'true':
            queryset = queryset.filter(is_resolved=False)
        
        return queryset


class MLModelMetricsListView(generics.ListAPIView):
    """View para listar métricas dos modelos ML"""
    serializer_class = MLModelMetricsSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return MLModelMetrics.objects.filter(is_active=True).order_by('-last_trained_at')


class TimeEstimationView(APIView):
    """View para estimativa de tempo de trabalhos"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Estima tempo de produção para um trabalho"""
        serializer = TimeEstimationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Preparar features para predição
            features = {
                'prosthesis_type': serializer.validated_data['prosthesis_type'],
                'material': serializer.validated_data.get('material', ''),
                'complexity_level': serializer.validated_data.get('complexity_level', 2),
                'technician_skill_level': 2,  # Padrão
                'technician_efficiency': 1.0,  # Padrão
                'client_history_avg_time': 32,  # Padrão
                'entry_date': timezone.now().date()
            }
            
            # Ajustar baseado no técnico se fornecido
            technician_id = serializer.validated_data.get('technician_id')
            if technician_id:
                try:
                    technician = TechnicianProfile.objects.get(id=technician_id)
                    features['technician_skill_level'] = technician.skill_level
                    features['technician_efficiency'] = technician.efficiency_rating
                except TechnicianProfile.DoesNotExist:
                    logger.warning(f"Técnico não encontrado: {technician_id}. Usando valores padrão.")
            
            # Ajustar baseado no cliente se fornecido
            client_id = serializer.validated_data.get('client_id')
            if client_id:
                try:
                    client = Client.objects.get(id=client_id)
                    # Calcular tempo médio histórico do cliente
                    completed_jobs = Job.objects.filter(
                        client=client,
                        status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.DELIVERED],
                        completion_date__isnull=False,
                        entry_date__isnull=False
                    )
                    
                    if completed_jobs.exists():
                        total_time = sum([
                            (job.completion_date - job.entry_date).days * 8 
                            for job in completed_jobs
                        ])
                        features['client_history_avg_time'] = total_time / completed_jobs.count()
                except Client.DoesNotExist:
                    logger.warning(f"Cliente não encontrado: {client_id}. Usando valor padrão para client_history_avg_time.")
            
            # Fazer predição
            try:
                predictor = JobTimePredictor()
                prediction = predictor.predict_time(features)
            except (ValueError, RuntimeError) as ml_error:
                logger.error(f"Erro específico de ML: {ml_error}")
                return Response({'error': 'Erro ao executar modelo preditivo'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            if prediction:
                response_data = TimeEstimationResponseSerializer(prediction).data
                response_data['factors'] = {
                    'prosthesis_type': features['prosthesis_type'],
                    'material': features['material'],
                    'complexity_level': features['complexity_level'],
                    'technician_skill': features['technician_skill_level'],
                    'client_history': features['client_history_avg_time']
                }
                return Response(response_data)
            else:
                logger.warning("Predição de tempo retornou None. Dados de entrada podem estar incompletos ou inconsistentes.")
                return Response(
                    {'error': 'Não foi possível calcular estimativa'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        except Exception as e:
            logger.error(f"Erro na estimativa de tempo: {e}", exc_info=True)
            return Response(
                {'error': 'Erro interno do servidor'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ScheduleOptimizationView(APIView):
    """View para otimização de cronograma"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Otimiza cronograma de produção"""
        serializer = ScheduleOptimizationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            start_time = time.time()
            
            # Obter trabalhos a otimizar
            job_ids = serializer.validated_data.get('job_ids')
            if job_ids:
                jobs = Job.objects.filter(id__in=job_ids)
            else:
                jobs = Job.objects.filter(
                    status__in=[Job.JobStatus.RECEIVED, Job.JobStatus.IN_PRODUCTION]
                )
            
            # Obter técnicos disponíveis
            technician_ids = serializer.validated_data.get('technician_ids')
            if technician_ids:
                technicians = TechnicianProfile.objects.filter(
                    id__in=technician_ids,
                    is_available=True
                )
            else:
                technicians = TechnicianProfile.objects.filter(is_available=True)
            
            # Executar otimização
            optimizer = ProductionOptimizer()
            result = optimizer.optimize_schedule(
                jobs=jobs,
                technicians=technicians,
                constraints=serializer.validated_data.get('constraints')
            )
            
            # Identificar gargalos
            bottleneck_result = optimizer.identify_bottlenecks()
            
            execution_time = time.time() - start_time
            
            response_data = {
                'success': result['success'],
                'message': result['message'],
                'optimization_time': round(execution_time, 2)
            }
            
            if result['success']:
                response_data['optimized_jobs'] = result['optimized_jobs']
                response_data['bottlenecks_identified'] = bottleneck_result.get('bottlenecks_found', 0)
            
            return Response(response_data)
        
        except Exception as e:
            logger.error(f"Erro na otimização: {e}")
            return Response(
                {'success': False, 'message': f'Erro: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BottleneckAnalysisView(APIView):
    """View para análise de gargalos"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Analisa gargalos no cronograma atual"""
        try:
            optimizer = ProductionOptimizer()
            result = optimizer.identify_bottlenecks()
            
            # Contar alertas críticos
            critical_alerts = BottleneckAlert.objects.filter(
                is_resolved=False,
                severity=BottleneckAlert.AlertSeverity.CRITICAL
            ).count()
            
            # Gerar recomendações gerais
            recommendations = self._generate_general_recommendations()
            
            response_data = {
                'success': result['success'],
                'message': result['message'],
                'bottlenecks_found': result.get('bottlenecks_found', 0),
                'critical_alerts': critical_alerts,
                'recommendations': recommendations
            }
            
            return Response(response_data)
        
        except Exception as e:
            logger.error(f"Erro na análise de gargalos: {e}")
            return Response(
                {'success': False, 'message': f'Erro: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_general_recommendations(self):
        """Gera recomendações gerais baseadas no estado atual"""
        recommendations = []
        
        # Verificar carga de trabalho geral
        pending_jobs = Job.objects.filter(
            status__in=[Job.JobStatus.RECEIVED, Job.JobStatus.IN_PRODUCTION]
        ).count()
        
        if pending_jobs > 20:
            recommendations.append("Alto volume de trabalhos pendentes - considere aumentar capacidade")
        
        # Verificar técnicos disponíveis
        available_technicians = TechnicianProfile.objects.filter(is_available=True).count()
        
        if available_technicians < 2:
            recommendations.append("Poucos técnicos disponíveis - risco de gargalo")
        
        # Verificar trabalhos próximos ao vencimento
        from datetime import timedelta
        urgent_jobs = Job.objects.filter(
            status__in=[Job.JobStatus.RECEIVED, Job.JobStatus.IN_PRODUCTION],
            due_date__lte=timezone.now().date() + timedelta(days=2)
        ).count()
        
        if urgent_jobs > 5:
            recommendations.append("Muitos trabalhos com prazo urgente - priorize execução")
        
        if not recommendations:
            recommendations.append("Cronograma em bom estado - continue monitorando")
        
        return recommendations


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def train_ml_model(request):
    """Endpoint para treinar modelo de ML"""
    try:
        retrain = request.data.get('retrain', False)
        
        predictor = JobTimePredictor()
        success = predictor.train(retrain=retrain)
        
        if success:
            return Response({
                'success': True,
                'message': 'Modelo treinado com sucesso'
            })
        else:
            return Response({
                'success': False,
                'message': 'Falha no treinamento do modelo'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    except Exception as e:
        logger.error(f"Erro no treinamento: {e}")
        return Response({
            'success': False,
            'message': f'Erro: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def resolve_bottleneck_alert(request, alert_id):
    """Marca alerta de gargalo como resolvido"""
    try:
        alert = BottleneckAlert.objects.get(id=alert_id)
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.save()
        
        return Response({
            'success': True,
            'message': 'Alerta marcado como resolvido'
        })
    
    except BottleneckAlert.DoesNotExist:
        return Response({
            'success': False,
            'message': 'Alerta não encontrado'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        logger.error(f"Erro ao resolver alerta: {e}")
        return Response({
            'success': False,
            'message': f'Erro: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_metrics(request):
    """Endpoint para métricas do dashboard"""
    try:
        # Trabalhos pendentes
        pending_jobs = Job.objects.filter(
            status__in=[Job.JobStatus.RECEIVED, Job.JobStatus.IN_PRODUCTION]
        ).count()
        
        # Técnicos disponíveis
        available_technicians = TechnicianProfile.objects.filter(is_available=True).count()
        
        # Alertas ativos
        active_alerts = BottleneckAlert.objects.filter(is_resolved=False).count()
        
        # Trabalhos com alto risco
        high_risk_jobs = ProductionSchedule.objects.filter(
            bottleneck_risk__gte=0.7,
            job__status__in=[Job.JobStatus.RECEIVED, Job.JobStatus.IN_PRODUCTION]
        ).count()
        
        # Eficiência média dos técnicos
        avg_efficiency = TechnicianProfile.objects.filter(
            is_available=True
        ).aggregate(avg_eff=Avg('efficiency_rating'))['avg_eff'] or 1.0
        
        # Tempo médio de produção (últimos 30 dias)
        from datetime import timedelta
        recent_jobs = Job.objects.filter(
            status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.DELIVERED],
            completion_date__gte=timezone.now().date() - timedelta(days=30),
            completion_date__isnull=False,
            entry_date__isnull=False
        )
        
        avg_production_time = 0
        if recent_jobs.exists():
            total_time = sum([
                (job.completion_date - job.entry_date).days 
                for job in recent_jobs
            ])
            avg_production_time = total_time / recent_jobs.count()
        
        return Response({
            'pending_jobs': pending_jobs,
            'available_technicians': available_technicians,
            'active_alerts': active_alerts,
            'high_risk_jobs': high_risk_jobs,
            'avg_efficiency': round(avg_efficiency, 2),
            'avg_production_time_days': round(avg_production_time, 1),
            'last_updated': timezone.now()
        })
    
    except Exception as e:
        logger.error(f"Erro nas métricas do dashboard: {e}")
        return Response({
            'error': 'Erro ao obter métricas'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

