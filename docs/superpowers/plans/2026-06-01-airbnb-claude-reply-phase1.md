# Airbnb Claude Reply — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Draft with Claude" button on an open Airbnb host conversation that reads the thread via Airbnb's internal API, drafts a reply through the local `airbnb-app` (`claude -p`), and inserts it into the composer — no MAPRO, no auto-send.

**Architecture:** The extension is eyes+hands; the local `airbnb-app` (port 8787) is the brain. A new stateless server endpoint `POST /api/draft-adhoc` reuses the existing `build_prompt` + `run_claude_draft` and the existing knowledge/style/corpus loaders from `prepare_thread.py` (stdlib-only, importable). The extension's `background.js` calls Airbnb's `ViaductGetThreadAndDataQuery` with the logged-in session, maps the response to the endpoint's payload, and a content script inserts the returned draft into the last-focused composer.

**Tech Stack:** Python 3.14 + FastAPI (server, `~/airbnb-app`), Chrome MV3 extension JS (`~/Projects/MasterBot/extension`), `claude -p` CLI for drafting, pytest + starlette TestClient for server tests.

**Spec:** `docs/superpowers/specs/2026-06-01-airbnb-claude-reply-design.md`

**Network topology (Tailscale):** The browser + extension run on a *remote*
computer; the `airbnb-app` brain runs on the Mac `mac` (Tailscale MagicDNS
`mac.tailda12d3.ts.net`, IP `100.95.35.114`). The extension therefore talks to
the draft server over Tailscale, not `localhost`. The fetch happens in the
**background service worker** (extension origin) — so `http://` over Tailscale
is neither mixed-content nor CORS-blocked (host_permissions grant it). The
server already binds `0.0.0.0:8787`, so it answers on the Tailscale interface.
Tasks 0–7 are done on the Mac (where `airbnb-app` and the MasterBot repo live);
Task 8 is run by the operator on the remote computer after a `git pull`.

**Verified constants (from captured HAR):**
- Host account id (operator / Master Vacation Homes): `93929916`
- Airbnb web API key (constant): `d306zoyjsyarp7ifhu67rjxn52tv0t20`
- `ViaductGetThreadAndDataQuery` persisted-query hash: `8a30e768581661887cf9eb7f87b0b9be4b6b935ff2159f1c72e233c303976689`
- Thread URL: `https://www.airbnb.com/hosting/messages/<numericId>`; full history at `data.threadData.messageData.messages[]`, body at `hydratedContent.content.body` (when `hydratedContent.contentType == "TEXT"`).

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `~/airbnb-app/adhoc.py` | Pure mapping of an Airbnb-shaped payload → the `prep` dict `build_prompt` expects; reuses `prepare_thread.py` loaders. No FastAPI, no MAPRO. | Create |
| `~/airbnb-app/server.py` | Add `POST /api/draft-adhoc` route that calls `adhoc.build_adhoc_prep` + `run_claude_draft`. | Modify |
| `~/airbnb-app/tests/test_adhoc.py` | Unit tests for the mapper + an endpoint test with `run_claude_draft` mocked. | Create |
| `~/Projects/MasterBot/extension/manifest.json` | Add `localhost:8787` host permission; register the new content script. | Modify |
| `~/Projects/MasterBot/extension/background.js` | Airbnb internal-API client, response→payload mapper, localhost draft POST, `onMessage` handler. | Modify |
| `~/Projects/MasterBot/extension/airbnb-claude.js` | Content script: floating "Draft with Claude" button, last-focused-composer tracking, insert draft. | Create |

---

## Task 0: Version-control `airbnb-app` + install test dep

**Files:**
- Create: `~/airbnb-app/.gitignore`

- [ ] **Step 1: Add a .gitignore so secrets/large files stay out**

Create `~/airbnb-app/.gitignore`:

```gitignore
.venv/
__pycache__/
*.log
state.db
state.db-shm
state.db-wal
```

- [ ] **Step 2: Init the repo and make a baseline commit**

