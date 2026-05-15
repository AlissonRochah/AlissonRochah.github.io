# Bulk Message — Design Spec

**Date:** 2026-05-15
**Feature:** Send a templated message to every guest checking in today across a pasted list of houses.

## Goal

User pastes a list of house addresses (≈55). The system finds, for each
address, the reservation checking in **today** (Florida time), determines
whether it is an Airbnb booking, sends a chosen message to the Airbnb
guests, and reports back everything that did not get messaged.

MAPRO is the single source of truth — the input list is only addresses;
channel, arrival date, guest name, and booking id all come from MAPRO.

## User flow

1. Open Settings → **Bulk Message** tab.
2. Pick a template from a dropdown (fills an editable textarea) — or type
   freely. Placeholders `{guest}`, `{checkin}`, `{checkout}`, `{address}`
   are optional; literal text is sent if none are used.
3. Paste the address list (one per line) into a textarea.
4. Click **Scan** → the system shows four buckets with counts.
5. Review, then click **Confirm & send to N guests**.
6. Final report: **Sent** / **Failed**, plus the three non-messaged
   buckets, each list copyable.

## Input format

One address per line. A pasted CSV is tolerated: only the first column
(or an `address` column when a header row exists) is read; all other
columns are ignored.

## Buckets

- `airbnb` — matched a house, has a check-in today, channel is Airbnb → will be messaged.
- `notAirbnb` — matched, check-in today, but channel is not Airbnb.
- `noCheckinToday` — matched a house, but no reservation checks in today.
- `notFound` — no MAPRO unit matched the address (includes ambiguous matches).

## Backend

### `POST /api/mapro/bulk-scan`
Input `{ addresses: string[] }`. Steps:
1. `listUnits()` → match each address to a unit.
2. One `/calendar/reservation?start=<today>&properties=<ulid1,ulid2,…>`
   call for all matched units (verified: comma-joined properties returns
   a JSON object keyed by ULID).
3. Per unit, find the guest reservation (`rt === "g"`) whose check-in
   date equals Florida-today. Channel via `parseChannel(title)`;
   bookingId via `reservaIdFromLink(link)`.
4. Return `{ airbnb, notAirbnb, noCheckinToday, notFound }`. Each `airbnb`
   item: `{ address, unit, guest, checkin, checkout, channel, bookingId }`.

### `POST /api/mapro/bulk-send`
Input `{ sends: [{ bookingId, body }] }`. Per item (concurrency 5):
`getReservationUlid(bookingId)` → `sendChannelMessage(ulid, body)`.
Returns `[{ bookingId, ok, error? }]`.

Both endpoints require a Firebase user and surface `MAPRO_NOT_LOGGED_IN`
as 503.

## Address matching

Normalize both sides: lowercase, strip punctuation, expand common street
abbreviations (Rd/Road, Dr/Drive, St/Street, Ave/Avenue, Cir/Circle,
Ln/Lane, Blvd/Boulevard, Ct/Court, Pl/Place, Trl/Trail). Match key is
`<number> <first-street-word>` (e.g. "16280 saint") — stable against
"Saint Martin St" vs "St Martin Street". If a key resolves to >1 unit it
is treated as `notFound` (ambiguous).

## Florida "today"

`new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })`
→ `YYYY-MM-DD`, compared against `reservation.ci.slice(0, 10)`.

## Placeholders

Substituted client-side before calling `bulk-send`, per reservation:
`{guest}` → guest name, `{checkin}`/`{checkout}` → formatted dates,
`{address}` → matched address. Unknown/absent placeholders are left as-is.

## Frontend

New `Bulk Message` tab/panel in `settings.html`; template dropdown loads
the user's templates from Firestore; bucket lists styled in
`style/settings.css` with copy-to-clipboard buttons.

## Out of scope

- Per-guest custom messages (one shared template only).
- Non-Airbnb sending (VRBO/Booking.com).
- Scheduling / retries — a failed send is reported, user re-runs manually.

## v2 (2026-05-15) — input sources + reservation selector

`bulk-scan` generalised. Input is now:

```
{ source: "addresses" | "codes" | "resort",
  addresses | codes | resort,
  mode: "checkin" | "inhouse",   // ignored when source=codes
  date: "YYYY-MM-DD" }           // ignored when source=codes
```

- **addresses** — match a pasted address list to units (v1 behaviour).
- **resort** — every unit whose `resort` field equals the pick. Resort
  list comes from `/api/mapro/units` (no new endpoint).
- **codes** — each Airbnb confirmation code is one exact reservation;
  found → `airbnb`, not found → `notFound`. The mode/date selector does
  not apply and is hidden in the UI.
- **mode** — `checkin`: reservation checking in on `date`. `inhouse`:
  reservation spanning `date` (ci ≤ noon(date) < co).

Buckets unchanged except `noCheckinToday` → `noMatch` (label adapts to
mode/date). UI adds a source segmented control, a check-in/in-house
toggle, a date picker (default Florida today), and a resort dropdown.
