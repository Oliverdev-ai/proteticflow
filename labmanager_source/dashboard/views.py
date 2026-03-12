from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from apps.employees.permissions import IsGerente
from django.db.models import Sum

@api_view(['GET'])
@permission_classes([IsGerente])
def summary(request):
    from apps.jobs.models import Job
    from apps.clients.models import Client
    
    # Receita total (soma de todos os jobs concluídos ou entregues)
    revenue = Job.objects.filter(
        status__in=['COMP', 'DEL']
    ).aggregate(total=Sum('total_price'))['total'] or 0.0
    
    return Response({
        'jobs_total': Job.objects.count(),
        'active_jobs': Job.objects.filter(status='PROD').count(), # Usando status correto do modelo
        'clients_total': Client.objects.count(),
        'revenue': float(revenue)
    })
