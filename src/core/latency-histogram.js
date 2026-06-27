/**
 * Tiny per-key latency histogram. Tracks call count, sum, and a
 * bounded ring of recent samples for percentile estimation.
 *
 * Not as accurate as t-digest or HDR histograms, but zero-dep and
 * good enough for /metrics on a single-process Node server. Ring is
 * capped at maxSamples so memory is bounded.
 */

const DEFAULT_MAX_SAMPLES = 512;

export class LatencyHistogram {
  constructor(maxSamples = DEFAULT_MAX_SAMPLES) {
    this.maxSamples = maxSamples;
    // key -> {count, sum, samples: number[], head: number}
    this._buckets = new Map();
  }

  observe(key, ms) {
    if (typeof ms !== 'number' || !Number.isFinite(ms)) return;
    let b = this._buckets.get(key);
    if (!b) {
      b = { count: 0, sum: 0, samples: new Array(this.maxSamples), head: 0, full: false };
      this._buckets.set(key, b);
    }
    b.count++;
    b.sum += ms;
    b.samples[b.head] = ms;
    b.head = (b.head + 1) % this.maxSamples;
    if (b.head === 0) b.full = true;
  }

  /**
   * Returns {count, mean, p50, p95, p99} per key.
   * Percentiles are computed from the bounded sample ring (recent N).
   */
  snapshot() {
    const out = {};
    for (const [key, b] of this._buckets) {
      const sliceLen = b.full ? this.maxSamples : b.head;
      if (sliceLen === 0) continue;
      const sorted = b.samples.slice(0, sliceLen).sort((a, x) => a - x);
      out[key] = {
        count: b.count,
        mean: b.sum / b.count,
        p50: _quantile(sorted, 0.50),
        p95: _quantile(sorted, 0.95),
        p99: _quantile(sorted, 0.99),
      };
    }
    return out;
  }

  reset() {
    this._buckets.clear();
  }
}

function _quantile(sorted, q) {
  if (sorted.length === 0) return 0;
  // Nearest-rank: idx = ceil(q * n) - 1, clamped to [0, n-1].
  // For sorted=[1..100], p50 → sorted[49] = 50, p95 → sorted[94] = 95.
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[idx];
}

export default LatencyHistogram;
