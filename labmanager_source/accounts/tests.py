import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.core.exceptions import ValidationError
from .models import CustomUser

class AccountsModelTests(APITestCase):
    """Testes unitários para o modelo CustomUser"""

    def test_user_create_with_role(self):
        """1. CustomUser criado com role correto"""
        user = CustomUser.objects.create_user(
            username='testproducao',
            password='Password123!',
            role=CustomUser.UserRole.PRODUCAO
        )
        assert user.role == 'producao'

    def test_invalid_role_rejected(self):
        """2. Role inválido deve ser rejeitado (Via validação de campo choices)"""
        user = CustomUser(username='invalid', role='invalid_role')
        with pytest.raises(ValidationError):
            user.full_clean()

    def test_superadmin_methods(self):
        """3. is_superadmin(), is_gerente() corretos"""
        admin = CustomUser.objects.create_user(username='admin', role=CustomUser.UserRole.SUPERADMIN)
        gerente = CustomUser.objects.create_user(username='gerente', role=CustomUser.UserRole.GERENTE)
        producao = CustomUser.objects.create_user(username='producao', role=CustomUser.UserRole.PRODUCAO)

        assert admin.is_superadmin() is True
        assert admin.is_gerente() is True
        
        assert gerente.is_superadmin() is False
        assert gerente.is_gerente() is True
        
        assert producao.is_superadmin() is False
        assert producao.is_gerente() is False

    def test_role_hierarchy_methods(self):
        """4. is_recepcao() inclui gerente e superadmin"""
        admin = CustomUser.objects.create_user(username='h_admin', role=CustomUser.UserRole.SUPERADMIN)
        gerente = CustomUser.objects.create_user(username='h_gerente', role=CustomUser.UserRole.GERENTE)
        recepcao = CustomUser.objects.create_user(username='h_recepcao', role=CustomUser.UserRole.RECEPCAO)
        producao = CustomUser.objects.create_user(username='h_producao', role=CustomUser.UserRole.PRODUCAO)

        assert admin.is_recepcao() is True
        assert gerente.is_recepcao() is True
        assert recepcao.is_recepcao() is True
        assert producao.is_recepcao() is False

class AccountsAPITests(APITestCase):
    """Testes de integração/API para endpoints de accounts"""

    def setUp(self):
        self.superadmin = CustomUser.objects.create_user(
            username='api_admin', password='password', role=CustomUser.UserRole.SUPERADMIN
        )
        self.gerente = CustomUser.objects.create_user(
            username='api_gerente', password='password', role=CustomUser.UserRole.GERENTE
        )
        self.producao = CustomUser.objects.create_user(
            username='api_producao', password='password', role=CustomUser.UserRole.PRODUCAO
        )
        
        # Endpoints
        self.user_create_url = reverse('accounts:auth-user-create')

    def test_user_create_view_superadmin(self):
        """5. POST /api/v1/auth/users/ como superadmin"""
        self.client.force_authenticate(user=self.superadmin)
        data = {
            "username": "newuser",
            "password": "Password123!",
            "password_confirm": "Password123!",
            "email": "new@test.com",
            "role": "producao",
            "first_name": "New",
            "last_name": "User"
        }
        response = self.client.post(self.user_create_url, data)
        assert response.status_code == status.HTTP_201_CREATED

    def test_user_create_view_producao_blocked(self):
        """6. POST /api/v1/auth/users/ como producao deve retornar 403"""
        self.client.force_authenticate(user=self.producao)
        data = {
            "username": "hack",
            "password": "Password123!",
            "password_confirm": "Password123!",
            "email": "hack@test.com",
            "role": "superadmin"
        }
        response = self.client.post(self.user_create_url, data)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_role_update_superadmin_only(self):
        """7. PATCH /users/{id}/role/ como superadmin"""
        self.client.force_authenticate(user=self.superadmin)
        url = reverse('accounts:user-role-update', kwargs={'pk': self.producao.pk})
        response = self.client.patch(url, {"role": "gerente"})
        assert response.status_code == status.HTTP_200_OK
        self.producao.refresh_from_db()
        assert self.producao.role == 'gerente'

    def test_role_update_gerente_blocked(self):
        """8. PATCH /users/{id}/role/ como gerente deve retornar 403"""
        self.client.force_authenticate(user=self.gerente)
        url = reverse('accounts:user-role-update', kwargs={'pk': self.producao.pk})
        response = self.client.patch(url, {"role": "superadmin"})
        assert response.status_code == status.HTTP_403_FORBIDDEN
