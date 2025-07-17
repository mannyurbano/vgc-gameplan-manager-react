// Centralized logging utility for VGC Team Manager
// Provides controlled logging that can be disabled in production

interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn', 
  INFO: 'info',
  DEBUG: 'debug'
};

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isDebugEnabled = this.isDevelopment || process.env.REACT_APP_DEBUG === 'true';

  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.isDebugEnabled) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  // OAuth specific logging with emoji
  oauth(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.log(`🔐 ${message}`, ...args);
    }
  }

  // Pokemon/Game specific logging
  game(message: string, ...args: any[]): void {
    if (this.isDebugEnabled) {
      console.log(`🎮 ${message}`, ...args);
    }
  }
}

export const logger = new Logger();
export default logger;