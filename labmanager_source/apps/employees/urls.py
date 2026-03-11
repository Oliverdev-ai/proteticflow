from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'employees', views.EmployeeViewSet, basename='employee')
router.register(r'skills', views.EmployeeSkillViewSet, basename='employeeskill')
router.register(r'assignments', views.JobAssignmentViewSet, basename='jobassignment')
router.register(r'commission-payments', views.CommissionPaymentViewSet, basename='commissionpayment')
router.register(r'commission-payment-items', views.CommissionPaymentItemViewSet, basename='commissionpaymentitem')

urlpatterns = [
    path('', include(router.urls)),
]
