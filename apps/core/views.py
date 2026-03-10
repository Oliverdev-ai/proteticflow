from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import connection
import json

@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    """
    Endpoint de health check para verificar se a aplicação está funcionando
    """
    try:
        # Testa conexão com banco de dados
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    health_data = {
        "status": "healthy" if db_status == "healthy" else "unhealthy",
        "timestamp": "2024-01-27T20:00:00Z",
        "version": "1.2.0",
        "services": {
            "database": db_status,
            "api": "healthy"
        }
    }
    
    status_code = 200 if health_data["status"] == "healthy" else 503
    
    return JsonResponse(health_data, status=status_code)

@csrf_exempt
@require_http_methods(["GET"])
def api_status(request):
    """
    Endpoint para verificar status da API
    """
    return JsonResponse({
        "api_version": "v1",
        "status": "operational",
        "endpoints": {
            "clients": "/api/v1/clients/",
            "jobs": "/api/v1/jobs/",
            "materials": "/api/v1/materials/",
            "auth": "/api/token/"
        }
    })

