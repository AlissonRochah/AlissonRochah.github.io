"use strict";

const btn = document.getElementById("draft");
const btnAll = document.getElementById("draftAll");
const btnRefresh = document.getElementById("refresh");
const btnCancel = document.getElementById("cancel");
const btnReset = document.getElementById("reset");
const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");

function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = cls || "";
}

async function renderSummary() {
  const o = await chrome.storage.local.get("airbnbDrafts");
  const drafts = o.airbnbDrafts || {};
  const c = { queued: 0, drafting: 0, ready: 0, review: 0, failed: 0 };
  Object.values(drafts).forEach((d) => { if (c[d.status] != null) c[d.status]++; });
  const total = c.queued + c.drafting + c.ready + c.review + c.failed;
  if (!total) { summaryEl.textContent = ""; return; }
  summaryEl.textContent =
    `${c.ready + c.review} ready · ${c.drafting} drafting · ${c.queued} queued · ${c.failed} failed`;
}

btnRefresh.addEventListener("click", renderSummary);

btnReset.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "resetDrafts" }, (resp) => {
    if (chrome.runtime.lastError || !resp || !resp.ok) {
      setStatus("Couldn't reset.", "error");
      return;
    }
    setStatus("Reset — all drafts and dots cleared.");
    renderSummary();
  });
});

btnCancel.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "cancelBatch" }, (resp) => {
    if (chrome.runtime.lastError || !resp || !resp.ok) {
      setStatus("Couldn't cancel.", "error");
      return;
    }
    setStatus(resp.removed ? `Cancelled — dropped ${resp.removed} queued.` : "Cancelled.");
    renderSummary();
  });
});

// Keep the summary live while the popup stays open.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.airbnbDrafts) renderSummary();
});

renderSummary();

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

  // The content script enumerates unread rows from the inbox DOM (works on
  // any logged-in account), then the background drafts them.
  chrome.tabs.sendMessage(tab.id, { action: "listUnread" }, (lr) => {
    if (chrome.runtime.lastError || !lr || !lr.ok) {
      btnAll.disabled = false;
      setStatus("Reload the Airbnb tab, then try again.", "error");
      return;
    }
    const threads = lr.threads || [];
    if (!threads.length) {
      btnAll.disabled = false;
      setStatus("No unread conversations visible. Scroll the inbox to load more.");
      return;
    }
    chrome.runtime.sendMessage({ action: "draftThreads", threads }, (resp) => {
      btnAll.disabled = false;
      if (chrome.runtime.lastError || !resp || !resp.ok) {
        setStatus(resp && resp.error ? resp.error : "Draft failed.", "error");
        return;
      }
      setStatus(`Drafting ${resp.total} unread — watch the dots. You can close this.`);
      renderSummary();
    });
  });
});
