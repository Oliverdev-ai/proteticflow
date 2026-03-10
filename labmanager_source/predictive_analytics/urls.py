from django.urls import path
from . import views

app_name = 'predictive_analytics'

urlpatterns = [
    # Predições de receita
    path('revenue-predictions/', views.RevenuePredictorListView.as_view(), name='revenue-predictions'),
    path('predict-revenue/', views.RevenuePredictionView.as_view(), name='predict-revenue'),
    
    # Análises de tendência
    path('trend-analysis/', views.TrendAnalysisListView.as_view(), name='trend-analysis'),
    path('analyze-trends/', views.TrendAnalysisView.as_view(), name='analyze-trends'),
    
    # Métricas de performance
    path('performance-metrics/', views.PerformanceMetricListView.as_view(), name='performance-metrics'),
    
    # Alertas preditivos
    path('predictive-alerts/', views.PredictiveAlertListView.as_view(), name='predictive-alerts'),
    path('acknowledge-alerts/', views.acknowledge_alerts, name='acknowledge-alerts'),
    path('generate-alerts/', views.generate_predictive_alerts, name='generate-alerts'),
    
    # Dashboard
    path('dashboard-widgets/', views.DashboardWidgetListView.as_view(), name='dashboard-widgets'),
    path('dashboard-widgets/<int:pk>/', views.DashboardWidgetDetailView.as_view(), name='dashboard-widget-detail'),
    path('dashboard-data/', views.DashboardDataView.as_view(), name='dashboard-data'),
    
    # Resumos e análises
    path('analytics-summary/', views.analytics_summary, name='analytics-summary'),
]

