// Content script injected on airbnb.com.
//
// Two jobs:
//   1. Watch the "Reservation" details panel (#thread_details_panel) and
//      publish its listing-title line to chrome.storage.local so the
//      background worker can match it against our resort list.
//   2. Inject a "Gate Code" button matching Airbnb's native button styling
//      right after the "Suggested door code" button, reading the matched
//      resort's gate code from storage.

const LISTING_KEY = "rm_current_listing";
const MATCHED_KEY = "rm_matched_resort";
const RESERVATION_KEY = "rm_current_reservation";
const PREVIOUS_KEY = "rm_previous_reservation";
const PROPERTY_MANAGER_KEY = "rm_property_manager";
const GUEST_NAME_KEY = "rm_current_guest_name";
const EXTRAS_KEY = "rm_current_extras";
const BUTTON_ID = "rm-gate-code-btn";
const DIVIDER_ID = "rm-gate-code-divider";
const PREV_BUTTON_ID = "rm-previous-gate-code-btn";
const PREV_DIVIDER_ID = "rm-previous-gate-code-divider";
const PM_BUTTON_ID = "rm-property-manager-btn";
const PM_DIVIDER_ID = "rm-property-manager-divider";
const EXTRAS_BUTTON_ID = "rm-extras-btn";
const EXTRAS_DIVIDER_ID = "rm-extras-divider";
const DEBOUNCE_MS = 250;
const SVG_NS = "http://www.w3.org/2000/svg";
const MORE_ACTIONS_SELECTOR = '[data-testid="hosting-details-header-section-actions-menu-entry-point"]';
const MANAGE_MODAL_SELECTOR = '[role="dialog"][aria-label="Manage reservation"]';
const MODAL_WAIT_MS = 2000;
const MODAL_POLL_MS = 50;

// Material Design vpn_key — visually distinct from Airbnb's keypad icon.
const KEY_PATH = "M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z";
// Material Design history — clock with an arrow, signals "previous".
const HISTORY_PATH = "M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z";
// Material Design person — filled silhouette for the property manager.
const PERSON_PATH = "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z";

