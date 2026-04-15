# MasterBot AI Tab + Chrome Extension — Design Spec

## Overview

Add an AI-powered response generator to MasterBot and package the app as a Chrome extension that runs inside the Airbnb host messaging page. The AI reads the guest conversation, uses the attendant's templates as style/content reference, and generates a professional response.

## Goals

- Let attendants generate AI-powered responses to Airbnb guests without leaving the Airbnb page
- Maintain consistency with company messaging patterns via templates as context
- Keep the existing MasterBot functionality (Templates, Messages, Settings) unchanged
- Work as both a Chrome extension and a regular website

## Non-Goals

- Knowledge base / property database (future scope)
- Integration with platforms other than Airbnb
- Conversation history with AI (sessions are stateless)
- Auto-sending messages to Airbnb (always copy/paste by attendant)

---

## 1. Chrome Extension

### Structure

- **Manifest V3** — standard Chrome extension format
- **`manifest.json`** — extension config, permissions, content script registration
- **`content.js`** — content script injected into Airbnb pages for conversation scraping
- Existing HTML pages (index, messages, templates, settings) work as extension pages
- New **`ai.html`** — the AI tab page

### Compatibility

- Same package runs on **Chrome, Brave, and Edge** (all Chromium-based)
- GitHub Pages site continues to work as a standalone website

### Extension Behavior

- Opens as popup or side panel alongside the Airbnb messaging page
- Header nav updated: Templates | Messages | **AI** | Settings
- Firebase Auth and Firestore work the same as the website

---

## 2. AI Tab (`ai.html`)

### Layout (top to bottom)

1. **Header** — same nav as other tabs
2. **"Capture Conversation" button** — triggers scraping of the Airbnb chat
   - Shows "Conversation captured" toast on success
   - Error toast if scraping fails
   - Discrete "or paste manually" link that expands a small textarea (hidden by default, does not occupy screen space)
3. **Instruction field (optional)** — text input for attendant instructions
   - Placeholder: "Any instructions for the AI? (optional)"
   - Examples: "say checkout is 11am", "deny late checkout politely"
4. **"Generate Response" button** — sends everything to Ollama
   - Shows spinner/loading indicator while processing
5. **Response area** — editable textarea with the generated response
6. **Action bar:**
   - **Adjust** — text field + send button to request AI adjustments ("shorter", "more formal")
   - **Regenerate** — generates a new response from scratch
   - **Copy** — copies response to clipboard

### Typical Flow

Capture → (optional instruction) → Generate → (edit or adjust) → Copy → paste in Airbnb

---

## 3. Airbnb Conversation Scraping

### Mechanism

- `content.js` is injected into Airbnb messaging pages via `manifest.json`
- When "Capture Conversation" is clicked, the AI tab sends a message to the content script
- Content script reads the DOM, extracts messages, and sends them back

### Data Format

```json
[
  { "role": "guest", "text": "Hi, what time is check-in?" },
  { "role": "host", "text": "Check-in is at 3pm!" },
  { "role": "guest", "text": "Can I do late checkout?" }
]
```

### Extraction

- Identifies each message's sender (guest vs host)
- Extracts message text
- Maintains chronological order
- Captures the **entire conversation**

### DOM Selectors

- Must be determined by inspecting the live Airbnb messaging page
- Initial implementation uses best-guess selectors, adjusted after real testing

### Fallback

- If scraping fails: error toast + discrete "or paste manually" link expands a small textarea
- Manual paste fallback works regardless of Airbnb DOM changes

---

## 4. AI Response Generation

### Payload sent to Ollama

1. **System prompt** — defines AI role, tone rules, language (English)
2. **Templates context** — all user templates from Firestore as style/content reference
3. **Conversation** — full Airbnb conversation array
4. **Attendant instruction** — optional user-provided direction

### AI Behavior

- Responds in **English only**
- Default tone: **friendly and professional**
- **Adapts to conversation tone** — if guest is formal, responds formally; if casual, matches
- Uses attendant's templates as reference for how the company communicates
- Responds to the **last guest message** considering full conversation context

### Adjust / Regenerate

- **Adjust**: sends the current response + adjustment instruction back to Ollama for refinement
- **Regenerate**: sends the original payload again for a fresh response

### Backend

- **Ollama** running on a separate machine with `llama3.1:8b` model
- Exposed via **Cloudflare Tunnel** (generates a public URL)
- API: Ollama's OpenAI-compatible endpoint (`/v1/chat/completions`)
- Simple `fetch` call from the extension

### Error Handling

- Ollama offline or tunnel down: toast "AI is unavailable. Check if the server is running."
- Slow response: loading spinner on Generate button, no timeout (let it process)

---

## 5. Permissions & Access Control

### AI Tab Access

- Firestore field `aiEnabled: boolean` on each user's settings document
- If `aiEnabled` is `false` or missing: AI tab **does not appear** in the header nav
- Admin sets this field in Firestore console

### Admin Access

- Firestore field `isAdmin: boolean` on each user's settings document
- Admins see the "AI Configuration" section in Settings
- Regular attendants do not see it

### Users

- ~16 attendants, each with their own Firebase Auth account
- Permissions managed via Firestore console by admin

---

## 6. Settings — AI Configuration

### Visibility

- Only visible to users with `isAdmin: true`
- Appears as a new section in `settings.html`

### Fields (stored in `settings/global` document in Firestore)

- **API URL** — text input for Cloudflare Tunnel URL (e.g., `https://xyz.trycloudflare.com`)
- **System Prompt** — textarea with the base AI prompt (comes with a sensible default, admin can customize)

### Global Scope

- Both fields are **global** — same for all users
- Only admins can view and edit

---

## 7. Files Changed / Added

### New Files

- `manifest.json` — Chrome extension config
- `content.js` — Airbnb DOM scraping script
- `ai.html` — AI tab page
- `style/ai.css` — AI tab styles

### Modified Files

- `settings.html` — add AI Configuration section (admin only)
- `style/settings.css` — styles for AI Configuration section
- All HTML headers — add "AI" nav link (conditionally shown)

### Unchanged

- `index.html` (login) — no changes
- Core logic of messages.html and template.html — no changes
- Firebase config — no changes
