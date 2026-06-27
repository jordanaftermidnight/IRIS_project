# IRIS Roadmap

IRIS is a multi-provider AI router that optionally integrates with any MCP/SSE memory backend (e.g., `localmem`) for cross-session learning.

- IRIS — this repo. Multi-provider AI routing + MCP server.
  IRIS-pattern routing, -pattern safety, council fan-out, mDNS discovery.
  Qdrant + NetworkX + SQLite, layered context (L0–L3), intelligence engine
  with per-agent detectors including `iris-provider-preference detector`.

---

## Audit (2026-05-10)

### Resolved in Phase A
- Deleted root duplicates: `enhanced-ai.js`, `enhance-llama2.js`,
  `llama2-rag.js`, `ai-config.json`, `mistral_download.log`.
- `.gitignore` hardened with secret patterns.
- `executeRequest` now penalizes the provider that actually failed and
  excludes already-tried providers on retry.
- `cli.js handleStatusCommand` now reads `summary.total / summary.available`.
- `OllamaProvider` accepts `options.models` so config overrides take effect.
- Cost calculation: separate input/output rates for Claude, OpenAI, Groq.
  Claude was off by ~1000x; OpenAI used a single rate for both directions.
- Model IDs refreshed: Claude 4.x family, OpenAI o1→o3-mini, Gemini 1.5→2.5,
  Groq dropped deprecated 90B preview / Mixtral.
- `AIRouter` caches `isAvailable()` (60s TTL on success, 10s on failure).
  `initializeProviders` and `healthCheckAll` prime the cache so a single CLI
  invocation no longer burns 5 billed availability checks.

### Known issues remaining
- **Two-layer scoring** — `index.js` `shouldUseMistral`/`assessComplexity`
  runs *before* `router.selectProvider`'s scoring. Sometimes contradicts.
  Collapse into one layer in router.
- **`handleLargeTask`** — claims to split workload, doesn't. Either delete
  or actually implement chunking.
- **`handleDirectoryCommand`** — stubbed at "coming in v2.1.0", we're on 2.3.
- **Magic-number scoring** — task-type bonuses in `selectProvider` are
  hand-tuned (5–25 per match). Move to config.
- **No persistence** — `requestHistory`, `providerStats`, `knowledgeBase` all
  reset on every CLI invocation. Score function's success-rate term is
  always 1.0 in practice.

---

## Phased Roadmap

### Phase A — Cleanup + truth ✅ SHIPPED 2026-05-10
See "Resolved in Phase A" above.

### Phase B.6 — Built-in provider registry ✅ SHIPPED 2026-05-10
- `src/providers/builtin-registry.js` ships first-class defaults for
  9 OpenAI-compatible services. User only sets the env var:
    - **Kimi** (`MOONSHOT_API_KEY`)
    - **MiniMax** (`MINIMAX_API_KEY`)
    - **DeepSeek** (`DEEPSEEK_API_KEY`)
    - **xAI Grok** (`XAI_API_KEY`)
    - **Mistral La Plateforme** (`MISTRAL_API_KEY`)
    - **Cerebras** (`CEREBRAS_API_KEY`) — wafer-scale inference
    - **Together AI** (`TOGETHER_API_KEY`) — open-weight specialist
    - **OpenRouter** (`OPENROUTER_API_KEY`) — gateway to 300+ models
    - **Perplexity** (`PERPLEXITY_API_KEY`) — search-augmented
- `MultiAI.initializeBuiltinProviders` runs between optional and
  dynamic init. Each builtin is registered when its env var is set,
  or shown in `iris providers` as `🔑 needs API key` otherwise.
- User config under the same name deep-merges over registry defaults
  (e.g., `providers.kimi.models.balanced = "moonshot-v1-128k"`).
  Set `disabled: true` to skip a builtin entirely.
- Help text and `iris providers` reflect the larger live list.
- 28 tests passing (was 23): registry shape, no-env-var path,
  env-driven registration, disabled flag, deep-merge semantics.
- Quarterly maintenance: model IDs and pricing in this file rotate;
  refresh against each provider's docs every 1–3 months. Same
  ritual as Phase A model refresh.

### Phase B.5 — Generic OpenAI-compatible adapter ✅ SHIPPED 2026-05-10
- `OpenAICompatibleProvider` (`src/providers/openai-compatible-provider.js`)
  parameterized by `{name, baseURL, apiKey, models, rates, capabilities}`.
- `MultiAI.initializeDynamicProviders` reads any `providers.<name>`
  with `type: "openai-compatible"` and registers it. Names colliding
  with the built-in five are rejected.
- `apiKeyEnv` lets configs reference env vars without baking secrets
  into the JSON. `allowNoAuth: true` for local servers (LM Studio,
  llama.cpp, vLLM).
- Worked examples for Kimi/Moonshot, DeepSeek, OpenRouter, xAI Grok,
  and LM Studio in `config/iris-config.json` under
  `_openaiCompatibleExamples` (copy + remove leading underscore to
  activate).
