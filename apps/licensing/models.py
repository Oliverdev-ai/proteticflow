# apps/licensing/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import uuid
import hashlib

class LicensePlan(models.Model):
    """Planos de licenciamento disponíveis"""
    PLAN_CHOICES = [
        ('FREE', 'Gratuito'),
        ('BASIC', 'Básico'),
        ('PREMIUM', 'Premium'),
    ]
    
    name = models.CharField(max_length=50, choices=PLAN_CHOICES, unique=True)
    display_name = models.CharField(max_length=100)
    description = models.TextField()
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Limites do plano
    max_clients = models.IntegerField(null=True, blank=True, help_text="NULL = ilimitado")
    max_jobs_per_month = models.IntegerField(null=True, blank=True, help_text="NULL = ilimitado")
    max_price_tables = models.IntegerField(null=True, blank=True, help_text="NULL = ilimitado")
    max_users = models.IntegerField(default=1)
    
    # Funcionalidades
    has_advanced_reports = models.BooleanField(default=False)
    has_client_portal = models.BooleanField(default=False)
    has_api_access = models.BooleanField(default=False)
    has_priority_support = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.display_name
    
    class Meta:
        ordering = ['price_monthly']

class License(models.Model):
    """Licença de uso do sistema"""
    STATUS_CHOICES = [
        ('ACTIVE', 'Ativa'),
        ('EXPIRED', 'Expirada'),
        ('SUSPENDED', 'Suspensa'),
        ('CANCELLED', 'Cancelada'),
    ]
    
    license_key = models.CharField(max_length=64, unique=True, editable=False)
    organization_name = models.CharField(max_length=200)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20, blank=True)
    
    plan = models.ForeignKey(LicensePlan, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    
    # Datas
    created_at = models.DateTimeField(auto_now_add=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    last_check = models.DateTimeField(null=True, blank=True)
    
    # Controle de uso
    current_clients_count = models.IntegerField(default=0)
    current_jobs_this_month = models.IntegerField(default=0)
    current_price_tables_count = models.IntegerField(default=0)
    current_users_count = models.IntegerField(default=1)
    
    # Informações do sistema
    installation_id = models.CharField(max_length=64, blank=True)
    last_ip = models.GenericIPAddressField(null=True, blank=True)
    system_info = models.JSONField(default=dict, blank=True)
    
    def save(self, *args, **kwargs):
        if not self.license_key:
            self.license_key = self.generate_license_key()
        super().save(*args, **kwargs)
    
    def generate_license_key(self):
        """Gera uma chave de licença única"""
        unique_string = f"{self.organization_name}{timezone.now().isoformat()}{uuid.uuid4()}"
        return hashlib.sha256(unique_string.encode()).hexdigest()
    
    def is_valid(self):
        """Verifica se a licença está válida"""
        if self.status != 'ACTIVE':
            return False
        
        if self.expires_at and self.expires_at < timezone.now():
            self.status = 'EXPIRED'
            self.save()
            return False
        
        return True
    
    def check_client_limit(self):
        """Verifica se pode adicionar mais clientes"""
        if self.plan.max_clients is None:
            return True
        return self.current_clients_count < self.plan.max_clients
    
    def check_job_limit(self):
        """Verifica se pode adicionar mais trabalhos este mês"""
        if self.plan.max_jobs_per_month is None:
            return True
        return self.current_jobs_this_month < self.plan.max_jobs_per_month
    
    def check_price_table_limit(self):
        """Verifica se pode adicionar mais tabelas de preços"""
        if self.plan.max_price_tables is None:
            return True
        return self.current_price_tables_count < self.plan.max_price_tables
    
    def update_usage_counts(self):
        """Atualiza contadores de uso"""
        from apps.clients.models import Client
        from apps.jobs.models import Job
        from apps.pricing.models import PriceTable
        from django.contrib.auth.models import User
        
        # Atualizar contadores
        self.current_clients_count = Client.objects.filter(is_active=True).count()
        self.current_price_tables_count = PriceTable.objects.count()
        self.current_users_count = User.objects.filter(is_active=True).count()
        
        # Trabalhos do mês atual
        now = timezone.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        self.current_jobs_this_month = Job.objects.filter(
            created_at__gte=start_of_month
        ).count()
        
        self.last_check = timezone.now()
        self.save()
    
    def get_limits_status(self):
        """Retorna status dos limites"""
        return {
            'clients': {
                'current': self.current_clients_count,
                'limit': self.plan.max_clients,
                'can_add': self.check_client_limit(),
                'percentage': (self.current_clients_count / self.plan.max_clients * 100) if self.plan.max_clients else 0
            },
            'jobs': {
                'current': self.current_jobs_this_month,
                'limit': self.plan.max_jobs_per_month,
                'can_add': self.check_job_limit(),
                'percentage': (self.current_jobs_this_month / self.plan.max_jobs_per_month * 100) if self.plan.max_jobs_per_month else 0
            },
            'price_tables': {
                'current': self.current_price_tables_count,
                'limit': self.plan.max_price_tables,
                'can_add': self.check_price_table_limit(),
                'percentage': (self.current_price_tables_count / self.plan.max_price_tables * 100) if self.plan.max_price_tables else 0
            }
        }
    
    def __str__(self):
        return f"{self.organization_name} - {self.plan.display_name}"
    
    class Meta:
        ordering = ['-created_at']

class LicenseCheck(models.Model):
    """Log de verificações de licença"""
    license = models.ForeignKey(License, on_delete=models.CASCADE, related_name='checks')
    check_time = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    is_valid = models.BooleanField()
    error_message = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-check_time']