```bash
cd ~/airbnb-app
git init -q
git add .gitignore server.py mapro_client.py static
git commit -q -m "chore: baseline before adhoc draft endpoint"
```

Expected: a commit is created. (If `git init` is unwanted, skip Task 0 entirely and drop the `git commit` steps in Tasks 1–3; everything else still works.)

- [ ] **Step 3: Install pytest into the venv**

```bash
~/airbnb-app/.venv/bin/pip install -q pytest
~/airbnb-app/.venv/bin/python -c "import pytest; print('pytest', pytest.__version__)"
```

Expected: prints a pytest version. (`httpx` and `starlette` are already present for `TestClient`.)

---

## Task 1: `adhoc.py` — `shape_adhoc_messages` (pure)

**Files:**
- Create: `~/airbnb-app/adhoc.py`
- Test: `~/airbnb-app/tests/test_adhoc.py`

- [ ] **Step 1: Write the failing test**

Create `~/airbnb-app/tests/test_adhoc.py`:

```python
import os, sys
sys.path.insert(0, os.path.expanduser("~/airbnb-app"))
import adhoc


def test_shape_skips_system_and_marks_direction():
    raw = [
        {"accountType": "SERVICE", "accountId": "95", "createdAtMs": 1773982399904,
         "body": "", "sender_name": ""},
        {"accountType": "USER", "accountId": "93929916", "createdAtMs": 1773982430294,
         "body": "Hi Alexia! Thanks for booking", "sender_name": "team"},
        {"accountType": "USER", "accountId": "592921801", "createdAtMs": 1780008145360,
         "body": "Is there anywhere to take the trash?", "sender_name": "Alexia"},
    ]
    out = adhoc.shape_adhoc_messages(raw, host_account_id="93929916")
    assert len(out) == 2                       # system message dropped
    assert out[0]["is_incoming"] == 0          # host
    assert out[1]["is_incoming"] == 1          # guest
    assert out[1]["body"] == "Is there anywhere to take the trash?"
    assert out[0]["sent_on_utc"].startswith("2026-")  # ms -> UTC string
```

- [ ] **Step 2: Run test to verify it fails**

Run: `~/airbnb-app/.venv/bin/python -m pytest ~/airbnb-app/tests/test_adhoc.py::test_shape_skips_system_and_marks_direction -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'adhoc'`.

- [ ] **Step 3: Write minimal implementation**

Create `~/airbnb-app/adhoc.py`:

```python
"""Build a build_prompt()-ready prep dict from an Airbnb-shaped payload.

No MAPRO. Reuses the stdlib-only loaders in prepare_thread.py for the
knowledge base, style guide, and corpus retrieval."""

import os
import sys
from datetime import datetime, timezone

SCRIPTS_DIR = os.path.expanduser("~/.claude/scripts/airbnb")
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)
import prepare_thread as pt  # stdlib-only; main() is guarded

HOST_ACCOUNT_ID = "93929916"


def _ms_to_utc(ms) -> str:
    return datetime.fromtimestamp(int(ms) / 1000, tz=timezone.utc).strftime(
        "%Y-%m-%d %H:%M:%S"
    )


def shape_adhoc_messages(raw_messages, host_account_id=HOST_ACCOUNT_ID):
    """raw_messages: [{accountType, accountId, createdAtMs, body, sender_name}].
    Returns history in build_prompt's shape, dropping system/empty messages."""
    out = []
    for m in raw_messages or []:
        if m.get("accountType") == "SERVICE":
            continue
        body = (m.get("body") or "").strip()
        if not body:
            continue
        is_incoming = 0 if str(m.get("accountId")) == str(host_account_id) else 1
        out.append({
            "is_incoming": is_incoming,
            "sender_name": m.get("sender_name") or ("guest" if is_incoming else "team"),
            "body": body,
            "sent_on_utc": _ms_to_utc(m["createdAtMs"]) if m.get("createdAtMs") else "",
        })
    return out
```

