"""
migrate_payroll_employees — now a no-op stub.

The payroll.Employee model has been deleted and merged into EmployeeProfile.
This command is preserved for reference but does nothing.
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = '[DEPRECATED] payroll.Employee has been merged into EmployeeProfile. This command is a no-op.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING(
            'payroll.Employee has been fully merged into apps.employees.EmployeeProfile. '
            'This migration command is no longer necessary.'
        ))
