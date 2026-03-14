from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ScanCaseViewSet

router = DefaultRouter()
router.register(r'scans', ScanCaseViewSet, basename='scan')

urlpatterns = [
    path('', include(router.urls)),
]
