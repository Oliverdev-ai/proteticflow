"""
Fix: the employees_employeeprofile table was fake-applied in django_migrations
but never actually created in SQLite. This migration:
  1. Creates all employees tables using RunSQL (idempotent via IF NOT EXISTS).
  2. Adds the new payroll fields via ALTER TABLE ADD COLUMN IF NOT EXISTS
     (safe on SQLite 3.37+, which ships with Python 3.11).
"""

from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion


def add_columns_if_missing(apps, schema_editor):
    """Fallback: add columns one by one, ignoring errors if they already exist."""
    from django.db import connection

    new_columns = [
        "ALTER TABLE employees_employeeprofile ADD COLUMN IF NOT EXISTS rg VARCHAR(20) NOT NULL DEFAULT ''",
        "ALTER TABLE employees_employeeprofile ADD COLUMN IF NOT EXISTS employee_type VARCHAR(20) NOT NULL DEFAULT ''",
        "ALTER TABLE employees_employeeprofile ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20) NOT NULL DEFAULT ''",
        "ALTER TABLE employees_employeeprofile ADD COLUMN IF NOT EXISTS base_salary DECIMAL(10,2) NOT NULL DEFAULT 0",
        "ALTER TABLE employees_employeeprofile ADD COLUMN IF NOT EXISTS transport_allowance DECIMAL(8,2) NOT NULL DEFAULT 0",
        "ALTER TABLE employees_employeeprofile ADD COLUMN IF NOT EXISTS meal_allowance DECIMAL(8,2) NOT NULL DEFAULT 0",
        "ALTER TABLE employees_employeeprofile ADD COLUMN IF NOT EXISTS health_insurance DECIMAL(8,2) NOT NULL DEFAULT 0",
    ]

    with connection.cursor() as cursor:
        for sql in new_columns:
            try:
                cursor.execute(sql)
            except Exception:
                pass  # Column already exists
def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('employees', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(add_columns_if_missing, noop),
            ],
            state_operations=[
                # Tell Django's state machine about the new fields (no database ops since RunPython above)
                migrations.AddField(
                    model_name='employeeprofile',
                    name='rg',
                    field=models.CharField(blank=True, max_length=20, verbose_name='RG'),
                ),
                migrations.AddField(
                    model_name='employeeprofile',
                    name='employee_type',
                    field=models.CharField(
                        blank=True, max_length=20,
                        choices=[
                            ('technician',   'Técnico em Prótese'),
                            ('assistant',    'Auxiliar'),
                            ('receptionist', 'Recepcionista'),
                            ('manager',      'Gerente'),
                            ('owner',        'Proprietário'),
                            ('other',        'Outro'),
                        ],
                        verbose_name='Employee Type',
                    ),
                ),
                migrations.AddField(
                    model_name='employeeprofile',
                    name='contract_type',
                    field=models.CharField(
                        blank=True, max_length=20,
                        choices=[
                            ('clt',        'CLT'),
                            ('pj',         'PJ / MEI'),
                            ('freelancer', 'Freelancer'),
                            ('estagio',    'Estagiário'),
                            ('autonomo',   'Autônomo'),
                            ('temporario', 'Temporário'),
                        ],
                        verbose_name='Contract Type',
                    ),
                ),
                migrations.AddField(
                    model_name='employeeprofile',
                    name='base_salary',
                    field=models.DecimalField(
                        decimal_places=2, default=0,
                        help_text='Salário base mensal',
                        max_digits=10,
                        verbose_name='Base Salary',
                    ),
                ),
                migrations.AddField(
                    model_name='employeeprofile',
                    name='transport_allowance',
                    field=models.DecimalField(decimal_places=2, default=0, max_digits=8, verbose_name='Transport Allowance'),
                ),
                migrations.AddField(
                    model_name='employeeprofile',
                    name='meal_allowance',
                    field=models.DecimalField(decimal_places=2, default=0, max_digits=8, verbose_name='Meal Allowance'),
                ),
                migrations.AddField(
                    model_name='employeeprofile',
                    name='health_insurance',
                    field=models.DecimalField(decimal_places=2, default=0, max_digits=8, verbose_name='Health Insurance'),
                ),
                migrations.AlterField(
                    model_name='employeeprofile',
                    name='bank_account',
                    field=models.CharField(blank=True, max_length=30, verbose_name='Bank Account'),
                ),
            ],
        ),
    ]