// Icon set for the Extras row. Each entry: payload key (hasX == "Yes"),
// label for hover/accessibility, and a 24x24 Material-ish SVG path.
const EXTRAS_ICONS = [
    {
        field: "hasPoolHeat",
        label: "Pool Heat",
        // Material pool
        path: "M22 21c-1.11 0-1.73-.37-2.18-.64-.37-.23-.6-.36-1.15-.36s-.78.13-1.15.36c-.46.27-1.07.64-2.18.64s-1.73-.37-2.18-.64c-.37-.23-.6-.36-1.15-.36s-.78.13-1.15.36c-.46.27-1.08.64-2.19.64-1.11 0-1.73-.37-2.18-.64-.37-.23-.6-.36-1.15-.36s-.78.13-1.15.36c-.46.27-1.08.64-2.19.64v-2c.56 0 .78-.13 1.15-.36.46-.27 1.08-.64 2.19-.64s1.73.37 2.18.64c.37.23.59.36 1.15.36.55 0 .78-.13 1.15-.36.46-.27 1.08-.64 2.19-.64 1.11 0 1.73.37 2.18.64.37.23.59.36 1.15.36s.78-.13 1.15-.36c.45-.27 1.07-.64 2.18-.64s1.73.37 2.18.64c.37.23.6.36 1.15.36v2zm0-4.5c-1.11 0-1.73-.37-2.18-.64-.37-.23-.6-.36-1.15-.36s-.78.13-1.15.36c-.46.27-1.07.64-2.18.64s-1.73-.37-2.18-.64c-.37-.23-.6-.36-1.15-.36s-.78.13-1.15.36c-.46.27-1.08.64-2.19.64-1.11 0-1.73-.37-2.18-.64-.37-.23-.6-.36-1.15-.36s-.78.13-1.15.36c-.46.27-1.08.64-2.19.64v-2c.56 0 .78-.13 1.15-.36.46-.27 1.08-.64 2.19-.64s1.73.37 2.18.64c.37.23.59.36 1.15.36.55 0 .78-.13 1.15-.36.46-.27 1.08-.64 2.19-.64 1.11 0 1.73.37 2.18.64.37.23.59.36 1.15.36s.78-.13 1.15-.36c.45-.27 1.07-.64 2.18-.64s1.73.37 2.18.64c.37.23.6.36 1.15.36v2zM8.67 12c.56 0 .78.13 1.15.36.46.27 1.07.64 2.18.64s1.73-.37 2.18-.64c.37-.23.59-.36 1.15-.36s.78.13 1.15.36c.12.07.26.15.41.23L10.48 5C8.93 3.45 7.5 2.99 5 3v2.5c1.82-.01 2.89.37 4 1.5l1 1-3.25 3.25c.31.12.56.27.77.39.37.23.59.36 1.15.36z",
    },
    {
        field: "hasBBQGrill",
        label: "BBQ Grill",
        // Material outdoor_grill (simplified)
        path: "M17.66 11.2c-.23-.3-.51-.56-.77-.82-.65-.6-1.39-1.03-2.01-1.66-1.45-1.46-1.77-3.87-.85-5.72-.92.23-1.73.75-2.42 1.39-2.51 2.34-3.5 5.98-2.34 9.24.04.11.08.22.08.36 0 .24-.17.46-.39.55-.25.11-.51.04-.72-.13-.06-.05-.1-.1-.14-.17-1.07-1.35-1.24-3.29-.52-4.84C5.78 10.64 4 13.05 4 15.5c0 .75.16 1.47.44 2.12.95 2.24 3.14 3.82 5.66 3.82 1.62 0 3.29-.54 4.52-1.62 2.04-1.74 2.87-4.72 1.98-7.22-.11-.28-.32-.53-.52-.77l-.17-.24-.05-.08c-.13-.22-.19-.3-.2-.31zm-5.94 7.2c-.46.35-1.22.71-1.82.81 1.86-.32 2.94-1.62 3.27-2.88.29-1.06-.14-1.94-.33-3-.18-1.02.06-1.99.89-2.64.45.95.44 2.06-.17 3.01.62-.06 1.27-.27 1.69-.61.21.85.06 1.92-.35 2.77-.88 1.74-2.81 2.41-3.18 2.54z",
    },
    {
        field: "hasPet",
        label: "Pet",
        // Material pets
        path: "M4.5 9.5m-2.5 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0M9 5.5m-2.5 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0M15 5.5m-2.5 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0M19.5 9.5m-2.5 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0M17.34 14.86c-.87-1.02-1.6-1.89-2.48-2.91-.46-.54-1.05-1.08-1.75-1.32-.11-.04-.22-.07-.33-.09-.25-.04-.52-.04-.78-.04s-.53 0-.79.05c-.11.02-.22.05-.33.09-.7.24-1.28.78-1.75 1.32-.87 1.02-1.6 1.89-2.48 2.91-1.31 1.31-2.92 2.76-2.62 4.79.29 1.02 1.02 2.03 2.33 2.32.73.15 3.06-.44 5.54-.44h.18c2.48 0 4.81.58 5.54.44 1.31-.29 2.04-1.31 2.33-2.32.31-2.04-1.3-3.49-2.61-4.8z",
    },
    {
        field: "hasEarlyCheckin",
        label: "Early Check-in",
        // Material alarm
        path: "M22 5.72l-4.6-3.86-1.29 1.53 4.6 3.86L22 5.72zM7.88 3.39L6.6 1.86 2 5.71l1.29 1.53 4.59-3.85zM12.5 8H11v6l4.75 2.85.75-1.23-4-2.37V8zM12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z",
    },
    {
        field: "hasLateCheckout",
        label: "Late Checkout",
        // Material nights_stay
        path: "M11.1 12.08c-2.33-4.51-.5-8.48.53-10.07C6.27 2.2 1.98 6.59 1.98 12c0 .14.02.28.02.42.62-.27 1.29-.42 2-.42 1.66 0 3.18.83 4.1 2.15A4.01 4.01 0 0 1 11 18c0 1.52-.87 2.83-2.12 3.51.98.32 2.03.5 3.11.5 3.5 0 6.58-1.8 8.37-4.52-2.36.23-6.98-.97-9.26-5.41zM7 16h-.18C6.4 14.84 5.3 14 4 14c-1.66 0-3 1.34-3 3s1.34 3 3 3h3c1.1 0 2-.9 2-2s-.9-2-2-2z",
    },
    {
        field: "hasLaundry",
        label: "Laundry",
        // Material local_laundry_service
        path: "M9.17 16.83c1.56 1.56 4.1 1.56 5.66 0 1.56-1.56 1.56-4.1 0-5.66l-5.66 5.66zM18 2.01L6 2c-1.11 0-2 .89-2 2v16c0 1.11.89 2 2 2h12c1.11 0 2-.89 2-2V4c0-1.11-.89-1.99-2-1.99zM10 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM7 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm5 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z",
    },
];

