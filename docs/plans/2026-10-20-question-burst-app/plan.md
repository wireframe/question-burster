# Plan: question-burst-app
Date: 2026-10-20
Decisions: [decisions.md](decisions.md)
Research: [research.md](research.md)
Structure: [structure.md](structure.md)

> **For Claude:** Execute this plan task-by-task, phase by phase. See `/qrspi:implement`'s execution options.

**Goal:** A locally runnable, multi-browser Question Burst app. A participant creates a session around a challenge, everyone writes questions privately against a shared timer, Claude groups similar questions, anyone can refine the groups, everyone dot-votes, and the results persist.

**Architecture:**
- One server-authoritative room per session. A pure reducer `applyCommand(state, actorId, command, ctx)` turns commands into new state.
- `projectForClient(state, viewerId)` builds each viewer's payload, so authors, other people's questions and tallies never leave the server.
- A thin `ws` hub applies commands, saves state as a JSON blob in SQLite and broadcasts the projections.
- Side effects (burst timer, Claude grouping) run in the room and come back into the reducer as system commands.

**Tech Stack:**
- Language and client: TypeScript (ESM), Vite and React 19 with plain CSS
- Server: Express 5 and `ws`, run with `tsx`
- Storage: `better-sqlite3`
- AI: `@anthropic-ai/sdk`, with `claude-haiku-5-5` and structured outputs
- Tooling: Vitest with jsdom and Testing Library, `tsc --noEmit`

**Conventions (from research.md, sibling-project conventions):**
- The layout follows cbs-2026: client in `src/`, server in `server/`, shared types in `shared/` (`cbs-2026/package.json:12-16`). Vite proxies to `:3001` (`cbs-2026/vite.config.ts:6-9`).
- `npm test` runs `vitest run`, and tests sit next to the code as `*.test.ts(x)` (`cbs-2026/package.json:8`, `cbs-2026/vitest.config.ts:7-10`).
- Server tests run in Vitest's default `node` environment. Client test files start with `// @vitest-environment jsdom`.
- Required env vars fail fast by name and never print values (`cbs-2026/server/environment.ts:19-24`).
- `bin/` wrappers use `#!/usr/bin/env bash`, `set -euo pipefail`, `cd "$(dirname "$0")/.."` and `exec` (`tao/bin/test:5-7`).
- Code style follows the user's global CLAUDE.md: small functions, at most 2 parameters (use an options object beyond that), dependencies injected through parameters rather than looked up.
- Commit messages carry **no Claude attribution** (user preference in the global CLAUDE.md, which takes precedence). History is never squashed.
- The reducer throws `CommandRejected(reason)` for invalid commands; the room catches it and sends `{type:'rejected', reason}` to the actor only. No other defensive handling.

**Core types (created in Phase 1, extended in later phases):**
```ts
// shared/protocol.ts
type Phase = 'lobby' | 'burst' | 'consolidate' | 'vote' | 'results'
type ClientCommand =
  | { type: 'join'; name: string; participantId?: string }
  | { type: 'advance'; fromPhase: Phase }
  | { type: 'submitQuestion'; text: string }                                   // Phase 2
  | { type: 'markDone' }                                                       // Phase 2
  | { type: 'merge'; sourceGroupId: string; targetGroupId: string }            // Phase 3
  | { type: 'split'; groupId: string; questionId: string }                     // Phase 3
  | { type: 'reword'; groupId: string; label: string; baseVersion: number }    // Phase 3
  | { type: 'castVote'; groupId: string } | { type: 'removeVote'; groupId: string } // Phase 4
type ServerMessage =
  | { type: 'welcome'; participantId: string | null; serverNow: number }
  | { type: 'state'; view: SessionView }
  | { type: 'rejected'; reason: string }
// SessionView grows per phase: id, challenge, burstSeconds, phase, endsAt,
// participants[{id,name,questionCount,done}], myQuestions, groupingStatus, groups, myVotes, votesRemaining, votersDone, results
```
```ts
// server/session/state.ts — never sent to clients
interface SessionState {
  id: string; challenge: string; burstSeconds: number; phase: Phase; endsAt: number | null
  participants: Record<string, { id: string; name: string; done: boolean }>
  questions: Record<string, { id: string; authorId: string; text: string }>   // Phase 2
  groupingStatus: 'idle' | 'pending' | 'ready'                                // Phase 3
  groups: Record<string, { id: string; label: string; version: number; questionIds: string[] }> // Phase 3
  votes: Record<string, Record<string, number>>                               // Phase 4
}
interface CommandContext { now: number; newId: () => string }
```

