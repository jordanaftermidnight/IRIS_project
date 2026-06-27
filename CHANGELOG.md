# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-27 (revised)

Consolidation + completion sweep. Merging the two divergent IRIS repos
(public web-UI v0.9 + private MCP-server v1.0) into a single v1.0.0
release pushed to the public IRIS_project repo.

### Added — Salvaged from IRIS_project v0.9
- `dashboard/` (web UI starter — index.html + iris-dashboard.js +
  styles.css). Currently runs on mocked data; `dashboard/README.md`
  documents how to wire it to the new `/events` SSE feed, `/metrics`,
  and MCP tools to make it live.
- `SECURITY.md`, `.env.example` (refreshed for v1.0 surface),
  `.npmignore`.

### Added — Provider count 14 → 16
- **Cohere** via OpenAI-compatibility endpoint. Command A+ (MoE, vision
  + reasoning + agentic, `command-a-plus-05-2026`) as flagship, plus
  Command R+/R legacy. Set `COHERE_API_KEY`.
- **HuggingFace Inference Providers router** (multi-backend OpenAI-
  compatible). Set `HF_API_KEY`. User pins specific HF model IDs in
  config since the lineup is enormous and rotates.
- xAI Grok bumped from grok-3 → grok-4 / grok-4-fast.

### Added — Agnostic provider management
- `iris provider list` — show user-defined providers.
- `iris provider add <name> --base-url=URL [--key-env=ENV] [--key=VALUE]
  [--type=openai-compatible] [--priority=N] [--allow-no-auth]
  [--description="..."]` — register a new OpenAI-compatible provider
  without editing JSON. Writes to `config/iris-config.json` directly.
- `iris provider test <name>` — call isAvailable() on a registered
  provider to verify it's reachable.
- `iris provider remove <name>` — remove a user-defined provider.
- Refuses to touch reserved (built-in) names; override built-ins via
  the existing `providers.<name>` config merge path.

### Added — Batch APIs (OpenAI + Anthropic)
- `MultiAI.submitBatch(requests, {provider, model?})` → `{batchId,
  provider, status, requestCount,...}`. Submit many requests
  asynchronously, pay ~50% less, results within 24h SLA.
- `MultiAI.getBatch(batchId, {provider})` → poll status; once complete,
  results array attached.
- Anthropic: inline JSON via `messages.batches.create()`.
- OpenAI: JSONL → File → `files.create({purpose: 'batch'})` →
  `batches.create({input_file_id, endpoint, completion_window: '24h'})`.
- CLI: `iris batch submit <file.jsonl> --provider=anthropic|openai`,
  `iris batch get <batchId> --provider=...`.
- MCP: `iris_batch_submit` + `iris_batch_get` (now 13 MCP tools, was 11).

### Added — Streaming + tool calling combined
- `_normalizeStream` now yields typed events (`{type: 'text'|'toolCallDelta'|'finish'}`)
  instead of raw strings.
- `MultiAI.streamChat` legacy asyncIterator path still yields plain
  text strings (back-compat for the CLI), AND accumulates tool-call
  deltas across chunks so `stream.finalize()` returns a full envelope
  including `toolCalls` and `finishReason`.
- Works on OpenAI/Compat (tool_calls deltas with index-based assembly)
  AND Anthropic (content_block_start + input_json_delta + message_delta
  events).

### Tests
- 111 → 117. New: registry shape for cohere+hf, total provider count,
  batch envelope shapes (Anthropic + OpenAI mocks), streaming+tools
  end-to-end with assembled args across chunks, provider CLI flag parser.

### Migration / consolidation notes
- `Iris_Integrated-Runtime-Intelligence-Service` (private archived
  repo) was the prior push target. Now superseded by `IRIS_project`
  (public). Old redirect names — `multi-ai-mcp-integration`,
  `multi-ai-integration-CLI` — still point at the archived repo and
  may be deleted at the user's discretion.
