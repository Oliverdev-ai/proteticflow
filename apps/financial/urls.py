from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import views_reports

router = DefaultRouter()
router.register(r'accounts-receivable', views.AccountsReceivableViewSet)
router.register(r'accounts-payable', views.AccountsPayableViewSet)
router.register(r'financial-closings', views.FinancialClosingViewSet)
router.register(r'delivery-schedules', views.DeliveryScheduleViewSet)
router.register(r'lab-settings', views.LabSettingsViewSet)
router.register(r'reports', views_reports.FinancialReportsViewSet, basename='reports')

urlpatterns = [
    path('', include(router.urls)),
]
