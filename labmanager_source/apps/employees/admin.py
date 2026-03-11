from django.contrib import admin
from .models import EmployeeProfile, EmployeeSkill, JobAssignment, CommissionPayment, CommissionPaymentItem

@admin.register(EmployeeProfile)
class EmployeeProfileAdmin(admin.ModelAdmin):
    list_display = ('name', 'user_role', 'department', 'position', 'is_active', 'hire_date')
    search_fields = ('name', 'document_number', 'email', 'user__username')
    list_filter = ('is_active', 'department', 'position')
    
    def user_role(self, obj):
        return obj.user.get_role_display() if obj.user else '-'
    user_role.short_description = 'Papel (Role)'

@admin.register(EmployeeSkill)
class EmployeeSkillAdmin(admin.ModelAdmin):
    list_display = ('employee', 'skill_name', 'proficiency_level')
    search_fields = ('employee__name', 'skill_name')
    list_filter = ('proficiency_level',)

@admin.register(JobAssignment)
class JobAssignmentAdmin(admin.ModelAdmin):
    list_display = ('job', 'employee', 'task_description', 'is_completed', 'assigned_date')
    search_fields = ('job__order_number', 'employee__name', 'task_description')
    list_filter = ('is_completed', 'assigned_date')

class CommissionPaymentItemInline(admin.TabularInline):
    model = CommissionPaymentItem
    extra = 0

@admin.register(CommissionPayment)
class CommissionPaymentAdmin(admin.ModelAdmin):
    list_display = ('employee', 'payment_date', 'total_amount', 'payment_method')
    search_fields = ('employee__name', 'reference_number')
    list_filter = ('payment_date', 'payment_method')
    inlines = [CommissionPaymentItemInline]
