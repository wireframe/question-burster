# Decisions: question-burst-app
Date: 2026-10-20

A collaborative web app based on Hal Gregersen's Question Burst. Each participant writes questions privately, so nobody is anchored by anyone else's. The group then consolidates similar questions with AI help and ranks the most important ones.

## D1: Audience
**Question:** Who is this app for?
**Depends on:** none
**Firmness:** Preference
**Options considered:**
- Internal company teams: enterprise SSO and internal hosting. External people can't join.
- External / client-facing: guest access and a public deployment. Much more security and compliance scope.
- Personal prototype: minimal auth and hosting. Real team use later means retrofitting.
**Chosen:** Personal prototype
**Rationale:** The goal is to test whether the idea works before investing further. If it does, revisit auth (D10), hosting (D14), and data handling for internal team use.

## D2: MVP scope principle
**Question:** How closely should the burst follow Gregersen's protocol? (The user's answer also set the overall scope direction.)
**Depends on:** D1
**Firmness:** Preference
**Options considered:**
- Core rules enforced: timer, questions-only nudges, emotional check-in and check-out.
- Strict / full protocol: hard validation, every step mandatory.
- Loose / inspired: private capture, minimal guardrails.
**Chosen:** Loose and inspired by the core rules, kept to a minimal MVP. More protocol features get layered in as follow-ups only if the MVP "hits the mark."
**Rationale:** The user's words: "loose feels like a good start, inspired by the core rules, but keep as a minimal MVP to test out the idea. layer in the additional things as follow-up if we hit the mark." The MVP leaves out the emotional check-in/out, question-mark validation, and the blocking of preambles and answers. These are candidates for later iterations.

## D3: Session mode
**Question:** How does a session run in time?
**Depends on:** D1
**Firmness:** Preference
**Options considered:**
- Live, facilitated: everyone joins at once and moves through a shared timed burst. Needs real-time sync.
- Asynchronous: each person contributes before a deadline. Loses the shared clock.
- Both: two flows, roughly double the lifecycle logic.
**Chosen:** Live, facilitated
**Rationale:** Closest to how the method is run in practice. Async could be added later if teams find scheduling a live session hard.

## D4: Group size
**Question:** How many contributors in a typical session?
**Depends on:** D1
**Firmness:** Preference
**Options considered:**
- Small team, 3–12: about 50–200 raw questions.
- Workshop, 12–50: 200–1,000+ questions. Needs heavy automation and filtering.
- Pairs, 2–3: dedup mostly unnecessary.
**Chosen:** Small team, 3–12
**Rationale:** Typical team problem-solving. Review UX and AI grouping are designed for around 200 questions at most. Workshop scale would need review filtering and clustering.

## D5: Similarity detection
**Question:** How should similar questions from different contributors be detected?
**Depends on:** D4
**Firmness:** Preference
**Options considered:**
- Semantic (AI) matching: an LLM or embeddings group questions by meaning and catch paraphrases. Needs an API key, and adds per-session cost and latency.
- Lexical / fuzzy text match: deterministic with no external service, but misses paraphrases.
- Manual only: tedious at this volume.
**Chosen:** Semantic (AI) matching
**Rationale:** Paraphrases are the most common kind of duplicate in a burst. Example: "Why do customers churn?" and "What makes clients leave us?" should be grouped, while "How do we price the product?" stays separate.

## D6: AI provider for similarity
**Question:** Which AI service performs semantic grouping? (Not asked. Derived from D5.)
**Depends on:** D5
**Firmness:** Preference
**Options considered:**
- Claude API on an organization account: keeps data with a single provider.
- Other providers: would add another data processor.
**Chosen:** Claude API (latest suitable Claude model), authenticated with an organization account
**Rationale:** My default, chosen to keep question data with a single provider, not stated by the user. Question text and the challenge prompt get sent to Anthropic. Sessions could involve sensitive internal topics, so the API key has to live in a hosted secret and never be committed. Whether to use an LLM prompt or embeddings with a similarity threshold is open (see Research).

## D7: Consolidation ownership
**Question:** Who has the final say when questions get consolidated?
**Depends on:** D5
**Firmness:** Preference
**Options considered:**
- Facilitator confirms: the host curates AI suggestions before ranking.
- Fully automatic: no human correction.
- Group curates together: everyone can merge and split.
**Chosen:** Everything visible to everyone, no permissions. Any participant can edit, merge, split, or reword groups.
**Rationale:** The user typed this as "visible to all, no permissioning built in right now," and "right now" marks it as a prototype simplification. AI groupings are suggestions that participants edit together. Because several people can edit at once, consolidation edits should show up live for everyone (my default, following from D3).

## D8: Ranking method
**Question:** How should the group rank consolidated questions?
**Depends on:** D7
**Firmness:** Preference
**Options considered:**
- Dot voting: a fixed number of votes per person. Simple, close to "pick your top 3."
- Score each question 1–5: rich data, but slow and tiring.
- Pick and order a top 3: weighted 3/2/1. More complex UI.
**Chosen:** Dot voting
**Rationale:** Simple and fast for an MVP. Weighted top-3 is the natural upgrade if the results need more nuance.

## D9: Votes per person
**Question:** How many dot votes does each person get?
**Depends on:** D8
**Firmness:** Preference
**Options considered:**
- Fixed 3, stacking allowed.
- Configurable per session.
- One per question, max 3, no stacking.
**Chosen:** Fixed 3 votes. A person can put more than one vote on the same question.
**Rationale:** Mirrors Gregersen's "top 3." Make it configurable if votes spread too thin or ties become common.

