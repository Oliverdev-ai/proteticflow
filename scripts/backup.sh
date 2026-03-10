#!/bin/bash

# ProteticFlow - Script de Backup Automatizado
# Uso: ./scripts/backup.sh

set -e

# Configurações
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql"
MEDIA_BACKUP_FILE="$BACKUP_DIR/media_backup_$DATE.tar.gz"

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR"

log "Iniciando backup do ProteticFlow..."

# Backup do banco de dados
log "Fazendo backup do banco de dados..."
docker-compose exec -T db pg_dump -U postgres proteticflow > "$DB_BACKUP_FILE"
success "Backup do banco salvo em: $DB_BACKUP_FILE"

# Backup dos arquivos de media
log "Fazendo backup dos arquivos de media..."
docker run --rm -v proteticflow_media_volume:/data -v $(pwd)/backups:/backup alpine tar czf /backup/media_backup_$DATE.tar.gz -C /data .
success "Backup de media salvo em: $MEDIA_BACKUP_FILE"

# Compactar backups antigos (manter apenas últimos 7 dias)
log "Limpando backups antigos..."
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

# Mostrar tamanho dos backups
log "Resumo dos backups:"
ls -lh "$BACKUP_DIR"/*$DATE*

success "Backup concluído com sucesso!"

