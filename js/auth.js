import { supabase } from "./supabase.js";

// Absolute URL to the root login page, derived from this module's own URL.
// Works from any depth (root, /resorts/, etc.) and from any deployment path.
const LOGIN_URL = new URL("../index.html", import.meta.url).href;
const APP_HOME_URL = new URL("../messages.html", import.meta.url).href;

export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

export async function requireAuth() {
    const session = await getSession();
    if (!session) {
        window.location.replace(LOGIN_URL);
        return null;
    }
    return session;
}

export async function redirectIfAuthed(destination = APP_HOME_URL) {
    const session = await getSession();
    if (session) {
        window.location.replace(destination);
        return true;
    }
    return false;
}

export async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
    await supabase.auth.signOut();
    window.location.replace(LOGIN_URL);
}
