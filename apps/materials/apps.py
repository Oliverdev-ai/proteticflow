from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class MaterialsConfig(AppConfig):
    """
    Configuration for the materials application.
    This app manages materials, suppliers, stock movements, and purchase orders.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.materials'
    verbose_name = _('Materials')
    
    def ready(self):
        """
        Perform initialization tasks when the app is ready.
        """
        pass

