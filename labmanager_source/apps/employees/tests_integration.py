from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date
from accounts.models import CustomUser
from apps.employees.models import EmployeeProfile

class RBACIntegrationTestCase(TestCase):
    """
    Testes de integração end-to-end simulando a proteção do sistema sob a perspectiva do Frontend.
    Garante que as requests autenticadas com tokens dos usuários não vazem privilégios.
    """
    
    def setUp(self):
        self.client_api = APIClient()

        # Criação dos usuários para a matriz
        self.superadmin = CustomUser.objects.create_user(
            username='admin_integra', password='password123', role=CustomUser.UserRole.SUPERADMIN
        )
        self.gerente = CustomUser.objects.create_user(
            username='gerente_integra', password='password123', role=CustomUser.UserRole.GERENTE
        )
        self.recepcao = CustomUser.objects.create_user(
            username='recepcao_integra', password='password123', role=CustomUser.UserRole.RECEPCAO
        )
        self.producao = CustomUser.objects.create_user(
            username='producao_integra', password='password123', role=CustomUser.UserRole.PRODUCAO
        )

        # Base profiles needed for logic
        self.employee_admin = EmployeeProfile.objects.create(
            user=self.superadmin, name='SuperAdmin', document_number='00011122233',
            department='Diretoria', position='CEO', hire_date=date.today()
        )
        
        # Endpoints
        self.login_url = reverse('accounts:login')
        self.employees_url = reverse('employee-list')
        
    def get_token_for_user(self, username, password='password123'):
        response = self.client_api.post(self.login_url, {
            'username': username,
            'password': password
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Login falhou para {username}")
        # Retorna o token de acesso extraido da resposta do login customizado ou default jwt
        return response.data.get('token') or response.data.get('access')

    def test_full_crud_employees_as_superadmin(self):
        """Testa o acesso e edição na aba de Funcionários pelo Administrador"""
        token = self.get_token_for_user('admin_integra')
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # List
        res_list = self.client_api.get(self.employees_url)
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        
        # Update (PATCH)
        payload = {
            'department': 'Diretoria Executiva',
            'position': 'Diretor'
        }
        res_update = self.client_api.patch(f'{self.employees_url}{self.employee_admin.id}/', payload)
        self.assertEqual(res_update.status_code, status.HTTP_200_OK)
        self.assertEqual(res_update.data['department'], 'Diretoria Executiva')

    def test_restricted_financial_endpoints(self):
        """Producao e Recepcao devem retornar 403 Forbidden ao tentar acessar o módulo financeiro"""
        
        # Teste Producao
        token_prod = self.get_token_for_user('producao_integra')
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token_prod}')
        
        # Simulando uma URL que a producao tenta forçar
        res_prod = self.client_api.get('/api/v1/accounts-receivable/')
        self.assertEqual(res_prod.status_code, status.HTTP_403_FORBIDDEN)
        
        # Teste Recepcao
        token_rec = self.get_token_for_user('recepcao_integra')
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token_rec}')
        
        res_rec = self.client_api.get('/api/v1/accounts-receivable/')
        self.assertEqual(res_rec.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_blocked_from_admin_dashboard(self):
        """Gerente não deve acessar o painel de admins do access_control, apenas visualizar Employees e Finanças"""
        token_ger = self.get_token_for_user('gerente_integra')
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token_ger}')
        
        # Allowed for Gerente (Finanças)
        res_fin = self.client_api.get('/api/v1/accounts-receivable/')
        self.assertEqual(res_fin.status_code, status.HTTP_200_OK)
        
        # Blocked for Gerente (Access Control / Autorizações exclusivas do SuperAdmin)
        res_adm = self.client_api.get(reverse('access_control:admin-dashboard'))
        self.assertEqual(res_adm.status_code, status.HTTP_403_FORBIDDEN)
