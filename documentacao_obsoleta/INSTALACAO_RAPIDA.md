# 🚀 INSTALAÇÃO RÁPIDA - ProteticFlow

## ⚡ **INÍCIO EM 5 MINUTOS**

### **1. Pré-requisitos**
```bash
# Verificar versões
python3 --version  # >= 3.8
node --version     # >= 16
npm --version      # >= 8
```

### **2. Instalação Express**
```bash
# Extrair o projeto
unzip ProteticFlow_v1.2.1_Final.zip
cd ProteticFlow_Melhorado

# Executar script de instalação automática
./deploy_staging_local.sh
```

### **3. Acesso Imediato**
- **Frontend**: http://localhost:5174
- **Backend**: http://localhost:8000
- **Admin**: http://localhost:8000/admin

### **4. Credenciais**
- **Usuário**: admin
- **Senha**: SuperAdmin@2025!

## 🔧 **INSTALAÇÃO MANUAL**

### **Backend (Terminal 1)**
```bash
cd labmanager_source
pip3 install -r requirements.txt
python3 manage.py migrate
python3 manage.py migrate auditlog
python3 manage.py runserver 8000
```

### **Frontend (Terminal 2)**
```bash
cd frontend/labmanager-frontend
npm install
npm run dev
```

## ✅ **VERIFICAÇÃO**

### **Testar Backend**
```bash
curl http://localhost:8000/api/v1/health/
# Deve retornar: {"status": "healthy"}
```

### **Testar Frontend**
```bash
curl http://localhost:5174/
# Deve retornar HTML da aplicação
```

## 🆘 **PROBLEMAS COMUNS**

### **Erro de Porta Ocupada**
```bash
# Matar processos
pkill -f "python manage.py runserver"
pkill -f "npm run dev"
```

### **Erro de Dependências**
```bash
# Backend
pip3 install --upgrade pip
pip3 install -r requirements.txt

# Frontend
rm -rf node_modules package-lock.json
npm install
```

### **Erro de Banco de Dados**
```bash
cd labmanager_source
rm db.sqlite3
python3 manage.py migrate
python3 manage.py createsuperuser
```

## 🎯 **PRÓXIMOS PASSOS**

1. ✅ Fazer login no sistema
2. ✅ Cadastrar primeiro cliente
3. ✅ Criar primeiro trabalho
4. ✅ Explorar funcionalidades
5. ✅ Configurar para produção

## 📞 **SUPORTE**

Se encontrar problemas:
1. Consulte `README_FINAL.md`
2. Verifique logs em `logs/`
3. Execute `make test-smoke`

**🎉 Pronto! Seu ProteticFlow está funcionando!**

