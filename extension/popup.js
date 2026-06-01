"use strict";

const btn = document.getElementById("draft");
const btnAll = document.getElementById("draftAll");
const statusEl = document.getElementById("status");

function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = cls || "";
}

async function activeInboxTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const onInbox = tab && /^https:\/\/www\.airbnb\.com\/hosting\/messages/.test(tab.url || "");
  return onInbox ? tab : null;
}

btn.addEventListener("click", async () => {
  btn.disabled = true;
  setStatus("Drafting…");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/www\.airbnb\.com\/hosting\/messages\/\d/.test(tab.url || "")) {
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

btnAll.addEventListener("click", async () => {
  btnAll.disabled = true;
  setStatus("Scanning unread…");

  const tab = await activeInboxTab();
  if (!tab) {
    btnAll.disabled = false;
    setStatus("Open the Airbnb host inbox first.", "error");
    return;
  }

  chrome.runtime.sendMessage({ action: "draftAllUnread" }, (resp) => {
    btnAll.disabled = false;
    if (chrome.runtime.lastError) {
      setStatus("Background error — reload the extension.", "error");
      return;
    }
    if (!resp || !resp.ok) {
      setStatus(resp && resp.error ? resp.error : "Scan failed.", "error");
      return;
    }
    if (!resp.total) {
      setStatus("No unread conversations found.");
      return;
    }
    setStatus(`Drafting ${resp.total} unread — watch the dots in the list. You can close this.`);
  });
});
