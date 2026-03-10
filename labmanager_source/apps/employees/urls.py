from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'employees', views.EmployeeViewSet)
router.register(r'skills', views.EmployeeSkillViewSet)
router.register(r'assignments', views.JobAssignmentViewSet)
router.register(r'commission-payments', views.CommissionPaymentViewSet)
router.register(r'commission-payment-items', views.CommissionPaymentItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
