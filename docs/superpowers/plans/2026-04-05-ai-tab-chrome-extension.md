# MasterBot AI Tab + Chrome Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-powered response generator tab to MasterBot and package the app as a Chrome extension that scrapes Airbnb conversations and generates responses using Ollama.

**Architecture:** Static HTML/CSS/JS app (no build step) packaged as a Manifest V3 Chrome extension. A content script injected into Airbnb pages handles DOM scraping. The AI tab communicates with Ollama via its OpenAI-compatible API through a Cloudflare Tunnel URL stored in Firestore. Firebase Auth and Firestore handle authentication, templates, and settings.

**Tech Stack:** HTML, CSS, JavaScript (vanilla, ES modules via Firebase CDN), Firebase Auth + Firestore, Chrome Extension Manifest V3, Ollama API (OpenAI-compatible)

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `manifest.json` | Chrome extension configuration — permissions, content scripts, popup, icons |
| `content.js` | Content script injected into Airbnb — scrapes conversation DOM, listens for messages from extension pages |
| `ai.html` | AI tab page — capture button, instruction input, generate button, response area, action bar |
| `style/ai.css` | Styles for the AI tab — follows existing design token patterns from `style/style.css` |

### Modified Files

| File | Changes |
|------|---------|
| `messages.html` | Add "AI" nav link in header (conditionally shown based on `aiEnabled`) |
| `template.html` | Add "AI" nav link in header (conditionally shown based on `aiEnabled`) |
| `settings.html` | Add "AI" nav link in header + "AI Configuration" section (admin only) |

### Unchanged Files

| File | Reason |
|------|--------|
| `index.html` | Login page — no nav, no changes needed |
| `style/style.css` | Shared styles — already has all needed tokens and components |
| `style/reset.css` | Reset styles — no changes |
| `style/theme.js` | Theme loader — no changes |
| `style/login.css` | Login styles — no changes |
| `style/message.css` | Message page styles — no changes |
| `style/template.css` | Template page styles — no changes |

---

## Task 1: Chrome Extension Manifest

**Files:**
- Create: `manifest.json`

- [ ] **Step 1: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "MasterBot - Vacation Rental Assistant",
  "version": "1.0.0",
  "description": "Message templates and AI-powered responses for Airbnb hosts",
  "icons": {
    "48": "img/MasterLogo.jpg",
    "128": "img/MasterLogo.jpg"
  },
  "action": {
    "default_popup": "index.html",
    "default_icon": "img/MasterLogo.jpg"
  },
  "permissions": [
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://www.airbnb.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://www.airbnb.com/hosting/inbox/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self' https://www.gstatic.com; object-src 'self'"
  }
}
```

- [ ] **Step 2: Verify extension loads in Chrome**

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `MasterBot` folder
4. Expected: extension icon appears in toolbar, clicking it opens the login page

---

## Task 2: Content Script for Airbnb Scraping

**Files:**
- Create: `content.js`

- [ ] **Step 1: Create content.js with message listener**

```javascript
// Content script injected into Airbnb messaging pages
// Listens for scrape requests from the extension and returns conversation data

