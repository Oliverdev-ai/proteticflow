from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.jobs.models import Job
from apps.clients.models import Client


class ScanCase(models.Model):

    class ScannerBrand(models.TextChoices):
        ITERO    = 'itero',    _('iTero')
        MEDIT    = 'medit',    _('Medit')
        THREESHAPE = '3shape', _('3Shape')
        CARESTREAM = 'carestream', _('Carestream')
        OTHER    = 'other',    _('Outro')

    class PrintStatus(models.TextChoices):
        PENDING  = 'pending',  _('Aguardando')
        SENT     = 'sent',     _('Enviado')
        PRINTING = 'printing', _('Imprimindo')
        DONE     = 'done',     _('Concluído')
        ERROR    = 'error',    _('Erro')

    # Vínculos
    job    = models.ForeignKey(Job, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name='scans', verbose_name=_('Trabalho'))
    client = models.ForeignKey(Client, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name='scans', verbose_name=_('Cliente'))

    # Metadados do scan
    order_id        = models.CharField(_('Order ID'), max_length=50, unique=True)
    order_code      = models.CharField(_('Order Code'), max_length=50, blank=True)
    scanner_brand   = models.CharField(_('Scanner'), max_length=20,
                                       choices=ScannerBrand.choices, default=ScannerBrand.ITERO)
    doctor_name     = models.CharField(_('Dentista'), max_length=200)
    doctor_license  = models.CharField(_('CRO'), max_length=50, blank=True)
    patient_name    = models.CharField(_('Paciente'), max_length=200)
    procedure       = models.CharField(_('Procedimento'), max_length=200, blank=True)
    scan_date       = models.DateField(_('Data do Scan'), null=True, blank=True)
    due_date        = models.DateField(_('Prazo'), null=True, blank=True)
    ship_to_address = models.TextField(_('Endereço de Envio'), blank=True)
    notes           = models.TextField(_('Observações'), blank=True)

    # Arquivos
    xml_file      = models.FileField(_('Arquivo XML'),  upload_to='scans/xml/',     null=True, blank=True)
    stl_upper     = models.FileField(_('STL Superior'), upload_to='scans/stl/',     null=True, blank=True)
    stl_lower     = models.FileField(_('STL Inferior'), upload_to='scans/stl/',     null=True, blank=True)
    gallery_image = models.ImageField(_('Galeria'),     upload_to='scans/gallery/', null=True, blank=True)

    # Status de impressão
    print_status  = models.CharField(_('Status Impressão'), max_length=20,
                                     choices=PrintStatus.choices, default=PrintStatus.PENDING)
    print_sent_at = models.DateTimeField(_('Enviado para impressora em'), null=True, blank=True)

    # Metadata raw do XML
    raw_metadata = models.JSONField(_('Metadados'), default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Scan {self.order_id} — {self.patient_name}'

    class Meta:
        verbose_name = _('Scan 3D')
        verbose_name_plural = _('Scans 3D')
        ordering = ['-created_at']
