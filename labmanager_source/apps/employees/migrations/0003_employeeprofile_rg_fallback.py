# Fallback para SQLite que não suporta "ADD COLUMN IF NOT EXISTS".
# Garante que as colunas de 0002 existam no banco de testes.

from django.db import migrations, connection

def add_columns_if_missing(apps, schema_editor):
    pass


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('employees', '0002_payroll_fields'),
    ]

    operations = [
        migrations.RunPython(add_columns_if_missing, noop),
    ]
