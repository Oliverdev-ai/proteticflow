"""
Testes End-to-End dos principais fluxos de usuário do ProteticFlow
"""

import pytest
import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException
from conftest import BaseE2ETest, STAGING_BASE_URL

@pytest.mark.e2e
class TestUserAuthentication(BaseE2ETest):
    """Testes de autenticação de usuário"""
    
    def test_admin_login_success(self, selenium_driver):
        """Teste de login bem-sucedido do administrador"""
        driver = selenium_driver
        
        # Navegar para página de login
        driver.get(f"{STAGING_BASE_URL}/admin/login/")
        
        # Verificar se página carregou
        assert "Django administration" in driver.title
        
        # Fazer login
        self.login(driver)
        
        # Verificar se login foi bem-sucedido
        assert "Site administration" in driver.page_source
        self.take_screenshot(driver, "admin_login_success")
    
    def test_admin_login_failure(self, selenium_driver):
        """Teste de login com credenciais inválidas"""
        driver = selenium_driver
        
        driver.get(f"{STAGING_BASE_URL}/admin/login/")
        
        username_field = self.wait_for_element(driver, By.NAME, "username")
        password_field = driver.find_element(By.NAME, "password")
        
        username_field.send_keys("invalid_user")
        password_field.send_keys("invalid_password")
        
        login_button = driver.find_element(By.XPATH, "//input[@type='submit']")
        login_button.click()
        
        # Verificar mensagem de erro
        error_message = self.wait_for_element(driver, By.CLASS_NAME, "errornote")
        assert "Please enter the correct username and password" in error_message.text
        self.take_screenshot(driver, "admin_login_failure")

@pytest.mark.e2e
class TestClientManagement(BaseE2ETest):
    """Testes de gestão de clientes"""
    
    def test_create_client_complete_flow(self, selenium_driver):
        """Teste completo de criação de cliente"""
        driver = selenium_driver
        
        # Login
        self.login(driver)
        
        # Navegar para lista de clientes
        driver.get(f"{STAGING_BASE_URL}/admin/clients/client/")
        
        # Clicar em "Add client"
        add_button = self.wait_for_clickable(driver, By.LINK_TEXT, "Add client")
        add_button.click()
        
        # Preencher formulário
        name_field = self.wait_for_element(driver, By.NAME, "name")
        name_field.send_keys("Cliente Teste E2E")
        
        email_field = driver.find_element(By.NAME, "email")
        email_field.send_keys("cliente.e2e@test.com")
        
        phone_field = driver.find_element(By.NAME, "phone")
        phone_field.send_keys("(11) 99999-8888")
        
        address_field = driver.find_element(By.NAME, "address")
        address_field.send_keys("Rua Teste E2E, 123")
        
        # Salvar
        save_button = driver.find_element(By.NAME, "_save")
        save_button.click()
        
        # Verificar sucesso
        success_message = self.wait_for_element(driver, By.CLASS_NAME, "success")
        assert "was added successfully" in success_message.text
        self.take_screenshot(driver, "client_created")
    
    def test_edit_client(self, selenium_driver):
        """Teste de edição de cliente"""
        driver = selenium_driver
        
        # Login e criar cliente primeiro
        self.login(driver)
        self.test_create_client_complete_flow(driver)
        
        # Navegar para lista de clientes
        driver.get(f"{STAGING_BASE_URL}/admin/clients/client/")
        
        # Clicar no primeiro cliente
        first_client = self.wait_for_clickable(driver, By.XPATH, "//table[@id='result_list']//tr[1]//a")
        first_client.click()
        
        # Editar nome
        name_field = self.wait_for_element(driver, By.NAME, "name")
        name_field.clear()
        name_field.send_keys("Cliente Teste E2E Editado")
        
        # Salvar
        save_button = driver.find_element(By.NAME, "_save")
        save_button.click()
        
        # Verificar sucesso
        success_message = self.wait_for_element(driver, By.CLASS_NAME, "success")
        assert "was changed successfully" in success_message.text
        self.take_screenshot(driver, "client_edited")

@pytest.mark.e2e
class TestJobManagement(BaseE2ETest):
    """Testes de gestão de trabalhos"""
    
    def test_create_job_complete_flow(self, selenium_driver):
        """Teste completo de criação de trabalho"""
        driver = selenium_driver
        
        # Login
        self.login(driver)
        
        # Primeiro criar um cliente
        self.test_create_client_complete_flow(driver)
        
        # Navegar para lista de trabalhos
        driver.get(f"{STAGING_BASE_URL}/admin/jobs/job/")
        
        # Clicar em "Add job"
        add_button = self.wait_for_clickable(driver, By.LINK_TEXT, "Add job")
        add_button.click()
        
        # Preencher formulário
        title_field = self.wait_for_element(driver, By.NAME, "title")
        title_field.send_keys("Prótese Total Superior")
        
        description_field = driver.find_element(By.NAME, "description")
        description_field.send_keys("Prótese total superior em resina acrílica")
        
        # Selecionar cliente
        client_select = Select(driver.find_element(By.NAME, "client"))
        client_select.select_by_index(1)  # Primeiro cliente disponível
        
        # Definir preço
        price_field = driver.find_element(By.NAME, "price")
        price_field.send_keys("850.00")
        
        # Salvar
        save_button = driver.find_element(By.NAME, "_save")
        save_button.click()
        
        # Verificar sucesso
        success_message = self.wait_for_element(driver, By.CLASS_NAME, "success")
        assert "was added successfully" in success_message.text
        self.take_screenshot(driver, "job_created")

