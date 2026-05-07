# MasterBot

Internal dashboard used by Master Vacation Homes to manage Airbnb messaging templates, on-the-day cleaning/heating jobs, and the resulting MAPRO booking notes — all from a single browser tab and the user's own Brave/Chrome session.

Live at <https://alissonrochah.github.io/>.

## How the pieces fit together

```
┌────────────────┐    ┌──────────────────────┐    ┌────────────────────┐
│  Pages (here)  │ →  │  MasterBot Bridge    │ →  │  Jobber + MAPRO    │
│  GitHub Pages  │    │  Browser extension   │    │  (user's session)  │
└────────────────┘    └──────────────────────┘    └────────────────────┘
       │                                                     ↑
       └──────── api-proxy (Vercel) ─── shared MAPRO admin ──┘
                       (read-only data: units list, stays)
```

Three layers of code live in this repo:

| Layer | What it does | Where |
|---|---|---|
| **Pages** | Login, message templates, units dashboard, settings | `*.html`, `style/`, `js/` |
| **Extension** | Bridges the pages with the user's logged-in Jobber and MAPRO sessions for write actions (create job, add note, add service) | `extension/` |
| **API proxy** | Read-only Vercel functions that fetch shared MAPRO data (units catalog, stays per booking) using a single admin cookie | `api-proxy/` |

## Pages

| Page | What it does |
|---|---|
| `index.html` | Firebase email/password login |
| `messages.html` | Pick from saved message templates and copy-paste into Airbnb |
| `template.html` | CRUD for those templates (categories, drag-to-reorder, import/export) |
| `units.html` | The day's calendar: shows each unit's stays, lets you create BBQ / Pool Heat / Deliver-Pickup jobs in Jobber, then auto-link them to the right MAPRO booking and add the matching service |
| `settings.html` | Per-user signature/greeting setup, plus admin-only user management |

Authentication is Firebase. User-specific config (signatures, categories, favorites) lives in Firestore under `settings/{uid}`. Shared admin data (user creation) checks `isAdmin` on the same doc.

Shared front-end code under `js/`:

- `js/firebase.js` — single source of truth for the Firebase config + `app`/`auth`/`db` exports
- `js/toast.js` — `showToast(message, type)` helper
- `js/theme.js` — applies saved dark/light theme before paint to avoid the flash

## Extension — MasterBot Bridge

`extension/` is a Manifest V3 extension that runs the user's own Jobber and MAPRO sessions on behalf of the units page. It only acts as a transport — nothing is stored.

What it exposes via `chrome.runtime.onMessageExternal`:

- `jobber-query` — runs a GraphQL query against `secure.getjobber.com`
- `mapro-add-comment` — posts a note to a MAPRO booking
- `mapro-add-service` — opens the booking page in a background tab and walks through MAPRO's own UI (call `add_service`, select the right service from the dropdown, fill dates if needed, click Save). Detects success by hooking `XMLHttpRequest` and watching for the `/ajax?booking-reservar` JSON response.
- `mapro-list-services` — same kind of background-tab probe, returns the list of services already on the booking (used by the BBQ duplicate warning)

The host page (`units.html`) only knows the extension ID — the entire MAPRO/Jobber flow is opaque to it.

To install for development: `chrome://extensions` → developer mode → "Load unpacked" → pick `extension/`.

A zipped build (`extension.zip`) is regenerated automatically by `.github/workflows/build-extension-zip.yml` on every push that touches `extension/`.

## API proxy

`api-proxy/` is a tiny Vercel deployment with a few endpoints under `/api/mapro/*`:

- `units` — full list of units (catalog)
- `unit-stays?key={ulid}&date={YYYY-MM-DD}` — Previous/Active/Next stays around a date
- `unit-address?id={mapro_id}` — full address

These all use a single shared MAPRO admin cookie kept in Upstash KV. They're read-only — anything that *writes* to MAPRO goes through the extension on the user's own session.

Admin endpoint:

- `POST /api/admin/mapro-cookie` — uploads a fresh MAPRO `SID` cookie when the previous one expires. Requires a Firebase auth token from a user with `isAdmin: true`. No UI for it; you `curl` it manually.

## Local development

1. **Pages** — there's no build step. Open `index.html` in a browser, or run `python3 -m http.server` from the repo root and visit `http://localhost:8000/`.
2. **Extension** — load `extension/` unpacked in your browser; reload from `chrome://extensions` after edits.
3. **API proxy** — `cd api-proxy && npx vercel dev` to run it locally.

## Branches

- `main` — production. GitHub Pages serves from here.
- `chore/polish` — current cleanup/refactor pass. Merged to `main` when ready.
- `feature/mapro-integration` — preserved for reference. An older direction that built a "Resort Info" extension which injected gate-code/property-manager/extras buttons into Airbnb's UI directly. Not active, but worth raiding if we ever want that flow.
