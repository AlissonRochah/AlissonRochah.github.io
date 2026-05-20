import { requireFirebaseUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import { getInboxState, MaproNotLoggedIn } from "../_lib/mapro.js";

export default async function handler(req, res) {
    if (applyCors(req, res)) return;
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
        const json = await getInboxState();
        res.status(200).json(json);
    } catch (err) {
        if (err instanceof MaproNotLoggedIn) {
            res.status(503).json({ error: "MAPRO_NOT_LOGGED_IN" });
            return;
        }
        res.status(500).json({ error: err.message || "internal error" });
    }
}
