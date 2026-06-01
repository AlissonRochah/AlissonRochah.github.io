# Airbnb Claude Reply — Design

**Date:** 2026-06-01
**Status:** Approved for planning

## Goal

Let Alisson draft Airbnb host replies with Claude **directly inside the Airbnb
web UI**, with no MAPRO in the loop. One click ("Draft all") reads every
unanswered thread through Airbnb's own internal API, drafts a reply for each
using the existing local `airbnb-app` brain, and caches it. When Alisson later
opens a guest conversation, the cached draft is auto-filled into the Airbnb
send box for him to review and send manually.

## Why this shape

The hard part (voice, house rules, em-dash ban, brevity, check-in timing,
corpus retrieval) **already exists** in `~/airbnb-app/server.py`
(`build_prompt` + `run_claude_draft`), and it drafts via the `claude -p` CLI —
free on Claude Max, no API cost, nothing leaves the Mac. Today that app finds
threads via MAPRO and sends via MAPRO. This project keeps the brain and swaps
the eyes/hands to the Airbnb site itself.

- **Reading** uses Airbnb's own internal GraphQL (the same calls the site makes
  with the logged-in session) — robust, gives clean JSON, zero MAPRO.
- **Drafting** reuses the local server via one new stateless endpoint.
- **Sending stays 100% manual** in the Airbnb UI — the extension only fills the
  textarea. This matches the always-review philosophy of the existing app.

## Components

### 1. Local server: new endpoint `POST /api/draft-adhoc` (`~/airbnb-app/server.py`)

Stateless. Independent of the existing MAPRO-backed session/queue endpoints
(those are untouched).

Request body (built by the extension from Airbnb API data):

```json
{
  "guest_name": "Nicole",
  "listing": "1075 OP LW",
  "reservation": { "checkin": "2026-07-22 16:00:00", "checkout": "2026-07-27 10:00:00" },
  "messages": [
    { "is_incoming": 1, "sender_name": "Nicole", "body": "What time is check-in?", "sent_on_utc": "2026-06-01 14:30:00" },
    { "is_incoming": 0, "sender_name": "Rodrigo (Master Vacation Homes)", "body": "...", "sent_on_utc": "2026-06-01 14:35:00" }
  ]
}
```

Handler:
1. Load knowledge base + style guide + (optional) corpus retrieval — reuse the
   same loaders the existing draft path uses.
2. Assemble a `prep` dict in the exact shape `build_prompt()` expects
   (`knowledge_base`, `style_guide`, `reservation`, `property_info`, `history`,
   `unanswered`, `retrieved_pairs`).
3. `run_claude_draft(prep)` → return `{ "draft": "<text>" }`.

`reservation` and `listing` are optional. `build_prompt` already degrades
gracefully when check-in/out are missing (shows `(missing)`), so the timing
block stays safe.

CORS: granted via the extension's `host_permissions` on `localhost:8787`
(background fetch bypasses CORS for granted hosts, same pattern used for MAPRO).

### 2. Airbnb internal API client (in extension `background.js`)

All GET, `https://www.airbnb.com/api/v3/...`, sent with the session cookies
plus the constant web headers observed in the HAR:
`x-airbnb-api-key: d306zoyjsyarp7ifhu67rjxn52tv0t20`,
`x-airbnb-graphql-platform: web`, `x-csrf-without-token: 1`,
`content-type: application/json`.

| Purpose | Operation | Notes |
|---|---|---|
| List unanswered threads | `ViaductInboxData` | `variables.threadTagFilters = [{userThreadTagName:"unread"}]`; paginate via `variables.beforeCursor`. |
| Full thread + messages | `ViaductGetThreadAndDataQuery` | `data.threadData.messages.edges[].node`; paginate `messages` for full history. |
| Lightweight freshness re-check | `GetInboxThreadById` | cheaper than full thread fetch. |
| Reservation check-in/out (optional) | `HostReservationDetailsQuery` | `checkInDate` / `checkOutDate` / `listingName`. |

Each operation is a persisted query: URL carries
`?operationName=...&variables=<urlencoded JSON>&extensions={persistedQuery:{version:1,sha256Hash:<hash>}}`.

