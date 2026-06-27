/**
 * Deterministic, lightweight task classifier. Inspects a user message
 * and infers (taskType, complexity ∈ [0,1]) using regex + keyword
 * scoring. No ML; runs in microseconds.
 *
 * Used when the caller doesn't supply `taskType` — the router gets a
 * reasonable guess instead of defaulting to "balanced" for everything.
 *
 * Implements regex+keyword scoring and to
 * IRIS's task vocabulary (code/creative/fast/complex/reasoning/vision/
 * ultra_fast/balanced).
 *
 * Exports `classify(message)` -> {taskType, complexity, signals}.
 */

const PATTERNS = [
  { taskType: 'code', signals: [
    /\b(function|class|method|variable|loop|array|object|import|export|return)\b/i,
    /\b(bug|debug|stack trace|error|exception|TypeError|ReferenceError)\b/i,
    /\b(refactor|optimize|implement|write a .* (function|method|class|script))\b/i,
    /\b(python|javascript|typescript|rust|go|java|c\+\+|sql)\b/i,
    /```[\s\S]*```/, // code block
    /\b(npm|pip|cargo|gradle|maven)\b/i,
  ], weight: 1.0 },
  { taskType: 'reasoning', signals: [
    /\b(why|how does|explain why|reason about|prove|derive)\b/i,
    /\b(step[- ]by[- ]step|think through|chain of thought)\b/i,
    /\b(theorem|proof|logic|fallacy|deduction)\b/i,
  ], weight: 1.0 },
  { taskType: 'complex', signals: [
    /\b(analy[sz]e|comprehensive|in[- ]depth|deep[- ]dive)\b/i,
    /\b(research|investigate|survey|compare and contrast)\b/i,
    /\b(architecture|design[- ]review|trade[- ]off)\b/i,
  ], weight: 1.0 },
  { taskType: 'creative', signals: [
    /\b(story|poem|haiku|narrative|character|plot)\b/i,
    /\b(brainstorm|imagine|invent|come up with)\b/i,
    /\b(metaphor|analogy|simile)\b/i,
  ], weight: 1.0 },
  { taskType: 'vision', signals: [
    /\b(image|picture|photo|screenshot|diagram|chart|graph)\b/i,
    /\b(describe what (you )?see|what['']?s in|caption)\b/i,
  ], weight: 1.2 },
  { taskType: 'ultra_fast', signals: [
    /^(yes|no|hi|hello|ok|thanks?|sup)\W*$/i,
    /^.{1,15}\?\s*$/, // very short question
  ], weight: 1.5 },
  { taskType: 'fast', signals: [
    /^(what|when|where|who) is\b/i,
    /^define\b/i,
    /^(list|name|give me) (a |the )?\w+/i,
  ], weight: 1.0 },
];

const COMPLEXITY_BUMPS = [
  { pattern: /\b(comprehensive|exhaustive|in[- ]depth|thoroughly|step[- ]by[- ]step)\b/i, bump: 0.25 },
  { pattern: /\b(consider every|all the .*? edge cases|every scenario)\b/i, bump: 0.20 },
  { pattern: /\b(multi[- ]?(step|stage|phase))\b/i, bump: 0.15 },
];

/**
 * @param {string} message
 * @returns {{taskType: string, complexity: number, signals: Object}}
 * taskType: best-guess task name from IRIS's vocabulary
 * complexity: 0.0 (trivial) → 1.0 (highly complex)
 * signals: per-taskType score + length factors (for debugging)
 */
export function classify(message) {
  if (!message || typeof message !== 'string') {
    return { taskType: 'balanced', complexity: 0.3, signals: { reason: 'empty' } };
  }
  const trimmed = message.trim();
  const len = trimmed.length;

  // Score each candidate taskType by counting pattern hits * weight.
  const scores = {};
  for (const { taskType, signals, weight } of PATTERNS) {
    let hits = 0;
    for (const re of signals) if (re.test(trimmed)) hits++;
    if (hits > 0) scores[taskType] = (scores[taskType] || 0) + hits * weight;
  }

  // Pick the highest-scoring taskType; tie-breaker is the order in
  // PATTERNS (earlier wins).
  let best = 'balanced';
  let bestScore = 0;
  for (const t of Object.keys(scores)) {
    if (scores[t] > bestScore) {
      bestScore = scores[t];
      best = t;
    }
  }

  // Complexity: starts at length-based baseline, plus pattern bumps.
  // Length ladder: ≤50 chars → 0.1; 50-200 → 0.3; 200-600 → 0.5; >600 → 0.7
  let complexity =
    len <= 50 ? 0.1 :
    len <= 200 ? 0.3 :
    len <= 600 ? 0.5 :
    0.7;
  for (const { pattern, bump } of COMPLEXITY_BUMPS) {
    if (pattern.test(trimmed)) complexity = Math.min(1.0, complexity + bump);
  }
  // Reasoning + complex tasks get a small bump even without explicit
  // hints; ultra_fast caps complexity low.
  if (best === 'reasoning' || best === 'complex') complexity = Math.min(1.0, complexity + 0.10);
  if (best === 'ultra_fast') complexity = Math.min(complexity, 0.15);

  return {
    taskType: best,
    complexity: Math.round(complexity * 100) / 100,
    signals: { ...scores, length: len },
  };
}

export default classify;