---

## Phase 1: Walking skeleton (create, join, lobby, advance)

- [ ] Task 1.1: Initialize the repo and tooling
  - File: `package.json`, `tsconfig.json`, `vitest.config.ts`, `vite.config.ts`, `.gitignore`, `.env.example`, `index.html`
  - Change:
    - Run `git init`, then `npm init -y` and set `"type": "module"`.
    - Install deps: `react react-dom express ws better-sqlite3`.
    - Install dev deps: `typescript tsx vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom concurrently @types/react @types/react-dom @types/express @types/ws @types/better-sqlite3 @types/node`.
    - Scripts: `dev` = `concurrently -k "vite" "tsx watch --env-file-if-exists=.env server/index.ts"`, `test` = `vitest run`, `typecheck` = `tsc --noEmit`.
    - `tsconfig.json`: one config with `include` `["src","server","shared"]`, `strict`, `module`/`target` `ESNext`, `moduleResolution` `Bundler`, `jsx` `react-jsx`, `types` `["node","vite/client","@testing-library/jest-dom"]`, `noEmit`.
    - `vite.config.ts`: the react plugin, plus a proxy sending `/api` to `http://localhost:3001` and `/ws` to `ws://localhost:3001` with `ws: true`.
    - `vitest.config.ts`: `include` `['{src,server,shared}/**/*.test.{ts,tsx}']`.
    - `.gitignore`: `node_modules`, `dist`, `data/`, `.env*`, `!.env.example`.
    - `.env.example`: `PORT=3001`, `DATABASE_PATH=data/question-burst.db`. There's no API key yet; Phase 3 adds it.
    - `index.html`: mounts `#root` and loads `/src/main.tsx`.
  - Test: `npm run typecheck` exits 0. `npm test` reports "no test files" without crashing.

- [ ] Task 1.2: Add the bin wrappers
  - File: `bin/dev`, `bin/test`, `bin/typecheck`
  - Change: three executable scripts (`chmod +x`), each with `#!/usr/bin/env bash`, `set -euo pipefail` and `cd "$(dirname "$0")/.."`. They run `exec npm run dev`, `exec npm test -- "$@"` and `exec npm run typecheck` respectively.
  - Test: `bin/typecheck` exits 0.

- [ ] Task 1.3: Shared protocol types plus the env loader (TDD)
  - File: `shared/protocol.ts`, `server/environment.ts`, `server/environment.test.ts`
  - Change:
    - Write `environment.test.ts` first, with four tests: `loadEnvironment({})` returns `{port: 3001, databasePath: 'data/question-burst.db'}`; it respects `PORT` and `DATABASE_PATH`; it throws `Error('Invalid PORT')` for `PORT=abc`; and the error message never contains the bad value.
    - Implement `loadEnvironment(env: NodeJS.ProcessEnv)`.
    - Add `Phase`, `PHASE_ORDER`, the Phase 1 parts of `ClientCommand` (`join`, `advance`), `ServerMessage`, and `SessionView` with `{id, challenge, burstSeconds, phase, endsAt, participants}` to `shared/protocol.ts`.
  - Test: `bin/test server/environment.test.ts`

