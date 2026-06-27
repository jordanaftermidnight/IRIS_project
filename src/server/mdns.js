/**
 * mDNS service advertisement for the IRIS MCP server.
 *
 * Publishes `_iris._mcp._tcp.local.` so dockview clients and
 * attribution-style discoverers can find IRIS on the LAN without
 * configuration. A standard mDNS pattern.
 *
 * `bonjour-service` is optional — if it can't load (rare; ships pure
 * JS), advertisement silently no-ops and the server still works.
 */

import os from 'node:os';
import { getLogger } from '../core/logger.js';

const log = getLogger({ component: 'mdns' });

let Bonjour = null;
try {
  ({ Bonjour } = await import('bonjour-service'));
} catch (err) {
  log.warn({ err: err?.message }, 'bonjour-service unavailable — mDNS disabled');
}

export class MdnsAdvertiser {
  /**
   * @param {Object} opts
   * @param {number} opts.port
   * @param {string} [opts.agentId='iris']
   * @param {string} [opts.version='1.0.0']
   * @param {string[]} [opts.providers=[]] List of registered provider names (TXT property).
   * @param {boolean} [opts.requiresAuth=false] Whether bearer token is required.
   */
  constructor({ port, agentId = 'iris', version = '1.0.0', providers = [], requiresAuth = false }) {
    this.port = port;
    this.agentId = agentId;
    this.version = version;
    this.providers = providers;
    this.requiresAuth = requiresAuth;
    this._bonjour = null;
    this._service = null;
  }

  start() {
    if (!Bonjour) return false;
    try {
      this._bonjour = new Bonjour();
      this._service = this._bonjour.publish({
        name: `iris-${this.agentId}-${os.hostname()}`,
        type: 'iris-mcp',
        port: this.port,
        txt: {
          version: this.version,
          agent: this.agentId,
          requires_auth: String(this.requiresAuth),
          providers: this.providers.slice(0, 20).join(','), // TXT size cap
          host: os.hostname(),
        },
      });
      log.info({ port: this.port, agentId: this.agentId, type: '_iris-mcp._tcp.local.' },
        'mDNS service advertised');
      return true;
    } catch (err) {
      log.warn({ err: err?.message }, 'mDNS publish failed');
      this._cleanup();
      return false;
    }
  }

  stop() {
    return new Promise((resolve) => {
      if (!this._service) { this._cleanup(); resolve(); return; }
      try {
        this._service.stop(() => { this._cleanup(); resolve(); });
      } catch {
        this._cleanup();
        resolve();
      }
    });
  }

  _cleanup() {
    if (this._bonjour) {
      try { this._bonjour.destroy(); } catch { /* ignore */ }
    }
    this._bonjour = null;
    this._service = null;
  }
}

export default MdnsAdvertiser;