- [ ] **Step 4: Run test to verify it passes**

Run: `~/airbnb-app/.venv/bin/python -m pytest ~/airbnb-app/tests/test_adhoc.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/airbnb-app
git add adhoc.py tests/test_adhoc.py
git commit -q -m "feat(adhoc): map Airbnb messages to prep history"
```

---

## Task 2: `adhoc.py` — `build_adhoc_prep`

**Files:**
- Modify: `~/airbnb-app/adhoc.py`
- Test: `~/airbnb-app/tests/test_adhoc.py`

- [ ] **Step 1: Write the failing test**

Append to `~/airbnb-app/tests/test_adhoc.py`:

```python
def test_build_prep_assembles_all_sections(monkeypatch):
    monkeypatch.setattr(adhoc.pt, "load_knowledge", lambda q="": [{"name": "kb", "content": "rules"}])
    monkeypatch.setattr(adhoc.pt, "load_style_guide", lambda: "be brief")
    monkeypatch.setattr(adhoc.pt, "load_corpus", lambda: [])
    monkeypatch.setattr(adhoc.pt, "retrieve_top_k", lambda q, c, **k: [])

    payload = {
        "guest_name": "Alexia",
        "listing": "9032 ST LW",
        "trip_stage": "CURRENTLY_HOSTING",
        "reservation": {"checkin": "2026-05-28 16:00:00", "checkout": "2026-06-01 10:00:00"},
        "messages": [
            {"accountType": "USER", "accountId": "93929916", "createdAtMs": 1780008953043,
             "body": "All set :)", "sender_name": "team"},
            {"accountType": "USER", "accountId": "592921801", "createdAtMs": 1780317540392,
             "body": "Where do I leave the towels?", "sender_name": "Alexia"},
        ],
    }
    prep = adhoc.build_adhoc_prep(payload)
    assert prep["knowledge_base"] == [{"name": "kb", "content": "rules"}]
    assert prep["style_guide"] == "be brief"
    assert prep["reservation"]["checkin"] == "2026-05-28 16:00:00"
    assert prep["property_info"]["listing"] == "9032 ST LW"
    assert prep["property_info"]["trip_stage"] == "CURRENTLY_HOSTING"
    assert len(prep["history"]) == 2
    # unanswered = trailing guest messages only
    assert len(prep["unanswered"]) == 1
    assert prep["unanswered"][0]["body"] == "Where do I leave the towels?"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `~/airbnb-app/.venv/bin/python -m pytest ~/airbnb-app/tests/test_adhoc.py::test_build_prep_assembles_all_sections -v`
Expected: FAIL — `AttributeError: module 'adhoc' has no attribute 'build_adhoc_prep'`.

- [ ] **Step 3: Write minimal implementation**

Append to `~/airbnb-app/adhoc.py`:

```python
def build_adhoc_prep(payload: dict) -> dict:
    """Compose the prep dict build_prompt() expects, from an Airbnb payload."""
    history = shape_adhoc_messages(payload.get("messages") or [])

    # Trailing run of guest messages = what we still owe a reply to.
    unanswered = []
    for m in reversed(history):
        if m["is_incoming"] == 1:
            unanswered.insert(0, m)
        else:
            break
    query = " ".join(m["body"] for m in unanswered)

    corpus = pt.load_corpus()
    retrieved = pt.retrieve_top_k(query, corpus) if query else []

    resv = payload.get("reservation") or {}
    pinfo = {}
    if payload.get("listing"):
        pinfo["listing"] = payload["listing"]
    if payload.get("trip_stage"):
        pinfo["trip_stage"] = payload["trip_stage"]

    return {
        "knowledge_base": pt.load_knowledge(query),
        "style_guide": pt.load_style_guide(),
        "retrieved_pairs": retrieved,
        "reservation": {"checkin": resv.get("checkin", ""), "checkout": resv.get("checkout", "")},
        "property_info": pinfo,
        "history": history,
        "unanswered": unanswered,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `~/airbnb-app/.venv/bin/python -m pytest ~/airbnb-app/tests/test_adhoc.py -v`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
cd ~/airbnb-app
git add adhoc.py tests/test_adhoc.py
git commit -q -m "feat(adhoc): assemble full prep dict (kb/style/corpus/history)"
```

---

## Task 3: `POST /api/draft-adhoc` route

**Files:**
- Modify: `~/airbnb-app/server.py`
- Test: `~/airbnb-app/tests/test_adhoc.py`

- [ ] **Step 1: Write the failing test**

Append to `~/airbnb-app/tests/test_adhoc.py`:

```python
def test_endpoint_returns_draft(monkeypatch):
    sys.path.insert(0, os.path.expanduser("~/airbnb-app"))
    import server
    from starlette.testclient import TestClient

    monkeypatch.setattr(server.adhoc.pt, "load_knowledge", lambda q="": [])
    monkeypatch.setattr(server.adhoc.pt, "load_style_guide", lambda: "")
    monkeypatch.setattr(server.adhoc.pt, "load_corpus", lambda: [])
    monkeypatch.setattr(server.adhoc.pt, "retrieve_top_k", lambda q, c, **k: [])

    async def fake_draft(prep, reservation_id=None):
        assert prep["history"][0]["body"] == "What time is check-in?"
        return {"draft": "Check-in is at 4 PM.", "needs_human": False, "reasoning": "rule"}
    monkeypatch.setattr(server, "run_claude_draft", fake_draft)

    client = TestClient(server.app)
    resp = client.post("/api/draft-adhoc", json={
        "guest_name": "Nicole",
        "messages": [
            {"accountType": "USER", "accountId": "111", "createdAtMs": 1780332305428,
             "body": "What time is check-in?", "sender_name": "Nicole"},
        ],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["draft"] == "Check-in is at 4 PM."
    assert body["needs_human"] is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `~/airbnb-app/.venv/bin/python -m pytest ~/airbnb-app/tests/test_adhoc.py::test_endpoint_returns_draft -v`
Expected: FAIL — 404 from the missing route (or `AttributeError` on `server.adhoc`).

- [ ] **Step 3: Add the import near the top of `server.py`**

In `~/airbnb-app/server.py`, find the existing line `import mapro_client` and add directly under it:

```python
import adhoc
```

- [ ] **Step 4: Add the route**

In `~/airbnb-app/server.py`, immediately above the `if __name__ == "__main__":` block at the end of the file, add:

```python
class AdhocDraftRequest(BaseModel):
    guest_name: str | None = None
    listing: str | None = None
    trip_stage: str | None = None
    reservation: dict | None = None
    messages: list[dict] = []


@app.post("/api/draft-adhoc")
async def draft_adhoc(req: AdhocDraftRequest):
    """Stateless draft from an Airbnb-shaped payload — no MAPRO, no queue."""
    prep = adhoc.build_adhoc_prep(req.model_dump())
    if not prep["history"]:
        raise HTTPException(status_code=400, detail="no messages to draft from")
    result = await run_claude_draft(prep)
    return {
        "ok": True,
        "draft": result.get("draft", ""),
        "needs_human": result.get("needs_human", False),
        "reasoning": result.get("reasoning", ""),
    }
```

(`BaseModel`, `HTTPException`, `app`, and `run_claude_draft` are already imported/defined in `server.py`.)

- [ ] **Step 5: Run test to verify it passes**

Run: `~/airbnb-app/.venv/bin/python -m pytest ~/airbnb-app/tests/test_adhoc.py -v`
Expected: PASS (all three tests).

- [ ] **Step 6: Commit**

```bash
cd ~/airbnb-app
git add server.py tests/test_adhoc.py
git commit -q -m "feat(server): POST /api/draft-adhoc reusing claude -p brain"
```

---

## Task 4: Restart server + live smoke test (real `claude -p`)

**Files:** none (runtime verification).

- [ ] **Step 1: Restart the running server so it picks up the new route**

The server runs under launchd as PID-of `server.py`. Restart it:

```bash
kill $(pgrep -f "airbnb-app/server.py") 2>/dev/null; sleep 1
cd ~/airbnb-app && nohup .venv/bin/python server.py >> server.out.log 2>&1 &
sleep 2 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/api/events --max-time 1 || true
```

Expected: server is listening on 8787 again. (If it is managed by a launchd plist, prefer `launchctl kickstart -k` on that service instead; check `launchctl list | grep -i airbnb`.)

- [ ] **Step 2: Hit the real endpoint with a sample payload**

```bash
curl -s -X POST http://localhost:8787/api/draft-adhoc \
  -H "content-type: application/json" \
  -d '{"guest_name":"Nicole","listing":"1075 OP LW","trip_stage":"RESERVATION_REQUESTS","messages":[{"accountType":"USER","accountId":"111","createdAtMs":1780332305428,"body":"Hi! Is early check-in possible?","sender_name":"Nicole"}]}' \
  | python3 -m json.tool
```

Expected: JSON with a non-empty `"draft"` written in Alisson's voice (English, no em-dash). This confirms the loaders + `claude -p` path work end-to-end.

---

## Task 5: Manifest — localhost permission + register content script

**Files:**
- Modify: `~/Projects/MasterBot/extension/manifest.json`

- [ ] **Step 1: Add the draft-server host permissions**

In `manifest.json`, in the `host_permissions` array, add the Tailscale hosts
after the existing `"https://www.airbnb.com/*"` entry. (Chrome match patterns
ignore the port, so these cover `:8787`. `localhost` is kept so the same build
also works when running directly on the Mac.)

```json
    "https://www.airbnb.com/*",
    "http://mac.tailda12d3.ts.net/*",
    "http://100.95.35.114/*",
    "http://localhost:8787/*"
```

- [ ] **Step 2: Register the new content script**

In `manifest.json`, in `content_scripts`, add a new entry after the existing `airbnb-slash.js` block:

```json
    {
      "matches": ["https://www.airbnb.com/hosting/messages/*"],
      "js": ["airbnb-claude.js"],
      "run_at": "document_idle"
    }
```

- [ ] **Step 3: Verify the manifest is valid JSON**

Run: `python3 -m json.tool ~/Projects/MasterBot/extension/manifest.json > /dev/null && echo OK`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/MasterBot
git add extension/manifest.json
git commit -m "feat(ext): localhost host permission + airbnb-claude content script"
```

---

## Task 6: `background.js` — Airbnb API client + draft handler

**Files:**
- Modify: `~/Projects/MasterBot/extension/background.js`

- [ ] **Step 1: Add the Airbnb internal-API client + mapper + draft POST**

Append to the end of `~/Projects/MasterBot/extension/background.js`:

```javascript
// ===== Airbnb Claude reply (Phase 1) =====
const AIRBNB_API_KEY = "d306zoyjsyarp7ifhu67rjxn52tv0t20";
const VIADUCT_THREAD_HASH =
  "8a30e768581661887cf9eb7f87b0b9be4b6b935ff2159f1c72e233c303976689";
const HOST_ACCOUNT_ID = "93929916";
// The brain runs on the Mac, reached over Tailscale. MagicDNS resolves from
// both the remote computer and the Mac itself, so one URL covers every case.
// Override at runtime without editing code: chrome.storage.local "airbnbDraftBase".
const DRAFT_BASE_DEFAULT = "http://mac.tailda12d3.ts.net:8787";

async function draftServerUrl() {
  const { airbnbDraftBase } = await chrome.storage.local.get("airbnbDraftBase");
  return (airbnbDraftBase || DRAFT_BASE_DEFAULT) + "/api/draft-adhoc";
}

async function fetchAirbnbThread(numericId) {
  const variables = {
    numRequestedMessages: 50, getThreadState: true, getParticipants: true,
    getLastReads: true, forceUgcTranslation: false, isNovaLite: false,
    globalThreadId: btoa("MessageThread:" + numericId), originType: "USER_INBOX",
    getInboxFields: true, getInboxOnlyFields: false, getMessageFields: true,
    getThreadOnlyFields: true, skipOldMessagePreviewFields: false,
  };
  const extensions = { persistedQuery: { version: 1, sha256Hash: VIADUCT_THREAD_HASH } };
  const url = `https://www.airbnb.com/api/v3/ViaductGetThreadAndDataQuery/${VIADUCT_THREAD_HASH}`
    + `?operationName=ViaductGetThreadAndDataQuery&locale=en&currency=USD`
    + `&variables=${encodeURIComponent(JSON.stringify(variables))}`
    + `&extensions=${encodeURIComponent(JSON.stringify(extensions))}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-airbnb-api-key": AIRBNB_API_KEY,
      "x-airbnb-graphql-platform": "web",
      "x-csrf-without-token": "1",
    },
  });
  if (!res.ok) throw new Error(`Airbnb thread fetch ${res.status} (persisted-query hash may have rotated)`);
  return res.json();
}

function mapThreadToPayload(json) {
  const td = json && json.data && json.data.threadData;
  if (!td) throw new Error("no threadData in Airbnb response");
  const parts = (td.participants && td.participants.edges || []).map((e) => e.node);
  const guest = parts.find((n) => n && n.participantRole === "GUEST");
  const guestName =
    (guest && guest.enrichedParticipantInfo && guest.enrichedParticipantInfo.name) ||
    (td.inboxTitle && td.inboxTitle.components && td.inboxTitle.components[0] &&
      td.inboxTitle.components[0].text) || "Guest";
  const desc = (td.inboxDescription && td.inboxDescription.components &&
    td.inboxDescription.components[0] && td.inboxDescription.components[0].text) || "";
  const listing = desc.includes("·") ? desc.split("·").pop().trim() : "";
  const tripTag = (td.userThreadTags || []).find((t) => t.userThreadTagName === "trip_stages");
  const tripStage = (tripTag && tripTag.additionalValues && tripTag.additionalValues[0]) || "";
  const msgs = (td.messageData && td.messageData.messages || []).map((m) => ({
    accountType: m.account && m.account.accountType,
    accountId: m.account && m.account.accountId,
    createdAtMs: m.createdAtMs,
    body: (m.hydratedContent && m.hydratedContent.contentType === "TEXT" &&
      m.hydratedContent.content && m.hydratedContent.content.body) || "",
    sender_name: (m.account && String(m.account.accountId) === HOST_ACCOUNT_ID) ? "team" : guestName,
  }));
  return { guest_name: guestName, listing, trip_stage: tripStage, messages: msgs };
}

async function draftAirbnbThread(numericId) {
  const threadJson = await fetchAirbnbThread(numericId);
  const payload = mapThreadToPayload(threadJson);
  const res = await fetch(await draftServerUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Draft server ${res.status} — is airbnb-app reachable over Tailscale on :8787?`);
  return res.json();
}
```

- [ ] **Step 2: Add the internal message handler**

Append to the end of `~/Projects/MasterBot/extension/background.js`:

```javascript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === "airbnbDraftThread") {
    (async () => {
      try {
        const out = await draftAirbnbThread(msg.threadId);
        sendResponse({ ok: true, draft: out.draft, needs_human: out.needs_human });
      } catch (e) {
        sendResponse({ ok: false, error: String((e && e.message) || e) });
      }
    })();
    return true; // keep the channel open for the async response
  }
});
```

- [ ] **Step 3: Syntax-check the file**

Run: `node --check ~/Projects/MasterBot/extension/background.js && echo OK`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/MasterBot
git add extension/background.js
git commit -m "feat(ext): Airbnb thread fetch + draft-adhoc bridge in background"
```

