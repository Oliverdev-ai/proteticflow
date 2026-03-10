"""
URL configuration for labmanager project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path(\'\', views.home, name=\'home\')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path(\'\', Home.as_view(), name=\'home\')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path(\'blog/\', include(\'blog.urls\'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (TokenObtainPairView, TokenRefreshView,)

urlpatterns = [
    path("admin/", admin.site.urls),
    # Health check endpoints
    path("api/v1/", include("apps.core.urls")),
    # API v1 URLs
    path("api/v1/", include("accounts.urls")),
    path("api/v1/ai-assistant/", include("ai_assistant.urls")),
    path("api/v1/payroll/", include("payroll.urls")),
    path("api/v1/", include("apps.clients.urls")),
    path("api/v1/", include("apps.pricing.urls")),
    path("api/v1/", include("apps.jobs.urls")),
    path("api/v1/", include("apps.employees.urls")),
    path("api/v1/", include("apps.materials.urls")),
    path("api/v1/", include("apps.financial.urls")),
    path("api/v1/access/", include("access_control.urls")),
    path("api/v1/dashboard/", include("dashboard.urls")),
    path("", include("apps.licensing.urls")),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Add DRF's built-in auth URLs if needed later for browsable API login
    # path("api-auth/", include("rest_framework.urls"))
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

