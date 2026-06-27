import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Ordered list of schema migrations. Each entry's `up(db)` runs exactly
 * once on databases at version < entry.version. Never edit a past
 * migration's `up` — append a new one instead.
 */
const _MIGRATIONS = [
  {
    version: 1,
    description: 'initial schema (provider_stats, requests, sessions, messages, knowledge)',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS provider_stats (
          provider TEXT PRIMARY KEY,
          requests INTEGER NOT NULL DEFAULT 0,
          successes INTEGER NOT NULL DEFAULT 0,
          failures INTEGER NOT NULL DEFAULT 0,
          avg_response_time_ms REAL NOT NULL DEFAULT 0,
          total_cost REAL NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          provider TEXT NOT NULL,
          task_type TEXT NOT NULL,
          success INTEGER NOT NULL,
          response_time_ms INTEGER NOT NULL DEFAULT 0,
          cost REAL NOT NULL DEFAULT 0,
          message_preview TEXT,
          ts TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_requests_ts ON requests(ts DESC);
        CREATE INDEX IF NOT EXISTS idx_requests_provider ON requests(provider);

        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL DEFAULT 'iris',
          created_at TEXT NOT NULL,
          last_used_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
          content TEXT NOT NULL,
          provider TEXT,
          model TEXT,
          ts TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id);

        CREATE TABLE IF NOT EXISTS knowledge (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          access_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    },
  },
  // Future migrations append here. Example for reference:
  // {
  // version: 2,
  // description: 'add request_id column to requests',
  // up: (db) => db.exec('ALTER TABLE requests ADD COLUMN request_id TEXT'),
  // },
];

/** Exported for tests + ops scripts. */
export const CURRENT_SCHEMA_VERSION = _MIGRATIONS[_MIGRATIONS.length - 1].version;

/**
 * IrisStore — persistent SQLite store for provider stats, request history,
 * conversation sessions, and the local knowledge base.
 *
 * Default location: $IRIS_DB or ~/.iris/iris.db
 * Synchronous by design (better-sqlite3) — fast, no callbacks.
 */
export class IrisStore {
  constructor(dbPath) {
    this.dbPath = dbPath || process.env.IRIS_DB || path.join(os.homedir(), '.iris', 'iris.db');
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this._migrate();
  }

