"""
Testes de Carga e Performance do ProteticFlow usando Locust
"""

from locust import HttpUser, task, between
import random
import json
import time
from datetime import datetime

class ProteticFlowUser(HttpUser):
    """Usuário simulado para testes de carga"""
    
    wait_time = between(1, 3)  # Aguardar 1-3 segundos entre requests
    
    def on_start(self):
        """Executado quando usuário inicia"""
        self.login()
        self.client_id = None
        self.job_id = None
        self.material_id = None
    
    def login(self):
        """Fazer login no sistema"""
        # Tentar login via API
        login_data = {
            "username": "admin",
            "password": "staging123"
        }
        
        response = self.client.post("/api/auth/login/", json=login_data)
        
        if response.status_code == 200:
            # Extrair token se disponível
            try:
                token = response.json().get('token') or response.json().get('access')
                if token:
                    self.client.headers.update({'Authorization': f'Bearer {token}'})
            except:
                pass
        
        # Fallback: login via Django admin
        self.client.get("/admin/login/")
        
        csrf_token = self.get_csrf_token()
        
        login_data = {
            "username": "admin",
            "password": "staging123",
            "csrfmiddlewaretoken": csrf_token,
            "next": "/admin/"
        }
        
        self.client.post("/admin/login/", data=login_data)
    
    def get_csrf_token(self):
        """Obter token CSRF"""
        response = self.client.get("/admin/login/")
        try:
            # Extrair CSRF token do HTML
            import re
            csrf_match = re.search(r'name="csrfmiddlewaretoken" value="([^"]*)"', response.text)
            return csrf_match.group(1) if csrf_match else ""
        except:
            return ""
    
    @task(3)
    def view_homepage(self):
        """Visualizar página inicial"""
        self.client.get("/")
    
    @task(2)
    def view_admin_dashboard(self):
        """Visualizar dashboard administrativo"""
        self.client.get("/admin/")
    
    @task(4)
    def list_clients(self):
        """Listar clientes"""
        # Via API
        response = self.client.get("/api/clients/")
        
        # Via admin
        self.client.get("/admin/clients/client/")
    
    @task(3)
    def list_jobs(self):
        """Listar trabalhos"""
        # Via API
        self.client.get("/api/jobs/")
        
        # Via admin
        self.client.get("/admin/jobs/job/")
    
    @task(2)
    def list_materials(self):
        """Listar materiais"""
        # Via API
        self.client.get("/api/materials/")
        
        # Via admin
        self.client.get("/admin/materials/material/")
    
    @task(1)
    def create_client(self):
        """Criar cliente"""
        client_data = {
            "name": f"Cliente Load Test {random.randint(1000, 9999)}",
            "email": f"loadtest{random.randint(1000, 9999)}@test.com",
            "phone": f"(11) 9999-{random.randint(1000, 9999)}",
            "address": f"Rua Load Test, {random.randint(1, 999)}"
        }
        
        response = self.client.post("/api/clients/", json=client_data)
        
        if response.status_code in [200, 201]:
            try:
                self.client_id = response.json().get('id')
            except:
                pass
    
    @task(1)
    def create_job(self):
        """Criar trabalho"""
        if not self.client_id:
            self.create_client()
        
        if self.client_id:
            job_data = {
                "title": f"Trabalho Load Test {random.randint(1000, 9999)}",
                "description": "Trabalho criado durante teste de carga",
                "client": self.client_id,
                "price": f"{random.uniform(100, 1000):.2f}",
                "status": "pending"
            }
            
            response = self.client.post("/api/jobs/", json=job_data)
            
            if response.status_code in [200, 201]:
                try:
                    self.job_id = response.json().get('id')
                except:
                    pass
    
    @task(1)
    def create_material(self):
        """Criar material"""
        material_data = {
            "name": f"Material Load Test {random.randint(1000, 9999)}",
            "description": "Material criado durante teste de carga",
            "unit_price": f"{random.uniform(10, 100):.2f}",
            "stock_quantity": random.randint(1, 100)
        }
        
        response = self.client.post("/api/materials/", json=material_data)
        
        if response.status_code in [200, 201]:
            try:
                self.material_id = response.json().get('id')
            except:
                pass
    
    @task(2)
    def update_job_status(self):
        """Atualizar status de trabalho"""
        if self.job_id:
            statuses = ['pending', 'in_progress', 'completed', 'delivered']
            new_status = random.choice(statuses)
            
            update_data = {"status": new_status}
            
            self.client.patch(f"/api/jobs/{self.job_id}/", json=update_data)
    
    @task(1)
    def search_clients(self):
        """Buscar clientes"""
        search_terms = ["test", "cliente", "dental", "clinic"]
        search_term = random.choice(search_terms)
        
        self.client.get(f"/api/clients/?search={search_term}")
    
    @task(1)
    def view_client_detail(self):
        """Visualizar detalhes de cliente"""
        if self.client_id:
            self.client.get(f"/api/clients/{self.client_id}/")
            self.client.get(f"/admin/clients/client/{self.client_id}/change/")
    
    @task(1)
    def view_job_detail(self):
        """Visualizar detalhes de trabalho"""
        if self.job_id:
            self.client.get(f"/api/jobs/{self.job_id}/")
            self.client.get(f"/admin/jobs/job/{self.job_id}/change/")
    
    @task(1)
    def static_files(self):
        """Acessar arquivos estáticos"""
        static_files = [
            "/static/admin/css/base.css",
            "/static/admin/js/core.js",
            "/static/admin/img/icon-addlink.svg"
        ]
        
        for static_file in static_files:
            self.client.get(static_file)

