"""
Testes de Validação de Segurança do ProteticFlow
"""

import pytest
import requests
import ssl
import socket
from urllib.parse import urljoin, urlparse
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import BaseE2ETest, STAGING_BASE_URL
import re
import json
import time

class SecurityTester:
    """Classe para testes de segurança"""
    
    def __init__(self, base_url=STAGING_BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.vulnerabilities = []
        self.security_score = 0
    
    def test_https_configuration(self):
        """Testar configuração HTTPS"""
        results = {
            'https_available': False,
            'ssl_certificate_valid': False,
            'ssl_version': None,
            'cipher_suite': None,
            'certificate_info': {},
            'hsts_header': False,
            'secure_cookies': False
        }
        
        # Testar se HTTPS está disponível
        https_url = self.base_url.replace('http://', 'https://')
        
        try:
            response = requests.get(https_url, timeout=10, verify=False)
            results['https_available'] = True
            
            # Verificar headers de segurança
            headers = response.headers
            
            # HSTS
            if 'Strict-Transport-Security' in headers:
                results['hsts_header'] = True
            
            # Cookies seguros
            set_cookies = headers.get('Set-Cookie', '')
            if 'Secure' in set_cookies:
                results['secure_cookies'] = True
                
        except requests.RequestException:
            results['https_available'] = False
        
        # Testar certificado SSL
        if results['https_available']:
            try:
                hostname = urlparse(https_url).hostname
                port = urlparse(https_url).port or 443
                
                context = ssl.create_default_context()
                with socket.create_connection((hostname, port), timeout=10) as sock:
                    with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                        results['ssl_certificate_valid'] = True
                        results['ssl_version'] = ssock.version()
                        results['cipher_suite'] = ssock.cipher()
                        
                        # Informações do certificado
                        cert = ssock.getpeercert()
                        results['certificate_info'] = {
                            'subject': dict(x[0] for x in cert['subject']),
                            'issuer': dict(x[0] for x in cert['issuer']),
                            'version': cert['version'],
                            'serial_number': cert['serialNumber'],
                            'not_before': cert['notBefore'],
                            'not_after': cert['notAfter']
                        }
                        
            except Exception as e:
                results['ssl_certificate_valid'] = False
                results['ssl_error'] = str(e)
        
        return results
    
    def test_security_headers(self):
        """Testar headers de segurança"""
        response = self.session.get(self.base_url)
        headers = response.headers
        
        security_headers = {
            'X-Frame-Options': {
                'present': 'X-Frame-Options' in headers,
                'value': headers.get('X-Frame-Options'),
                'secure': headers.get('X-Frame-Options') in ['DENY', 'SAMEORIGIN']
            },
            'X-Content-Type-Options': {
                'present': 'X-Content-Type-Options' in headers,
                'value': headers.get('X-Content-Type-Options'),
                'secure': headers.get('X-Content-Type-Options') == 'nosniff'
            },
            'X-XSS-Protection': {
                'present': 'X-XSS-Protection' in headers,
                'value': headers.get('X-XSS-Protection'),
                'secure': headers.get('X-XSS-Protection') in ['1; mode=block', '1']
            },
            'Strict-Transport-Security': {
                'present': 'Strict-Transport-Security' in headers,
                'value': headers.get('Strict-Transport-Security'),
                'secure': 'max-age=' in headers.get('Strict-Transport-Security', '')
            },
            'Content-Security-Policy': {
                'present': 'Content-Security-Policy' in headers,
                'value': headers.get('Content-Security-Policy'),
                'secure': 'Content-Security-Policy' in headers
            },
            'Referrer-Policy': {
                'present': 'Referrer-Policy' in headers,
                'value': headers.get('Referrer-Policy'),
                'secure': headers.get('Referrer-Policy') in [
                    'strict-origin-when-cross-origin', 
                    'strict-origin', 
                    'no-referrer'
                ]
            }
        }
        
        # Calcular score de segurança
        secure_headers = sum(1 for h in security_headers.values() if h['secure'])
        total_headers = len(security_headers)
        security_score = (secure_headers / total_headers) * 100
        
        return {
            'headers': security_headers,
            'security_score': security_score,
            'secure_headers_count': secure_headers,
            'total_headers_count': total_headers
        }
    
    def test_authentication_security(self):
        """Testar segurança de autenticação"""
        results = {
            'login_endpoint_secure': False,
            'csrf_protection': False,
            'session_security': False,
            'password_policy': False,
            'brute_force_protection': False
        }
        
        # Testar endpoint de login
        login_url = urljoin(self.base_url, '/admin/login/')
        
        try:
            response = self.session.get(login_url)
            
            # Verificar CSRF token
            if 'csrfmiddlewaretoken' in response.text:
                results['csrf_protection'] = True
            
            # Verificar se login é via HTTPS (em produção)
            if response.url.startswith('https://'):
                results['login_endpoint_secure'] = True
            
            # Testar tentativas de login inválidas
            csrf_token = self._extract_csrf_token(response.text)
            
            # Múltiplas tentativas de login
            for i in range(5):
                login_data = {
                    'username': f'invalid_user_{i}',
                    'password': 'invalid_password',
                    'csrfmiddlewaretoken': csrf_token
                }
                
                login_response = self.session.post(login_url, data=login_data)
                
                # Verificar se há rate limiting ou captcha
                if 'too many' in login_response.text.lower() or \
                   'captcha' in login_response.text.lower() or \
                   login_response.status_code == 429:
                    results['brute_force_protection'] = True
                    break
                
                time.sleep(0.5)
            
            # Verificar cookies de sessão
            cookies = self.session.cookies
            for cookie in cookies:
                if cookie.name in ['sessionid', 'csrftoken']:
                    if cookie.secure and cookie.has_nonstandard_attr('HttpOnly'):
                        results['session_security'] = True
                        break
                        
        except Exception as e:
            print(f"Erro no teste de autenticação: {e}")
        
        return results
    
    def _extract_csrf_token(self, html_content):
        """Extrair token CSRF do HTML"""
        match = re.search(r'name="csrfmiddlewaretoken" value="([^"]*)"', html_content)
        return match.group(1) if match else ""
    
    def test_input_validation(self):
        """Testar validação de entrada"""
        results = {
            'sql_injection_protected': True,
            'xss_protected': True,
            'file_upload_secure': True,
            'input_sanitization': True
        }
        
        # Payloads de teste
        sql_payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "1' UNION SELECT * FROM users --"
        ]
        
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>"
        ]
        
        # Testar endpoints de API
        api_endpoints = [
            '/api/clients/',
            '/api/jobs/',
            '/api/materials/'
        ]
        
        for endpoint in api_endpoints:
            # Testar SQL injection
            for payload in sql_payloads:
                try:
                    response = self.session.get(f"{self.base_url}{endpoint}?search={payload}")
                    
                    # Verificar se há erro de SQL na resposta
                    if any(error in response.text.lower() for error in [
                        'sql', 'mysql', 'postgresql', 'sqlite', 'syntax error'
                    ]):
                        results['sql_injection_protected'] = False
                        self.vulnerabilities.append({
                            'type': 'SQL Injection',
                            'endpoint': endpoint,
                            'payload': payload
                        })
                        
                except Exception:
                    pass
            
            # Testar XSS
            for payload in xss_payloads:
                try:
                    # POST request com payload
                    test_data = {
                        'name': payload,
                        'description': payload
                    }
                    
                    response = self.session.post(f"{self.base_url}{endpoint}", json=test_data)
                    
                    # Verificar se payload foi refletido sem sanitização
                    if payload in response.text and response.headers.get('content-type', '').startswith('text/html'):
                        results['xss_protected'] = False
                        self.vulnerabilities.append({
                            'type': 'XSS',
                            'endpoint': endpoint,
                            'payload': payload
                        })
                        
                except Exception:
                    pass
        
        return results
    
    def test_authorization_controls(self):
        """Testar controles de autorização"""
        results = {
            'admin_access_protected': True,
            'api_authentication_required': True,
            'privilege_escalation_protected': True,
            'direct_object_references_secure': True
        }
        
        # Testar acesso sem autenticação
        protected_endpoints = [
            '/admin/',
            '/admin/clients/client/',
            '/admin/jobs/job/',
            '/api/clients/',
            '/api/jobs/'
        ]
        
        # Criar sessão sem autenticação
        unauth_session = requests.Session()
        
        for endpoint in protected_endpoints:
            try:
                response = unauth_session.get(f"{self.base_url}{endpoint}")
                
                # Verificar se endpoint está protegido
                if response.status_code == 200 and 'login' not in response.url.lower():
                    if '/admin/' in endpoint:
                        results['admin_access_protected'] = False
                    elif '/api/' in endpoint:
                        results['api_authentication_required'] = False
                    
                    self.vulnerabilities.append({
                        'type': 'Unauthorized Access',
                        'endpoint': endpoint,
                        'status_code': response.status_code
                    })
                    
            except Exception:
                pass
        
        # Testar referências diretas a objetos
        try:
            # Tentar acessar objetos por ID
            object_endpoints = [
                '/api/clients/999999/',
                '/api/jobs/999999/',
                '/admin/clients/client/999999/change/'
            ]
            
            for endpoint in object_endpoints:
                response = unauth_session.get(f"{self.base_url}{endpoint}")
                
                # Não deve retornar dados sensíveis
                if response.status_code == 200:
                    results['direct_object_references_secure'] = False
                    self.vulnerabilities.append({
                        'type': 'Insecure Direct Object Reference',
                        'endpoint': endpoint
                    })
                    
        except Exception:
            pass
        
        return results
    
    def test_data_exposure(self):
        """Testar exposição de dados sensíveis"""
        results = {
            'debug_mode_disabled': True,
            'error_messages_safe': True,
            'sensitive_data_protected': True,
            'directory_listing_disabled': True
        }
        
        # Testar modo debug
        response = self.session.get(self.base_url)
        
        # Verificar se modo debug está ativo
        debug_indicators = [
            'django.core.exceptions',
            'traceback',
            'debug=true',
            'development mode'
        ]
        
        if any(indicator in response.text.lower() for indicator in debug_indicators):
            results['debug_mode_disabled'] = False
            self.vulnerabilities.append({
                'type': 'Debug Mode Enabled',
                'details': 'Debug information exposed'
            })
        
        # Testar endpoints que podem expor informações
        info_endpoints = [
            '/.env',
            '/settings.py',
            '/config/',
            '/admin/settings/',
            '/api/debug/',
            '/static/',
            '/media/'
        ]
        
        for endpoint in info_endpoints:
            try:
                response = self.session.get(f"{self.base_url}{endpoint}")
                
                if response.status_code == 200:
                    # Verificar se há listagem de diretório
                    if 'index of' in response.text.lower() or \
                       '<title>Directory listing' in response.text.lower():
                        results['directory_listing_disabled'] = False
                        self.vulnerabilities.append({
                            'type': 'Directory Listing',
                            'endpoint': endpoint
                        })
                    
                    # Verificar exposição de arquivos sensíveis
                    sensitive_patterns = [
                        'secret_key',
                        'password',
                        'database_url',
                        'api_key'
                    ]
                    
                    if any(pattern in response.text.lower() for pattern in sensitive_patterns):
                        results['sensitive_data_protected'] = False
                        self.vulnerabilities.append({
                            'type': 'Sensitive Data Exposure',
                            'endpoint': endpoint
                        })
                        
            except Exception:
                pass
        
        return results
    
    def generate_security_report(self):
        """Gerar relatório completo de segurança"""
        print("🔒 Iniciando análise de segurança...")
        
        report = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'base_url': self.base_url,
            'tests': {},
            'vulnerabilities': [],
            'overall_score': 0,
            'recommendations': []
        }
        
        # Executar todos os testes
        print("🔐 Testando configuração HTTPS...")
        report['tests']['https'] = self.test_https_configuration()
        
        print("📋 Testando headers de segurança...")
        report['tests']['security_headers'] = self.test_security_headers()
        
        print("🔑 Testando segurança de autenticação...")
        report['tests']['authentication'] = self.test_authentication_security()
        
        print("🛡️ Testando validação de entrada...")
        report['tests']['input_validation'] = self.test_input_validation()
        
        print("👤 Testando controles de autorização...")
        report['tests']['authorization'] = self.test_authorization_controls()
        
        print("📊 Testando exposição de dados...")
        report['tests']['data_exposure'] = self.test_data_exposure()
        
        # Compilar vulnerabilidades
        report['vulnerabilities'] = self.vulnerabilities
        
        # Calcular score geral
        scores = []
        
        # Score HTTPS
        https_score = 0
        if report['tests']['https']['https_available']:
            https_score += 30
        if report['tests']['https']['ssl_certificate_valid']:
            https_score += 20
        if report['tests']['https']['hsts_header']:
            https_score += 10
        scores.append(https_score)
        
        # Score headers
        scores.append(report['tests']['security_headers']['security_score'])
        
        # Score autenticação
        auth_score = sum([
            20 if report['tests']['authentication']['csrf_protection'] else 0,
            20 if report['tests']['authentication']['session_security'] else 0,
            10 if report['tests']['authentication']['brute_force_protection'] else 0
        ])
        scores.append(auth_score)
        
        # Score validação
        validation_score = sum([
            25 if report['tests']['input_validation']['sql_injection_protected'] else 0,
            25 if report['tests']['input_validation']['xss_protected'] else 0
        ])
        scores.append(validation_score)
        
        # Score autorização
        auth_controls_score = sum([
            25 if report['tests']['authorization']['admin_access_protected'] else 0,
            25 if report['tests']['authorization']['api_authentication_required'] else 0
        ])
        scores.append(auth_controls_score)
        
        # Score exposição de dados
        data_score = sum([
            30 if report['tests']['data_exposure']['debug_mode_disabled'] else 0,
            20 if report['tests']['data_exposure']['sensitive_data_protected'] else 0
        ])
        scores.append(data_score)
        
        # Score geral
        report['overall_score'] = sum(scores) / len(scores) if scores else 0
        
        # Gerar recomendações
        report['recommendations'] = self._generate_recommendations(report)
        
        return report
    
    def _generate_recommendations(self, report):
        """Gerar recomendações de segurança"""
        recommendations = []
        
        # HTTPS
        if not report['tests']['https']['https_available']:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'HTTPS',
                'issue': 'HTTPS não está disponível',
                'recommendation': 'Configurar certificado SSL/TLS e redirecionar HTTP para HTTPS'
            })
        
        if not report['tests']['https']['hsts_header']:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'HTTPS',
                'issue': 'Header HSTS ausente',
                'recommendation': 'Adicionar header Strict-Transport-Security'
            })
        
        # Headers de segurança
        headers = report['tests']['security_headers']['headers']
        for header_name, header_info in headers.items():
            if not header_info['secure']:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'Security Headers',
                    'issue': f'Header {header_name} ausente ou inseguro',
                    'recommendation': f'Configurar header {header_name} adequadamente'
                })
        
        # Autenticação
        auth = report['tests']['authentication']
        if not auth['csrf_protection']:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'Authentication',
                'issue': 'Proteção CSRF ausente',
                'recommendation': 'Implementar tokens CSRF em formulários'
            })
        
        if not auth['brute_force_protection']:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'Authentication',
                'issue': 'Proteção contra força bruta ausente',
                'recommendation': 'Implementar rate limiting para tentativas de login'
            })
        
        # Validação de entrada
        validation = report['tests']['input_validation']
        if not validation['sql_injection_protected']:
            recommendations.append({
                'priority': 'CRITICAL',
                'category': 'Input Validation',
                'issue': 'Vulnerabilidade de SQL Injection detectada',
                'recommendation': 'Implementar prepared statements e validação de entrada'
            })
        
        if not validation['xss_protected']:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'Input Validation',
                'issue': 'Vulnerabilidade XSS detectada',
                'recommendation': 'Implementar sanitização de entrada e escape de saída'
            })
        
        # Exposição de dados
        data_exp = report['tests']['data_exposure']
        if not data_exp['debug_mode_disabled']:
            recommendations.append({
                'priority': 'CRITICAL',
                'category': 'Data Exposure',
                'issue': 'Modo debug ativo em produção',
                'recommendation': 'Desabilitar modo debug (DEBUG=False)'
            })
        
        return recommendations

