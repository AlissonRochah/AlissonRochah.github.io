# Airbnb auto-reply — drafting & style mimicking (sub-project 3)

**Status:** Design approved, ready for plan.
**Scope:** How Claude, running inside the `/airbnb-process` slash command, turns one pending Airbnb thread + the corpus into a draft reply in Alisson's voice. Excludes the surrounding loop (sub-project 4) and the endpoints (sub-project 1).

## Inputs available at draft time

- The pending thread, fetched via `refresh_reservation_state?reservation_id=X`: full message history + embedded reservation context.
- The corpus: `~/.airbnb-corpus/pairs.jsonl` (sub-project 2).
- A hand-edited style guide: `~/.airbnb-style.md`. Starts with a minimal stub; Alisson appends rules as he notices Claude drift.

## Retrieval

Pick 5 examples from the corpus to use as few-shot. Method:

1. Parse the new guest question (most recent incoming, signature/quoted-history stripped).
2. Score every pair in `pairs.jsonl` by keyword overlap (BM25-lite) between the pair's `guest_question` and the new question.
3. Re-rank: ties broken by `author == "alisson"` > other named authors > `team` > `unknown`. Templates (`is_template: true`) get a hard score penalty so they don't drown out personal voice.
4. Take top 5.

Pure Python/JS, runs inside the Claude Code session via Bash. No embedding API, no vector store.

If keyword overlap returns < 3 results above a minimum score, fall back to "5 most recent author=alisson pairs" so we always have voice examples. Document this fallback in `sync.log` for visibility.

## Style guide (`~/.airbnb-style.md`)

Initial stub:

```markdown
# Reply style — Alisson, Master Vacation Homes

- Open with first name of the guest ("Hi Destiny,").
- Close with "Regards,\nAlisson" (or "Best,\nAlisson" — both are fine).
- Keep it short. 2-4 sentences when possible. No marketing fluff.
- If you don't know the property-specific answer (door code, gate code, BBQ password), say so and offer to check, rather than guessing.
- Currency is USD. Use ($35/day) not (USD 35/day).
```

Alisson edits this file directly when he wants a rule baked in. Sub-project 3 implementation just `Read`s it and pastes it into the system prompt — no parsing.

## Prompt structure (built by the slash command per thread)

```
[System]
You are drafting an Airbnb reply on behalf of Alisson da Rocha, owner at
Master Vacation Homes. The reply will be sent to the guest as-is unless
Alisson edits it. Match his voice using the style guide and the past
examples below.

<style-guide>
{contents of ~/.airbnb-style.md}
</style-guide>

[User]
PROPERTY
{p_title} — {p_resort}, {p_address}
{p_bedroom} BR / {p_bathroom} BA, sleeps {p_people}

RESERVATION
Guest: {g_name}
Check-in: {checkin}    Check-out: {checkout}
Status: {r_status}
Channel: {origin} (Airbnb code {r_channel_reservation_code})

THREAD HISTORY (oldest → newest)
[guest @ 2026-05-15 10:32] hello! is pool heat available?
[alisson @ 2026-05-15 10:45] Hi Mary! Yes, it's $35/day...
[guest @ 2026-05-16 01:52] great, can you add it for the whole stay?

NEW GUEST MESSAGE TO REPLY TO
{the unanswered incoming(s)}

SIMILAR PAST EXCHANGES (use these to match voice; do not copy verbatim)
1. [author: alisson] When guest asked "...", you replied: "..."
2. [author: alisson] When guest asked "...", you replied: "..."
3. [author: rodrigo] When guest asked "...", team replied: "..."
4. ...

Return JSON:
{
  "draft": "<the reply, ready to send>",
  "confidence": 1-5,
  "reasoning": "<1-2 sentences: which example most shaped the draft, why this tone>",
  "needs_human": <true if critical info missing (discounts, custom pricing, complaints, refund requests), else false>
}
```

Confidence is used only to **order the review queue** (high-confidence first so Alisson clears the easy ones fast; low-confidence and `needs_human=true` come last for careful attention). Auto-send is not gated by confidence in v1 (per sub-project 5: always-review).

## Drafting flow inside `/airbnb-process`

For each pending thread (sub-project 4 will drive the loop):

1. Read `~/.airbnb-corpus/pairs.jsonl` (in-memory load — ~5MB, fast).
2. Read `~/.airbnb-style.md`.
3. Call `refresh_reservation_state` for the thread → thread + messages.
4. Run keyword overlap → top 5 pairs.
5. Build the prompt above.
6. Draft inline (Claude is the one doing this — no separate `claude -p` invocation; just a normal reasoning step in the session).
7. Yield the result to sub-project 4's review UI.

## Out of scope

- Embedding-based retrieval — v2 if keyword overlap proves insufficient.
- Auto-deriving the style guide from the corpus — v2.
- Multi-turn drafting (where Claude proposes, Alisson asks for revision, Claude redrafts) — v1 supports `edit` in the review step instead (sub-project 4).
- Confidence-based auto-send — explicitly rejected in sub-project 5 for v1.

## Acceptance criteria

1. Given a real pending thread, Claude produces a draft that uses the guest's first name, ends with one of Alisson's standard sign-offs, and addresses the actual question (spot-check 10 cases).
2. The top-5 retrieval contains at least one `author=alisson` pair when the corpus has 20+ Alisson examples for a related topic.
3. `needs_human=true` correctly fires on test cases involving: refund requests, discount asks, complaints, or custom pricing — spot-check 5 fabricated examples.
4. Style guide changes (e.g., adding "always confirm gate code before sending check-in info") take effect on the next draft without code changes.
