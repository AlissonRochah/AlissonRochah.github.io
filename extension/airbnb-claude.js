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
    review: "#F97316",   // orange — ready, Claude flagged for review
    failed: "#EF4444",   // red   — no text / error
  };

  let lastEditable = null;

  function isEditable(el) {
    if (!el) return false;
    if (el.tagName === "TEXTAREA") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function isVisible(el) {
    if (!el || !el.getClientRects().length) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  document.addEventListener("focusin", (e) => {
    if (isEditable(e.target)) lastEditable = e.target;
  }, true);

  function threadIdFromUrl() {
    const m = location.pathname.match(/\/messages\/(\d+)/);
    return m ? m[1] : null;
  }

  function findComposer() {
    if (lastEditable && document.contains(lastEditable) && isVisible(lastEditable)) {
      return lastEditable;
    }
    const candidates = Array.prototype.slice
      .call(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]'))
      .filter(isVisible);
    if (!candidates.length) return null;
    // Composers sit at the bottom of the thread; prefer the lowest one.
    candidates.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
    return candidates[0];
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
      const links = document.querySelectorAll('a[href*="/messages/"]');
      const seen = new Set();
      links.forEach((a) => {
        const m = (a.getAttribute("href") || "").match(/\/messages\/(\d+)/);
        if (!m) return;
        const id = m[1];
        if (seen.has(id)) return; // dot a thread once even if it has many links
        const info = drafts[id];
        if (!info) return;
        seen.add(id);
        const dot = makeDot(info.status);
        const nameEl = findNameEl(a, info.title);
        if (nameEl && nameEl.parentNode) nameEl.parentNode.insertBefore(dot, nameEl);
        else a.insertBefore(dot, a.firstChild);
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

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[DRAFTS_KEY]) {
      scheduleRender();
      maybeAutoInsert();
    }
  });

  // The inbox is a SPA — react to thread navigation without a reload.
  let lastPath = "";
  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      lastInsertedId = null;
      maybeAutoInsert();
      scheduleRender();
    }
  }, 700);

  scheduleRender();
  maybeAutoInsert();
  console.log("[MasterBot] Claude draft ready on", location.pathname);
})();
