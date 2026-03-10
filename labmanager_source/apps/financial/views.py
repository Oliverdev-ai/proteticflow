from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from rest_framework.permissions import IsAuthenticated
from core.utils.errors import error_response, log_and_response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from .models import AccountsReceivable, AccountsPayable, FinancialClosing, DeliverySchedule, LabSettings
from .serializers import (
    AccountsReceivableSerializer, 
    AccountsPayableSerializer,
    FinancialClosingSerializer,
    DeliveryScheduleSerializer,
    LabSettingsSerializer
)

class AccountsReceivableViewSet(viewsets.ModelViewSet):
    queryset = AccountsReceivable.objects.all()
    serializer_class = AccountsReceivableSerializer
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary of accounts receivable."""
        total_pending = self.queryset.filter(status='pending').aggregate(
            total=Sum('adjusted_amount')
        )['total'] or Decimal('0.00')
        
        total_paid = self.queryset.filter(status='paid').aggregate(
            total=Sum('adjusted_amount')
        )['total'] or Decimal('0.00')
        
        overdue_count = self.queryset.filter(
            status='pending',
            due_date__lt=timezone.now().date()
        ).count()
        
        return Response({
            'total_pending': total_pending,
            'total_paid': total_paid,
            'overdue_count': overdue_count,
            'total_count': self.queryset.count()
        })
    
    @action(detail=False, methods=['get'])
    def by_client(self, request):
        """Get accounts receivable grouped by client."""
        client_id = request.query_params.get('client_id')
        queryset = self.queryset
        
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        
        # Group by client and calculate totals
        from django.db.models import Q
        clients_data = []
        
        for receivable in queryset.select_related('client'):
            client_name = receivable.client.name
            # Find existing client in list or create new entry
            client_entry = next((c for c in clients_data if c['client_name'] == client_name), None)
            if not client_entry:
                client_entry = {
                    'client_id': receivable.client.id,
                    'client_name': client_name,
                    'total_pending': Decimal('0.00'),
                    'total_paid': Decimal('0.00'),
                    'count': 0
                }
                clients_data.append(client_entry)
            
            if receivable.status == 'pending':
                client_entry['total_pending'] += receivable.adjusted_amount
            elif receivable.status == 'paid':
                client_entry['total_paid'] += receivable.adjusted_amount
            client_entry['count'] += 1
        
        return Response(clients_data)

class AccountsPayableViewSet(viewsets.ModelViewSet):
    queryset = AccountsPayable.objects.all()
    serializer_class = AccountsPayableSerializer
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary of accounts payable."""
        total_pending = self.queryset.filter(status='pending').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        total_paid = self.queryset.filter(status='paid').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        overdue_count = self.queryset.filter(
            status='pending',
            due_date__lt=timezone.now().date()
        ).count()
        
        return Response({
            'total_pending': total_pending,
            'total_paid': total_paid,
            'overdue_count': overdue_count,
            'total_count': self.queryset.count()
        })

class FinancialClosingViewSet(viewsets.ModelViewSet):
    queryset = FinancialClosing.objects.all()
    serializer_class = FinancialClosingSerializer
    
    @action(detail=False, methods=['post'])
    def generate_monthly(self, request):
        """Generate monthly financial closing."""
        year = request.data.get('year', timezone.now().year)
        month = request.data.get('month', timezone.now().month)
        
        # Calculate period dates
        period_start = datetime(year, month, 1).date()
        if month == 12:
            period_end = datetime(year + 1, 1, 1).date() - timedelta(days=1)
        else:
            period_end = datetime(year, month + 1, 1).date() - timedelta(days=1)
        
        # Calculate totals
        receivables = AccountsReceivable.objects.filter(
            created_at__date__range=[period_start, period_end],
            status='paid'
        )
        
        total_revenue = receivables.aggregate(total=Sum('adjusted_amount'))['total'] or Decimal('0.00')
        total_jobs = receivables.count()
        total_clients = receivables.values('client').distinct().count()
        
        # Create breakdown data
        breakdown_data = {
            'by_client': {},
            'by_status': {},
            'daily_revenue': {}
        }
        
        # Group by client
        for receivable in receivables.select_related('client'):
            client_name = receivable.client.name
            if client_name not in breakdown_data['by_client']:
                breakdown_data['by_client'][client_name] = {
                    'revenue': 0,
                    'jobs': 0
                }
            breakdown_data['by_client'][client_name]['revenue'] += float(receivable.adjusted_amount)
            breakdown_data['by_client'][client_name]['jobs'] += 1
        
        # Create closing record
        closing = FinancialClosing.objects.create(
            closing_type='monthly',
            period_start=period_start,
            period_end=period_end,
            total_revenue=total_revenue,
            total_jobs=total_jobs,
            total_clients=total_clients,
            breakdown_data=breakdown_data,
            created_by=request.user if request.user.is_authenticated else None
        )
        
        serializer = self.get_serializer(closing)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DeliveryScheduleViewSet(viewsets.ModelViewSet):
    queryset = DeliverySchedule.objects.all()
    serializer_class = DeliveryScheduleSerializer
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's delivery schedule."""
        today = timezone.now().date()
        schedules = self.queryset.filter(date=today)
        serializer = self.get_serializer(schedules, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def week(self, request):
        """Get this week's delivery schedule."""
        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        
        schedules = self.queryset.filter(date__range=[week_start, week_end])
        serializer = self.get_serializer(schedules, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def print_route(self, request, pk=None):
        """Generate printable delivery route."""
        schedule = self.get_object()
        
        # This would generate a PDF or formatted document
        # For now, return the data that would be used for printing
        jobs_data = []
        for job in schedule.jobs.all().select_related('client'):
            jobs_data.append({
                'order_number': job.order_number,
                'client_name': job.client.name,
                'client_address': f"{job.client.address_street}, {job.client.address_number}",
                'client_phone': job.client.phone_primary,
                'patient_name': job.patient_name,
                'description': job.description
            })
        
        return Response({
            'schedule_id': schedule.id,
            'date': schedule.date,
            'route_name': schedule.route_name,
            'driver_name': schedule.driver_name,
            'vehicle_info': schedule.vehicle_info,
            'jobs': jobs_data,
            'total_jobs': len(jobs_data)
        })


class LabSettingsViewSet(viewsets.ModelViewSet):
    queryset = LabSettings.objects.all()
    serializer_class = LabSettingsSerializer
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current lab settings (there should only be one)."""
        settings = self.queryset.first()
        if not settings:
            # Create default settings if none exist
            settings = LabSettings.objects.create(
                lab_name="Meu Laboratório",
                primary_color="#2563eb",
                secondary_color="#64748b"
            )
        
        serializer = self.get_serializer(settings)
        return Response(serializer.data)


class LogoUploadView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        try:
            # lógica de upload
            ...
        except ValidationError as e:
            return error_response('Erro de validação: ' + str(e))
        except Exception as e:
            return log_and_response('Erro inesperado ao fazer upload de logo.', exc=e)

