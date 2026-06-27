/**
 * Council orchestrator — fan a single prompt out to N providers in
 * parallel and return their responses side-by-side. No ranking,
 * no synthesis — the caller looks at the answers and decides.
 *
 * Failed providers come back as {provider, error, latency} so one bad
 * apple doesn't poison the whole call. Latency and cost are per-call,
 * not aggregated.
 *
 * Each successful call also updates the router's provider stats via
 * updateProviderStats — council usage feeds the same scoring history
 * as normal routed chat. Session persistence intentionally NOT wired:
 * council is a comparison tool, not a conversation.
 *
 * Optional `--judge=<provider>` mode: after fan-out, ask the named
 * provider to rank the panel. Returns ordered results with a `judgment`
 * payload on each (rank, reason). Parse-tolerant — if the judge replies
 * with non-JSON, falls back to original order.
 */

import { withDeadline } from './timeout.js';

/**
 * @typedef {Object} CouncilResult
 * @property {string} provider
 * @property {string} [model]
 * @property {string} [response]
 * @property {string} [error]
 * @property {number} latencyMs
 * @property {number} [cost]
 * @property {boolean} success
 */

/**
 * Run the council.
 *
 * @param {Object} args
 * @param {import('./ai-router.js').AIRouter} args.router
 * @param {string} args.message
 * @param {Object} [args.options]
 * @param {string[]} [args.options.providers] Whitelist (otherwise: every registered provider).
 * @param {string[]} [args.options.exclude] Blacklist.
 * @param {string} [args.options.taskType="balanced"]
 * @param {number} [args.options.timeoutMs=60000]
 * @returns {Promise<{results: CouncilResult[], totalCost: number, totalLatencyMs: number}>}
 */
export async function runCouncil({ router, message, options = {} }) {
  if (!message || typeof message !== 'string') {
    throw new Error('runCouncil: message must be a non-empty string');
  }

  const taskType = options.taskType || 'balanced';
  const timeoutMs = options.timeoutMs || 60000;
  const explicit = Array.isArray(options.providers) ? new Set(options.providers) : null;
  const exclude = new Set(options.exclude || []);

  const targets = [];
  for (const [name, provider] of router.providers) {
    if (explicit && !explicit.has(name)) continue;
    if (exclude.has(name)) continue;
    targets.push({ name, provider });
  }

  if (targets.length === 0) {
    throw new Error('No providers selected for the council');
  }

  const startedAt = Date.now();

  const settled = await Promise.allSettled(
    targets.map(({ name, provider }) => _callOne({ name, provider, message, taskType, timeoutMs })));

  const results = settled.map((s, i) => {
    const name = targets[i].name;
    if (s.status === 'fulfilled') return s.value;
    return {
      provider: name,
      success: false,
      latencyMs: 0,
      error: s.reason?.message || String(s.reason),
    };
  });

  // Feed each call back to the router's stats — council usage influences
  // future routing the same way a regular chat does.
  for (const r of results) {
    router.updateProviderStats(
      r.provider,
      r.success,
      r.success ? r.latencyMs : 0,
      r.cost || 0,
      taskType,
      message.slice(0, 100));
  }

  let judgeInfo = null;
  let orderedResults = results;
  let merged = null;

  // Merge strategy (attribution-style): concatenate all successful responses
  // with [provider] attribution. Useful when callers want one unified
  // payload rather than a panel for visual inspection. Independent of
  // the judge — both can run if desired.
  if (options.merge) {
    const successful = results.filter((r) => r.success);
    merged = successful
      .map((r) => `[${r.provider}]\n${r.response.trim()}`)
      .join('\n\n---\n\n');
  }

  if (options.judge) {
    const judgeProvider = router.providers.get(options.judge);
    if (!judgeProvider) {
      judgeInfo = { provider: options.judge, error: `judge provider not registered`, fallback: 'unregistered' };
    } else {
      judgeInfo = await _runJudge({ judgeProvider, judgeName: options.judge, message, results, timeoutMs });
      if (Array.isArray(judgeInfo.ranking) && judgeInfo.ranking.length > 0) {
        orderedResults = _applyRanking(results, judgeInfo.ranking);
        judgeInfo.fallback = null;
      } else if (!judgeInfo.fallback) {
        // _runJudge sets fallback for known soft-fail reasons (timeout,
        // <2 panelists, judge failure). If we got here with no ranking
        // and no fallback already labeled, the judge replied but the
        // output was unparseable.
        judgeInfo.fallback = judgeInfo.error ? 'judge_error' : 'unparseable';
      }
    }
  }

  const totalCost = orderedResults.reduce((a, r) => a + (r.cost || 0), 0)
    + (judgeInfo?.cost || 0);
  const totalLatencyMs = Date.now() - startedAt;

  // Live event for the dockview clients & other subscribers.
  // Router has the events emitter — piggyback rather than threading
  // it through every caller separately.
  if (router.events) {
    try {
      router.events.emit('iris', {
        type: 'council',
        panelSize: orderedResults.length,
        successCount: orderedResults.filter((r) => r.success).length,
        totalCost,
        totalLatencyMs,
        judge: judgeInfo ? { provider: judgeInfo.provider, ranked: !!judgeInfo.ranking } : null,
        timestamp: new Date().toISOString(),
      });
    } catch { /* swallow */ }
  }

  return { results: orderedResults, totalCost, totalLatencyMs, judge: judgeInfo, merged };
}

