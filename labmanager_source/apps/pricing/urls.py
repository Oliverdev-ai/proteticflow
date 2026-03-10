from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PriceTableViewSet, ServiceItemViewSet

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r"price-tables", PriceTableViewSet, basename="pricetable")
router.register(r"service-items", ServiceItemViewSet, basename="serviceitem")

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path("", include(router.urls)),
]

