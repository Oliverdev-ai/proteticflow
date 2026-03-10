from django.urls import path
from . import views

app_name = 'smart_orders'

urlpatterns = [
    # Histórico e templates
    path('order-history/', views.ClientOrderHistoryListView.as_view(), name='order-history'),
    path('templates/', views.SmartOrderTemplateListView.as_view(), name='templates'),
    
    # Sugestões
    path('material-suggestions/', views.MaterialSuggestionListView.as_view(), name='material-suggestions'),
    path('order-suggestions/', views.SmartOrderSuggestionListView.as_view(), name='order-suggestions'),
    
    # Padrões e métricas
    path('rework-patterns/', views.ReworkPatternListView.as_view(), name='rework-patterns'),
    path('metrics/', views.SmartOrderMetricsListView.as_view(), name='metrics'),
    
    # Funcionalidades principais
    path('auto-fill-suggestions/', views.AutoFillSuggestionsView.as_view(), name='auto-fill-suggestions'),
    path('price-prediction/', views.PricePredictionView.as_view(), name='price-prediction'),
    path('suggestion-feedback/', views.SuggestionFeedbackView.as_view(), name='suggestion-feedback'),
    
    # Análises
    path('analyze-client-patterns/', views.analyze_client_patterns, name='analyze-client-patterns'),
    path('train-price-model/', views.train_price_model, name='train-price-model'),
    path('analyze-rework-patterns/', views.analyze_rework_patterns, name='analyze-rework-patterns'),
    
    # Dashboard
    path('dashboard/', views.smart_orders_dashboard, name='dashboard'),
]

