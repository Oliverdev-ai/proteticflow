from rest_framework import serializers
from .models import (
    EmployeeProfile as Employee,
    EmployeeSkill,
    JobAssignment,
    CommissionPayment,
    CommissionPaymentItem
)

from accounts.serializers import UserSerializer

class EmployeeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)

    class Meta:
        model = Employee
        fields = '__all__'

class EmployeeSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeSkill
        fields = '__all__'

class JobAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobAssignment
        fields = '__all__'

class CommissionPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommissionPayment
        fields = '__all__'

class CommissionPaymentItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommissionPaymentItem
        fields = '__all__'
