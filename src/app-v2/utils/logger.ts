/**
 * Simple logging utility for development
 * In production, this could be replaced with a proper logging service
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  prefix?: string;
}

const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  private config: LoggerConfig;
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      level: 'info',
      ...config
    };
  }
  
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return logLevels[level] >= logLevels[this.config.level];
  }
  
  private formatMessage(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) return;
    
    const prefix = this.config.prefix ? `[${this.config.prefix}] ` : '';
    const timestamp = new Date().toISOString();
    
    switch (level) {
      case 'debug':
        console.debug(`${timestamp} ${prefix}${message}`, ...args);
        break;
      case 'info':
        console.info(`${timestamp} ${prefix}${message}`, ...args);
        break;
      case 'warn':
        console.warn(`${timestamp} ${prefix}${message}`, ...args);
        break;
      case 'error':
        console.error(`${timestamp} ${prefix}${message}`, ...args);
        break;
    }
  }
  
  debug(message: string, ...args: any[]): void {
    this.formatMessage('debug', message, ...args);
  }
  
  info(message: string, ...args: any[]): void {
    this.formatMessage('info', message, ...args);
  }
  
  warn(message: string, ...args: any[]): void {
    this.formatMessage('warn', message, ...args);
  }
  
  error(message: string, ...args: any[]): void {
    this.formatMessage('error', message, ...args);
  }
  
  /**
   * Create a child logger with a specific prefix
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: this.config.prefix ? `${this.config.prefix}:${prefix}` : prefix
    });
  }
}

// Create default logger instance
export const logger = new Logger();

// Export factory function for creating component-specific loggers
export function createLogger(prefix: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger({ prefix, ...config });
}