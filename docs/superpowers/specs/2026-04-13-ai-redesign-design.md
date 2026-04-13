# AI Redesign — Two-call pipeline

**Target branch:** `main` (Supabase stack)
**Ordering:** visual refresh lands as separate commit first, AI redesign commits follow.

## Problem

The AI feature as it exists today is unusable in practice:

- Responses are generic enough that the user always rewrites them.
- Flow is long (capture → instruction → generate → adjust → copy) so the user avoids opening it.
- The prompt ignores reservation and property context entirely.
- All templates are stuffed into every request, wasting tokens and blurring intent.
- Two AI paths coexist (`ai.html` with Ollama, `messages.html` suggest with Groq), inconsistent and confusing.

## Goal

Make the AI tab produce a response the user can copy-paste to the guest with zero edits, >70% of the time, in under 3 seconds from opening the page.

## Success criteria

- Opening `ai.html` auto-captures the conversation, auto-detects the resort, auto-runs the router, auto-writes the response — all without user clicks.
- Response uses the correct property name, the correct gate code, and language consistent with existing templates.
- Only 3-5 templates (the relevant ones) end up in the writer prompt, not all 50+.
- One AI provider for everything (Groq). Ollama path removed.
- Failure modes are visible (warning strips, retry buttons) — never silent.

---

## Architecture

### Data sources

Three structured inputs feed the pipeline. Each is loaded in parallel on page open.

**1. Conversation** — from the Chrome extension content script (`extension/content.js`).
Shape:

```ts
type Message = { role: "guest" | "host"; text: string; sender?: string };
type Conversation = Message[];
```

Delivery: `chrome.runtime.sendMessage(EXTENSION_ID, { action: "scrapeConversation" }, callback)`.

**2. Matched resort** — from the content script's existing resort detection (`chrome.storage.local.rm_matched_resort`), plus a fetch from `public.resorts` to get the full row.

Shape used in prompts:

```ts
type ResortContext = {
    name: string;
    gate_code: string;
    sections: Array<{ type: string; title: string; items: Array<{ label: string; value: string }> }>;
};
```

If no match, `resort` is `null` and the writer runs without resort context.

**3. Templates** — `public.templates` filtered by `auth_user_id`. Two shapes:

```ts
// Compact — passed to router
type TemplateSummary = { id: string; name: string; ai_summary: string };

// Full — only the router-selected ones are passed to writer
type TemplateFull = { id: string; name: string; description: string };
```

### Pipeline

```
┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
│ page load  │──▶│ load ctx   │──▶│ Call 1:    │──▶│ Call 2:    │
│            │   │ (parallel) │   │ Router     │   │ Writer     │
└────────────┘   └────────────┘   └────────────┘   └────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   scrape conv    read resort     query Supabase
   (extension)    (extension)     (templates, settings,
                                   global_settings.ai_config)
```

**Call 1 — Router** (`llama-3.3-70b-versatile`, `temperature: 0`, `max_tokens: 200`)

Purpose: filter templates and detect intent. Fast, cheap, deterministic.

```
system:
You are a message routing assistant. Given a guest's most recent message,
a list of available response templates (by ID + short summary), and the
resort context, pick the 1-5 most relevant templates and summarize what
the guest is asking in one short sentence.

Reply ONLY with valid JSON in this exact shape:
{"template_ids": ["id1","id2"], "intent": "guest asking about check-in"}

No prose, no markdown, no code fences. JSON only.

user:
Resort: {resort?.name ?? "unknown"}
Guest's last message: {last guest message text}

Available templates:
[tpl_abc123] guest asks about check-in time
[tpl_def456] gate code and directions
[tpl_ghi789] pool hours and amenities
...
```

Parsing: `JSON.parse` with try/catch. On failure, router result is treated
as `{template_ids: [], intent: ""}` and writer proceeds without templates.
On success, validate each `template_id` against loaded templates (drop
unknowns silently).

**Call 2 — Writer** (`llama-3.3-70b-versatile`, `temperature: 0.4`, `max_tokens: 400`)

Purpose: produce the final message.

```
system:
{ai_system_prompt from global_settings.ai_config, or DEFAULT_SYSTEM_PROMPT}

{if resort context present:}
Property: {resort.name}
Gate code: {resort.gate_code}
Property info:
{formatted resort.sections — only sections with items, rendered as
"- Label: Value" bullet lists grouped by section title}

{if templates filtered by router:}
Reference templates (use as tone/info reference, don't copy verbatim):

--- {template.name} ---
{template.description}

--- {next template.name} ---
...

user:
Conversation so far:
Guest: ...
Host: ...
Guest: ... (most recent)

Guest's intent (detected): {router.intent}

Write a short, direct reply to the guest's LAST message only. Do NOT
repeat information the host already gave earlier in the thread. Match
the guest's tone (casual if casual, formal if formal). Output only the
message text, nothing else.

{if user instruction provided:}
Additional instruction from host: {instruction}
```