@pytest.mark.security
class TestSecurityValidation(BaseE2ETest):
    """Testes de validação de segurança usando Selenium"""
    
    def test_https_redirect(self, selenium_driver):
        """Testar redirecionamento HTTPS"""
        driver = selenium_driver
        
        # Tentar acessar HTTP
        http_url = STAGING_BASE_URL.replace('https://', 'http://')
        driver.get(http_url)
        
        # Verificar se foi redirecionado para HTTPS
        current_url = driver.current_url
        assert current_url.startswith('https://') or 'localhost' in current_url, \
            f"Não foi redirecionado para HTTPS: {current_url}"
        
        self.take_screenshot(driver, "https_redirect_test")
    
    def test_xss_protection_in_forms(self, selenium_driver):
        """Testar proteção XSS em formulários"""
        driver = selenium_driver
        
        # Login
        self.login(driver)
        
        # Navegar para formulário de criação
        driver.get(f"{STAGING_BASE_URL}/admin/clients/client/add/")
        
        # Tentar inserir payload XSS
        xss_payload = "<script>alert('XSS')</script>"
        
        name_field = self.wait_for_element(driver, By.NAME, "name")
        name_field.send_keys(xss_payload)
        
        description_field = driver.find_element(By.NAME, "description") if \
            driver.find_elements(By.NAME, "description") else None
        
        if description_field:
            description_field.send_keys(xss_payload)
        
        # Salvar formulário
        save_button = driver.find_element(By.NAME, "_save")
        save_button.click()
        
        # Verificar se payload foi sanitizado
        page_source = driver.page_source
        assert "<script>" not in page_source, "Payload XSS não foi sanitizado"
        
        self.take_screenshot(driver, "xss_protection_test")
    
    def test_csrf_protection(self, selenium_driver):
        """Testar proteção CSRF"""
        driver = selenium_driver
        
        # Acessar formulário de login
        driver.get(f"{STAGING_BASE_URL}/admin/login/")
        
        # Verificar se token CSRF está presente
        page_source = driver.page_source
        assert "csrfmiddlewaretoken" in page_source, "Token CSRF não encontrado"
        
        # Verificar se token tem valor
        csrf_input = driver.find_element(By.NAME, "csrfmiddlewaretoken")
        csrf_value = csrf_input.get_attribute("value")
        
        assert csrf_value and len(csrf_value) > 10, "Token CSRF inválido"
        
        self.take_screenshot(driver, "csrf_protection_test")
    
    def test_admin_access_protection(self, selenium_driver):
        """Testar proteção de acesso administrativo"""
        driver = selenium_driver
        
        # Tentar acessar admin sem login
        driver.get(f"{STAGING_BASE_URL}/admin/")
        
        # Deve ser redirecionado para login
        current_url = driver.current_url
        assert "login" in current_url.lower(), \
            f"Não foi redirecionado para login: {current_url}"
        
        self.take_screenshot(driver, "admin_access_protection_test")
    
    def test_session_security(self, selenium_driver):
        """Testar segurança de sessão"""
        driver = selenium_driver
        
        # Login
        self.login(driver)
        
        # Verificar cookies de sessão
        cookies = driver.get_cookies()
        
        session_cookie = None
        csrf_cookie = None
        
        for cookie in cookies:
            if cookie['name'] == 'sessionid':
                session_cookie = cookie
            elif cookie['name'] == 'csrftoken':
                csrf_cookie = cookie
        
        # Verificar se cookies existem
        assert session_cookie is not None, "Cookie de sessão não encontrado"
        
        # Em produção, verificar se cookies são seguros
        if STAGING_BASE_URL.startswith('https://'):
            assert session_cookie.get('secure', False), "Cookie de sessão não é seguro"
            assert session_cookie.get('httpOnly', False), "Cookie de sessão não é HttpOnly"
        
        self.take_screenshot(driver, "session_security_test")

