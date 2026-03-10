from django.urls import path
from .views import (
    ChatSessionListView, ChatSessionDetailView, ChatMessageListView,
    ChatView, AICommandListView, CommandExecutionListView,
    available_commands, quick_command
)

app_name = 'ai_assistant'

urlpatterns = [
    # Chat principal
    path('chat/', ChatView.as_view(), name='chat'),
    path('quick-command/', quick_command, name='quick-command'),
    path('available-commands/', available_commands, name='available-commands'),
    
    # Sessões de chat
    path('sessions/', ChatSessionListView.as_view(), name='session-list'),
    path('sessions/<int:pk>/', ChatSessionDetailView.as_view(), name='session-detail'),
    path('sessions/<str:session_id>/messages/', ChatMessageListView.as_view(), name='session-messages'),
    
    # Comandos e execuções
    path('commands/', AICommandListView.as_view(), name='command-list'),
    path('executions/', CommandExecutionListView.as_view(), name='execution-list'),
]

