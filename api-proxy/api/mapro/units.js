import { requireFirebaseUser } from "../_lib/auth.js";
import { listUnits, MaproNotLoggedIn } from "../_lib/mapro.js";

export default async function handler(req, res) {
    if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
    }
    if (req.method !== "GET") {
        res.status(405).json({ error: "method not allowed" });
        return;
    }

    try {
        await requireFirebaseUser(req);
    } catch (err) {
        res.status(err.status || 401).json({ error: err.message });
        return;
    }

    try {
        const units = await listUnits();
        res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
        res.status(200).json({ count: units.length, units });
    } catch (err) {
        if (err instanceof MaproNotLoggedIn) {
            res.status(503).json({ error: "MAPRO_NOT_LOGGED_IN" });
            return;
        }
        res.status(500).json({ error: err.message || "internal error" });
    }
}