(function () {
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action !== "scrapeConversation") return false;

    try {
      const messages = scrapeMessages();
      sendResponse({ success: true, messages: messages });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }

    return true; // keep message channel open for async response
  });

  function scrapeMessages() {
    const messages = [];

    // Airbnb messaging thread container
    // These selectors need to be verified against the live Airbnb DOM
    // and updated if Airbnb changes their markup
    const threadContainer = document.querySelector(
      '[data-testid="messaging-thread"], ' +
      '[class*="message-thread"], ' +
      '[class*="messaging_thread"], ' +
      '.messaging-thread'
    );

    if (!threadContainer) {
      throw new Error("Could not find message thread on this page.");
    }

    // Find all message elements within the thread
    const messageElements = threadContainer.querySelectorAll(
      '[data-testid="message-content"], ' +
      '[class*="message-content"], ' +
      '[class*="MessageContent"], ' +
      '[class*="message_content"]'
    );

    if (messageElements.length === 0) {
      // Fallback: try to find any text blocks that look like messages
      const fallbackElements = threadContainer.querySelectorAll(
        'div[dir="ltr"], [class*="message"] p, [class*="Message"] span'
      );

      if (fallbackElements.length === 0) {
        throw new Error("Could not find messages in the thread.");
      }

      fallbackElements.forEach(function (el) {
        const text = el.textContent.trim();
        if (!text || text.length < 2) return;

        // Try to determine role by checking parent classes/attributes
        const parent = el.closest('[class*="outgoing"], [class*="sent"], [class*="host"], [class*="Outgoing"]');
        const role = parent ? "host" : "guest";

        messages.push({ role: role, text: text });
      });
    } else {
      messageElements.forEach(function (el) {
        const text = el.textContent.trim();
        if (!text) return;

        const parent = el.closest('[class*="outgoing"], [class*="sent"], [class*="host"], [class*="Outgoing"]');
        const role = parent ? "host" : "guest";

        messages.push({ role: role, text: text });
      });
    }

    if (messages.length === 0) {
      throw new Error("No messages found in the conversation.");
    }

    return messages;
  }
})();
```

- [ ] **Step 2: Test content script injection**

1. Reload the extension in `chrome://extensions/`
2. Open the Airbnb hosting inbox in a new tab: `https://www.airbnb.com/hosting/inbox/`
3. Open DevTools (F12) → Console
4. Expected: no errors from `content.js`
5. Note: actual scraping accuracy will be tested and selectors adjusted after inspecting the live Airbnb DOM

---

## Task 3: AI Tab Styles

**Files:**
- Create: `style/ai.css`

- [ ] **Step 1: Create style/ai.css**

```css
/* ========================================
   AI TAB PAGE
   ======================================== */
.ai-main {
  max-width: 700px;
  margin: 0 auto;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Capture Section */
.capture-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.capture-status {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.capture-status.captured {
  color: var(--success);
}

.paste-toggle {
  font-size: 0.75rem;
  color: var(--text-muted);
  cursor: pointer;
  text-decoration: underline;
  background: none;
  border: none;
  padding: 0;
}

.paste-toggle:hover {
  color: var(--text-secondary);
}

.paste-area {
  display: none;
}

.paste-area.visible {
  display: block;
}

.paste-area textarea {
  width: 100%;
  min-height: 80px;
  max-height: 120px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 14px;
  color: var(--text-primary);
  font-size: 0.82rem;
  line-height: 1.5;
  resize: vertical;
}

.paste-area textarea::placeholder {
  color: var(--text-muted);
}

/* Instruction Input */
.instruction-section .form-group input {
  width: 100%;
}

/* Generate Button */
.btn-generate-ai {
  padding: 12px;
  font-size: 0.9rem;
  position: relative;
}

.btn-generate-ai.loading {
  pointer-events: none;
  opacity: 0.7;
}

.btn-generate-ai .spinner {
  display: none;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.btn-generate-ai.loading .spinner {
  display: inline-block;
}

.btn-generate-ai.loading .btn-text {
  display: none;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Response Section */
.response-section {
  display: none;
  flex-direction: column;
  gap: 12px;
}

.response-section.visible {
  display: flex;
}

.response-section textarea {
  width: 100%;
  min-height: 200px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  color: var(--text-primary);
  font-size: 0.82rem;
  line-height: 1.6;
  resize: vertical;
}

.response-section textarea::placeholder {
  color: var(--text-muted);
}

/* Action Bar */
.action-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.adjust-group {
  display: flex;
  gap: 8px;
  flex: 1;
  min-width: 200px;
}

.adjust-group input {
  flex: 1;
  background: var(--bg-input);
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-size: 0.82rem;
}

.adjust-group input::placeholder {
  color: var(--text-muted);
}

.adjust-group input:focus {
  border-color: var(--accent);
}

.action-buttons {
  display: flex;
  gap: 8px;
}
```

---

## Task 4: AI Tab HTML and Logic