let lastText = "";
let debounceTimer = null;
let lastReservationSignature = "";
let reservationInFlight = false;

// ============ Listing title extraction ============

function extractListingText() {
    const panel = document.getElementById("thread_details_panel");
    if (!panel) return "";

    const heading = panel.querySelector("h3");
    if (!heading || !heading.parentElement) return "";

    const siblings = Array.from(heading.parentElement.children);
    const headingIdx = siblings.indexOf(heading);
    const titleEl = siblings[headingIdx + 2];
    if (!titleEl) return "";

    return (titleEl.textContent || "").trim();
}

function extractGuestName() {
    const panel = document.getElementById("thread_details_panel");
    if (!panel) return "";
    // The Guests section is rendered behind a button with
    // data-testid="hosting-details-whos-coming". The first <li> inside it
    // holds the primary guest with their full name in a div whose text is
    // just the name (no children).
    const guestsBtn = panel.querySelector('[data-testid="hosting-details-whos-coming"]');
    if (!guestsBtn) return "";
    const firstLi = guestsBtn.querySelector("ul li");
    if (!firstLi) return "";
    // Walk the descendants looking for the first text-only div that isn't
    // "Enjoys …" trivia text. The name div is wrapped in class t183ylsr in
    // the captured HTML — we don't depend on the class, only on it being
    // the first leaf-text div inside the first list item.
    const candidates = firstLi.querySelectorAll("div");
    for (const d of candidates) {
        if (d.children.length !== 0) continue;
        const text = (d.textContent || "").trim();
        if (!text) continue;
        // Skip obvious non-name fields that may appear as leaf divs.
        if (/^enjoys\b/i.test(text)) continue;
        if (/infants?\s+attend/i.test(text)) continue;
        if (/child|infant/i.test(text)) continue;
        return text;
    }
    return "";
}

async function publishListingTitle() {
    const text = extractListingText();
    if (!text || text === lastText) return;
    const isSwitch = lastText !== "";
    lastText = text;
    const guestName = extractGuestName();
    try {
        const writes = { [LISTING_KEY]: { text, ts: Date.now() } };
        if (guestName) {
            writes[GUEST_NAME_KEY] = { name: guestName, ts: Date.now() };
        }
        await chrome.storage.local.set(writes);
        // Switching conversations — drop the previous conversation's
        // reservation/previous-stay caches so we don't show the wrong
        // Previous Gate Code on the new panel.
        if (isSwitch) {
            lastReservationSignature = "";
            const removeKeys = [RESERVATION_KEY, PREVIOUS_KEY, PROPERTY_MANAGER_KEY, EXTRAS_KEY];
            if (!guestName) removeKeys.push(GUEST_NAME_KEY);
            await chrome.storage.local.remove(removeKeys);
        }
    } catch (err) {
        console.warn("Resort Info: failed to write listing title", err);
    }
}

// ============ Gate code button injection ============

function findSuggestedDoorCodeButton() {
    const panel = document.getElementById("thread_details_panel");
    if (!panel) return null;
    const buttons = panel.querySelectorAll("button");
    for (const btn of buttons) {
        if (btn.id === BUTTON_ID) continue;
        if (/suggested\s+door\s+code/i.test(btn.textContent || "")) return btn;
    }
    return null;
}