- [ ] Task 1.4: Session state, creation and the `join` reducer (TDD)
  - File: `server/session/state.ts`, `server/session/reducer.ts`, `server/session/reducer.test.ts`, `server/session/errors.ts`
  - Change:
    - Tests first:
      - `createSession({challenge, burstSeconds}, ctx)` returns phase `lobby` with no participants. It trims the challenge, rejects an empty challenge, defaults `burstSeconds` to 240 and rejects values outside 30–1800.
      - `join` adds a participant with id `ctx.newId()` and a trimmed name (1–40 characters, otherwise rejected).
      - `join` with an existing `participantId` updates that participant's name and doesn't duplicate them.
    - Implement `SessionState` (Phase 1 fields only), `CommandContext`, `CommandRejected extends Error`, `createSession`, and `applyCommand(state, {actorId, command, ctx})`. It returns `{state, participantId?}` without mutating its input; `join` returns the participant's id.
  - Test: `bin/test server/session`

- [ ] Task 1.5: The `advance` reducer (TDD)
  - File: `server/session/reducer.ts`, `server/session/reducer.test.ts`
  - Change:
    - Tests first:
      - `advance` with `fromPhase` equal to the current phase moves to the next phase in `PHASE_ORDER`.
      - A stale `fromPhase` returns the state unchanged (the same reference). It's idempotent and does not throw.
      - Advancing from `results` is a no-op.
      - Entering `burst` sets `endsAt = ctx.now + burstSeconds * 1000`.
    - Implement it as small helpers: `nextPhase(phase)` and `enterPhase(state, phase, ctx)`.
  - Test: `bin/test server/session`

- [ ] Task 1.6: Client projection (TDD)
  - File: `server/session/projection.ts`, `server/session/projection.test.ts`
  - Change:
    - Tests first: `projectForClient(state, viewerId)` returns a `SessionView` with participants as `{id, name, questionCount: 0, done}`. It works when `viewerId` is `null` (a spectator).
    - Add a helper `expectNoKey(view, 'authorId')`, which walks the JSON, for later phases to reuse.
    - Implement the projection.
  - Test: `bin/test server/session`

- [ ] Task 1.7: SQLite session repository (TDD)
  - File: `server/db.ts`, `server/db.test.ts`
  - Change:
    - Tests first, using `':memory:'`: `save(state)` then `load(id)` returns an equal state, `load('missing')` returns `undefined`, and a second `save` overwrites the first.
    - Implement `openDatabase(path)`. It creates the parent directory unless the path is `:memory:`, and creates the table `sessions(id TEXT PRIMARY KEY, state_json TEXT NOT NULL, updated_at INTEGER NOT NULL)`.
    - Implement `createSessionRepository(db)` returning `{load, save}`. `save` uses `INSERT … ON CONFLICT(id) DO UPDATE`.
  - Test: `bin/test server/db.test.ts`

- [ ] Task 1.8: Room hub and HTTP/WS server (TDD integration)
  - File: `server/rooms.ts`, `server/app.ts`, `server/app.test.ts`, `server/index.ts`
  - Change:
    - Test first. Start `createServer({repository, clock})` on port 0, where `clock = {now: () => Date.now(), newId: () => crypto.randomUUID()}`.
      - `POST /api/sessions {challenge:'Onboarding is slow'}` returns `{id}`.
      - Two `ws` clients connect to `/ws?session=<id>`, and each first receives `welcome` (`participantId: null`, `serverNow`) followed by `state`.
      - Each client sends `join`. Both end up seeing 2 participants.
      - Client A sends `advance` with `fromPhase: 'lobby'`, and both see phase `burst`.
      - A command that doesn't parse sends `rejected` to that socket only.
      - `/ws?session=unknown` closes with code 4404.
    - Implement:
      - `RoomHub`, holding `Map<sessionId, Room>` and lazily loading sessions from the repository.
      - `Room`, holding the state and `Map<WebSocket, participantId | null>`. Its `handle(socket, command)` runs `applyCommand` → `repository.save` → broadcast. On a successful `join` it sends that socket a new `welcome` with the participantId, then broadcasts.
      - The broadcast sends each socket `projectForClient(state, itsParticipantId)`.
      - `createServer` is Express plus `http.createServer` plus a `WebSocketServer({noServer:true})` that handles upgrades on `/ws`.
    - `server/index.ts` wires `loadEnvironment(process.env)`, `openDatabase` and `createServer`, then calls `listen(port)`.
  - Test: `bin/test server/app.test.ts`

