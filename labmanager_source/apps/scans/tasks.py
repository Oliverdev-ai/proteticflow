import logging
import requests
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_stl_to_printer(self, scan_id: int, stl_path: str, printer_ip: str):
    """
    Envia arquivo STL para impressora 3D via HTTP.
    Suporta: Formlabs (PreForm Server), SprintRay, protocolo genérico multipart.
    """
    try:
        with open(stl_path, 'rb') as f:
            response = requests.post(
                f'http://{printer_ip}/api/print',
                files={'file': ('model.stl', f, 'application/octet-stream')},
                timeout=30,
            )
            response.raise_for_status()
            logger.info(f'STL enviado com sucesso para {printer_ip}. Scan ID: {scan_id}')
            return {'success': True, 'printer_response': response.status_code}

    except requests.exceptions.ConnectionError:
        logger.warning(f'Impressora {printer_ip} não acessível. Scan ID: {scan_id}')
        raise self.retry(countdown=60)
    except Exception as e:
        logger.error(f'Erro ao enviar STL para impressora: {e}. Scan ID: {scan_id}')
        from .models import ScanCase
        ScanCase.objects.filter(pk=scan_id).update(print_status='error')
        raise