function buildGateCodeButton(sourceBtn, code) {
    const newBtn = sourceBtn.cloneNode(true);
    newBtn.id = BUTTON_ID;
    newBtn.dataset.gateCode = code;

    // Replace the label "Suggested door code" → "Gate Code" and update the
    // value div sitting next to it.
    let labelDiv = null;
    const divs = newBtn.querySelectorAll("div");
    for (const div of divs) {
        if (div.children.length === 0 &&
            /suggested\s+door\s+code/i.test((div.textContent || "").trim())) {
            labelDiv = div;
            break;
        }
    }
    if (labelDiv) {
        labelDiv.textContent = "Gate Code";
        const codeDiv = labelDiv.nextElementSibling;
        if (codeDiv) codeDiv.textContent = code;
    }

    // Swap the keypad icon for a key icon.
    const svg = newBtn.querySelector("svg");
    if (svg) {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        svg.setAttribute("viewBox", "0 0 24 24");
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", KEY_PATH);
        svg.appendChild(path);
    }

    return newBtn;
}

function removeInjected() {
    const existingBtn = document.getElementById(BUTTON_ID);
    const existingDivider = document.getElementById(DIVIDER_ID);
    if (existingBtn) existingBtn.remove();
    if (existingDivider) existingDivider.remove();
}

function injectGateCodeButton(match) {
    if (!match || !match.id) {
        removeInjected();
        return;
    }

    const sourceBtn = findSuggestedDoorCodeButton();
    if (!sourceBtn) {
        // Without the anchor we can't match the surrounding layout.
        removeInjected();
        return;
    }

    const codeValue = match.gate_code || "No gate code";
    const existing = document.getElementById(BUTTON_ID);

    // Already injected in the right place with the right value — skip.
    if (existing &&
        existing.parentNode === sourceBtn.parentNode &&
        existing.dataset.gateCode === codeValue) {
        return;
    }

    const newBtn = buildGateCodeButton(sourceBtn, codeValue);

    if (existing) {
        existing.replaceWith(newBtn);
        return;
    }

    // Clone the empty divider div that sits before the source button so the
    // visual rhythm matches the rest of the panel.
    const sourceDivider = sourceBtn.previousElementSibling;
    let divider = null;
    if (sourceDivider && sourceDivider.tagName === "DIV" &&
        sourceDivider.children.length === 0) {
        divider = sourceDivider.cloneNode(true);
        divider.id = DIVIDER_ID;
    }

    if (divider) {
        sourceBtn.after(divider, newBtn);
    } else {
        sourceBtn.after(newBtn);
    }
}

async function injectFromStorage() {
    try {
        const obj = await chrome.storage.local.get(MATCHED_KEY);
        injectGateCodeButton(obj[MATCHED_KEY]);
    } catch (err) {
        console.warn("Resort Info: failed to read matched resort", err);
    }
}

// ============ Previous-stay gate code injection ============
//
// Same shape as the current gate-code button, placed immediately after it.
// The label is "Previous Gate Code" and the value is the door code MAPRO
// stored for the prior reservation on the same property.

function removePreviousInjected() {
    const btn = document.getElementById(PREV_BUTTON_ID);
    const div = document.getElementById(PREV_DIVIDER_ID);
    if (btn) btn.remove();
    if (div) div.remove();
}

function injectPreviousGateCodeButton(prev) {
    if (!prev) {
        removePreviousInjected();
        return;
    }

    // Anchor relative to the already-injected current gate-code button so
    // the previous card always sits right after it.
    const anchor = document.getElementById(BUTTON_ID);
    if (!anchor) {
        removePreviousInjected();
        return;
    }

    const codeValue = prev.door_code ? prev.door_code : "No Code";
    const existing = document.getElementById(PREV_BUTTON_ID);
    if (existing &&
        existing.parentNode === anchor.parentNode &&
        existing.dataset.gateCode === codeValue) {
        return;
    }

    const newBtn = anchor.cloneNode(true);
    newBtn.id = PREV_BUTTON_ID;
    newBtn.dataset.gateCode = codeValue;

    // Relabel.
    const divs = newBtn.querySelectorAll("div");
    for (const div of divs) {
        if (div.children.length === 0 &&
            /gate\s+code/i.test((div.textContent || "").trim())) {
            div.textContent = "Previous Gate Code";
            const codeDiv = div.nextElementSibling;
            if (codeDiv) codeDiv.textContent = codeValue;
            break;
        }
    }

    // Swap the key icon for a history (clock-with-arrow) icon so the two
    // gate-code cards are visually distinguishable at a glance.
    const svg = newBtn.querySelector("svg");
    if (svg) {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        svg.setAttribute("viewBox", "0 0 24 24");
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", HISTORY_PATH);
        svg.appendChild(path);
    }

    if (existing) {
        existing.replaceWith(newBtn);
        return;
    }

    // Clone the divider preceding the current gate-code button for rhythm.
    const sourceDivider = document.getElementById(DIVIDER_ID);
    let divider = null;
    if (sourceDivider) {
        divider = sourceDivider.cloneNode(true);
        divider.id = PREV_DIVIDER_ID;
    }

    if (divider) {
        anchor.after(divider, newBtn);
    } else {
        anchor.after(newBtn);
    }
}

