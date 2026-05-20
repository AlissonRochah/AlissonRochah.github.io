# Airbnb auto-reply — loop & review UI (sub-project 4)

**Status:** Design approved, ready for plan.
**Scope:** How `/airbnb-process` orchestrates a batch of pending Airbnb threads end-to-end: fetch → draft → review → send → report. Most architectural decisions came from sub-projects 1, 2, 3, 5; this spec nails the surface the user sees and the edge cases.

## End-to-end flow

1. **Batch fetch**
   - Call api-proxy → `initial_state` → filter `communication_channel == "airbnb" && num_unread_messages > 0` → list of pending thread IDs.
   - For each, call `refresh_reservation_state` → full thread + messages + reservation.

2. **Per-thread prep**
   - From the thread's messages, split into `history` (everything up to and including the last team outgoing) and `unanswered` (every incoming after that).
   - If `unanswered` is empty (shouldn't happen given the filter, but defensive): skip with reason `no unanswered incomings despite unread count`.
   - Run drafting (sub-project 3) → JSON with `draft`, `confidence`, `reasoning`, `needs_human`.

3. **Order the queue**
   - Sort drafts: `needs_human=false` first, then by `confidence` descending. `needs_human=true` always last. Tie-break: oldest unanswered message first (don't keep guests waiting longer).

4. **Batch summary**
   - Print one-liner: `12 Airbnb pending — 8 confident (≥4), 3 medium (2-3), 1 needs_human. Reviewing in that order. Type "ok" to start.`
   - Wait for `ok` (or `pular tudo` to abort upfront).

5. **Per-thread review (one at a time)**

   Format shown to the user:
   ```
   Thread 3/12 — Mary Alphs · 711 Sticks Street (Champions Gate)
   Check-in 2026-05-20 → Check-out 2026-05-22 · status: aprovado
   ─────────────────────────────────────────────────────────────
   Our last (May 15 14:32): "...do you want to add the BBQ for $75?"

   Guest (3 msgs, oldest 1h ago):
     15:01: yes please!
     15:02: also can you confirm checkin time
     15:10: sorry one more thing - is parking free?

   Draft (conf 4/5 — drew on threads 9c2…, 445a…):
     Hi Mary! BBQ added — I'll send the payment link next. Check-in is
     from 4pm on May 20. Yes, parking is free for 2 vehicles.
     Regards, Alisson

   [ok | <edit inline> | skip <motivo> | pular tudo]
   ```

   User responses:
   - `ok` → mark approved, queue for send
   - any other text → treat as edited draft, queue with the edited body
   - `skip <reason>` → mark skipped, add reason to the skip-queue
   - `pular tudo` → abort the batch immediately (jump to step 7 with what's collected so far)

6. **Batch send (only after review completes naturally)**
   - For each approved draft (in original order):
     - `POST /api/mapro/send-message` (existing api-proxy endpoint, per sub-project 1)
     - On success: `POST /api/inbox/v1/mark_thread_as_read` for that thread (via api-proxy wrapper to be added in implementation)
     - On failure: capture error, continue with the rest
   - Send happens sequentially with 500ms throttle to be safe with MAPRO rate limits.

7. **Final report**
   ```
   Done.
     ✓ Sent: 8
     ✗ Failed: 1 (Mary Alphs — 500 from /send-message; full error in /tmp/airbnb-process-2026-05-20T18-44.log)
     ⊘ Skipped: 3 (logged to ~/.airbnb-skipped.json)
     ↩ Aborted before send: 0
   ```

## Edge cases

### Interrupted mid-batch
If user types `pular tudo` or Ctrl+C during review, **nothing is sent**. Drafts already approved stay un-sent. Reasoning: half-sent batches are confusing; an explicit "I'm done reviewing, send them all" gate is safer than a "we tried to be helpful" leakage. Approved-but-unsent drafts are dumped to `/tmp/airbnb-process-<ts>-pending.json` so the user can decide what to do.

### Thread state changed during the batch
Between the initial `refresh_reservation_state` and the eventual `send`, the guest might send another message or someone else on the team might reply. v1 doesn't try to detect this — we send the draft as-is. The race window is small (minutes), and the cost of a slightly off-context reply is lower than the complexity of re-fetching state per send. Revisit if it becomes a real problem.

### Send failure
Per-thread failures don't abort the rest. The failed thread is reported, and `mark_thread_as_read` is NOT called (so it stays in the pending queue for the next run).

### `mark_thread_as_read` request shape unknown
Flagged in sub-project 1 as a follow-up. During implementation: probe with a thread that's already read (so marking it again is a no-op), capture the request, then wire it up. If the probe fails, ship without mark-as-read in v1 — the cost is just that responded threads show up as "still pending" until the guest reads our reply (which clears `num_unread_messages` server-side anyway via MAPRO's own sync).

### No pending threads
Print `Nada na fila. Tudo respondido.` and exit.

### Corpus missing
If `~/.airbnb-corpus/pairs.jsonl` doesn't exist, print:
```
Corpus não existe ainda. Roda /airbnb-sync-corpus primeiro
(leva ~10-15 min na primeira vez).
```
and exit.

## Out of scope

- Real-time progress bars / TUI animations. Plain text updates are enough.
- Resuming an interrupted batch. v1 just re-runs `/airbnb-process` — same threads will reappear since they weren't marked read.
- Notifications (e.g., desktop ping when batch is done). Sessions are short; user is already at the terminal.

## Acceptance criteria

1. Running `/airbnb-process` on a fresh inbox with 0 pending prints "Nada na fila" and exits cleanly.
2. With N pending threads, drafts are presented in `needs_human=false`/high-confidence-first order, oldest first within ties.
3. `ok`, edit, `skip <reason>`, and `pular tudo` all work as specified.
4. `pular tudo` mid-batch sends zero messages and writes pending-drafts to `/tmp/`.
5. Per-thread send failure does not abort the rest of the batch.
6. After a successful send, that thread does not appear in the next `/airbnb-process` run (assuming `mark_thread_as_read` is wired; if not, document the known v1 limitation).
7. Skipped threads land in `~/.airbnb-skipped.json` with timestamp, thread_id, guest_name, draft (so the user can revisit later), and reason.
