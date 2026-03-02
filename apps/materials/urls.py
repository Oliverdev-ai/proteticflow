from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'suppliers', views.SupplierViewSet)
router.register(r'categories', views.MaterialCategoryViewSet)
router.register(r'materials', views.MaterialViewSet)
router.register(r'stock-movements', views.StockMovementViewSet)
router.register(r'purchase-orders', views.PurchaseOrderViewSet)
router.register(r'purchase-order-items', views.PurchaseOrderItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
