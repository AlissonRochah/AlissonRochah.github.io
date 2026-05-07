// Shared header bar. Pages call `renderHeader("units")` (etc.) once the
// DOM is ready; this fills in the logo, nav links, user email span, and
// a Sign Out button wired to Firebase signOut.

import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

const PAGES = [
    { key: "templates", label: "Templates", href: "template.html" },
    { key: "messages",  label: "Messages",  href: "messages.html" },
    { key: "units",     label: "Units",     href: "units.html" },
    { key: "settings",  label: "Settings",  href: "settings.html" },
];

export function renderHeader(activePage) {
    const host = document.getElementById("app-header");
    if (!host) return;

    const links = PAGES.map((p) => {
        const cls = "nav-link" + (p.key === activePage ? " active" : "");
        return `<a href="${p.href}" class="${cls}">${p.label}</a>`;
    }).join("");

    host.innerHTML = `
        <div class="header-left">
            <a href="messages.html" class="header-logo">
                <img src="img/MasterLogo.jpg" alt="Logo">
            </a>
            <nav class="header-nav">${links}</nav>
        </div>
        <div class="header-right">
            <span id="user-email" class="header-email"></span>
            <button id="sign-out-btn" class="btn btn-sm btn-outline">Sign Out</button>
        </div>
    `;

    document.getElementById("sign-out-btn").addEventListener("click", () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        });
    });
}