- 23 tests passing (was 18): added construction-validation tests,
  selectModel fallback, cost-calc, collision rejection.
- **Caveat:** the router's task-type score bonuses still favor the
  built-in five by name. Dynamic providers get base score +
  alert-bonus + cost favoring. Phase C replaces magic-number scoring
  with a config-driven rule table.

### Phase B — Persistence + close the learning loop ✅ SHIPPED 2026-05-10
- SQLite store at `~/.iris/iris.db` (or `$IRIS_DB`) for provider stats,
  request history, conversation sessions, and knowledge — replaces
  three in-memory Maps. `IrisStore` in `src/core/store.js`.
- Router now reads `memory_intel_alerts` from the optional memory backend (5min TTL) and
  applies per-(taskType, provider) score bonuses: dominant +20*share,
  split +10*share, rotating no bonus, distribution tail +3*share.
  **Learning loop closed.**
- `iris session [list|new|show|delete]` plus `--session=<id>` flag and
  `IRIS_SESSION` env var. Prior turns are prepended to the user message
  until Phase C teaches providers to take a proper messages array.
- Two-layer scoring removed: deleted `shouldUseMistral`,
  `assessComplexity`, `handleLargeTask`. `chat()` now goes straight to
  the router.
- 18 tests passing (was 10): added store CRUD, session round-trip,
  alert-bonus calculation, availability cache, MCP payload parsing.

### Phase C — Provider base class + actual tests ✅ SHIPPED 2026-05-10
- `BaseProvider` (`src/providers/base-provider.js`) — every provider
  inherits payload normalization, model/prompt selection, cost calc,
  healthCheck wrapper, and the result envelope. Subclasses implement
  only `_doChat`/`_doStream`/`_ping`. ~600 LOC of duplication deleted.
- **Multi-turn provider API**: providers natively accept
  `{messages: [{role, content},...]}`. Sessions pass a real array,
  killing the Phase B "Previous conversation:" prepend.
- Admin commands (`session`, `config`, `clear`) skip provider init —
  ~3s saved on every session subcommand.
- Real streaming: `--stream` writes tokens to stdout as they arrive.
  `_normalizeStream` papers over OpenAI SSE / Anthropic events /
  Gemini async iterable / Ollama chat-stream shapes.
- Hand-rolled config schema validator (`src/core/config-schema.js`).
  Warns on unknown keys (with `_` prefix exempt as comment convention);
  errors on type mismatches; defaults take over on failure.
- Scoring weights extracted to `SCORING_WEIGHTS` at top of `ai-router.js`.
  Behavior-preserving — magic numbers now named and tunable in one place.
- Stripped dead `analyzeImage`, `conversationChat`, and ~30 unused config
  stanzas (`taskRoutingRules`, `knowledgeBase`, `security`, `performance`,
  `logging`).
- 44 tests passing (was 32): added BaseProvider normalization, cost calc
  fallback, multi-turn session replay, scoring weights structure, config
  validator warnings/errors.

### Phase D — Ecosystem surface ✅ SHIPPED 2026-05-10
**Unlocks the v1.0 live dashboard.**

- **IRIS as MCP server**: `iris serve` exposes 7 tools — `iris_chat`,
  `iris_providers`, `iris_health`, `iris_session_list`,
  `iris_session_new`, `iris_session_show`, `iris_session_delete` —
  over MCP/SSE on port 8782 (configurable via `config.server.port`).
  MCP-aware clients can drive IRIS routing programmatically.
- `/metrics` Prometheus endpoint on the same HTTP server. Exposes
  `iris_provider_available`, `iris_provider_requests_total`,
  `iris_provider_successes_total`, `iris_provider_failures_total`,
  `iris_provider_response_ms_avg`, `iris_provider_cost_usd_total`,
  `iris_knowledge_entries`, `iris_sessions_total`,
  `iris_memory_connected`. Hand-rolled — no `prom-client` dep.
- Optional bearer auth via `IRIS_AUTH_TOKEN` env var or
  `config.server.authToken`. Constant-time compare. `/healthz` open.
- Configurable `agent_id` (`config.server.agentId`, default `"iris"`).
  Threaded through to memory backend wing tagging and the MCP server name.
- **Deferred**: mDNS service advertisement (`iris._mcp._tcp.local.`).
  Skipped pending a clear consumer; bare `host:port` works for now.
  Easy to add via the `bonjour-service` package in a later commit.

### Phase E.1 — Council fan-out ✅ SHIPPED 2026-05-11
- `iris council "..."` and `iris_council` MCP tool. Fans out a prompt to
  every registered provider in parallel via `Promise.allSettled`. Each
  result carries `{provider, model, response|error, latencyMs, cost,
  success}`. `--providers=a,b,c` whitelists, `--exclude=x` blacklists,
  `--timeout=<seconds>` sets per-call deadline (default 60).
