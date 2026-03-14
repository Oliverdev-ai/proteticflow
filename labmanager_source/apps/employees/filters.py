import django_filters
from .models import EmployeeProfile as Employee, JobAssignment, CommissionPayment

class EmployeeFilter(django_filters.FilterSet):
    class Meta:
        model = Employee
        fields = ['name', 'department', 'position', 'is_active', 'hire_date', 'document_number', 'employee_type']

class JobAssignmentFilter(django_filters.FilterSet):
    class Meta:
        model = JobAssignment
        fields = ['job', 'employee', 'is_completed']

class CommissionPaymentFilter(django_filters.FilterSet):
    class Meta:
        model = CommissionPayment
        fields = ['employee', 'payment_date', 'payment_method']
