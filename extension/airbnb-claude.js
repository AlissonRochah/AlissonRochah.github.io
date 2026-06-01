// MasterBot — "Draft with Claude" on an open Airbnb host conversation.
// Reads the thread via background (Airbnb internal API) and inserts the
// returned draft into the composer the operator last focused. Never sends.
(function () {
  "use strict";

  const BTN_ID = "masterbot-claude-btn";
  let lastEditable = null;

  function isEditable(el) {
    if (!el) return false;
    if (el.tagName === "TEXTAREA") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  document.addEventListener("focusin", (e) => {
    if (isEditable(e.target)) lastEditable = e.target;
  }, true);

  function threadIdFromUrl() {
    const m = location.pathname.match(/\/messages\/(\d+)/);
    return m ? m[1] : null;
  }

  function insertIntoComposer(text) {
    const el = lastEditable;
    if (!el) {
      alert("Click into the Airbnb message box first, then press Draft with Claude.");
      return;
    }
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
  }

  function setBtn(state, label) {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    btn.textContent = label;
    btn.disabled = state === "busy";
    btn.style.opacity = state === "busy" ? "0.6" : "1";
  }

  function onClick() {
    const id = threadIdFromUrl();
    if (!id) { alert("Open a conversation first."); return; }
    setBtn("busy", "Drafting…");
    chrome.runtime.sendMessage({ action: "airbnbDraftThread", threadId: id }, (resp) => {
      setBtn("idle", "✦ Draft with Claude");
      if (!resp || !resp.ok) {
        alert("Draft failed: " + ((resp && resp.error) || "no response"));
        return;
      }
      const marker = resp.needs_human ? "✨ Claude draft (NEEDS REVIEW)\n\n" : "";
      insertIntoComposer(marker + resp.draft);
    });
  }

  function ensureButton() {
    if (document.getElementById(BTN_ID)) return;
    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.textContent = "✦ Draft with Claude";
    btn.style.cssText =
      "position:fixed; right:20px; bottom:90px; z-index:2147483647;" +
      "background:#FF385C; color:#fff; border:none; border-radius:22px;" +
      "padding:10px 16px; font-size:13px; font-weight:600; cursor:pointer;" +
      "box-shadow:0 4px 14px rgba(0,0,0,0.25); font-family:-apple-system,sans-serif;";
    btn.addEventListener("click", onClick);
    document.documentElement.appendChild(btn);
  }

  // The inbox is a SPA; re-assert the button as the user navigates threads.
  ensureButton();
  setInterval(ensureButton, 1500);
  console.log("[MasterBot] Claude draft button loaded on", location.pathname);
})();
