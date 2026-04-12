// Minimal Supabase REST client for the Chrome extension.
// Uses fetch + chrome.storage.local directly so we don't need to bundle
// supabase-js (which would fight Manifest V3's CSP).

const SUPABASE_URL = "https://ahpubmxpfmmpkfwbhtwf.supabase.co";
const ANON_KEY = "sb_publishable_Y9CEmcrVgeizC0hMub-zyQ_GQmwO1s-";

const STORAGE_KEY = "rm_session";

// ============ Session storage ============

export async function getSession() {
    const obj = await chrome.storage.local.get(STORAGE_KEY);
    return obj[STORAGE_KEY] || null;
}

async function setSession(session) {
    await chrome.storage.local.set({ [STORAGE_KEY]: session });
}

export async function clearSession() {
    await chrome.storage.local.remove(STORAGE_KEY);
}

// ============ Auth ============

export async function signIn(email, password) {
    const res = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
            method: "POST",
            headers: {
                "apikey": ANON_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        }
    );

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error_description || data.msg || data.error || "Sign in failed");
    }

    const session = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
        email: data.user && data.user.email,
    };
    await setSession(session);
    return session;
}

export async function signOut() {
    const session = await getSession();
    if (session && session.accessToken) {
        // Fire-and-forget; the Supabase logout endpoint.
        try {
            await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
                method: "POST",
                headers: {
                    "apikey": ANON_KEY,
                    "Authorization": `Bearer ${session.accessToken}`,
                },
            });
        } catch (_) { /* ignore */ }
    }
    await clearSession();
}

async function refreshSession(session) {
    const res = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
        {
            method: "POST",
            headers: {
                "apikey": ANON_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh_token: session.refreshToken }),
        }
    );
    if (!res.ok) {
        await clearSession();
        return null;
    }
    const data = await res.json();
    const updated = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
        email: (data.user && data.user.email) || session.email,
    };
    await setSession(updated);
    return updated;
}

async function getValidSession() {
    let session = await getSession();
    if (!session) return null;
    // If expiring within 60s, refresh.
    if (session.expiresAt - Date.now() < 60_000) {
        session = await refreshSession(session);
    }
    return session;
}

// ============ REST helpers ============

async function restFetch(path, options = {}) {
    const session = await getValidSession();
    if (!session) throw new Error("Not signed in");

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...options,
        headers: {
            "apikey": ANON_KEY,
            "Authorization": `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Request failed (${res.status}): ${text}`);
    }
    return res.json();
}

// ============ Resort queries ============

export async function listResorts() {
    return restFetch("resorts?select=*&order=name.asc");
}

export async function getResortById(id) {
    const rows = await restFetch(`resorts?id=eq.${encodeURIComponent(id)}&select=*`);
    return rows[0] || null;
}
