from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class DashboardAPITests(APITestCase):
    """Testes de API para o Dashboard"""

    def setUp(self):
        self.superadmin = User.objects.create_user(
            username='admin_dash', password='password', role='superadmin'
        )
        self.gerente = User.objects.create_user(
            username='gerente_dash', password='password', role='gerente'
        )
        self.producao = User.objects.create_user(
            username='prod_dash', password='password', role='producao'
        )
        self.summary_url = reverse('dashboard:dashboard-summary')

    def test_dashboard_summary_superadmin(self):
        """1. GET /api/v1/dashboard/summary/ como superadmin"""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get(self.summary_url)
        assert response.status_code == status.HTTP_200_OK

    def test_dashboard_summary_gerente(self):
        """2. GET como gerente"""
        self.client.force_authenticate(user=self.gerente)
        response = self.client.get(self.summary_url)
        assert response.status_code == status.HTTP_200_OK

    def test_dashboard_summary_producao(self):
        """3. GET como producao deve ser bloqueado (403)"""
        self.client.force_authenticate(user=self.producao)
        response = self.client.get(self.summary_url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_dashboard_summary_fields(self):
        """4. Response tem jobs_total, clients_total, revenue"""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get(self.summary_url)
        assert response.status_code == status.HTTP_200_OK
        
        # Keys presentes no JSON
        data = response.data
        assert 'jobs_total' in data
        assert 'clients_total' in data
        assert 'revenue' in data
        assert 'active_jobs' in data