---

## Task 7: `airbnb-claude.js` — button + insert into composer

**Files:**
- Create: `~/Projects/MasterBot/extension/airbnb-claude.js`

- [ ] **Step 1: Create the content script**

Create `~/Projects/MasterBot/extension/airbnb-claude.js`:

```javascript
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
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      const sel = window.getSelection();
      sel.selectAllChildren(el);
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
```

- [ ] **Step 2: Syntax-check the file**

Run: `node --check ~/Projects/MasterBot/extension/airbnb-claude.js && echo OK`
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/MasterBot
git add extension/airbnb-claude.js
git commit -m "feat(ext): Draft with Claude button + composer insert"
```

---

## Task 8: End-to-end manual verification (remote computer, over Tailscale)

**Files:** none. There is no JS test harness for this extension, so this glue is
verified by hand. **Run this task on the remote computer** (the one with the
Airbnb session), which must be on the same tailnet as the Mac.

- [ ] **Step 1: Get the latest extension onto the remote computer**

On the Mac, push the committed work. On the remote computer:

```bash
cd <path-to>/MasterBot && git pull
```

Then load/reload the unpacked extension. In Brave (the operator's session
browser; Chrome is identical): `brave://extensions` → enable Developer mode →
"Load unpacked" → select `MasterBot/extension` (or click reload ↻ if already
loaded). Confirm it loads with no errors.