- [ ] Task 1.9: Client routing, create and join screens (TDD)
  - File: `src/main.tsx`, `src/App.tsx`, `src/route.ts`, `src/route.test.ts`, `src/screens/CreateSession.tsx`, `src/screens/CreateSession.test.tsx`, `src/styles.css`
  - Change:
    - Tests first:
      - `parseRoute('/')` returns `{name:'create'}`, `parseRoute('/s/abc')` returns `{name:'session', id:'abc'}`, and anything else returns `{name:'notFound'}`.
      - `CreateSession` (jsdom) with an injected `createSession` function: filling in the challenge with duration 4 and submitting calls it with `{challenge, burstSeconds: 240}`. Submitting with an empty challenge is blocked.
    - Implement:
      - `App` switches on `parseRoute(location.pathname)`.
      - `CreateSession` POSTs to `/api/sessions`, then sets `location.href = '/s/' + id`.
      - `styles.css` is a minimal readable layout.
  - Test: `bin/test src`

- [ ] Task 1.10: `useSession` hook, lobby and placeholder screens (TDD)
  - File: `src/session/useSession.ts`, `src/session/sessionClient.ts`, `src/session/sessionClient.test.ts`, `src/screens/{JoinSession,Lobby,Placeholder,SessionScreen}.tsx`, `src/screens/Lobby.test.tsx`
  - Change:
    - Tests first:
      - `createSessionClient(socketFactory, sessionId)` with a fake socket. After `welcome`, it stores `participantId` in `localStorage` under the key `qb:<sessionId>`. On reconnect it sends `join` with the stored `participantId`. It exposes the latest `view`, `participantId`, `clockOffset = serverNow - Date.now()` and `lastRejection`.
      - `Lobby` renders the challenge and participant names, and its "Start burst" button sends `{type:'advance', fromPhase:'lobby'}`.
    - Implement:
      - `useSession` wraps the client with `useSyncExternalStore`.
      - `SessionScreen` shows `JoinSession` (name input) until there's a participantId, but only while phase ≠ results. After that it switches on `view.phase`: Lobby, or `Placeholder` for the remaining phases.
      - Every screen has an "Advance" control that sends `advance` with the current phase.
  - Test: `bin/test src`, then `bin/typecheck`

- [ ] Task 1.11: Manual verification and README
  - File: `README.md`
  - Change: document `bin/dev`, `bin/test`, `bin/typecheck`, the `.env` setup and the data location.
  - Test: run `bin/dev` and open `http://localhost:5173`.
    1. Create a session.
    2. Open the link in a normal window and a private window, and join as "A" and "B". Both see both names.
    3. Click Advance in B. Both windows show the burst placeholder.
    4. Stop and restart `bin/dev`. After reloading, both windows still show burst with A and B present.

- [ ] Commit Phase 1: `git add -A && git commit -m "Walking skeleton: create, join, lobby, phase advance with SQLite persistence"`

## Phase 2: Private timed burst

- [ ] Task 2.1: `submitQuestion` and `markDone` reducers (TDD)
  - File: `shared/protocol.ts`, `server/session/state.ts`, `server/session/reducer.ts`, `server/session/reducer.test.ts`
  - Change:
    - Tests first:
      - In `burst`, `submitQuestion` stores `{id: ctx.newId(), authorId: actorId, text}` with the text trimmed. It must be 1–280 characters, otherwise rejected.
      - It's rejected outside `burst`, rejected when the actor isn't a participant, and rejected when `ctx.now > endsAt + 2000` (the grace window).
      - `markDone` sets `done: true` for the actor, and only during `burst`.
    - Add `questions` to the state (`createSession` initializes it to `{}`) and the two commands to the protocol.
    - Add `BURST_GRACE_MS = 2000` in `reducer.ts`.
  - Test: `bin/test server/session`

