# Contributing to IRIS

IRIS is a multi-provider AI router with a built-in MCP server. Pull requests welcome.

## How to contribute

### Reporting issues
- File at [the issue tracker](https://github.com/jordanaftermidnight/IRIS_project/issues).
- Include OS, Node version, and a minimal repro.
- For provider failures: include the provider name and the
  `iris providers --verbose` output (with API keys redacted).

### Suggesting features
- Open an issue tagged `enhancement` with the use case and proposed
  shape. The smaller the proposal, the faster it lands.

### Pull requests
1. Fork.
2. Branch from `main`.
3. Make your change. Add tests in `tests/test-runner.js`.
4. Run `npm test`. All tests must pass.
5. Commit with a one-line summary plus a paragraph of context.
6. Open the PR. Reference the issue if one exists.

## Development setup

```bash
git clone https://github.com/yourusername/multi-ai-integration-CLI.git
cd multi-ai-integration-CLI
npm install
npm test
node src/cli.js help
```

Requires Node.js >= 18. The SQLite native binding (better-sqlite3)
builds on darwin / linux / win32 via prebuilt binaries.

## Architecture (quick orientation)

```
src/
├── cli.js # command parsing, output formatting
├── index.js # MultiAI class, IRIS_VERSION, EventEmitter
├── core/
│ ├── ai-router.js # SCORING_WEIGHTS + selectProvider + retry
│ ├── store.js # SQLite (provider stats, sessions, knowledge)
│ ├── council.js # fan-out + judge + merge
│ ├── circuit-breaker.js # closed → open → half-open state machine
│ ├── logger.js # pino (pretty on TTY, JSON in serve mode)
│ ├── timeout.js # withDeadline + AbortController helper
│ ├── audit-log.js # JSONL audit trail for MCP tool calls
│ ├── latency-histogram.js # p50/p95/p99 per key
│ ├── task-classifier.js # auto-classify taskType from message
│ ├── config-schema.js # validate iris-config.json shape
│ └── ${VAR} interpolation lives in index.js
├── providers/
│ ├── base-provider.js # _doChat / _doStream / _ping subclass contract
│ ├── ollama-provider.js # local
│ ├── openai-provider.js # GPT-5.4 / GPT-5.5 / o4-mini
│ ├── claude-provider.js # Sonnet 4.6 / Opus 4.8, prompt caching
│ ├── gemini-provider.js # Gemini 3.1 Pro / 3.5 Flash
│ ├── groq-provider.js # Llama 4 Scout / GPT-OSS
│ ├── openai-compatible-provider.js # generic adapter
│ └── builtin-registry.js # Kimi, MiniMax, DeepSeek, Grok, +5 more
├── server/
│ ├── iris-mcp-server.js # `iris serve` MCP/SSE server
│ ├── metrics.js # Prometheus text renderer
│ └── mdns.js # bonjour-service advertiser
└── integrations/
    └── memory-client.js # MCP client → optional memory backend (e.g., localmem)
```

## Coding standards

- **ESM only**, `type: "module"`. No CommonJS.
- **Node >= 18** features OK.
- **No emojis in source code or docs** except functional status
  indicators: ✅ (success), ⚠️ (warning), ❌ (failure), 🔑 (needs API key).
- Prefer editing existing files over adding new ones.
- Comments explain *why*, not *what*. Don't restate the code.
- Use `getLogger({component: 'name'})` for diagnostics. Keep
  user-facing CLI output as `console.log` — the logger is for events.
- Provider-touching code goes through `BaseProvider`. Subclasses
  implement `_doChat / _doStream / _ping`. Don't override `chat()` or
  `streamChat()` directly.

## Commit messages

Match the style of recent commits (see `git log --oneline -20`).
Subject line is concise (≤72 chars). Body explains the *why*. Example:

```
v1.0-A: Sibling-repo alignment

${VAR} interpolation in iris-config.json (matches the same
convention). Secrets stay in env, never in JSON....
```

No `Co-Authored-By` lines.

## Testing

```bash
npm test # runs tests/test-runner.js — 111 tests
```

Test runner is hand-rolled (no Vitest dep). When adding a feature:
- Add at least one test next to the existing tests in
  `tests/test-runner.js`.
- Use `_makeMockProvider(name, behaviour)` for provider stubs.
- Isolate filesystem tests via `path.join(os.tmpdir(),...)` — never
  touch the user's real `~/.iris/iris.db`.

## Adding a new built-in provider

Two paths:

1. **OpenAI-compatible service** (Kimi, MiniMax, OpenRouter, etc.):
   add an entry to `src/providers/builtin-registry.js` with
   `{baseURL, apiKeyEnv, models, rates, capabilities, description}`.
   No new code.

2. **Native SDK provider** (rare — only if the API doesn't speak
   OpenAI Chat Completions):
   - Create `src/providers/<name>-provider.js` extending `BaseProvider`.
   - Implement `_ping()`, `_doChat({messages, modelName, taskType}, options)`,
     and `_doStream(...)`.
   - Register in `src/index.js initializeOptionalProviders`.
   - Add to `SCORING_WEIGHTS.taskAffinity` in `ai-router.js` if you want
     task-specific bias.
   - Tests: extend the test runner with mock + integration coverage.

## Documentation

- Update `README.md` for user-facing changes.
- Update `CHANGELOG.md` under the next unreleased version heading.
- Update `ROADMAP.md` if you're shipping a roadmap item.
- JSDoc comments on every exported function.

## Release process

1. Bump `package.json` version.
2. Update `CHANGELOG.md` with the new version section.
3. Update version strings in `src/cli.js` banner.
4. Run `npm test` (must be 0 failures) + `npm audit` (must be 0 vulns).
5. `git tag -a vX.Y.Z -m "vX.Y.Z — summary"` after the merge.
6. Push tag.

## License

MIT. By contributing you agree your work is licensed under the same.

## Getting help

- Check `docs/` and `README.md` first.
- Search existing issues.
- Open a discussion if you're unsure whether something is a bug.
