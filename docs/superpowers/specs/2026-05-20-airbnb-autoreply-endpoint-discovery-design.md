# Airbnb auto-reply — MAPRO endpoint discovery (sub-project 1)

**Status:** Discovered, documented. Ready for plan.
**Scope:** This spec catalogs the MAPRO inbox API surface that the auto-reply feature will consume. It does NOT design how those endpoints get wrapped in api-proxy, how the corpus is built, or how Claude drafts replies. Those belong to later sub-projects (the wrapping is implementation of sub-project 4, the corpus is sub-project 2, the drafting is 3).

## How these were discovered

Re-used the existing `maproscrape/mapro-scraper/` Playwright + network-interceptor harness. Alisson opened MAPRO inbox in the controlled Chromium, navigated through the messaging UI for ~4 minutes, and 40 XHR/fetch calls were captured.

The complete inbox endpoint list was confirmed by fetching MAPRO's chatapp JS bundle (`/static/inboxv1/assets/index.js?v1`) and grepping for `/api/inbox/` string literals — that gave the authoritative inventory the SPA actually uses.

Probe script (left in repo for future re-discovery): `maproscrape/mapro-scraper/probe_messages.py`.

## Architectural observations

- **No WebSocket.** MAPRO uses HTTP polling (`new_updates_since?ts=…` every few seconds), not WS. Initially suspected WS because we couldn't find a "fetch thread messages" endpoint in our capture; the real reason was IndexedDB caching plus my own truncated read of `refresh_reservation_state`.
- **Reservation context is embedded everywhere.** Every thread payload carries a full `reservation` sub-object with property, dates, status, Airbnb confirmation code, and guest contact. No separate booking lookup needed to draft a reply — saving multiple round-trips per message.
- **The inbox is small enough to ship whole.** `initial_state` returns 1000 threads (~the cap) in a single ~43k-line JSON. We don't need server-side pagination or filtering — Airbnb-only and unread filters happen client-side.
- **MAPRO never refetches historical messages by design.** The SPA stores message history in browser IndexedDB indefinitely. The server-side counterpart to "load a thread's history" is `refresh_reservation_state` — which returns the thread *plus* its messages.

## The seven inbox endpoints

All under `https://app.mapro.us` with the user's MAPRO session cookie.

### Reading

#### `GET /api/inbox/v1/initial_state`

Bootstrap call. Returns the entire thread list with metadata but no message bodies.

**Response shape (relevant pieces):**

```json
{
  "status": true,
  "tags": { /* template-tag dictionary, not relevant for auto-reply */ },
  "events": [
    { "datatype": "company", "id": "...", "name": "Master Vacation Homes", "timezone": "America/New_York" },
    { "datatype": "agent",   "id": "...", "name": "Alisson da Rocha", "kind": "user" },
    { "datatype": "agents",  /* 165 entries — team members */ },
    { "datatype": "preferences", /* user prefs */ },
    {
      "datatype": "thread",
      "thread_id": "01KQGP7MYMG7ZSZGF7N1K68Z5R",
      "reservation_id": "01KQGP7JVTXR7N76B32NAAG8CD",
      "communication_channel": "airbnb",
      "title": "Airbnb Guest",
      "preview": "I see that you canceled your reservation...",
      "checkout": "2026-06-08 10:00:00",
      "last_message_utc": "2026-05-20 21:31:31.000000",
      "num_unread_messages": 0,
      "guest_name": "Destiny Mackey",
      "reservation": {
        "r_id": "01KQGP7JVTXR7N76B32NAAG8CD",
        "r_crid": "6882491",
        "origin": "GRN/AIR (Green Airbnb)",
        "checkin": "2026-06-04 16:00:00",
        "checkout": "2026-06-08 10:00:00",
        "r_status": "cancelado",
        "r_channel_reservation_code": "HMEJZ4APAS",
        "p_title": "9 Bedrooms/ 5 Bathrooms/ Champions Gate (711 SS)",
        "p_resort": "Champions Gate",
        "p_address": "711 Sticks Street",
        "p_bedroom": "9", "p_bathroom": "5", "p_people": "23",
        "timezone": "America/New_York",
        "g_name": "Destiny Mackey",
        "g_telephone": "17865643415",
        "g_email": "stay+...@guests.quickconnect.rentals"
        /* ...more fields... */
      }
    },
    /* ...up to 1000 thread events... */
    { "datatype": "last_message_utc", "ts": "..." }
  ]
}
```

**Used for:** building the list of Airbnb-pending threads via the client-side filter `e.datatype === "thread" && e.communication_channel === "airbnb" && e.num_unread_messages > 0`.

#### `GET /api/inbox/v1/refresh_reservation_state?reservation_id=X`

Returns one thread (refreshed metadata) plus all its messages.

**Response shape:**