async function injectPreviousFromStorage() {
    try {
        const obj = await chrome.storage.local.get(PREVIOUS_KEY);
        injectPreviousGateCodeButton(obj[PREVIOUS_KEY]);
    } catch (err) {
        console.warn("Resort Info: failed to read previous reservation", err);
    }
}

// ============ Property Manager row ============

function removePropertyManagerInjected() {
    const btn = document.getElementById(PM_BUTTON_ID);
    const div = document.getElementById(PM_DIVIDER_ID);
    if (btn) btn.remove();
    if (div) div.remove();
}

function injectPropertyManagerRow(pm) {
    if (!pm || !pm.name) {
        removePropertyManagerInjected();
        return;
    }

    // Anchor after the Previous Gate Code card if present, otherwise after
    // the current Gate Code card. If neither exists, bail.
    const anchor = document.getElementById(PREV_BUTTON_ID)
        || document.getElementById(BUTTON_ID);
    if (!anchor) {
        removePropertyManagerInjected();
        return;
    }

    const value = pm.name;
    const existing = document.getElementById(PM_BUTTON_ID);
    if (existing &&
        existing.parentNode === anchor.parentNode &&
        existing.dataset.pmName === value) {
        return;
    }

    const newBtn = anchor.cloneNode(true);
    newBtn.id = PM_BUTTON_ID;
    newBtn.dataset.pmName = value;
    delete newBtn.dataset.gateCode;

    // Relabel.
    const divs = newBtn.querySelectorAll("div");
    for (const div of divs) {
        if (div.children.length === 0 &&
            /gate\s+code/i.test((div.textContent || "").trim())) {
            div.textContent = "Property Manager";
            const valDiv = div.nextElementSibling;
            if (valDiv) valDiv.textContent = value;
            break;
        }
    }

    // Swap icon for a person silhouette.
    const svg = newBtn.querySelector("svg");
    if (svg) {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        svg.setAttribute("viewBox", "0 0 24 24");
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", PERSON_PATH);
        svg.appendChild(path);
    }

    if (existing) {
        existing.replaceWith(newBtn);
        return;
    }

    const sourceDivider = document.getElementById(PREV_DIVIDER_ID)
        || document.getElementById(DIVIDER_ID);
    let divider = null;
    if (sourceDivider) {
        divider = sourceDivider.cloneNode(true);
        divider.id = PM_DIVIDER_ID;
    }

    if (divider) {
        anchor.after(divider, newBtn);
    } else {
        anchor.after(newBtn);
    }
}

async function injectPropertyManagerFromStorage() {
    try {
        const obj = await chrome.storage.local.get(PROPERTY_MANAGER_KEY);
        injectPropertyManagerRow(obj[PROPERTY_MANAGER_KEY]);
    } catch (err) {
        console.warn("Resort Info: failed to read property manager", err);
    }
}

// ============ Extras row (pool heat, BBQ, pet, etc.) ============

function removeExtrasInjected() {
    const btn = document.getElementById(EXTRAS_BUTTON_ID);
    const div = document.getElementById(EXTRAS_DIVIDER_ID);
    if (btn) btn.remove();
    if (div) div.remove();
}

