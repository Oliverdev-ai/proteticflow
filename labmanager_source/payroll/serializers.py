from rest_framework import serializers
from .models import PayrollPeriod, PayrollEntry, FinancialReport
from apps.employees.serializers import EmployeeSerializer


class PayrollPeriodSerializer(serializers.ModelSerializer):
    entries_count = serializers.SerializerMethodField()

    class Meta:
        model = PayrollPeriod
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'closed_at', 'closed_by']

    def get_entries_count(self, obj):
        return obj.entries.count()


class PayrollEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    period_display = serializers.CharField(source='period.__str__', read_only=True)

    class Meta:
        model = PayrollEntry
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'gross_salary', 'total_deductions', 'net_salary']


class FinancialReportSerializer(serializers.ModelSerializer):
    generated_by_name = serializers.CharField(source='generated_by.username', read_only=True)

    class Meta:
        model = FinancialReport
        fields = '__all__'
        read_only_fields = ['created_at', 'generated_by']
