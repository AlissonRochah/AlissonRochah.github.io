# Airbnb auto-reply — historical corpus (sub-project 2)

**Status:** Design approved, ready for plan.
**Scope:** How the historical (incoming, outgoing) message pairs from MAPRO are pulled, author-tagged, and persisted on Alisson's Mac so sub-project 3 can use them as few-shot/RAG fodder for drafting.

## Key constraints discovered during brainstorm

- Messages are sent directly via Airbnb, not MAPRO. The MAPRO `sender_name` field on outgoing messages reflects the connected Airbnb account (e.g., "Rodrigo Tavares" or "Master Vacation Homes LLC"), **not** the human who actually wrote the reply. Validated empirically: 18 captured outgoings showed only 2 distinct `sender_name` values but 6 distinct signature authors (Rodrigo, Renan, Paulo, Fernando, Azevedo, plus "Master Vacation Homes" template sign-offs).
- The signature at the bottom of the message body is the only reliable author signal.
- Alisson's signature patterns: `Regards`, `Best`, `Thank You`, `Best Regards` — sometimes typo'd (`Regars`, etc.) — followed by `Alisson` on the next line.

## Design

### Pair format

For each outgoing message in a thread, emit one record:

```json
{
  "thread_id": "...",
  "reservation_id": "...",
  "channel": "airbnb",
  "guest_question": "<plain text of the most recent incoming before this reply, or null if none>",
  "team_reply": "<plain text of the outgoing reply, signature stripped>",
  "reply_sent_utc": "2026-05-16 01:52:13",
  "author": "alisson | rodrigo | renan | paulo | fernando | azevedo | team | unknown",
  "is_template": true | false,
  "reservation_context": {
    "p_title": "...", "p_resort": "...",
    "checkin": "...", "checkout": "...",
    "r_status": "...", "r_channel_reservation_code": "..."
  }
}
```

HTML stripping: convert `<br>` and `<p>` to `\n`, drop other tags. Preserve URLs.

### Author extraction (hybrid)

1. **Regex pass** — `/(Regards?|Regars|Best( Regards)?|Thank\s*You),?\s*\n+(Alisson|Rodrigo|Renan|Paulo|Fernando|Azevedo)\b/i`. Also accept the bare name on the last non-empty line if it matches the known-author set.
2. **Template detection** — if the body contains 2+ of these markers: `WIFI NETWORK:`, `WIFI PASSWORD:`, `GATE CODE:`, `CHECK-IN INFORMATION`, `DOOR CODE:` → `is_template = true, author = "team"`. Templates are kept in the corpus but flagged so sub-project 3 can deprioritize them as style examples (they're form letters, not personal voice).
3. **LLM fallback** — for messages where regex didn't match and template markers aren't present, ask Claude (one-shot, JSON output) to classify `{author, is_template}`. Expected to hit ~5-10% of messages.
4. **Unknown** — if even the LLM can't determine, mark `author = "unknown"`. Still kept (might be useful as "company replies in general" examples).

The first incoming message before the outgoing becomes `guest_question`. If multiple incoming messages stacked before a reply, concatenate them in chronological order (the team answer addresses the whole batch).

### Storage

`~/.airbnb-corpus/` directory:

- `pairs.jsonl` — one record per line, append-only
- `threads_seen.json` — `{thread_id: last_message_utc_processed}` cursor for incremental sync
- `sync.log` — one line per sync run with counts (threads scanned, pairs added, LLM fallback used, errors)

JSONL chosen over single JSON for append-friendliness and easy `grep`/`jq` filtering by author or keyword.

### Sync pipeline

New slash command `~/.claude/commands/airbnb-sync-corpus.md`:

1. `GET /api/inbox/v1/initial_state` via api-proxy → all 1000 threads + their `last_message_utc`
2. Diff against `threads_seen.json` to find new or updated thread IDs
3. For each, `GET /api/inbox/v1/refresh_reservation_state?reservation_id=X` → thread + all its messages
4. Walk messages chronologically, emit `(guest_question, team_reply)` pairs for each outgoing
5. Run author extraction on each pair
6. Append to `pairs.jsonl`, update `threads_seen.json`, log to `sync.log`

Throttle: 200ms between `refresh_reservation_state` calls to avoid 429. First-run estimate: ~1000 threads × 200ms = ~3-4 min, plus LLM fallback time.

Resumability: cursor updates per-thread, so a crashed sync resumes where it left off.

### Why a separate command (not auto-run inside `/airbnb-process`)

- First sync is slow (~10+ min including LLM fallback). Don't surprise the user with it inside the "press one button" flow.
- Subsequent syncs are fast but still meaningless work if nothing changed.
- Explicit `/airbnb-sync-corpus` makes the action observable (user knows when corpus is being touched).

## Out of scope (deferred to other sub-projects)

- How sub-project 3 reads `pairs.jsonl` to draft replies (filter by author, similarity-rank by `guest_question`, build few-shot prompt) — sub-project 3 spec.
- Pulling read endpoints into api-proxy as proper Vercel routes — sub-project 4 implementation will wrap `initial_state` and `refresh_reservation_state` once.
- Embedding-based similarity / vector search. v1 uses keyword overlap; embeddings are a v2 optimization if needed.

## Acceptance criteria

1. Running `/airbnb-sync-corpus` for the first time populates `~/.airbnb-corpus/pairs.jsonl` with one record per outgoing message across all Airbnb threads.
2. ≥90% of records have a non-`unknown` author (regex + LLM fallback combined).
3. Templates are correctly flagged (`is_template = true`) — spot-check 20 random records.
4. Re-running `/airbnb-sync-corpus` immediately after completes in <30s with zero new records (cursor works).
5. After 1 new guest reply happens in MAPRO, re-running `/airbnb-sync-corpus` adds exactly the new pair(s) for that thread.
