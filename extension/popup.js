import { getSession, signIn, signOut, listResorts } from "./js/api.js";

const MODE_KEY = "rm_panel_mode";

const SECTION_ICONS = {
    gate:       "🚪",
    contacts:   "☎️",
    amenities:  "🏊",
    pool:       "💧",
    trash:      "🗑️",
    parking:    "🅿️",
    packages:   "📦",
    pets:       "🐾",
    ev:         "🔌",
    additional: "ℹ️",
};

let resorts = [];
let currentResort = null;

// ============ View switching ============

function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.hidden = true);
    document.getElementById(id).hidden = false;
}

// ============ Init ============

async function init() {
    document.getElementById("login-form").addEventListener("submit", onLogin);
    document.getElementById("sign-out-btn").addEventListener("click", onSignOut);
    document.getElementById("search").addEventListener("input", renderList);
    document.getElementById("back-btn").addEventListener("click", () => showView("list-view"));

    document.querySelectorAll("[data-toggle-mode]").forEach(btn => {
        btn.addEventListener("click", toggleMode);
    });
    await refreshToggleLabels();

    const session = await getSession();
    if (session) {
        await loadAndShowList();
    } else {
        showView("login-view");
    }
}

// ============ Panel mode (popup vs side panel) ============

async function getMode() {
    const obj = await chrome.storage.local.get(MODE_KEY);
    return obj[MODE_KEY] === "sidepanel" ? "sidepanel" : "popup";
}

async function refreshToggleLabels() {
    const mode = await getMode();
    const label = mode === "sidepanel" ? "◨ Popup" : "◨ Side panel";
    const title = mode === "sidepanel"
        ? "Switch to popup mode"
        : "Switch to side panel mode";
    document.querySelectorAll("[data-toggle-mode]").forEach(btn => {
        btn.textContent = label;
        btn.title = title;
    });
}

async function toggleMode() {
    const current = await getMode();
    const next = current === "sidepanel" ? "popup" : "sidepanel";
    await chrome.storage.local.set({ [MODE_KEY]: next });

    try {
        await chrome.sidePanel.setPanelBehavior({
            openPanelOnActionClick: next === "sidepanel",
        });
    } catch (err) {
        console.warn("Failed to set panel behavior:", err);
    }

    if (next === "sidepanel") {
        // Open the side panel for the current window, then close the popup.
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                await chrome.sidePanel.open({ windowId: tab.windowId });
            }
        } catch (err) {
            console.warn("Failed to open side panel:", err);
        }
        window.close();
    } else {
        // Going back to popup mode: next click on the extension icon will
        // open the popup. The side panel stays open until the user closes it.
        await refreshToggleLabels();
    }
}

// ============ Login ============

async function onLogin(e) {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const errorEl = document.getElementById("login-error");
    const btn = document.getElementById("login-btn");

    errorEl.textContent = "";
    btn.disabled = true;
    btn.textContent = "Signing in...";

    try {
        await signIn(email, password);
        await loadAndShowList();
    } catch (err) {
        errorEl.textContent = err.message || "Sign in failed.";
    } finally {
        btn.disabled = false;
        btn.textContent = "Sign In";
    }
}

async function onSignOut() {
    await signOut();
    resorts = [];
    currentResort = null;
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    showView("login-view");
}

// ============ List ============

async function loadAndShowList() {
    showView("list-view");
    try {
        resorts = await listResorts();
        renderList();
    } catch (err) {
        document.getElementById("resort-list").innerHTML = "";
        const empty = document.getElementById("empty-msg");
        empty.textContent = "Error: " + err.message;
        empty.hidden = false;
    }
}

function renderList() {
    const search = document.getElementById("search").value.trim().toLowerCase();
    const list = document.getElementById("resort-list");
    const empty = document.getElementById("empty-msg");
    list.innerHTML = "";

    const filtered = resorts.filter(r =>
        !search ||
        (r.name || "").toLowerCase().includes(search) ||
        (r.aliases || []).some(a => (a || "").toLowerCase().includes(search))
    );

    if (filtered.length === 0) {
        empty.textContent = resorts.length === 0 ? "No resorts yet." : "No matches.";
        empty.hidden = false;
        return;
    }
    empty.hidden = true;

    filtered.forEach(r => {
        const li = document.createElement("li");
        li.className = "resort-item";

        const name = document.createElement("div");
        name.className = "name";
        name.textContent = r.name;
        li.appendChild(name);

        if (r.gate_code) {
            const hint = document.createElement("div");
            hint.className = "hint";
            hint.textContent = "Gate: " + r.gate_code;
            li.appendChild(hint);
        }

        li.addEventListener("click", () => showDetail(r));
        list.appendChild(li);
    });
}

// ============ Detail ============

function showDetail(resort) {
    currentResort = resort;
    document.getElementById("detail-name").textContent = resort.name || "";

    const gateCard = document.getElementById("gate-code-card");
    if (resort.gate_code) {
        gateCard.hidden = false;
        document.getElementById("gate-code-value").textContent = resort.gate_code;
    } else {
        gateCard.hidden = true;
    }

    const container = document.getElementById("sections-container");
    container.innerHTML = "";

    (resort.sections || []).forEach(section => {
        const icon = SECTION_ICONS[section.type] || "✏️";
        const card = document.createElement("div");
        card.className = "section-card";

        const header = document.createElement("div");
        header.className = "section-card-header";
        header.innerHTML = `<span class="section-icon">${icon}</span><span class="section-title"></span>`;
        header.querySelector(".section-title").textContent = section.title || "";
        card.appendChild(header);

        (section.items || []).forEach(item => {
            if (!item.label && !item.value) return;
            const row = document.createElement("div");
            row.className = "section-item";
            if (item.label) {
                const l = document.createElement("div");
                l.className = "item-label";
                l.textContent = item.label;
                row.appendChild(l);
            }
            if (item.value) {
                const v = document.createElement("div");
                v.className = "item-value";
                v.textContent = item.value;
                row.appendChild(v);
            }
            card.appendChild(row);
        });

        container.appendChild(card);
    });

    const meta = document.getElementById("detail-meta");
    if (resort.updated_at) {
        const when = new Date(resort.updated_at).toLocaleString();
        meta.textContent = `Updated ${when}` + (resort.updated_by ? ` by ${resort.updated_by}` : "");
    } else {
        meta.textContent = "";
    }

    showView("detail-view");
}

init();
