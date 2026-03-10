from django.urls import path
from . import views

app_name = 'intelligent_scheduling'

urlpatterns = [
    # Perfis de técnicos
    path('technicians/', views.TechnicianProfileListView.as_view(), name='technician-list'),
    path('technicians/<int:pk>/', views.TechnicianProfileDetailView.as_view(), name='technician-detail'),
    
    # Cronogramas de produção
    path('schedules/', views.ProductionScheduleListView.as_view(), name='schedule-list'),
    
    # Alertas de gargalos
    path('alerts/', views.BottleneckAlertListView.as_view(), name='alert-list'),
    path('alerts/<int:alert_id>/resolve/', views.resolve_bottleneck_alert, name='resolve-alert'),
    
    # Métricas dos modelos ML
    path('ml-metrics/', views.MLModelMetricsListView.as_view(), name='ml-metrics'),
    
    # Estimativa de tempo
    path('estimate-time/', views.TimeEstimationView.as_view(), name='estimate-time'),
    
    # Otimização de cronograma
    path('optimize-schedule/', views.ScheduleOptimizationView.as_view(), name='optimize-schedule'),
    
    # Análise de gargalos
    path('analyze-bottlenecks/', views.BottleneckAnalysisView.as_view(), name='analyze-bottlenecks'),
    
    # Treinamento do modelo ML
    path('train-model/', views.train_ml_model, name='train-model'),
    
    # Métricas do dashboard
    path('dashboard-metrics/', views.dashboard_metrics, name='dashboard-metrics'),
]

