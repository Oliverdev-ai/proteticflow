"""
Testes de Integração das APIs do ProteticFlow
"""

import pytest
import json
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from conftest import BaseAPITest, API_BASE_URL

User = get_user_model()

@pytest.mark.integration
class TestClientAPI(BaseAPITest):
    """Testes de integração da API de clientes"""
    
    @pytest.mark.django_db
    def test_create_client_api(self, authenticated_api_client):
        """Teste de criação de cliente via API"""
        client_data = {
            "name": "Cliente API Test",
            "email": "api.test@example.com",
            "phone": "(11) 99999-1234",
            "address": "Rua API Test, 123"
        }
        
        response = authenticated_api_client.post('/api/clients/', client_data)
        self.assert_response_success(response)
        
        # Verificar dados retornados
        data = response.json()
        assert data['name'] == client_data['name']
        assert data['email'] == client_data['email']
        assert 'id' in data
    
    @pytest.mark.django_db
    def test_list_clients_api(self, authenticated_api_client, test_client):
        """Teste de listagem de clientes via API"""
        response = authenticated_api_client.get('/api/clients/')
        self.assert_response_success(response)
        
        data = response.json()
        assert isinstance(data, list) or 'results' in data  # Pode ser paginado
    
    @pytest.mark.django_db
    def test_update_client_api(self, authenticated_api_client, test_client):
        """Teste de atualização de cliente via API"""
        # Primeiro criar um cliente
        client_data = {
            "name": "Cliente Para Atualizar",
            "email": "update@example.com",
            "phone": "(11) 99999-5678"
        }
        
        create_response = authenticated_api_client.post('/api/clients/', client_data)
        self.assert_response_success(create_response)
        
        client_id = create_response.json()['id']
        
        # Atualizar cliente
        update_data = {
            "name": "Cliente Atualizado",
            "email": "updated@example.com",
            "phone": "(11) 99999-9999"
        }
        
        response = authenticated_api_client.put(f'/api/clients/{client_id}/', update_data)
        self.assert_response_success(response)
        
        # Verificar atualização
        data = response.json()
        assert data['name'] == update_data['name']
        assert data['email'] == update_data['email']
    
    @pytest.mark.django_db
    def test_delete_client_api(self, authenticated_api_client):
        """Teste de exclusão de cliente via API"""
        # Criar cliente
        client_data = {
            "name": "Cliente Para Deletar",
            "email": "delete@example.com",
            "phone": "(11) 99999-0000"
        }
        
        create_response = authenticated_api_client.post('/api/clients/', client_data)
        client_id = create_response.json()['id']
        
        # Deletar cliente
        response = authenticated_api_client.delete(f'/api/clients/{client_id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verificar se foi deletado
        get_response = authenticated_api_client.get(f'/api/clients/{client_id}/')
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.integration
class TestJobAPI(BaseAPITest):
    """Testes de integração da API de trabalhos"""
    
    @pytest.mark.django_db
    def test_create_job_api(self, authenticated_api_client, test_client):
        """Teste de criação de trabalho via API"""
        job_data = {
            "title": "Prótese API Test",
            "description": "Prótese criada via API para teste",
            "client": test_client.id,
            "price": "750.00",
            "status": "pending"
        }
        
        response = authenticated_api_client.post('/api/jobs/', job_data)
        self.assert_response_success(response)
        
        data = response.json()
        assert data['title'] == job_data['title']
        assert data['client'] == test_client.id
        assert float(data['price']) == float(job_data['price'])
    
    @pytest.mark.django_db
    def test_job_status_workflow(self, authenticated_api_client, test_client):
        """Teste do fluxo de status de trabalho"""
        # Criar trabalho
        job_data = {
            "title": "Trabalho Status Test",
            "description": "Teste de fluxo de status",
            "client": test_client.id,
            "price": "500.00",
            "status": "pending"
        }
        
        create_response = authenticated_api_client.post('/api/jobs/', job_data)
        job_id = create_response.json()['id']
        
        # Testar mudanças de status
        statuses = ['in_progress', 'completed', 'delivered']
        
        for new_status in statuses:
            update_data = {"status": new_status}
            response = authenticated_api_client.patch(f'/api/jobs/{job_id}/', update_data)
            self.assert_response_success(response)
            
            data = response.json()
            assert data['status'] == new_status

@pytest.mark.integration
class TestMaterialAPI(BaseAPITest):
    """Testes de integração da API de materiais"""
    
    @pytest.mark.django_db
    def test_create_material_api(self, authenticated_api_client):
        """Teste de criação de material via API"""
        material_data = {
            "name": "Material API Test",
            "description": "Material criado via API",
            "unit_price": "35.50",
            "stock_quantity": 100
        }
        
        response = authenticated_api_client.post('/api/materials/', material_data)
        self.assert_response_success(response)
        
        data = response.json()
        assert data['name'] == material_data['name']
        assert float(data['unit_price']) == float(material_data['unit_price'])
    
    @pytest.mark.django_db
    def test_material_stock_management(self, authenticated_api_client):
        """Teste de gestão de estoque de material"""
        # Criar material
        material_data = {
            "name": "Material Estoque Test",
            "description": "Teste de gestão de estoque",
            "unit_price": "25.00",
            "stock_quantity": 50
        }
        
        create_response = authenticated_api_client.post('/api/materials/', material_data)
        material_id = create_response.json()['id']
        
        # Atualizar estoque
        update_data = {"stock_quantity": 75}
        response = authenticated_api_client.patch(f'/api/materials/{material_id}/', update_data)
        self.assert_response_success(response)
        
        data = response.json()
        assert data['stock_quantity'] == 75

@pytest.mark.integration
class TestAuthenticationAPI(BaseAPITest):
    """Testes de integração da API de autenticação"""
    
    @pytest.mark.django_db
    def test_login_api(self, api_client, admin_user):
        """Teste de login via API"""
        login_data = {
            "username": admin_user.username,
            "password": "test123"
        }
        
        response = api_client.post('/api/auth/login/', login_data)
        self.assert_response_success(response)
        
        data = response.json()
        assert 'token' in data or 'access' in data  # JWT ou Token auth
    
    @pytest.mark.django_db
    def test_protected_endpoint_without_auth(self, api_client):
        """Teste de acesso a endpoint protegido sem autenticação"""
        response = api_client.get('/api/clients/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    @pytest.mark.django_db
    def test_user_permissions(self, api_client, regular_user):
        """Teste de permissões de usuário"""
        # Login com usuário regular
        api_client.force_authenticate(user=regular_user)
        
        # Tentar acessar área administrativa
        response = api_client.get('/api/admin/users/')
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

@pytest.mark.integration
class TestExternalIntegrations(BaseAPITest):
    """Testes de integrações externas"""
    
    @pytest.mark.django_db
    def test_email_integration(self, authenticated_api_client):
        """Teste de integração com sistema de email"""
        # Simular envio de email
        email_data = {
            "to": "test@example.com",
            "subject": "Teste de Email",
            "message": "Mensagem de teste"
        }
        
        response = authenticated_api_client.post('/api/send-email/', email_data)
        # Em staging, pode retornar sucesso mesmo sem enviar realmente
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_202_ACCEPTED]
    
    @pytest.mark.django_db
    def test_ai_integration(self, authenticated_api_client):
        """Teste de integração com IA"""
        # Testar endpoint de IA (se disponível)
        ai_data = {
            "prompt": "Gerar sugestão de preço para prótese total",
            "context": "Cliente premium, material de alta qualidade"
        }
        
        response = authenticated_api_client.post('/api/ai/suggest-price/', ai_data)
        # Pode não estar disponível em staging
        assert response.status_code in [
            status.HTTP_200_OK, 
            status.HTTP_501_NOT_IMPLEMENTED,
            status.HTTP_503_SERVICE_UNAVAILABLE
        ]

@pytest.mark.integration
class TestDataConsistency(BaseAPITest):
    """Testes de consistência de dados"""
    
    @pytest.mark.django_db
    def test_cascade_delete(self, authenticated_api_client):
        """Teste de exclusão em cascata"""
        # Criar cliente
        client_data = {
            "name": "Cliente Cascade Test",
            "email": "cascade@test.com",
            "phone": "(11) 99999-1111"
        }
        
        client_response = authenticated_api_client.post('/api/clients/', client_data)
        client_id = client_response.json()['id']
        
        # Criar trabalho para o cliente
        job_data = {
            "title": "Trabalho Cascade Test",
            "description": "Teste de exclusão em cascata",
            "client": client_id,
            "price": "300.00"
        }
        
        job_response = authenticated_api_client.post('/api/jobs/', job_data)
        job_id = job_response.json()['id']
        
        # Tentar deletar cliente (deve falhar ou deletar em cascata)
        delete_response = authenticated_api_client.delete(f'/api/clients/{client_id}/')
        
        if delete_response.status_code == status.HTTP_204_NO_CONTENT:
            # Se deletou o cliente, verificar se trabalho também foi deletado
            job_check = authenticated_api_client.get(f'/api/jobs/{job_id}/')
            assert job_check.status_code == status.HTTP_404_NOT_FOUND
        else:
            # Se não permitiu deletar, deve retornar erro apropriado
            assert delete_response.status_code == status.HTTP_400_BAD_REQUEST
    
    @pytest.mark.django_db
    def test_data_validation(self, authenticated_api_client):
        """Teste de validação de dados"""
        # Testar dados inválidos
        invalid_client_data = {
            "name": "",  # Nome vazio
            "email": "email-invalido",  # Email inválido
            "phone": "123"  # Telefone muito curto
        }
        
        response = authenticated_api_client.post('/api/clients/', invalid_client_data)
        self.assert_response_error(response, status.HTTP_400_BAD_REQUEST)
        
        # Verificar mensagens de erro
        data = response.json()
        assert 'name' in data or 'email' in data  # Deve ter erros de validação

@pytest.mark.integration
@pytest.mark.slow
class TestPerformanceBaseline(BaseAPITest):
    """Testes básicos de performance da API"""
    
    @pytest.mark.django_db
    def test_api_response_time(self, authenticated_api_client):
        """Teste de tempo de resposta da API"""
        import time
        
        # Testar endpoint de listagem
        start_time = time.time()
        response = authenticated_api_client.get('/api/clients/')
        end_time = time.time()
        
        response_time = end_time - start_time
        
        # API deve responder em menos de 2 segundos
        assert response_time < 2.0, f"API muito lenta: {response_time:.2f}s"
        self.assert_response_success(response)
    
    @pytest.mark.django_db
    def test_bulk_operations(self, authenticated_api_client):
        """Teste de operações em lote"""
        # Criar múltiplos clientes
        clients_data = []
        for i in range(10):
            clients_data.append({
                "name": f"Cliente Bulk {i}",
                "email": f"bulk{i}@test.com",
                "phone": f"(11) 9999-{i:04d}"
            })
        
        # Testar criação em lote (se suportado)
        start_time = time.time()
        
        for client_data in clients_data:
            response = authenticated_api_client.post('/api/clients/', client_data)
            self.assert_response_success(response)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Deve processar 10 clientes em menos de 10 segundos
        assert total_time < 10.0, f"Operações em lote muito lentas: {total_time:.2f}s"

