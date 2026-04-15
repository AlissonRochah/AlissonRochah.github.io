# Task — Integrate MAPRO into the MasterBot stack

You are a fresh Claude Code session. The user (Alisson) wants to integrate
his MAPRO PMS (`app.mapro.us`) into the existing MasterBot Chrome extension
+ GitHub Pages site. This file is your briefing. Read it all before touching
code. Ask before making decisions that this brief doesn't answer.

---

## Context you don't have yet

**Repo:** `/Users/alisson/Projects/extension-master/alissonrochah.github.io`
**Current branch:** `main` (the `chore/cleanup-and-docs` branch was just
merged via a PR, or will be — confirm with the user first).
**Start by reading the README.md in the repo root.** It maps the three
layers (site / extension / Supabase). Don't skip it.

**User profile (short):** alissonrochah@gmail.com, Portuguese (BR),
technical, runs Master Vacation Homes. Prefers direct no-fluff answers,
plan mode for non-trivial work, and strong verification before claiming
done. Don't use destructive git commands without asking. Follow the
project's CLAUDE.md + `~/.claude/CLAUDE.md` conventions (Discovery Protocol,
simplicity first, root-cause fixes).

---

## What MAPRO is

MAPRO is the PMS the user uses to run vacation rental operations
(reservations, cleaning, work orders, guests, owners, properties). It's a
Laravel/PHP webapp at `https://app.mapro.us`. Auth is **cookie-based session**
(no Bearer tokens, no API keys). When you're logged in at `app.mapro.us`,
the cookie lives in the browser cookie store and any request to the same
origin picks it up automatically.

**There's already a scraper project** at
`/Users/alisson/Projects/maproscrape/mapro-scraper/` that captured **857
real API calls** from MAPRO during a Playwright crawl. Look at:

- `output/api-calls/consolidated/endpoints.json` — 41 unique endpoints
  (list of paths)
- `output/api-calls/consolidated/api-map.json` — full structured map
- `output/api-calls/raw/0007-GET--manage--guests--list.json` — example raw
  capture showing headers, query params, and full response body

Every raw file has `request_headers`, `request_body`, `response_status`,
and `response_body`. This is your schema reference — no guessing needed.

**Key endpoints (from the consolidated list):**

- `/manage/guests/list?gridAjax&...` — guest directory (paginated)
- `/manage/cleaning/list` — cleaning schedule
- `/manage/work-orders/list` — work orders
- `/booking/check-reservation` — reservations
- `/quote/list` — quotes
- `/single-charge/list`, `/recurring-charge/list`, `/payout/list` — money
- `/api/internal/datasources/cleaning/load` — richer cleaning data
- `/api/internal/datasources/CompanyEmployees/load` — staff
- `/api/v2/grid_preferences/get/*` — UI preferences (not useful for you)

All responses are JSON. All authenticated by the session cookie (no token).

---

## What the user wants

The MasterBot Chrome extension (`extension/` in the repo) already does
customer-service work in the Airbnb hosting inbox: it matches the Airbnb
listing title against a resort list in Supabase and injects a Gate Code
button. The AI assistant page (`ai.html`) uses scraped conversations +
the matched resort to generate replies via Groq.

The user wants to **enrich the AI with live data from MAPRO**: when the
agent opens a conversation, besides the resort info, also pull:

- The guest's current/upcoming reservation from MAPRO
- The property's recent cleaning status
- Open work orders for the property
- Anything else the user says makes sense after you two discuss it

This context goes into the Groq prompt alongside the resort info so the
generated reply has real operational context.

---

## The hard constraint

**Cookies are browser-scoped.** The user uses MasterBot from **two
different browsers** (Chrome + another — probably Brave). A cookie set in
browser A isn't visible from browser B. The user does **not** want to run
a local server, and doesn't want to ship credentials to the cloud.

This drives the architecture: the extension must read the MAPRO cookie
from **whichever browser it's installed in** using `chrome.cookies` and
make requests from that browser. If the user isn't logged in, the
extension detects 401/redirect and shows "log into MAPRO first" — then the
user logs in once (cookie persists across browser restarts, weeks at a
time).

The user already confirmed he understands: "log in once in each browser,
no tab needs to stay open, cookies persist on disk." He's fine with this.

---

## Architectural shape

```
Airbnb conversation tab
          │
          ▼
  content.js (already exists) ──► chrome.storage (matched resort)
          │
          ▼
  ai.html (site)
  sends external message to extension
          │
          ▼
  background.js (service worker)
     ├── getMatchedResort (exists)
     ├── scrapeConversation (exists)
     └── mapro.getReservationByGuestName  ◄── NEW
     └── mapro.getCleaningForProperty     ◄── NEW
     └── mapro.getWorkOrdersForProperty   ◄── NEW
          │
          ▼
  extension/js/mapro-client.js (NEW)
  fetch('https://app.mapro.us/...') — cookies ride along automatically
  because host_permissions includes app.mapro.us
          │
          ▼
  MAPRO (session-authenticated)
```

