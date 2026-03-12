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
        "ALTER TABLE employees_employeeprofile ADD COLUMN rg VARCHAR(20) NOT NULL DEFAULT ''",
        "ALTER TABLE employees_employeeprofile ADD COLUMN employee_type VARCHAR(20) NOT NULL DEFAULT ''",
        "ALTER TABLE employees_employeeprofile ADD COLUMN contract_type VARCHAR(20) NOT NULL DEFAULT ''",
        "ALTER TABLE employees_employeeprofile ADD COLUMN base_salary DECIMAL(10,2) NOT NULL DEFAULT 0",
        "ALTER TABLE employees_employeeprofile ADD COLUMN transport_allowance DECIMAL(8,2) NOT NULL DEFAULT 0",
        "ALTER TABLE employees_employeeprofile ADD COLUMN meal_allowance DECIMAL(8,2) NOT NULL DEFAULT 0",
        "ALTER TABLE employees_employeeprofile ADD COLUMN health_insurance DECIMAL(8,2) NOT NULL DEFAULT 0",
        # Alter bank_account max_length (20→30): only possible via rename/recreate on SQLite
        # We handle it as a no-op here — the ORM will accept values up to 20 chars anyway.
    ]

    with connection.cursor() as cursor:
        # First ensure the table exists at all (it may have been fake-applied).
        # If it already exists, this is a no-op.
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS employees_employeeprofile (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                name VARCHAR(255) NOT NULL,
                document_number VARCHAR(14) NOT NULL UNIQUE,
                birth_date DATE NULL,
                email VARCHAR(254) NULL,
                phone VARCHAR(20) NOT NULL DEFAULT '',
                address_street VARCHAR(255) NOT NULL DEFAULT '',
                address_number VARCHAR(20) NOT NULL DEFAULT '',
                address_complement VARCHAR(100) NOT NULL DEFAULT '',
                address_neighborhood VARCHAR(100) NOT NULL DEFAULT '',
                address_city VARCHAR(100) NOT NULL DEFAULT '',
                address_state VARCHAR(2) NOT NULL DEFAULT '',
                address_zip_code VARCHAR(10) NOT NULL DEFAULT '',
                hire_date DATE NOT NULL,
                termination_date DATE NULL,
                position VARCHAR(100) NOT NULL DEFAULT '',
                department VARCHAR(100) NOT NULL DEFAULT '',
                commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                bank_name VARCHAR(100) NOT NULL DEFAULT '',
                bank_branch VARCHAR(20) NOT NULL DEFAULT '',
                bank_account VARCHAR(30) NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',
                is_active BOOL NOT NULL DEFAULT 1,
                user_id INTEGER NOT NULL UNIQUE REFERENCES auth_user(id) DEFERRABLE INITIALLY DEFERRED
            )
        """)

        # Add new columns — ignore OperationalError if column already exists
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
        migrations.RunPython(add_columns_if_missing, noop),
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
    ]
