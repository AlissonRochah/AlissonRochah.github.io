// Shared header bar. Pages call `renderHeader("units")` (etc.) once the
// DOM is ready; this fills in the logo, nav links, user email span, theme
// toggle, a 45-minute Break overlay button, and a Sign Out button wired
// to Firebase signOut.

import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

const PAGES = [
    { key: "templates", label: "Templates", href: "template.html" },
    { key: "messages",  label: "Messages",  href: "messages.html" },
    { key: "units",     label: "Units",     href: "units.html" },
    { key: "settings",  label: "Settings",  href: "settings.html" },
];

const SUN_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
const MOON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const COFFEE_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>';

const BREAK_MINUTES = 45;
const YOUR_NAME_PREFIX = "yourName:";

function fmtHHMM(date) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

function yourNameForUid(uid) {
    if (!uid) return "";
    return (localStorage.getItem(YOUR_NAME_PREFIX + uid) || "").trim();
}

function openBreak() {
    const uid = auth.currentUser && auth.currentUser.uid;
    const name = yourNameForUid(uid) || (auth.currentUser && auth.currentUser.email) || "—";
    const url = `break.html?name=${encodeURIComponent(name)}&min=${BREAK_MINUTES}`;
    // Open a fresh window sized to the full screen. The popup auto-
    // requests Fullscreen API on load (user gesture propagates from
    // this click), so the operator lands directly on the break screen.
    const w = screen.availWidth || screen.width;
    const h = screen.availHeight || screen.height;
    const features = `popup=yes,width=${w},height=${h},left=0,top=0`;
    const popup = window.open(url, "masterbotBreak", features);
    if (!popup) {
        alert("Popup blocked — allow popups on this site to use Break Time.");
    }
}

function currentTheme() {
    return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function applyTheme(theme) {
    if (theme === "light") {
        document.documentElement.classList.add("light");
    } else {
        document.documentElement.classList.remove("light");
    }
    localStorage.setItem("theme", theme);
    const btn = document.getElementById("theme-toggle-btn");
    if (btn) {
        btn.innerHTML = theme === "light" ? MOON_SVG : SUN_SVG;
        btn.title = theme === "light" ? "Switch to dark" : "Switch to light";
    }
}

export function renderHeader(activePage) {
    const host = document.getElementById("app-header");
    if (!host) return;

    const links = PAGES.map((p) => {
        const cls = "nav-link" + (p.key === activePage ? " active" : "");
        return `<a href="${p.href}" class="${cls}">${p.label}</a>`;
    }).join("");

    const theme = currentTheme();
    const themeIcon = theme === "light" ? MOON_SVG : SUN_SVG;
    const themeTitle = theme === "light" ? "Switch to dark" : "Switch to light";

    host.innerHTML = `
        <div class="header-left">
            <a href="messages.html" class="header-logo">
                <img src="img/MasterLogo.jpg" alt="Logo">
            </a>
            <nav class="header-nav">${links}</nav>
        </div>
        <div class="header-right">
            <span id="user-email" class="header-email"></span>
            <button id="break-btn" class="btn-icon" title="Start 45-min break" aria-label="Start break">${COFFEE_SVG}</button>
            <button id="theme-toggle-btn" class="btn-icon" title="${themeTitle}" aria-label="Toggle theme">${themeIcon}</button>
            <button id="sign-out-btn" class="btn btn-sm btn-outline">Sign Out</button>
        </div>
    `;

    document.getElementById("theme-toggle-btn").addEventListener("click", () => {
        applyTheme(currentTheme() === "light" ? "dark" : "light");
    });

    document.getElementById("break-btn").addEventListener("click", openBreak);

    document.getElementById("sign-out-btn").addEventListener("click", () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        });
    });
}
