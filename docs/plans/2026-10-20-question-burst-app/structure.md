# Structure: question-burst-app
Date: 2026-10-20
Decisions: [decisions.md](decisions.md)
Research: [research.md](research.md)

The architecture throughout is one server-authoritative room per session (D18). Session logic is a pure reducer in `server/session/` that gets unit tested directly. `projectForClient(state, viewerId)` builds each viewer's payload, keeping authors, other people's questions and tallies on the server (D12, D13). The WebSocket layer is a thin wrapper that applies commands and broadcasts projections. The phase order is lobby → burst → consolidate → vote → results.

**Sequencing:** the whole app runs locally, demoed with separate browsers, and must be fully working before any remote hosting. Deploying to Fly.io (D14) is a later step after these phases (see Out of Scope).

## Phase 1: Walking skeleton (create, join, lobby, advance)
**Goal:** Someone creates a session with a challenge (D15) and a burst duration that defaults to 4 minutes (D16), shares the link, and others join with a display name (D10). Everyone sees the participant list update live, and anyone can advance the phase (D11). `advance(fromPhase)` is idempotent, so simultaneous clicks don't skip a phase. Sessions are saved to SQLite and reload after a server restart. The later phases show placeholder screens.
**Files touched:**
- Project setup: `package.json`, `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`, `README.md`
- `bin/dev`, `bin/test`, `bin/typecheck`
- Server: `server/index.ts`, `server/environment.ts`, `server/db.ts`, `server/rooms.ts` (ws hub), `server/session/{state,reducer,projection}.ts` plus tests
- Shared: `shared/protocol.ts` (command and event types)
- Client: `src/{main,App}.tsx`, `src/session/useSession.ts`, `src/screens/{CreateSession,JoinSession,Lobby}.tsx`
**Depends on:** nothing
**Verification:** `bin/test` passes:
- reducer tests: create, join, advance, ignoring a stale `fromPhase`
- projection tests
- a ws integration test with two clients seeing each other join

`bin/typecheck` is clean. Manual check: `bin/dev`, then open two browsers (e.g. a normal and a private window), join both, advance, restart the server and confirm the session state comes back.

## Phase 2: Private timed burst
**Goal:** On "start burst", the server stamps `endsAt` and broadcasts it. Clients show a countdown corrected for clock offset. Each participant adds questions privately, seeing only their own. Everyone sees only per-person counts and done flags. The server rejects submissions after `endsAt` (with a small grace window) and moves to consolidation automatically when time runs out, though anyone can still advance early. Question IDs are random. No question-mark validation or check-in steps (D2).
**Files touched:**
- `server/session/{reducer,projection,timer}.ts` plus tests
- `server/rooms.ts` (scheduling the burst timer)
- `shared/protocol.ts`
- `src/screens/Burst.tsx`, `src/session/useCountdown.ts`
**Depends on:** Phase 1
**Verification:** Unit tests cover:
- submitting before and after `endsAt`
- the auto-advance on timer expiry
- that no viewer's payload contains another participant's question text or any `authorId`

Manual check: two browsers burst at the same time, the countdowns stay in sync, and input locks at zero.

## Phase 3: AI grouping and collaborative consolidation
**Goal:** When the session enters consolidation, the server makes one Claude structured-output call with the challenge and `{id, text}` for each question, defaulting to `claude-haiku-5-5` behind a model constant (D5, D6). It checks that every question ID came back, and puts any missing ones in "Ungrouped". If the call fails, every question becomes its own group, so the session never stalls. All participants then see the anonymous groups (D13) and can merge, split or reword them (D7). These are ordered server commands; a reword carries a `baseVersion`, and stale commands are rejected and resynced. Question text goes only to Anthropic. The API key is read from a local `.env`.
**Files touched:**
- `server/ai/{claude-client,group-questions}.ts` plus tests (fake client injected)
- `server/session/{reducer,projection}.ts` plus tests (merge, split, reword)
- `shared/protocol.ts`
- `src/screens/Consolidate.tsx`, `src/components/QuestionGroup.tsx`
**Depends on:** Phase 2
**Verification:** Unit tests cover:
- the coverage check and Ungrouped fallback
- the fallback when the Claude call fails
- merge, split and reword, including stale-version rejection
- no `authorId` in any payload

Manual check: run a real grouping call against a sample set (e.g. "Why do customers churn?" and "What makes clients leave us?" land in the same group), with two browsers editing at the same time.

## Phase 4: Dot voting and results
**Goal:** Each participant gets 3 votes and can stack them (D8, D9). The server enforces the budget and sends each client only its own allocation plus the count of voters who are done. Tallies stay hidden until the phase moves to results (D12). The results screen shows the challenge and the groups ranked by votes, and it stays viewable at the session link afterward, view only (D17).
**Files touched:**
- `server/session/{reducer,projection}.ts` plus tests
- `shared/protocol.ts`
- `src/screens/{Vote,Results}.tsx`
**Depends on:** Phase 3
**Verification:** Unit tests cover:
- the budget limit (a 4th vote is rejected), stacking, and removing a vote
- no tallies in any payload before results
- ranking ties

Manual check: run a full end-to-end local demo with two browsers, from create to results, then restart the server and reopen the session link to confirm the results are still there.

## Out of Scope
These are deferred for the MVP, and most are Preference-level choices that could come back as follow-ups if the idea works (D2):
- **Remote hosting on Fly.io (D14):** a Dockerfile, `fly.toml`, a persistent volume, the API key as a Fly secret, and Express serving the built client. This is the next step once the local app is fully working, not dropped. The single-server, SQLite design keeps it a packaging step only.
- Gregersen extras: emotional check-in and check-out, question-mark validation, blocking preambles and answers (D2).
- Copy or export of results as Markdown (D17 picked view-only; this is an easy follow-up).
- A facilitator or host role and any permissions (D7, D11 are prototype simplifications).
- Accounts and SSO (D10). Async sessions (D3). Configurable vote counts (D9). Revealing authors after results (D13).
- Workshop scale beyond about 12 people, filtering and clustering in the review UI, and running more than one server instance (D4, D18).
- Embedding-based similarity (it needs a second vendor, per research).