**Files:**
- Create: `ai.html`

- [ ] **Step 1: Create ai.html**

```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Assistant - Master Vacation Homes</title>

    <link rel="shortcut icon" href="img/MasterLogo.jpg" type="image/x-icon">
    <script src="style/theme.js"></script>

    <link rel="stylesheet" href="style/reset.css">
    <link rel="stylesheet" href="style/style.css">
    <link rel="stylesheet" href="style/ai.css">

    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
        import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

        const firebaseConfig = {
            apiKey: "AIzaSyAKYoUaxhOX1pagezUTTDbwWVg5ktcSEcY",
            authDomain: "templatemaster-a2d6e.firebaseapp.com",
            projectId: "templatemaster-a2d6e",
            storageBucket: "templatemaster-a2d6e.firebasestorage.app",
            messagingSenderId: "208432538664",
            appId: "1:208432538664:web:10a29a55efbb824ae1411d",
            measurementId: "G-LLVT6XW024"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth();
        const db = getFirestore(app);

        let capturedMessages = [];
        let allTemplates = [];
        let systemPrompt = "";
        let apiUrl = "";

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                document.getElementById("user-email").innerText = user.email;

                // Check if user has AI access
                const settingsRef = doc(db, "settings", user.uid);
                const snap = await getDoc(settingsRef);
                if (!snap.exists() || !snap.data().aiEnabled) {
                    window.location.href = "messages.html";
                    return;
                }

                // Load global AI config
                const globalRef = doc(db, "settings", "global");
                const globalSnap = await getDoc(globalRef);
                if (globalSnap.exists()) {
                    const globalData = globalSnap.data();
                    apiUrl = globalData.aiApiUrl || "";
                    systemPrompt = globalData.aiSystemPrompt || getDefaultSystemPrompt();
                } else {
                    systemPrompt = getDefaultSystemPrompt();
                }

                // Load user templates
                await loadTemplates(user.uid);
            } else {
                window.location.href = "index.html";
            }
        });

        function getDefaultSystemPrompt() {
            return `You are a professional and friendly customer service agent for Master Vacation Homes, a vacation rental company. You respond to guest messages on Airbnb.

