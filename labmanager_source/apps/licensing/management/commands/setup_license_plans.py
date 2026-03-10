# apps/licensing/management/commands/setup_license_plans.py
from django.core.management.base import BaseCommand
from apps.licensing.models import LicensePlan, License

class Command(BaseCommand):
    help = 'Cria os planos de licenciamento padrão'

    def handle(self, *args, **options):
        # Plano Gratuito
        free_plan, created = LicensePlan.objects.get_or_create(
            name='FREE',
            defaults={
                'display_name': 'Plano Gratuito',
                'description': 'Versão de experimentação com funcionalidades limitadas',
                'price_monthly': 0.00,
                'price_yearly': 0.00,
                'max_clients': 3,
                'max_jobs_per_month': 10,
                'max_price_tables': 1,
                'max_users': 1,
                'has_advanced_reports': False,
                'has_client_portal': False,
                'has_api_access': False,
                'has_priority_support': False,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('✅ Plano Gratuito criado'))
        else:
            self.stdout.write(self.style.WARNING('⚠️ Plano Gratuito já existe'))

        # Plano Básico
        basic_plan, created = LicensePlan.objects.get_or_create(
            name='BASIC',
            defaults={
                'display_name': 'Plano Básico',
                'description': 'Ideal para laboratórios pequenos e médios',
                'price_monthly': 49.90,
                'price_yearly': 499.00,
                'max_clients': 50,
                'max_jobs_per_month': 200,
                'max_price_tables': 5,
                'max_users': 2,
                'has_advanced_reports': True,
                'has_client_portal': False,
                'has_api_access': False,
                'has_priority_support': False,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('✅ Plano Básico criado'))
        else:
            self.stdout.write(self.style.WARNING('⚠️ Plano Básico já existe'))

        # Plano Premium
        premium_plan, created = LicensePlan.objects.get_or_create(
            name='PREMIUM',
            defaults={
                'display_name': 'Plano Premium',
                'description': 'Solução completa para laboratórios de grande porte',
                'price_monthly': 99.90,
                'price_yearly': 999.00,
                'max_clients': None,  # Ilimitado
                'max_jobs_per_month': None,  # Ilimitado
                'max_price_tables': None,  # Ilimitado
                'max_users': 5,
                'has_advanced_reports': True,
                'has_client_portal': True,
                'has_api_access': True,
                'has_priority_support': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('✅ Plano Premium criado'))
        else:
            self.stdout.write(self.style.WARNING('⚠️ Plano Premium já existe'))

        # Criar licença gratuita padrão se não existir
        if not License.objects.filter(status='ACTIVE').exists():
            license = License.objects.create(
                organization_name="Laboratório Demo",
                contact_email="demo@labmanager.com",
                plan=free_plan,
                status='ACTIVE'
            )
            self.stdout.write(self.style.SUCCESS('✅ Licença gratuita padrão criada'))
        else:
            self.stdout.write(self.style.WARNING('⚠️ Licença ativa já existe'))

        self.stdout.write(self.style.SUCCESS('\n🎉 Setup de licenciamento concluído!'))
        self.stdout.write(self.style.SUCCESS('📋 Planos disponíveis:'))
        for plan in LicensePlan.objects.all():
            self.stdout.write(f'   • {plan.display_name} - R$ {plan.price_monthly}/mês')

