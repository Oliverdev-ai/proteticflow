from django.apps import AppConfig


class IntelligentSchedulingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'intelligent_scheduling'
    verbose_name = 'Agendamento Inteligente'
    
    def ready(self):
        """Configurações executadas quando o app é carregado"""
        # Importar sinais se necessário
        pass