Rules:
- Always respond in English
- Be friendly and professional — match the guest's tone (more formal if they're formal, casual if they're casual)
- Keep responses concise and helpful
- Never promise refunds or discounts without explicit instruction
- Never share information about other guests or reservations
- If you're unsure about something, suggest the guest contact the host directly
- Use the provided message templates as reference for tone and content style`;
        }

        async function loadTemplates(userId) {
            const userDocRef = doc(db, "templates", userId);
            const userTemplatesCollection = collection(userDocRef, "userTemplates");
            const querySnapshot = await getDocs(userTemplatesCollection);

            allTemplates = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                allTemplates.push({
                    name: data.name,
                    content: data.description.replace(/\\n/g, "\n")
                });
            });
        }

        // Capture conversation from Airbnb tab
        window.captureConversation = async function () {
            const statusEl = document.getElementById("capture-status");

            try {
                // Query the active Airbnb tab
                const tabs = await chrome.tabs.query({ active: true, currentWindow: false, url: "https://www.airbnb.com/hosting/inbox/*" });

                if (tabs.length === 0) {
                    showToast("No Airbnb inbox tab found. Open the Airbnb messaging page first.", "error");
                    return;
                }

                const response = await chrome.tabs.sendMessage(tabs[0].id, { action: "scrapeConversation" });

                if (response && response.success) {
                    capturedMessages = response.messages;
                    statusEl.textContent = capturedMessages.length + " messages captured";
                    statusEl.className = "capture-status captured";
                    showToast("Conversation captured!");
                } else {
                    showToast(response?.error || "Failed to capture conversation.", "error");
                }
            } catch (error) {
                showToast("Could not connect to Airbnb tab. Make sure the inbox is open.", "error");
            }
        };

        // Toggle paste fallback
        window.togglePaste = function () {
            const pasteArea = document.getElementById("paste-area");
            pasteArea.classList.toggle("visible");
        };

        // Parse manually pasted conversation
        function parseManualPaste() {
            const pasteText = document.getElementById("paste-input").value.trim();
            if (!pasteText) return [];

            // Simple parse: treat each line as a message, alternating guest/host
            // User can paste the raw conversation text
            const lines = pasteText.split("\n").filter(function (l) { return l.trim(); });
            return lines.map(function (line) {
                return { role: "guest", text: line.trim() };
            });
        }

        // Generate AI response
        window.generateResponse = async function () {
            const btn = document.getElementById("generate-btn");
            const responseSection = document.getElementById("response-section");
            const responseArea = document.getElementById("ai-response");
            const instruction = document.getElementById("instruction-input").value.trim();

            // Use captured messages, or fall back to manual paste
            let messages = capturedMessages.length > 0 ? capturedMessages : parseManualPaste();

            if (messages.length === 0) {
                showToast("Capture a conversation first, or paste one manually.", "error");
                return;
            }

            if (!apiUrl) {
                showToast("AI API URL not configured. Ask your admin to set it in Settings.", "error");
                return;
            }

            // Build the prompt
            const templateContext = allTemplates.length > 0
                ? "\n\nHere are message templates used by the company as reference for tone and content:\n\n" +
                  allTemplates.map(function (t) { return "### " + t.name + "\n" + t.content; }).join("\n\n")
                : "";

            const conversationText = messages.map(function (m) {
                return (m.role === "guest" ? "Guest" : "Host") + ": " + m.text;
            }).join("\n");

            const userMessage = "Here is the conversation with the guest:\n\n" +
                conversationText +
                "\n\nPlease write a response to the guest's latest message." +
                (instruction ? "\n\nAdditional instructions: " + instruction : "");

            // Show loading
            btn.classList.add("loading");

            try {
                const res = await fetch(apiUrl + "/v1/chat/completions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "llama3.1:8b",
                        messages: [
                            { role: "system", content: systemPrompt + templateContext },
                            { role: "user", content: userMessage }
                        ],
                        temperature: 0.7
                    })
                });

                if (!res.ok) {
                    throw new Error("API returned " + res.status);
                }

                const data = await res.json();
                const aiText = data.choices[0].message.content;

                responseArea.value = aiText;
                responseSection.classList.add("visible");

            } catch (error) {
                showToast("AI is unavailable. Check if the server is running.", "error");
                console.error("AI error:", error);
            } finally {
                btn.classList.remove("loading");
            }
        };

        // Adjust response
        window.adjustResponse = async function () {
            const adjustInput = document.getElementById("adjust-input");
            const adjustText = adjustInput.value.trim();
            const responseArea = document.getElementById("ai-response");
            const currentResponse = responseArea.value;

            if (!adjustText) { showToast("Enter an adjustment instruction.", "error"); return; }
            if (!currentResponse) { showToast("Generate a response first.", "error"); return; }

            const btn = document.getElementById("generate-btn");
            btn.classList.add("loading");

            try {
                const res = await fetch(apiUrl + "/v1/chat/completions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "llama3.1:8b",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "assistant", content: currentResponse },
                            { role: "user", content: "Please adjust the response above: " + adjustText }
                        ],
                        temperature: 0.7
                    })
                });

                if (!res.ok) throw new Error("API returned " + res.status);

                const data = await res.json();
                responseArea.value = data.choices[0].message.content;
                adjustInput.value = "";
                showToast("Response adjusted!");

            } catch (error) {
                showToast("AI is unavailable. Check if the server is running.", "error");
                console.error("AI error:", error);
            } finally {
                btn.classList.remove("loading");
            }
        };

        // Regenerate response
        window.regenerateResponse = function () {
            document.getElementById("ai-response").value = "";
            window.generateResponse();
        };

        // Copy response
        window.copyResponse = function () {
            const responseArea = document.getElementById("ai-response");
            if (!responseArea.value) { showToast("Nothing to copy.", "error"); return; }

            navigator.clipboard.writeText(responseArea.value).then(function () {
                showToast("Response copied to clipboard!");
            }).catch(function () {
                showToast("Failed to copy.", "error");
            });
        };

        // Handle Enter key on adjust input
        window.handleAdjustKeypress = function (e) {
            if (e.key === "Enter") adjustResponse();
        };

        function showToast(message, type) {
            type = type || "success";
            const toast = document.getElementById("toast");
            toast.textContent = message;
            toast.className = "toast " + type + " show";
            setTimeout(function () { toast.classList.remove("show"); }, 2500);
        }

        window.logout = function () {
            signOut(auth).then(function () {
                window.location.href = "index.html";
            });
        };
    </script>
</head>

<body>
    <!-- Header -->
    <header class="app-header">
        <div class="header-left">
            <a href="messages.html" class="header-logo">
                <img src="img/MasterLogo.jpg" alt="Logo">
            </a>
            <nav class="header-nav">
                <a href="template.html" class="nav-link">Templates</a>
                <a href="messages.html" class="nav-link">Messages</a>
                <a href="ai.html" class="nav-link active">AI</a>
                <a href="settings.html" class="nav-link">Settings</a>
            </nav>
        </div>
        <div class="header-right">
            <span id="user-email" class="header-email"></span>
            <button onclick="window.logout()" class="btn btn-sm btn-outline">Sign Out</button>
        </div>
    </header>

    <!-- Main Content -->
    <main class="ai-main">
        <!-- Capture Section -->
        <div class="capture-section">
            <button onclick="captureConversation()" class="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Capture Conversation
            </button>
            <span id="capture-status" class="capture-status"></span>
            <button onclick="togglePaste()" class="paste-toggle">or paste manually</button>
        </div>

        <!-- Manual Paste Fallback -->
        <div id="paste-area" class="paste-area">
            <textarea id="paste-input" placeholder="Paste the conversation here..."></textarea>
        </div>

        <!-- Instruction -->
        <div class="instruction-section">
            <div class="form-group">
                <label for="instruction-input">Instructions for AI (optional)</label>
                <input type="text" id="instruction-input" placeholder='e.g. "say checkout is 11am", "deny late checkout politely"'>
            </div>
        </div>

        <!-- Generate Button -->
        <button id="generate-btn" onclick="generateResponse()" class="btn btn-primary btn-full btn-generate-ai">
            <span class="btn-text">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Generate Response
            </span>
            <span class="spinner"></span>
        </button>

        <!-- Response Section -->
        <div id="response-section" class="response-section">
            <label class="output-label">AI Response</label>
            <textarea id="ai-response" placeholder="AI response will appear here..."></textarea>

            <!-- Action Bar -->
            <div class="action-bar">
                <div class="adjust-group">
                    <input type="text" id="adjust-input" placeholder='Adjust: "shorter", "more formal"...' onkeypress="handleAdjustKeypress(event)">
                    <button onclick="adjustResponse()" class="btn btn-outline btn-sm">Adjust</button>
                </div>
                <div class="action-buttons">
                    <button onclick="regenerateResponse()" class="btn btn-outline btn-sm" title="Regenerate">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    </button>
                    <button onclick="copyResponse()" class="btn btn-primary btn-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copy
                    </button>
                </div>
            </div>
        </div>
    </main>

    <!-- Toast -->
    <div id="toast" class="toast"></div>
</body>

</html>
```

