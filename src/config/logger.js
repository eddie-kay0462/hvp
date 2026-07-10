import pino from 'pino';
import { createRequire } from 'module';

const isProd = process.env.NODE_ENV === 'production';

// pino-pretty is a devDependency, so it won't exist on the production VPS
// (npm install --omit=dev). Only use the pretty transport if it's actually
// resolvable — otherwise fall back to JSON. This prevents a boot crash when
// NODE_ENV is unset on the server.
const require = createRequire(import.meta.url);
let prettyAvailable = false;
try {
  require.resolve('pino-pretty');
  prettyAvailable = true;
} catch {
  prettyAvailable = false;
}
const usePretty = !isProd && prettyAvailable;

/**
 * Structured application logger.
 * - Production: JSON to stdout (parseable by log aggregators), level from LOG_LEVEL (default 'info').
 * - Development: human-readable pretty output via pino-pretty, level 'debug'.
 *
 * Usage: logger.info('message'), logger.error({ err }, 'context'), logger.warn(...).
 * Prefer passing the error as an object so its stack is preserved:
 *   logger.error({ err }, 'Failed to load booking');
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  // Redact common sensitive fields if they ever appear in a logged object.
  redact: {
    paths: ['req.headers.authorization', 'password', '*.password', 'access_token', '*.access_token'],
    censor: '[redacted]',
  },
  ...(usePretty
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {}),
});

export default logger;