Response goes directly into the editable `<textarea>`.

### Adjust path

When user clicks Adjust + types an instruction:

- Single call, writer model only (no router re-run).
- System prompt: same as writer's, minus templates (they're already baked
  into the current draft).
- User message: `"Current draft: {current}. Adjust it with this
  instruction: {instruction}. Return only the adjusted text."`
- Temperature: `0.4`, max_tokens `400`.

### Regenerate path

Re-runs the full pipeline from scratch (router + writer). Same inputs,
fresh outputs.

---

## UX

### Layout (happy path)

```
┌─────────────────────────────────────────────────┐
│ [Logo] Templates  Messages  AI  Settings        │
├─────────────────────────────────────────────────┤
│                                                 │
│  🏠 Champions Gate  ·  💬 14 msgs  ·  ✨ 3 tpls │  ← status strip
│                                                 │
│  ┌─ AI Response ───────────────────────────┐    │
│  │                                         │    │
│  │  Hi John, check-in is at 4pm. The gate │    │
│  │  code is 1527#. Let me know if you     │    │
│  │  need anything else!                   │    │
│  │                                         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  [🔄 Regenerate]  [✨ Adjust]       [📋 Copy]   │
│                                                 │
│  ── Details ────────────────────────── ▾        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Components

**Status strip** (one line, `--bg-elevated`, rounded pill style per chip)

- `🏠 {resort.name}` — text-primary when matched, text-muted when not.
- `💬 {N} messages captured` — text-primary when N>0, warning when capture failed.
- `✨ {N} templates used` — populated after the router call returns.
- Click strip → expands the Details section below.

**Response card**

- Background `--bg-card`, border-radius `--radius-lg`, padding 22px.
- While loading: skeleton (3 pulsing lines).
- When response arrives: fade-in 180ms, textarea replaces skeleton.
- Textarea is editable (user can tweak manually before copying).
- Auto-grows with content, min-height 160px.

**Action row**

- `Regenerate` — ghost button, icon + label, re-runs pipeline.
- `Adjust` — outline button, clicking it slides down an inline input:
  `[Adjustment instruction...              ]  [Apply]`
  Enter applies, Esc closes.
- `Copy` — primary button, right-aligned. Copies response + signature
  (from `user_settings`) + user's name (from localStorage). Toast
  confirms. Auto-focuses after the response arrives so Enter copies.

**Details** (`<details>` collapsible, closed by default)

Five subsections, rendered as read-only cards:

1. **Conversation captured** — list of messages with role badges.
2. **Templates used** — names only, clickable to expand content.
3. **Intent detected** — the router's `intent` sentence.
4. **Resort context** — name, gate code, formatted sections.
5. **Writer prompt** — the full text sent to the writer call, monospace,
   for debugging. Copy-to-clipboard button.

### States

| State | Visual |
| --- | --- |
| Initial load | Skeleton strip + skeleton card |
| Fetching settings/templates | "Loading context…" in strip |
| Calling extension for conversation | "Capturing conversation…" in strip |
| Router in flight | "Finding relevant templates…" in card |
| Writer in flight | "Writing response…" in card, 3-dot pulse |
| Success | Strip populated, card shows response, actions enabled |
| Capture failed | Strip warning `⚠ Could not capture` + inline "Paste manually" toggle that opens a textarea fallback. User pastes raw text, clicks Generate manually. |
| No resort matched | Strip shows `🏠 No resort matched` in muted. Pipeline continues. |
| Router JSON parse failed | Writer runs without templates. Strip shows `✨ 0 templates (fallback)` in warning. |
| Groq error (429 / 5xx) | Banner at top of card: `AI service error: {message}` + Retry button. Previous response stays visible if any. |
| No API key | Banner: `AI API key not configured — ask an admin.` Actions hidden. |

### Keyboard

- `Esc` — close adjust input / close details
- `Enter` — when Copy is focused, copies
- `r` — regenerate
- `a` — open adjust
- `d` — toggle details

---

## Data / persistence

### Schema changes

**None required.** All the existing tables cover it:

- `public.templates` — source of summaries for the router and full content for the writer.
- `public.user_settings.ai_enabled` — gates access to the page.
- `public.user_settings.signature_*` — used when copying.
- `public.user_settings.extension_id` — already stored.
- `public.global_settings (key='ai_config')` — holds Groq key + system prompt + fallback URL.
- `public.resorts` — full row queried once per session when resort matches.

### `global_settings.ai_config` — field usage

```json
{
  "ai_api_url": "",           // DEPRECATED. Kept for legacy reads, not written to.
  "ai_groq_key": "...",       // REQUIRED. Used by router + writer.
  "ai_system_prompt": "..."   // Optional override. Falls back to DEFAULT_SYSTEM_PROMPT.
}
```

Migration: on first page load after deploy, if `ai_api_url` is present
just ignore it. Don't delete — settings.html may still show/edit it for
now, and we drop that in a follow-up.

### Extension contract

New handler to add: `getMatchedResort`. Returns `chrome.storage.local.rm_matched_resort` value.

```js
// extension/background.js — handle externally
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (request.action === "getMatchedResort") {
        chrome.storage.local.get("rm_matched_resort", (data) => {
            sendResponse({ success: true, resort: data.rm_matched_resort || null });
        });
        return true; // async
    }
    // existing handlers...
});
```

`ai.html` calls it alongside `scrapeConversation`.

---

## Error handling

| Failure | Fallback | User-visible |
| --- | --- | --- |
| Extension not installed | Paste area opens | Warning strip + manual entry |
| Airbnb tab not open | Paste area opens | Warning strip + "Open Airbnb first" |
| Scrape finds 0 messages | Paste area opens | Warning strip |
| Resort not matched | Skip resort context | Muted strip indicator |
| Router JSON unparseable | Writer runs without templates | Warning badge, response still generated |
| Router selects invalid IDs | Silently dropped | None (dropped before writer) |
| Writer returns empty | Show error banner + retry | Banner |
| Groq 429 | Exponential backoff 2s, 1 retry | Banner if retry also fails |
| Groq 5xx | 1 retry immediately | Banner if retry fails |
| Network error | Offer retry | Banner |
| No groq_key configured | Disable actions | Banner "API key not configured" |

All Groq calls wrapped in a single helper with timeout (15s), retry
logic, and structured error returns (`{ok, data?, error?}`).

---

## Files touched

### New files

- (none — existing structure accommodates the redesign)

### Rewritten

- `ai.html` — full rewrite of script block + body layout.
- `style/ai.css` — adjusted for new status strip, inline adjust input, details section.

### Modified

- `extension/background.js` — add handler for `getMatchedResort` action that returns the value from `chrome.storage.local.rm_matched_resort` over `onMessageExternal`.
- `settings.html` — remove the "AI API URL (Ollama)" field from the AI Configuration section, leave Groq key + system prompt.

### Untouched

- `supabase/*.sql` — no schema changes.
- `js/supabase.js`, `js/auth.js` — reused as-is.
- `messages.html` — the `suggest` button there already works and is
  orthogonal. Leave alone.
- `template.html`, `index.html` — unrelated.

---

## Testing / verification

No automated test suite in the repo. Validation is manual, in this
order:

1. **Smoke** — open `ai.html` with Groq key configured, extension running, Airbnb tab open with a real thread. Confirm response appears in <3s without clicks.
2. **No resort** — open a thread for a property that isn't in `resorts`. Confirm pipeline still returns a response, strip shows "No resort matched".
3. **No templates** — user with empty templates table. Confirm router returns empty selection, writer still produces a response.
4. **Capture failure** — open `ai.html` without Airbnb tab. Confirm warning strip + paste fallback works.
5. **Groq down** — point `ai_groq_key` to a bad value. Confirm banner + retry button.
6. **Copy path** — confirm copy includes signature + name correctly, matching the messages.html behavior.
7. **Adjust** — type "make it shorter", confirm only 1 writer call fires (router skipped) and response updates.
8. **Keyboard** — `r` regenerates, `a` opens adjust, `esc` closes, `d` toggles details.

Each is a 30-second check. Total validation ~5 minutes.

---

## Ordering / rollout

On `main`:

1. **Commit A — Visual refresh.** Ink Navy palette + Inter font + refined components (`style/style.css` + per-screen CSS files + `<link>` Inter on all HTMLs). Zero JS changes.
2. **Commit B — Extension handler.** Add `getMatchedResort` message handler in the extension. Standalone, no UI impact. Verify extension still reloads cleanly.
3. **Commit C — AI pipeline helper.** New helper module or inline helper in `ai.html` for Groq calls (router + writer + adjust). Internal only, not wired up yet.
4. **Commit D — AI UI rewrite.** Rewrite the `ai.html` body + script + `ai.css`. Wire up the helper from C. This is the visible landing.
5. **Commit E — Remove Ollama field.** Settings.html cleanup.

Each commit is small, reviewable, and revertable.

---

## What we're not doing (YAGNI)

- **No conversation memory across sessions.** The writer is fresh every
  time — the conversation in the current Airbnb thread is enough context.
- **No chat UI.** Response + adjust field is lighter and faster for the
  real use case (one response per opened thread).
- **No model switching.** Groq + llama-3.3-70b is enough for now. If
  quality misses the bar we upgrade to Claude Haiku 4.5 as a follow-up.
- **No cost dashboard / usage tracking.** Groq is free tier for now.
- **No streaming.** llama-3.3-70b on Groq is fast enough that the full
  response arrives in <1s — streaming would be cosmetic.
- **No template weighting / learning loop.** The router is deterministic
  and stateless. Accuracy comes from good `ai_summary` text on each
  template, not from learning.