- [ ] **Step 2: Verify ai.html loads in browser**

Open `ai.html` directly in a browser.
Expected: page renders with header, capture button, instruction field, generate button. No console errors (except Firebase auth redirect which is expected).

---

## Task 5: Add AI Nav Link to Existing Pages (Conditional)

**Files:**
- Modify: `messages.html` (header nav, lines 346-349)
- Modify: `template.html` (header nav, lines 352-355)
- Modify: `settings.html` (header nav, lines 442-445)

The AI nav link must only appear if the user has `aiEnabled: true` in their Firestore settings. Each page already loads Firestore and has an `onAuthStateChanged` handler.

- [ ] **Step 1: Add AI nav link and conditional logic to messages.html**

In the `<nav>` section of `messages.html`, add the AI link:

```html
<nav class="header-nav">
    <a href="template.html" class="nav-link">Templates</a>
    <a href="messages.html" class="nav-link active">Messages</a>
    <a href="ai.html" class="nav-link" id="ai-nav-link" style="display:none">AI</a>
    <a href="settings.html" class="nav-link">Settings</a>
</nav>
```

Inside the existing `onAuthStateChanged` callback in `messages.html`, after loading settings, add:

```javascript
// Show AI nav link if user has AI access
const settingsSnap = await getDoc(doc(db, "settings", user.uid));
if (settingsSnap.exists() && settingsSnap.data().aiEnabled) {
    document.getElementById("ai-nav-link").style.display = "";
}
```

