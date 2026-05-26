import { requireBridgeOrUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import { listUnits, listExtras, listResorts, listAllChannelLinks, MaproNotLoggedIn } from "../_lib/mapro.js";

// Default Hobby-plan timeout is 10s, which is tight once we fan out
// ~100 channel-page fetches. Bumping to 30s gives MAPRO room to breathe
// under load. (Hobby supports up to 60s via maxDuration.)
export const maxDuration = 30;

export default async function handler(req, res) {
    if (applyCors(req, res)) return;
    if (req.method !== "GET") {
        res.status(405).json({ error: "method not allowed" });
        return;
    }

    try {
        await requireBridgeOrUser(req);
    } catch (err) {
        res.status(err.status || 401).json({ error: err.message });
        return;
    }

    try {
        // listUnits is the only call that must succeed — without it
        // we have nothing to show. listExtras and listResorts only
        // decorate the rows (BBQ flag, pool heater tier, resort
        // address), so if the account behind the cookie can't see
        // /settings/services or /manage/houses/resort, we degrade
        // gracefully instead of failing the whole endpoint.
        const units = await listUnits();
        // listUnits is the only call that must succeed. listExtras
        // depends on /settings/services/register/<id> which currently
        // returns 403 (account permission was removed); when it fails
        // we mark bbq/poolHeater as `null` (= unknown) instead of
        // `false`, so downstream consumers don't conclude "no BBQ" for
        // every house. listResorts is the same — degrade to empty map.
        let extrasOk = true;
        const extras = await listExtras().catch((e) => {
            extrasOk = false;
            console.warn("listExtras failed:", e?.message || e);
            return { bbq: new Set(), ph35: new Set(), ph75: new Set() };
        });
        const resorts = await listResorts().catch((e) => {
            console.warn("listResorts failed:", e?.message || e);
            return new Map();
        });
        // Airbnb listing links per house (Green/Red) — folded into /units
        // so the unit cards can show the channel buttons without a second
        // round-trip. Hobby plan caps us at 12 serverless functions, so a
        // dedicated /units-channels endpoint would push us over the limit.
        // listAllChannelLinks now swallows ALL per-unit errors (including
        // MaproNotLoggedIn from MAPRO rate-limit hiccups) so a flaky
        // channel page can't masquerade as a session-expired banner —
        // listUnits already validated the session above.
        const unitIds = units.map((u) => String(u.idMAPRO ?? u.key ?? "")).filter(Boolean);
        const channels = await listAllChannelLinks(unitIds, 12).catch((e) => {
            console.warn("listAllChannelLinks failed:", e?.message || e);
            return new Map();
        });
        const enriched = units.map((u) => {
            const id = String(u.idMAPRO ?? u.key ?? "");
            const resortName = (u.resort || "").trim();
            return {
                ...u,
                bbq: extrasOk ? extras.bbq.has(id) : null,
                poolHeater: extrasOk
                    ? (extras.ph75.has(id) ? 75 : extras.ph35.has(id) ? 35 : null)
                    : null,
                resortAddress: resorts.get(resortName) || "",
                _channels: channels.get(id) || { red: null, green: null },
            };
        });
        res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
        res.status(200).json({ count: enriched.length, units: enriched });
    } catch (err) {
        if (err instanceof MaproNotLoggedIn) {
            res.status(503).json({ error: "MAPRO_NOT_LOGGED_IN" });
            return;
        }
        res.status(500).json({ error: err.message || "internal error" });
    }
}
