// Logger utility

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export function createLogger(context: string, level: LogLevel = 'info'): Logger {
  const levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  const shouldLog = (msgLevel: LogLevel) => levels[msgLevel] >= levels[level];

  const formatMessage = (msg: string) => `[${new Date().toISOString()}] [${context}] ${msg}`;

  return {
    debug: (msg, ...args) => shouldLog('debug') && console.debug(formatMessage(msg), ...args),
    info: (msg, ...args) => shouldLog('info') && console.info(formatMessage(msg), ...args),
    warn: (msg, ...args) => shouldLog('warn') && console.warn(formatMessage(msg), ...args),
    error: (msg, ...args) => shouldLog('error') && console.error(formatMessage(msg), ...args)
  };
}
