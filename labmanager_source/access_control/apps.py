from django.apps import AppConfig


class AccessControlConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'access_control'
    verbose_name = 'Controle de Acesso'
    
    def ready(self):
        """Configurações executadas quando o app é carregado"""
        # Importar sinais se necessário
        from .access_manager import initialize_default_plans
        
        # Inicializar planos padrão (apenas em produção)
        try:
            initialize_default_plans()
        except Exception:
            # Ignorar erros durante migrações
            pass