def main():
    """Função principal para executar testes de segurança"""
    tester = SecurityTester()
    
    print("🔒 Iniciando análise completa de segurança...")
    report = tester.generate_security_report()
    
    # Salvar relatório
    import json
    import os
    
    output_dir = "/app/test-reports"
    os.makedirs(output_dir, exist_ok=True)
    
    report_file = f"{output_dir}/security_report.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Imprimir resumo
    print("\n" + "="*60)
    print("🔒 RELATÓRIO DE SEGURANÇA")
    print("="*60)
    print(f"Score Geral: {report['overall_score']:.1f}/100")
    print(f"Vulnerabilidades Encontradas: {len(report['vulnerabilities'])}")
    print(f"Recomendações: {len(report['recommendations'])}")
    
    if report['vulnerabilities']:
        print("\n⚠️ VULNERABILIDADES:")
        for vuln in report['vulnerabilities'][:5]:  # Mostrar primeiras 5
            print(f"  - {vuln['type']}: {vuln.get('endpoint', 'N/A')}")
    
    if report['recommendations']:
        print("\n💡 PRINCIPAIS RECOMENDAÇÕES:")
        high_priority = [r for r in report['recommendations'] if r['priority'] in ['CRITICAL', 'HIGH']]
        for rec in high_priority[:3]:  # Mostrar primeiras 3
            print(f"  - [{rec['priority']}] {rec['issue']}")
    
    print(f"\n📄 Relatório completo salvo em: {report_file}")
    print("="*60)
    
    return report

if __name__ == "__main__":
    main()

