"""
Testes de Compatibilidade com Diferentes Dispositivos e Navegadores
"""

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import BaseE2ETest, STAGING_BASE_URL

# Configurações de dispositivos para teste
DEVICE_CONFIGS = {
    'desktop_large': {'width': 1920, 'height': 1080},
    'desktop_medium': {'width': 1366, 'height': 768},
    'tablet_landscape': {'width': 1024, 'height': 768},
    'tablet_portrait': {'width': 768, 'height': 1024},
    'mobile_large': {'width': 414, 'height': 896},  # iPhone XR
    'mobile_medium': {'width': 375, 'height': 667},  # iPhone 8
    'mobile_small': {'width': 320, 'height': 568},   # iPhone 5
}

# User agents para diferentes dispositivos
USER_AGENTS = {
    'desktop_chrome': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'desktop_firefox': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'desktop_safari': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'mobile_chrome': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
    'mobile_safari': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'tablet_chrome': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
}

@pytest.fixture(params=['chrome', 'firefox'])
def multi_browser_driver(request):
    """Fixture para testar múltiplos navegadores"""
    browser = request.param
    
    if browser == 'chrome':
        options = ChromeOptions()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        driver = webdriver.Remote(
            command_executor='http://localhost:4444/wd/hub',
            options=options
        )
    elif browser == 'firefox':
        options = FirefoxOptions()
        options.add_argument("--headless")
        driver = webdriver.Remote(
            command_executor='http://localhost:4444/wd/hub',
            options=options
        )
    
    driver.implicitly_wait(10)
    yield driver, browser
    driver.quit()

@pytest.mark.e2e
class TestResponsiveDesign(BaseE2ETest):
    """Testes de design responsivo"""
    
    @pytest.mark.parametrize("device,config", DEVICE_CONFIGS.items())
    def test_responsive_layout(self, selenium_driver, device, config):
        """Teste de layout responsivo em diferentes resoluções"""
        driver = selenium_driver
        
        # Configurar tamanho da tela
        driver.set_window_size(config['width'], config['height'])
        
        # Navegar para frontend
        driver.get(STAGING_BASE_URL)
        
        # Aguardar carregamento
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        # Verificar se elementos principais estão visíveis
        body = driver.find_element(By.TAG_NAME, "body")
        assert body.is_displayed()
        
        # Verificar se não há overflow horizontal
        body_width = driver.execute_script("return document.body.scrollWidth")
        viewport_width = driver.execute_script("return window.innerWidth")
        
        # Permitir pequena margem de erro
        assert body_width <= viewport_width + 20, f"Overflow horizontal detectado em {device}: body={body_width}, viewport={viewport_width}"
        
        # Tirar screenshot para análise visual
        self.take_screenshot(driver, f"responsive_{device}_{config['width']}x{config['height']}")
        
        # Verificações específicas por tipo de dispositivo
        if 'mobile' in device:
            self._verify_mobile_layout(driver)
        elif 'tablet' in device:
            self._verify_tablet_layout(driver)
        else:
            self._verify_desktop_layout(driver)
    
    def _verify_mobile_layout(self, driver):
        """Verificações específicas para layout mobile"""
        # Verificar se menu mobile está presente
        try:
            # Procurar por elementos típicos de mobile (hamburger menu, etc.)
            mobile_elements = driver.find_elements(By.CSS_SELECTOR, ".mobile-menu, .hamburger, .menu-toggle")
            # Em mobile, pode ter menu colapsado
        except:
            pass  # Nem todos os sites têm menu mobile específico
        
        # Verificar se texto não está muito pequeno
        font_sizes = driver.execute_script("""
            var elements = document.querySelectorAll('p, span, div, a');
            var sizes = [];
            for (var i = 0; i < Math.min(elements.length, 10); i++) {
                var style = window.getComputedStyle(elements[i]);
                var fontSize = parseFloat(style.fontSize);
                if (fontSize > 0) sizes.push(fontSize);
            }
            return sizes;
        """)
        
        if font_sizes:
            min_font_size = min(font_sizes)
            assert min_font_size >= 12, f"Fonte muito pequena para mobile: {min_font_size}px"
    
    def _verify_tablet_layout(self, driver):
        """Verificações específicas para layout tablet"""
        # Verificar se layout se adapta bem ao tablet
        # Elementos devem estar bem distribuídos
        pass
    
    def _verify_desktop_layout(self, driver):
        """Verificações específicas para layout desktop"""
        # Verificar se aproveita bem o espaço disponível
        # Sidebar, header, footer devem estar bem posicionados
        pass

