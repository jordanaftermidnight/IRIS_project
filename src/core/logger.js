/**
 * Centralized logger for IRIS — pino-backed, env-configurable.
 *
 * Two modes:
 * - "pretty" (default for CLI): human-readable, single-line, colored.
 * - "json" (default for `iris serve`): newline-delimited JSON,
 * Loki/Promtail/Vector-friendly.
 *
 * Levels (env IRIS_LOG_LEVEL): trace, debug, info (default), warn,
 * error, fatal, silent.
 *
 * The default level is info, so debug/trace are silent unless asked
 * for. That keeps `iris chat` output uncluttered while leaving a
 * verbose mode for triage.
 *
 * IMPORTANT: user-facing CLI output (response text, provider status
 * tables, command help) stays as console.log/console.error. The logger
 * is for diagnostic events — provider lifecycle, retries, memory backend
 * connection state, config validation warnings. Don't replace
 * display-layer print statements.
 */

import pino from 'pino';

const LEVEL = process.env.IRIS_LOG_LEVEL || 'info';

function _resolveFormat() {
  if (process.env.IRIS_LOG_FORMAT) return process.env.IRIS_LOG_FORMAT;
  // Default: json when not a TTY (e.g. piped to a log shipper),
  // pretty when attached to a terminal.
  return process.stdout.isTTY ? 'pretty' : 'json';
}

function _create() {
  const fmt = _resolveFormat();
  const baseOpts = {
    level: LEVEL,
    base: { app: 'iris' },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (fmt === 'pretty') {
    try {
      return pino({
        ...baseOpts,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname,app',
            singleLine: true,
          },
        },
      });
    } catch {
      // pino-pretty missing or broken — fall through to JSON.
    }
  }

  // json (or pretty-fallback)
  return pino(baseOpts);
}

let _instance = null;

export function getLogger(bindings = {}) {
  if (!_instance) _instance = _create();
  if (Object.keys(bindings).length === 0) return _instance;
  return _instance.child(bindings);
}

/**
 * Force the format to JSON regardless of TTY state. Useful for
 * `iris serve` which we want machine-readable even when run
 * interactively.
 */
export function forceJsonFormat() {
  process.env.IRIS_LOG_FORMAT = 'json';
  _instance = null; // next getLogger() rebuilds
}

export default getLogger;
