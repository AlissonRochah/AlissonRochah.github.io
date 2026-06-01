# Draft All Unread — Airbnb inbox batch drafting

**Date:** 2026-06-01
**Status:** Approved, implementing

## Goal

From the extension popup, draft replies for every unread Airbnb host
conversation in one shot. Show per-conversation status as a tiny colored dot
next to the guest's name in Airbnb's own inbox list. Opening a ready
conversation auto-inserts the draft into the composer. Never auto-sends.

This is a pure extension feature on `airbnb.com/hosting/messages`. No MAPRO, no
separate review page. The draft brain is the already-shipped
`POST /api/draft-adhoc` on `airbnb-app`.

## Flow

1. Operator opens the Airbnb host inbox, clicks the extension icon, clicks
   **"✦ Draft all unread (N)"** in the popup.
2. `background.js` calls Airbnb's `ViaductInboxData` GraphQL query with the
   built-in unread filter (browser session, same pattern as the existing
   single-thread fetch) → list of `{ numericId, title }` for unread threads.
3. Background drafts each thread (throttled, 3 concurrent) by reusing
   `draftAirbnbThread` → `/api/draft-adhoc`, writing status to
   `chrome.storage.local`.
4. The content script on the inbox page renders/updates a tiny colored dot
   next to each name, driven by `chrome.storage.onChanged`.
5. Opening a thread whose draft is ready auto-inserts it into the composer
   (reuses `findComposer` / `insertIntoComposer`).

## Components

### background.js
- `fetchUnreadInbox()` — GET `ViaductInboxData`
  (hash `3890d462940a5f123c9048c8d623d0ce5d5bc0d5e7072eefb2a46d4041d31a49`),
  variables include `threadTagFilters:[{userThreadTagName:"unread"}]`,
  `userId = btoa("Viewer:" + HOST_ACCOUNT_ID)`, `numRequestedThreads` raised to
  cover all unread. Headers match the existing `fetchAirbnbThread`. Decodes
  `inboxItems.edges[].node`: `id` (base64 `MessageThread:<numeric>`) +
  `inboxTitle.components[0].text`.
- `draftAllUnread()` — seeds every thread as `queued`, then runs a small
  concurrency pool (3). Per thread: mark `drafting`, call
  `draftAirbnbThread(numericId)`, store `ready` (or `review` when
  `needs_human`) with the draft text, or `failed` with the error.
- Message handler `{action:"draftAllUnread"}` → returns
  `{ ok, total }` immediately-ish (after enumeration); progress is observed via
  storage, so the popup can close.

### Storage (`chrome.storage.local`)
Single key `airbnbDrafts`: `{ [numericId]: { status, title, draft, needs_human,
error, ts } }`. `status ∈ queued | drafting | ready | review | failed`.
Inserted drafts get an `inserted: true` flag so re-renders don't re-insert.

### popup
Keep the existing single-thread button. Add **"✦ Draft all unread"**: verifies
the active tab is the host inbox, sends `draftAllUnread`, shows a short summary
("Drafting N…"). Dots update in the page whether or not the popup stays open.

### airbnb-claude.js (content script, inbox + thread)
- **Dots:** find row links via `a[href*="/messages/"]`, extract numericId from
  the href, look up status in `airbnbDrafts`, inject a ~7px dot next to the
  name. Colors: queued `#9CA3AF` · drafting `#F59E0B` (pulse) · ready `#10B981`
  · review `#F97316` · failed `#EF4444`. Re-apply on `storage.onChanged` and via
  a MutationObserver on the list container (SPA virtualizes rows).
- **Auto-insert:** poll `location.pathname` for the open thread id; when a
  ready/review draft exists for it and hasn't been inserted, wait for the
  composer (`findComposer`) and insert, then set `inserted`.

### manifest
Broaden the airbnb-claude match to `https://www.airbnb.com/hosting/messages*`
(covers the list page with no trailing id). Bump to 0.12.0.

## Risk / blind spots
The inbox **DOM** structure (row element, where the name sits) is not visible
from the dev environment. Row detection (`a[href*="/messages/"]`) and dot
placement are coded defensively and will likely need one tuning pass after a
live test on the logged-in machine.

## Out of scope
Mark-as-read, folder/filter handling, auto-send, pagination beyond one inbox
page of unread.
