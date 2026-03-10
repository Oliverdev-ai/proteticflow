# apps/licensing/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LicenseViewSet, LicensePlanViewSet

router = DefaultRouter()
router.register(r'licenses', LicenseViewSet)
router.register(r'plans', LicensePlanViewSet)

urlpatterns = [
    path('api/v1/licensing/', include(router.urls)),
]

