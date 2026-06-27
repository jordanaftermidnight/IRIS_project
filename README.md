# Iris — Integrated Runtime Intelligence Service

**I**ntegrated **R**untime **I**ntelligence **S**ervice — a multi-provider AI
router that picks the cheapest-acceptable model for each task, persists
provider stats and conversations across CLI invocations, and learns
provider preferences over time via a **localmem** memory backend.

Unlike LiteLLM (a library you import) and Portkey (a hosted gateway),
IRIS is a **self-hosted service that learns**. Run `iris serve` once,
it remembers which provider worked best for each task type and biases
future routing accordingly. MCP-aware clients connect to it like any
other tool — no external telemetry, no data leaving your machine,
SQLite under the hood.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/jordanaftermidnight/IRIS_project)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

## What's there

- **16 providers, no code changes to add a 17th.** 5 native + 11 OpenAI-
  compatible built-ins + drop-in config slot for anything else that
  speaks the OpenAI Chat Completions protocol.
- **Persistent across invocations.** SQLite store at `~/.iris/iris.db`
  keeps provider stats, request history, conversation sessions, and a
  knowledge base. Routing decisions actually accumulate — the score
  function's success-rate term reflects history, not just the current
  process.
- **Learning loop, closed.** Optional connection to a **localmem** server.
  The router reads back per-task provider preferences
  every 5 minutes and biases scoring toward what's worked before.
- **Conversation continuity.** `iris session new`, then
  `iris chat "..." --session=<id>` (or `IRIS_SESSION=<id>`) to keep
  context across CLI invocations.
- **Local-first by default.** Ollama runs first; cloud providers fill
  in only when needed. `--local` forces local-only.
- **Smart fallback.** A failed provider is excluded from the retry
  selection and gets credited the failure (not the next-best one).
- **MCP server built in.** `iris serve` exposes IRIS as a Model Context
  Protocol server on port 8782 with 13 tools (chat, council, providers,
  health, session CRUD, recent requests, cost summary, breaker status,
  batch submit/get), `/metrics` in Prometheus format, `/events` SSE feed,
  optional bearer auth, optional mTLS, mDNS service advertisement.
  Any MCP-aware client (or memory backend) can call IRIS as a tool.
- **Council fan-out.** `iris council "..."` broadcasts a prompt to N
  providers in parallel and shows responses side-by-side with per-call
  latency and cost. `--providers=a,b,c` whitelist, `--exclude=x` skip,
  `--judge=claude` rank via an LLM judge, `--merge` concatenate with
  `[provider]` attribution. Failed providers don't poison the call.
- **Per-provider circuit breakers.** A provider that fails 5x within
  60s gets parked for 30s, then probed. The router skips parked
  providers so a flapping API doesn't eat retry budgets.
- **Native tool/function calling** across every provider. Pass
  OpenAI-spec `tools` to `chat()`; Claude's Anthropic shape is
  converted automatically. Response surfaces structured `toolCalls`.
- **Anthropic prompt caching.** `promptCaching: true` wraps the system
  prompt and the last tool with `cache_control: ephemeral` for ~90%
  off cached input tokens.
- **Structured outputs.** `responseFormat: {type: 'json_schema',...}`
  plumbs through to OpenAI / Compat providers.
- **Auto task classification.** Caller omits `taskType`? IRIS infers
  it from the message content (deterministic regex + keyword scoring,
  no extra LLM call).
- **Structured JSON logs.** pino-backed, pretty on TTY, JSON in serve
  mode and pipes. Loki/Vector/Promtail-ready.
- **Live event stream.** `/events` SSE pushes routing decisions,
  council results, and breaker transitions in real time.
- **Audit log.** Every MCP tool invocation appended to
  `~/.iris/audit.jsonl` for cross-machine traceability.
- **Per-tool latency metrics** (p50/p95/p99) on `/metrics`.
- **mDNS service advertisement** (`_iris-mcp._tcp.local.`) so dashboard
  dockviews and discoverers find IRIS on the LAN. Opt-in.
