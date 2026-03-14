import logging
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import ScanCase
from .serializers import ScanCaseSerializer
from .xml_parser import parse_itero_xml
from apps.jobs.models import Job
from apps.clients.models import Client
from apps.employees.permissions import AnyRole, IsGerente

logger = logging.getLogger(__name__)


class ScanCaseViewSet(viewsets.ModelViewSet):
    queryset = ScanCase.objects.select_related('job', 'client').order_by('-created_at')
    serializer_class = ScanCaseSerializer
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ['scanner_brand', 'print_status', 'client', 'job']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AnyRole()]
        return [IsGerente()]

    @action(detail=False, methods=['post'], url_path='upload',
            parser_classes=[MultiPartParser, FormParser])
    def upload(self, request):
        """
        POST /api/v1/scans/upload/
        Campos multipart:
          - xml_file (obrigatório): arquivo XML do scanner
          - stl_upper (opcional): STL arcada superior
          - stl_lower (opcional): STL arcada inferior
          - gallery_image (opcional): foto panorâmica
          - scanner_brand (opcional, default: itero)
          - job_id (opcional): ID do Job existente para vincular
          - client_id (opcional): ID do Client para vincular
        """
        xml_file = request.FILES.get('xml_file')
        if not xml_file:
            return Response({'error': 'xml_file é obrigatório.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Parse do XML
        try:
            xml_content = xml_file.read().decode('utf-8')
            xml_file.seek(0)  # rewind para salvar no FileField
            parsed = parse_itero_xml(xml_content)
        except (ValueError, UnicodeDecodeError) as e:
            return Response({'error': f'Erro ao processar XML: {e}'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Verificar duplicata por order_id
        if ScanCase.objects.filter(order_id=parsed['order_id']).exists():
            return Response(
                {'error': f'Scan {parsed["order_id"]} já existe no sistema.',
                 'order_id': parsed['order_id']},
                status=status.HTTP_409_CONFLICT
            )

        # Resolução do Client (por client_id explícito ou por nome)
        client = None
        if request.data.get('client_id'):
            client = Client.objects.filter(pk=request.data['client_id']).first()
        if not client and parsed.get('doctor_name'):
            client = Client.objects.filter(
                name__icontains=parsed['doctor_name'].split(',')[-1].strip()
            ).first()

        # Resolução do Job
        job = None
        if request.data.get('job_id'):
            job = Job.objects.filter(pk=request.data['job_id']).first()

        scan = ScanCase.objects.create(
            order_id        = parsed['order_id'],
            order_code      = parsed.get('order_code', ''),
            scanner_brand   = request.data.get('scanner_brand', ScanCase.ScannerBrand.ITERO),
            doctor_name     = parsed.get('doctor_name', ''),
            doctor_license  = parsed.get('doctor_license', ''),
            patient_name    = parsed.get('patient_name', ''),
            procedure       = parsed.get('procedure', ''),
            scan_date       = parsed.get('scan_date'),
            due_date        = parsed.get('due_date'),
            ship_to_address = parsed.get('ship_to_address', ''),
            raw_metadata    = parsed.get('raw', {}),
            xml_file        = xml_file,
            stl_upper       = request.FILES.get('stl_upper'),
            stl_lower       = request.FILES.get('stl_lower'),
            gallery_image   = request.FILES.get('gallery_image'),
            job             = job,
            client          = client,
        )

        return Response(ScanCaseSerializer(scan).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='send-to-printer')
    def send_to_printer(self, request, pk=None):
        """
        POST /api/v1/scans/{id}/send-to-printer/
        Envia o STL para a impressora 3D configurada em LabSettings.
        """
        from apps.financial.models import LabSettings
        scan = self.get_object()

        if not scan.stl_upper and not scan.stl_lower:
            return Response({'error': 'Nenhum arquivo STL disponível para este scan.'},
                            status=status.HTTP_400_BAD_REQUEST)

        settings_obj = LabSettings.objects.first()
        printer_ip = (settings_obj.printer_ip if settings_obj else '') or \
                     request.data.get('printer_ip', '')

        if not printer_ip:
            return Response(
                {'error': 'IP da impressora não configurado. Acesse Configurações > Laboratório.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Dispara task Celery
        from .tasks import send_stl_to_printer
        stl_file = scan.stl_upper or scan.stl_lower
        send_stl_to_printer.delay(scan.id, stl_file.path, printer_ip)

        scan.print_status = ScanCase.PrintStatus.SENT
        scan.print_sent_at = timezone.now()
        scan.save(update_fields=['print_status', 'print_sent_at'])

        return Response({
            'success': True,
            'message': f'STL enviado para {printer_ip}.',
            'print_status': scan.print_status,
        })
