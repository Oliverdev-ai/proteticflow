#!/bin/bash

# ProteticFlow - Script de Deploy Automatizado
# Uso: ./scripts/deploy.sh [production|staging]

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verificar argumentos
ENVIRONMENT=${1:-production}
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" ]]; then
    error "Ambiente deve ser 'production' ou 'staging'"
fi

log "Iniciando deploy para ambiente: $ENVIRONMENT"

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    error "Docker não está instalado"
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose não está instalado"
fi

# Verificar se arquivo .env existe
ENV_FILE=".env.$ENVIRONMENT"
if [[ ! -f "$ENV_FILE" ]]; then
    error "Arquivo $ENV_FILE não encontrado"
fi

log "Copiando arquivo de ambiente..."
cp "$ENV_FILE" .env

# Verificar se frontend foi buildado
if [[ ! -d "frontend/labmanager-frontend/dist" ]]; then
    warning "Frontend não foi buildado. Buildando agora..."
    cd frontend/labmanager-frontend
    npm install
    npm run build
    cd ../..
    success "Frontend buildado com sucesso"
fi

# Parar containers existentes
log "Parando containers existentes..."
docker-compose down --remove-orphans

# Remover imagens antigas (opcional)
if [[ "$ENVIRONMENT" == "production" ]]; then
    log "Removendo imagens antigas..."
    docker system prune -f
fi

# Build das imagens
log "Buildando imagens Docker..."
docker-compose build --no-cache

# Iniciar serviços de infraestrutura primeiro
log "Iniciando serviços de infraestrutura..."
docker-compose up -d db redis

# Aguardar serviços ficarem prontos
log "Aguardando banco de dados ficar pronto..."
sleep 10

# Executar migrações
log "Executando migrações do banco de dados..."
docker-compose run --rm web python manage.py migrate --settings=labmanager.settings_production

# Criar superusuário se não existir
log "Verificando superusuário..."
docker-compose run --rm web python manage.py shell --settings=labmanager.settings_production -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@proteticflow.com', 'admin123')
    print('Superusuário criado: admin/admin123')
else:
    print('Superusuário já existe')
"

# Coletar arquivos estáticos
log "Coletando arquivos estáticos..."
docker-compose run --rm web python manage.py collectstatic --noinput --settings=labmanager.settings_production

# Iniciar todos os serviços
log "Iniciando todos os serviços..."
if [[ "$ENVIRONMENT" == "production" ]]; then
    docker-compose up -d
else
    # Para staging, incluir monitoramento
    docker-compose --profile monitoring up -d
fi

# Verificar saúde dos serviços
log "Verificando saúde dos serviços..."
sleep 30

# Verificar se serviços estão rodando
SERVICES=("db" "redis" "web" "nginx")
for service in "${SERVICES[@]}"; do
    if docker-compose ps | grep -q "$service.*Up"; then
        success "Serviço $service está rodando"
    else
        error "Serviço $service não está rodando"
    fi
done

# Verificar conectividade
log "Testando conectividade..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    success "Aplicação está respondendo"
else
    error "Aplicação não está respondendo"
fi

# Mostrar logs dos últimos minutos
log "Últimos logs da aplicação:"
docker-compose logs --tail=20 web

# Informações finais
success "Deploy concluído com sucesso!"
echo ""
echo "🚀 ProteticFlow está rodando em:"
echo "   Frontend: http://localhost"
echo "   Admin: http://localhost/admin"
echo "   API: http://localhost/api"
echo ""
echo "📊 Monitoramento (se habilitado):"
echo "   Grafana: http://localhost:3000"
echo "   Prometheus: http://localhost:9090"
echo ""
echo "🔧 Comandos úteis:"
echo "   Ver logs: docker-compose logs -f"
echo "   Parar: docker-compose down"
echo "   Reiniciar: docker-compose restart"
echo ""

if [[ "$ENVIRONMENT" == "production" ]]; then
    warning "IMPORTANTE: Altere as senhas padrão em produção!"
    echo "   - Superusuário Django: admin/admin123"
    echo "   - PostgreSQL: postgres/postgres123"
    echo "   - Redis: redis123"
    echo "   - Grafana: admin/admin123"
fi