function collectActiveExtras(extras) {
    if (!extras) return [];
    const active = [];
    for (const def of EXTRAS_ICONS) {
        const val = extras[def.field];
        if (val === "Yes" || val === true) active.push(def);
    }
    return active;
}

function injectExtrasRow(extras) {
    const active = collectActiveExtras(extras);
    if (active.length === 0) {
        removeExtrasInjected();
        return;
    }

    // Anchor after Property Manager → Previous → current Gate Code.
    const anchor = document.getElementById(PM_BUTTON_ID)
        || document.getElementById(PREV_BUTTON_ID)
        || document.getElementById(BUTTON_ID);
    if (!anchor) {
        removeExtrasInjected();
        return;
    }

    const signature = active.map(a => a.field).join(",");
    const existing = document.getElementById(EXTRAS_BUTTON_ID);
    if (existing &&
        existing.parentNode === anchor.parentNode &&
        existing.dataset.extras === signature) {
        return;
    }

    const newBtn = anchor.cloneNode(true);
    newBtn.id = EXTRAS_BUTTON_ID;
    newBtn.dataset.extras = signature;
    delete newBtn.dataset.gateCode;
    delete newBtn.dataset.pmName;

    // Relabel the title to "Extras". The value slot is replaced below with
    // a row of icons instead of plain text.
    let valueDiv = null;
    const divs = newBtn.querySelectorAll("div");
    for (const div of divs) {
        if (div.children.length !== 0) continue;
        const text = (div.textContent || "").trim();
        if (!text) continue;
        // First leaf div inside the button body is the title.
        div.textContent = "Extras";
        valueDiv = div.nextElementSibling;
        break;
    }

    if (valueDiv) {
        // Replace the text value with a flex row of mini SVG icons.
        valueDiv.textContent = "";
        valueDiv.style.display = "flex";
        valueDiv.style.gap = "8px";
        valueDiv.style.alignItems = "center";
        valueDiv.style.flexWrap = "wrap";
        for (const def of active) {
            const svg = document.createElementNS(SVG_NS, "svg");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("aria-hidden", "true");
            svg.style.display = "block";
            svg.style.width = "18px";
            svg.style.height = "18px";
            svg.style.fill = "currentColor";
            const title = document.createElementNS(SVG_NS, "title");
            title.textContent = def.label;
            svg.appendChild(title);
            const p = document.createElementNS(SVG_NS, "path");
            p.setAttribute("d", def.path);
            svg.appendChild(p);
            valueDiv.appendChild(svg);
        }
    }

    // Replace the header icon with a generic "extras" bag / card icon —
    // reuse the first icon in the active list so the row visually hints at
    // what's inside without needing a separate icon slot.
    const headerSvg = newBtn.querySelector("svg");
    if (headerSvg) {
        while (headerSvg.firstChild) headerSvg.removeChild(headerSvg.firstChild);
        headerSvg.setAttribute("viewBox", "0 0 24 24");
        const path = document.createElementNS(SVG_NS, "path");
        // Material "card_giftcard" — stylised gift/extras icon.
        path.setAttribute("d", "M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z");
        headerSvg.appendChild(path);
    }

    if (existing) {
        existing.replaceWith(newBtn);
        return;
    }

    const sourceDivider = document.getElementById(PM_DIVIDER_ID)
        || document.getElementById(PREV_DIVIDER_ID)
        || document.getElementById(DIVIDER_ID);
    let divider = null;
    if (sourceDivider) {
        divider = sourceDivider.cloneNode(true);
        divider.id = EXTRAS_DIVIDER_ID;
    }

    if (divider) {
        anchor.after(divider, newBtn);
    } else {
        anchor.after(newBtn);
    }
}

async function injectExtrasFromStorage() {
    try {
        const obj = await chrome.storage.local.get(EXTRAS_KEY);
        injectExtrasRow(obj[EXTRAS_KEY]);
    } catch (err) {
        console.warn("Resort Info: failed to read extras", err);
    }
}

// ============ Reservation details capture ============
//
// The confirmation code, phone number, and booking date live inside the
// "Manage reservation" modal that only opens when the "..." button in the
// details panel header is clicked. We open it invisibly, read the rows,
// and close it. A signature check (listing text + guest panel text) prevents
// repeatedly re-opening the modal on every mutation.

