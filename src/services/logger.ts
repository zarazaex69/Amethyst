import { config } from '../config/env';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private level: LogLevel;

  constructor() {
    this.level = this.parseLogLevel(config.logging.level);
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message} ${args.length > 0 ? JSON.stringify(args) : ''}`;
  }

  error(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message, ...args));
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, ...args));
    }
  }
}

export const logger = new Logger();
