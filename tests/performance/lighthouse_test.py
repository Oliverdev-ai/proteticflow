"""
Testes de Performance usando Lighthouse e outras ferramentas
"""

import subprocess
import json
import time
import psutil
import requests
from datetime import datetime
import os

class PerformanceMonitor:
    """Monitor de performance do sistema"""
    
    def __init__(self, base_url="http://localhost:8080"):
        self.base_url = base_url
        self.results = {}
    
    def run_lighthouse_audit(self, url_path="/", output_dir="/app/test-reports"):
        """Executar auditoria Lighthouse"""
        full_url = f"{self.base_url}{url_path}"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Criar diretório se não existir
        os.makedirs(output_dir, exist_ok=True)
        
        # Arquivo de saída
        output_file = f"{output_dir}/lighthouse_report_{timestamp}.json"
        html_file = f"{output_dir}/lighthouse_report_{timestamp}.html"
        
        try:
            # Comando Lighthouse
            cmd = [
                "lighthouse",
                full_url,
                "--output=json,html",
                "--output-path=" + output_file.replace('.json', ''),
                "--chrome-flags=--headless,--no-sandbox,--disable-dev-shm-usage",
                "--quiet",
                "--no-enable-error-reporting"
            ]
            
            print(f"Executando Lighthouse para: {full_url}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                # Ler resultados
                with open(output_file, 'r') as f:
                    lighthouse_data = json.load(f)
                
                # Extrair métricas principais
                metrics = self._extract_lighthouse_metrics(lighthouse_data)
                
                print(f"✅ Lighthouse concluído: {output_file}")
                return metrics
            else:
                print(f"❌ Erro no Lighthouse: {result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            print("❌ Timeout no Lighthouse")
            return None
        except Exception as e:
            print(f"❌ Erro no Lighthouse: {e}")
            return None
    
    def _extract_lighthouse_metrics(self, lighthouse_data):
        """Extrair métricas principais do Lighthouse"""
        try:
            audits = lighthouse_data.get('audits', {})
            categories = lighthouse_data.get('categories', {})
            
            metrics = {
                'performance_score': categories.get('performance', {}).get('score', 0) * 100,
                'accessibility_score': categories.get('accessibility', {}).get('score', 0) * 100,
                'best_practices_score': categories.get('best-practices', {}).get('score', 0) * 100,
                'seo_score': categories.get('seo', {}).get('score', 0) * 100,
                'first_contentful_paint': audits.get('first-contentful-paint', {}).get('numericValue', 0),
                'largest_contentful_paint': audits.get('largest-contentful-paint', {}).get('numericValue', 0),
                'cumulative_layout_shift': audits.get('cumulative-layout-shift', {}).get('numericValue', 0),
                'total_blocking_time': audits.get('total-blocking-time', {}).get('numericValue', 0),
                'speed_index': audits.get('speed-index', {}).get('numericValue', 0),
            }
            
            return metrics
        except Exception as e:
            print(f"Erro ao extrair métricas: {e}")
            return {}
    
    def measure_api_response_times(self, endpoints=None):
        """Medir tempos de resposta da API"""
        if endpoints is None:
            endpoints = [
                "/api/health/",
                "/api/clients/",
                "/api/jobs/",
                "/api/materials/",
                "/admin/",
                "/"
            ]
        
        results = {}
        
        for endpoint in endpoints:
            url = f"{self.base_url}{endpoint}"
            times = []
            
            print(f"Testando endpoint: {endpoint}")
            
            # Fazer 10 requests para cada endpoint
            for i in range(10):
                try:
                    start_time = time.time()
                    response = requests.get(url, timeout=30)
                    end_time = time.time()
                    
                    response_time = (end_time - start_time) * 1000  # em ms
                    times.append({
                        'response_time': response_time,
                        'status_code': response.status_code,
                        'content_length': len(response.content)
                    })
                    
                    time.sleep(0.1)  # Pequena pausa entre requests
                    
                except requests.RequestException as e:
                    times.append({
                        'response_time': None,
                        'status_code': None,
                        'error': str(e)
                    })
            
            # Calcular estatísticas
            valid_times = [t['response_time'] for t in times if t['response_time'] is not None]
            
            if valid_times:
                results[endpoint] = {
                    'avg_response_time': sum(valid_times) / len(valid_times),
                    'min_response_time': min(valid_times),
                    'max_response_time': max(valid_times),
                    'success_rate': len(valid_times) / len(times) * 100,
                    'total_requests': len(times),
                    'successful_requests': len(valid_times)
                }
            else:
                results[endpoint] = {
                    'avg_response_time': None,
                    'success_rate': 0,
                    'total_requests': len(times),
                    'successful_requests': 0
                }
        
        return results
    
    def monitor_system_resources(self, duration_seconds=60):
        """Monitorar recursos do sistema"""
        print(f"Monitorando recursos por {duration_seconds} segundos...")
        
        measurements = []
        start_time = time.time()
        
        while time.time() - start_time < duration_seconds:
            measurement = {
                'timestamp': datetime.now().isoformat(),
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent,
                'memory_used_gb': psutil.virtual_memory().used / (1024**3),
                'disk_usage_percent': psutil.disk_usage('/').percent,
                'network_io': psutil.net_io_counters()._asdict() if psutil.net_io_counters() else {},
            }
            
            # Tentar obter informações de containers Docker
            try:
                import docker
                client = docker.from_env()
                containers = client.containers.list()
                
                container_stats = {}
                for container in containers:
                    if 'proteticflow' in container.name:
                        stats = container.stats(stream=False)
                        container_stats[container.name] = {
                            'cpu_usage': self._calculate_cpu_percent(stats),
                            'memory_usage_mb': stats['memory_stats'].get('usage', 0) / (1024**2),
                            'memory_limit_mb': stats['memory_stats'].get('limit', 0) / (1024**2),
                        }
                
                measurement['containers'] = container_stats
                
            except Exception as e:
                measurement['containers'] = {}
            
            measurements.append(measurement)
            time.sleep(5)  # Medir a cada 5 segundos
        
        return self._analyze_resource_usage(measurements)
    
    def _calculate_cpu_percent(self, stats):
        """Calcular porcentagem de CPU do container"""
        try:
            cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                       stats['precpu_stats']['cpu_usage']['total_usage']
            system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                          stats['precpu_stats']['system_cpu_usage']
            
            if system_delta > 0:
                cpu_percent = (cpu_delta / system_delta) * \
                             len(stats['cpu_stats']['cpu_usage']['percpu_usage']) * 100
                return round(cpu_percent, 2)
        except (KeyError, ZeroDivisionError):
            pass
        
        return 0
    
    def _analyze_resource_usage(self, measurements):
        """Analisar uso de recursos"""
        if not measurements:
            return {}
        
        cpu_values = [m['cpu_percent'] for m in measurements]
        memory_values = [m['memory_percent'] for m in measurements]
        
        analysis = {
            'duration_seconds': len(measurements) * 5,
            'cpu_stats': {
                'avg': sum(cpu_values) / len(cpu_values),
                'max': max(cpu_values),
                'min': min(cpu_values)
            },
            'memory_stats': {
                'avg': sum(memory_values) / len(memory_values),
                'max': max(memory_values),
                'min': min(memory_values)
            },
            'measurements_count': len(measurements),
            'containers': {}
        }
        
        # Analisar containers se disponível
        container_names = set()
        for m in measurements:
            container_names.update(m.get('containers', {}).keys())
        
        for container_name in container_names:
            container_cpu = []
            container_memory = []
            
            for m in measurements:
                container_data = m.get('containers', {}).get(container_name, {})
                if container_data:
                    container_cpu.append(container_data.get('cpu_usage', 0))
                    container_memory.append(container_data.get('memory_usage_mb', 0))
            
            if container_cpu:
                analysis['containers'][container_name] = {
                    'cpu_avg': sum(container_cpu) / len(container_cpu),
                    'cpu_max': max(container_cpu),
                    'memory_avg_mb': sum(container_memory) / len(container_memory),
                    'memory_max_mb': max(container_memory)
                }
        
        return analysis
    
    def run_concurrent_load_test(self, concurrent_users=10, duration_seconds=60):
        """Executar teste de carga concorrente"""
        import threading
        import queue
        
        print(f"Executando teste de carga: {concurrent_users} usuários por {duration_seconds}s")
        
        results_queue = queue.Queue()
        
        def user_simulation(user_id):
            """Simular um usuário"""
            user_results = []
            start_time = time.time()
            
            while time.time() - start_time < duration_seconds:
                # Simular navegação do usuário
                endpoints = ["/", "/admin/", "/api/clients/", "/api/jobs/"]
                
                for endpoint in endpoints:
                    try:
                        url = f"{self.base_url}{endpoint}"
                        request_start = time.time()
                        response = requests.get(url, timeout=10)
                        request_end = time.time()
                        
                        user_results.append({
                            'user_id': user_id,
                            'endpoint': endpoint,
                            'response_time': (request_end - request_start) * 1000,
                            'status_code': response.status_code,
                            'timestamp': datetime.now().isoformat()
                        })
                        
                    except Exception as e:
                        user_results.append({
                            'user_id': user_id,
                            'endpoint': endpoint,
                            'response_time': None,
                            'status_code': None,
                            'error': str(e),
                            'timestamp': datetime.now().isoformat()
                        })
                    
                    time.sleep(0.5)  # Pausa entre requests
            
            results_queue.put(user_results)
        
        # Iniciar threads de usuários
        threads = []
        for i in range(concurrent_users):
            thread = threading.Thread(target=user_simulation, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Aguardar conclusão
        for thread in threads:
            thread.join()
        
        # Coletar resultados
        all_results = []
        while not results_queue.empty():
            all_results.extend(results_queue.get())
        
        return self._analyze_load_test_results(all_results)
    
    def _analyze_load_test_results(self, results):
        """Analisar resultados do teste de carga"""
        if not results:
            return {}
        
        # Separar por endpoint
        by_endpoint = {}
        total_requests = len(results)
        successful_requests = len([r for r in results if r.get('status_code') == 200])
        
        for result in results:
            endpoint = result['endpoint']
            if endpoint not in by_endpoint:
                by_endpoint[endpoint] = []
            by_endpoint[endpoint].append(result)
        
        endpoint_analysis = {}
        for endpoint, endpoint_results in by_endpoint.items():
            response_times = [r['response_time'] for r in endpoint_results if r['response_time'] is not None]
            successful = len([r for r in endpoint_results if r.get('status_code') == 200])
            
            if response_times:
                endpoint_analysis[endpoint] = {
                    'total_requests': len(endpoint_results),
                    'successful_requests': successful,
                    'success_rate': (successful / len(endpoint_results)) * 100,
                    'avg_response_time': sum(response_times) / len(response_times),
                    'min_response_time': min(response_times),
                    'max_response_time': max(response_times),
                    'p95_response_time': sorted(response_times)[int(len(response_times) * 0.95)] if len(response_times) > 20 else max(response_times)
                }
        
        return {
            'total_requests': total_requests,
            'successful_requests': successful_requests,
            'overall_success_rate': (successful_requests / total_requests) * 100,
            'by_endpoint': endpoint_analysis
        }
    
    def generate_performance_report(self, output_file="/app/test-reports/performance_report.json"):
        """Gerar relatório completo de performance"""
        print("🚀 Iniciando análise completa de performance...")
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'base_url': self.base_url,
            'tests': {}
        }
        
        # 1. Lighthouse
        print("\n📊 Executando Lighthouse...")
        lighthouse_results = self.run_lighthouse_audit()
        if lighthouse_results:
            report['tests']['lighthouse'] = lighthouse_results
        
        # 2. API Response Times
        print("\n⏱️ Medindo tempos de resposta da API...")
        api_results = self.measure_api_response_times()
        report['tests']['api_response_times'] = api_results
        
        # 3. System Resources
        print("\n💻 Monitorando recursos do sistema...")
        resource_results = self.monitor_system_resources(duration_seconds=30)
        report['tests']['system_resources'] = resource_results
        
        # 4. Load Test
        print("\n🔥 Executando teste de carga...")
        load_results = self.run_concurrent_load_test(concurrent_users=5, duration_seconds=30)
        report['tests']['load_test'] = load_results
        
        # Salvar relatório
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n✅ Relatório de performance salvo: {output_file}")
        
        # Imprimir resumo
        self._print_performance_summary(report)
        
        return report
    
    def _print_performance_summary(self, report):
        """Imprimir resumo do relatório"""
        print("\n" + "="*60)
        print("📊 RESUMO DO RELATÓRIO DE PERFORMANCE")
        print("="*60)
        
        # Lighthouse
        lighthouse = report['tests'].get('lighthouse', {})
        if lighthouse:
            print(f"\n🎯 LIGHTHOUSE SCORES:")
            print(f"  Performance: {lighthouse.get('performance_score', 0):.1f}/100")
            print(f"  Accessibility: {lighthouse.get('accessibility_score', 0):.1f}/100")
            print(f"  Best Practices: {lighthouse.get('best_practices_score', 0):.1f}/100")
            print(f"  SEO: {lighthouse.get('seo_score', 0):.1f}/100")
            
            print(f"\n⚡ CORE WEB VITALS:")
            print(f"  First Contentful Paint: {lighthouse.get('first_contentful_paint', 0):.0f}ms")
            print(f"  Largest Contentful Paint: {lighthouse.get('largest_contentful_paint', 0):.0f}ms")
            print(f"  Cumulative Layout Shift: {lighthouse.get('cumulative_layout_shift', 0):.3f}")
        
        # API Response Times
        api_times = report['tests'].get('api_response_times', {})
        if api_times:
            print(f"\n🔗 API RESPONSE TIMES:")
            for endpoint, stats in api_times.items():
                if stats.get('avg_response_time'):
                    print(f"  {endpoint}: {stats['avg_response_time']:.0f}ms (success: {stats['success_rate']:.1f}%)")
        
        # System Resources
        resources = report['tests'].get('system_resources', {})
        if resources:
            print(f"\n💻 RECURSOS DO SISTEMA:")
            cpu_stats = resources.get('cpu_stats', {})
            memory_stats = resources.get('memory_stats', {})
            print(f"  CPU: {cpu_stats.get('avg', 0):.1f}% (max: {cpu_stats.get('max', 0):.1f}%)")
            print(f"  Memory: {memory_stats.get('avg', 0):.1f}% (max: {memory_stats.get('max', 0):.1f}%)")
        
        # Load Test
        load_test = report['tests'].get('load_test', {})
        if load_test:
            print(f"\n🔥 TESTE DE CARGA:")
            print(f"  Total Requests: {load_test.get('total_requests', 0)}")
            print(f"  Success Rate: {load_test.get('overall_success_rate', 0):.1f}%")
        
        print("\n" + "="*60)

def main():
    """Função principal para executar testes"""
    monitor = PerformanceMonitor()
    
    # Aguardar sistema estar pronto
    print("Aguardando sistema ficar disponível...")
    time.sleep(10)
    
    # Executar análise completa
    report = monitor.generate_performance_report()
    
    return report

if __name__ == "__main__":
    main()