- **${VAR} interpolation** in `iris-config.json` so secrets stay in
  env, never in JSON.
- **Cross-platform.** macOS, Linux, Windows — all three are supported
  and tested. Single `npm install -g .` everywhere.

## Installation

```bash
git clone https://github.com/jordanaftermidnight/multi-ai-integration-CLI.git
cd multi-ai-integration-CLI
npm install
npm install -g . # for the `iris` global CLI
iris help
```

Requires Node.js >= 18. The SQLite native binding (better-sqlite3)
builds on darwin / linux / windows.

### Optional: Ollama (local, free)

```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve &
ollama pull mistral:7b # balanced default
ollama pull qwen2.5-coder:7b # code tasks
ollama pull llama3.2:latest # creative + vision
ollama pull qwen3:4b # fast / ultra_fast
```

Without Ollama, IRIS falls back to whichever cloud providers you have
keys for.

## Providers

### Native (priority 1–5)

Model IDs verified 2026-06-27. Pin specific versions in
`config/iris-config.json > providers.<name>.models` if you don't want
the defaults to roll forward.

| Name | Env var | Default model lineup |
|------|---------|----------------------|
| `ollama` | `OLLAMA_HOST` (default `http://localhost:11434`) | Local: mistral:7b, qwen2.5-coder:7b, llama3.2, qwen3:4b |
| `groq` | `GROQ_API_KEY` | Llama 4 Scout (multimodal MoE), GPT OSS 20B/120B |
| `openai` | `OPENAI_API_KEY` | GPT-5.5, GPT-5.4 / 5.4-mini / 5.4-nano, o4-mini |
| `gemini` | `GEMINI_API_KEY` | Gemini 3.1 Pro, 3.5 Flash, 3.1 Flash-Lite, 3.1 Flash-Image |
| `claude` | `ANTHROPIC_API_KEY` | Claude Opus 4.8, Sonnet 4.6, Haiku 4.5 |

### Built-in OpenAI-compatible (set the env var, that's it)

| Name | Env var | Description |
|------|---------|-------------|
| `kimi` | `MOONSHOT_API_KEY` | Moonshot Kimi |
| `minimax` | `MINIMAX_API_KEY` | MiniMax |
| `deepseek` | `DEEPSEEK_API_KEY` | DeepSeek (chat + reasoner) |
| `grok` | `XAI_API_KEY` | xAI Grok |
| `mistral` | `MISTRAL_API_KEY` | Mistral La Plateforme |
| `cerebras` | `CEREBRAS_API_KEY` | Cerebras (wafer-scale inference) |
| `together` | `TOGETHER_API_KEY` | Together AI (open-weight specialist) |
| `openrouter` | `OPENROUTER_API_KEY` | OpenRouter (300+ models, single endpoint) |
| `perplexity` | `PERPLEXITY_API_KEY` | Perplexity (search-augmented) |
| `cohere` | `COHERE_API_KEY` | Cohere (Command A+, R+, agentic) |
| `huggingface` | `HF_API_KEY` | HuggingFace Inference Providers (multi-backend router) |

Run `iris providers` for live status.

### Adding any other OpenAI-compatible service

Edit `config/iris-config.json`:

```json
{
  "providers": {
    "lmstudio": {
      "type": "openai-compatible",
      "baseURL": "http://localhost:1234/v1",
      "allowNoAuth": true,
      "models": { "balanced": "local-model" }
    }
  }
}
```

Works with LM Studio, Fireworks, llama.cpp, vLLM, SiliconFlow,
Anyscale, etc. See `_customProviderExamples` in the config file.

## Quick start

