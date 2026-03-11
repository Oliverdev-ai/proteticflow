from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date
from accounts.models import CustomUser
from apps.employees.models import EmployeeProfile, JobAssignment
from apps.jobs.models import Job, JobStage
from apps.clients.models import Client
from apps.financial.models import DeliverySchedule

class EmployeeRBACViewSetTestCase(TestCase):
    def setUp(self):
        self.client_api = APIClient()

        # Criação de usuários com diferentes roles
        self.superadmin = CustomUser.objects.create_user(
            username='admin', password='123', role=CustomUser.UserRole.SUPERADMIN
        )
        self.gerente = CustomUser.objects.create_user(
            username='gerente', password='123', role=CustomUser.UserRole.GERENTE
        )
        self.recepcao = CustomUser.objects.create_user(
            username='recepcao', password='123', role=CustomUser.UserRole.RECEPCAO
        )
        self.producao = CustomUser.objects.create_user(
            username='producao', password='123', role=CustomUser.UserRole.PRODUCAO
        )

        # Dados base
        self.employee_gerente = EmployeeProfile.objects.create(
            user=self.gerente, name='Gerente Teste', document_number='11122233344',
            department='Administração', position='Gerente Geral', hire_date=date.today()
        )
        self.employee_producao = EmployeeProfile.objects.create(
            user=self.producao, name='Producao Teste', document_number='55566677788',
            department='Cerâmica', position='Ceramista', hire_date=date.today()
        )
        
        # Cliente para Jobs
        self.client_obj = Client.objects.create(
            name='Clinica Teste', document_number='12345678000199', is_active=True
        )
        
        # Estágio para Jobs
        self.job_stage = JobStage.objects.create(
            name='Modelagem', order=1
        )
        
        # Trabalho associado à produção
        self.job = Job.objects.create(
            order_number='ORD-001', client=self.client_obj, patient_name='João Silva',
            entry_date=date.today(), due_date=date.today(), 
            status='in_progress', current_stage=self.job_stage
        )
        self.job_assignment = JobAssignment.objects.create(
            job=self.job, employee=self.employee_producao, task_description='Aplicar cerâmica'
        )

        # Endpoints
        self.employees_url = reverse('employee-list')
        self.job_assignments_url = reverse('jobassignment-list')
        self.clients_url = reverse('client-list')

    def test_employee_list_access_superadmin(self):
        self.client_api.force_authenticate(user=self.superadmin)
        response = self.client_api.get(self.employees_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_employee_list_access_gerente(self):
        self.client_api.force_authenticate(user=self.gerente)
        response = self.client_api.get(self.employees_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_employee_list_access_recepcao_denied(self):
        self.client_api.force_authenticate(user=self.recepcao)
        response = self.client_api.get(self.employees_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_list_access_producao_denied(self):
        self.client_api.force_authenticate(user=self.producao)
        response = self.client_api.get(self.employees_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_job_assignment_access_producao(self):
        # Operacionais DEVEM conseguir ver tarefas de jobs (Kanban)
        self.client_api.force_authenticate(user=self.producao)
        response = self.client_api.get(self.job_assignments_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_clients_access_recepcao(self):
        # Recepção DEVE conseguir ver clientes
        self.client_api.force_authenticate(user=self.recepcao)
        response = self.client_api.get(self.clients_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_clients_access_producao_denied(self):
        # Produção NÃO DEVE conseguir ver a base de clientes inteira
        self.client_api.force_authenticate(user=self.producao)
        response = self.client_api.get(self.clients_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
