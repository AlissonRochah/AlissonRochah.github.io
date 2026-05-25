import { requireBridgeOrUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import { listUnits, listAllChannelLinks, MaproNotLoggedIn } from "../_lib/mapro.js";

// Bulk Airbnb listing-link lookup. Returns one entry per unit:
//   { channels: { "<idMAPRO>": { red: url|null, green: url|null }, ... } }
//
// The frontend calls this in parallel with /units so houses appear fast
// and the Green/Red Airbnb buttons "pop in" once channels finish.
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
        // Pull the unit list ourselves so the endpoint is self-contained
        // and callable independently of /units (handy for cache refreshes).
        const units = await listUnits();
        const ids = units.map((u) => String(u.idMAPRO ?? u.key ?? "")).filter(Boolean);
        const map = await listAllChannelLinks(ids, 20);
        const channels = {};
        for (const [id, val] of map) channels[id] = val;
        // Channels rarely change — cache aggressively at the edge so
        // repeat refreshes are basically free.
        res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
        res.status(200).json({ count: Object.keys(channels).length, channels });
    } catch (err) {
        if (err instanceof MaproNotLoggedIn) {
            res.status(503).json({ error: "MAPRO_NOT_LOGGED_IN" });
            return;
        }
        res.status(500).json({ error: err.message || "internal error" });
    }
}