function currentSignature() {
    const panel = document.getElementById("thread_details_panel");
    if (!panel) return "";
    // Use the visible listing title + datespan as a stable key for the
    // currently open conversation.
    return (panel.textContent || "").slice(0, 300);
}

function waitFor(selector, timeout) {
    return new Promise((resolve) => {
        const start = Date.now();
        const tick = () => {
            const el = document.querySelector(selector);
            if (el) { resolve(el); return; }
            if (Date.now() - start >= timeout) { resolve(null); return; }
            setTimeout(tick, MODAL_POLL_MS);
        };
        tick();
    });
}

function waitForGone(selector, timeout) {
    return new Promise((resolve) => {
        const start = Date.now();
        const tick = () => {
            if (!document.querySelector(selector)) { resolve(true); return; }
            if (Date.now() - start >= timeout) { resolve(false); return; }
            setTimeout(tick, MODAL_POLL_MS);
        };
        tick();
    });
}

function parseManageModal(modal) {
    const out = {};

    const codeRow = modal.querySelector("#hosting-details-action-row-confirmation-code");
    if (codeRow) {
        const texts = Array.from(codeRow.querySelectorAll("div"))
            .map(d => (d.textContent || "").trim())
            .filter(Boolean);
        const idx = texts.indexOf("Confirmation code");
        if (idx >= 0 && texts[idx + 1]) {
            out.confirmation_code = texts[idx + 1];
        }
    }

    const phoneRows = modal.querySelectorAll('[id^="hosting-details-action-row-"][id$="-phone-number"]');
    for (const row of phoneRows) {
        const texts = Array.from(row.querySelectorAll("div"))
            .map(d => (d.textContent || "").trim())
            .filter(Boolean);
        // Title is "<Name>'s phone number" → next is the number.
        const titleIdx = texts.findIndex(t => /phone number$/i.test(t));
        if (titleIdx >= 0 && texts[titleIdx + 1]) {
            out.guest_name = texts[titleIdx].replace(/'s phone number$/i, "").trim();
            out.phone = texts[titleIdx + 1];
            break;
        }
    }

    const bookingRow = modal.querySelector("#hosting-details-action-row-booking-date");
    if (bookingRow) {
        const texts = Array.from(bookingRow.querySelectorAll("div"))
            .map(d => (d.textContent || "").trim())
            .filter(Boolean);
        const idx = texts.indexOf("Booking date");
        if (idx >= 0 && texts[idx + 1]) {
            out.booking_date = texts[idx + 1];
        }
    }

    // Listing id from the "View on calendar" link.
    const calLink = modal.querySelector('a[href^="/multicalendar/"]');
    if (calLink) {
        const m = calLink.getAttribute("href").match(/\/multicalendar\/(\d+)/);
        if (m) out.listing_id = m[1];
    }

    // Confirmation code also appears in /reservation/change?code=... — use as
    // a fallback if the row parse missed.
    if (!out.confirmation_code) {
        const changeLink = modal.querySelector('a[href*="/reservation/change?code="]');
        if (changeLink) {
            const m = changeLink.getAttribute("href").match(/code=([A-Z0-9]+)/);
            if (m) out.confirmation_code = m[1];
        }
    }

    return out;
}

async function captureReservationDetails() {
    if (reservationInFlight) return;
    const panel = document.getElementById("thread_details_panel");
    if (!panel) return;

    // Lazy mode: only scrape if the user already has the "Manage reservation"
    // modal open. We never auto-click the "..." button — the reservation
    // details capture is fully opt-in.
    const modal = document.querySelector(MANAGE_MODAL_SELECTOR);
    if (!modal) return;

    const sig = currentSignature();
    if (!sig || sig === lastReservationSignature) return;

    reservationInFlight = true;
    try {
        const details = parseManageModal(modal);
        if (details && details.confirmation_code) {
            lastReservationSignature = sig;
            await chrome.storage.local.set({
                [RESERVATION_KEY]: { ...details, ts: Date.now() },
            });
        }
    } catch (err) {
        console.warn("Resort Info: reservation capture failed", err);
    } finally {
        reservationInFlight = false;
    }
}

// ============ Mutation loop ============

function scheduleUpdate() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        publishListingTitle();
        // Re-inject in case Airbnb's SPA tore down or re-mounted the panel.
        injectFromStorage();
        injectPreviousFromStorage();
        injectPropertyManagerFromStorage();
        injectExtrasFromStorage();
        // Fire-and-forget — it self-guards against concurrent runs.
        captureReservationDetails();
    }, DEBOUNCE_MS);
}