- v0.9's `iris-api-server.js` REST API NOT brought forward (superseded
  by the MCP server's `/events` SSE + `/metrics`). Available in git
  history (`git show iris-public/main:iris-api-server.js`) if needed.
- v0.9's speculative scaffolding (`neural-learning.js`,
  `self-healing-handler.js`, `integrity-checker.js`,
  `license-validator.js`) NOT brought forward — duplicates memory backend
  (learning) or doesn't apply to v1.0's architecture.

---

## [1.0.0-rc1] - 2026-06-27

First stable release. Tags the full audit-fix / hardening / alignment /
tool-calling / modernization sprint and the model-ID refresh. Going
forward, the public API (MCP tool shapes, /events event schema,
/metrics format) is stable and changes get semver-marked.

### Added — mTLS option for the MCP server
- `config.server.tls.{certPath, keyPath, caPath?, requestCert?,
  rejectUnauthorized?}` switches the HTTP listener to HTTPS. When
  `requestCert: true` + a CA bundle, full mTLS is enforced — clients
  must present a cert signed by the trusted CA.
- Logged on startup: `tls: true, mtls: true|false` so operators can
  verify their config landed.

### Changed — Model ID refresh (verified against vendor docs 2026-06-27)
- **Claude**: Opus 4.7 → 4.8 as the new flagship. Added Sonnet 4.5,
  Opus 4.6, Fable 5, Mythos 5 to the rates table. **Fixed Opus pricing
  bug** — was \$15/\$75 per MTok (Opus 4.1's old rate), now correctly
  \$5/\$25 for Opus 4.6+. Context windows updated to 1M tokens for Opus
  + Sonnet (Haiku still 200K).
- **OpenAI**: GPT-4o/o3-mini → GPT-5.4 lineup. New defaults: fast →
  gpt-5.4-mini, balanced → gpt-5.4, complex → gpt-5.5, reasoning →
  o4-mini, ultra_fast → gpt-5.4-nano. Legacy gpt-4o/o3-mini retained
  in the rates table for backward compatibility.
- **Gemini**: 2.5 → 3.x. fast/balanced/code → gemini-3.5-flash,
  complex/reasoning → gemini-3.1-pro, ultra_fast → gemini-3.1-flash-lite,
  vision → gemini-3.1-flash-image. Added per-model RATES table (was
  using a single costPerToken).
- **Groq**: Llama 3.x → mixed lineup. fast/ultra_fast → openai/gpt-oss-20b
  (1000 t/s), balanced → meta-llama/llama-4-scout-17b-16e-instruct
  (multimodal MoE), code/complex/reasoning → openai/gpt-oss-120b.
  Legacy llama-3.1-8b-instant + llama-3.3-70b-versatile retained.

### Tests
- 108 → 111. Added HTTPS-with-self-signed-cert end-to-end (\`openssl
  req\` at test time), Claude Opus 4.8 cost calc, OpenAI gpt-5.4-mini
  cost calc.

### v1.0 stability promise
- MCP tool input schemas (the 11 tools' \`inputSchema\` Zod objects)
  are stable. New optional fields are minor-version changes; removing
  or renaming requires major.
- \`/events\` event objects (\`{type:'routing'|'council'|'breaker',...}\`)
  are stable. New event types or new fields are minor; removing is major.
- \`/metrics\` metric names + label keys are stable.
- Provider \`chat()\` return envelope (\`response, model, provider,
  taskType, usage, timestamp\`, optionally \`toolCalls, finishReason,
  extra\`) is stable.

### What's NOT stable yet (call out before relying on)
- The SCORING_WEIGHTS values — task-affinity bonuses may be tuned in
  patch releases.
- The default model maps per provider — vendors release new models
  every few weeks, so the defaults rotate. Pin in config if you need
  determinism.

## [2.8.0] - 2026-06-04

Phase F — live dashboard readiness. IRIS now serves enough live state for
any dockview (a custom one) to render without
coupling to IRIS internals.

### Added — Live event stream
- `MultiAI.events` — Node `EventEmitter` that fires `{type,...}` objects
  on routing decisions, council completions, and circuit-breaker
  transitions. Maxes at 50 listeners.
- Router emits `{type: 'routing', provider, taskType, score, alternatives, timestamp}`
  after every `selectProvider`.
- Council emits `{type: 'council', panelSize, successCount, totalCost, totalLatencyMs, judge}`
  on completion.
- CircuitBreaker emits `{type: 'breaker', provider, from, to, timestamp}`
  on every state transition (closed→open, open→half-open,
  half-open→closed/open).
- `GET /events` SSE endpoint on the MCP server's HTTP listener
  broadcasts the event stream. Bearer-authed when `IRIS_AUTH_TOKEN` is
  set. 15-second heartbeat keeps proxies happy. Distinct from `/sse`
  (which is the MCP control channel).

### Added — Snapshot MCP tools
- `iris_recent_requests({limit?, sinceIso?})` — pulls recent rows from
  the SQLite `requests` table.
- `iris_cost_summary({sinceIso?})` — groups cost by provider with
  request count, success count, average latency.
- `iris_breaker_status()` — current state per provider via
  `router.breaker.snapshot()`.
- 11 MCP tools total (was 8).

### Added — Cross-platform install + cross-machine deploy
- README section covering macOS, Linux, and Windows install paths
  side-by-side. PowerShell env-var syntax included for Windows.
- Cross-machine deploy guide: bind `iris serve --host=0.0.0.0`,
  generate a bearer token, register the MCP endpoint from any client.
- Verified portability: `better-sqlite3` prebuilt for win32-x64,
  `os.homedir()` resolves to `C:\Users\<name>\.iris\` on Windows,
  `path.join` handles separators, signals fire on all platforms.

### Tests
- 62 → 69. Added: router routing-event emit, breaker transition events,
  council event firing, `getCostSummary` aggregation, `getRecentRequests`
  `sinceIso` filter, `/events` SSE end-to-end with a live event frame,
  `/events` bearer auth enforcement.

## [2.7.0] - 2026-05-11

Phase E.2 — the remaining three pieces of Phase E.

### Added — Structured logging (pino)
- Centralized logger (`src/core/logger.js`). pino under the hood,
  pino-pretty for TTY output, JSON for everything else (Loki/Vector/
  Promtail-ready).
- `IRIS_LOG_LEVEL` (default `info`) gates verbosity. `IRIS_LOG_FORMAT`
  forces `pretty` or `json`. `iris serve` flips to JSON unconditionally
  since it's long-running.
- Diagnostic log lines in router, MultiAI lifecycle, MCP server, and
  config validation moved from console.warn/error to structured
  `log.warn/error` with bindings (provider, attempt, err). User-facing
  CLI output (response display, status table, command help) stays as
  console.log — the logger is for events, not the UI.

### Added — Per-provider circuit breaker
- `CircuitBreaker` class (`src/core/circuit-breaker.js`). Three states:
  closed → open (after N failures in a window) → half-open (single
  probe after cooldown) → closed (on probe success) or back to open
  (on probe failure).
- Defaults: 5 failures within 60s opens the breaker, 30s cooldown
  before the probe. Tunable via `config.routing.circuitBreaker.{failureThreshold, windowMs, cooldownMs}`.
- `AIRouter.selectProvider` skips providers whose breaker is open, so a
  flapping provider stops eating retry budgets. `updateProviderStats`
  drives the state transitions automatically.
- New Prometheus metric `iris_provider_breaker_state{provider="..."}`
  (0=closed, 1=half-open, 2=open).

### Added — Council `--judge=<provider>` ranking
- After fan-out, optionally call a named provider to rank the panel.
  Returns ordered results with a `judgment` payload on each
  `{rank, reason}`. Total `judge` info on the result envelope
  (`{provider, model, latencyMs, cost, ranking}`).
- Parse-tolerant: handles markdown-fenced JSON, bare JSON arrays, and
  JSON embedded in prose. Filters out hallucinated provider names. Falls
  back to original order if the judge replies with unparseable garbage.
- CLI: `iris council "..." --judge=claude`. MCP: `judge` parameter on
  `iris_council`.
- Auto-skips when fewer than 2 successful responses (no panel to judge).

### Tests
- 50 → 62. Added: logger smoke, circuit breaker state machine (closed
  → open → half-open → closed and → open), router skips open breakers,
  judge JSON parser (well-formed / fenced / garbage / hallucinated
  names), council-with-judge end-to-end, breaker metric format.

### Migration notes
- New dependency: `pino` + `pino-pretty`. Both lightweight; `npm install`
  picks them up.
- No config changes required. `circuitBreaker` block is optional and
  uses sensible defaults.
- Existing log output looks different — set `IRIS_LOG_FORMAT=pretty` to
  keep the old-style human output on non-TTY environments (CI logs).

## [2.6.0] - 2026-05-11

Phase E (first slice): council fan-out. JSON structured logging and
circuit-breaker deferred to a later Phase E.x.

### Added — Council fan-out
- **`iris council "..."`** broadcasts a single prompt to N providers in
  parallel via `Promise.allSettled`. Side-by-side display with per-call
  latency and cost; no judge, no synthesis — the caller looks and
  decides. `--providers=a,b,c` whitelists, `--exclude=x` blacklists,
  `--timeout=<seconds>` sets per-provider timeout (default 60).
- **`iris_council` MCP tool** exposes the same behaviour over the MCP
  server — any MCP-aware client can poll the council programmatically.
- Failed providers come back with `{success: false, error}` instead of
  poisoning the whole call. Each individual call updates the router's
  `providerStats` so council usage feeds future routing decisions.
- Session persistence intentionally not wired: council is a comparison
  tool, not a conversation.

### Tests
- 50 (was 44). Added 6 council tests: all-success ordering, isolated
  failures, whitelist, blacklist, per-provider timeout, empty target set.

## [2.5.0] - 2026-05-10

Phase C (architectural cleanup) and Phase D (network surface) — the
combination unlocks IRIS as the routing leg of the live dashboard.

### Added — IRIS as an MCP server (Phase D)
- **`iris serve`** boots an MCP server on port 8782 (configurable).
  Exposed tools: `iris_chat`, `iris_providers`, `iris_health`,
  `iris_session_list`, `iris_session_new`, `iris_session_show`,
  `iris_session_delete`. MCP-aware clients can now drive IRIS
  routing programmatically, not just the CLI.
- **Prometheus `/metrics`** endpoint on the same HTTP server. Exposes
  `iris_provider_available`, `iris_provider_requests_total`,
  `iris_provider_successes_total`, `iris_provider_failures_total`,
  `iris_provider_response_ms_avg`, `iris_provider_cost_usd_total`,
  `iris_knowledge_entries`, `iris_sessions_total`,
  `iris_memory_connected`. Hand-rolled format — no `prom-client` dep.
- **Optional bearer auth** (env `IRIS_AUTH_TOKEN` or
  `config.server.authToken`). When set, gates `/sse`, `/messages`, and
  `/metrics`. Constant-time token compare. `/healthz` is always open for
  orchestrators.
- **`/healthz`** unauthenticated liveness probe.
- **Configurable `agent_id`** (`config.server.agentId`, default `"iris"`).
  Threads through to memory backend wing tagging and the MCP server name so
  you can run multiple IRIS instances (e.g., `iris-shadow`, `iris-edge`)
  without log/intel collisions.

### Added — Architecture cleanup (Phase C)
- **`BaseProvider` abstract class.** All six providers (claude, openai,
  gemini, groq, ollama, openai-compatible) now inherit shared logic:
  payload normalization, model selection, system-prompt selection,
  per-model cost calc, healthCheck wrapper, capability merging, and the
  standardized return envelope. Subclasses only implement `_doChat`,
  `_doStream`, and `_ping`. Net delete: ~600 LOC of duplicated code.
- **Native multi-turn API.** Every provider's `chat()` now accepts EITHER
  a string (single-turn) OR `{messages: [{role,content},...]}`. Sessions
  pass a real messages array via index.js' `_buildMessagesArray`, killing
  the "Previous conversation:\n..." prepend hack. Claude and Gemini's
  native shapes (system separately, `model`/`user` roles, parts arrays)
  are handled at the provider layer.
- **Lazy provider init** for admin commands. `iris help`, `iris session`,
  `iris config`, `iris clear` no longer cold-start every provider —
  saves ~3s on every session command.
- **Config schema validator** (`src/core/config-schema.js`). Warns on
  unknown keys (typos, stale stanzas), errors on type mismatches.
  Underscore-prefixed keys are tolerated as doc/comment conventions.
  Defaults take over on validation failure — never crashes.
- **Real streaming in the CLI.** `--stream` now actually streams tokens
  to stdout as they arrive. `_normalizeStream` papers over the four
  provider stream shapes (OpenAI SSE, Anthropic events, Gemini async
  iterable, Ollama chat-stream).
- **Scoring weights extracted** into a single `SCORING_WEIGHTS` object
  at the top of `ai-router.js`. Behavior-preserving — every magic number
  in the old code now has a name and lives in one tunable place.
- **Stripped dead code**: `analyzeImage` (defined on claude/gemini, never
  called), `conversationChat` (claude only, superseded by multi-turn
  chat), and ~30 unread config stanzas (`taskRoutingRules`,
  `knowledgeBase`, `security`, `performance`, `logging`).

### Changed
- `MemoryClient` constructor takes a real `agentId` and uses it as
  both `wing` and `agent_id` in tool calls; was hardcoded to `"iris"`.
- `getIntelAlerts({wing})` is now optional — defaults to the configured
  agentId. Router calls it without specifying a wing.
- Test count: 32 → 44 (11 new tests covering BaseProvider, multi-turn
  message array, scoring weights, config validator, MCP server auth,
  /metrics format, HTTP boot, and agentId threading).

### Migration notes
- No config changes required. The `server` block is optional — IRIS only
  binds the network surface when you run `iris serve`.
- If you've subclassed a provider directly (rather than via config), the
  internal API has changed: implement `_doChat`/`_doStream`/`_ping`
  instead of `chat`/`streamChat`/`isAvailable`. The public `chat()` shape
  is unchanged.

## [2.4.0] - 2026-05-10

This is a four-phase release rolling up substantial work after an extended
hiatus. Released as one version since the phases are interdependent.

### Added — Persistence + learning loop (Phase B)
- **SQLite store** at `$IRIS_DB` or `~/.iris/iris.db` (better-sqlite3, WAL).
  Provider stats, request history, conversation sessions, and a knowledge
  base now persist across CLI invocations. Replaces three in-memory Maps.
- **memory backend learning loop closed.** Router reads `memory_intel_alerts`
  every 5 minutes and applies per-task provider preference bonuses learned
  from history (dominant +20·share, split +10·share, distribution tail
  +3·share). memory backend's `iris-provider-preference detector` detector is
  finally being consumed.
- **Conversation sessions.** `iris session list|new|show|delete` plus
  `--session=<id>` flag and `IRIS_SESSION` env var. Prior turns prepend to
  the user message until Phase C teaches providers a multi-turn API.

### Added — Provider extensibility (Phase B.5 + B.6)
- **Generic `OpenAICompatibleProvider`.** Drop-in adapter for any service
  speaking the OpenAI Chat Completions protocol. No new dependency.
- **9 first-class built-in providers** — set the env var, that's it:
  Kimi (`MOONSHOT_API_KEY`), MiniMax (`MINIMAX_API_KEY`), DeepSeek
  (`DEEPSEEK_API_KEY`), xAI Grok (`XAI_API_KEY`), Mistral La Plateforme
  (`MISTRAL_API_KEY`), Cerebras (`CEREBRAS_API_KEY`), Together AI
  (`TOGETHER_API_KEY`), OpenRouter (`OPENROUTER_API_KEY`), Perplexity
  (`PERPLEXITY_API_KEY`).
- **User config deep-merges** over registry defaults; `disabled: true`
  skips a builtin entirely.

### Changed — Cleanup + bug fixes (Phase A + A.1)
- Deleted root duplicates (`enhanced-ai.js`, `enhance-llama2.js`,
  `llama2-rag.js`, `ai-config.json`, `mistral_download.log`).
- Deleted dead `src/integrations/github.js` + `google-tools.js` (407 LOC
  unused).
- Hardened `.gitignore` with secret patterns (`.secrets`, `.mcp.json`,
  `.env*`).
- **Failed-provider stats** now penalize the provider that actually
  failed (was reselecting via `selectProvider`, which returns the
  best-available — wrong provider got penalized).
- **Retry honors `exclude` set** so retries try a *different* provider
  instead of looping on the same one.
- **`status.providers.summary` keys** corrected in `iris status`
  (was reading nonexistent `.total` / `.healthy` fields).
- **Ollama config models** now actually applied — `OllamaProvider` was
  ignoring `config.providers.ollama.models` overrides.
- **Cost calculation** uses separate input/output rates for Claude,
  OpenAI, and Groq. Claude was ~1000x off in absolute scale; OpenAI used
  one rate for both directions.
- **`--local` flag** plumbed through to `executeRequest` (was parsed in
  CLI but never propagated).
- **`logHealthSnapshot`** wired into `healthCheckAll` — pushes provider
  health to memory backend knowledge graph (was defined but never called).
- **Two-layer scoring collapsed.** Deleted `shouldUseMistral`,
  `assessComplexity`, `handleLargeTask` from `index.js` — they
  second-guessed router scoring and the "split workload" path was a
  no-op.

### Performance
- **Parallel provider init.** ~14 providers × ~500ms billed availability
  ping went from sequential (up to 7s cold) to `Promise.allSettled`
  (bounded by the slowest single provider).
- **Availability cache** in router (60s TTL on success, 10s on failure).
  `initializeProviders` and `healthCheckAll` prime it.

### Model refresh
- Claude 3.x → 4.x family (Haiku 4.5, Sonnet 4.6, Opus 4.7).
- OpenAI: drop deprecated `o1-preview`, use `o3-mini` for reasoning.
- Gemini: 1.5 → 2.5 family.
- Groq: drop deprecated `llama-3.2-90b-text-preview` and Mixtral; use
  `llama-3.3-70b-versatile` + `llama-3.1-8b-instant`.

### Observability
- Store persistence failures now log a `console.warn` instead of
  silently swallowing.
- memory backend alert payload fallthrough logs a `console.debug` so a
  schema change doesn't silently kill the learning loop.

### Tests
- 10 → 32 tests, hand-rolled runner. Coverage for:
  - Store CRUD (provider stats, sessions, knowledge)
  - Router scoring + alert-bonus calculations + availability cache
  - MemoryClient payload parsing (raw + MCP text-block shapes)
  - OpenAICompatibleProvider construction + cost calc
  - Built-in registry shape + env-driven registration + disabled flag
  - chat() round-trip with mock provider
  - executeRequest retry with exclude-set
  - CLI parseArgs cases
  - `--local` flag plumbing

### Docs
- README rewritten for the current state (14 providers, sessions,
  memory backend, persistence).
- CHANGELOG entry covering A/B/B.5/B.6/A.1.
- QUICKSTART rewritten to use the `iris` global CLI.
- `ROADMAP.md` (new): 6-phase plan with completion status, quarterly
  model-ID refresh ritual.

## [2.0.0] - 2025-07-01

### Added
- **Smart Provider Selection**: Intelligent routing based on task type and provider performance
- **Multi-Provider Support**: Ollama (local) and Gemini (cloud) provider integration
- **Enhanced CLI Interface**: Comprehensive command-line tool with task-specific options
- **Advanced Error Handling**: Input validation, sanitization, and robust error recovery
- **Performance Monitoring**: Real-time statistics and provider performance tracking
- **Security Features**: API key sanitization, file path validation, input limits
- **Knowledge Base**: Persistent storage with search capabilities and automatic cleanup
- **Context Management**: Intelligent conversation context with size management
- **Configuration System**: Flexible JSON-based configuration with defaults
- **Comprehensive Testing**: Basic test suite with core functionality coverage
- **Documentation**: Complete README, examples, and contribution guidelines

### Security
- API key sanitization in logs and error messages
- File path validation to prevent directory traversal
- Input size limits and validation
- Safe configuration handling

### Technical Improvements
- Modular architecture with separated concerns
- Provider abstraction for easy extensibility
- Automatic fallback mechanisms
- Memory management and cleanup
- Request timeout handling
- Provider health monitoring

### Documentation
- Comprehensive README with examples
- API documentation with JSDoc
- Contributing guidelines
- Usage examples and tutorials
- Configuration reference

### Testing
- Core functionality test suite
- Input validation tests
- Error handling verification
- Configuration testing
- Provider availability checks

## [1.0.0] - Previous Version

### Features
- Basic Ollama integration
- Simple chat functionality
- File processing capabilities
- Basic CLI interface

---

## Upcoming Releases

### [2.1.0] - Planned
- [ ] Full Gemini provider implementation
- [ ] Advanced caching system
- [ ] Web interface
- [ ] Plugin architecture
- [ ] Docker support
- [ ] Comprehensive test coverage (>90%)

### [2.2.0] - Planned
- [ ] Claude provider integration
- [ ] OpenAI provider support
- [ ] Advanced routing algorithms
- [ ] Distributed deployment
- [ ] Rate limiting and quotas

### [3.0.0] - Future
- [ ] Multi-modal support (images, audio)
- [ ] Custom model fine-tuning
- [ ] Enterprise features
- [ ] Cloud deployment options
- [ ] Real-time collaboration

---

## Migration Guide

### From 1.x to 2.0

#### Breaking Changes
- Configuration format changed to JSON structure
- CLI command syntax updated
- Provider initialization now async
- Error handling improved with different error types

#### Migration Steps
1. Update configuration format:
   ```json
   // Old format (1.x)
   {
     "model": "llama3.2:latest"
   }
   
   // New format (2.0)
   {
     "providers": {
       "ollama": {
         "models": {
           "balanced": "llama3.2:latest"
         }
       }
     }
   }
   ```

2. Update CLI usage:
   ```bash
   # Old (1.x)
   node enhanced-ai.js chat "message"
   
   # New (2.0)
   multi-ai chat "message" --task=balanced
   ```

3. Update programmatic usage:
   ```javascript
   // Old (1.x)
   const ai = new EnhancedAI();
   const response = await ai.chat("message");
   
   // New (2.0)
   const ai = new MultiAI();
   await ai.initializeProviders();
   const response = await ai.chat("message");
   ```

## Support

- [Documentation](https://github.com/jordanaftermidnight/multi-ai-integration-CLI/wiki)
- [Issues](https://github.com/jordanaftermidnight/multi-ai-integration-CLI/issues)
- [Discussions](https://github.com/jordanaftermidnight/multi-ai-integration-CLI/discussions)