Note: `messages.html` already calls `getDoc` on the settings doc inside `loadSignature()` — the AI check can reuse that same snap. Add this check right after the `loadSignature` call in the `onAuthStateChanged` handler, or incorporate it into `loadSignature` to avoid a duplicate Firestore read. The most straightforward approach: add it inside the existing `loadSignature` function where the settings snap is already available. After line `userGreeting.randomList = data.randomGreetings || [];`, add:

```javascript
if (data.aiEnabled) {
    document.getElementById("ai-nav-link").style.display = "";
}
```

- [ ] **Step 2: Add AI nav link and conditional logic to template.html**

Same pattern. In the `<nav>`:

```html
<a href="ai.html" class="nav-link" id="ai-nav-link" style="display:none">AI</a>
```

Insert between the Messages and Settings links.

In `template.html`, the `loadCategories` function already reads the settings doc. After loading categories from the snap, add:

```javascript
if (data.aiEnabled) {
    document.getElementById("ai-nav-link").style.display = "";
}
```

- [ ] **Step 3: Add AI nav link and conditional logic to settings.html**

Same pattern. In the `<nav>`:

```html
<a href="ai.html" class="nav-link" id="ai-nav-link" style="display:none">AI</a>
```

In `settings.html`, the `loadSettings` function reads the settings doc. Inside `loadSettings`, after loading existing data, add:

```javascript
if (data.aiEnabled) {
    document.getElementById("ai-nav-link").style.display = "";
}
```

- [ ] **Step 4: Verify nav links**

1. In Firestore console, set `aiEnabled: true` on a test user's settings doc
2. Log in as that user
3. Expected: "AI" nav link appears between "Messages" and "Settings" on all three pages
4. Log in as a user without `aiEnabled`
5. Expected: no "AI" nav link visible

---

## Task 6: AI Configuration Section in Settings (Admin Only)

**Files:**
- Modify: `settings.html` (add AI Configuration section + admin logic)
- Modify: `style/settings.css` (add styles for AI config textarea)

- [ ] **Step 1: Add AI Configuration section HTML to settings.html**

Add this section after the Signature section and before the Save button in `settings.html`:

```html
<!-- AI Configuration Section (admin only) -->
<section id="ai-config-section" class="settings-section" style="display: none;">
    <div class="section-header">
        <div class="section-info">
            <h2>AI Configuration</h2>
            <p>Configure the AI assistant. These settings apply to all users.</p>
        </div>
    </div>
    <div class="ai-config-fields">
        <div class="form-group">
            <label for="ai-api-url">API URL</label>
            <input type="text" id="ai-api-url" placeholder="e.g. https://your-tunnel.trycloudflare.com">
        </div>
        <div class="form-group">
            <label for="ai-system-prompt">System Prompt</label>
            <textarea id="ai-system-prompt" class="ai-prompt-textarea" placeholder="Instructions for how the AI should behave..."></textarea>
        </div>
    </div>
</section>
```

- [ ] **Step 2: Add styles for AI config textarea to style/settings.css**

Append to the end of `style/settings.css`:

```css
/* AI Configuration */
.ai-config-fields {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-prompt-textarea {
  min-height: 200px;
  font-family: monospace;
  font-size: 0.82rem;
  line-height: 1.5;
}
```