scheduleUpdate();

const observer = new MutationObserver(scheduleUpdate);
observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[MATCHED_KEY]) {
        injectGateCodeButton(changes[MATCHED_KEY].newValue);
    }
    if (changes[PREVIOUS_KEY]) {
        injectPreviousGateCodeButton(changes[PREVIOUS_KEY].newValue);
    }
    if (changes[PROPERTY_MANAGER_KEY]) {
        injectPropertyManagerRow(changes[PROPERTY_MANAGER_KEY].newValue);
    }
    if (changes[EXTRAS_KEY]) {
        injectExtrasRow(changes[EXTRAS_KEY].newValue);
    }
    // When the current reservation changes, clear the stale previous one so
    // the UI doesn't show last conversation's previous code next to the new
    // current code until the background resolves the new previous.
    if (changes[RESERVATION_KEY]) {
        const next = changes[RESERVATION_KEY].newValue;
        const prev = changes[RESERVATION_KEY].oldValue;
        const nextCode = next && next.confirmation_code;
        const prevCode = prev && prev.confirmation_code;
        if (nextCode !== prevCode) {
            chrome.storage.local.remove([PREVIOUS_KEY, PROPERTY_MANAGER_KEY, EXTRAS_KEY]);
        }
    }
});

// ============ Conversation scraping ============
//
// Airbnb renders messages in a container marked with
// data-testid="message-list". Each row is a div with role="group" and an
// aria-label of the form "Name sent Message. Sent Time" (or
// "Most Recent Message. Name sent Message. Sent Time").
//
// Host messages include the company name in parentheses, e.g.
// "Name (Master Vacation Homes)". Guest messages don't.

function scrapeMessages() {
    const messageList = document.querySelector('[data-testid="message-list"]');
    if (!messageList) {
        throw new Error("Could not find message thread on this page.");
    }

    const items = messageList.querySelectorAll('[role="group"][data-item-id]');
    if (!items || items.length === 0) {
        throw new Error("No messages found in the conversation.");
    }

    const messages = [];
    items.forEach((item) => {
        const label = item.getAttribute("aria-label");
        if (!label) return;

        // Skip system messages and conversation markers.
        if (label.indexOf("Airbnb service says") !== -1) return;
        if (label.indexOf("Start of Conversation") !== -1) return;

        const cleanLabel = label.replace(/^Most Recent Message\.\s*/, "");
        const sentMatch = cleanLabel.match(/^(.+?)\s+sent\s+(.+?)\.\s+Sent\s+/);
        if (!sentMatch) return;

        let senderName = sentMatch[1].trim();
        let messageText = sentMatch[2].trim();

        if (messageText.endsWith(".")) {
            messageText = messageText.slice(0, -1).trim();
        }

        // Clean up unicode bidi marks that Airbnb wraps around some names.
        senderName = senderName.replace(/[\u2068\u2069]/g, "");

        // Host messages contain "Master Vacation Homes" in the sender name.
        const isHost = senderName.toLowerCase().indexOf("master vacation homes") !== -1;

        // Airbnb collapses hard line breaks into ".." inside the aria-label.
        messageText = messageText.replace(/\.\./g, "\n");

        messages.push({
            role: isHost ? "host" : "guest",
            sender: senderName,
            text: messageText,
        });
    });

    if (messages.length === 0) {
        throw new Error("No messages found in the conversation.");
    }

    return messages;
}

// Respond to scrape requests relayed from the background worker.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.action === "scrapeConversation") {
        try {
            sendResponse({ success: true, messages: scrapeMessages() });
        } catch (err) {
            sendResponse({ success: false, error: err && err.message });
        }
        return true; // keep channel open for the sync response above
    }
    return false;
});