```bash
# Smart routing (picks the best provider for the task)
iris chat "Hello, world"
iris chat "Write a Python sort function" --task=code
iris chat "Compare React vs Solid" --task=complex

# Force a specific provider
iris chat "What's 2+2?" --provider=gemini
iris chat "Long context analysis" --provider=kimi

# Local-only (privacy, zero cost)
iris chat "Summarize this doc" --local

# Conversation continuity
iris session new my-debug-session
iris chat "Help me debug this stack trace:..." --session=my-debug-session
iris chat "What did I just ask you?" --session=my-debug-session

# File analysis
iris file ./src/foo.js --task=code

# System
iris providers # live status of all providers
iris health --verbose # detailed health check
iris status # comprehensive system status
iris models # list available models per provider
```

## Commands

```
iris chat <message> Chat with smart provider selection
iris chat ... --stream Stream tokens as they arrive
iris council <message> Fan-out to N providers, side-by-side
iris session list|new|show|delete Manage persistent sessions
iris file <path> Analyze a file
iris providers Provider status + statistics
iris models List models per provider
iris health Health check
iris status System status overview
iris serve [--port=8782] Run IRIS as an MCP server
iris config save|load [path] Configuration
iris clear Clear in-process context
iris help Show help
```

### Options

| Flag | Effect |
|---|---|
| `--task=<type>` | `code`, `creative`, `fast`, `complex`, `reasoning`, `vision`, `ultra_fast`, `balanced` (default) |
| `--provider=<name>` | Force a specific provider — see `iris providers` for the live list |
| `--session=<id>` | Continue a persistent conversation session |
| `--stream` | Stream the response (provider-dependent) |
| `--local` | Prefer local providers only |
| `--verbose, -v` | Verbose output |

## Configuration

### Environment variables

```bash
# Provider keys (set whichever you use; all optional)
export OLLAMA_HOST="http://localhost:11434"
export OPENAI_API_KEY="..."
export GROQ_API_KEY="..."
export GEMINI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
export MOONSHOT_API_KEY="..." # Kimi
export DEEPSEEK_API_KEY="..."
# ...etc — see provider table above

# IRIS-specific
export IRIS_DB="$HOME/.iris/iris.db" # SQLite store path
export IRIS_SESSION="my-default" # default session id
```

Centralize keys in `~/.secrets` (sourced from your shell rc) and IRIS
picks them up at startup.

### Config file (`config/iris-config.json`)

- `providers.<name>` — override built-in defaults (models, rates,
  priority) or define new OpenAI-compatible services.
- `routing` — `preferLocal`, `maxCost`, `costOptimization`.
- `memory.enabled = true` to connect to a local MCP memory backend (e.g., `localmem`)
  for the learning loop.
- `server.*` — MCP server settings for `iris serve` (port, host,
  agentId, authTokenEnv, metricsEnabled).

The config is schema-validated on load. Unknown keys produce warnings;
type mismatches log errors and fall back to defaults.

## Council (`iris council`)

Broadcast a prompt to every available provider in parallel, see the
answers side-by-side. No judge — you look at them and decide.

```bash
iris council "Best Python lib for date math?"
iris council "Explain quicksort" --providers=claude,openai,gemini
iris council "Quick yes/no" --exclude=ollama --timeout=10
iris council "Pick the cleanest" --judge=claude
```

Failed providers come back with their error tagged, the rest of the
panel still completes. Each call updates the router's `providerStats`,
so council usage feeds future routed-chat scoring.

`--judge=<provider>` calls a named provider after fan-out to rank the
panel. The judge sees every successful response and replies with a
JSON ranking. Hallucinated provider names are filtered; unparseable
output falls back to original order. Auto-skipped when fewer than 2
responses succeed.

## MCP server (`iris serve`)

`iris serve` exposes IRIS as a Model Context Protocol server on port
8782 (configurable). 13 tools registered:

