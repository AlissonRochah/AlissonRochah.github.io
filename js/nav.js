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

function ensureBreakOverlay() {
    if (document.getElementById("break-overlay")) return;
    const el = document.createElement("div");
    el.id = "break-overlay";
    el.className = "break-overlay";
    el.hidden = true;
    el.innerHTML = `
        <video class="break-overlay-video" autoplay loop muted playsinline preload="auto">
            <source src="img/break-bg.mp4" type="video/mp4">
        </video>
        <div class="break-overlay-content">
            <div class="break-overlay-name" id="break-overlay-name">—</div>
            <div class="break-overlay-status">BREAK IN PROGRESS</div>
            <div class="break-overlay-time" id="break-overlay-time">—</div>
        </div>
    `;
    document.body.appendChild(el);
    // Esc exits fullscreen natively; once that happens, hide the overlay
    // too so the operator lands back on the page they were on.
    document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement) {
            const ov = document.getElementById("break-overlay");
            if (ov) ov.hidden = true;
        }
    });
}

function fmtHourAmPm(d) {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
}

function openBreak() {
    ensureBreakOverlay();
    const uid = auth.currentUser && auth.currentUser.uid;
    const name = yourNameForUid(uid) || (auth.currentUser && auth.currentUser.email) || "—";
    const now = new Date();
    const end = new Date(now.getTime() + BREAK_MINUTES * 60 * 1000);
    document.getElementById("break-overlay-name").textContent = name;
    document.getElementById("break-overlay-time").textContent = `${fmtHourAmPm(now)} - ${fmtHourAmPm(end)}`;
    const overlay = document.getElementById("break-overlay");
    overlay.hidden = false;
    // The click that called this function counts as a user gesture in
    // this very document, so requestFullscreen on documentElement here
    // works reliably — no popup window needed.
    const docEl = document.documentElement;
    const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen;
    if (req) req.call(docEl).catch(() => {});
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
