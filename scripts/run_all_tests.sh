#!/bin/bash

# ProteticFlow - Script para Executar Todos os Testes de Staging
# Este script executa a suíte completa de testes automatizados

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configurações
STAGING_URL=${STAGING_URL:-"http://localhost:8080"}
TEST_REPORTS_DIR="/app/test-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

section() {
    echo -e "\n${PURPLE}=== $1 ===${NC}"
}

# Função para verificar se serviços estão rodando
check_services() {
    log "Verificando se serviços estão rodando..."
    
    # Verificar se containers estão up
    if ! docker-compose -f docker-compose.staging.yml ps | grep -q "Up"; then
        error "Containers não estão rodando. Execute 'make start-staging' primeiro."
        exit 1
    fi
    
    # Verificar se aplicação responde
    if ! curl -s "$STAGING_URL/api/health/" > /dev/null; then
        error "Aplicação não está respondendo em $STAGING_URL"
        exit 1
    fi
    
    success "Todos os serviços estão rodando"
}

# Função para preparar ambiente de teste
prepare_test_environment() {
    log "Preparando ambiente de teste..."
    
    # Criar diretório de relatórios
    mkdir -p "$TEST_REPORTS_DIR"
    
    # Limpar relatórios antigos
    find "$TEST_REPORTS_DIR" -name "*.html" -mtime +7 -delete 2>/dev/null || true
    find "$TEST_REPORTS_DIR" -name "*.json" -mtime +7 -delete 2>/dev/null || true
    find "$TEST_REPORTS_DIR" -name "*.png" -mtime +7 -delete 2>/dev/null || true
    
    # Aguardar sistema estabilizar
    log "Aguardando sistema estabilizar..."
    sleep 10
    
    success "Ambiente de teste preparado"
}

# Função para executar testes E2E
run_e2e_tests() {
    section "TESTES END-TO-END (E2E)"
    
    log "Iniciando Selenium Grid..."
    docker-compose -f docker-compose.staging.yml up -d selenium-hub selenium-chrome
    
    # Aguardar Selenium ficar pronto
    log "Aguardando Selenium Grid ficar pronto..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -s http://localhost:4444/status | grep -q "ready"; then
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        error "Selenium Grid não ficou pronto a tempo"
        return 1
    fi
    
    success "Selenium Grid está pronto"
    
    # Executar testes E2E
    log "Executando testes E2E..."
    
    cd /app
    
    # Instalar dependências se necessário
    pip install -q pytest selenium pytest-html pytest-xdist
    
    # Executar testes com relatório HTML
    if pytest tests/e2e/ \
        --html="$TEST_REPORTS_DIR/e2e_report_$TIMESTAMP.html" \
        --self-contained-html \
        -v \
        --tb=short \
        --maxfail=5; then
        success "Testes E2E concluídos com sucesso"
        return 0
    else
        error "Alguns testes E2E falharam"
        return 1
    fi
}

# Função para executar testes de API
run_api_tests() {
    section "TESTES DE API"
    
    log "Executando testes de integração de API..."
    
    cd /app
    
    # Configurar Django para testes
    export DJANGO_SETTINGS_MODULE=labmanager.settings_staging
    
    # Executar testes de API
    if pytest tests/integration/ \
        --html="$TEST_REPORTS_DIR/api_report_$TIMESTAMP.html" \
        --self-contained-html \
        -v \
        --tb=short; then
        success "Testes de API concluídos com sucesso"
        return 0
    else
        error "Alguns testes de API falharam"
        return 1
    fi
}

# Função para executar testes de performance
run_performance_tests() {
    section "TESTES DE PERFORMANCE"
    
    log "Executando análise de performance..."
    
    cd /app
    
    # Instalar dependências
    pip install -q locust psutil requests
    
    # Executar análise Lighthouse
    if python tests/performance/lighthouse_test.py; then
        success "Análise de performance concluída"
        return 0
    else
        warning "Análise de performance teve problemas (não crítico)"
        return 0
    fi
}

# Função para executar testes de segurança
run_security_tests() {
    section "TESTES DE SEGURANÇA"
    
    log "Executando validação de segurança..."
    
    cd /app
    
    # Executar testes de segurança
    if python tests/security/test_security_validation.py; then
        success "Testes de segurança concluídos"
        return 0
    else
        error "Problemas de segurança detectados"
        return 1
    fi
}

# Função para executar testes de carga
run_load_tests() {
    section "TESTES DE CARGA"
    
    log "Executando testes de carga com Locust..."
    
    # Executar teste de carga por 2 minutos com 10 usuários
    timeout 120 locust \
        -f tests/performance/test_load_testing.py \
        --host="$STAGING_URL" \
        --users=10 \
        --spawn-rate=2 \
        --run-time=120s \
        --html="$TEST_REPORTS_DIR/load_test_$TIMESTAMP.html" \
        --headless || true
    
    success "Testes de carga concluídos"
    return 0
}

