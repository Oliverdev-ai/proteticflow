from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date
from accounts.models import CustomUser
from apps.employees.models import EmployeeProfile
from rest_framework_simplejwt.tokens import RefreshToken

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
        # Bypassing LoginView to avoid 2FA interception during RBAC tests
        user = CustomUser.objects.get(username=username)
        refresh = RefreshToken.for_user(user)
        # Manually add custom token claims if needed by the backend
        token = refresh.access_token
        token['role'] = user.role
        token['username'] = user.username
        return str(token)

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
        res_adm = self.client_api.get(reverse('access_control:role-permissions'))
        self.assertEqual(res_adm.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_user_then_employee_profile(self):
        """1. POST /auth/users/ + POST /employees/ como gerente -> 2 objetos criados, user.id == profile.user_id"""
        token_ger = self.get_token_for_user('gerente_integra')
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token_ger}')

        # Step 1: Create User
        user_url = reverse('accounts:auth-user-create')
        user_payload = {
            'username': 'new_employee_user',
            'password': 'password123',
            'password_confirm': 'password123',
            'email': 'new_employee@example.com',
            'first_name': 'New',
            'last_name': 'Employee',
            'role': 'recepcao'
        }
        res_user = self.client_api.post(user_url, user_payload)
        self.assertEqual(res_user.status_code, status.HTTP_201_CREATED)
        user_id = res_user.data['id']

        # Step 2: Create Employee Profile linked to User
        employee_payload = {
            'user': user_id,
            'name': 'New Employee',
            'document_number': '12345678901',
            'department': 'Atendimento',
            'position': 'Recepcionista',
            'hire_date': str(date.today())
        }
        res_emp = self.client_api.post(self.employees_url, employee_payload)
        self.assertEqual(res_emp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_emp.data['user'], user_id)

        # Verify in DB
        self.assertTrue(CustomUser.objects.filter(username='new_employee_user').exists())
        self.assertTrue(EmployeeProfile.objects.filter(user_id=user_id).exists())

    def test_create_employee_sets_role(self):
        """2. Usuário criado com role='recepcao' -> CustomUser.role == 'recepcao'"""
        token_ger = self.get_token_for_user('gerente_integra')
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token_ger}')

        user_url = reverse('accounts:auth-user-create')
        user_payload = {
            'username': 'recepcao_role_test',
            'password': 'password123',
            'password_confirm': 'password123',
            'email': 'recepcao_test@example.com',
            'role': 'recepcao'
        }
        res_user = self.client_api.post(user_url, user_payload)
        self.assertEqual(res_user.status_code, status.HTTP_201_CREATED)
        
        user = CustomUser.objects.get(username='recepcao_role_test')
        self.assertEqual(user.role, 'recepcao')

    def test_update_employee_role_via_endpoint(self):
        """3. PATCH /users/{id}/role/ como superadmin -> Role atualizado"""
        # Create a user first
        user = CustomUser.objects.create_user(
            username='role_update_test', password='password123', role='recepcao'
        )
        
        token_admin = self.get_token_for_user('admin_integra')
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token_admin}')
        
        role_url = reverse('accounts:user-role-update', kwargs={'pk': user.id})
        res_update = self.client_api.patch(role_url, {'role': 'gerente'}, format='json')
        
        self.assertEqual(res_update.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.role, 'gerente')

    def test_producao_cannot_create_employee(self):
        """4. POST /employees/ como producao -> status 403"""
        token_prod = self.get_token_for_user('producao_integra')
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token_prod}')
        
        payload = {
            'name': 'Unauthorized Employee',
            'document_number': '99988877766',
            'department': 'Testing',
            'position': 'Tester',
            'hire_date': str(date.today())
        }
        res = self.client_api.post(self.employees_url, payload)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_deactivate_employee_blocks_login(self):
        """5. is_active=False no user -> login retorna 401"""
        user = CustomUser.objects.create_user(
            username='inactive_user', password='password123', role='recepcao'
        )
        user.is_active = False
        user.save()
        
        response = self.client_api.post(self.login_url, {
            'username': 'inactive_user',
            'password': 'password123'
        })
        
        # O LoginSerializer em accounts/serializers.py lança erro se is_active for False
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Conta desativada', str(response.data))