- `iris_chat(message, taskType?, provider?, sessionId?, local?)`
- `iris_council(message, providers?, exclude?, timeoutSeconds?, judge?, merge?)`
- `iris_batch_submit(requests, provider, model?)` — Anthropic or OpenAI batch API (~50% off)
- `iris_batch_get(batchId, provider)` — poll batch status / retrieve results
- `iris_providers()`
- `iris_health()`
- `iris_recent_requests(limit?, sinceIso?)` — snapshot of recent routing decisions
- `iris_cost_summary(sinceIso?)` — cost broken down by provider
- `iris_breaker_status()` — circuit-breaker state per provider
- `iris_session_list(limit?)`
- `iris_session_new(id?)`
- `iris_session_show(id, limit?)`
- `iris_session_delete(id)`

HTTP surface on the same port:

- `GET /sse` — MCP SSE channel (bearer-authed when token configured).
- `POST /messages?sessionId=...` — JSON-RPC messages.
- `GET /events` — live SSE feed of `{type: routing|council|breaker,...}`
  events. Bearer-authed. 15s heartbeat keeps the connection alive.
- `GET /metrics` — Prometheus text format (`iris_provider_available`,
  `iris_provider_requests_total`, `iris_provider_response_ms_avg`,
  `iris_provider_cost_usd_total`, `iris_provider_breaker_state`,...).
  Bearer-authed.
- `GET /healthz` — unauthenticated liveness probe.

Set `IRIS_AUTH_TOKEN` to require bearer auth. Multiple IRIS instances on
the same memory backend instance can be disambiguated by setting different
`config.server.agentId` values.

## Cross-platform install (macOS / Linux / Windows)

IRIS is pure Node.js plus one native dep (`better-sqlite3`) which ships
prebuilt binaries for all three platforms.

### macOS / Linux

```bash
brew install node ollama # or apt / dnf / pacman etc.
ollama serve &
ollama pull mistral:7b

git clone https://github.com/jordanaftermidnight/multi-ai-integration-CLI.git
cd multi-ai-integration-CLI
npm install
npm install -g .
iris help
```

Set provider keys in your shell rc (`~/.zshrc` / `~/.bashrc`):

```bash
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
```

### Windows (PowerShell)

```powershell
# Prereqs: install Node.js LTS and Ollama
winget install OpenJS.NodeJS.LTS
winget install Ollama.Ollama # or download from https://ollama.com/download/windows

ollama pull mistral:7b

git clone https://github.com/jordanaftermidnight/multi-ai-integration-CLI.git
cd multi-ai-integration-CLI
npm install
npm install -g .
iris help
```

Set provider keys (current session):

```powershell
$env:OPENAI_API_KEY = "..."
$env:ANTHROPIC_API_KEY = "..."
```

Persist them across sessions:

```powershell
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "...", "User")
```

The SQLite store lands at `C:\Users\<name>\.iris\iris.db`. `iris serve`
listens identically on port 8782; `Ctrl+C` shuts down cleanly. Paths,
process signals, and Ollama's HTTP API all behave the same as on
macOS / Linux.

## Cross-machine deploy (Mac client → Linux/Windows server)

Run IRIS on a server with the cloud keys, hit it from any client over
the network. Useful when the keys live somewhere central or when you
want the SQLite store + memory-backend connection to outlive any one laptop.

**1. On the server**

```bash
# Linux (systemd unit, Windows service, or just a tmux session)
export IRIS_AUTH_TOKEN="$(openssl rand -hex 32)" # share this with clients
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
iris serve --host=0.0.0.0 --port=8782
```

PowerShell equivalent on Windows:

```powershell
$env:IRIS_AUTH_TOKEN = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()
$env:OPENAI_API_KEY = "..."
iris serve --host=0.0.0.0 --port=8782
```

Bind firewall rules so 8782 only opens to your LAN / VPN subnet. The
bearer token is the auth layer, but defense-in-depth is cheap.

### TLS / mTLS (optional, for untrusted networks)

Add a `tls` block to `config/iris-config.json`:

```json
{
  "server": {
    "enabled": true,
    "host": "0.0.0.0",
    "port": 8782,
    "tls": {
      "certPath": "/etc/iris/cert.pem",
      "keyPath": "/etc/iris/key.pem",
      "caPath": "/etc/iris/ca.pem",
      "requestCert": true,
      "rejectUnauthorized": true
    }
  }
}
```

