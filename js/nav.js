// Shared header bar. Pages call `renderHeader("units")` (etc.) once the
// DOM is ready; this fills in the logo, nav links, user email span, theme
// toggle, and a Sign Out button wired to Firebase signOut.

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
            <button id="theme-toggle-btn" class="btn-icon" title="${themeTitle}" aria-label="Toggle theme">${themeIcon}</button>
            <button id="sign-out-btn" class="btn btn-sm btn-outline">Sign Out</button>
        </div>
    `;

    document.getElementById("theme-toggle-btn").addEventListener("click", () => {
        applyTheme(currentTheme() === "light" ? "dark" : "light");
    });

    document.getElementById("sign-out-btn").addEventListener("click", () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        });
    });
}
