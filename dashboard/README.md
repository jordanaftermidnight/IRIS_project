# IRIS Dashboard (starter)

Web UI ported from IRIS v0.9 (`IRIS_project`). Currently runs on
**mocked data** — to wire it to the real v1.0 server, replace the data
fetching layer with calls to the live endpoints:

| Dashboard concern | Wire to | Notes |
|---|---|---|
| Live activity feed | `GET /events` (SSE) | `{type:'routing'|'council'|'breaker',...}` JSON frames |
| Per-provider stats | `GET /metrics` | Prometheus text; parse with a tiny tokenizer |
| Provider list + status | MCP `iris_providers` | structured JSON |
| Recent requests | MCP `iris_recent_requests({limit, sinceIso?})` | from SQLite |
| Cost summary | MCP `iris_cost_summary({sinceIso?})` | grouped by provider |
| Breaker status | MCP `iris_breaker_status()` | per provider |
| Health | MCP `iris_health()` or `GET /healthz` | both work |
| Send a chat | MCP `iris_chat({message, taskType?, ...})` | full envelope returned |

## Running

For now (mock data):

```bash
# any static server
npx serve dashboard
# or python -m http.server -d dashboard 8080
```

Once wired to a live IRIS:

```bash
iris serve --port=8782 # in one terminal
# Then open dashboard/index.html and point its DATA_SOURCE to
# http://127.0.0.1:8782
```

If you serve the dashboard from a different origin, set
`config.server.corsOrigin` so the browser can reach `/events`,
`/metrics`, and `/sse`.

## Files

- `index.html` — entry HTML
- `iris-dashboard.js` — dashboard JS (2700+ lines, lots of mocked data
  to replace)
- `styles.css` — visual styles

## Status

This is **starter UI**. v1.0.0 ships it as-is because rewriting the
data layer is its own project. Treat as a working skeleton you can
evolve into a real live dashboard panel.