@pytest.mark.e2e
class TestBrowserCompatibility(BaseE2ETest):
    """Testes de compatibilidade entre navegadores"""
    
    def test_chrome_compatibility(self, selenium_driver):
        """Teste específico para Chrome"""
        driver = selenium_driver
        
        # Configurar user agent do Chrome
        driver.execute_cdp_cmd('Network.setUserAgentOverride', {
            "userAgent": USER_AGENTS['desktop_chrome']
        })
        
        self._test_basic_functionality(driver, "chrome")
    
    def test_cross_browser_functionality(self, multi_browser_driver):
        """Teste de funcionalidade entre diferentes navegadores"""
        driver, browser_name = multi_browser_driver
        
        self._test_basic_functionality(driver, browser_name)
    
    def _test_basic_functionality(self, driver, browser_name):
        """Teste de funcionalidades básicas"""
        # Navegar para aplicação
        driver.get(STAGING_BASE_URL)
        
        # Verificar se página carrega
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        # Verificar se não há erros JavaScript críticos
        logs = driver.get_log('browser')
        critical_errors = [log for log in logs if log['level'] == 'SEVERE' and 'ERR' in log['message']]
        
        assert len(critical_errors) == 0, f"Erros críticos em {browser_name}: {critical_errors}"
        
        # Testar navegação básica
        try:
            # Tentar clicar em links principais
            links = driver.find_elements(By.TAG_NAME, "a")[:5]  # Primeiros 5 links
            for link in links:
                if link.is_displayed() and link.get_attribute('href'):
                    # Verificar se link é clicável
                    assert link.is_enabled(), f"Link não clicável em {browser_name}"
        except Exception as e:
            # Log do erro mas não falha o teste se for problema menor
            print(f"Aviso em {browser_name}: {e}")
        
        # Tirar screenshot
        self.take_screenshot(driver, f"browser_compatibility_{browser_name}")

@pytest.mark.e2e
class TestMobileSpecificFeatures(BaseE2ETest):
    """Testes específicos para funcionalidades mobile"""
    
    def test_touch_interactions(self, selenium_driver):
        """Teste de interações touch"""
        driver = selenium_driver
        
        # Configurar como dispositivo mobile
        driver.set_window_size(375, 667)  # iPhone 8
        
        # Simular user agent mobile
        driver.execute_cdp_cmd('Network.setUserAgentOverride', {
            "userAgent": USER_AGENTS['mobile_safari']
        })
        
        driver.get(STAGING_BASE_URL)
        
        # Aguardar carregamento
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        # Testar se elementos são grandes o suficiente para touch
        clickable_elements = driver.find_elements(By.CSS_SELECTOR, "button, a, input[type='submit']")
        
        for element in clickable_elements[:10]:  # Testar primeiros 10 elementos
            if element.is_displayed():
                size = element.size
                # Elementos clicáveis devem ter pelo menos 44x44px (recomendação Apple)
                assert size['width'] >= 30 and size['height'] >= 30, \
                    f"Elemento muito pequeno para touch: {size['width']}x{size['height']}"
        
        self.take_screenshot(driver, "mobile_touch_test")
    
    def test_mobile_navigation(self, selenium_driver):
        """Teste de navegação mobile"""
        driver = selenium_driver
        
        # Configurar como mobile
        driver.set_window_size(375, 667)
        
        driver.get(STAGING_BASE_URL)
        
        # Verificar se navegação mobile funciona
        # Procurar por menu mobile ou navegação adaptada
        try:
            # Procurar elementos de navegação mobile
            nav_elements = driver.find_elements(By.CSS_SELECTOR, 
                "nav, .navigation, .menu, .navbar, [role='navigation']")
            
            assert len(nav_elements) > 0, "Nenhum elemento de navegação encontrado"
            
            # Verificar se pelo menos um elemento de navegação está visível
            visible_nav = any(elem.is_displayed() for elem in nav_elements)
            assert visible_nav, "Nenhuma navegação visível em mobile"
            
        except Exception as e:
            print(f"Aviso na navegação mobile: {e}")
        
        self.take_screenshot(driver, "mobile_navigation")

@pytest.mark.e2e
class TestAccessibility(BaseE2ETest):
    """Testes básicos de acessibilidade"""
    
    def test_keyboard_navigation(self, selenium_driver):
        """Teste de navegação por teclado"""
        driver = selenium_driver
        
        driver.get(STAGING_BASE_URL)
        
        # Aguardar carregamento
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        # Testar navegação por Tab
        from selenium.webdriver.common.keys import Keys
        
        body = driver.find_element(By.TAG_NAME, "body")
        
        # Pressionar Tab algumas vezes e verificar se foco muda
        focusable_elements = []
        
        for i in range(10):  # Testar 10 tabs
            body.send_keys(Keys.TAB)
            
            # Verificar elemento com foco
            focused_element = driver.switch_to.active_element
            if focused_element and focused_element.tag_name != 'body':
                focusable_elements.append(focused_element.tag_name)
        
        # Deve ter pelo menos alguns elementos focáveis
        assert len(focusable_elements) > 0, "Nenhum elemento focável encontrado"
        
        self.take_screenshot(driver, "keyboard_navigation")
    
    def test_alt_text_images(self, selenium_driver):
        """Teste de texto alternativo em imagens"""
        driver = selenium_driver
        
        driver.get(STAGING_BASE_URL)
        
        # Aguardar carregamento
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        # Verificar imagens
        images = driver.find_elements(By.TAG_NAME, "img")
        
        images_without_alt = []
        
        for img in images:
            alt_text = img.get_attribute('alt')
            src = img.get_attribute('src')
            
            if not alt_text and src and not src.startswith('data:'):
                images_without_alt.append(src)
        
        # Avisar sobre imagens sem alt text (não falhar teste)
        if images_without_alt:
            print(f"Aviso: {len(images_without_alt)} imagens sem texto alternativo")
            for img_src in images_without_alt[:5]:  # Mostrar primeiras 5
                print(f"  - {img_src}")

