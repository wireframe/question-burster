# Research: question-burst-app
Date: 2026-10-20
Decisions: [decisions.md](decisions.md)

## Greenfield repo state
**Findings:**
- `question-burster/` holds only `docs/plans/2026-10-20-question-burst-app/decisions.md`. There's no source, no `bin/` or `scripts/`, no package manifest, and no git repository yet (the environment reports "Is a git repository: false").
- Conventions therefore come from the user's sibling projects (next section), not from this repo.

## Sibling-project conventions (user's established stack)
**Findings:**
- **Language and build:** TypeScript with ESM in every recent web project. Vite in five of them (cbs-2026, calendar-sync-grid, will-game, minerva, roam-atlas), Next.js 16 in tao.
  - Reference: `cbs-2026/package.json:6,12-16`, `tao/package.json:35-39`
- **UI:** React (18 moving to 19) with Tailwind. calendar-sync-grid adds shadcn/Radix, react-query and zod.
- **Client/server split (the closest analog, cbs-2026):** a Vite React SPA in `src/`, an Express 5 API in `server/` run with `tsx watch --env-file-if-exists=.env`, and code both sides use in `shared/`. Vite proxies `/api` to `:3001`. `concurrently` runs both in dev.
  - Reference: `cbs-2026/package.json:12-16`, `cbs-2026/vite.config.ts:6-9`
- **Tests:** Vitest with jsdom and Testing Library everywhere. cbs-2026 runs `"test": "tsc --noEmit && vitest run"` and places `*.test.ts` files next to the code across `src`, `server` and `shared`.
  - Reference: `cbs-2026/package.json:8`, `cbs-2026/vitest.config.ts:7-10`, `tao/vitest.config.ts:9-20`
- **Lint and typecheck:** ESLint 9 (tao, calendar-sync-grid), or `tsc --noEmit` alone (cbs-2026). tao enforces `max-params: 3`. No project uses a formatter.
  - Reference: `tao/eslint.config.mjs:24`, `cbs-2026/package.json:9`
- **Persistence:** better-sqlite3 for local apps (tao, minerva). Upstash Redis KV for the one hosted app (calendar-sync-grid).
  - Reference: `tao/src/lib/app-db.ts:25,28`, `calendar-sync-grid/src/lib/kv.ts:1`
- **Real-time:** no project uses a real-time or multiplayer library (no ws, socket.io, PartyKit, Liveblocks, Supabase, Convex, Firebase or Yjs). The only streaming is SSE in `tao/src/app/api/chat/route.ts`.
- **Hosting:** only calendar-sync-grid is deployed, on Vercel (`vercel.json` SPA rewrites, plus serverless functions in `api/`), with CI in `.github/workflows/ci.yml` (lint, typecheck, test, build on Node 20). The others run locally.
- **Claude usage:**
  - `@anthropic-ai/sdk`, called server-side only.
  - The client is wrapped in `cbs-2026/server/ai/anthropic-signer.ts:37-39`, and the model constant lives in `cbs-2026/server/ai/claude-client.ts:61`.
  - Required env vars fail fast by name without printing their values (`cbs-2026/server/environment.ts:19-24`).
  - `ANTHROPIC_API_KEY` is documented in `.env.example`, and `.gitignore` excludes `.env*` but keeps `!.env.example`.
- **bin/:** thin shell wrappers that `set -euo pipefail` (or POSIX sh), `cd` to the repo root and `exec` into npm or tsx. tao has about 28 of them (`test`, `lint`, `server`, `doctor`…).
  - Reference: `tao/bin/test:5-7`, `cbs-2026/bin/start-app`
- **Docs:** `docs/plans/YYYY-MM-DD-slug/{decisions,research,structure,plan}.md` (QRSPI) and `docs/backlog.md`. AGENTS.md or CLAUDE.md appear in the larger repos.