class AdminUser(HttpUser):
    """Usuário administrativo para testes mais intensivos"""
    
    wait_time = between(0.5, 2)
    weight = 1  # Menos usuários admin
    
    def on_start(self):
        self.login()
    
    def login(self):
        """Login como admin"""
        self.client.get("/admin/login/")
        
        csrf_token = self.get_csrf_token()
        
        login_data = {
            "username": "admin",
            "password": "staging123",
            "csrfmiddlewaretoken": csrf_token,
            "next": "/admin/"
        }
        
        self.client.post("/admin/login/", data=login_data)
    
    def get_csrf_token(self):
        """Obter token CSRF"""
        response = self.client.get("/admin/login/")
        try:
            import re
            csrf_match = re.search(r'name="csrfmiddlewaretoken" value="([^"]*)"', response.text)
            return csrf_match.group(1) if csrf_match else ""
        except:
            return ""
    
    @task(5)
    def admin_dashboard(self):
        """Dashboard administrativo"""
        self.client.get("/admin/")
    
    @task(3)
    def bulk_operations(self):
        """Operações em lote"""
        # Listar muitos itens
        self.client.get("/admin/clients/client/?all=")
        self.client.get("/admin/jobs/job/?all=")
        self.client.get("/admin/materials/material/?all=")
    
    @task(2)
    def reports_and_analytics(self):
        """Relatórios e analytics"""
        # Simular acesso a relatórios
        self.client.get("/admin/clients/client/?o=1")  # Ordenar por nome
        self.client.get("/admin/jobs/job/?status__exact=completed")  # Filtrar por status
        self.client.get("/admin/materials/material/?unit_price__gte=50")  # Filtrar por preço
    
    @task(1)
    def export_data(self):
        """Exportar dados"""
        # Simular exportação
        self.client.get("/admin/clients/client/export/")
        self.client.get("/admin/jobs/job/export/")

