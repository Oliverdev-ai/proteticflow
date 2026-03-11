from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class EmployeesConfig(AppConfig):
    """
    Configuration for the employees application.
    This app manages employee information, skills, job assignments, and commission payments.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.employees'
    verbose_name = _('Employees')
    
    def ready(self):
        import apps.employees.signals

