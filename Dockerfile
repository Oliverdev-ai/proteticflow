# Multi-stage build para otimização
FROM python:3.11-slim as builder

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Criar usuário não-root
RUN useradd --create-home --shell /bin/bash app

# Configurar diretório de trabalho
WORKDIR /app

# Copiar e instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage final
FROM python:3.11-slim

# Instalar dependências de runtime
RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Criar usuário não-root
RUN useradd --create-home --shell /bin/bash app

# Configurar diretório de trabalho
WORKDIR /app

# Copiar dependências Python do builder
COPY --from=builder /root/.local /home/app/.local

# Copiar código da aplicação
COPY --chown=app:app . .

# Criar diretórios necessários
RUN mkdir -p /app/staticfiles /app/media /app/logs && \
    chown -R app:app /app

# Configurar PATH para incluir pacotes do usuário
ENV PATH=/home/app/.local/bin:$PATH

# Mudar para usuário não-root
USER app

# Coletar arquivos estáticos
RUN python manage.py collectstatic --noinput --settings=labmanager.settings_production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/admin/ || exit 1

# Expor porta
EXPOSE 8000

# Comando padrão
CMD ["gunicorn", "labmanager.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--worker-class", "gevent", \
     "--worker-connections", "1000", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "100", \
     "--timeout", "30", \
     "--keep-alive", "2", \
     "--log-level", "info", \
     "--access-logfile", "-", \
     "--error-logfile", "-"] 