- [ ] **Step 2: Confirm the brain is reachable over Tailscale**

From the remote computer:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://mac.tailda12d3.ts.net:8787/api/draft-adhoc -H "content-type: application/json" -d '{"messages":[]}'
```

Expected: `400` (route exists; rejects empty). If it hangs or refuses: check
`tailscale status` on both machines, confirm the Mac's `airbnb-app` is running
(Task 4), and that the Mac isn't asleep.

- [ ] **Step 3: Drive a real thread**

Open `https://www.airbnb.com/hosting/messages/` and click into any conversation with guest messages. Click into the reply box once (so the composer is the last-focused field), then click the red **✦ Draft with Claude** button (bottom-right).

Expected: button shows "Drafting…", then the composer fills with a reply in Alisson's voice (English, no em-dash). Nothing is sent.

- [ ] **Step 4: Check the console on failure**

If it errors: open DevTools on the Airbnb tab (content-script logs) and the service-worker console via `brave://extensions` → MasterBot → "service worker". Common cases:
- `Draft server … reachable over Tailscale on :8787?` → Mac asleep, `airbnb-app` down (Task 4), or not on the tailnet.
- `Airbnb thread fetch 404 … hash may have rotated` → recapture `ViaductGetThreadAndDataQuery` and update `VIADUCT_THREAD_HASH` in `background.js`.
- Composer not filled → you didn't click into the message box first (Step 3).

- [ ] **Step 5: Bump the extension version**

In `manifest.json`, change `"version": "0.9.1"` to `"version": "0.10.0"`, then:

```bash
cd ~/Projects/MasterBot
git add extension/manifest.json
git commit -m "chore(ext): bump to 0.10.0 — Claude draft button"
```

---

## Self-Review notes

- **Spec coverage:** endpoint `/api/draft-adhoc` (Task 3) ✓; internal-API read via `ViaductGetThreadAndDataQuery` (Task 6) ✓; field mapping incl. `messageData.messages` + `hydratedContent.content.body` + host-id direction (Tasks 1, 6) ✓; `trip_stage` passthrough (Tasks 2, 6) ✓; draft-only insert, never overwrite-without-focus, never send (Task 7) ✓; localhost permission (Task 5) ✓; hash-rotation risk surfaced (Tasks 6, 8) ✓. Sweep + cache + auto-fill-on-open are **Phase 2** (separate plan), intentionally not here.
- **Reservation precise check-in/out times** (`HostReservationDetailsQuery`) are deferred: Phase 1 passes `listing` + `trip_stage` from the inbox/thread payload and lets `build_prompt` degrade dates to `(missing)`. Adding the reservation query is a clean Phase-2 enhancement.
