#!/bin/sh

# ProteticFlow - Script de InicializaÃƒÂ§ÃƒÂ£o para Staging
# Este script configura o ambiente de staging com dados de teste

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[STAGING $(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

log "Iniciando configuraÃƒÂ§ÃƒÂ£o do ambiente de staging..."

# Aguardar banco de dados ficar disponÃƒÂ­vel
log "Aguardando banco de dados..."
while ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do
    sleep 2
done
success "Banco de dados disponÃƒÂ­vel"

# Aguardar Redis ficar disponÃƒÂ­vel
log "Aguardando Redis..."
while ! redis-cli -h redis -p 6379 -a $REDIS_PASSWORD ping > /dev/null 2>&1; do
    sleep 2
done
success "Redis disponÃƒÂ­vel"

# Executar migraÃƒÂ§ÃƒÂµes
log "Executando migraÃƒÂ§ÃƒÂµes do banco de dados..."
python manage.py migrate --noinput
success "MigraÃƒÂ§ÃƒÂµes executadas"

# Coletar arquivos estÃƒÂ¡ticos
log "Coletando arquivos estÃƒÂ¡ticos..."
python manage.py collectstatic --noinput
success "Arquivos estÃƒÂ¡ticos coletados"

# Criar superusuÃƒÂ¡rio de teste se nÃƒÂ£o existir
log "Configurando usuÃƒÂ¡rio administrador de teste..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser(
        username='admin',
        email='admin@staging.proteticflow.com',
        password='staging123',
        first_name='Admin',
        last_name='Staging'
    )
    print('SuperusuÃƒÂ¡rio criado: admin/staging123')
else:
    print('SuperusuÃƒÂ¡rio jÃƒÂ¡ existe')
"

# Criar usuÃƒÂ¡rios de teste
log "Criando usuÃƒÂ¡rios de teste..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
from apps.employees.models import EmployeeProfile
import random

User = get_user_model()

# UsuÃƒÂ¡rios de teste
test_users = [
    {'username': 'dentista1', 'email': 'dentista1@test.com', 'password': 'test123', 'first_name': 'Dr. JoÃƒÂ£o', 'last_name': 'Silva'},
    {'username': 'dentista2', 'email': 'dentista2@test.com', 'password': 'test123', 'first_name': 'Dra. Maria', 'last_name': 'Santos'},
    {'username': 'tecnico1', 'email': 'tecnico1@test.com', 'password': 'test123', 'first_name': 'Carlos', 'last_name': 'Oliveira'},
    {'username': 'tecnico2', 'email': 'tecnico2@test.com', 'password': 'test123', 'first_name': 'Ana', 'last_name': 'Costa'},
]

for user_data in test_users:
    if not User.objects.filter(username=user_data['username']).exists():
        user = User.objects.create_user(**user_data)
        print(f'UsuÃƒÂ¡rio criado: {user.username}')
    else:
        print(f'UsuÃƒÂ¡rio jÃƒÂ¡ existe: {user_data[\"username\"]}')
"

# Popular dados de teste se habilitado
if [ "$POPULATE_TEST_DATA" = "True" ]; then
    log "Populando dados de teste..."
    
    # Verificar se fixture existe
    if [ -f "/app/fixtures/test_data.json" ]; then
        python manage.py loaddata /app/fixtures/test_data.json
        success "Dados de teste carregados"
    else
        warning "Fixture de dados de teste nÃƒÂ£o encontrada, criando dados bÃƒÂ¡sicos..."
        
        # Criar dados bÃƒÂ¡sicos via shell
        python manage.py shell -c "
from apps.clients.models import Client
from apps.jobs.models import Job
from apps.materials.models import Material
from apps.pricing.models import PriceTable
import random
from datetime import datetime, timedelta

# Criar clientes de teste
clients_data = [
    {'name': 'ClÃ­nica Dental Smile', 'email': 'contato@dentalsmile.com', 'phone_primary': '(11) 99999-1111'},
    {'name': 'Odontologia Moderna', 'email': 'info@odontomoderna.com', 'phone_primary': '(11) 99999-2222'},
    {'name': 'Centro OdontolÃ³gico SÃ£o Paulo', 'email': 'atendimento@centrosp.com', 'phone_primary': '(11) 99999-3333'},
    {'name': 'ClÃ­nica Dr. Silva', 'email': 'drsilva@clinica.com', 'phone_primary': '(11) 99999-4444'},
    {'name': 'Dental Care Premium', 'email': 'premium@dentalcare.com', 'phone_primary': '(11) 99999-5555'},
]

for client_data in clients_data:
    if not Client.objects.filter(email=client_data['email']).exists():
        Client.objects.create(**client_data)
        print(f'Cliente criado: {client_data[\"name\"]}')

# Criar materiais de teste
materials_data = [
    {'name': 'Resina AcrÃ­lica', 'code': 'MAT001', 'description': 'Resina para prÃ³teses', 'last_purchase_price': 25.50},
    {'name': 'Dente Artificial', 'code': 'MAT002', 'description': 'Dente de porcelana', 'last_purchase_price': 15.00},
    {'name': 'Liga MetÃ­¡lica', 'code': 'MAT003', 'description': 'Liga para estruturas', 'last_purchase_price': 45.00},
    {'name': 'CerÃ¢mica Dental', 'code': 'MAT004', 'description': 'CerÃ¢mica para coroas', 'last_purchase_price': 35.00},
    {'name': 'Silicone de Moldagem', 'code': 'MAT005', 'description': 'Silicone para moldes', 'last_purchase_price': 12.00},
]

for material_data in materials_data:
    if not Material.objects.filter(name=material_data['name']).exists():
        Material.objects.create(**material_data)
        print(f'Material criado: {material_data[\"name\"]}')

print('Dados bÃƒÂ¡sicos de teste criados')
"
    fi
fi

# Configurar tarefas do Celery Beat para staging
log "Configurando tarefas agendadas..."
python manage.py shell -c "
from django_celery_beat.models import PeriodicTask, IntervalSchedule
import json

# Criar schedule de 5 minutos para testes
schedule, created = IntervalSchedule.objects.get_or_create(
    every=5,
    period=IntervalSchedule.MINUTES,
)

# Tarefa de limpeza de logs (para staging)
task, created = PeriodicTask.objects.get_or_create(
    name='Limpeza de logs de staging',
    defaults={
        'task': 'apps.core.tasks.cleanup_staging_logs',
        'interval': schedule,
        'enabled': True,
    }
)

print('Tarefas agendadas configuradas')
"

# Executar verificaÃƒÂ§ÃƒÂµes de saÃƒÂºde
log "Executando verificaÃƒÂ§ÃƒÂµes de saÃƒÂºde..."
python manage.py check --deploy
success "VerificaÃƒÂ§ÃƒÂµes de saÃƒÂºde concluÃƒÂ­das"

# Gerar relatÃƒÂ³rio de configuraÃƒÂ§ÃƒÂ£o
log "Gerando relatÃƒÂ³rio de configuraÃƒÂ§ÃƒÂ£o..."
python manage.py shell -c "
import os
from django.conf import settings

print('=== RELATÃƒâ€œRIO DE CONFIGURAÃƒâ€¡ÃƒÆ’O STAGING ===')
print(f'Environment: {os.getenv(\"ENVIRONMENT\", \"unknown\")}')
print(f'Debug: {settings.DEBUG}')
print(f'Database: {settings.DATABASES[\"default\"][\"NAME\"]}')
print(f'Allowed Hosts: {settings.ALLOWED_HOSTS}')
print(f'CORS Origins: {getattr(settings, \"CORS_ALLOWED_ORIGINS\", [])}')
print('==========================================')
"

success "Ambiente de staging configurado com sucesso!"

# Iniciar servidor Gunicorn
log "Iniciando servidor Gunicorn para staging..."
exec gunicorn labmanager.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --worker-class gevent \
    --worker-connections 500 \
    --max-requests 500 \
    --max-requests-jitter 50 \
    --timeout 60 \
    --keep-alive 2 \
    --log-level debug \
    --access-logfile - \
    --error-logfile - \
    --capture-output \
    --reload