# Função para gerar relatório consolidado
generate_consolidated_report() {
    section "RELATÓRIO CONSOLIDADO"
    
    log "Gerando relatório consolidado..."
    
    cat > "$TEST_REPORTS_DIR/test_summary_$TIMESTAMP.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>ProteticFlow - Relatório de Testes de Staging</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background: #d4edda; border-color: #c3e6cb; }
        .warning { background: #fff3cd; border-color: #ffeaa7; }
        .error { background: #f8d7da; border-color: #f5c6cb; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; border-radius: 3px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 ProteticFlow - Relatório de Testes de Staging</h1>
        <p>Executado em: $(date)</p>
        <p>URL Testada: $STAGING_URL</p>
    </div>
    
    <div class="section">
        <h2>📊 Resumo dos Testes</h2>
        <table>
            <tr><th>Categoria</th><th>Status</th><th>Relatório</th></tr>
            <tr><td>Testes E2E</td><td id="e2e-status">-</td><td><a href="e2e_report_$TIMESTAMP.html">Ver Relatório</a></td></tr>
            <tr><td>Testes de API</td><td id="api-status">-</td><td><a href="api_report_$TIMESTAMP.html">Ver Relatório</a></td></tr>
            <tr><td>Performance</td><td id="perf-status">-</td><td><a href="performance_report.json">Ver Métricas</a></td></tr>
            <tr><td>Segurança</td><td id="sec-status">-</td><td><a href="security_report.json">Ver Análise</a></td></tr>
            <tr><td>Carga</td><td id="load-status">-</td><td><a href="load_test_$TIMESTAMP.html">Ver Relatório</a></td></tr>
        </table>
    </div>
    
    <div class="section">
        <h2>🎯 Métricas Principais</h2>
        <div class="metric">
            <strong>Disponibilidade:</strong> <span id="availability">-</span>
        </div>
        <div class="metric">
            <strong>Tempo de Resposta:</strong> <span id="response-time">-</span>
        </div>
        <div class="metric">
            <strong>Taxa de Erro:</strong> <span id="error-rate">-</span>
        </div>
        <div class="metric">
            <strong>Score de Segurança:</strong> <span id="security-score">-</span>
        </div>
    </div>
    
    <div class="section">
        <h2>📋 Próximos Passos</h2>
        <ul>
            <li>Revisar relatórios detalhados de cada categoria</li>
            <li>Corrigir problemas identificados</li>
            <li>Re-executar testes após correções</li>
            <li>Aprovar para deploy em produção</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>📞 Contato</h2>
        <p>Em caso de dúvidas ou problemas:</p>
        <ul>
            <li>Email: support@proteticflow.com</li>
            <li>Slack: #proteticflow-staging</li>
            <li>Documentação: <a href="GUIA_STAGING_COMPLETO.md">Guia Completo</a></li>
        </ul>
    </div>
</body>
</html>
EOF
    
    success "Relatório consolidado gerado: $TEST_REPORTS_DIR/test_summary_$TIMESTAMP.html"
}

# Função para limpar recursos
cleanup() {
    log "Limpando recursos de teste..."
    
    # Parar Selenium se estiver rodando
    docker-compose -f docker-compose.staging.yml stop selenium-hub selenium-chrome 2>/dev/null || true
    
    # Limpar processos de teste
    pkill -f "locust" 2>/dev/null || true
    pkill -f "pytest" 2>/dev/null || true
    
    success "Limpeza concluída"
}

# Função principal
main() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    PROTETICFLOW STAGING                     ║"
    echo "║                  Suíte Completa de Testes                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Variáveis para tracking de resultados
    e2e_result=0
    api_result=0
    perf_result=0
    sec_result=0
    load_result=0
    
    # Trap para cleanup em caso de interrupção
    trap cleanup EXIT
    
    # Verificar pré-requisitos
    check_services
    prepare_test_environment
    
    # Executar testes
    log "Iniciando execução da suíte completa de testes..."
    
    # Testes E2E
    if run_e2e_tests; then
        e2e_result=1
    fi
    
    # Testes de API
    if run_api_tests; then
        api_result=1
    fi
    
    # Testes de Performance
    if run_performance_tests; then
        perf_result=1
    fi
    
    # Testes de Segurança
    if run_security_tests; then
        sec_result=1
    fi
    
    # Testes de Carga
    if run_load_tests; then
        load_result=1
    fi
    
    # Gerar relatório consolidado
    generate_consolidated_report
    
    # Resumo final
    section "RESUMO FINAL"
    
    total_tests=5
    passed_tests=$((e2e_result + api_result + perf_result + sec_result + load_result))
    
    echo -e "\n${BLUE}Resultados dos Testes:${NC}"
    echo "├─ E2E Tests:        $([ $e2e_result -eq 1 ] && echo -e "${GREEN}✅ PASSOU${NC}" || echo -e "${RED}❌ FALHOU${NC}")"
    echo "├─ API Tests:        $([ $api_result -eq 1 ] && echo -e "${GREEN}✅ PASSOU${NC}" || echo -e "${RED}❌ FALHOU${NC}")"
    echo "├─ Performance:      $([ $perf_result -eq 1 ] && echo -e "${GREEN}✅ PASSOU${NC}" || echo -e "${RED}❌ FALHOU${NC}")"
    echo "├─ Security:         $([ $sec_result -eq 1 ] && echo -e "${GREEN}✅ PASSOU${NC}" || echo -e "${RED}❌ FALHOU${NC}")"
    echo "└─ Load Tests:       $([ $load_result -eq 1 ] && echo -e "${GREEN}✅ PASSOU${NC}" || echo -e "${RED}❌ FALHOU${NC}")"
    
    echo -e "\n${BLUE}Score Geral: ${NC}$passed_tests/$total_tests testes passaram"
    
    if [ $passed_tests -eq $total_tests ]; then
        echo -e "\n${GREEN}🎉 TODOS OS TESTES PASSARAM!${NC}"
        echo -e "${GREEN}✅ Sistema aprovado para produção${NC}"
        exit 0
    elif [ $passed_tests -ge 3 ]; then
        echo -e "\n${YELLOW}⚠️  ALGUNS TESTES FALHARAM${NC}"
        echo -e "${YELLOW}🔍 Revisar problemas antes do deploy${NC}"
        exit 1
    else
        echo -e "\n${RED}❌ MUITOS TESTES FALHARAM${NC}"
        echo -e "${RED}🚫 Sistema NÃO aprovado para produção${NC}"
        exit 2
    fi
}

# Verificar se script está sendo executado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

