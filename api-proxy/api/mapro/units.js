import { requireFirebaseUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import { listUnits, listExtras, listResorts, MaproNotLoggedIn } from "../_lib/mapro.js";

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
        // listUnits is the only call that must succeed — without it
        // we have nothing to show. listExtras and listResorts only
        // decorate the rows (BBQ flag, pool heater tier, resort
        // address), so if the account behind the cookie can't see
        // /settings/services or /manage/houses/resort, we degrade
        // gracefully instead of failing the whole endpoint.
        const units = await listUnits();
        const [extras, resorts] = await Promise.all([
            listExtras().catch((e) => {
                console.warn("listExtras failed:", e?.message || e);
                return { bbq: new Set(), ph35: new Set(), ph75: new Set() };
            }),
            listResorts().catch((e) => {
                console.warn("listResorts failed:", e?.message || e);
                return new Map();
            }),
        ]);
        const enriched = units.map((u) => {
            const id = String(u.idMAPRO ?? u.key ?? "");
            const resortName = (u.resort || "").trim();
            return {
                ...u,
                bbq: extras.bbq.has(id),
                poolHeater: extras.ph75.has(id) ? 75 : extras.ph35.has(id) ? 35 : null,
                resortAddress: resorts.get(resortName) || "",
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
