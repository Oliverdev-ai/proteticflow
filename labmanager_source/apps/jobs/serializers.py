from rest_framework import serializers
from .models import Job, JobItem, JobStage, JobLog, JobPhoto
from apps.clients.serializers import ClientSerializer # Assuming ClientSerializer exists
from apps.pricing.serializers import ServiceItemSerializer # Assuming ServiceItemSerializer exists

class JobStageSerializer(serializers.ModelSerializer):
    """Serializer for the JobStage model."""
    class Meta:
        model = JobStage
        fields = ["id", "name", "order", "description"]

class JobPhotoSerializer(serializers.ModelSerializer):
    """Serializer for the JobPhoto model."""
    uploaded_by_username = serializers.CharField(source="uploaded_by.username", read_only=True)

    class Meta:
        model = JobPhoto
        fields = ["id", "job", "stage", "image_file", "description", "uploaded_by", "uploaded_by_username", "uploaded_at"]
        read_only_fields = ("uploaded_by", "uploaded_by_username", "uploaded_at")

class JobLogSerializer(serializers.ModelSerializer):
    """Serializer for the JobLog model."""
    user_username = serializers.CharField(source="user.username", read_only=True, allow_null=True)
    stage_name = serializers.CharField(source="stage.name", read_only=True, allow_null=True)

    class Meta:
        model = JobLog
        fields = ["id", "job", "stage", "stage_name", "user", "user_username", "timestamp", "event_type", "details"]
        read_only_fields = ("timestamp", "user_username", "stage_name")

class JobItemSerializer(serializers.ModelSerializer):
    """Serializer for the JobItem model (linking Job and ServiceItem)."""
    # Optionally include nested ServiceItem details
    # service_item_details = ServiceItemSerializer(source=\"service_item\", read_only=True)
    service_item_name = serializers.CharField(source="service_item.name", read_only=True)

    class Meta:
        model = JobItem
        fields = ["id", "job", "service_item", "service_item_name", "quantity", "unit_price", "total_price"]
        read_only_fields = ("total_price", "service_item_name")
        # Ensure unit_price is copied from ServiceItem on creation if not provided
        extra_kwargs = {
            "unit_price": {"required": False} # Will be populated in view or model save
        }

class JobSerializer(serializers.ModelSerializer):
    """Basic serializer for the Job model (list view)."""
    client_name = serializers.CharField(source="client.name", read_only=True)
    current_stage_name = serializers.CharField(source="current_stage.name", read_only=True, allow_null=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Job
        fields = [
            "id", "order_number", "client", "client_name", "patient_name",
            "entry_date", "due_date", "status", "status_display", "current_stage",
            "current_stage_name", "prosthesis_type", "material", "color",
            "created_at", "updated_at"
            # Excludes detailed fields like items, logs, photos for list view
        ]
        read_only_fields = (
            "created_at", "updated_at", "client_name", "current_stage_name",
            "status_display", "entry_date"
        )

class JobDetailSerializer(JobSerializer):
    """Detailed serializer for the Job model (detail view)."""
    # Include related items using the JobItemSerializer
    job_items = JobItemSerializer(many=True, read_only=True)
    # Include logs and photos
    logs = JobLogSerializer(many=True, read_only=True)
    photos = JobPhotoSerializer(many=True, read_only=True)
    # Include full client details if needed
    # client = ClientSerializer(read_only=True)

    class Meta(JobSerializer.Meta):
        # Inherit fields from JobSerializer and add related fields
        fields = JobSerializer.Meta.fields + ["job_items", "logs", "photos", "instructions", "total_price", "completion_date", "delivery_date", "created_by"]
        read_only_fields = JobSerializer.Meta.read_only_fields + ("total_price", "created_by")

