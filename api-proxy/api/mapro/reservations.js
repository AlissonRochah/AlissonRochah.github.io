import { requireFirebaseUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import { listReservations, MaproNotLoggedIn } from "../_lib/mapro.js";

// GET /api/mapro/reservations?checkoutFrom=YYYY-MM-DD&checkoutTo=YYYY-MM-DD&take=N
// Returns reservations whose checkout falls in the window, normalized so the
// front end has booleans (has*Grill etc.) and plain text (status, integrator).
// Cancelled reservations are NOT filtered out — the verification logic needs
// them to flag jobs left behind after a cancellation.
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

    const checkoutFrom = String(req.query.checkoutFrom || "").trim();
    const checkoutTo = String(req.query.checkoutTo || "").trim();
    const takeRaw = parseInt(req.query.take || "1000", 10);
    const take = Math.min(Math.max(Number.isFinite(takeRaw) ? takeRaw : 1000, 1), 5000);

    try {
        const reservations = await listReservations({ checkoutFrom, checkoutTo, take });
        res.setHeader("Cache-Control", "private, max-age=30");
        res.status(200).json({ count: reservations.length, reservations });
    } catch (err) {
        if (err instanceof MaproNotLoggedIn) {
            res.status(503).json({ error: "MAPRO_NOT_LOGGED_IN" });
            return;
        }
        res.status(500).json({ error: err.message || "internal error" });
    }
}
