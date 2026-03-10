from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg, F, Q, Case, When, Value, IntegerField, DecimalField
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import json
from django.http import HttpResponse
from django.template.loader import render_to_string
try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError):
    WEASYPRINT_AVAILABLE = False
from django.core.mail import EmailMessage

from .models import AccountsReceivable, AccountsPayable, FinancialClosing, DeliverySchedule, LabSettings
from .serializers import (
    AccountsReceivableSerializer, 
    AccountsPayableSerializer,
    FinancialClosingSerializer
)
from apps.clients.models import Client
from apps.materials.models import Supplier

class FinancialReportsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def receivables(self, request):
        """Get accounts receivable report."""
        # Get date range from request
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        report_type = request.query_params.get('type', 'detailed')
        
        if not start_date or not end_date:
            return Response(
                {"error": "start_date and end_date are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get receivables in date range
        receivables = AccountsReceivable.objects.filter(
            due_date__range=[start_date, end_date]
        ).select_related('client', 'job')
        
        # Calculate summary data
        total_receivables = receivables.aggregate(
            total=Sum('adjusted_amount')
        )['total'] or Decimal('0.00')
        
        overdue_receivables = receivables.filter(
            status='pending',
            due_date__lt=timezone.now().date()
        ).aggregate(
            total=Sum('adjusted_amount')
        )['total'] or Decimal('0.00')
        
        # Process data based on report type
        if report_type == 'summary':
            # Summary report
            data = {
                'total_amount': total_receivables,
                'paid_amount': receivables.filter(status='paid').aggregate(
                    total=Sum('adjusted_amount')
                )['total'] or Decimal('0.00'),
                'pending_amount': receivables.filter(status='pending').aggregate(
                    total=Sum('adjusted_amount')
                )['total'] or Decimal('0.00'),
                'overdue_amount': overdue_receivables,
                'total_count': receivables.count(),
                'paid_count': receivables.filter(status='paid').count(),
                'pending_count': receivables.filter(status='pending').count(),
                'overdue_count': receivables.filter(
                    status='pending',
                    due_date__lt=timezone.now().date()
                ).count()
            }
        elif report_type == 'by_client':
            # Group by client
            clients_data = []
            client_totals = {}
            
            for receivable in receivables:
                client_id = receivable.client.id
                if client_id not in client_totals:
                    client_totals[client_id] = {
                        'client_id': client_id,
                        'client_name': receivable.client.name,
                        'total_amount': Decimal('0.00'),
                        'paid_amount': Decimal('0.00'),
                        'pending_amount': Decimal('0.00'),
                        'overdue_amount': Decimal('0.00'),
                        'count': 0
                    }
                
                client_totals[client_id]['total_amount'] += receivable.adjusted_amount
                client_totals[client_id]['count'] += 1
                
                if receivable.status == 'paid':
                    client_totals[client_id]['paid_amount'] += receivable.adjusted_amount
                else:
                    client_totals[client_id]['pending_amount'] += receivable.adjusted_amount
                    if receivable.due_date < timezone.now().date():
                        client_totals[client_id]['overdue_amount'] += receivable.adjusted_amount
            
            data = list(client_totals.values())
        elif report_type == 'by_date':
            # Group by due date
            date_totals = {}
            current_date = start_date
            
            # Initialize all dates in range
            while current_date <= end_date:
                date_str = current_date.strftime('%Y-%m-%d')
                date_totals[date_str] = {
                    'date': date_str,
                    'total_amount': Decimal('0.00'),
                    'paid_amount': Decimal('0.00'),
                    'pending_amount': Decimal('0.00'),
                    'count': 0
                }
                current_date += timedelta(days=1)
            
            # Fill with actual data
            for receivable in receivables:
                date_str = receivable.due_date.strftime('%Y-%m-%d')
                if date_str in date_totals:
                    date_totals[date_str]['total_amount'] += receivable.adjusted_amount
                    date_totals[date_str]['count'] += 1
                    
                    if receivable.status == 'paid':
                        date_totals[date_str]['paid_amount'] += receivable.adjusted_amount
                    else:
                        date_totals[date_str]['pending_amount'] += receivable.adjusted_amount
            
            data = list(date_totals.values())
        else:
            # Detailed report (default)
            items = []
            for receivable in receivables:
                items.append({
                    'id': receivable.id,
                    'client_id': receivable.client.id,
                    'client_name': receivable.client.name,
                    'job_id': receivable.job.id if receivable.job else None,
                    'job_order_number': receivable.job.order_number if receivable.job else None,
                    'description': receivable.description,
                    'amount': float(receivable.amount),
                    'adjusted_amount': float(receivable.adjusted_amount),
                    'issue_date': receivable.issue_date,
                    'due_date': receivable.due_date,
                    'payment_date': receivable.payment_date,
                    'status': receivable.status,
                    'is_paid': receivable.status == 'paid',
                    'is_overdue': receivable.status == 'pending' and receivable.due_date < timezone.now().date()
                })
            
            data = {
                'items': items,
                'summary': {
                    'totalReceivables': float(total_receivables),
                    'overdueReceivables': float(overdue_receivables),
                    'totalPaid': float(receivables.filter(status='paid').aggregate(
                        total=Sum('adjusted_amount')
                    )['total'] or Decimal('0.00')),
                    'totalPending': float(receivables.filter(status='pending').aggregate(
                        total=Sum('adjusted_amount')
                    )['total'] or Decimal('0.00'))
                }
            }
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def payables(self, request):
        """Get accounts payable report."""
        # Get date range from request
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        report_type = request.query_params.get('type', 'detailed')
        
        if not start_date or not end_date:
            return Response(
                {"error": "start_date and end_date are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get payables in date range
        payables = AccountsPayable.objects.filter(
            due_date__range=[start_date, end_date]
        ).select_related('supplier')
        
        # Calculate summary data
        total_payables = payables.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        overdue_payables = payables.filter(
            status='pending',
            due_date__lt=timezone.now().date()
        ).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        # Process data based on report type
        if report_type == 'summary':
            # Summary report
            data = {
                'total_amount': total_payables,
                'paid_amount': payables.filter(status='paid').aggregate(
                    total=Sum('amount')
                )['total'] or Decimal('0.00'),
                'pending_amount': payables.filter(status='pending').aggregate(
                    total=Sum('amount')
                )['total'] or Decimal('0.00'),
                'overdue_amount': overdue_payables,
                'total_count': payables.count(),
                'paid_count': payables.filter(status='paid').count(),
                'pending_count': payables.filter(status='pending').count(),
                'overdue_count': payables.filter(
                    status='pending',
                    due_date__lt=timezone.now().date()
                ).count()
            }
        elif report_type == 'by_supplier':
            # Group by supplier
            supplier_totals = {}
            
            for payable in payables:
                supplier_id = payable.supplier.id if payable.supplier else 0
                supplier_name = payable.supplier.name if payable.supplier else "Sem Fornecedor"
                
                if supplier_id not in supplier_totals:
                    supplier_totals[supplier_id] = {
                        'supplier_id': supplier_id,
                        'supplier_name': supplier_name,
                        'total_amount': Decimal('0.00'),
                        'paid_amount': Decimal('0.00'),
                        'pending_amount': Decimal('0.00'),
                        'overdue_amount': Decimal('0.00'),
                        'count': 0
                    }
                
                supplier_totals[supplier_id]['total_amount'] += payable.amount
                supplier_totals[supplier_id]['count'] += 1
                
                if payable.status == 'paid':
                    supplier_totals[supplier_id]['paid_amount'] += payable.amount
                else:
                    supplier_totals[supplier_id]['pending_amount'] += payable.amount
                    if payable.due_date < timezone.now().date():
                        supplier_totals[supplier_id]['overdue_amount'] += payable.amount
            
            data = list(supplier_totals.values())
        elif report_type == 'by_date':
            # Group by due date
            date_totals = {}
            current_date = start_date
            
            # Initialize all dates in range
            while current_date <= end_date:
                date_str = current_date.strftime('%Y-%m-%d')
                date_totals[date_str] = {
                    'date': date_str,
                    'total_amount': Decimal('0.00'),
                    'paid_amount': Decimal('0.00'),
                    'pending_amount': Decimal('0.00'),
                    'count': 0
                }
                current_date += timedelta(days=1)
            
            # Fill with actual data
            for payable in payables:
                date_str = payable.due_date.strftime('%Y-%m-%d')
                if date_str in date_totals:
                    date_totals[date_str]['total_amount'] += payable.amount
                    date_totals[date_str]['count'] += 1
                    
                    if payable.status == 'paid':
                        date_totals[date_str]['paid_amount'] += payable.amount
                    else:
                        date_totals[date_str]['pending_amount'] += payable.amount
            
            data = list(date_totals.values())
        else:
            # Detailed report (default)
            items = []
            for payable in payables:
                items.append({
                    'id': payable.id,
                    'supplier_id': payable.supplier.id if payable.supplier else None,
                    'supplier_name': payable.supplier.name if payable.supplier else "Sem Fornecedor",
                    'description': payable.description,
                    'amount': float(payable.amount),
                    'issue_date': payable.issue_date,
                    'due_date': payable.due_date,
                    'payment_date': payable.payment_date,
                    'status': payable.status,
                    'is_paid': payable.status == 'paid',
                    'is_overdue': payable.status == 'pending' and payable.due_date < timezone.now().date(),
                    'reference_number': payable.reference_number
                })
            
            data = {
                'items': items,
                'summary': {
                    'totalPayables': float(total_payables),
                    'overduePayables': float(overdue_payables),
                    'totalPaid': float(payables.filter(status='paid').aggregate(
                        total=Sum('amount')
                    )['total'] or Decimal('0.00')),
                    'totalPending': float(payables.filter(status='pending').aggregate(
                        total=Sum('amount')
                    )['total'] or Decimal('0.00'))
                }
            }
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def debtors(self, request):
        """Get debtors report (clients with pending receivables)."""
        # Get date range from request
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {"error": "start_date and end_date are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all clients with pending receivables
        clients_with_pending = Client.objects.filter(
            accountsreceivable__status='pending',
            accountsreceivable__due_date__range=[start_date, end_date]
        ).distinct()
        
        debtors_data = []
        today = timezone.now().date()
        
        for client in clients_with_pending:
            # Get all receivables for this client
            receivables = AccountsReceivable.objects.filter(
                client=client,
                due_date__range=[start_date, end_date]
            )
            
            # Calculate totals
            total_due = receivables.filter(status='pending').aggregate(
                total=Sum('adjusted_amount')
            )['total'] or Decimal('0.00')
            
            overdue_amount = receivables.filter(
                status='pending',
                due_date__lt=today
            ).aggregate(
                total=Sum('adjusted_amount')
            )['total'] or Decimal('0.00')
            
            # Get last payment date
            last_payment = receivables.filter(
                status='paid'
            ).order_by('-payment_date').first()
            
            # Calculate max days overdue
            max_days_overdue = 0
            for receivable in receivables.filter(status='pending', due_date__lt=today):
                days_overdue = (today - receivable.due_date).days
                if days_overdue > max_days_overdue:
                    max_days_overdue = days_overdue
            
            debtors_data.append({
                'client_id': client.id,
                'client_name': client.name,
                'total_due': float(total_due),
                'overdue_amount': float(overdue_amount),
                'invoice_count': receivables.filter(status='pending').count(),
                'last_payment': last_payment.payment_date if last_payment else None,
                'days_overdue': max_days_overdue
            })
        
        # Sort by total due (descending)
        debtors_data.sort(key=lambda x: x['total_due'], reverse=True)
        
        return Response(debtors_data)
    
    @action(detail=False, methods=['get'])
    def creditors(self, request):
        """Get creditors report (suppliers with pending payables)."""
        # Get date range from request
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {"error": "start_date and end_date are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all suppliers with pending payables
        suppliers_with_pending = Supplier.objects.filter(
            accountspayable__status='pending',
            accountspayable__due_date__range=[start_date, end_date]
        ).distinct()
        
        creditors_data = []
        today = timezone.now().date()
        
        for supplier in suppliers_with_pending:
            # Get all payables for this supplier
            payables = AccountsPayable.objects.filter(
                supplier=supplier,
                due_date__range=[start_date, end_date]
            )
            
            # Calculate totals
            total_due = payables.filter(status='pending').aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            overdue_amount = payables.filter(
                status='pending',
                due_date__lt=today
            ).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            # Get last payment date
            last_payment = payables.filter(
                status='paid'
            ).order_by('-payment_date').first()
            
            # Calculate max days overdue
            max_days_overdue = 0
            for payable in payables.filter(status='pending', due_date__lt=today):
                days_overdue = (today - payable.due_date).days
                if days_overdue > max_days_overdue:
                    max_days_overdue = days_overdue
            
            creditors_data.append({
                'supplier_id': supplier.id,
                'supplier_name': supplier.name,
                'total_due': float(total_due),
                'overdue_amount': float(overdue_amount),
                'invoice_count': payables.filter(status='pending').count(),
                'last_payment': last_payment.payment_date if last_payment else None,
                'days_overdue': max_days_overdue
            })
        
        # Sort by total due (descending)
        creditors_data.sort(key=lambda x: x['total_due'], reverse=True)
        
        return Response(creditors_data)
    
    @action(detail=False, methods=['get'])
    def payers(self, request):
        """Get payers report (clients who have made payments)."""
        # Get date range from request
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        report_type = request.query_params.get('type', 'detailed')
        
        if not start_date or not end_date:
            return Response(
                {"error": "start_date and end_date are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all clients with payments in the period
        clients_with_payments = Client.objects.filter(
            accountsreceivable__status='paid',
            accountsreceivable__payment_date__range=[start_date, end_date]
        ).distinct()
        
        payers_data = []
        
        for client in clients_with_payments:
            # Get all paid receivables for this client in the period
            paid_receivables = AccountsReceivable.objects.filter(
                client=client,
                status='paid',
                payment_date__range=[start_date, end_date]
            )
            
            # Calculate totals
            total_paid = paid_receivables.aggregate(
                total=Sum('adjusted_amount')
            )['total'] or Decimal('0.00')
            
            # Calculate average days to payment
            avg_days = 0
            payment_count = paid_receivables.count()
            
            if payment_count > 0:
                total_days = 0
                for receivable in paid_receivables:
                    # Days between due date and payment date
                    days_to_payment = (receivable.payment_date - receivable.due_date).days
                    total_days += days_to_payment
                
                avg_days = total_days / payment_count
            
            # Calculate punctuality score (percentage of on-time payments)
            on_time_count = paid_receivables.filter(
                payment_date__lte=F('due_date')
            ).count()
            
            punctuality_score = 0
            if payment_count > 0:
                punctuality_score = (on_time_count / payment_count) * 100
            
            # Get last payment date
            last_payment = paid_receivables.order_by('-payment_date').first()
            
            payers_data.append({
                'client_id': client.id,
                'client_name': client.name,
                'total_paid': float(total_paid),
                'payment_count': payment_count,
                'average_days_to_payment': avg_days,
                'punctuality_score': punctuality_score,
                'last_payment_date': last_payment.payment_date if last_payment else None
            })
        
        # Sort by total paid (descending)
        payers_data.sort(key=lambda x: x['total_paid'], reverse=True)
        
        # Calculate summary data
        total_paid = sum(payer['total_paid'] for payer in payers_data)
        avg_days_overall = sum(payer['average_days_to_payment'] * payer['payment_count'] for payer in payers_data) / sum(payer['payment_count'] for payer in payers_data) if payers_data else 0
        avg_payment = total_paid / sum(payer['payment_count'] for payer in payers_data) if payers_data and sum(payer['payment_count'] for payer in payers_data) > 0 else 0
        
        # Count payers by punctuality
        on_time_payers = sum(1 for payer in payers_data if payer['punctuality_score'] >= 90)
        late_payers = len(payers_data) - on_time_payers
        
        # Count payments by lateness
        late_payers_1to7_days = 0
        late_payers_8to30_days = 0
        late_payers_over30_days = 0
        
        for client in clients_with_payments:
            late_1to7 = AccountsReceivable.objects.filter(
                client=client,
                status='paid',
                payment_date__range=[start_date, end_date],
                payment_date__gt=F('due_date'),
                payment_date__lte=F('due_date') + timedelta(days=7)
            ).count()
            
            late_8to30 = AccountsReceivable.objects.filter(
                client=client,
                status='paid',
                payment_date__range=[start_date, end_date],
                payment_date__gt=F('due_date') + timedelta(days=7),
                payment_date__lte=F('due_date') + timedelta(days=30)
            ).count()
            
            late_over30 = AccountsReceivable.objects.filter(
                client=client,
                status='paid',
                payment_date__range=[start_date, end_date],
                payment_date__gt=F('due_date') + timedelta(days=30)
            ).count()
            
            late_payers_1to7_days += late_1to7
            late_payers_8to30_days += late_8to30
            late_payers_over30_days += late_over30
        
        summary_data = {
            'totalPaid': total_paid,
            'averageDaysToPayment': avg_days_overall,
            'averagePaymentAmount': avg_payment,
            'totalClients': len(payers_data),
            'onTimePayers': on_time_payers,
            'latePayers': late_payers,
            'latePayers1to7Days': late_payers_1to7_days,
            'latePayers8to30Days': late_payers_8to30_days,
            'latePayersOver30Days': late_payers_over30_days
        }
        
        if report_type == 'summary':
            return Response(summary_data)
        else:
            return Response({
                'items': payers_data,
                'summary': summary_data
            })
    
    @action(detail=False, methods=['get'])
    def receivables_pdf(self, request):
        """Generate PDF for accounts receivable report."""
        # Get date range from request
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        report_type = request.query_params.get('type', 'detailed')
        
        if not start_date or not end_date:
            return Response(
                {"error": "start_date and end_date are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get receivables data
        response = self.receivables(request)
        if response.status_code != 200:
            return response
        
        # Get lab settings for branding
        lab_settings = LabSettings.objects.first()
        if not lab_settings:
            lab_settings = LabSettings.objects.create(
                lab_name="Meu Laboratório",
                primary_color="#2563eb",
                secondary_color="#64748b"
            )
        
        # Prepare context for template
        context = {
            'title': 'Relatório de Contas a Receber',
            'start_date': start_date,
            'end_date': end_date,
            'lab_name': lab_settings.lab_name,
            'logo_url': lab_settings.logo.url if lab_settings.logo else None,
            'primary_color': lab_settings.primary_color,
            'secondary_color': lab_settings.secondary_color,
            'data': response.data,
            'report_type': report_type,
            'generated_at': timezone.now()
        }
        
        # Render HTML template
        html_string = render_to_string('financial/receivables_report.html', context)
        
        # Generate PDF
        if not WEASYPRINT_AVAILABLE:
            return Response({"error": "PDF generation is currently disabled (WeasyPrint not available)"}, status=501)
        pdf_file = HTML(string=html_string).write_pdf()
        
        # Create response
        response = HttpResponse(pdf_file, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="receivables_report_{start_date}_{end_date}.pdf"'
        
        return response
    
    @action(detail=False, methods=['post'])
    def receivables_email(self, request):
        """Send accounts receivable report by email."""
        email = request.data.get('email')
        subject = request.data.get('subject', 'Relatório de Contas a Receber')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        report_type = request.data.get('report_type', 'detailed')
        
        if not email or not start_date or not end_date:
            return Response(
                {"error": "email, start_date, and end_date are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get receivables data
        request_copy = request._request.copy()
        request_copy.query_params = request_copy.GET.copy()
        request_copy.query_params['start_date'] = start_date.strftime('%Y-%m-%d')
        request_copy.query_params['end_date'] = end_date.strftime('%Y-%m-%d')
        request_copy.query_params['type'] = report_type
        
        response = self.receivables(request_copy)
        if response.status_code != 200:
            return response
        
        # Get lab settings for branding
        lab_settings = LabSettings.objects.first()
        if not lab_settings:
            lab_settings = LabSettings.objects.create(
                lab_name="Meu Laboratório",
                primary_color="#2563eb",
                secondary_color="#64748b"
            )
        
        # Prepare context for template
        context = {
            'title': 'Relatório de Contas a Receber',
            'start_date': start_date,
            'end_date': end_date,
            'lab_name': lab_settings.lab_name,
            'logo_url': lab_settings.logo.url if lab_settings.logo else None,
            'primary_color': lab_settings.primary_color,
            'secondary_color': lab_settings.secondary_color,
            'data': response.data,
            'report_type': report_type,
            'generated_at': timezone.now()
        }
        
        # Render HTML template
        html_string = render_to_string('financial/receivables_report.html', context)
        
        # Generate PDF
        if not WEASYPRINT_AVAILABLE:
            return Response({"error": "PDF generation is currently disabled (WeasyPrint not available)"}, status=501)
        pdf_file = HTML(string=html_string).write_pdf()
        
        # Send email
        email_message = EmailMessage(
            subject=subject,
            body=f'Segue em anexo o relatório de contas a receber para o período de {start_date.strftime("%d/%m/%Y")} a {end_date.strftime("%d/%m/%Y")}.',
            from_email=f'{lab_settings.lab_name} <noreply@labmanager.com>',
            to=[email]
        )
        
        email_message.attach(
            f'receivables_report_{start_date}_{end_date}.pdf',
            pdf_file,
            'application/pdf'
        )
        
        email_message.send()
        
        return Response({"message": f"Relatório enviado para {email}"})
    
    # Similar methods for payables_pdf, payables_email, debtors_pdf, debtors_email, creditors_pdf, creditors_email, payers_pdf, payers_email
    # These would follow the same pattern as the receivables_pdf and receivables_email methods
