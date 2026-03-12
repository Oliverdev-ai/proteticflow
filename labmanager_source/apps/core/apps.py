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
        from auditlog.registry import auditlog
        from accounts.models import CustomUser
        from apps.employees.models import EmployeeProfile
        from apps.jobs.models import Job, JobItem
        from apps.clients.models import Client
        from apps.financial.models import AccountsReceivable, AccountsPayable
        from apps.materials.models import Supplier, Material, StockMovement, PurchaseOrder

        # Registrar modelos críticos na Trilha de Auditoria (LGPD)
        auditlog.register(CustomUser)
        auditlog.register(EmployeeProfile)
        auditlog.register(Job)
        auditlog.register(JobItem)
        auditlog.register(Client)
        auditlog.register(AccountsReceivable)
        auditlog.register(AccountsPayable)
        auditlog.register(Supplier)
        auditlog.register(Material)
        auditlog.register(StockMovement)
        auditlog.register(PurchaseOrder)