**Field mapping (Airbnb → server payload):**
- `guest_name` ← `inboxTitle.components[].text` (or the GUEST participant's
  `enrichedParticipantInfo.name`).
- `listing` + dates ← parse `inboxDescription` ("Jul 22 – 27 · 1075 OP LW"),
  cheap and already in the list payload. Precise check-in/out times only via
  `HostReservationDetailsQuery` when the timing block needs them.
- `messages[]` ← `messages.edges[].node`: `body` = `contentPreview.content`,
  `sent_on_utc` = `createdAtMs` → UTC string,
  `is_incoming` = 1 when the message account's participant role is GUEST,
  0 when it's the host account (id `93929916`). Skip pure-system messages
  (`accountType` = `SERVICE` / `EXTERNAL_SERVICE`).
- Thread id: `node.id` is base64 of `MessageThread:<num>`; the `<num>` is the
  cache key and matches the thread id in the on-screen URL.

### 3. Extension UI (minimal popup)

The popup has just two controls:
- **Draft all** — kicks off the sweep.
- **Cancel** — aborts an in-progress sweep.

Plus a tiny progress readout ("12 / 40 drafted").

### 4. Sweep flow (Phase 2)

In `background.js`, on "Draft all":
1. Page through `ViaductInboxData` (unread filter) to collect pending threads.
2. For each thread (sequential, robust):
   a. Fetch full messages via `ViaductGetThreadAndDataQuery`.
   b. Build the payload, `POST /api/draft-adhoc`.
   c. Store in `chrome.storage.local` under key `airbnbDraftCache[<threadNum>]`
      = `{ draft, lastActivityMs, draftedAt }`, where `lastActivityMs` =
      `mostRecentInboxActivityAtMsFromROS` (the freshness signature).
   d. Push progress to the popup.
3. Cancel aborts the loop and any in-flight request.

### 5. Auto-fill on open (Phase 1 — the everyday driver)

New/extended content script on `airbnb.com/hosting/messages*`:
1. Detect the currently open thread id (from the URL) and the send composer
   (reuse `airbnb-slash.js` editable-detection + `insertReplacement`).
2. Look up `airbnbDraftCache[<threadNum>]`.
   - **Fresh** (cached `lastActivityMs` ≥ current thread's latest activity, via
     a quick `GetInboxThreadById` or the rendered DOM) **and composer empty** →
     insert the draft, with an unobtrusive marker line
     `✦ Claude draft — review before sending`.
   - **Stale** (guest messaged after the draft) → don't insert; show a small
     **Re-draft** button that re-runs draft for just this thread.
   - **No cache** → optionally show the per-thread **Draft with Claude** button
     (Phase 1 standalone trigger; also the fallback when sweep hasn't run).
3. Never auto-send. Never overwrite text Alisson already typed.

## Phasing

- **Phase 1 — per-thread:** internal-API client + `/api/draft-adhoc` + the
  on-open per-thread "Draft with Claude" button + insert into composer. This
  alone delivers daily value.
- **Phase 2 — sweep + cache + auto-fill:** "Draft all" popup, batch loop,
  `chrome.storage.local` cache, freshness check, auto-fill on open.

## Manifest changes

Add `http://localhost:8787/*` to `host_permissions`. Add the popup
(`action.default_popup`). Keep the existing Airbnb content-script entry; extend
or add a sibling script for the draft button + auto-fill.

## Degradation & risks

- **Local server down** → buttons show "start airbnb-app".
- **Persisted-query hashes rotate** on Airbnb client deploys → calls 404.
  v1 hardcodes the current hashes + api key; if Airbnb rotates them, the fix is
  to recapture and update the constants. (Future hardening: sniff the page's
  own requests to read the live hash/key.)
- **No dates in payload** → timing block degrades to `(missing)`, draft still
  produced.
- **Two Airbnb accounts (red/green):** scope is simply whichever account the
  browser profile is logged into; no in-extension account picker needed.

## Out of scope

- Auto-send.
- Running off Alisson's Mac.
- Anthropic API keys in the browser (the `claude -p` CLI brain is the only path).
- Any change to the existing MAPRO-backed endpoints or the current review UI.
