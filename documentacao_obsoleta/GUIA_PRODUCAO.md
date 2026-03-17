# 🚀 ProteticFlow - Guia de Produção Completo

**Versão:** v1.1.1 (Ambiente de Produção)  
**Data:** 27 de Julho de 2025  
**Status:** ✅ **PRONTO PARA DEPLOY**

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Instalação Rápida](#instalação-rápida)
4. [Configuração Detalhada](#configuração-detalhada)
5. [Deploy em Produção](#deploy-em-produção)
6. [Monitoramento](#monitoramento)
7. [Backup e Recuperação](#backup-e-recuperação)
8. [Manutenção](#manutenção)
9. [Troubleshooting](#troubleshooting)
10. [Comandos Úteis](#comandos-úteis)

---

## 🎯 Visão Geral

O ProteticFlow agora possui um **ambiente de produção completo** com:

### ✅ Arquitetura de Produção
- **Docker Compose** para orquestração de containers
- **Nginx** como proxy reverso com SSL/TLS
- **PostgreSQL** como banco de dados principal
- **Redis** para cache e filas de tarefas
- **Celery** para processamento assíncrono
- **Prometheus + Grafana** para monitoramento (opcional)

### ✅ Segurança Implementada
- Headers de segurança (HSTS, XSS Protection, etc.)
- Cookies seguros para HTTPS
- Rate limiting para APIs
- Usuários não-root nos containers
- Configurações SSL/TLS modernas

### ✅ Performance Otimizada
- Frontend com chunks otimizados (-49% no tamanho)
- Compressão Gzip no Nginx
- Cache de arquivos estáticos
- Multi-worker Gunicorn com Gevent
- Health checks automáticos

---

## 🔧 Pré-requisitos

### Sistema Operacional
- **Linux** (Ubuntu 20.04+ recomendado)
- **macOS** (com Docker Desktop)
- **Windows** (com WSL2 + Docker Desktop)

### Software Necessário
```bash
# Docker e Docker Compose
sudo apt update
sudo apt install docker.io docker-compose

# Node.js (para build do frontend)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs

# Make (para comandos facilitados)
sudo apt install make

# Git (para versionamento)
sudo apt install git
```

### Recursos Mínimos
- **CPU:** 2 cores
- **RAM:** 4GB (8GB recomendado)
- **Disco:** 20GB livres
- **Rede:** Conexão estável com internet

---

## ⚡ Instalação Rápida

### 1. Clonar o Projeto
```bash
git clone <repository-url> proteticflow
cd proteticflow
```

### 2. Configurar Ambiente
```bash
# Copiar arquivo de configuração
cp .env.production .env

# IMPORTANTE: Editar .env com suas configurações
nano .env
```

### 3. Deploy Automático
```bash
# Deploy completo em produção
make deploy-prod

# OU usando script diretamente
./scripts/deploy.sh production
```

### 4. Verificar Instalação
```bash
# Ver status dos serviços
make status

# Ver logs
make logs

# Testar conectividade
curl http://localhost/health
```

**🎉 Pronto! O ProteticFlow está rodando em:**
- **Frontend:** http://localhost
- **Admin:** http://localhost/admin
- **API:** http://localhost/api

---

## ⚙️ Configuração Detalhada

### Arquivo .env de Produção

```bash
# Django Configuration
SECRET_KEY=sua-chave-secreta-super-segura-aqui
DEBUG=False
ALLOWED_HOSTS=seudominio.com,www.seudominio.com

# Database Configuration
DB_NAME=proteticflow
DB_USER=postgres
DB_PASSWORD=senha-super-segura-postgres
DB_HOST=db
DB_PORT=5432

# Redis Configuration
REDIS_PASSWORD=senha-super-segura-redis

# Security Settings
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# CORS Settings
CORS_ALLOWED_ORIGINS=https://seudominio.com

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=seu-email@gmail.com
EMAIL_HOST_PASSWORD=sua-senha-de-app

# AI/ML Settings
OPENAI_API_KEY=sua-chave-openai-aqui
```

### Configuração de SSL/TLS

#### Opção 1: Let's Encrypt (Recomendado)
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d seudominio.com -d www.seudominio.com

# Renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Opção 2: Certificado Auto-assinado (Desenvolvimento)
```bash
# Gerar certificado
make ssl-cert
```

### Configuração de Domínio

#### DNS Records
```
A     seudominio.com        -> SEU_IP_SERVIDOR
CNAME www.seudominio.com    -> seudominio.com
```

#### Nginx Configuration
Editar `nginx/sites-available/proteticflow.conf`:
```nginx
server_name seudominio.com www.seudominio.com;
```

---

## 🚀 Deploy em Produção

### Deploy Inicial

```bash
# 1. Preparar servidor
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22

# 2. Configurar variáveis
cp .env.production .env
# Editar .env com configurações reais

# 3. Deploy
make deploy-prod

# 4. Configurar SSL
sudo certbot --nginx -d seudominio.com

# 5. Verificar
make info
```

### Deploy de Atualizações

```bash
# 1. Fazer backup
make backup

# 2. Atualizar código
git pull origin main

# 3. Rebuild e deploy
make build
make restart

# 4. Executar migrações se necessário
make migrate

# 5. Verificar
make status
```

### Rollback em Caso de Problema

```bash
# 1. Voltar para versão anterior
git checkout <commit-anterior>

# 2. Rebuild
make build

# 3. Restaurar backup se necessário
# (Ver seção de Backup e Recuperação)

# 4. Reiniciar
make restart
```

---

## 📊 Monitoramento

### Monitoramento Básico

```bash
# Iniciar com monitoramento
make monitoring

# Acessar dashboards
# Grafana: http://localhost:3000 (admin/admin123)
# Prometheus: http://localhost:9090
```

### Métricas Disponíveis

#### Aplicação Django
- Requests por segundo
- Tempo de resposta
- Erros 4xx/5xx
- Uso de CPU/Memória

#### Banco de Dados
- Conexões ativas
- Queries por segundo
- Tamanho do banco
- Performance de queries

#### Sistema
- Uso de CPU
- Uso de memória
- Uso de disco
- Tráfego de rede

### Alertas Recomendados

```yaml
# Exemplo de alertas no Prometheus
groups:
  - name: proteticflow
    rules:
      - alert: HighErrorRate
        expr: rate(django_http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        annotations:
          summary: "Alta taxa de erros na aplicação"
      
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        annotations:
          summary: "Banco de dados indisponível"
```

---

## 💾 Backup e Recuperação

### Backup Automático

```bash
# Backup manual
make backup

# Backup automático (crontab)
0 2 * * * cd /path/to/proteticflow && make backup
```

### Estrutura de Backup

```
backups/
├── db_backup_20250727_020000.sql      # Banco de dados
├── media_backup_20250727_020000.tar.gz # Arquivos de media
└── ...
```

### Recuperação de Backup

#### Restaurar Banco de Dados
```bash
# Parar aplicação
make stop

# Restaurar banco
docker-compose up -d db
cat backups/db_backup_YYYYMMDD_HHMMSS.sql | docker-compose exec -T db psql -U postgres proteticflow

# Reiniciar aplicação
make start
```

#### Restaurar Arquivos de Media
```bash
# Extrair backup de media
tar -xzf backups/media_backup_YYYYMMDD_HHMMSS.tar.gz -C ./temp_media/

# Copiar para volume Docker
docker run --rm -v proteticflow_media_volume:/data -v $(pwd)/temp_media:/backup alpine cp -r /backup/* /data/
```

### Backup para Cloud

#### AWS S3
```bash
# Instalar AWS CLI
sudo apt install awscli

# Configurar credenciais
aws configure

# Script de backup para S3
#!/bin/bash
make backup
aws s3 sync ./backups/ s3://seu-bucket-backup/proteticflow/
```

---

## 🔧 Manutenção

### Manutenção Preventiva

#### Diária
```bash
# Verificar logs de erro
make logs | grep ERROR

# Verificar espaço em disco
df -h

# Verificar status dos serviços
make status
```

#### Semanal
```bash
# Fazer backup
make backup

# Limpar logs antigos
docker system prune -f

# Verificar atualizações de segurança
sudo apt update && sudo apt list --upgradable
```

#### Mensal
```bash
# Atualizar dependências
cd frontend/labmanager-frontend && npm audit fix
pip list --outdated

# Verificar certificados SSL
openssl x509 -in nginx/ssl/proteticflow.crt -text -noout | grep "Not After"

# Analisar métricas de performance
# (via Grafana)
```

### Otimização de Performance

#### Banco de Dados
```sql
-- Analisar queries lentas
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Reindexar se necessário
REINDEX DATABASE proteticflow;

-- Atualizar estatísticas
ANALYZE;
```

#### Aplicação Django
```bash
# Verificar queries N+1
make shell
# No shell Django:
from django.db import connection
print(connection.queries)

# Otimizar queries com select_related/prefetch_related
```

#### Frontend
```bash
# Analisar bundle size
cd frontend/labmanager-frontend
npm run build -- --analyze

# Otimizar imagens
# Usar ferramentas como imagemin
```

---

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Serviço não inicia
```bash
# Verificar logs
make logs-web

# Verificar configurações
docker-compose config

# Verificar recursos
docker stats
```

#### 2. Erro de conexão com banco
```bash
# Verificar se PostgreSQL está rodando
make logs-db

# Testar conexão
docker-compose exec web python manage.py dbshell

# Verificar configurações de rede
docker network ls
```

#### 3. Frontend não carrega
```bash
# Verificar build do frontend
ls -la frontend/labmanager-frontend/dist/

# Verificar configuração do Nginx
make logs-nginx

# Testar diretamente
curl -I http://localhost/
```

#### 4. SSL/TLS não funciona
```bash
# Verificar certificados
openssl x509 -in nginx/ssl/proteticflow.crt -text -noout

# Testar SSL
openssl s_client -connect seudominio.com:443

# Verificar configuração Nginx
nginx -t
```

### Logs Importantes

#### Localização dos Logs
```bash
# Logs da aplicação
make logs-web

# Logs do Nginx
make logs-nginx

# Logs do sistema
sudo journalctl -u docker
```

#### Análise de Logs
```bash
# Filtrar erros
make logs | grep -i error

# Contar requests por IP
make logs-nginx | awk '{print $1}' | sort | uniq -c | sort -nr

# Monitorar em tempo real
make logs -f
```

---

## 🛠️ Comandos Úteis

### Comandos Make Principais

```bash
# Deploy e controle
make deploy-prod          # Deploy para produção
make deploy-staging       # Deploy para staging
make start                # Iniciar serviços
make stop                 # Parar serviços
make restart              # Reiniciar serviços

# Monitoramento
make logs                 # Ver todos os logs
make logs-web            # Ver logs do Django
make logs-nginx          # Ver logs do Nginx
make status              # Ver status dos serviços

# Manutenção
make backup              # Fazer backup
make migrate             # Executar migrações
make collectstatic       # Coletar arquivos estáticos
make shell               # Shell do Django
make dbshell             # Shell do PostgreSQL

# Desenvolvimento
make dev-frontend        # Frontend em modo dev
make dev-backend         # Backend em modo dev
make test                # Executar testes
make lint                # Verificar código

# Limpeza
make clean               # Limpar containers não utilizados
make clean-all           # Limpar tudo (CUIDADO!)

# Informações
make help                # Mostrar ajuda
make info                # Mostrar informações do sistema
```

### Comandos Docker Diretos

```bash
# Containers
docker-compose ps                    # Status dos containers
docker-compose logs -f web          # Logs do Django
docker-compose exec web bash        # Shell no container Django
docker-compose exec db psql -U postgres proteticflow  # Shell PostgreSQL

# Volumes
docker volume ls                     # Listar volumes
docker volume inspect proteticflow_postgres_data  # Inspecionar volume

# Redes
docker network ls                    # Listar redes
docker network inspect proteticflow_proteticflow_network  # Inspecionar rede

# Limpeza
docker system prune -f              # Limpar containers parados
docker volume prune -f              # Limpar volumes não utilizados
docker image prune -f               # Limpar imagens não utilizadas
```

### Comandos de Sistema

```bash
# Monitoramento de recursos
htop                                 # Monitor de processos
iotop                               # Monitor de I/O
nethogs                             # Monitor de rede por processo
df -h                               # Uso de disco
free -h                             # Uso de memória

# Logs do sistema
sudo journalctl -u docker          # Logs do Docker
sudo journalctl -f                  # Logs em tempo real
tail -f /var/log/nginx/access.log   # Logs do Nginx (se instalado no host)

# Firewall
sudo ufw status                     # Status do firewall
sudo ufw allow 80                   # Permitir HTTP
sudo ufw allow 443                  # Permitir HTTPS
```

---

## 📞 Suporte e Contato

### Documentação Adicional
- **README.md** - Informações gerais do projeto
- **CHANGELOG.md** - Histórico de mudanças
- **API Documentation** - http://localhost/api/docs/

### Logs de Erro
Em caso de problemas, colete as seguintes informações:
1. Output do comando `make info`
2. Logs relevantes (`make logs`)
3. Configurações do `.env` (sem senhas)
4. Versão do Docker e Docker Compose

### Contato
- **Email:** suporte@proteticflow.com
- **GitHub Issues:** [Link do repositório]
- **Documentação:** [Link da documentação]

---

**🎉 ProteticFlow v1.1.1 - Ambiente de Produção Completo**  
*Desenvolvido com ❤️ para laboratórios de prótese dentária*

