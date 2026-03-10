from django.apps import AppConfig


class PredictiveAnalyticsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'predictive_analytics'
    verbose_name = 'Análise Preditiva'
    
    def ready(self):
        """Configurações executadas quando o app é carregado"""
        # Importar sinais se necessário
        pass

