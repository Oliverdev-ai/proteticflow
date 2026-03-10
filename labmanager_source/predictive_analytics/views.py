import time
from django.utils import timezone
from django.db import models
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q, Count, Sum, Avg
from datetime import datetime, timedelta
from .models import (
    RevenuePredictor, TrendAnalysis, PerformanceMetric,
    SeasonalityPattern, PredictiveAlert, DashboardWidget
)
from .serializers import (
    RevenuePredictorSerializer, TrendAnalysisSerializer,
    PerformanceMetricSerializer, SeasonalityPatternSerializer,
    PredictiveAlertSerializer, DashboardWidgetSerializer,
    RevenuePredictionRequestSerializer, RevenuePredictionResponseSerializer,
    TrendAnalysisRequestSerializer, TrendAnalysisResponseSerializer,
    DashboardDataRequestSerializer, DashboardDataResponseSerializer,
    AlertAcknowledgeSerializer
)
from .analytics_engine import (
    RevenuePredictionEngine, TrendAnalysisEngine,
    SeasonalityAnalyzer, PredictiveAlertEngine
)
from apps.jobs.models import Job
import logging
from django.db import transaction, DatabaseError
from .tasks import async_predict_revenue
from celery.result import AsyncResult
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from core.utils.errors import error_response, log_and_response

logger = logging.getLogger(__name__)


class RevenuePredictorListView(generics.ListAPIView):
    """
    API endpoint para listar predições de receita.
    Usa select_related para otimizar queries e retorna resultados ordenados por data de criação.
    """
    serializer_class = RevenuePredictorSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = RevenuePredictor.objects.select_related('created_by').all().order_by('-created_at')
        
        # Filtros opcionais
        period_type = self.request.query_params.get('period_type')
        if period_type:
            queryset = queryset.filter(period_type=period_type)
        
        return queryset


class TrendAnalysisListView(generics.ListAPIView):
    """
    API endpoint para listar análises de tendência.
    Usa select_related para otimizar queries e retorna resultados ordenados por data de criação.
    """
    serializer_class = TrendAnalysisSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = TrendAnalysis.objects.select_related('created_by').all().order_by('-created_at')
        
        # Filtros opcionais
        trend_type = self.request.query_params.get('trend_type')
        if trend_type:
            queryset = queryset.filter(trend_type=trend_type)
        
        return queryset


class PerformanceMetricListView(generics.ListAPIView):
    """
    API endpoint para listar métricas de performance.
    Usa select_related para otimizar queries e retorna resultados ordenados por data.
    """
    serializer_class = PerformanceMetricSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = PerformanceMetric.objects.select_related('created_by').all().order_by('-date')
        
        # Filtros opcionais
        metric_type = self.request.query_params.get('metric_type')
        if metric_type:
            queryset = queryset.filter(metric_type=metric_type)
        
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        
        return queryset


class PredictiveAlertListView(generics.ListAPIView):
    """
    API endpoint para listar alertas preditivos.
    Usa select_related para otimizar queries e retorna resultados ordenados por severidade e data.
    """
    serializer_class = PredictiveAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = PredictiveAlert.objects.select_related('created_by').all().order_by('-severity', '-created_at')
        
        # Filtrar apenas alertas não reconhecidos por padrão
        if self.request.query_params.get('include_acknowledged') != 'true':
            queryset = queryset.filter(is_acknowledged=False)
        
        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)
        
        return queryset


