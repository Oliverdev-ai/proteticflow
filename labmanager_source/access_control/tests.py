import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import RolePermissionsMatrix, SubscriptionPlan

User = get_user_model()

class AccessControlModelTests(APITestCase):
    """Testes unitários para modelos de access_control"""

    def test_role_permissions_matrix_singleton(self):
        """1. get_singleton() cria e retorna singleton"""
        obj1 = RolePermissionsMatrix.get_singleton()
        obj2 = RolePermissionsMatrix.get_singleton()
        assert obj1.pk == obj2.pk
        assert obj1 == obj2
        assert RolePermissionsMatrix.objects.count() == 1

class AccessControlAPITests(APITestCase):
    """Testes de API para access_control"""

    def setUp(self):
        self.superadmin = User.objects.create_user(
            username='admin_acc', password='password', role='superadmin'
        )
        self.gerente = User.objects.create_user(
            username='gerente_acc', password='password', role='gerente'
        )
        
        # Singleton prep
        RolePermissionsMatrix.get_singleton()
        
        # Endpoints
        self.permissions_url = reverse('access_control:role-permissions')
        self.plans_url = reverse('access_control:subscription-plans')

    def test_role_permissions_get_authenticated(self):
        """2. GET /api/v1/access/permissions/ autenticado"""
        self.client.force_authenticate(user=self.gerente)
        response = self.client.get(self.permissions_url)
        assert response.status_code == status.HTTP_200_OK
        assert 'matrix' in response.data

    def test_role_permissions_get_unauthenticated(self):
        """3. GET sem token deve retornar 401 ou 403"""
        response = self.client.get(self.permissions_url)
        # DRF com SessionAuthentication pode retornar 403 para AnonymousUser em certos contextos
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_role_permissions_patch_superadmin(self):
        """4. PATCH matrix como superadmin"""
        self.client.force_authenticate(user=self.superadmin)
        new_matrix = {"producao": {"test_mod": True}}
        response = self.client.patch(self.permissions_url, {"matrix": new_matrix}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['matrix'] == new_matrix

    def test_role_permissions_patch_gerente_blocked(self):
        """5. PATCH matrix como gerente deve retornar 403"""
        self.client.force_authenticate(user=self.gerente)
        response = self.client.patch(self.permissions_url, {"matrix": {}}, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_subscription_plans_list(self):
        """6. GET /api/v1/access/subscription-plans/"""
        # Criar um plano ativo
        SubscriptionPlan.objects.create(
            name="Plano Teste",
            plan_type="basic",
            is_active=True,
            monthly_price=29.90
        )
        
        self.client.force_authenticate(user=self.gerente)
        response = self.client.get(self.plans_url)
        assert response.status_code == status.HTTP_200_OK
        
        # Lida com paginação
        data = response.data['results'] if isinstance(response.data, dict) and 'results' in response.data else response.data
        assert len(data) >= 1
        assert data[0]['name'] == "Plano Teste"
