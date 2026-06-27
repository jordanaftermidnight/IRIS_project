/**
 * Append-only JSONL audit log of MCP tool invocations.
 *
 * One line per invocation with timestamp, tool, requestId, success,
 * duration, and a short args preview. Lives at $IRIS_AUDIT_LOG (default
 * ~/.iris/audit.jsonl). Created on first write; rotated by the user
 * (e.g., logrotate). Disabled if path is set to an empty string.
 *
 * Standard JSONL audit-log pattern for cross-machine audit
 * trails. Writes are synchronous fs.appendFileSync — cheap enough at
 * IRIS's expected call rates, no risk of dropped lines on crash.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export class AuditLog {
  constructor(filePath) {
    this.path = filePath ?? process.env.IRIS_AUDIT_LOG ??
      path.join(os.homedir(), '.iris', 'audit.jsonl');
    this.enabled = !!this.path;
    if (this.enabled) {
      try {
        fs.mkdirSync(path.dirname(this.path), { recursive: true });
      } catch { /* fall through — appendFileSync surfaces real errors */ }
    }
  }

  /**
   * Record one tool invocation.
   * @param {Object} entry
   * @param {string} entry.tool
   * @param {string} [entry.requestId]
   * @param {boolean} entry.success
   * @param {number} entry.durationMs
   * @param {Object} [entry.args] Will be JSON-stringified and truncated.
   * @param {string} [entry.error]
   */
  record(entry) {
    if (!this.enabled) return;
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      tool: entry.tool,
      requestId: entry.requestId || null,
      success: !!entry.success,
      durationMs: entry.durationMs ?? 0,
      argsPreview: entry.args !== undefined ? _truncate(entry.args, 500) : null,
      error: entry.error || null,
    }) + '\n';
    try {
      fs.appendFileSync(this.path, line);
    } catch {
      // Don't break the tool call if the audit log is unwritable.
    }
  }
}

function _truncate(obj, max) {
  try {
    const s = JSON.stringify(obj);
    return s.length > max ? s.slice(0, max) + '…' : s;
  } catch {
    return String(obj).slice(0, max);
  }
}

export default AuditLog;
