from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import Job, JobItem, JobStage, JobLog, JobPhoto
from .serializers import (
    JobSerializer, JobDetailSerializer, JobItemSerializer,
    JobStageSerializer, JobLogSerializer, JobPhotoSerializer
)
from apps.pricing.models import ServiceItem # Needed for JobItem creation logic
from rest_framework.permissions import IsAuthenticated
from apps.employees.permissions import AnyRole
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

# Create your views here.

class JobStageViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for viewing Job Stages (usually managed via admin)."""
    queryset = JobStage.objects.all().order_by("order")
    serializer_class = JobStageSerializer
    permission_classes = [AnyRole]

class JobViewSet(viewsets.ModelViewSet):
    """API endpoint for Jobs."""
    queryset = Job.objects.select_related("client", "current_stage").prefetch_related("job_items__service_item", "logs__user", "photos").order_by("-entry_date")
    permission_classes = [AnyRole]
    filterset_fields = ["client", "status", "current_stage"]
    search_fields = ["order_number", "client__name", "patient_name"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return JobDetailSerializer
        return JobSerializer

    # Add custom logic if needed, e.g., calculating total_price on save
    # or creating JobLog entries automatically on status/stage changes.

    # Example: Custom action to change job status
    @action(detail=True, methods=["post"])
    def change_status(self, request, pk=None):
        job = self.get_object()
        new_status = request.data.get("status")
        if not new_status or new_status not in Job.JobStatus.values:
            return Response({"error": "Invalid status provided."}, status=status.HTTP_400_BAD_REQUEST)

        old_status = job.status
        if old_status != new_status:
            job.status = new_status
            # Add logic for completion/delivery dates if applicable
            job.save()
            # Create a log entry
            JobLog.objects.create(
                job=job,
                user=request.user if request.user.is_authenticated else None,
                event_type=JobLog.EventType.STATUS_CHANGE,
                details=f"Status changed from {old_status} to {new_status}"
            )
            return Response(self.get_serializer(job).data)
        return Response({"message": "Status is already set to the provided value."})

class JobItemViewSet(viewsets.ModelViewSet):
    """API endpoint for Job Items (items within a specific job)."""
    serializer_class = JobItemSerializer
    permission_classes = [AnyRole]
    queryset = JobItem.objects.select_related("job", "service_item").all()
    filterset_fields = ["job"] # Filter by job ID

    @transaction.atomic
    def perform_create(self, serializer):
        # Fetch the ServiceItem to get the current price
        service_item_id = serializer.validated_data["service_item"]
        service_item = ServiceItem.objects.get(pk=service_item_id.pk)
        # Save the JobItem with the price at the time of creation
        instance = serializer.save(unit_price=service_item.price)
        # Update the parent Job's total price (example logic)
        job = instance.job
        job.total_price = sum(item.total_price for item in job.job_items.all())
        job.save()

    @transaction.atomic
    def perform_update(self, serializer):
        instance = serializer.save()
        # Update the parent Job's total price (example logic)
        job = instance.job
        job.total_price = sum(item.total_price for item in job.job_items.all())
        job.save()

    @transaction.atomic
    def perform_destroy(self, instance):
        job = instance.job
        instance.delete()
        # Update the parent Job's total price (example logic)
        job.total_price = sum(item.total_price for item in job.job_items.all())
        job.save()

# ViewSets for Logs and Photos might be read-only or nested within JobViewSet
# depending on requirements. Here are basic examples:

class JobLogViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for viewing Job Logs."""
    serializer_class = JobLogSerializer
    permission_classes = [AnyRole]
    queryset = JobLog.objects.select_related("job", "user", "stage").order_by("-timestamp")
    filterset_fields = ["job", "user", "event_type"]

class JobPhotoViewSet(viewsets.ModelViewSet): # Allow creation/deletion
    """API endpoint for Job Photos."""
    serializer_class = JobPhotoSerializer
    permission_classes = [IsAuthenticated]
    queryset = JobPhoto.objects.select_related("job", "uploaded_by").order_by("-uploaded_at")
    filterset_fields = ["job"]

    def perform_create(self, serializer):
        # Set uploaded_by automatically if user is authenticated
        if self.request.user.is_authenticated:
            serializer.save(uploaded_by=self.request.user)
        else:
            serializer.save()

class JobPhotoUploadView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        try:
            # lógica de upload
            ...
        except ValidationError as e:
            return Response({'error': 'Erro de validação: ' + str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': 'Erro inesperado ao fazer upload de foto.', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
