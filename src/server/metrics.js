/**
 * Prometheus text format renderer for IRIS.
 *
 * Exposes:
 * iris_provider_available{provider} 0|1
 * iris_provider_requests_total{provider} counter
 * iris_provider_successes_total{provider} counter
 * iris_provider_failures_total{provider} counter
 * iris_provider_response_ms_avg{provider} gauge
 * iris_provider_cost_usd_total{provider} counter
 * iris_knowledge_entries gauge
 * iris_sessions_total gauge
 * iris_memory_connected 0|1
 *
 * Pull-based: each scrape reads in-memory router state + a couple of
 * SQLite COUNT queries. No background tasks. Fast.
 */

function escapeLabel(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function metric(name, help, type, samples) {
  const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} ${type}`];
  for (const { labels = {}, value } of samples) {
    const lbl = Object.entries(labels)
      .map(([k, v]) => `${k}="${escapeLabel(v)}"`)
      .join(',');
    lines.push(lbl ? `${name}{${lbl}} ${value}` : `${name} ${value}`);
  }
  return lines.join('\n');
}

export function renderPrometheusMetrics(ai, extras = {}) {
  const status = ai.getProviderStatus();
  const stats = ai.router.getProviderStats();
  const providers = Object.keys(status).filter((k) => k !== 'summary');

  const blocks = [];

  blocks.push(metric(
    'iris_provider_available',
    'Provider availability (1 = healthy/available, 0 = unavailable)',
    'gauge',
    providers.map((name) => ({
      labels: { provider: name },
      value: status[name]?.available ? 1 : 0,
    }))));

  const counterFromStats = (suffix, help, key) => metric(
    `iris_provider_${suffix}`,
    help,
    'counter',
    providers.map((name) => ({
      labels: { provider: name },
      value: stats[name]?.[key] || 0,
    })));

  blocks.push(counterFromStats('requests_total', 'Total requests routed to provider', 'requests'));
  blocks.push(counterFromStats('successes_total', 'Total successful requests', 'successes'));
  blocks.push(counterFromStats('failures_total', 'Total failed requests', 'failures'));
  blocks.push(counterFromStats('cost_usd_total', 'Total estimated cost in USD', 'totalCost'));

  blocks.push(metric(
    'iris_provider_response_ms_avg',
    'Average response time in ms (per-process running average)',
    'gauge',
    providers.map((name) => ({
      labels: { provider: name },
      value: stats[name]?.avgResponseTime || 0,
    }))));

  const knowledgeEntries = ai.store ? ai.store.knowledgeSize() : 0;
  blocks.push(metric(
    'iris_knowledge_entries',
    'Number of entries in the knowledge base',
    'gauge',
    [{ value: knowledgeEntries }]));

  let sessionCount = 0;
  try {
    if (ai.store) sessionCount = ai.store.listSessions(10000).length;
  } catch { /* ignore */ }
  blocks.push(metric(
    'iris_sessions_total',
    'Total persistent sessions tracked',
    'gauge',
    [{ value: sessionCount }]));

  blocks.push(metric(
    'iris_memory_connected',
    'memory backend learning loop connection state (1 = connected)',
    'gauge',
    [{ value: ai.memoryClient?.connected ? 1 : 0 }]));

  // Per-tool latency percentiles (Phase v1.0 alignment).
  const toolLatency = extras.toolLatency || {};
  const toolNames = Object.keys(toolLatency).sort();
  if (toolNames.length > 0) {
    for (const stat of ['p50', 'p95', 'p99', 'mean']) {
      blocks.push(metric(
        `iris_tool_latency_ms_${stat}`,
        `Per-tool latency (${stat}) in ms`,
        'gauge',
        toolNames.map((name) => ({
          labels: { tool: name },
          value: Math.round(toolLatency[name][stat] || 0),
        }))));
    }
    blocks.push(metric(
      'iris_tool_calls_total',
      'Per-tool call count',
      'counter',
      toolNames.map((name) => ({
        labels: { tool: name },
        value: toolLatency[name].count,
      }))));
  }

  // Per-tool success/error split (Phase v1.0).
  const toolCallCount = extras.toolCallCount;
  if (toolCallCount && toolCallCount.size > 0) {
    const errorSamples = [];
    for (const [name, { err }] of toolCallCount) {
      errorSamples.push({ labels: { tool: name }, value: err });
    }
    blocks.push(metric(
      'iris_tool_errors_total',
      'Per-tool error count (handler threw)',
      'counter',
      errorSamples));
  }

  // Circuit breaker state: 0=closed, 1=half-open, 2=open.
  const breakerStates = ai.router.breaker?.snapshot() || {};
  const STATE_VALUE = { closed: 0, 'half-open': 1, open: 2 };
  const breakerSamples = providers.map((name) => ({
    labels: { provider: name },
    value: STATE_VALUE[breakerStates[name]?.state] ?? 0,
  }));
  blocks.push(metric(
    'iris_provider_breaker_state',
    'Circuit breaker state per provider (0=closed, 1=half-open, 2=open)',
    'gauge',
    breakerSamples));

  return blocks.join('\n\n') + '\n';
}

export default renderPrometheusMetrics;