- [ ] **Step 3: Add admin logic to settings.html JavaScript**

In the `loadSettings` function, after loading other settings, add:

```javascript
// AI admin config
if (data.isAdmin) {
    document.getElementById("ai-config-section").style.display = "";

    // Load global AI settings
    const globalRef = doc(db, "settings", "global");
    const globalSnap = await getDoc(globalRef);
    if (globalSnap.exists()) {
        const globalData = globalSnap.data();
        document.getElementById("ai-api-url").value = globalData.aiApiUrl || "";
        document.getElementById("ai-system-prompt").value = globalData.aiSystemPrompt || "";
    }
}
```

In the `saveSettings` function, before the final `showToast("Settings saved!")`, add:

```javascript
// Save AI config if admin
const userSnap = await getDoc(settingsRef);
if (userSnap.exists() && userSnap.data().isAdmin) {
    const globalRef = doc(db, "settings", "global");
    await setDoc(globalRef, {
        aiApiUrl: document.getElementById("ai-api-url").value.trim(),
        aiSystemPrompt: document.getElementById("ai-system-prompt").value.trim()
    }, { merge: true });
}
```

- [ ] **Step 4: Verify admin config**

1. In Firestore, set `isAdmin: true` on a test user's settings doc
2. Log in as that user, go to Settings
3. Expected: "AI Configuration" section appears with API URL and System Prompt fields
4. Enter a test URL and prompt, click Save
5. Check Firestore `settings/global` doc — should have `aiApiUrl` and `aiSystemPrompt` fields
6. Log in as a non-admin user
7. Expected: "AI Configuration" section not visible

---

## Task 7: End-to-End Testing

**Files:** None (testing only)

- [ ] **Step 1: Set up Firestore for testing**

In Firebase console, on a test user's settings document:
- Set `aiEnabled: true`
- Set `isAdmin: true`

Create a `settings/global` document with:
- `aiApiUrl`: your Cloudflare Tunnel URL (e.g. `https://xyz.trycloudflare.com`)
- `aiSystemPrompt`: leave empty (will use default)

- [ ] **Step 2: Test extension installation**

1. Go to `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked", select the MasterBot folder
4. Expected: extension loads without errors

- [ ] **Step 3: Test login and navigation**

1. Click extension icon → login page appears
2. Log in with test account
3. Expected: redirected to Messages page, "AI" nav link visible in header
4. Click "AI" → navigates to AI tab
5. Click "Settings" → AI Configuration section visible

- [ ] **Step 4: Test AI generation (requires Ollama running)**

1. On the server machine: `OLLAMA_HOST=0.0.0.0 ollama serve`
2. On the server machine: `cloudflared tunnel --url http://localhost:11434`
3. Copy the tunnel URL, paste in Settings → AI Configuration → API URL, save
4. Open Airbnb inbox in another tab, open a conversation
5. In extension AI tab, click "Capture Conversation"
6. Expected: "X messages captured" status appears
7. Click "Generate Response"
8. Expected: AI response appears in the textarea
9. Test "Adjust" with "make it shorter"
10. Test "Regenerate"
11. Test "Copy"

- [ ] **Step 5: Test fallback (paste manually)**

1. Without Airbnb tab open, click "Capture Conversation"
2. Expected: error toast
3. Click "or paste manually"
4. Expected: small textarea appears
5. Paste a conversation, click "Generate Response"
6. Expected: AI response generated from pasted text

- [ ] **Step 6: Test permission restrictions**

1. Log in as user without `aiEnabled`
2. Expected: no "AI" nav link, navigating directly to `ai.html` redirects to messages
3. Log in as non-admin user with `aiEnabled`
4. Expected: "AI" nav link visible, but no "AI Configuration" in Settings

- [ ] **Step 7: Test site still works standalone**

1. Open `https://alissonrochah.github.io` (or local file)
2. Expected: login, templates, messages, settings all work as before
3. Note: "Capture Conversation" won't work outside extension context (no `chrome.tabs`), but paste fallback will
