from django.urls import path
from . import views

app_name = 'automated_support'

urlpatterns = [
    # Conversas
    path('conversations/', views.ConversationListCreateView.as_view(), name='conversation-list'),
    path('conversations/<str:session_id>/', views.ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/<str:session_id>/messages/', views.add_message, name='add-message'),

    # Notificações
    path('notifications/', views.NotificationListCreateView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/send/', views.send_notification_now, name='notification-send'),
]
