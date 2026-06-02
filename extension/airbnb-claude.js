// MasterBot — "Draft with Claude" for the Airbnb host inbox.
//
// Two jobs on www.airbnb.com/hosting/messages:
//   1. Single thread: the popup's "Draft this conversation" → draft + insert.
//   2. Batch: the popup's "Draft all unread" drives background drafting; this
//      script paints a tiny status dot next to each name in the inbox list
//      (from chrome.storage) and auto-inserts a ready draft when its thread is
//      opened. Never sends.
(function () {
  "use strict";

  const DRAFTS_KEY = "airbnbDrafts";
  const DOT_CLASS = "masterbot-status-dot";
  const STATUS_COLORS = {
    queued: "#9CA3AF",   // gray  — waiting in line
    drafting: "#F59E0B", // amber — drafting now (pulses)
    ready: "#10B981",    // green — ready
    review: "#3B82F6",   // blue  — ready, just give it a closer look
    failed: "#FF1A1A",   // red   — no text / error (vivid)
  };

  function isVisible(el) {
    if (!el || !el.getClientRects().length) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function threadIdFromUrl() {
    const m = location.pathname.match(/\/messages\/(\d+)/);
    return m ? m[1] : null;
  }

  function findComposer() {
    // STRICTLY the Airbnb message composer (a contenteditable="plaintext-only"
    // div with a known id). Never fall back to other editable fields — the
    // host "Your notes" textarea is also editable and was catching inserts.
    // If it isn't mounted yet, return null so insertWhenReady keeps retrying.
    const el = document.querySelector(
      '#message_input, [data-testid="messaging-composebar"]'
    );
    return (el && isVisible(el)) ? el : null;
  }

  function insertIntoComposer(text) {
    const el = findComposer();
    if (!el) return false;
    el.focus();
    if (el.tagName === "TEXTAREA") {
      // React tracks the value via the native setter; assigning el.value
      // directly is reverted on re-render. Go through the prototype setter.
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, "value"
      ).set;
      setter.call(el, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      const sel = window.getSelection();
      if (sel) sel.selectAllChildren(el);
      document.execCommand("insertText", false, text);
    }
    return true;
  }

  async function getDrafts() {
    const o = await chrome.storage.local.get(DRAFTS_KEY);
    return o[DRAFTS_KEY] || {};
  }

  // ----- Enumerate unread threads from the inbox DOM -----
  // Account-agnostic: reads the rows already on screen, so it works no matter
  // which Airbnb account is logged in (the inbox API needs the viewer's id).

  function listUnreadThreads() {
    const rows = document.querySelectorAll('[id^="inbox_list_"]');
    const out = [];
    const seen = new Set();
    rows.forEach((row) => {
      const m = (row.id || "").match(/inbox_list_(\d+)/);
      if (!m) return;
      const id = m[1];
      if (seen.has(id)) return;
      // The row's <a> screen-reader label reads "Unread Conversation with
      // <name>. Last message ..." on unread rows (just "Conversation with…"
      // when read). Use it to detect unread AND pull the guest name.
      const sr = row.querySelector("a span");
      const label = (sr && sr.textContent || "").trim();
      if (!/^Unread\b/.test(label)) return;
      seen.add(id);
      let title = "Guest";
      const tm = label.match(/Conversation with (.+?)\.\s/);
      if (tm) title = tm[1].trim();
      out.push({ numericId: id, title });
    });
    return out;
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || msg.action !== "listUnread") return;
    sendResponse({ ok: true, threads: listUnreadThreads() });
    return false;
  });

  // ----- Single thread (popup "Draft this conversation") -----

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || msg.action !== "draftInActiveThread") return;
    const id = threadIdFromUrl();
    if (!id) {
      sendResponse({ ok: false, error: "Open an Airbnb conversation first." });
      return;
    }
    chrome.runtime.sendMessage({ action: "airbnbDraftThread", threadId: id }, (resp) => {
      if (!resp || !resp.ok) {
        sendResponse({ ok: false, error: (resp && resp.error) || "no response" });
        return;
      }
      // Insert ONLY the draft — never inject review markers; they'd be sent
      // to the guest. The popup surfaces "needs review" instead.
      if (!insertIntoComposer(resp.draft)) {
        sendResponse({ ok: false, error: "Couldn't find the message box on this page." });
        return;
      }
      sendResponse({ ok: true, needs_human: !!resp.needs_human });
    });
    return true; // keep the channel open for the async draft
  });

  // ----- Status dots on inbox rows -----

  const pulseStyle = document.createElement("style");
  pulseStyle.textContent =
    "@keyframes masterbotPulse{0%,100%{opacity:1}50%{opacity:.25}}";
  document.documentElement.appendChild(pulseStyle);

  function makeDot(status) {
    const d = document.createElement("span");
    d.className = DOT_CLASS;
    d.dataset.status = status;
    d.style.cssText =
      "display:inline-block;width:7px;height:7px;border-radius:50%;" +
      "margin-right:5px;flex:0 0 auto;vertical-align:middle;" +
      "background:" + (STATUS_COLORS[status] || STATUS_COLORS.queued) + ";";
    if (status === "drafting") {
      d.style.animation = "masterbotPulse 1s ease-in-out infinite";
    }
    return d;
  }

  // Smallest element inside a row whose visible text is the guest title —
  // we put the dot just before it so it reads as a marker on the name.
  function findNameEl(root, title) {
    if (!title) return null;
    const t = title.trim();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let best = null;
    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (el.classList && el.classList.contains(DOT_CLASS)) continue;
      const txt = (el.textContent || "").trim();
      if (txt !== t) continue;
      if (el.children.length === 0) return el;
      if (!best || el.textContent.length < best.textContent.length) best = el;
    }
    return best;
  }

  let dotObserver = null;
  let renderScheduled = false;

  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    setTimeout(() => { renderScheduled = false; renderDots(); }, 200);
  }

  async function renderDots() {
    const drafts = await getDrafts();
    if (dotObserver) dotObserver.disconnect();
    try {
      document.querySelectorAll("." + DOT_CLASS).forEach((d) => d.remove());
      // Each inbox row is <div id="inbox_list_<threadId>">; the row's <a> has
      // href="#", so the id attribute is the only thread handle. The visible
      // name lives in a sibling element inside that container, not in the <a>.
      const rows = document.querySelectorAll('[id^="inbox_list_"]');
      rows.forEach((row) => {
        const m = (row.id || "").match(/inbox_list_(\d+)/);
        if (!m) return;
        const info = drafts[m[1]];
        // Drop the dot once the draft has been inserted — it served its
        // purpose; the notes panel still keeps the details.
        if (!info || info.inserted) return;
        const dot = makeDot(info.status);
        const nameEl = findNameEl(row, info.title);
        if (nameEl && nameEl.parentNode) nameEl.parentNode.insertBefore(dot, nameEl);
        else row.insertBefore(dot, row.firstChild);
      });
    } finally {
      if (dotObserver) dotObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  dotObserver = new MutationObserver(() => scheduleRender());
  dotObserver.observe(document.body, { childList: true, subtree: true });

  // ----- Auto-insert a ready draft when its thread is opened -----

  let lastInsertedId = null;

  function insertWhenReady(text, tries) {
    tries = tries || 20;
    return new Promise((resolve) => {
      let n = 0;
      const tick = () => {
        if (insertIntoComposer(text)) { resolve(true); return; }
        if (++n >= tries) { resolve(false); return; }
        setTimeout(tick, 300);
      };
      tick();
    });
  }

  async function maybeAutoInsert() {
    const id = threadIdFromUrl();
    if (!id) { lastInsertedId = null; return; }
    if (lastInsertedId === id) return;
    const drafts = await getDrafts();
    const info = drafts[id];
    if (!info || (info.status !== "ready" && info.status !== "review") || info.inserted) {
      return;
    }
    if (await insertWhenReady(info.draft)) {
      lastInsertedId = id;
      const fresh = await getDrafts();
      if (fresh[id]) { fresh[id].inserted = true; await chrome.storage.local.set({ [DRAFTS_KEY]: fresh }); }
    }
  }

  // ----- In-thread "Claude notes" panel (confidence / internal note) -----

  const NOTES_BTN_ID = "masterbot-notes-btn";
  const NOTES_PANEL_ID = "masterbot-notes-panel";
  const NOTES_CONTENT_ID = "masterbot-notes-content";

  function closeNotesPanel() {
    const p = document.getElementById(NOTES_PANEL_ID);
    if (p) { p.dataset.open = "0"; p.style.display = "none"; }
  }

  // Click anywhere outside the panel (and not on its toggle button) closes it.
  document.addEventListener("mousedown", (e) => {
    const p = document.getElementById(NOTES_PANEL_ID);
    if (!p || p.dataset.open !== "1") return;
    const btn = document.getElementById(NOTES_BTN_ID);
    if (p.contains(e.target) || (btn && btn.contains(e.target))) return;
    closeNotesPanel();
  }, true);

  function ensureNotesButton() {
    const qr = document.querySelector(
      '[data-testid="compose-bar-button-messaging__open_quick_replies"]'
    );
    if (!qr) return;                                   // not viewing a thread
    if (document.getElementById(NOTES_BTN_ID)) return; // already injected
    const wrapper = qr.closest("div");
    const toolbar = wrapper && wrapper.parentElement;
    if (!toolbar) return;
    const holder = document.createElement("div");
    holder.style.cssText = "display:flex;align-items:center;";
    const btn = document.createElement("button");
    btn.id = NOTES_BTN_ID;
    btn.type = "button";
    btn.title = "Claude notes for this conversation";
    btn.setAttribute("aria-label", "Claude notes");
    btn.style.cssText =
      "display:flex;align-items:center;justify-content:center;width:36px;height:36px;" +
      "border:none;background:transparent;cursor:pointer;border-radius:50%;color:#222;";
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 4h16v12H7l-3 3z"/><path d="M8 9h8M8 12h5"/></svg>';
    btn.addEventListener("click", (e) => { e.preventDefault(); toggleNotesPanel(); });
    holder.appendChild(btn);
    toolbar.appendChild(holder);
  }

  function starBar(conf) {
    const n = Math.max(0, Math.min(5, parseInt(conf, 10) || 0));
    return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
  }

  function buildNotesPanel() {
    let p = document.getElementById(NOTES_PANEL_ID);
    if (p) return p;
    p = document.createElement("div");
    p.id = NOTES_PANEL_ID;
    p.dataset.open = "0";
    p.style.cssText =
      "position:fixed;z-index:2147483647;display:none;width:300px;max-height:60vh;" +
      "overflow:auto;background:#1f2123;color:#e7e7e7;border-radius:12px;padding:14px;" +
      "box-shadow:0 8px 30px rgba(0,0,0,.4);font-family:-apple-system,sans-serif;" +
      "font-size:13px;line-height:1.45;";

    const content = document.createElement("div");
    content.id = NOTES_CONTENT_ID;
    p.appendChild(content);

    // Persistent feedback form — kept outside the content div so a storage
    // refresh (e.g. a batch still drafting) never wipes what's being typed.
    const fb = document.createElement("div");
    fb.style.cssText = "margin-top:12px;border-top:1px solid #3a3d40;padding-top:10px;";
    const fbLabel = document.createElement("div");
    fbLabel.style.cssText = "font-size:11px;color:#9aa0a6;margin-bottom:6px;";
    fbLabel.textContent = "Teach Claude — what should it do differently?";
    const ta = document.createElement("textarea");
    ta.rows = 3;
    ta.placeholder = "e.g. Don't offer early check-in here, this property never allows it.";
    ta.style.cssText =
      "width:100%;box-sizing:border-box;background:#15171a;color:#e7e7e7;" +
      "border:1px solid #3a3d40;border-radius:8px;padding:8px;font-size:12px;" +
      "resize:vertical;font-family:inherit;";
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:8px;";
    const send = document.createElement("button");
    send.type = "button";
    send.textContent = "Send feedback";
    send.style.cssText =
      "background:#FF385C;color:#fff;border:none;border-radius:8px;padding:7px 12px;" +
      "font-size:12px;font-weight:600;cursor:pointer;";
    const stat = document.createElement("span");
    stat.style.cssText = "font-size:11px;color:#9aa0a6;";
    send.addEventListener("click", () => submitFeedback(ta, send, stat));
    row.appendChild(send);
    row.appendChild(stat);
    fb.appendChild(fbLabel);
    fb.appendChild(ta);
    fb.appendChild(row);
    p.appendChild(fb);

    document.documentElement.appendChild(p);
    return p;
  }

  async function submitFeedback(ta, send, stat) {
    const note = (ta.value || "").trim();
    if (!note) { stat.style.color = "#F59E0B"; stat.textContent = "Write a note first."; return; }
    const id = threadIdFromUrl();
    const drafts = await getDrafts();
    const info = (id && drafts[id]) || {};
    send.disabled = true;
    stat.style.color = "#9aa0a6";
    stat.textContent = "Saving…";
    chrome.runtime.sendMessage({
      action: "sendFeedback",
      note,
      reservation_id: id || "",
      draft: info.draft || "",
      guest_name: info.title || "",
    }, (resp) => {
      send.disabled = false;
      if (chrome.runtime.lastError || !resp || !resp.ok) {
        stat.style.color = "#EF4444";
        stat.textContent = (resp && resp.error) ? resp.error : "Failed to save.";
        return;
      }
      stat.style.color = "#10B981";
      stat.textContent = "✓ Saved";
      ta.value = "";
    });
  }

  async function toggleNotesPanel() {
    const p = buildNotesPanel();
    if (p.dataset.open === "1") { p.dataset.open = "0"; p.style.display = "none"; return; }
    await refreshNotesPanel();
    const btn = document.getElementById(NOTES_BTN_ID);
    if (btn) {
      const r = btn.getBoundingClientRect();
      p.style.left = Math.max(8, Math.min(window.innerWidth - 308, r.right - 300)) + "px";
      p.style.bottom = (window.innerHeight - r.top + 8) + "px";
    }
    p.dataset.open = "1";
    p.style.display = "block";
  }

  async function refreshNotesPanel() {
    const content = document.getElementById(NOTES_CONTENT_ID);
    if (!content) return;
    const id = threadIdFromUrl();
    const drafts = await getDrafts();
    const info = id ? drafts[id] : null;
    const p = content;
    p.textContent = "";
    if (!info || (info.status !== "ready" && info.status !== "review")) {
      const empty = document.createElement("div");
      empty.style.color = "#9aa0a6";
      empty.textContent = (info && info.status === "failed")
        ? ("Draft failed: " + (info.error || "unknown"))
        : "No Claude notes yet. Run a draft for this conversation.";
      p.appendChild(empty);
      return;
    }
    const head = document.createElement("div");
    head.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:10px;font-weight:600;";
    if (info.confidence != null) {
      const c = document.createElement("span");
      c.style.color = "#d9c46a";
      c.textContent = starBar(info.confidence) + "  conf " + info.confidence + "/5";
      head.appendChild(c);
    }
    if (info.needs_human) {
      const nh = document.createElement("span");
      nh.style.color = "#3B82F6";
      nh.textContent = "👁 needs a look";
      head.appendChild(nh);
    }
    if (head.childNodes.length) p.appendChild(head);

    const box = document.createElement("div");
    box.style.cssText =
      "background:#15110a;border:1px solid #4a3a16;border-radius:8px;padding:10px;color:#e7b765;";
    const label = document.createElement("div");
    label.style.cssText = "font-size:10px;letter-spacing:.08em;color:#b08a3e;margin-bottom:6px;";
    label.textContent = "INTERNAL NOTE";
    box.appendChild(label);
    const note = document.createElement("div");
    note.style.whiteSpace = "pre-wrap";
    note.textContent = info.internal_note || "(none)";
    box.appendChild(note);
    p.appendChild(box);

    if (info.reasoning) {
      const why = document.createElement("div");
      why.style.cssText = "margin-top:10px;color:#9aa0a6;font-size:12px;";
      why.textContent = info.reasoning;
      p.appendChild(why);
    }
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[DRAFTS_KEY]) {
      scheduleRender();
      maybeAutoInsert();
      const p = document.getElementById(NOTES_PANEL_ID);
      if (p && p.dataset.open === "1") refreshNotesPanel();
    }
  });

  // The inbox is a SPA — react to thread navigation without a reload.
  let lastPath = "";
  setInterval(() => {
    ensureNotesButton();
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      lastInsertedId = null;
      const p = document.getElementById(NOTES_PANEL_ID);
      if (p) { p.dataset.open = "0"; p.style.display = "none"; }
      maybeAutoInsert();
      scheduleRender();
    }
  }, 700);

  scheduleRender();
  maybeAutoInsert();
  ensureNotesButton();
  console.log("[MasterBot] Claude draft ready on", location.pathname);
})();
