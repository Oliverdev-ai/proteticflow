from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    JobViewSet, JobItemViewSet, JobStageViewSet, JobLogViewSet, JobPhotoViewSet
)

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r"jobs", JobViewSet, basename="job")
router.register(r"job-items", JobItemViewSet, basename="jobitem")
router.register(r"job-stages", JobStageViewSet, basename="jobstage")
router.register(r"job-logs", JobLogViewSet, basename="joblog")
router.register(r"job-photos", JobPhotoViewSet, basename="jobphoto")

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path("", include(router.urls)),
]

