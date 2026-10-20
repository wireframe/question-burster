# Question Burst

A small collaborative web app inspired by Hal Gregersen's Question Burst practice. Each participant writes questions privately against a shared timer. The group then consolidates similar questions and dot-votes on the ones that matter most.

This is a personal prototype that runs locally. Planning artifacts live in `docs/plans/2026-10-20-question-burst-app/`.

## Setup

```sh
npm install
cp .env.example .env   # required; then fill in ANTHROPIC_API_KEY
```

The server will not start without `ANTHROPIC_API_KEY` in `.env`.

## Scripts

| Command | What it does |
|---|---|
| `bin/dev` | Runs the Vite client (http://localhost:5173) and the API/WebSocket server (port 3001) together |
| `bin/test` | Runs the Vitest suite; pass a path to narrow it, e.g. `bin/test server/session` |
| `bin/typecheck` | Runs `tsc --noEmit` across `src`, `server` and `shared` |

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Server port (Vite proxies `/api` and `/ws` to it) |
| `DATABASE_PATH` | `data/question-burst.db` | SQLite file holding sessions; `data/` is gitignored |
| `ANTHROPIC_API_KEY` | none (required) | Anthropic API key used to group similar questions |

`ANTHROPIC_API_KEY` must be an Anthropic API key from your organization's account. Keep it in `.env`, which is gitignored, and never commit it. Question text is sent only to Anthropic, and only to group similar questions.

## Demo locally

1. Run `bin/dev` and open http://localhost:5173.
2. Create a session with a challenge.
3. Open the session link in a second browser or a private window, and join under a different name.

Sessions are saved to SQLite, so they survive a server restart.

## Related Documents

- [Decisions](docs/plans/2026-10-20-question-burst-app/decisions.md)
- [Research](docs/plans/2026-10-20-question-burst-app/research.md)
- [Structure](docs/plans/2026-10-20-question-burst-app/structure.md)
- [Plan](docs/plans/2026-10-20-question-burst-app/plan.md)