async function _runJudge({ judgeProvider, judgeName, message, results, timeoutMs }) {
  const successful = results.filter((r) => r.success);
  if (successful.length < 2) {
    return {
      provider: judgeName,
      note: 'judge skipped — fewer than 2 successful responses',
      fallback: 'insufficient_panel',
      cost: 0,
    };
  }

  const numbered = successful.map((r, i) => `Response ${i + 1} from ${r.provider}:\n${r.response}`).join('\n\n---\n\n');
  const prompt = `You are evaluating responses from different AI providers to the same prompt. Rank them by quality (1 = best).

Original prompt: ${message}

${numbered}

Reply with ONLY a JSON array, no prose, in this exact format:
[{"provider":"name1","rank":1,"reason":"one short sentence"},{"provider":"name2","rank":2,"reason":"..."}]

Use the exact provider names shown above. Include every response.`;

  const startTime = Date.now();
  const abortController = new AbortController();
  try {
    const result = await withDeadline(
      judgeProvider.chat(prompt, { taskType: 'reasoning', signal: abortController.signal }),
      timeoutMs, `${judgeName} judge call`, abortController);
    const ranking = _parseJudgment(result.response, successful);
    return {
      provider: judgeName,
      model: result.model,
      latencyMs: Date.now() - startTime,
      cost: result.usage?.cost || 0,
      ranking,
      raw: ranking ? undefined : result.response.slice(0, 500),
      fallback: ranking ? null : null, // filled by caller if no ranking
    };
  } catch (error) {
    return {
      provider: judgeName,
      latencyMs: Date.now() - startTime,
      cost: 0,
      error: error.message,
      fallback: 'judge_call_failed',
    };
  }
}

/**
 * Parse a judge response into a ranking array. Tolerant of:
 * - JSON wrapped in ```json fences
 * - Leading prose followed by a JSON block
 * - Provider names that don't match anything in `successful` (filtered out)
 * Returns null on unrecoverable parse failure.
 */
function _parseJudgment(text, successful) {
  if (!text || typeof text !== 'string') return null;

  const candidates = [];
  // Strip fenced blocks first.
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenced) candidates.push(fenced[1]);
  // Whole-text JSON.
  candidates.push(text);
  // First JSON array in the text.
  const bracket = /\[[\s\S]*?\]/.exec(text);
  if (bracket) candidates.push(bracket[0]);

  const validNames = new Set(successful.map((r) => r.provider));
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c.trim());
      if (!Array.isArray(parsed)) continue;
      const cleaned = parsed
        .filter((p) => p && typeof p === 'object' && validNames.has(p.provider) && typeof p.rank === 'number')
        .map((p) => ({ provider: p.provider, rank: p.rank, reason: p.reason || '' }));
      if (cleaned.length === 0) continue;
      // Stable sort by rank ascending.
      cleaned.sort((a, b) => a.rank - b.rank);
      return cleaned;
    } catch { /* try next candidate */ }
  }
  return null;
}

function _applyRanking(results, ranking) {
  const orderIndex = new Map();
  ranking.forEach((r, i) => orderIndex.set(r.provider, i));
  // Attach judgment payload + sort. Unranked (failures, or providers
  // missing from judge output) fall to the end in original order.
  const tagged = results.map((r) => ({
    ...r,
    judgment: ranking.find((j) => j.provider === r.provider) || null,
  }));
  tagged.sort((a, b) => {
    const ai = orderIndex.has(a.provider) ? orderIndex.get(a.provider) : Number.MAX_SAFE_INTEGER;
    const bi = orderIndex.has(b.provider) ? orderIndex.get(b.provider) : Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });
  return tagged;
}

// Exported for unit tests.
export const _internals = { _parseJudgment, _applyRanking };

async function _callOne({ name, provider, message, taskType, timeoutMs }) {
  const startTime = Date.now();
  const abortController = new AbortController();
  try {
    const result = await withDeadline(
      provider.chat(message, { taskType, signal: abortController.signal }),
      timeoutMs, `${name} council call`, abortController);
    return {
      provider: name,
      model: result.model,
      response: result.response,
      latencyMs: Date.now() - startTime,
      cost: result.usage?.cost || 0,
      success: true,
    };
  } catch (error) {
    return {
      provider: name,
      success: false,
      latencyMs: Date.now() - startTime,
      error: error.message,
    };
  }
}

export default runCouncil;