## D10: Joining a session
**Question:** How do participants join?
**Depends on:** D1
**Firmness:** Preference
**Options considered:**
- Link + display name: no accounts, fastest to test.
- Google SSO (company domain): verified identity, needs OAuth setup.
- Fully anonymous: no names, so nobody can see who has finished.
**Chosen:** Link + display name
**Rationale:** Fastest way to test with colleagues. Anyone with the link can join, which is acceptable for a prototype but not for sensitive topics. Switch to SSO if this moves to real internal use.

## D11: Phase control
**Question:** Who moves the session between phases (lobby → burst → consolidate → vote → results)?
**Depends on:** D3, D7
**Firmness:** Preference
**Options considered:**
- Session creator advances: one lightweight privilege.
- Anyone can advance: no special roles.
- Automatic transitions: the timer and vote completion drive phases.
**Chosen:** Anyone can advance
**Rationale:** Consistent with the no-permissions stance in D7. Accepted risk: one eager clicker can end a phase early for everyone. Reconsider if that happens in testing.

## D12: Vote visibility
**Question:** Can people see running vote counts during voting?
**Depends on:** D8
**Firmness:** Preference
**Options considered:**
- Hidden until voting ends: avoids bandwagon voting.
- Live tallies: more engaging, but early votes anchor later ones.
**Chosen:** Hidden until voting ends. Each person sees only their own votes.
**Rationale:** Extends the app's core anti-bias goal from the burst into voting.

## D13: Author attribution
**Question:** Should questions show who wrote them during review?
**Depends on:** D7, D8
**Firmness:** Preference
**Options considered:**
- Anonymous in review: vote on the question, not the person.
- Show authors: easier to clarify, but seniority skews votes.
- Reveal after results: may still cause self-censorship.
**Chosen:** Anonymous in review
**Rationale:** Reduces social influence and encourages bold questions. The app still needs to track per-participant completion for the lobby and burst, but question authorship isn't shown during consolidation or voting.

## D14: Hosting
**Question:** Where will the prototype run?
**Depends on:** D1, D3
**Firmness:** Preference
**Options considered:**
- Deployed to a simple host: colleagues join remotely, and the API key is stored as a hosted secret.
- Local only: no hosting work, but remote testing is awkward.
**Chosen:** Deployed to a simple host
**Rationale:** A real live session needs remote participants. The specific platform is open (see Research). It has to support real-time updates (D3, D7) and persistent storage (D17).
**Sequencing (user revision during /structure):** "local demo first step... remote hosting is a later step. should be fully functional before remote." The MVP is built and demoed locally with two browsers. Deployment comes after the app is fully working.

## D15: Challenge prompt
**Question:** Should a session start from a written challenge statement?
**Depends on:** D2
**Firmness:** Preference
**Options considered:**
- Required: shown during the burst and on results, and gives the AI context.
- Optional: risks scattered questions.
- None in app: results lose context.
**Chosen:** Required challenge prompt
**Rationale:** Gregersen treats framing the challenge as central to the method. It also gives the AI grouping in D5 the context it needs.

## D16: Burst timer
**Question:** How should the burst timer work?
**Depends on:** D2, D3
**Firmness:** Preference
**Options considered:**
- Configurable with a 4-minute default: shared countdown, input locks at zero.
- Fixed 4 minutes.
- No timer.
**Chosen:** Configurable when the session is created, default 4 minutes. A shared countdown locks input when time runs out.
**Rationale:** Keeps the time pressure that sets the method apart from ordinary brainstorming, which fits D2's "inspired by the core rules." Note: under D11 anyone can advance, so someone may still end the burst before the timer does.

## D17: Results persistence
**Question:** What happens to a session's results afterward?
**Depends on:** D8
**Firmness:** Preference
**Options considered:**
- Saved + copy/export as Markdown.
- Saved, view only.
- Ephemeral.
**Chosen:** Saved, view only. The session link keeps showing the ranked results and the challenge. No export.
**Rationale:** The user picked the leaner option over export. Copy-as-Markdown is an easy follow-up if people end up copying results by hand.

## D18: Tech stack
**Question:** Which language, framework, real-time mechanism, and datastore? (Not asked. The project directory is empty, so this is greenfield.)
**Depends on:** D3, D14, D17
**Firmness:** Preference
**Options considered:** (from research.md)
- Node (Express + ws) + SQLite on Fly.io with a Vite React client: matches cbs-2026's conventions and is portable. The room has to be built by hand, it costs about $2/month, and it runs as a single instance.
- Cloudflare Workers + Durable Objects: the room, SQLite, broadcasting and alarms are built in, and it's free. New runtime, highest lock-in.
- Convex: serialized mutations and reactive queries with no server to run. No room process, high lock-in.
**Chosen:** Node + Express + ws + SQLite (better-sqlite3) on Fly.io with a persistent volume, plus a Vite React client, laid out as `src/`, `server/`, `shared/` like cbs-2026.
**Rationale:** Resolved after research. It's the least new to learn and stays consistent with the user's existing TypeScript, Vitest and Claude SDK patterns. A server-authoritative room keeps authorship and tallies hidden (D12, D13). Revisit if scaling past a single instance ever matters.

## Research Focus Areas
- Confirm the repo is empty (greenfield) and that no existing scaffolding, `bin`/`scripts` tooling, or conventions apply. (D18)
- Pick a stack that supports real-time multi-user state (shared countdown, phase changes, live consolidation edits) and persistent storage, and deploys simply to a host that holds secrets. (D18, D14)
- Decide the semantic-grouping approach: a single LLM clustering prompt or embeddings plus a similarity threshold. Check which Claude API features and models fit about 200 short questions per session, including cost and latency. (D5, D6)
- Decide how concurrent edits to consolidation groups (merge, split, reword by any participant) get reconciled without lost updates. (D7)
- Decide how a merged group carries its constituent questions and their votes, and how anonymity is kept in the data the client receives during review. (D7, D12, D13)
