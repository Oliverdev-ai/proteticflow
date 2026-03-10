/**
 * Sistema de logging estruturado para produção
 * ProteticFlow Frontend
 */

class Logger {
  constructor() {
    this.isProduction = import.meta.env.PROD;
    this.isDevelopment = import.meta.env.DEV;
    this.logLevel = import.meta.env.VITE_LOG_LEVEL || 'info';
  }

  /**
   * Formata mensagem de log com contexto
   */
  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getSessionId()
    };

    return logEntry;
  }

  /**
   * Obtém ID da sessão do localStorage
   */
  getSessionId() {
    try {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        return parsed.username || 'anonymous';
      }
    } catch (error) {
      // Silently fail
    }
    return 'anonymous';
  }

  /**
   * Verifica se deve logar baseado no nível
   */
  shouldLog(level) {
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    const currentLevel = levels[this.logLevel] || 2;
    const messageLevel = levels[level] || 2;

    return messageLevel <= currentLevel;
  }

  /**
   * Log de erro - sempre ativo
   */
  error(message, context = {}) {
    if (!this.shouldLog('error')) return;

    const logEntry = this.formatMessage('error', message, context);
    
    console.error('[ProteticFlow Error]', logEntry);
    
    // Em produção, enviar para serviço de monitoramento
    if (this.isProduction) {
      this.sendToMonitoring('error', logEntry);
    }
  }

  /**
   * Log de warning
   */
  warn(message, context = {}) {
    if (!this.shouldLog('warn')) return;

    const logEntry = this.formatMessage('warn', message, context);
    
    if (this.isDevelopment) {
      console.warn('[ProteticFlow Warn]', logEntry);
    }
    
    if (this.isProduction) {
      this.sendToMonitoring('warn', logEntry);
    }
  }

  /**
   * Log de informação
   */
  info(message, context = {}) {
    if (!this.shouldLog('info')) return;

    const logEntry = this.formatMessage('info', message, context);
    
    if (this.isDevelopment) {
      console.info('[ProteticFlow Info]', logEntry);
    }
    
    if (this.isProduction) {
      this.sendToMonitoring('info', logEntry);
    }
  }

  /**
   * Log de debug - apenas em desenvolvimento
   */
  debug(message, context = {}) {
    if (!this.shouldLog('debug') || this.isProduction) return;

    const logEntry = this.formatMessage('debug', message, context);
    console.debug('[ProteticFlow Debug]', logEntry);
  }

  /**
   * Log de autenticação
   */
  auth(action, context = {}) {
    const message = `Authentication: ${action}`;
    const logEntry = this.formatMessage('info', message, {
      action,
      ...context
    });

    if (this.isDevelopment) {
      console.info('[ProteticFlow Auth]', logEntry);
    }

    // Sempre enviar logs de autenticação para monitoramento
    if (this.isProduction) {
      this.sendToMonitoring('auth', logEntry);
    }
  }

  /**
   * Log de performance
   */
  performance(metric, value, context = {}) {
    const message = `Performance: ${metric} = ${value}ms`;
    const logEntry = this.formatMessage('info', message, {
      metric,
      value,
      ...context
    });

    if (this.isDevelopment) {
      console.info('[ProteticFlow Performance]', logEntry);
    }

    if (this.isProduction) {
      this.sendToMonitoring('performance', logEntry);
    }
  }

  /**
   * Envia logs para serviço de monitoramento em produção
   */
  async sendToMonitoring(type, logEntry) {
    try {
      // Em produção, implementar envio para serviço de monitoramento
      // Por exemplo: Sentry, LogRocket, ou endpoint próprio
      
      // Placeholder para implementação futura
      if (type === 'error' || type === 'auth') {
        // Enviar apenas logs críticos para não sobrecarregar
        // await fetch('/api/v1/logs/', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(logEntry)
        // });
      }
    } catch (error) {
      // Falha silenciosa para não afetar a aplicação
    }
  }
}

// Instância singleton
const logger = new Logger();

export default logger;

