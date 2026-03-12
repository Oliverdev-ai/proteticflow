from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from apps.employees.permissions import AnyRole

@api_view(['GET'])
@permission_classes([AnyRole])
def summary(request):
    from apps.jobs.models import Job
    from apps.clients.models import Client
    return Response({
        'total_jobs': Job.objects.count(),
        'active_jobs': Job.objects.filter(status='in_progress').count(),
        'total_clients': Client.objects.count(),
    })