class APIUser(HttpUser):
    """Usuário focado apenas em APIs"""
    
    wait_time = between(0.1, 1)
    weight = 2  # Mais usuários API
    
    def on_start(self):
        self.api_login()
    
    def api_login(self):
        """Login via API"""
        login_data = {
            "username": "admin",
            "password": "staging123"
        }
        
        response = self.client.post("/api/auth/login/", json=login_data)
        
        if response.status_code == 200:
            try:
                token = response.json().get('token') or response.json().get('access')
                if token:
                    self.client.headers.update({'Authorization': f'Bearer {token}'})
            except:
                pass
    
    @task(10)
    def api_health_check(self):
        """Health check da API"""
        self.client.get("/api/health/")
    
    @task(8)
    def api_list_endpoints(self):
        """Listar via API"""
        endpoints = ["/api/clients/", "/api/jobs/", "/api/materials/"]
        endpoint = random.choice(endpoints)
        self.client.get(endpoint)
    
    @task(3)
    def api_pagination(self):
        """Testar paginação"""
        self.client.get("/api/clients/?page=1&page_size=10")
        self.client.get("/api/jobs/?page=1&page_size=20")
    
    @task(2)
    def api_filtering(self):
        """Testar filtros"""
        self.client.get("/api/jobs/?status=pending")
        self.client.get("/api/materials/?unit_price__gte=25")
    
    @task(1)
    def api_create_operations(self):
        """Operações de criação via API"""
        # Criar cliente
        client_data = {
            "name": f"API Client {random.randint(1000, 9999)}",
            "email": f"api{random.randint(1000, 9999)}@test.com",
            "phone": f"(11) 9999-{random.randint(1000, 9999)}"
        }
        
        self.client.post("/api/clients/", json=client_data)

class MobileUser(HttpUser):
    """Usuário mobile simulado"""
    
    wait_time = between(2, 5)  # Mobile users são mais lentos
    weight = 3  # Muitos usuários mobile
    
    def on_start(self):
        # Simular user agent mobile
        self.client.headers.update({
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        })
    
    @task(10)
    def mobile_homepage(self):
        """Página inicial mobile"""
        self.client.get("/")
    
    @task(5)
    def mobile_navigation(self):
        """Navegação mobile"""
        # Simular navegação típica de mobile
        self.client.get("/")
        time.sleep(1)  # Usuário lendo
        self.client.get("/admin/")
    
    @task(2)
    def mobile_forms(self):
        """Formulários mobile"""
        # Acessar formulários (mais lento em mobile)
        self.client.get("/admin/clients/client/add/")
        time.sleep(2)  # Usuário preenchendo formulário
    
    @task(1)
    def mobile_images_and_media(self):
        """Carregar imagens e media"""
        # Simular carregamento de recursos pesados
        self.client.get("/static/admin/img/icon-addlink.svg")
        self.client.get("/static/admin/css/base.css")

# Configurações de teste personalizadas
class StressTestUser(HttpUser):
    """Usuário para teste de stress"""
    
    wait_time = between(0.1, 0.5)  # Muito rápido
    weight = 1
    
    def on_start(self):
        self.login()
    
    def login(self):
        login_data = {
            "username": "admin",
            "password": "staging123"
        }
        self.client.post("/api/auth/login/", json=login_data)
    
    @task(20)
    def rapid_api_calls(self):
        """Chamadas rápidas de API"""
        endpoints = [
            "/api/clients/",
            "/api/jobs/",
            "/api/materials/",
            "/api/health/"
        ]
        
        for endpoint in endpoints:
            self.client.get(endpoint)
    
    @task(10)
    def concurrent_operations(self):
        """Operações concorrentes"""
        # Simular múltiplas operações simultâneas
        import threading
        
        def api_call(endpoint):
            self.client.get(endpoint)
        
        threads = []
        endpoints = ["/api/clients/", "/api/jobs/", "/api/materials/"]
        
        for endpoint in endpoints:
            thread = threading.Thread(target=api_call, args=(endpoint,))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()

# Configuração para diferentes cenários de teste
if __name__ == "__main__":
    # Este arquivo pode ser executado diretamente com Locust
    # locust -f test_load_testing.py --host=http://localhost:8080
    pass

