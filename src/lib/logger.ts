const isProd = process.env.NODE_ENV === 'production'

type LogLevel = 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown>

function log(level: LogLevel, message: string, ctx?: LogContext) {
  if (isProd) {
    const entry = JSON.stringify({ level, message, ...ctx, ts: new Date().toISOString() })
    if (level === 'error') console.error(entry)
    else if (level === 'warn') console.warn(entry)
    else console.log(entry)
  } else {
    const prefix = level === 'error' ? '✗' : level === 'warn' ? '⚠' : '•'
    const ctxStr = ctx ? ' ' + JSON.stringify(ctx) : ''
    if (level === 'error') console.error(`[guardian] ${prefix} ${message}${ctxStr}`)
    else if (level === 'warn') console.warn(`[guardian] ${prefix} ${message}${ctxStr}`)
    else console.log(`[guardian] ${prefix} ${message}${ctxStr}`)
  }
}

export const logger = {
  info: (message: string, ctx?: LogContext) => log('info', message, ctx),
  warn: (message: string, ctx?: LogContext) => log('warn', message, ctx),
  error: (message: string, ctx?: LogContext) => log('error', message, ctx),
}
