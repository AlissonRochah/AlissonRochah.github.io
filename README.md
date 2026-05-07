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

## API reference

Three different sets of HTTP traffic flow out of this app: Jobber GraphQL (write actions, on the user's session), MAPRO direct (write actions, also user's session), and MAPRO via api-proxy (read-only, admin's session). Every Jobber/MAPRO call is *authenticated by browser cookies the user is already carrying* — no API tokens stored anywhere.

### Jobber — GraphQL

Hit by the extension's `jobber-query` action.

- **Endpoint:** `POST https://secure.getjobber.com/api/graphql?location=j`
- **Auth:** browser cookies (extension uses `credentials: "include"`; the user must be signed into Jobber on the same browser)
- **Required headers:** `X-Jobber-Graphql-Version: 2026-04-16`, `X-Requested-With: XMLHttpRequest`

Operations the front-end currently uses:

| Operation | Type | Purpose | Variables |
|---|---|---|---|
| `JobberCurrentAccount` | query | Get the signed-in agent's display name (for stamping the "Member" custom field) | — |
| `GlobalSearch` | query | Find a Property/Client by search term (used to link a MAPRO unit to its Jobber property) | `{ searchTerm, first }` |
| `JobDefaultCustomFieldValues` | query | Read the `Member` dropdown options for the picked client/property | `{ clientId?, propertyId? }` |
| `MasterBotPropertyJobs` | query | List existing jobs for a property (used to flag a PH-conflict before creating new ones) | `{ clientId, propertyIds, first }` |
| `CreateJob` | mutation | Create a Jobber job | `{ input: JobCreateAttributes }` |

Response shape: standard GraphQL — `{ data: {...}, errors?: [...] }`. The `userErrors` nested under `jobCreate` is a separate kind of error (validation) and the front-end surfaces those messages.

### MAPRO — direct (extension, user session)

These rides on whatever session the agent has open in the same browser (cookies sent automatically; the extension's `host_permissions` lists `https://app.mapro.us/*`).

| Endpoint | Method | Used by | Notes |
|---|---|---|---|
| `/booking/reservation/{id}` | GET (page load) | `mapro-add-service`, `mapro-list-services` | Extension opens this page in a background tab and drives the on-page form via `chrome.scripting.executeScript` in the MAIN world (calls the page's own `add_service()` global, fills date inputs, fires a native MouseEvent on Save). |
| `/ajax?manage-booking-details-commented` | POST (form-data) | `mapro-add-comment` | Body: `tx-comentario`, `reserva_id`, `casa_id`, `comentario`. Returns `{status: true, ...}` on success. |
| `/ajax?booking-reservar` | POST (form-data) | indirectly, via the Save click during `mapro-add-service` | Returns `{status: true}` on save. The extension hooks `XMLHttpRequest.prototype.open` before the click so it can read the JSON response and decide success/error. |

### MAPRO — via api-proxy (Vercel, admin session)

Only used for *read-only* data that's the same for every agent (units catalog, stay calendar, addresses). Caller: `units.html`. The proxy keeps a single MAPRO `SID` cookie in Upstash KV.

Front-end calls the proxy with a Firebase ID token in the `Authorization: Bearer ...` header — the proxy verifies it via Firebase Admin and only then forwards to MAPRO with the stored cookie.

| Front-end call | What it returns | Underlying MAPRO requests |
|---|---|---|
| `GET /api/mapro/units` | array of unit objects (`{idMAPRO, ulid, code, title, …, bbq, poolHeater}`) | `GET /manage/houses/list` (catalog HTML) + `GET /manage/houses/resort/list` (resort lookup) + 3× `GET /settings/services/register/{id}` (which properties have BBQ/PH35/PH75) |
| `GET /api/mapro/unit-stays?key={ulid}&date={YYYY-MM-DD}` | `{previous, active, next}` — each is a stay or `null` | `GET /calendar/reservation?start=…&properties=…&single_property=1` |
| `GET /api/mapro/unit-address?id={mapro_id}` | `{street, city, state, zip}` | `GET /manage/houses/register/{id}` |
| `POST /api/admin/mapro-cookie` (admin only) | `{ok: true}` | — (writes the new SID into Upstash KV) |

If the stored SID is dead, the proxy responds `503` with `error: "MAPRO_NOT_LOGGED_IN"`. Refresh the cookie via the admin endpoint:

```sh
curl -X POST https://<vercel-url>/api/admin/mapro-cookie \
     -H "Authorization: Bearer <firebase-id-token>" \
     -H "Content-Type: application/json" \
     -d '{"cookie":"<new-SID-value>"}'
```

### Extension — messaging API (page → extension)

The website calls the extension via `chrome.runtime.sendMessage(EXT_ID, {action, payload}, callback)`. Allowed origins are listed in the manifest's `externally_connectable` (currently `https://alissonrochah.github.io/*` and `http://localhost:*/*`). Every response is `{ok: true, data}` or `{ok: false, error}`.

| `action` | `payload` | `data` shape on success |
|---|---|---|
| `ping` | `{}` | `{version: "0.6.0"}` |
| `jobber-query` | `{operationName, query, variables}` | the GraphQL `data` object |
| `mapro-add-comment` | `{reservaId, casaId, comment}` | the MAPRO JSON response |
| `mapro-add-service` | `{reservaId, kind: "bbq" \| "ph", price, startDate, endDate, dryRun?, force?, checkOnly?}` | `{serviceId, serviceLabel, status: "saved" \| "duplicate" \| "dry-run", existingLabel?, existingDate?, dateDebug?}` |
| `mapro-list-services` | `{reservaId}` | `{services: [{label, value, start_date, end_date}, …]}` |

Flags on `mapro-add-service`:
- `dryRun: true` — adds the service block in MAPRO and sets the right option, but doesn't click Save (nothing persists).
- `checkOnly: true` — only checks for an existing duplicate (returns `{status: "duplicate"}` or `{status: "not-duplicate"}`); doesn't add anything.
- `force: true` — bypasses the "BBQ already exists for this date" check.

## Local development

1. **Pages** — there's no build step. Open `index.html` in a browser, or run `python3 -m http.server` from the repo root and visit `http://localhost:8000/`.
2. **Extension** — load `extension/` unpacked in your browser; reload from `chrome://extensions` after edits.
3. **API proxy** — `cd api-proxy && npx vercel dev` to run it locally.

## Branches

- `main` — production. GitHub Pages serves from here.
- `chore/polish` — current cleanup/refactor pass. Merged to `main` when ready.
- `feature/mapro-integration` — preserved for reference. An older direction that built a "Resort Info" extension which injected gate-code/property-manager/extras buttons into Airbnb's UI directly. Not active, but worth raiding if we ever want that flow.