```json
{
  "status": true,
  "events": [
    { "datatype": "thread", /* same shape as in initial_state */ },
    {
      "datatype": "message",
      "msg_id": "01KRQ7RBA7G3RK5E53KXAF4167",
      "thread_id": "01KRN8JCZXJE33MTYF1F3ZWTQY",
      "sent_on_utc": "2026-05-16 01:52:13.000000",
      "read_on_utc": null,
      "is_incoming": 1,
      "sender_name": "Mary",
      "recipient_name": "Rodrigo Tavares",
      "body": "Hello Rodrigo,<br>We would like to have both the pool and the bbq for our stay...",
      "provider_sender_id": "11069312"
    }
    /* ...more message events... */
  ]
}
```

**Key fields:**

- `is_incoming`: `1` = from guest, `0` = from our team
- `sender_name` / `recipient_name`: human-readable; on outgoing messages, `sender_name` is which team member sent it (Rodrigo, Alisson, etc.) — useful for the corpus to know whose style to mimic
- `body`: HTML-formatted (uses `<br>` for newlines)
- `read_on_utc`: null until marked read

**Used for:** pulling the full conversation context to feed Claude when drafting a reply.

#### `GET /api/inbox/v1/new_updates_since?ts=YYYY-MM-DD%20HH:MM:SS.ffffff`

Polling endpoint. Returns events (threads + messages) created/updated since `ts`.

**Observed behavior:**

- Called every ~5s by the SPA with the latest `last_message_utc`
- When `ts=2020-01-01 00:00:00.000000` (probe), returned 274 events covering 20 distinct threads — confirms it's a recency-window cursor, not full-history rewind
- Same `message` event shape as in `refresh_reservation_state`

**Used for (v1):** Optional. Could check it once right before sending replies to make sure no new guest message came in between `initial_state` and the send (avoiding stepping on a fresh incoming). Defer this unless we see actual collisions.

#### `GET /api/inbox/v1/automatic_messages_by_reservation?reservation_id=X`

Returns scheduled automated outgoing templates queued for that reservation (e.g., "send check-in instructions at 0h-after-register"). NOT the conversation — purely the template queue.

**Used for:** likely irrelevant for v1. Maybe useful in v2 to avoid double-sending when an auto-template is about to fire.

### Writing

These three were found in the JS bundle but **not exercised** during this discovery (we deliberately didn't mutate MAPRO state). Their exact request shapes need a follow-up probe during sub-project 4 implementation.

#### `POST /api/inbox/v1/send_message`

The native send endpoint. We already have a working alternative path (`POST /api/messaging/post_sales_channel_message` wrapped by api-proxy's `sendChannelMessage`, shipped 2026-05-14 per [MasterBot↔MAPRO memory](../../../../.claude/projects/-Users-alisson-Projects/memory/project_masterbot_mapro_integration.md)).

**Decision:** keep using the existing `sendChannelMessage` path for v1. Reasons:
- Already debugged and shipped
- Reuses the existing api-proxy endpoint (no new server work)
- Migrating to `send_message` is a v2 tidy-up if it turns out to be simpler

#### `POST /api/inbox/v1/mark_thread_as_read`

Marks all messages in a thread as read.

**Used for:** call after a successful reply send, so the thread drops out of "pending" next time `/airbnb-process` runs.

**TBD:** exact request payload. Probe during sub-project 4 implementation.

#### `POST /api/inbox/v1/upcoming_message/pause/{id}`

Pauses a scheduled automated template.

**Used for:** not needed in v1. Listed for completeness.

## What this spec deliberately does NOT decide

- How these endpoints get wrapped in `api-proxy/api/mapro/` (Vercel routes, auth, error handling) — sub-project 4 implementation.
- How the historical corpus is built from `refresh_reservation_state` × 1000 threads — sub-project 2.
- How Claude turns thread + reservation context into a draft "in Alisson's voice" — sub-project 3.
- Whether to use the new `send_message` or stick with the existing wrapped `sendChannelMessage` for the long term — decided "stick with existing" for v1; revisit in v2.

## Open follow-ups (cheap, defer to implementation)

1. Probe `POST /api/inbox/v1/mark_thread_as_read` request body shape (with a real thread in a non-prod-impacting way, e.g., a thread that's already read).
2. Confirm `new_updates_since` cap / pagination behavior under different `ts` values (only relevant if we end up using it in v1).
3. Decide whether the auto-reply skips threads where `automatic_messages_by_reservation` has an `upcomingMessage` about to fire (avoid double-messaging).

## Acceptance criteria for this sub-project

This sub-project is a **discovery** deliverable, not code. It's "done" when:

1. ✅ All inbox endpoints used by MAPRO's chatapp are catalogued in this doc.
2. ✅ Request/response shapes for the read endpoints are documented from real captures.
3. ✅ The pending-thread signal is identified and validated (`num_unread_messages > 0` + `communication_channel === "airbnb"`).
4. ✅ The conversation-history endpoint is identified (`refresh_reservation_state`).
5. ✅ The probe scripts and captures are preserved in `maproscrape/` for re-running if MAPRO changes its API.
