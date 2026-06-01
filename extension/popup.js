"use strict";

const btn = document.getElementById("draft");
const statusEl = document.getElementById("status");

function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = cls || "";
}

btn.addEventListener("click", async () => {
  btn.disabled = true;
  setStatus("Drafting…");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/www\.airbnb\.com\/hosting\/messages\//.test(tab.url || "")) {
    btn.disabled = false;
    setStatus("Open an Airbnb host conversation first.", "error");
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: "draftInActiveThread" }, (resp) => {
    btn.disabled = false;
    if (chrome.runtime.lastError) {
      setStatus("Reload the Airbnb tab, then try again.", "error");
      return;
    }
    if (!resp || !resp.ok) {
      setStatus(resp && resp.error ? resp.error : "Draft failed.", "error");
      return;
    }
    if (resp.needs_human) {
      setStatus("⚠ Draft inserted — review carefully before sending.", "review");
    } else {
      setStatus("✓ Draft inserted in the composer.");
    }
  });
});
