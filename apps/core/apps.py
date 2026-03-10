from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class CoreConfig(AppConfig):
    """
    Configuration for the core application.
    This app provides base models and utilities used across the project.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'
    verbose_name = _('Core')
    
    def ready(self):
        """
        Perform initialization tasks when the app is ready.
        """
        pass

