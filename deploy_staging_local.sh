#!/bin/bash

echo "🚀 ProteticFlow - Deploy Local para Staging"
echo "=========================================="

# Configurar variáveis de ambiente
export DJANGO_SETTINGS_MODULE=labmanager.settings
export DEBUG=False
export ENVIRONMENT=staging

# Parar serviços existentes
echo "1. Parando serviços existentes..."
pkill -f "python manage.py runserver" || true
pkill -f "npm run dev" || true

# Instalar dependências do backend
echo "2. Instalando dependências do backend..."
cd labmanager_source
pip3 install -r requirements.txt

# Executar migrações
echo "3. Executando migrações do banco de dados..."
python3 manage.py migrate

# Coletar arquivos estáticos
echo "4. Coletando arquivos estáticos..."
python3 manage.py collectstatic --noinput

# Criar superusuário se não existir
echo "5. Verificando usuário admin..."
python3 manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@proteticflow.com', 'SuperAdmin@2025!')
    print('Usuário admin criado')
else:
    print('Usuário admin já existe')
"

# Iniciar backend
echo "6. Iniciando backend Django..."
python3 manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

# Aguardar backend inicializar
sleep 5

# Testar backend
echo "7. Testando backend..."
curl -f http://localhost:8000/api/v1/health/ || {
    echo "❌ Erro: Backend não está respondendo"
    kill $BACKEND_PID 2>/dev/null
    exit 1
}

# Instalar dependências do frontend
echo "8. Instalando dependências do frontend..."
cd ../frontend/labmanager-frontend
npm install

# Build do frontend para staging
echo "9. Fazendo build do frontend..."
npm run build

# Iniciar frontend
echo "10. Iniciando frontend..."
npm run preview -- --host 0.0.0.0 --port 5174 &
FRONTEND_PID=$!

# Aguardar frontend inicializar
sleep 5

# Testar frontend
echo "11. Testando frontend..."
curl -f http://localhost:5174/ || {
    echo "❌ Erro: Frontend não está respondendo"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 1
}

echo ""
echo "✅ Deploy para staging concluído com sucesso!"
echo ""
echo "🌐 URLs disponíveis:"
echo "   Frontend: http://localhost:5174"
echo "   Backend:  http://localhost:8000"
echo "   Admin:    http://localhost:8000/admin"
echo ""
echo "🔑 Credenciais:"
echo "   Usuário: admin"
echo "   Senha:   SuperAdmin@2025!"
echo ""
echo "📊 PIDs dos processos:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "Para parar os serviços:"
echo "   kill $BACKEND_PID $FRONTEND_PID"