- [ ] Task 2.2: Burst projection keeps questions private (TDD)
  - File: `server/session/projection.ts`, `server/session/projection.test.ts`, `shared/protocol.ts`
  - Change:
    - Tests first:
      - With A and B each submitting questions, A's view has `myQuestions` containing only A's `{id, text}`.
      - `participants[].questionCount` reflects both participants' counts.
      - B's question text appears nowhere in `JSON.stringify(viewForA)`.
      - `expectNoKey(view, 'authorId')` passes.
      - A spectator (`null`) gets `myQuestions: []`.
    - Implement `myQuestions` (filled only during `burst`) and `questionCount`.
  - Test: `bin/test server/session`

- [ ] Task 2.3: Timer schedule helper (TDD)
  - File: `server/session/timer.ts`, `server/session/timer.test.ts`
  - Change:
    - Tests first for `burstTimeoutMs(state, now)`: it returns `null` unless the phase is `burst`; it returns `endsAt - now` when that's in the future; and it returns `0` when `endsAt` has passed, which covers a restart mid-burst.
    - Implement it.
  - Test: `bin/test server/session/timer.test.ts`

- [ ] Task 2.4: Room schedules the burst auto-advance (TDD)
  - File: `server/rooms.ts`, `server/rooms.test.ts`
  - Change:
    - Test first, with `vi.useFakeTimers()` and an injected clock. After `advance` from lobby with `burstSeconds: 60`, advancing the timers by 60_000 puts the room in phase `consolidate` and broadcasts to every socket. A manual `advance` before expiry clears the pending timer, so it doesn't fire twice.
    - Implement it in `Room`:
      - After every state change, compare the old phase with the new one. When the new phase is `burst`, call `scheduleBurstTimeout()`.
      - The timeout applies the system command `advance` with `fromPhase: 'burst'` (actorId `'system'`). It's idempotent, thanks to Task 1.5.
      - When a room loads, call `scheduleBurstTimeout()` as well, to handle restarts.
  - Test: `bin/test server/rooms.test.ts`

- [ ] Task 2.5: Countdown hook (TDD)
  - File: `src/session/countdown.ts`, `src/session/countdown.test.ts`, `src/session/useCountdown.ts`
  - Change:
    - Tests first:
      - `secondsRemaining({endsAt, clockOffset, now})` returns `ceil((endsAt - (now + clockOffset)) / 1000)`, clamped at 0.
      - `formatClock(125)` returns `'2:05'`.
    - Implement both. `useCountdown(endsAt, clockOffset)` re-renders every 250 ms with `setInterval`.
  - Test: `bin/test src/session`

- [ ] Task 2.6: Burst screen (TDD)
  - File: `src/screens/Burst.tsx`, `src/screens/Burst.test.tsx`, `src/screens/SessionScreen.tsx`
  - Change:
    - Tests first (jsdom, with fake `view` and `send`):
      - The screen shows the challenge, the countdown and the viewer's own questions.
      - Typing a question and pressing Enter sends `submitQuestion` and clears the input.
      - The input is disabled when `secondsRemaining` is 0.
      - "I'm done" sends `markDone`.
      - The participant list shows names with question counts and a done marker, never question text.
    - Wire `Burst` into `SessionScreen`.
  - Test: `bin/test src`, then `bin/typecheck`

- [ ] Task 2.7: Manual verification
  - Test:
    1. Run `bin/dev` and create a session with a 1-minute burst. Join from two browsers and advance.
    2. Both countdowns match to within a second.
    3. Each browser sees only its own questions and the other person's count.
    4. At 0:00, input locks in both browsers and the phase becomes consolidate on its own (still the placeholder).
    5. Restart the server during a fresh burst. The countdown carries on, and the phase still advances on time.

