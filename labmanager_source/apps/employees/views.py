from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.http import HttpResponse
import datetime
from django.template.loader import render_to_string
from django.core.mail import EmailMessage
from weasyprint import HTML

from .models import (
    Employee,
    EmployeeSkill,
    JobAssignment,
    CommissionPayment,
    CommissionPaymentItem
)
from .serializers import (
    EmployeeSerializer,
    EmployeeSkillSerializer,
    JobAssignmentSerializer,
    CommissionPaymentSerializer,
    CommissionPaymentItemSerializer
)
from .filters import EmployeeFilter, JobAssignmentFilter, CommissionPaymentFilter


class EmployeeViewSet(viewsets.ModelViewSet):
    """
    API endpoint for employees.
    """
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = EmployeeFilter
    search_fields = ['name', 'document_number', 'position', 'department']
    ordering_fields = ['name', 'hire_date', 'position', 'department']
    ordering = ['name']

    @action(detail=True, methods=['get'])
    def skills(self, request, pk=None):
        """Return skills for a specific employee."""
        employee = self.get_object()
        skills = employee.skills.all()
        serializer = EmployeeSkillSerializer(skills, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def assignments(self, request, pk=None):
        """Return job assignments for a specific employee."""
        employee = self.get_object()
        assignments = employee.job_assignments.all().order_by('-assigned_date')
        serializer = JobAssignmentSerializer(assignments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def commission_payments(self, request, pk=None):
        """Return commission payments for a specific employee."""
        employee = self.get_object()
        payments = employee.commission_payments.all().order_by('-payment_date')
        serializer = CommissionPaymentSerializer(payments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def production_report(self, request, pk=None):
        """Generate production report for a specific employee."""
        employee = self.get_object()
        
        # Get date range from request or use current month
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)
        
        if not start_date or not end_date:
            today = datetime.date.today()
            start_date = datetime.date(today.year, today.month, 1)
            # Last day of current month
            next_month = today.replace(day=28) + datetime.timedelta(days=4)
            end_date = next_month - datetime.timedelta(days=next_month.day)
        else:
            start_date = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Get assignments in date range
        assignments = employee.job_assignments.filter(
            assigned_date__gte=start_date,
            assigned_date__lte=end_date
        ).order_by('assigned_date')
        
        # Calculate statistics
        total_assignments = assignments.count()
        completed_assignments = assignments.filter(is_completed=True).count()
        completion_rate = (completed_assignments / total_assignments * 100) if total_assignments > 0 else 0
        total_commission = sum(a.commission_amount for a in assignments.filter(is_completed=True))
        
        # Prepare data for report
        report_data = {
            'employee': employee,
            'start_date': start_date,
            'end_date': end_date,
            'assignments': assignments,
            'total_assignments': total_assignments,
            'completed_assignments': completed_assignments,
            'completion_rate': completion_rate,
            'total_commission': total_commission,
        }
        
        # Check if PDF or email is requested
        format_type = request.query_params.get('format', 'json')
        
        if format_type == 'pdf':
            # Generate PDF
            html_string = render_to_string('employees/production_report.html', report_data)
            pdf_file = HTML(string=html_string).write_pdf()
            
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="production_report_{employee.id}.pdf"'
            return response
        
        elif format_type == 'email':
            # Send email with PDF attachment
            recipient_email = request.query_params.get('email', employee.email)
            if not recipient_email:
                return Response(
                    {"error": "Email address is required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate PDF
            html_string = render_to_string('employees/production_report.html', report_data)
            pdf_file = HTML(string=html_string).write_pdf()
            
            # Send email
            subject = f'Production Report: {employee.name} ({start_date} to {end_date})'
            message = f'Please find attached the production report for {employee.name}.'
            email = EmailMessage(
                subject,
                message,
                'noreply@labmanager.com',
                [recipient_email]
            )
            email.attach(
                f'production_report_{employee.id}.pdf',
                pdf_file,
                'application/pdf'
            )
            email.send()
            
            return Response({"message": f"Report sent to {recipient_email}"})
        
        else:
            # Return JSON data
            serializer = JobAssignmentSerializer(assignments, many=True)
            return Response({
                'employee': EmployeeSerializer(employee).data,
                'start_date': start_date,
                'end_date': end_date,
                'total_assignments': total_assignments,
                'completed_assignments': completed_assignments,
                'completion_rate': completion_rate,
                'total_commission': total_commission,
                'assignments': serializer.data
            })


class EmployeeSkillViewSet(viewsets.ModelViewSet):
    """
    API endpoint for employee skills.
    """
    queryset = EmployeeSkill.objects.all()
    serializer_class = EmployeeSkillSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['employee', 'skill_name', 'proficiency_level']
    search_fields = ['skill_name', 'description']


class JobAssignmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for job assignments.
    """
    queryset = JobAssignment.objects.all()
    serializer_class = JobAssignmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = JobAssignmentFilter
    search_fields = ['job__order_number', 'employee__name', 'task_description']
    ordering_fields = ['assigned_date', 'completed_date', 'is_completed']
    ordering = ['-assigned_date']

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark job assignment as completed."""
        assignment = self.get_object()
        
        if assignment.is_completed:
            return Response(
                {"error": "Assignment already completed"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get completion date from request or use today
        completed_date = request.data.get('completed_date', None)
        if not completed_date:
            completed_date = datetime.date.today()
        
        # Get completion notes
        completion_notes = request.data.get('completion_notes', '')
        
        # Update assignment
        assignment.is_completed = True
        assignment.completed_date = completed_date
        assignment.completion_notes = completion_notes
        assignment.save()  # This will trigger commission calculation in save method
        
        serializer = self.get_serializer(assignment)
        return Response(serializer.data)


class CommissionPaymentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for commission payments.
    """
    queryset = CommissionPayment.objects.all()
    serializer_class = CommissionPaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CommissionPaymentFilter
    search_fields = ['employee__name', 'payment_method', 'reference_number']
    ordering_fields = ['payment_date', 'total_amount']
    ordering = ['-payment_date']

    @action(detail=False, methods=['post'])
    def generate_payment(self, request):
        """Generate commission payment for employee based on completed assignments."""
        employee_id = request.data.get('employee_id')
        start_period = request.data.get('start_period')
        end_period = request.data.get('end_period')
        payment_date = request.data.get('payment_date', datetime.date.today())
        payment_method = request.data.get('payment_method', 'Bank Transfer')
        reference_number = request.data.get('reference_number', '')
        notes = request.data.get('notes', '')
        
        if not employee_id or not start_period or not end_period:
            return Response(
                {"error": "Employee ID, start period, and end period are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            employee = Employee.objects.get(pk=employee_id)
            start_period = datetime.datetime.strptime(start_period, '%Y-%m-%d').date()
            end_period = datetime.datetime.strptime(end_period, '%Y-%m-%d').date()
            
            # Get completed assignments in period that haven't been paid yet
            assignments = JobAssignment.objects.filter(
                employee=employee,
                is_completed=True,
                completed_date__gte=start_period,
                completed_date__lte=end_period,
                payment_items__isnull=True  # Not already paid
            )
            
            if not assignments.exists():
                return Response(
                    {"error": "No unpaid completed assignments found in the specified period"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Calculate total commission amount
            total_amount = sum(a.commission_amount for a in assignments)
            
            with transaction.atomic():
                # Create commission payment
                payment = CommissionPayment.objects.create(
                    employee=employee,
                    payment_date=payment_date,
                    start_period=start_period,
                    end_period=end_period,
                    total_amount=total_amount,
                    payment_method=payment_method,
                    reference_number=reference_number,
                    notes=notes
                )
                
                # Create payment items for each assignment
                for assignment in assignments:
                    CommissionPaymentItem.objects.create(
                        payment=payment,
                        job_assignment=assignment,
                        amount=assignment.commission_amount
                    )
            
            serializer = self.get_serializer(payment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Employee.DoesNotExist:
            return Response(
                {"error": "Employee not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def print(self, request, pk=None):
        """Generate printable commission payment report."""
        payment = self.get_object()
        
        # Get payment items
        items = payment.items.all().select_related('job_assignment', 'job_assignment__job')
        
        # Prepare data for report
        report_data = {
            'payment': payment,
            'employee': payment.employee,
            'items': items,
        }
        
        # Generate PDF
        html_string = render_to_string('employees/commission_payment.html', report_data)
        pdf_file = HTML(string=html_string).write_pdf()
        
        response = HttpResponse(pdf_file, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="commission_payment_{payment.id}.pdf"'
        return response

    @action(detail=True, methods=['post'])
    def email(self, request, pk=None):
        """Email commission payment report."""
        payment = self.get_object()
        
        recipient_email = request.data.get('email', payment.employee.email)
        if not recipient_email:
            return Response(
                {"error": "Email address is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get payment items
        items = payment.items.all().select_related('job_assignment', 'job_assignment__job')
        
        # Prepare data for report
        report_data = {
            'payment': payment,
            'employee': payment.employee,
            'items': items,
        }
        
        # Generate PDF
        html_string = render_to_string('employees/commission_payment.html', report_data)
        pdf_file = HTML(string=html_string).write_pdf()
        
        # Send email
        subject = f'Commission Payment: {payment.payment_date}'
        message = f'Please find attached the commission payment report for {payment.start_period} to {payment.end_period}.'
        email = EmailMessage(
            subject,
            message,
            'noreply@labmanager.com',
            [recipient_email]
        )
        email.attach(
            f'commission_payment_{payment.id}.pdf',
            pdf_file,
            'application/pdf'
        )
        email.send()
        
        return Response({"message": f"Payment report sent to {recipient_email}"})


class CommissionPaymentItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint for commission payment items.
    """
    queryset = CommissionPaymentItem.objects.all()
    serializer_class = CommissionPaymentItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['payment', 'job_assignment']
