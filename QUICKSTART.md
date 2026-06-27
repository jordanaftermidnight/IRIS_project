# Iris Quickstart

Five minutes to a working multi-provider AI router with persistent
sessions and learning.

## 1. Install

```bash
git clone https://github.com/jordanaftermidnight/multi-ai-integration-CLI.git
cd multi-ai-integration-CLI
npm install
npm install -g . # makes the `iris` command available
iris help
```

Requires Node.js ≥ 18.

## 2. Pick at least one provider

### Option A — Local + free (Ollama)

```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve &
ollama pull mistral:7b # balanced default
ollama pull qwen2.5-coder:7b # code tasks
ollama pull llama3.2:latest # creative + vision
ollama pull qwen3:4b # fast / ultra_fast
```

### Option B — Cloud (set whichever keys you have)

```bash
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
export GROQ_API_KEY="..."
export GEMINI_API_KEY="..."
export MOONSHOT_API_KEY="..." # Kimi
export DEEPSEEK_API_KEY="..."
# ...and many more — see "iris providers" or README.md
```

You can mix any number; IRIS auto-detects what's set.

## 3. First chat

```bash
iris chat "Hello"
iris chat "Write a Python sort function" --task=code
iris chat "Compare React vs Solid in 5 bullets" --task=complex --provider=claude
```

`iris providers` shows which ones are live, which need a key, and
their priority.

## 4. Persistent sessions

```bash
iris session new debugging
iris chat "Help me debug: TypeError: x is undefined" --session=debugging --task=code
# ...later, in a different terminal...
iris chat "What did I just ask about?" --session=debugging
iris session show debugging # full transcript
iris session list # all recent sessions
```

Or set `IRIS_SESSION=<id>` once and skip the flag.

## 5. Useful commands

```bash
iris providers # status + statistics
iris models # list models per provider
iris health --verbose # detailed health check
iris file ./script.js --task=code # analyze a file
iris status # comprehensive system status
```

## 6. Task types

| Task | Best for | Routing tendency |
|---|---|---|
| `balanced` (default) | General questions | Ollama → Groq → cloud |
| `fast` | Quick simple queries | Ollama (qwen3:4b) → Groq (gpt-oss-20b) |
| `code` | Programming, debugging | Ollama (qwen2.5-coder) → Claude Sonnet → OpenAI GPT-5.4 |
| `creative` | Writing, brainstorming | Ollama → Gemini 3.1 Pro → Claude Sonnet |
| `complex` | Deep analysis | OpenAI GPT-5.5 → Claude Opus 4.8 |
| `reasoning` | Logical problems | OpenAI o4-mini → Claude Opus 4.8 |
| `vision` | Image analysis | Gemini 3.1 Flash-Image → OpenAI GPT-5.4 → Claude Sonnet |
| `ultra_fast` | Lightning responses | Groq (gpt-oss-20b at 1000 t/s) |

Don't supply `--task`? IRIS auto-classifies from message content
(regex + keyword scoring, no extra LLM call).

## 7. Force a specific provider

```bash
iris chat "test" --provider=ollama # local
iris chat "test" --provider=kimi # long context
iris chat "test" --provider=cerebras # fastest cloud
```

If the named provider isn't ready (no key, unreachable), IRIS errors
out cleanly rather than silently falling through.

## 8. Local-only mode

```bash
iris chat "Sensitive thing" --local
```

Forces local providers; never sends to cloud.

## 9. Adding a new OpenAI-compatible service

If your service isn't in the built-in registry, add it to
`config/iris-config.json`:

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

That's it. `iris providers` will show it, `iris chat --provider=lmstudio` works.

## 10. Optional: connect memory backend for learning

If you have [localmem](https://github.com/jordanaftermidnight/localmem) (an MCP memory
backend) running on `localhost:8781`, enable it in `config/iris-config.json`:

```json
{ "memory": { "enabled": true, "host": "localhost", "port": 8781 } }
```

IRIS then logs every routing decision, reads back per-task provider
preferences every 5 minutes, and biases scoring toward what's worked
in your history. Connection failures are non-blocking.

---

**Need more?** `iris help` shows the full reference.
[README.md](./README.md) has the architecture overview.
[ROADMAP.md](./ROADMAP.md) has the development history and what's next.
