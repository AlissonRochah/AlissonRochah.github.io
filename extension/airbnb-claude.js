// MasterBot — "Draft with Claude" for an open Airbnb host conversation.
// Triggered from the extension popup (popup.js). Reads the thread via
// background (Airbnb internal API) and inserts the returned draft into the
// thread's composer. Never sends.
(function () {
  "use strict";

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

  // The popup has no access to the page DOM, so locate the composer here.
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

  console.log("[MasterBot] Claude draft ready on", location.pathname);
})();
