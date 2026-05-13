// MasterBot Bridge — Slash command for Airbnb message inputs.
//
// On any editable field inside airbnb.com (host messages, etc.) the
// operator can type "/" to pop up a dropdown of their MasterBot
// templates. Typing more narrows the list ("/office" → only templates
// containing "office"). Picking one inserts:
//
//     <template description>\n\n<signature line>\n<yourName>
//
// at the cursor, replacing the "/<query>" trigger. Mirrors what the
// right-click-on-a-template action does on the MasterBot page.
//
// The data (templates, slug map, signature, name) is pushed to the
// extension by the MasterBot site via runtime.sendMessage and cached
// under chrome.storage.local["airbnbSlashCache"]. This content script
// just reads from that cache — no Firebase auth involved here.

(function () {
    "use strict";

    const CACHE_KEY = "airbnbSlashCache";
    const ROOT_ID = "masterbot-slash-root";
    // No upper bound — the dropdown panel scrolls vertically already.
    const MAX_ITEMS = Infinity;

    let cache = null;          // { templates, slugByName, yourName, signatureText }
    let active = null;         // { input, trigger: { start, end }, query }
    let highlighted = 0;
    let dropdown = null;       // host element with shadow DOM
    let shadow = null;

    // ----- Cache wiring -----

    chrome.storage.local.get([CACHE_KEY], (res) => {
        cache = (res && res[CACHE_KEY]) || null;
        const n = cache && Array.isArray(cache.templates) ? cache.templates.length : 0;
        console.log(`[MasterBot] slash command loaded — ${n} template(s) cached. Trigger: type "/" in any input.`);
        if (!n) {
            console.log("[MasterBot] No templates cached yet. Open https://alissonrochah.github.io/messages.html in another tab while signed in to seed the cache.");
        }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local" || !changes[CACHE_KEY]) return;
        cache = changes[CACHE_KEY].newValue || null;
        const n = cache && Array.isArray(cache.templates) ? cache.templates.length : 0;
        console.log(`[MasterBot] template cache refreshed — ${n} template(s).`);
    });

    // ----- Editable detection -----

    function isEditable(el) {
        if (!el) return false;
        if (el.tagName === "TEXTAREA") return true;
        if (el.tagName === "INPUT") {
            const t = (el.type || "text").toLowerCase();
            return t === "text" || t === "search" || t === "" || t === "url" || t === "email";
        }
        if (el.isContentEditable) return true;
        return false;
    }

    function getValueAndCaret(el) {
        if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
            return { value: el.value, caret: el.selectionStart || 0 };
        }
        // contenteditable — flatten text and approximate caret using Selection
        const sel = window.getSelection();
        const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
        const text = el.innerText || "";
        if (!range) return { value: text, caret: text.length };
        // Walk text nodes up to the range start to count chars.
        const pre = range.cloneRange();
        pre.selectNodeContents(el);
        pre.setEnd(range.endContainer, range.endOffset);
        const caret = pre.toString().length;
        return { value: text, caret };
    }

    function findTrigger(value, caret) {
        // Look back from caret to find a "/" at the start of a token
        // (start of string or after whitespace). Anything in between
        // must be word chars (letters / digits / hyphen).
        let i = caret - 1;
        let chars = [];
        while (i >= 0) {
            const ch = value[i];
            if (ch === "/") {
                const before = i > 0 ? value[i - 1] : "";
                if (before === "" || /\s/.test(before)) {
                    return { start: i, end: caret, query: chars.reverse().join("") };
                }
                return null;
            }
            if (!/[\w-]/.test(ch)) return null;
            chars.push(ch);
            i--;
        }
        return null;
    }

    // ----- Dropdown lifecycle -----

    function ensureDropdown() {
        if (dropdown) return;
        dropdown = document.createElement("div");
        dropdown.id = ROOT_ID;
        dropdown.style.cssText = "position:fixed; z-index:2147483647; top:0; left:0;";
        shadow = dropdown.attachShadow({ mode: "open" });
        shadow.innerHTML = `
            <style>
                :host { all: initial; }
                .mb-pop {
                    position: fixed;
                    background: #1a1a1a;
                    color: #fff;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 10px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
                    overflow: hidden;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    min-width: 280px;
                    max-width: 460px;
                }
                .mb-head {
                    padding: 6px 12px;
                    font-size: 10px;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.5);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }
                .mb-list {
                    max-height: 260px;
                    overflow-y: auto;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
                }
                .mb-list::-webkit-scrollbar {
                    width: 6px;
                }
                .mb-list::-webkit-scrollbar-track {
                    background: transparent;
                }
                .mb-list::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 3px;
                }
                .mb-list::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.35);
                }
                .mb-item {
                    display: block;
                    width: 100%;
                    text-align: left;
                    background: transparent;
                    color: #fff;
                    border: none;
                    padding: 9px 12px;
                    font-size: 13px;
                    cursor: pointer;
                    font-family: inherit;
                    line-height: 1.3;
                    border-left: 2px solid transparent;
                }
                .mb-item.active,
                .mb-item:hover {
                    background: rgba(255, 255, 255, 0.07);
                    border-left-color: #6aa9ff;
                }
                .mb-slug {
                    color: rgba(255, 255, 255, 0.5);
                    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                    font-size: 11px;
                    margin-right: 8px;
                }
                .mb-empty {
                    padding: 14px 12px;
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.5);
                }
            </style>
            <div class="mb-pop">
                <div class="mb-head" id="mb-head">MasterBot · type to filter</div>
                <div class="mb-list" id="mb-list"></div>
            </div>
        `;
        document.documentElement.appendChild(dropdown);
    }

    function hideDropdown() {
        if (dropdown) dropdown.style.display = "none";
        active = null;
    }

    function showDropdownAt(input) {
        ensureDropdown();
        dropdown.style.display = "block";
        // Park the popup off-screen briefly so the browser computes its
        // real height with the new content before we measure & anchor.
        const pop = shadow.querySelector(".mb-pop");
        pop.style.visibility = "hidden";
        pop.style.top = "-9999px";
        pop.style.left = "0px";
    }

    function positionDropdown(input) {
        const pop = shadow.querySelector(".mb-pop");
        const rect = input.getBoundingClientRect();
        const popRect = pop.getBoundingClientRect();
        const popHeight = popRect.height || 100;
        const popWidth = popRect.width || 320;
        const margin = 8;
        // Prefer above the input; flip below if there isn't room.
        let top = rect.top - popHeight - margin;
        if (top < 8) top = Math.min(window.innerHeight - popHeight - 8, rect.bottom + margin);
        if (top < 8) top = 8;
        let left = rect.left;
        if (left + popWidth > window.innerWidth - 8) {
            left = Math.max(8, window.innerWidth - popWidth - 8);
        }
        pop.style.top = top + "px";
        pop.style.left = left + "px";
        pop.style.visibility = "visible";
    }

    function filteredTemplates(query) {
        if (!cache || !Array.isArray(cache.templates)) return [];
        const q = String(query || "").toLowerCase();
        const slugByName = cache.slugByName || {};
        const scored = [];
        for (const t of cache.templates) {
            const slug = (t.category && slugByName[t.category]) || "";
            const hay = `${slug} ${t.category || ""} ${t.name || ""}`.toLowerCase();
            if (!q || hay.includes(q)) scored.push({ t, slug });
        }
        return scored.slice(0, MAX_ITEMS);
    }

    function renderItems(query) {
        const list = shadow.getElementById("mb-list");
        const head = shadow.getElementById("mb-head");
        const items = filteredTemplates(query);
        if (!items.length) {
            list.innerHTML = `<div class="mb-empty">No templates match "/${escapeHtml(query)}"</div>`;
            head.textContent = "MasterBot";
            highlighted = 0;
            return;
        }
        if (highlighted >= items.length) highlighted = items.length - 1;
        if (highlighted < 0) highlighted = 0;
        head.textContent = `MasterBot · ${items.length} match${items.length === 1 ? "" : "es"}`;
        list.innerHTML = items.map((it, i) => {
            const slugHtml = it.slug ? `<span class="mb-slug">${escapeHtml(it.slug)}</span>` : "";
            return `<button type="button" class="mb-item ${i === highlighted ? "active" : ""}" data-idx="${i}">${slugHtml}${escapeHtml(it.t.name)}</button>`;
        }).join("");
        list.querySelectorAll(".mb-item").forEach((el) => {
            el.addEventListener("mousedown", (ev) => {
                ev.preventDefault();
                pickItem(Number(el.dataset.idx));
            });
        });
    }

    function escapeHtml(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    // Signature is hardcoded here on purpose — the MasterBot settings
    // page can store a random pool, but the slash-command on Airbnb
    // always emits the same consistent closing.
    const HARDCODED_SIGNATURE = "Regards,";

    function buildInsertText(template) {
        const desc = String(template.description || "").replace(/\\n/g, "\n");
        const name = (cache && cache.yourName) ? String(cache.yourName) : "";
        let out = desc + "\n\n";
        out += HARDCODED_SIGNATURE + "\n";
        if (name) out += name;
        return out.trim();
    }

    function pickItem(idx) {
        if (!active) return;
        const items = filteredTemplates(active.query);
        const chosen = items[idx];
        if (!chosen) return;
        const text = buildInsertText(chosen.t);
        console.log("[MasterBot] picking template:", {
            name: chosen.t.name,
            descriptionLength: (chosen.t.description || "").length,
            descriptionPreview: (chosen.t.description || "").slice(0, 60),
            signatureFromCache: cache && cache.signature,
            yourNameFromCache: cache && cache.yourName,
            insertTextLength: text.length,
            insertTextPreview: text.slice(0, 120),
        });
        insertReplacement(active.input, active.trigger, text);
        hideDropdown();
    }

    function insertReplacement(input, trigger, text) {
        if (input.tagName === "TEXTAREA" || input.tagName === "INPUT") {
            const before = input.value.slice(0, trigger.start);
            const after = input.value.slice(trigger.end);
            input.value = before + text + after;
            const pos = before.length + text.length;
            try { input.setSelectionRange(pos, pos); } catch (_) { /* input type may not support */ }
            input.focus();
            // Some frameworks (Airbnb is React) require input event to sync state
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
            // contenteditable
            input.focus();
            const sel = window.getSelection();
            if (!sel) return;
            // Try the modern approach first — Selection + Range
            const { value, caret } = getValueAndCaret(input);
            // Find DOM range that corresponds to [trigger.start, trigger.end]
            const range = makeTextRange(input, trigger.start, trigger.end);
            if (!range) {
                document.execCommand("insertText", false, text);
                return;
            }
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand("insertText", false, text);
        }
    }

    function makeTextRange(root, startOffset, endOffset) {
        const range = document.createRange();
        let pos = 0;
        let startNode = null, startInNode = 0;
        let endNode = null, endInNode = 0;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        let n;
        while ((n = walker.nextNode())) {
            const len = n.nodeValue.length;
            if (!startNode && pos + len >= startOffset) {
                startNode = n;
                startInNode = startOffset - pos;
            }
            if (pos + len >= endOffset) {
                endNode = n;
                endInNode = endOffset - pos;
                break;
            }
            pos += len;
        }
        if (!startNode || !endNode) return null;
        range.setStart(startNode, startInNode);
        range.setEnd(endNode, endInNode);
        return range;
    }

    // ----- Event wiring -----

    function update(input) {
        const { value, caret } = getValueAndCaret(input);
        const trig = findTrigger(value, caret);
        if (!trig) { hideDropdown(); return; }
        active = { input, trigger: trig, query: trig.query };
        highlighted = 0;
        showDropdownAt(input);
        renderItems(active.query);
        // Position after render so we anchor based on the popup's real
        // height (varies a lot between 1 result and the full pool).
        positionDropdown(input);
    }

    document.addEventListener("input", (e) => {
        const el = e.target;
        if (!isEditable(el)) return;
        update(el);
    }, true);

    // Sanity tracer — toggle this off once everything works. Logs the
    // first time the operator focuses an editable element so we can
    // confirm the script is alive on whatever page they're testing.
    let tracedFocus = false;
    document.addEventListener("focusin", (e) => {
        if (tracedFocus) return;
        if (!isEditable(e.target)) return;
        tracedFocus = true;
        console.log("[MasterBot] focused an editable:", e.target.tagName, e.target);
    }, true);

    document.addEventListener("click", (e) => {
        if (!dropdown || dropdown.style.display === "none") return;
        // Click outside the dropdown closes it.
        if (!dropdown.contains(e.target)) hideDropdown();
    }, true);

    document.addEventListener("keydown", (e) => {
        if (!active) return;
        if (e.key === "ArrowDown") {
            highlighted++;
            renderItems(active.query);
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
        }
        if (e.key === "ArrowUp") {
            highlighted--;
            renderItems(active.query);
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
            pickItem(highlighted);
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
        }
        if (e.key === "Escape") {
            hideDropdown();
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
        }
    }, true);

    // Note: we intentionally do NOT call stopImmediatePropagation on the
    // bare "/" keystroke. React-controlled editors (Airbnb uses one)
    // often process keystrokes in their own handlers to insert the
    // character — blocking those would prevent "/" from appearing in
    // the field and our `input` handler would never see the trigger.
    // We only intercept arrow/enter/esc once the dropdown is already
    // open (above).
})();