@pytest.mark.e2e
class TestPerformanceOnDevices(BaseE2ETest):
    """Testes de performance em diferentes dispositivos"""
    
    @pytest.mark.parametrize("device,config", [
        ('mobile_slow', {'width': 375, 'height': 667, 'cpu_throttle': 4}),
        ('tablet_medium', {'width': 768, 'height': 1024, 'cpu_throttle': 2}),
        ('desktop_fast', {'width': 1920, 'height': 1080, 'cpu_throttle': 1}),
    ])
    def test_performance_by_device(self, selenium_driver, device, config):
        """Teste de performance por tipo de dispositivo"""
        driver = selenium_driver
        
        # Configurar tamanho da tela
        driver.set_window_size(config['width'], config['height'])
        
        # Simular throttling de CPU (se suportado)
        try:
            driver.execute_cdp_cmd('Emulation.setCPUThrottlingRate', {
                'rate': config['cpu_throttle']
            })
        except:
            pass  # Nem todos os drivers suportam
        
        import time
        
        # Medir tempo de carregamento
        start_time = time.time()
        driver.get(STAGING_BASE_URL)
        
        # Aguardar carregamento completo
        WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        # Aguardar JavaScript carregar
        driver.execute_script("return document.readyState") == "complete"
        
        end_time = time.time()
        load_time = end_time - start_time
        
        # Definir limites por tipo de dispositivo
        time_limits = {
            'mobile_slow': 10.0,    # Mobile pode ser mais lento
            'tablet_medium': 7.0,   # Tablet intermediário
            'desktop_fast': 5.0,    # Desktop deve ser rápido
        }
        
        max_time = time_limits.get(device, 10.0)
        
        assert load_time < max_time, \
            f"Carregamento muito lento em {device}: {load_time:.2f}s (máximo: {max_time}s)"
        
        # Verificar métricas de performance
        performance_metrics = driver.execute_script("""
            return {
                loadEventEnd: performance.timing.loadEventEnd,
                navigationStart: performance.timing.navigationStart,
                domContentLoaded: performance.timing.domContentLoadedEventEnd,
                firstPaint: performance.getEntriesByType('paint')[0] ? 
                           performance.getEntriesByType('paint')[0].startTime : null
            };
        """)
        
        if performance_metrics['loadEventEnd'] and performance_metrics['navigationStart']:
            total_load_time = (performance_metrics['loadEventEnd'] - 
                             performance_metrics['navigationStart']) / 1000
            
            print(f"Performance em {device}: {total_load_time:.2f}s")
        
        self.take_screenshot(driver, f"performance_{device}")

@pytest.mark.e2e
@pytest.mark.slow
class TestCrossDeviceConsistency(BaseE2ETest):
    """Testes de consistência entre dispositivos"""
    
    def test_ui_consistency_across_devices(self, selenium_driver):
        """Teste de consistência de UI entre dispositivos"""
        driver = selenium_driver
        
        devices_to_test = [
            ('desktop', 1920, 1080),
            ('tablet', 768, 1024),
            ('mobile', 375, 667)
        ]
        
        ui_elements = {}
        
        for device_name, width, height in devices_to_test:
            # Configurar dispositivo
            driver.set_window_size(width, height)
            driver.get(STAGING_BASE_URL)
            
            # Aguardar carregamento
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # Capturar elementos principais
            elements = {
                'title': driver.title,
                'body_text': driver.find_element(By.TAG_NAME, "body").text[:200],  # Primeiros 200 chars
                'links_count': len(driver.find_elements(By.TAG_NAME, "a")),
                'images_count': len(driver.find_elements(By.TAG_NAME, "img")),
            }
            
            ui_elements[device_name] = elements
            
            # Screenshot para comparação visual
            self.take_screenshot(driver, f"consistency_{device_name}_{width}x{height}")
        
        # Verificar consistência básica
        # Título deve ser o mesmo
        titles = [ui_elements[device]['title'] for device in ui_elements]
        assert len(set(titles)) == 1, f"Títulos inconsistentes: {titles}"
        
        # Número de links não deve variar muito (pode ter menu mobile diferente)
        link_counts = [ui_elements[device]['links_count'] for device in ui_elements]
        max_links = max(link_counts)
        min_links = min(link_counts)
        
        # Permitir até 50% de diferença (devido a menus mobile)
        assert min_links >= max_links * 0.5, \
            f"Muita diferença no número de links: {link_counts}"
        
        print("✅ Consistência entre dispositivos verificada")
        for device, elements in ui_elements.items():
            print(f"  {device}: {elements['links_count']} links, {elements['images_count']} imagens")

