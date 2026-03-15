import pytest
import os
from playwright.sync_api import sync_playwright

STAGING_BASE_URL = os.getenv('STAGING_BASE_URL', 'http://localhost:8080')

@pytest.fixture(scope="session")
def browser_context():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        yield context
        browser.close()

def test_admin_login_success(browser_context):
    """Teste de login bem-sucedido do administrador usando Playwright"""
    page = browser_context.new_page()
    
    # Navegar para página de login
    page.goto(f"{STAGING_BASE_URL}/admin/login/")
    
    # Preencher formulário
    page.fill('input[name="username"]', 'admin')
    page.fill('input[name="password"]', 'staging123')
    
    # Clicar no botão de login
    page.click('input[type="submit"]')
    
    # Verificar se login foi bem-sucedido
    assert "Site administration" in page.content()
    page.close()

def test_frontend_loads(browser_context):
    """Teste se o frontend React carrega corretamente usando Playwright"""
    page = browser_context.new_page()
    
    # Navegar para o frontend
    page.goto(STAGING_BASE_URL)
    
    # Aguardar o elemento root do React
    root = page.wait_for_selector('#root', timeout=15000)
    assert root is not None
    
    # Verificar erro no console (opcional, mas bom pra saúde da app)
    page.close()

def test_create_client_flow(browser_context):
    """Teste de fluxo de criação de cliente via Admin"""
    page = browser_context.new_page()
    
    # Login
    page.goto(f"{STAGING_BASE_URL}/admin/login/")
    page.fill('input[name="username"]', 'admin')
    page.fill('input[name="password"]', 'staging123')
    page.click('input[type="submit"]')
    
    # Navegar para adicionar cliente
    page.goto(f"{STAGING_BASE_URL}/admin/clients/client/add/")
    
    # Preencher dados
    page.fill('input[name="name"]', 'Cliente Playwright Test')
    page.fill('input[name="email"]', 'playwright@test.com')
    page.fill('input[name="phone"]', '(11) 98888-7777')
    page.fill('input[name="address"]', 'Rua Playwright, 456')
    
    # Salvar
    page.click('input[name="_save"]')
    
    # Verificar mensagem de sucesso
    assert "was added successfully" in page.content()
    page.close()
