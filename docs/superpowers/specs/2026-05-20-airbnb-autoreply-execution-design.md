# Airbnb auto-reply — execution architecture (sub-project 5)

**Status:** Design approved, ready for plan.
**Scope:** This spec covers ONLY *how* Claude runs to process pending Airbnb messages — the trigger mechanism, where it lives, and the invocation contract. It does NOT cover endpoint discovery (sub-project 1), corpus collection (2), style mimicking (3), or the loop/UI details (4).

## Context

Alisson wants a "press one button → Claude reads all pending Airbnb messages, replies to the ones it can handle in his voice, and queues the rest for him to deal with." The send-side already ships: `POST /api/mapro/send-message` in the Vercel api-proxy delivers a body to an Airbnb thread end-to-end (discovered via `maproscrape`, shipped 2026-05-14, see [project_masterbot_mapro_integration](../../../../.claude/projects/-Users-alisson-Projects/memory/project_masterbot_mapro_integration.md)).

**Hard constraint:** Claude must run on the Claude Code subscription, not the Anthropic API. Anything that requires backend-hosted LLM calls is out.

## Decision

A **slash command in interactive Claude Code**, run from the user's Mac terminal.

- **Path:** `~/.claude/commands/airbnb-process.md` (global, not project-scoped)
- **Invocation:** `/airbnb-process` (no args in v1)
- **Mode:** Always-review — Claude drafts every reply, presents one-by-one in chat, user approves/edits/skips, then Claude sends approved drafts via the existing api-proxy endpoint
- **Runtime:** A normal Claude Code session. No headless `claude -p`, no local agent, no extension changes, no cron.

### Why this and not the alternatives

| Option | Why rejected |
|--------|--------------|
| Button in `units.html` → local Mac agent → `claude -p` | Extra moving piece (local server) for marginal benefit; Claude runs unobserved → review becomes a second hop anyway. |
| Cron + queue file + separate `/airbnb-review` | Premature — there's no track record on draft quality yet. Background drafting is wasted work until the style is calibrated. Easy to evolve into this from the chosen design. |
| Confidence-gated auto-send (v1) | LLM confidence is unreliable; one wrong message can burn a guest. The 30s/batch of always-review is the right trade for v1. |
| Project-scoped command at `MasterBot/.claude/commands/` | Forces `cd` before use, and the command isn't really "feature code" of MasterBot — it's a personal tool that happens to call MasterBot infra. |

## Invocation contract

When the user runs `/airbnb-process` in Claude Code:

1. Claude calls api-proxy to **fetch the list of pending Airbnb threads** (endpoint TBD — sub-project 1).
2. For each thread, Claude calls api-proxy to **fetch full thread history** (endpoint TBD — sub-project 1).
3. Claude **drafts a reply** for each thread using the style/corpus mechanism (sub-project 3).
4. Claude presents drafts to the user **one at a time in chat**, format:
   ```
   [Thread N/M] Guest: <name> — Property: <unit>
   Last message: "<original text>"
   My draft: "<draft text>"
   Why: <1-2 sentences on the reasoning / which examples shaped this>

   Approve / edit / skip?
   ```
5. User responds with `approve`, an edited version, or `skip` (with optional reason for the queue).
6. After all drafts are reviewed, Claude **sends the approved ones** in a single pass via `POST /api/mapro/send-message`, reporting per-thread success/failure.
7. Skipped threads land in a local queue file (`~/.airbnb-skipped.json`) with timestamp + reason — so Alisson has a paper trail of what needed human action.

## Tool/permission requirements

- **Bash** with `curl` (to call api-proxy) — already allowed
- **Read/Write** on `~/.airbnb-skipped.json` — needs no special permission
- **Authentication:** api-proxy uses Firebase bearer tokens (`requireFirebaseUser` in `api-proxy/api/_lib/auth.js`). The slash command needs a fresh ID token at call time. **Mechanism TBD in implementation plan** — likely options: (a) a long-lived refresh token in a `.env` file the command reads, or (b) a small `~/.claude/scripts/mapro-token.sh` that mints a fresh token from stored credentials. This is an implementation detail, not an architecture decision.

## What this spec deliberately does NOT decide

These belong to other sub-projects and will be specced separately:

- **Sub-project 1 — Read endpoints:** What does "list pending threads" look like in MAPRO? How does "fetch thread history" work? Discovered via the `maproscrape` capture method, then added to `api-proxy/api/mapro/`.
- **Sub-project 2 — Corpus collection:** How are historical conversations pulled and stored? In what format?
- **Sub-project 3 — Style mimicking:** How does Claude write "like Alisson"? Few-shot from corpus, written style guide, RAG by similarity, or some mix.
- **Sub-project 4 — Loop & UI polish:** Exact chat format, edit interactions, batch summary at the end, how `~/.airbnb-skipped.json` gets consumed afterward.

Sub-project 1 is the next blocker — none of the others can start without read endpoints.

## Acceptance criteria for this sub-project

1. File `~/.claude/commands/airbnb-process.md` exists and is invokable.
2. Running `/airbnb-process` produces a Claude Code session that calls api-proxy endpoints (even if those endpoints are stubs in v1).
3. Authentication to api-proxy works end-to-end (slash command can hit a protected endpoint and get a 200).
4. The session prompts the user for approve/edit/skip per draft and only sends approved ones.
5. Skipped drafts are recorded in `~/.airbnb-skipped.json`.

(The "draft quality" itself is judged in sub-project 3, not here.)