## Real-time + persistence stack options (D18, D14)
**Findings:**
- **Cloudflare Durable Objects (Agents SDK or PartyServer):**
  - One instance per session name, so you get one authoritative room per session automatically.
  - Each instance has its own SQLite (`this.sql`). `setState()` saves, broadcasts and validates through `validateStateChange()`.
  - Durable Objects with SQLite are on the Workers Free plan, and secrets are stored as Worker secrets.
  - Testing uses the Workers Vitest integration (real runtime, storage isolated per test file).
  - Highest lock-in. You can limit it by keeping the session logic in plain TypeScript.
  - Cloudflare bought PartyKit in 2024; partyserver and partysocket are still published.
  - Reference: https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/ , https://developers.cloudflare.com/changelog/2025-04-07-durable-objects-free-tier/ , https://developers.cloudflare.com/workers/testing/vitest-integration/
- **Node + ws/socket.io + SQLite on a container host:**
  - You build the room yourself: an in-memory map from session to state, persisted to SQLite.
  - Most portable, easiest to test with plain Vitest, matches cbs-2026's Express plus better-sqlite3 pattern.
  - Single instance only.
  - Fly has no free tier for new organizations. Small always-on machine about $2/month, volume about $0.15/GB/month (third-party figures).
  - Render's free tier sleeps after 15 minutes and has an ephemeral disk, so SQLite data would be lost.
  - Reference: https://render.com/docs/free , https://temps.sh/blog/fly-io-pricing-2026
- **Convex:**
  - Serialized TypeScript mutations and reactive queries make it behave like a server-authoritative store, but there's no room process.
  - Actions can call Claude using environment secrets.
  - Free tier around 1M calls/month (third-party figure).
  - High lock-in.
  - Reference: https://convex.dev/pricing/faq
- **Supabase (Postgres + Realtime):**
  - No authoritative room. Rules for hidden tallies and input locks end up spread across RLS policies and edge functions.
  - Free projects pause after 7 days of low activity.
  - Reference: https://supabase.com/docs/guides/platform/free-project-pausing
- **Liveblocks / Firebase:** Liveblocks relies on client-side CRDT storage, which conflicts with hidden state. Firebase needs the paid Blaze plan for Functions and secrets.
  - Reference: https://firebase.google.com/pricing
