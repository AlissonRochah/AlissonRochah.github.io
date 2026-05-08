import { requireFirebaseUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import { proptiaAddGuests } from "../_lib/proptia.js";

// Per-resort static config. Add a new entry here to support another
// Proptia portal. Email + password come from env vars so we don't echo
// secrets in the page.
//   - mode "resident": account lands on /chooser after login (Windsor)
//   - mode "org-admin": account lands directly on the org dashboard, we
//     locate the right resident via the resident-directory JSON endpoint
//     (Solterra)
const RESORTS = {
    "windsor-island": {
        slug: "windsorislandresort",
        orgUUID: "ebcdb215-ed1d-42fb-b837-bdfc78cbcb18",
        mode: "resident",
        emailEnv: "PROPTIA_WINDSOR_EMAIL",
        passwordEnv: "PROPTIA_WINDSOR_PASSWORD",
    },
    "solterra": {
        slug: "solterra",
        orgUUID: "377b6383-fa36-11ef-bb04-0022480abcad",
        mode: "org-admin",
        emailEnv: "PROPTIA_SOLTERRA_EMAIL",
        passwordEnv: "PROPTIA_SOLTERRA_PASSWORD",
    },
};

// Bumped whenever the matching / submission logic changes so we can
// curl-check which build of the function Vercel is serving.
const FUNCTION_VERSION = "fallback-2";

export default async function handler(req, res) {
    if (applyCors(req, res)) return;
    if (req.method === "GET") {
        // Health probe — no auth needed, just echoes the version.
        res.status(200).json({ ok: true, v: FUNCTION_VERSION });
        return;
    }
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
        // The "v" marker confirms which build of the function is live —
        // bump it whenever the matching logic changes so we can curl-check.
        res.status(400).json({ error: "houseHint required", v: "fallback-2" });
        return;
    }
    if (!Array.isArray(guests) || guests.length === 0) {
        res.status(400).json({ error: "guests must be a non-empty array" });
        return;
    }
    const cfg = RESORTS[resort];
    if (!cfg) {
        res.status(400).json({ error: `unknown resort "${resort}". Known: ${Object.keys(RESORTS).join(", ")}` });
        return;
    }

    // Resolve creds:
    // 1. explicit body { email, password } (extension-provided, comes from the sheet)
    // 2. fall back to env vars on Vercel
    let email = explicitCreds?.email;
    let password = explicitCreds?.password;
    if (!email || !password) {
        email = process.env[cfg.emailEnv];
        password = process.env[cfg.passwordEnv];
    }
    if (!email || !password) {
        res.status(400).json({ error: `creds not provided in body and ${cfg.emailEnv}/${cfg.passwordEnv} env vars are not set` });
        return;
    }
    const creds = { email, password, slug: cfg.slug, orgUUID: cfg.orgUUID, mode: cfg.mode };

    try {
        const out = await proptiaAddGuests({ ...creds, houseHint }, guests);
        res.status(200).json(out);
    } catch (err) {
        res.status(500).json({ error: String(err?.message || err) });
    }
}
