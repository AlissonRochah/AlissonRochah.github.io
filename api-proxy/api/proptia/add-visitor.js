import { requireFirebaseUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import { proptiaAddGuests } from "../_lib/proptia.js";

// Per-resort static config. Add a new entry here to support another
// Proptia portal. Email + password come from env vars so we don't echo
// secrets in the page.
const RESORTS = {
    "windsor-island": {
        slug: "windsorislandresort",
        orgUUID: "ebcdb215-ed1d-42fb-b837-bdfc78cbcb18",
        emailEnv: "PROPTIA_WINDSOR_EMAIL",
        passwordEnv: "PROPTIA_WINDSOR_PASSWORD",
    },
};

export default async function handler(req, res) {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") {
        res.status(405).json({ error: "method not allowed" });
        return;
    }

    try {
        await requireFirebaseUser(req);
    } catch (err) {
        res.status(err.status || 401).json({ error: err.message });
        return;
    }

    const { resort, houseHint, guests, creds: explicitCreds } = req.body || {};
    if (!houseHint || typeof houseHint !== "string") {
        res.status(400).json({ error: "houseHint required" });
        return;
    }
    if (!Array.isArray(guests) || guests.length === 0) {
        res.status(400).json({ error: "guests must be a non-empty array" });
        return;
    }

    // Resolve creds: explicit body wins (handy for one-off testing),
    // otherwise look up the resort key against env vars.
    let creds = null;
    if (explicitCreds && explicitCreds.email && explicitCreds.password && explicitCreds.slug && explicitCreds.orgUUID) {
        creds = explicitCreds;
    } else {
        const cfg = RESORTS[resort];
        if (!cfg) {
            res.status(400).json({ error: `unknown resort "${resort}". Known: ${Object.keys(RESORTS).join(", ")}` });
            return;
        }
        const email = process.env[cfg.emailEnv];
        const password = process.env[cfg.passwordEnv];
        if (!email || !password) {
            res.status(500).json({ error: `creds not configured for ${resort} (set ${cfg.emailEnv} + ${cfg.passwordEnv} on Vercel)` });
            return;
        }
        creds = { email, password, slug: cfg.slug, orgUUID: cfg.orgUUID };
    }

    try {
        const out = await proptiaAddGuests({ ...creds, houseHint }, guests);
        res.status(200).json(out);
    } catch (err) {
        res.status(500).json({ error: String(err?.message || err) });
    }
}