**Why not call MAPRO from ai.html directly?** CORS + cookies. A GitHub
Pages page can't read cookies from another origin. The extension is the
only piece that can — and only because `host_permissions` grants it.

---

## What needs to change in the repo

### 1. `extension/manifest.json`
- Add `https://app.mapro.us/*` to `host_permissions`.
- Add `"cookies"` to `permissions` — needed for checking login state.

**DO NOT change `externally_connectable`.** The user explicitly said to
leave it alone.

### 2. `extension/js/mapro-client.js` (new file)
Thin wrapper around `fetch` for the endpoints you need. Pattern:

```js
const MAPRO_BASE = "https://app.mapro.us";

async function maproGet(path, params = {}) {
    const url = new URL(MAPRO_BASE + path);
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
        headers: {
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, text/javascript, */*; q=0.01",
        },
    });
    if (res.status === 401 || res.status === 302) {
        throw new Error("MAPRO_NOT_LOGGED_IN");
    }
    if (!res.ok) throw new Error(`MAPRO ${res.status}`);
    return res.json();
}
```

Then build specific helpers (`listGuests`, `listCleaning`, etc.) on top.
**Don't over-engineer.** The user values simplicity — start with the 2 or
3 endpoints you actually need, not all 41.

**Reference the raw captures** in `/Users/alisson/Projects/maproscrape/
mapro-scraper/output/api-calls/raw/` to see exactly what each endpoint
returns. Don't guess the shape.

### 3. `extension/background.js`
Add new action handlers inside the existing `onMessageExternal` listener:

```js
if (request.action === "mapro.listGuests") {
    // call mapro-client, return result
    return true; // async
}
```

Mirror the `scrapeConversation` pattern (async sendResponse).

### 4. `ai.html` / `js/ai.js`
When generating a reply, after getting the matched resort, also call the
extension for MAPRO context. Inject the response into the Groq system
prompt under a new section. The existing `formatResortSections` function
in `js/ai.js` is a good reference for how to serialize structured data
into prompt text.

### 5. Graceful degradation
If the user isn't logged into MAPRO (the client throws `MAPRO_NOT_LOGGED_IN`),
ai.html should show a small banner — "Log in to MAPRO for live reservation
context" — with a link that opens `app.mapro.us` in a new tab. AI pipeline
keeps working with just the resort info (current behavior).

---

## Things to NOT do

- **Don't touch `externally_connectable`** — user said leave it.
- **Don't store MAPRO credentials.** The extension reads the session
  cookie only; it never sees username/password.
- **Don't bundle supabase-js or any library.** The existing extension uses
  hand-rolled REST for a reason (MV3 CSP). Same rule applies here — plain
  `fetch`.
- **Don't push straight to main.** Work on a branch like
  `feature/mapro-integration` and hand off a PR at the end.
- **Don't invent endpoint shapes.** Every claim about what MAPRO returns
  should be backed by an actual capture in the raw/ folder.
- **Don't try to work around the two-browser cookie issue with a server.**
  The user rejected that. The `chrome.cookies` + `host_permissions`
  approach is the answer.

---

## Before you start

Ask the user:

1. **Which MAPRO endpoints matter most for his workflow?** (You have 41
   — he'll probably say 2–3.)
2. **Is the `main` branch clean?** (The cleanup PR may or may not be
   merged yet when you start.)
3. **What's the Airbnb → MAPRO link?** How does the extension know which
   MAPRO guest matches the Airbnb conversation? (Email? Name? Property?
   This is the key decision — without it you can't query MAPRO for the
   right data.)

Question 3 is the one you must not skip. Everything else flows from it.

---

## Useful files to read (in order)

1. `README.md` — the three layers
2. `extension/manifest.json` — current permissions
3. `extension/background.js` — current message relay pattern
4. `extension/js/api.js` — the hand-rolled Supabase client to mirror
5. `js/ai.js` — the Groq pipeline you'll be injecting into
6. `ai.html` — the site page that triggers all this
7. One or two raw captures from `maproscrape/mapro-scraper/output/
   api-calls/raw/` — to see the actual MAPRO response shape

---

## Success criteria

- User loads the Airbnb inbox, opens a conversation for a known guest
- ai.html opens, the AI generates a reply
- The reply references real MAPRO data (reservation dates, work order
  status, etc.) — not just the resort info card
- If the user isn't logged into MAPRO, the AI still works but shows a
  "connect MAPRO" banner
- Everything commits cleanly to a feature branch with atomic commits
- The user can review a PR before it merges