@pytest.mark.e2e
class TestMaterialManagement(BaseE2ETest):
    """Testes de gestão de materiais"""
    
    def test_create_material(self, selenium_driver):
        """Teste de criação de material"""
        driver = selenium_driver
        
        # Login
        self.login(driver)
        
        # Navegar para lista de materiais
        driver.get(f"{STAGING_BASE_URL}/admin/materials/material/")
        
        # Clicar em "Add material"
        add_button = self.wait_for_clickable(driver, By.LINK_TEXT, "Add material")
        add_button.click()
        
        # Preencher formulário
        name_field = self.wait_for_element(driver, By.NAME, "name")
        name_field.send_keys("Resina Acrílica Premium")
        
        description_field = driver.find_element(By.NAME, "description")
        description_field.send_keys("Resina acrílica de alta qualidade para próteses")
        
        price_field = driver.find_element(By.NAME, "unit_price")
        price_field.send_keys("45.50")
        
        # Salvar
        save_button = driver.find_element(By.NAME, "_save")
        save_button.click()
        
        # Verificar sucesso
        success_message = self.wait_for_element(driver, By.CLASS_NAME, "success")
        assert "was added successfully" in success_message.text
        self.take_screenshot(driver, "material_created")

@pytest.mark.e2e
class TestFrontendIntegration(BaseE2ETest):
    """Testes de integração com frontend React"""
    
    def test_frontend_loads(self, selenium_driver):
        """Teste se frontend React carrega corretamente"""
        driver = selenium_driver
        
        # Navegar para frontend
        driver.get(STAGING_BASE_URL)
        
        # Aguardar React carregar
        time.sleep(3)
        
        # Verificar se elementos React estão presentes
        try:
            # Procurar por elementos típicos do React
            react_root = self.wait_for_element(driver, By.ID, "root", timeout=15)
            assert react_root is not None
            
            # Verificar se não há erros JavaScript
            logs = driver.get_log('browser')
            errors = [log for log in logs if log['level'] == 'SEVERE']
            assert len(errors) == 0, f"Erros JavaScript encontrados: {errors}"
            
            self.take_screenshot(driver, "frontend_loaded")
            
        except TimeoutException:
            self.take_screenshot(driver, "frontend_load_failed")
            raise AssertionError("Frontend React não carregou corretamente")
    
    def test_api_connectivity(self, selenium_driver):
        """Teste de conectividade com API"""
        driver = selenium_driver
        
        # Testar endpoint de health check
        driver.get(f"{STAGING_BASE_URL}/api/health/")
        
        # Verificar resposta JSON
        page_source = driver.page_source
        assert "status" in page_source or "healthy" in page_source
        self.take_screenshot(driver, "api_health_check")

@pytest.mark.e2e
@pytest.mark.slow
class TestCompleteUserJourney(BaseE2ETest):
    """Teste da jornada completa do usuário"""
    
    def test_complete_workflow(self, selenium_driver):
        """Teste do fluxo completo: cadastro → trabalho → finalização"""
        driver = selenium_driver
        
        # 1. Login
        self.login(driver)
        self.take_screenshot(driver, "journey_01_login")
        
        # 2. Criar cliente
        driver.get(f"{STAGING_BASE_URL}/admin/clients/client/add/")
        
        name_field = self.wait_for_element(driver, By.NAME, "name")
        name_field.send_keys("Cliente Jornada Completa")
        
        email_field = driver.find_element(By.NAME, "email")
        email_field.send_keys("jornada@test.com")
        
        phone_field = driver.find_element(By.NAME, "phone")
        phone_field.send_keys("(11) 99999-7777")
        
        save_button = driver.find_element(By.NAME, "_save")
        save_button.click()
        
        self.take_screenshot(driver, "journey_02_client_created")
        
        # 3. Criar material
        driver.get(f"{STAGING_BASE_URL}/admin/materials/material/add/")
        
        name_field = self.wait_for_element(driver, By.NAME, "name")
        name_field.send_keys("Material Jornada")
        
        description_field = driver.find_element(By.NAME, "description")
        description_field.send_keys("Material para teste de jornada")
        
        price_field = driver.find_element(By.NAME, "unit_price")
        price_field.send_keys("30.00")
        
        save_button = driver.find_element(By.NAME, "_save")
        save_button.click()
        
        self.take_screenshot(driver, "journey_03_material_created")
        
        # 4. Criar trabalho
        driver.get(f"{STAGING_BASE_URL}/admin/jobs/job/add/")
        
        title_field = self.wait_for_element(driver, By.NAME, "title")
        title_field.send_keys("Trabalho Jornada Completa")
        
        description_field = driver.find_element(By.NAME, "description")
        description_field.send_keys("Trabalho para teste de jornada completa")
        
        # Selecionar cliente criado
        client_select = Select(driver.find_element(By.NAME, "client"))
        client_select.select_by_visible_text("Cliente Jornada Completa")
        
        price_field = driver.find_element(By.NAME, "price")
        price_field.send_keys("500.00")
        
        save_button = driver.find_element(By.NAME, "_save")
        save_button.click()
        
        self.take_screenshot(driver, "journey_04_job_created")
        
        # 5. Verificar listagens
        driver.get(f"{STAGING_BASE_URL}/admin/")
        
        # Verificar se todos os itens foram criados
        clients_link = self.wait_for_clickable(driver, By.LINK_TEXT, "Clients")
        clients_link.click()
        
        assert "Cliente Jornada Completa" in driver.page_source
        
        self.take_screenshot(driver, "journey_05_verification")
        
        print("✅ Jornada completa do usuário testada com sucesso!")

