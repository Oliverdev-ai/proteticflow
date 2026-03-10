"""
Configuração base para testes do ProteticFlow
"""

import pytest
import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from apps.clients.models import Client
from apps.jobs.models import Job
from apps.materials.models import Material

# URLs base para testes
STAGING_BASE_URL = os.getenv('STAGING_BASE_URL', 'http://localhost:8080')
API_BASE_URL = f"{STAGING_BASE_URL}/api"

User = get_user_model()

@pytest.fixture(scope="session")
def selenium_driver():
    """Configurar driver Selenium para testes E2E"""
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Executar sem interface gráfica
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--disable-plugins")
    
    # Conectar ao Selenium Grid no container
    driver = webdriver.Remote(
        command_executor='http://localhost:4444/wd/hub',
        options=chrome_options
    )
    
    driver.implicitly_wait(10)
    yield driver
    driver.quit()

@pytest.fixture
def api_client():
    """Cliente para testes de API"""
    return APIClient()

@pytest.fixture
def admin_user():
    """Usuário administrador para testes"""
    return User.objects.create_superuser(
        username='test_admin',
        email='admin@test.com',
        password='test123'
    )

@pytest.fixture
def regular_user():
    """Usuário regular para testes"""
    return User.objects.create_user(
        username='test_user',
        email='user@test.com',
        password='test123'
    )

@pytest.fixture
def test_client():
    """Cliente de teste"""
    return Client.objects.create(
        name='Cliente Teste',
        email='cliente@test.com',
        phone='(11) 99999-9999',
        address='Rua Teste, 123'
    )

@pytest.fixture
def test_material():
    """Material de teste"""
    return Material.objects.create(
        name='Material Teste',
        description='Descrição do material teste',
        unit_price=25.50
    )

@pytest.fixture
def authenticated_api_client(api_client, admin_user):
    """Cliente API autenticado"""
    api_client.force_authenticate(user=admin_user)
    return api_client

class BaseE2ETest:
    """Classe base para testes E2E"""
    
    def login(self, driver, username='admin', password='staging123'):
        """Fazer login no sistema"""
        driver.get(f"{STAGING_BASE_URL}/admin/login/")
        
        username_field = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "username"))
        )
        password_field = driver.find_element(By.NAME, "password")
        
        username_field.send_keys(username)
        password_field.send_keys(password)
        
        login_button = driver.find_element(By.XPATH, "//input[@type='submit']")
        login_button.click()
        
        # Aguardar redirecionamento
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "header"))
        )
    
    def wait_for_element(self, driver, by, value, timeout=10):
        """Aguardar elemento aparecer"""
        return WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((by, value))
        )
    
    def wait_for_clickable(self, driver, by, value, timeout=10):
        """Aguardar elemento ficar clicável"""
        return WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable((by, value))
        )
    
    def take_screenshot(self, driver, name):
        """Tirar screenshot para debugging"""
        timestamp = int(time.time())
        filename = f"/app/test-reports/screenshot_{name}_{timestamp}.png"
        driver.save_screenshot(filename)
        return filename

class BaseAPITest:
    """Classe base para testes de API"""
    
    def assert_response_success(self, response):
        """Verificar se resposta foi bem-sucedida"""
        assert response.status_code in [200, 201], f"Status code: {response.status_code}, Content: {response.content}"
    
    def assert_response_error(self, response, expected_status=400):
        """Verificar se resposta retornou erro esperado"""
        assert response.status_code == expected_status, f"Expected {expected_status}, got {response.status_code}"
    
    def create_test_data(self):
        """Criar dados de teste padrão"""
        # Implementar criação de dados de teste
        pass

# Configurações do pytest
def pytest_configure(config):
    """Configuração do pytest"""
    # Criar diretório para relatórios se não existir
    os.makedirs('/app/test-reports', exist_ok=True)

def pytest_html_report_title(report):
    """Título do relatório HTML"""
    report.title = "ProteticFlow - Relatório de Testes de Staging"

# Markers personalizados
pytest_plugins = [
    "pytest_html",
    "pytest_xdist",
]

# Configurar markers
def pytest_configure(config):
    config.addinivalue_line("markers", "e2e: testes end-to-end")
    config.addinivalue_line("markers", "integration: testes de integração")
    config.addinivalue_line("markers", "performance: testes de performance")
    config.addinivalue_line("markers", "security: testes de segurança")
    config.addinivalue_line("markers", "smoke: testes básicos de funcionamento")
    config.addinivalue_line("markers", "regression: testes de regressão")
    config.addinivalue_line("markers", "slow: testes que demoram mais para executar")