- No judge, no synthesis — side-by-side display, caller picks. Phase E.2
  may add an opt-in `--judge=<provider>` mode.
- Each individual call still updates `providerStats` so council usage
  feeds future routing.
- 6 new tests; 50 total (was 44).

### Phase E.2 — Structured logging + circuit-breaker + judge ✅ SHIPPED 2026-05-11
- **Structured logging (pino)** at `src/core/logger.js`. Pretty on TTY,
  JSON on `iris serve` and pipes. `IRIS_LOG_LEVEL` / `IRIS_LOG_FORMAT`
  env knobs. Diagnostic events go through the logger; user-facing CLI
  display stays as console.log.
- **Per-provider circuit breaker** at `src/core/circuit-breaker.js`.
  Closed → open (5 failures in 60s) → half-open (after 30s) → closed
  (probe success) or → open (probe failure). Tunable via
  `config.routing.circuitBreaker`. New metric
  `iris_provider_breaker_state{provider}` (0/1/2).
- **Council `--judge=<provider>`** ranks the panel via an LLM judge.
  Parse-tolerant (handles fenced JSON, embedded JSON, garbage).
  Filters hallucinated provider names. Falls back to original order on
  parse failure.
- 50 → 62 tests.

### v1.0.0 — first stable release ✅ SHIPPED 2026-06-27

Tagged after the full audit/hardening/alignment/tool-calling/refresh
sprint. Public surface (MCP tool schemas, /events event types, /metrics
metrics, provider envelope) is now stable.

What landed since Phase F:
- Audit fix bundle (saveConfig version + redaction, processFile symlink,
  iris dir stub, SIGINT dedup, judge fallback flag)
- v1.0 hardening (AbortController hard timeouts, /events connection
  cap, memory backend alert schema validation, SQLite schema_version
  framework, graceful shutdown drain, configurable TTLs, request IDs,
  Zod taskType enums, npm audit fix → 0 vulns)
- Alignment with sibling repos (${VAR} interpolation, mDNS via
  bonjour-service, council merge strategy, per-tool latency percentiles
  in /metrics, CORS, audit log JSONL, complexity-based task classifier)
- Native tool/function calling across all providers (OpenAI spec
  passthrough on OpenAI/Compat/Groq; Anthropic shape conversion for
  Claude; multi-turn tool dance supported via Claude's _splitMessages)
- Anthropic prompt caching (cache_control on system + tools) with
  cache_creation/cache_read tokens surfaced
- Structured outputs (response_format json_schema) plumbed
- mTLS option for the MCP server (HTTPS w/ optional client cert
  verification)
- Model ID refresh 2026-06-27: Claude Opus 4.7 → 4.8 + Opus pricing
  bug fix (\$15/\$75 → \$5/\$25), OpenAI GPT-4o → GPT-5.4 lineup +
  o4-mini, Gemini 2.5 → 3.x, Groq Llama 3.x → Llama 4 Scout + GPT OSS

### v1.1 candidates (post-1.0)

- Batch APIs: OpenAI batch + Anthropic Message Batches for cheap async
  bulk processing. Deferred from Commit C — different shape from
  real-time chat, big enough to deserve its own phase.
- mTLS + tool-calling integration tests (current tests cover them
  separately).
- Registry-provider model ID refresh (Kimi, MiniMax, DeepSeek, Grok,
  Mistral, Cerebras, Together, OpenRouter, Perplexity — currently pinned
  at registry-time defaults that the user can override).
- More structured-output adoption — currently it's plumbed but only
  Claude has prompt caching wired; OpenAI has response_format wired
  without docs.
- Streaming + tool calling combined (currently mutually exclusive).

### Phase F — Live dashboard readiness ✅ SHIPPED 2026-06-04
- `MultiAI.events` Node EventEmitter — router emits routing decisions,
  council emits panel summaries, CircuitBreaker emits state transitions.
- `GET /events` SSE endpoint on the MCP server broadcasts the event
  stream. Bearer-authed. 15s heartbeat. Distinct from `/sse` (the MCP
  control channel).
- Three new snapshot MCP tools: `iris_recent_requests`,
  `iris_cost_summary`, `iris_breaker_status`. 11 MCP tools total.
- Cross-platform install (macOS / Linux / Windows) and cross-machine
  deploy doc folded into README. Codebase verified portable —
  `better-sqlite3` ships prebuilt Windows binaries, paths use
  `os.homedir()` + `path.join`, signals fire identically.
- 62 → 69 tests.

---

## Quarterly maintenance

- **Model ID refresh**: Anthropic / OpenAI / Groq / Google all rotate
  model names every 1–3 months. Run a quick check against each
  provider's current model list and update the `models` and `rates`
  tables. Search this file for `claude-*`, `gpt-*`, `o3-*`, `llama-3.*`,
  `gemini-*` to find them all.
- **Pricing refresh**: same providers re-price; rates in `_calcCost`
  / `calculateCost` need to track.
