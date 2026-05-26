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

    // Two modes on the same endpoint to dodge the 12-function Hobby cap:
    //   GET /api/mapro/units            → fast (~2s), no _channels
    //   GET /api/mapro/units?channels=1 → slow (10–25s), includes _channels
    // The frontend hits the fast one for instant paint, then the slow
    // one in the background to fill in the Green/Red Airbnb buttons.
    // This way a slow MAPRO never causes the unit list itself to fail
    // with "Failed to fetch" — only the channel pop-in is affected.
    const withChannels = String(req.query?.channels || "") === "1";

    try {
        // listUnits is the only call that must succeed — without it
        // we have nothing to show. listExtras and listResorts only
        // decorate the rows (BBQ flag, pool heater tier, resort
        // address), so if the account behind the cookie can't see
        // /settings/services or /manage/houses/resort, we degrade
        // gracefully instead of failing the whole endpoint.
        const units = await listUnits();
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

        // Channels only when explicitly requested. listAllChannelLinks
        // swallows ALL per-unit errors so MAPRO rate-limit hiccups in
        // the middle of a batch don't surface as a fake "session
        // expired" banner.
        let channels = new Map();
        if (withChannels) {
            const unitIds = units.map((u) => String(u.idMAPRO ?? u.key ?? "")).filter(Boolean);
            channels = await listAllChannelLinks(unitIds, 12).catch((e) => {
                console.warn("listAllChannelLinks failed:", e?.message || e);
                return new Map();
            });
        }

        const enriched = units.map((u) => {
            const id = String(u.idMAPRO ?? u.key ?? "");
            const resortName = (u.resort || "").trim();
            const row = {
                ...u,
                bbq: extrasOk ? extras.bbq.has(id) : null,
                poolHeater: extrasOk
                    ? (extras.ph75.has(id) ? 75 : extras.ph35.has(id) ? 35 : null)
                    : null,
                resortAddress: resorts.get(resortName) || "",
            };
            if (withChannels) row._channels = channels.get(id) || { red: null, green: null };
            return row;
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