With `certPath` + `keyPath` set, IRIS serves HTTPS. Add `caPath`,
`requestCert: true`, and `rejectUnauthorized: true` for full mTLS —
clients must present a cert signed by your CA. Useful when the LAN
isn't trusted or the bearer token alone isn't enough.

The boot log shows `tls: true, mtls: true|false` so you can verify
the config landed.

**2. From any client (Mac, Linux, Windows)**

Any MCP-aware client connects to `http://<server>:8782/sse` with the
shared bearer:

```bash
# Example: register IRIS with Claude Code on a different machine
claude mcp add --transport sse iris http://192.168.1.10:8782/sse \
  --header "Authorization: Bearer $IRIS_AUTH_TOKEN"
```

Dashboard dockviews subscribe to `/events` for live updates and pull
`/metrics` for the cost ticker. Both honor the same bearer token.

## Memory backend integration

IRIS optionally connects to [`localmem`](https://github.com/jordanaftermidnight/localmem)
— a local-first MCP/SSE memory backend. When the memory backend is enabled in
config, IRIS:

- Logs every routing decision to wing `iris`, room `routing`
- Logs request outcomes (success/failure, latency, cost) to wing
  `iris`, room `requests`
- Reads back per-task provider preferences from the memory backend's
  intelligence engine every 5 minutes, biasing the router toward
  patterns learned from history
- Pushes provider health snapshots to the memory backend's knowledge graph

To enable, install `localmem` locally on `localhost:8781` and flip
`memory.enabled = true` in `config/iris-config.json`. IRIS expects the
backend to expose three MCP tools: `memory_store`, `memory_intel_alerts`,
and `memory_kg_add`. If your backend uses different tool names, the
learning loop will fail silently (logged at debug level). Connection
failures are non-blocking — IRIS works fine without it.

## Architecture

```
src/
├── enhanced-ai.js # global entry, runs CLI
├── index.js # MultiAI: provider lifecycle, sessions, knowledge
├── cli.js # command parsing, subcommands
├── core/
│ ├── ai-router.js # score-based selection, retry, alert bonus, availability cache
│ └── store.js # IrisStore (better-sqlite3): provider_stats, requests, sessions, messages, knowledge
├── providers/
│ ├── ollama-provider.js
│ ├── groq-provider.js
│ ├── openai-provider.js
│ ├── gemini-provider.js
│ ├── claude-provider.js
│ ├── openai-compatible-provider.js # generic adapter for any OpenAI-compatible service
│ └── builtin-registry.js # 9 first-class OpenAI-compatible defaults
└── integrations/
    └── memory-client.js # MCP/SSE client
```

See [ROADMAP.md](./ROADMAP.md) for the full development history and
upcoming phases (C: provider base class + multi-turn API; D: IRIS as
MCP server; E: council fan-out; F: live dashboard readiness).

## Development

```bash
npm test # 32 tests, all hand-rolled (no vitest dep yet)
npm run dev # auto-reload on file change
npm run lint # eslint
```

## Troubleshooting

**"No providers available"**
```bash
iris health --verbose
ollama serve & # start Ollama if not running
ollama list # confirm models are pulled
```

**Provider initialization is slow on cold start**
The first `iris` invocation pings every provider with an API key set
to confirm reachability. Subsequent calls use a 60s availability cache.
Provider init runs in parallel since v2.4.0.

**Session not remembered**
Make sure you pass `--session=<id>` (or set `IRIS_SESSION`) on every
call. `iris session list` shows recent sessions.

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgments

[Ollama](https://ollama.ai/), [Anthropic](https://anthropic.com/),
[Google AI](https://ai.google.dev/), [OpenAI](https://openai.com/),
[Groq](https://groq.com/), and the providers in the built-in registry
for shipping OpenAI-compatible endpoints that make this kind of
adapter possible.
