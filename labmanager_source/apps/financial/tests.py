from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import CustomUser
from apps.financial.models import AccountsReceivable, FinancialClosing
from apps.clients.models import Client
from apps.jobs.models import Job
from datetime import date
from decimal import Decimal

class FinancialAPITests(TestCase):
    def setUp(self):
        self.client_api = APIClient()
        
        # Roles
        self.superadmin = CustomUser.objects.create_user(
            username='admin_fin', password='123', role='superadmin'
        )
        self.gerente = CustomUser.objects.create_user(
            username='gerente_fin', password='123', role='gerente'
        )
        self.contabil = CustomUser.objects.create_user(
            username='contabil_fin', password='123', role='contabil'
        )
        self.recepcao = CustomUser.objects.create_user(
            username='recepcao_fin', password='123', role='recepcao'
        )
        self.producao = CustomUser.objects.create_user(
            username='producao_fin', password='123', role='producao'
        )

        # Mock Data
        self.client_obj = Client.objects.create(name='Clinica Fin', document_number='11122233344')
        
        # Job is required for AccountsReceivable
        self.job_obj = Job.objects.create(
            order_number='FIN-JOB-01',
            client=self.client_obj,
            due_date=date.today()
        )

        self.receivable = AccountsReceivable.objects.create(
            job=self.job_obj,
            client=self.client_obj,
            notes='Serviço #1',
            amount=Decimal('500.00'),
            # adjusted_amount is calculated in save()
            due_date=date.today(),
            status='pending'
        )
        
        self.closing = FinancialClosing.objects.create(
            closing_type='monthly',
            period_start=date(2023, 10, 1),
            period_end=date(2023, 10, 31),
            total_revenue=Decimal('10000.00'),
            total_jobs=20,
            total_clients=5
        )

        self.receivable_url = reverse('accountsreceivable-list')
        self.closing_url = reverse('financialclosing-list')

    def test_accounts_receivable_gerente(self):
        """1. GET /api/v1/accounts-receivable/ como gerente"""
        self.client_api.force_authenticate(user=self.gerente)
        response = self.client_api.get(self.receivable_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_accounts_receivable_producao_blocked(self):
        """2. GET como producao - 403"""
        self.client_api.force_authenticate(user=self.producao)
        response = self.client_api.get(self.receivable_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_accounts_receivable_recepcao_blocked(self):
        """3. GET como recepcao - 403 (financeiro é restrito)"""
        self.client_api.force_authenticate(user=self.recepcao)
        response = self.client_api.get(self.receivable_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_contabil_access_financial(self):
        """4. GET como contabil - 200"""
        self.client_api.force_authenticate(user=self.contabil)
        response = self.client_api.get(self.receivable_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_financial_closing_report(self):
        """5. GET /api/v1/financial-closing/ como gerente"""
        self.client_api.force_authenticate(user=self.gerente)
        response = self.client_api.get(self.closing_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if record is present
        results = response.data.get('results', response.data)
        self.assertTrue(len(results) > 0)
        # adjusted_amount might vary depending on client percentage, 
        # but in Client.objects.create default is probably 0 or something.
        # Actually in Client model it might have a default.
        self.assertEqual(float(results[0]['total_revenue']), 10000.00)
