/**
 * Per-provider circuit breaker.
 *
 * Three states:
 * - closed — normal operation. Failures are tallied in a rolling
 * window. When `failureThreshold` is hit within
 * `windowMs`, transition to open.
 * - open — provider is excluded from routing for `cooldownMs`.
 * After the cooldown, transition to half-open.
 * - half-open — exactly one probe is allowed through. If it
 * succeeds, transition to closed. If it fails,
 * transition straight back to open with a fresh
 * cooldown.
 *
 * The 60s/10s `availabilityCache` (router) is complementary, not a
 * substitute: that cache prevents repeated `isAvailable()` pings, while
 * the breaker reacts to actual chat-failure rate. A provider can be
 * reachable (`isAvailable === true`) but consistently erroring — the
 * breaker catches that.
 */

const DEFAULT_OPTS = {
  failureThreshold: 5, // failures within window to open the breaker
  windowMs: 60_000, // rolling window for failure counting
  cooldownMs: 30_000, // how long the breaker stays open
};

export class CircuitBreaker {
  constructor(opts = {}) {
    const { events, ...rest } = opts;
    this.opts = { ...DEFAULT_OPTS, ...rest };
    this.events = events || null;
    // providerName -> { state, failures: [timestamps], openedAt, probeInFlight }
    this._state = new Map();
  }

  _transition(provider, from, to) {
    if (!this.events || from === to) return;
    try {
      this.events.emit('iris', {
        type: 'breaker',
        provider,
        from,
        to,
        timestamp: new Date().toISOString(),
      });
    } catch { /* swallow */ }
  }

  _entry(provider) {
    let e = this._state.get(provider);
    if (!e) {
      e = { state: 'closed', failures: [], openedAt: 0, probeInFlight: false };
      this._state.set(provider, e);
    }
    return e;
  }

  _prune(e, now) {
    const cutoff = now - this.opts.windowMs;
    e.failures = e.failures.filter((t) => t > cutoff);
  }

  /**
   * Should the router include this provider in selection?
   * Side effect: transitions open → half-open when the cooldown elapses.
   */
  canRoute(provider, now = Date.now()) {
    const e = this._entry(provider);
    if (e.state === 'closed') return true;
    if (e.state === 'open') {
      if (now - e.openedAt >= this.opts.cooldownMs) {
        // Transition + reserve the probe slot in one step. Without
        // setting probeInFlight here, the next caller sees half-open
        // with no probe in flight and a second concurrent probe slips
        // through.
        e.state = 'half-open';
        e.probeInFlight = true;
        this._transition(provider, 'open', 'half-open');
        return true;
      }
      return false;
    }
    // half-open: allow exactly one probe in flight at a time.
    if (e.probeInFlight) return false;
    e.probeInFlight = true;
    return true;
  }

  /** Tally a successful chat. Closes the breaker if half-open. */
  recordSuccess(provider, now = Date.now()) {
    const e = this._entry(provider);
    if (e.state === 'half-open') {
      e.state = 'closed';
      e.failures = [];
      e.probeInFlight = false;
      this._transition(provider, 'half-open', 'closed');
      return;
    }
    // In closed state, success doesn't clear the failure window —
    // that would let a 4-fail/1-pass/4-fail pattern stay closed
    // indefinitely. We just let the window expire naturally.
    e.probeInFlight = false;
  }

  /**
   * Tally a failure. Returns true if THIS failure tripped the breaker.
   */
  recordFailure(provider, now = Date.now()) {
    const e = this._entry(provider);
    if (e.state === 'half-open') {
      // Failed the probe — re-open with fresh cooldown.
      e.state = 'open';
      e.openedAt = now;
      e.probeInFlight = false;
      this._transition(provider, 'half-open', 'open');
      return false; // not a new trip
    }
    e.failures.push(now);
    this._prune(e, now);
    if (e.state === 'closed' && e.failures.length >= this.opts.failureThreshold) {
      e.state = 'open';
      e.openedAt = now;
      this._transition(provider, 'closed', 'open');
      return true;
    }
    return false;
  }

  /** Inspector — current state + failure count in window. */
  inspect(provider, now = Date.now()) {
    const e = this._entry(provider);
    this._prune(e, now);
    return {
      state: e.state,
      failuresInWindow: e.failures.length,
      msSinceOpen: e.state === 'open' ? now - e.openedAt : null,
    };
  }

  /** Force-reset a provider to closed (e.g., admin override). */
  reset(provider) {
    this._state.delete(provider);
  }

  /** All breakers' states — for /metrics. */
  snapshot(now = Date.now()) {
    const out = {};
    for (const [name] of this._state) out[name] = this.inspect(name, now);
    return out;
  }
}

export default CircuitBreaker;