class DashboardWidgetListView(generics.ListCreateAPIView):
    """
    API endpoint para listar e criar widgets do dashboard do usuário.
    Usa select_related para otimizar queries e retorna resultados ordenados por posição.
    """
    serializer_class = DashboardWidgetSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return DashboardWidget.objects.select_related('user').filter(user=self.request.user, is_visible=True).order_by('position_y', 'position_x')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DashboardWidgetDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View para operações detalhadas em widgets"""
    serializer_class = DashboardWidgetSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return DashboardWidget.objects.filter(user=self.request.user)


@method_decorator(cache_page(60*10), name='dispatch')
class RevenuePredictionView(APIView):
    """View para predição de receita"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Gera predição de receita"""
        serializer = RevenuePredictionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            months_ahead = serializer.validated_data['months_ahead']
            include_factors = serializer.validated_data['include_factors']
            
            # Executar predição
            engine = RevenuePredictionEngine()
            try:
                predictions = engine.predict_revenue(months_ahead)
            except (ValueError, RuntimeError) as ml_error:
                logger.error(f"Erro específico de ML: {ml_error}")
                return Response({'error': 'Erro ao executar modelo preditivo'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            if not predictions:
                logger.warning("Nenhuma predição retornada pelo modelo. Dados de entrada podem estar incompletos ou inconsistentes.")
                return Response(
                    {'error': 'Não foi possível gerar predições'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Calcular confiança média
            confidence_average = sum(p['confidence'] for p in predictions) / len(predictions)
            
            response_data = {
                'predictions': predictions,
                'confidence_average': confidence_average
            }
            
            # Incluir análise de tendências se solicitado
            if include_factors:
                try:
                    trend_engine = TrendAnalysisEngine()
                    trend_analysis = trend_engine.analyze_revenue_trend()
                    if trend_analysis:
                        response_data['trend_analysis'] = trend_analysis
                    seasonality_analyzer = SeasonalityAnalyzer()
                    seasonality_factors = seasonality_analyzer.identify_seasonal_patterns()
                    response_data['seasonality_factors'] = seasonality_factors
                except Exception as e:
                    logger.error(f"Erro ao calcular fatores adicionais: {e}")
            
            # Salvar predições no banco de forma atômica
            try:
                with transaction.atomic():
                    for prediction in predictions:
                        start_date = datetime(prediction['year'], prediction['month'], 1).date()
                        if prediction['month'] == 12:
                            end_date = datetime(prediction['year'] + 1, 1, 1).date() - timedelta(days=1)
                        else:
                            end_date = datetime(prediction['year'], prediction['month'] + 1, 1).date() - timedelta(days=1)
                        RevenuePredictor.objects.create(
                            period_type=RevenuePredictor.PredictionPeriod.MONTHLY,
                            start_date=start_date,
                            end_date=end_date,
                            predicted_revenue=prediction['predicted_revenue'],
                            confidence_score=prediction['confidence'],
                            created_by=request.user
                        )
            except DatabaseError as db_error:
                logger.error(f"Erro de banco ao salvar predições: {db_error}")
                return Response({'error': 'Erro ao salvar predições no banco'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response(response_data)
        
        except Exception as e:
            logger.error(f"Erro na predição de receita: {e}", exc_info=True)
            return Response(
                {'error': 'Erro interno do servidor'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(cache_page(60*10), name='dispatch')
class TrendAnalysisView(APIView):
    """View para análise de tendências"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Executa análise de tendências"""
        serializer = TrendAnalysisRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            trend_types = serializer.validated_data.get('trend_types', ['revenue', 'jobs_volume'])
            months_back = serializer.validated_data['months_back']
            
            engine = TrendAnalysisEngine()
            trends = []
            
            # Analisar cada tipo de tendência
            for trend_type in trend_types:
                if trend_type == 'revenue':
                    analysis = engine.analyze_revenue_trend(months_back)
                elif trend_type == 'jobs_volume':
                    analysis = engine.analyze_jobs_volume_trend(months_back)
                else:
                    continue
                
                if analysis:
                    # Salvar análise no banco
                    trend_obj = TrendAnalysis.objects.create(
                        trend_type=trend_type,
                        analysis_period_start=timezone.now().date() - timedelta(days=months_back * 30),
                        analysis_period_end=timezone.now().date(),
                        current_value=analysis['current_value'],
                        previous_value=analysis['previous_value'],
                        percentage_change=analysis['percentage_change'],
                        trend_strength=analysis['trend_strength'],
                        statistical_significance=0.05,  # Placeholder
                        insights=analysis['insights'],
                        recommendations=analysis['recommendations']
                    )
                    
                    trends.append(TrendAnalysisSerializer(trend_obj).data)
            
            # Gerar resumo
            summary = {
                'total_trends_analyzed': len(trends),
                'positive_trends': len([t for t in trends if t['percentage_change'] > 0]),
                'negative_trends': len([t for t in trends if t['percentage_change'] < 0]),
                'strong_trends': len([t for t in trends if t['trend_strength'] in ['strong', 'very_strong']])
            }
            
            return Response({
                'trends': trends,
                'summary': summary
            })
        
        except Exception as e:
            logger.error(f"Erro na análise de tendências: {e}")
            return Response(
                {'error': 'Erro interno do servidor'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(cache_page(60*5), name='dispatch')
class DashboardDataView(APIView):
    """View para dados do dashboard"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Retorna dados consolidados do dashboard"""
        try:
            date_range = request.query_params.get('date_range', 'last_30_days')
            
            # Calcular período
            end_date = timezone.now().date()
            if date_range == 'last_7_days':
                start_date = end_date - timedelta(days=7)
            elif date_range == 'last_90_days':
                start_date = end_date - timedelta(days=90)
            elif date_range == 'last_year':
                start_date = end_date - timedelta(days=365)
            else:  # last_30_days
                start_date = end_date - timedelta(days=30)
            
            # Métricas de receita
            revenue_metrics = self._get_revenue_metrics(start_date, end_date)
            
            # KPIs de performance
            performance_kpis = self._get_performance_kpis(start_date, end_date)
            
            # Resumos de tendências
            trend_summaries = self._get_trend_summaries()
            
            # Alertas ativos
            active_alerts = self._get_active_alerts()
            
            # Insights de sazonalidade
            seasonality_insights = self._get_seasonality_insights()
            
            return Response({
                'revenue_metrics': revenue_metrics,
                'performance_kpis': performance_kpis,
                'trend_summaries': trend_summaries,
                'active_alerts': active_alerts,
                'seasonality_insights': seasonality_insights,
                'last_updated': timezone.now()
            })
        
        except Exception as e:
            logger.error(f"Erro nos dados do dashboard: {e}")
            return Response(
                {'error': 'Erro ao obter dados do dashboard'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_revenue_metrics(self, start_date, end_date):
        """Obtém métricas de receita"""
        # Receita total do período
        total_revenue = Job.objects.filter(
            completion_date__range=[start_date, end_date],
            status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.DELIVERED]
        ).aggregate(total=Sum('total_price'))['total'] or 0
        
        # Receita média diária
        days = (end_date - start_date).days or 1
        avg_daily_revenue = float(total_revenue) / days
        
        # Comparação com período anterior
        prev_start = start_date - timedelta(days=days)
        prev_end = start_date - timedelta(days=1)
        
        prev_revenue = Job.objects.filter(
            completion_date__range=[prev_start, prev_end],
            status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.DELIVERED]
        ).aggregate(total=Sum('total_price'))['total'] or 0
        
        if prev_revenue > 0:
            revenue_growth = ((float(total_revenue) - float(prev_revenue)) / float(prev_revenue)) * 100
        else:
            revenue_growth = 0
        
        return {
            'total_revenue': float(total_revenue),
            'avg_daily_revenue': avg_daily_revenue,
            'revenue_growth': revenue_growth,
            'period_days': days
        }
    
    def _get_performance_kpis(self, start_date, end_date):
        """Obtém KPIs de performance"""
        # Trabalhos concluídos
        completed_jobs = Job.objects.filter(
            completion_date__range=[start_date, end_date],
            status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.DELIVERED]
        ).count()
        
        # Trabalhos pendentes
        pending_jobs = Job.objects.filter(
            status__in=[Job.JobStatus.RECEIVED, Job.JobStatus.IN_PRODUCTION]
        ).count()
        
        # Tempo médio de produção
        completed_with_dates = Job.objects.filter(
            completion_date__range=[start_date, end_date],
            status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.DELIVERED],
            entry_date__isnull=False,
            completion_date__isnull=False
        )
        
        if completed_with_dates.exists():
            total_days = sum([
                (job.completion_date - job.entry_date).days 
                for job in completed_with_dates
            ])
            avg_production_time = total_days / completed_with_dates.count()
        else:
            avg_production_time = 0
        
        # Taxa de entrega no prazo
        on_time_jobs = Job.objects.filter(
            completion_date__range=[start_date, end_date],
            status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.DELIVERED],
            completion_date__lte=models.F('due_date')
        ).count()
        
        on_time_rate = (on_time_jobs / max(completed_jobs, 1)) * 100
        
        return {
            'completed_jobs': completed_jobs,
            'pending_jobs': pending_jobs,
            'avg_production_time_days': avg_production_time,
            'on_time_delivery_rate': on_time_rate
        }
    
    def _get_trend_summaries(self):
        """Obtém resumos de tendências"""
        recent_trends = TrendAnalysis.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=7)
        ).order_by('-created_at')[:5]
        
        return TrendAnalysisSerializer(recent_trends, many=True).data
    
    def _get_active_alerts(self):
        """Obtém alertas ativos"""
        active_alerts = PredictiveAlert.objects.filter(
            is_acknowledged=False
        ).order_by('-severity', '-created_at')[:10]
        
        return PredictiveAlertSerializer(active_alerts, many=True).data
    
    def _get_seasonality_insights(self):
        """Obtém insights de sazonalidade"""
        active_patterns = SeasonalityPattern.objects.filter(
            is_active=True
        ).order_by('-confidence_level')[:5]
        
        return SeasonalityPatternSerializer(active_patterns, many=True).data


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def acknowledge_alerts(request):
    """Reconhece alertas preditivos"""
    serializer = AlertAcknowledgeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        alert_ids = serializer.validated_data['alert_ids']
        notes = serializer.validated_data.get('notes', '')
        
        # Atualizar alertas
        updated_count = PredictiveAlert.objects.filter(
            id__in=alert_ids,
            is_acknowledged=False
        ).update(
            is_acknowledged=True,
            acknowledged_by=request.user,
            acknowledged_at=timezone.now()
        )
        
        return Response({
            'success': True,
            'acknowledged_count': updated_count,
            'message': f'{updated_count} alertas reconhecidos'
        })
    
    except Exception as e:
        logger.error(f"Erro ao reconhecer alertas: {e}")
        return Response(
            {'success': False, 'message': f'Erro: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generate_predictive_alerts(request):
    """Gera alertas preditivos"""
    try:
        engine = PredictiveAlertEngine()
        alerts_data = engine.generate_alerts()
        
        created_count = 0
        for alert_data in alerts_data:
            # Verificar se alerta similar já existe
            existing = PredictiveAlert.objects.filter(
                alert_type=alert_data['alert_type'],
                is_acknowledged=False,
                created_at__gte=timezone.now() - timedelta(hours=24)
            ).exists()
            
            if not existing:
                PredictiveAlert.objects.create(**alert_data)
                created_count += 1
        
        return Response({
            'success': True,
            'alerts_generated': created_count,
            'message': f'{created_count} novos alertas gerados'
        })
    
    except Exception as e:
        logger.error(f"Erro ao gerar alertas: {e}")
        return Response(
            {'success': False, 'message': f'Erro: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def analytics_summary(request):
    """Retorna resumo das análises"""
    try:
        # Última predição de receita
        latest_prediction = RevenuePredictor.objects.filter(
            period_type=RevenuePredictor.PredictionPeriod.MONTHLY
        ).order_by('-created_at').first()
        
        # Tendências recentes
        recent_trends = TrendAnalysis.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=30)
        ).count()
        
        # Alertas ativos
        active_alerts = PredictiveAlert.objects.filter(
            is_acknowledged=False
        ).count()
        
        # Padrões sazonais identificados
        seasonal_patterns = SeasonalityPattern.objects.filter(
            is_active=True
        ).count()
        
        return Response({
            'latest_prediction': {
                'revenue': float(latest_prediction.predicted_revenue) if latest_prediction else 0,
                'confidence': latest_prediction.confidence_score if latest_prediction else 0,
                'period': latest_prediction.get_period_type_display() if latest_prediction else 'N/A'
            },
            'recent_trends_count': recent_trends,
            'active_alerts_count': active_alerts,
            'seasonal_patterns_count': seasonal_patterns,
            'last_updated': timezone.now()
        })
    
    except Exception as e:
        logger.error(f"Erro no resumo de análises: {e}")
        return Response(
            {'error': 'Erro ao obter resumo'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def async_revenue_prediction(request):
    """Dispara task Celery para predição de receita"""
    months_ahead = request.data.get('months_ahead', 3)
    task = async_predict_revenue.delay(months_ahead)
    return Response({'task_id': task.id})

@api_view(['GET'])
def async_revenue_prediction_result(request, task_id):
    """Consulta resultado da task Celery"""
    result = AsyncResult(task_id)
    if result.ready():
        return Response({'status': result.status, 'result': result.result})
    return Response({'status': result.status})