- [ ] Commit Phase 2: `git add -A && git commit -m "Private timed burst with server-enforced lock and auto-advance"`

## Phase 3: AI grouping and collaborative consolidation

- [ ] Task 3.1: Require the API key in env (TDD)
  - File: `server/environment.ts`, `server/environment.test.ts`, `.env.example`, `README.md`
  - Change:
    - Tests first: a missing `ANTHROPIC_API_KEY` throws an `Error` whose message names `ANTHROPIC_API_KEY`, following `cbs-2026/server/environment.ts:19-24`. The returned config includes `anthropicApiKey`, and no error message ever includes the key's value.
    - Add `ANTHROPIC_API_KEY=` (empty) to `.env.example` and update the README. It must be an organization Anthropic key, kept in `.env`, never committed. Question text is sent only to Anthropic.
  - Test: `bin/test server/environment.test.ts`

- [ ] Task 3.2: Normalize grouping output (TDD)
  - File: `server/ai/normalize-groups.ts`, `server/ai/normalize-groups.test.ts`
  - Change:
    - Tests first for `normalizeGroups(drafts, questionIds)`. It takes `drafts: {label: string; questionIds: string[]}[]` and returns the same shape.
      - Unknown ids are dropped.
      - An id that appears in more than one group stays only in the first.
      - Groups left empty are dropped.
      - Ids missing from every group go into a final `{label: 'Ungrouped', …}` group, added only when there are missing ids.
      - Labels are trimmed; an empty label falls back to the first question's text, which is passed in through a text lookup.
    - Implement it.
  - Test: `bin/test server/ai`

- [ ] Task 3.3: `groupQuestions` with an injected LLM port (TDD)
  - File: `server/ai/group-questions.ts`, `server/ai/group-questions.test.ts`
  - Change:
    - Define `interface StructuredLlm { completeJson(request: {system: string; user: string; schema: object}): Promise<unknown> }`.
    - Tests first, with a fake `StructuredLlm`:
      - `groupQuestions(llm, {challenge, questions})` sends a user message that contains the challenge and every question as `{id, text}` JSON, and never `authorId`.
      - The schema is `{type:'object', properties:{groups:{type:'array', items:{type:'object', properties:{label:{type:'string'}, questionIds:{type:'array', items:{type:'string'}}}, required:['label','questionIds'], additionalProperties:false}}}, required:['groups'], additionalProperties:false}`.
      - The result passes through `normalizeGroups`.
      - When the LLM rejects, the call rejects too. The fallback lives in Task 3.6.
    - System prompt: "Group questions that ask essentially the same thing. Keep distinct questions in their own group. Label each group with one clear question that captures it."
  - Test: `bin/test server/ai`

- [ ] Task 3.4: Real Claude adapter
  - File: `server/ai/claude-client.ts`
  - Change:
    - **Load the `claude-api` skill first** and confirm the current structured-outputs request shape (`output_config.format` with `type: 'json_schema'`; see research.md "Semantic grouping with Claude") and how to read the response for the installed `@anthropic-ai/sdk` version.
    - Run `npm install @anthropic-ai/sdk`.
    - Implement `createClaudeLlm({apiKey, model = GROUPING_MODEL})`, which returns a `StructuredLlm`, with `export const GROUPING_MODEL = 'claude-haiku-5-5'`. This follows `cbs-2026/server/ai/anthropic-signer.ts:37-39` and `cbs-2026/server/ai/claude-client.ts:61`.
    - It parses the JSON text block, and throws if `stop_reason` is `max_tokens` or `refusal`.
    - Set `max_tokens` to 8000.
    - No unit test, since this is a thin adapter over the SDK. It's verified in Task 3.10.
  - Test: `bin/typecheck`

