# Fallback para SQLite que não suporta "ADD COLUMN IF NOT EXISTS".
# Garante que as colunas de 0002 existam no banco de testes.

from django.db import migrations, connection

_COLUMNS = [
    "ALTER TABLE employees_employeeprofile ADD COLUMN rg VARCHAR(20) NOT NULL DEFAULT ''",
    "ALTER TABLE employees_employeeprofile ADD COLUMN employee_type VARCHAR(20) NOT NULL DEFAULT ''",
    "ALTER TABLE employees_employeeprofile ADD COLUMN contract_type VARCHAR(20) NOT NULL DEFAULT ''",
    "ALTER TABLE employees_employeeprofile ADD COLUMN base_salary DECIMAL(10,2) NOT NULL DEFAULT 0",
    "ALTER TABLE employees_employeeprofile ADD COLUMN transport_allowance DECIMAL(8,2) NOT NULL DEFAULT 0",
    "ALTER TABLE employees_employeeprofile ADD COLUMN meal_allowance DECIMAL(8,2) NOT NULL DEFAULT 0",
    "ALTER TABLE employees_employeeprofile ADD COLUMN health_insurance DECIMAL(8,2) NOT NULL DEFAULT 0",
]


def add_columns_if_missing(apps, schema_editor):
    with connection.cursor() as cursor:
        for sql in _COLUMNS:
            try:
                cursor.execute(sql)
            except Exception:
                pass  # Coluna já existe


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0002_payroll_fields'),
    ]

    operations = [
        migrations.RunPython(add_columns_if_missing, noop),
    ]