  /**
   * Versioned migration framework. The schema_version table is the
   * source of truth — _MIGRATIONS is the in-order list of upgrades.
   * Each migration is run exactly once and recorded with a timestamp.
   *
   * To add a v2: append a new entry to _MIGRATIONS with version: 2 and
   * an `up(db)` function. Old databases auto-upgrade on next open;
   * fresh databases get every migration applied in order, ending at the
   * same final state.
   */
  _migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);

    const currentVersion = this.db
      .prepare('SELECT COALESCE(MAX(version), 0) AS v FROM schema_version')
      .get().v;

    for (const m of _MIGRATIONS) {
      if (m.version <= currentVersion) continue;
      const tx = this.db.transaction(() => {
        m.up(this.db);
        this.db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)')
          .run(m.version, new Date().toISOString());
      });
      tx();
    }
  }

  /**
   * Inspector — returns the highest applied schema version. For tests
   * and ops scripts.
   */
  schemaVersion() {
    return this.db
      .prepare('SELECT COALESCE(MAX(version), 0) AS v FROM schema_version')
      .get().v;
  }

  // ---- provider stats ----

  getProviderStats(provider) {
    return this.db
      .prepare('SELECT * FROM provider_stats WHERE provider = ?')
      .get(provider);
  }

  getAllProviderStats() {
    const rows = this.db.prepare('SELECT * FROM provider_stats').all();
    const out = {};
    for (const r of rows) out[r.provider] = r;
    return out;
  }

  recordRequest({ provider, taskType, success, responseTimeMs, cost, messagePreview }) {
    const now = new Date().toISOString();
    const tx = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO requests (provider, task_type, success, response_time_ms, cost, message_preview, ts)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(provider, taskType, success ? 1 : 0, responseTimeMs || 0, cost || 0, messagePreview || null, now);

      const existing = this.getProviderStats(provider);
      if (!existing) {
        this.db.prepare(`
          INSERT INTO provider_stats (provider, requests, successes, failures, avg_response_time_ms, total_cost, updated_at)
          VALUES (?, 1, ?, ?, ?, ?, ?)
        `).run(provider, success ? 1 : 0, success ? 0 : 1, success ? (responseTimeMs || 0) : 0, cost || 0, now);
      } else {
        const newRequests = existing.requests + 1;
        const newSuccesses = existing.successes + (success ? 1 : 0);
        const newFailures = existing.failures + (success ? 0 : 1);
        const newAvg = success
          ? (existing.avg_response_time_ms * existing.successes + (responseTimeMs || 0)) / Math.max(newSuccesses, 1)
          : existing.avg_response_time_ms;
        const newCost = existing.total_cost + (cost || 0);
        this.db.prepare(`
          UPDATE provider_stats
          SET requests = ?, successes = ?, failures = ?, avg_response_time_ms = ?, total_cost = ?, updated_at = ?
          WHERE provider = ?
        `).run(newRequests, newSuccesses, newFailures, newAvg, newCost, now, provider);
      }
    });
    tx();
  }

  getRecentRequests(limit = 10, sinceIso = null) {
    if (sinceIso) {
      return this.db
        .prepare('SELECT * FROM requests WHERE ts >= ? ORDER BY id DESC LIMIT ?')
        .all(sinceIso, limit);
    }
    return this.db
      .prepare('SELECT * FROM requests ORDER BY id DESC LIMIT ?')
      .all(limit);
  }

  /**
   * Cost grouped by provider. Returns [{provider, requests, cost, avg_ms}].
   * `sinceIso` is optional; without it returns lifetime totals.
   */
  getCostSummary(sinceIso = null) {
    const sql = sinceIso
      ? `SELECT provider,
                COUNT(*) AS requests,
                SUM(cost) AS cost,
                AVG(response_time_ms) AS avg_ms,
                SUM(success) AS successes
         FROM requests
         WHERE ts >= ?
         GROUP BY provider
         ORDER BY cost DESC`
      : `SELECT provider,
                COUNT(*) AS requests,
                SUM(cost) AS cost,
                AVG(response_time_ms) AS avg_ms,
                SUM(success) AS successes
         FROM requests
         GROUP BY provider
         ORDER BY cost DESC`;
    const stmt = this.db.prepare(sql);
    return sinceIso ? stmt.all(sinceIso) : stmt.all();
  }

  // ---- sessions ----

  createSession(id) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO sessions (id, created_at, last_used_at) VALUES (?, ?, ?)
    `).run(id, now, now);
    return { id, created_at: now, last_used_at: now };
  }

  getSession(id) {
    return this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  }

  touchSession(id) {
    this.db.prepare('UPDATE sessions SET last_used_at = ? WHERE id = ?')
      .run(new Date().toISOString(), id);
  }

  listSessions(limit = 20) {
    return this.db
      .prepare('SELECT * FROM sessions ORDER BY last_used_at DESC LIMIT ?')
      .all(limit);
  }

  deleteSession(id) {
    return this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id).changes > 0;
  }

  appendMessage(sessionId, role, content, { provider = null, model = null } = {}) {
    if (!this.getSession(sessionId)) this.createSession(sessionId);
    this.db.prepare(`
      INSERT INTO messages (session_id, role, content, provider, model, ts)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionId, role, content, provider, model, new Date().toISOString());
    this.touchSession(sessionId);
  }

  getMessages(sessionId, limit = 20) {
    return this.db.prepare(`
      SELECT * FROM (
        SELECT * FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT ?
      ) ORDER BY id ASC
    `).all(sessionId, limit);
  }

  // ---- knowledge ----

  setKnowledge(key, value) {
    const now = new Date().toISOString();
    const json = JSON.stringify(value);
    this.db.prepare(`
      INSERT INTO knowledge (key, value, access_count, created_at, updated_at)
      VALUES (?, ?, 0, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, json, now, now);
  }

  getKnowledge(key) {
    const row = this.db.prepare('SELECT * FROM knowledge WHERE key = ?').get(key);
    if (!row) return null;
    this.db.prepare('UPDATE knowledge SET access_count = access_count + 1 WHERE key = ?').run(key);
    try { return JSON.parse(row.value); } catch { return row.value; }
  }

  knowledgeSize() {
    return this.db.prepare('SELECT COUNT(*) as n FROM knowledge').get().n;
  }

  close() {
    this.db.close();
  }
}

export default IrisStore;