- [ ] Task 3.5: Consolidation state and the `groupingCompleted` system command (TDD)
  - File: `server/session/state.ts`, `server/session/reducer.ts`, `server/session/reducer.test.ts`
  - Change:
    - Tests first:
      - Entering `consolidate` sets `groupingStatus: 'pending'` and `groups: {}`.
      - The system command `{type:'groupingCompleted', groups: drafts}` creates groups with `ctx.newId()` ids and `version: 0`, and sets the status to `ready`. It's ignored unless the phase is `consolidate` and the status is `pending`.
      - `advance` from `consolidate` while grouping is `pending` is rejected with "Grouping in progress".
      - `singletonGroups(questions)` returns one draft per question, labeled with its text.
    - Define `SystemCommand` in `server/session/state.ts`. It is server-only, never in `shared/protocol.ts`.
  - Test: `bin/test server/session`

- [ ] Task 3.6: Room triggers grouping, with a fallback (TDD)
  - File: `server/rooms.ts`, `server/rooms.test.ts`, `server/app.ts`, `server/index.ts`
  - Change:
    - Tests first. Inject `group: (input) => Promise<GroupDraft[]>` into `createServer` and `RoomHub`.
      - When the room enters `consolidate`, it calls `group` once with the challenge and questions, then applies `groupingCompleted` and broadcasts.
      - If `group` rejects, the room applies `groupingCompleted` with `singletonGroups` and logs the error message, never the question text.
      - A room loaded with `consolidate`/`pending` re-triggers grouping.
    - Wire it up in `index.ts`: `group = (input) => groupQuestions(createClaudeLlm({apiKey}), input)`.
  - Test: `bin/test server`

- [ ] Task 3.7: `merge`, `split` and `reword` reducers (TDD)
  - File: `shared/protocol.ts`, `server/session/reducer.ts`, `server/session/reducer.test.ts`
  - Change: tests first, all only valid during `consolidate` with status `ready`, from a participant.
    - `merge`:
      - Appends the source's questionIds to the target, deletes the source and increments the target's version.
      - Rejected if either group is missing or if source equals target.
    - `split`:
      - Moves the question into a new group labeled with the question's text, and increments the old group's version.
      - Rejected if the question isn't in the group or the group has only one question.
    - `reword`:
      - Sets a trimmed label (1–280 characters) and increments the version.
      - Rejected with "Group changed, refresh" when `baseVersion !== version`.
  - Test: `bin/test server/session`

- [ ] Task 3.8: Consolidation projection (TDD)
  - File: `server/session/projection.ts`, `server/session/projection.test.ts`, `shared/protocol.ts`
  - Change:
    - Tests first: in `consolidate`, the view includes `groupingStatus` and `groups: [{id, label, version, questions: [{id, text}]}]`, sorted by label for stable display. `expectNoKey(view, 'authorId')` passes. `myQuestions` is empty outside `burst`.
    - Implement it.
  - Test: `bin/test server/session`

- [ ] Task 3.9: Consolidate screen (TDD)
  - File: `src/screens/Consolidate.tsx`, `src/components/QuestionGroup.tsx`, `src/screens/Consolidate.test.tsx`, `src/screens/SessionScreen.tsx`
  - Change:
    - Tests first (jsdom):
      - `pending` shows "Grouping similar questions…".
      - `ready` lists the groups with their questions.
      - Choosing a target in a group's "Merge into…" `<select>` sends `merge`.
      - A per-question "Split out" button (hidden when the group has one question) sends `split`.
      - Editing a label and blurring or pressing Enter sends `reword` with the group's current `version`.
      - The latest `lastRejection` shows as a dismissible notice.
    - Wire it into `SessionScreen`.
  - Test: `bin/test src`, then `bin/typecheck`

- [ ] Task 3.10: Manual verification with real Claude
  - Test:
    1. Copy `.env.example` to `.env` and add an Anthropic API key, then run `bin/dev`.
    2. Run a 1-minute burst in two browsers. A submits "Why do customers churn?" and "How do we price the product?". B submits "What makes clients leave us?".
    3. After the burst, the two churn questions share a group and pricing stands alone.
    4. Both browsers merge, split and reword at the same time and stay in sync.
    5. A stale reword shows the rejection notice.
    6. Temporarily set an invalid key and confirm the fallback gives one group per question.