- **Vercel (the user's only hosted precedent):** the platform has serverless functions and KV, but the user's existing project doesn't use long-lived WebSocket rooms. The calendar-sync-grid precedent covers no real-time.

## Semantic grouping with Claude (D5, D6)
**Findings:**
- **One structured-output call:**
  - Send the challenge plus `{id, text}` for each question. Get back `{groups:[{label, questionIds[]}]}` through `output_config.format` (`json_schema`), which guarantees the schema shape.
  - It does not guarantee that every ID is covered, so the server needs a coverage check plus an "Ungrouped" fallback.
  - A refusal or hitting `max_tokens` can still produce output that doesn't match the schema.
  - The first call with a new schema compiles a grammar; it's cached for 24 hours.
  - Forcing a tool call (`tool_choice` any/tool) returns a 400 on Opus 5.5 and Sonnet 5.5.
  - Reference: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- **Pricing, $ per million tokens in/out:** `claude-haiku-5-5` $0.10/$0.50 (thinking on by default at medium effort), `claude-sonnet-5-5` $2/$10, `claude-opus-5-5` $4/$20.
  - Reference: https://platform.claude.com/docs/en/about-claude/pricing
- **Cost estimate for 200 questions:** about 5–6K input tokens and 1.5–3K output tokens, which works out to roughly $0.002 (Haiku), $0.04–0.10 (Sonnet) or $0.08–0.20 (Opus) per grouping. Latency wasn't measured.
- **Embeddings:** Anthropic has no embedding model of its own; its docs point to Voyage AI, which would add a second data processor. A self-hosted open-weight model would be the compliant alternative, and it would still need a separate Claude call to label the groups.
  - Reference: https://platform.claude.com/docs/en/build-with-claude/embeddings

## Concurrent consolidation edits (D7)
**Findings:**
- **Server-authoritative ordered commands:**
  - Clients send `merge`, `split` or `reword(baseVersion)`. The server applies them one at a time per room, checks preconditions, rejects stale ones and resyncs, then broadcasts.
  - The logic can be a pure reducer that's easy to unit test, and the ordering cost is negligible at 3–12 people.
- **CRDTs (Yjs/Automerge):** they handle text well, but structural merges and splits can leave a question duplicated or orphaned, and the full state replicates to every client. That conflicts with anonymity and hidden tallies.
- **Last-write-wins:** acceptable for label text, unsafe for changes to group membership.

## Shared timer and phase transitions (D11, D16)
**Findings:**
- The server stamps an absolute `endsAt` and broadcasts it. Clients draw the countdown using an estimated clock offset, so late joiners see the same timer.
- The server rejects question submissions after `endsAt` (with a small grace window). A server-side alarm or timer ends the burst even if nobody clicks.
- Several people clicking "advance" at once is handled with `advance(fromPhase)`, which is ignored unless `fromPhase` matches the current phase.

## Anonymity and hidden tallies (D12, D13)
**Findings:**
- `authorId` is stored only on the server. `projectForClient(state, viewerId)` removes it from every payload, and a unit test can assert that no serialized payload contains `authorId`.
- Completion is shared as per-person counts and done flags only. Question IDs are random, so their order doesn't hint at authorship.
- The server keeps `votes[participantId][groupId]` and enforces at most 3. Each client receives only its own allocation and `votersDone`. Combined tallies are sent only once the phase is results.
- This rules out client-replicated state stores (CRDT documents, Liveblocks Storage, client-readable Firebase or Supabase rows).

## Patterns Observed
- TypeScript, ESM, Vite and React, with Vitest tests next to the code and `tsc --noEmit` as a gate.
- Server code split into `src/` (client), `server/` and `shared/`.
- Fail-fast env validation that names missing variables without printing values. `.env.example` is committed and `.env*` is ignored.
- `bin/` wrappers for common operations. QRSPI docs live under `docs/plans/`.
- The Claude SDK is wrapped behind a small client module with the model ID as a constant.

## Constraints Discovered
- Hidden tallies and anonymous authorship (D12, D13) rule out client-replicated state. A server-authoritative room or store is needed.
- The user has no precedent for real-time or WebSocket hosting. Their only hosted precedent (Vercel functions + KV) doesn't support long-lived WebSocket rooms.
- Render's free tier would lose SQLite data, and Supabase free projects pause. Persistent results (D17) need a host with durable storage.
- Embedding-based dedup would send question text to a second vendor (Voyage). Grouping through Claude alone keeps data with Anthropic.
- Structured outputs don't guarantee every question ID comes back. The server has to check coverage.
- With D11 (anyone can advance) and D16 (timer lock) together, transitions need to be idempotent to handle simultaneous clicks.

## Open Decisions (must be resolved before /structure)
- **D18 Tech stack:** viable options grounded in the findings above:
  - **Node (Express + ws) + SQLite on Fly.io, with a Vite React client:** matches cbs-2026's layout, tests and Claude patterns, is the most portable, and runs locally with one command. You hand-build the per-session room and its persistence. It costs about $2/month with no free tier, and you have to run a single instance.
  - **Cloudflare Workers + Durable Objects (Agents SDK / PartyServer), with a Vite React client:** the room-per-session model, per-room SQLite, broadcasting and alarms come built in, and it runs free. It's a new runtime for the user, tests run under the Workers Vitest pool, and lock-in is the highest of the three (limit it by keeping session logic as pure TypeScript).
  - **Convex, with a Vite React client:** serialized mutations and live queries come with no server to run, and it has a free tier. It has no room process, its data model is Convex-specific, and it has the most lock-in of the three.

  **Resolved 2026-10-20:** the user picked Node + ws + SQLite on Fly (recorded in decisions.md D18 as Preference).