- [ ] Commit Phase 3: `git add -A && git commit -m "Claude-assisted grouping and collaborative consolidation"`

## Phase 4: Dot voting and results

- [ ] Task 4.1: Vote reducers (TDD)
  - File: `shared/protocol.ts`, `server/session/state.ts`, `server/session/reducer.ts`, `server/session/reducer.test.ts`
  - Change:
    - Tests first, only valid during `vote` from a participant, with `VOTES_PER_PERSON = 3`:
      - `castVote` increments `votes[actor][groupId]`, and stacking on the same group is allowed.
      - A 4th vote is rejected with "No votes left".
      - A vote for an unknown group is rejected.
      - `removeVote` decrements, and is rejected at 0.
    - Initialize `votes: {}` in `createSession`.
  - Test: `bin/test server/session`

- [ ] Task 4.2: Results ranking (TDD)
  - File: `server/session/results.ts`, `server/session/results.test.ts`
  - Change:
    - Tests first: `rankResults(state)` returns `[{groupId, label, questions: [{id, text}], votes, rank}]` sorted by votes descending, then label ascending.
      - Ties share a rank, using competition ranking: votes 5, 5, 2 give ranks 1, 1, 3.
      - Groups with zero votes are included.
    - Implement it.
  - Test: `bin/test server/session/results.test.ts`

- [ ] Task 4.3: Vote and results projection hides tallies (TDD)
  - File: `server/session/projection.ts`, `server/session/projection.test.ts`, `shared/protocol.ts`
  - Change:
    - Tests first:
      - In `vote`, the view has `groups` (as in Task 3.8), the viewer's `myVotes: {[groupId]: n}`, `votesRemaining`, and `votersDone` (participants who used all 3 votes).
      - Other participants' votes and any totals are absent: assert that `JSON.stringify(view)` doesn't contain B's vote count pattern, and that there's no `results` key.
      - In `results`, the view includes `results: rankResults(state)` for every viewer, including a `null` spectator.
      - `expectNoKey(view, 'authorId')` passes in both phases.
  - Test: `bin/test server/session`

- [ ] Task 4.4: Vote screen (TDD)
  - File: `src/screens/Vote.tsx`, `src/screens/Vote.test.tsx`, `src/screens/SessionScreen.tsx`
  - Change:
    - Tests first (jsdom):
      - Each group shows its label, its questions, the viewer's own dot count, and "+" and "−" buttons that send `castVote` and `removeVote`.
      - "+" is disabled when `votesRemaining` is 0.
      - "−" is disabled when the viewer's count for that group is 0.
      - The header shows "N votes left" and "X of Y people done".
    - Wire it into `SessionScreen`.
  - Test: `bin/test src`

- [ ] Task 4.5: Results screen (TDD)
  - File: `src/screens/Results.tsx`, `src/screens/Results.test.tsx`, `src/screens/SessionScreen.tsx`
  - Change:
    - Tests first (jsdom): the screen shows the challenge and the ranked groups with their rank, label, vote count and constituent questions, in order. It has no advance control or editing controls.
    - In `SessionScreen`, the results phase renders `Results` even without a participantId. That makes the page view-only by link (D17).
  - Test: `bin/test src`, then `bin/typecheck`

- [ ] Task 4.6: End-to-end manual verification
  - Test:
    1. Run `bin/dev`. Do a full session in two browsers: create, join, burst, consolidate, vote, results.
    2. During voting, neither browser can see the other's votes. A 4th vote is blocked.
    3. Results rank correctly, and ties show a shared rank.
    4. Restart the server, then open the session link in a third, fresh private window. The results show without joining.
    5. `bin/test` and `bin/typecheck` both pass.

- [ ] Commit Phase 4: `git add -A && git commit -m "Dot voting with hidden tallies and persistent ranked results"`
