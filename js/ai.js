// AI pipeline helpers — Groq (llama-3.3-70b-versatile).
//
// Three entry points the AI page uses:
//
//   runRouter({ conversation, resort, templates, groqKey })
//     → { ok, templateIds, intent, error? }
//
//   runWriter({ conversation, resort, templates, intent, systemPrompt, instruction, groqKey })
//     → { ok, text, error? }
//
//   runAdjust({ draft, instruction, systemPrompt, groqKey })
//     → { ok, text, error? }
//
// All three share a single retrying fetch helper (callGroq) so the UI
// only has to deal with {ok, ...data, error?} shapes.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
const TIMEOUT_MS = 15_000;

export const DEFAULT_SYSTEM_PROMPT = `You write Airbnb messages on behalf of Master Vacation Homes.

CRITICAL RULES:
- Output ONLY the message text. No quotes, no labels, no "Here is the message:", no explanations before or after.
- Keep it SHORT. 1-3 sentences for simple questions. Max 4-5 sentences for complex topics.
- Match the guest's tone — casual if they're casual, formal if they're formal.
- Always respond in English.
- Never promise refunds or discounts unless explicitly instructed.
- Never share info about other guests or reservations.
- Use the provided templates and property info as reference for tone and facts.`;

// ============ Groq fetch with timeout + one retry ============

async function callGroq({ groqKey, messages, temperature, maxTokens }) {
    if (!groqKey) {
        return { ok: false, error: "AI API key not configured — ask an admin." };
    }

    const body = JSON.stringify({
        model: MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
    });

    async function attempt() {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            const res = await fetch(GROQ_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${groqKey}`,
                },
                body,
                signal: controller.signal,
            });
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                return { ok: false, status: res.status, error: `Groq ${res.status}: ${text.slice(0, 200)}` };
            }
            const data = await res.json();
            const content = data && data.choices && data.choices[0] && data.choices[0].message
                ? data.choices[0].message.content || ""
                : "";
            return { ok: true, content };
        } catch (err) {
            if (err && err.name === "AbortError") {
                return { ok: false, error: "AI request timed out after 15s." };
            }
            return { ok: false, error: `Network error: ${err && err.message}` };
        } finally {
            clearTimeout(timer);
        }
    }

    let result = await attempt();
    // Retry once on 429 / 5xx. Single retry keeps total latency bounded.
    if (!result.ok && result.status && (result.status === 429 || result.status >= 500)) {
        await new Promise((r) => setTimeout(r, 800));
        result = await attempt();
    }
    return result;
}

// ============ Prompt builders ============

function formatConversation(conversation) {
    return conversation
        .map((m) => `${m.role === "host" ? "Host" : "Guest"}: ${m.text}`)
        .join("\n\n");
}

function getLastGuestMessage(conversation) {
    for (let i = conversation.length - 1; i >= 0; i--) {
        if (conversation[i].role === "guest") return conversation[i].text;
    }
    return conversation.length > 0 ? conversation[conversation.length - 1].text : "";
}

function formatResortSections(resort) {
    if (!resort || !Array.isArray(resort.sections)) return "";
    const blocks = [];
    for (const section of resort.sections) {
        if (!section || !Array.isArray(section.items) || section.items.length === 0) continue;
        const lines = section.items
            .filter((i) => i && i.label && i.value)
            .map((i) => `- ${i.label}: ${i.value}`);
        if (lines.length === 0) continue;
        blocks.push(`${section.title || section.type || "Section"}:\n${lines.join("\n")}`);
    }
    return blocks.join("\n\n");
}

function buildRouterMessages({ conversation, resort, templates }) {
    const lastGuest = getLastGuestMessage(conversation);
    const templateLines = templates
        .map((t) => `[${t.id}] ${t.ai_summary || t.name}`)
        .join("\n");

    const system = `You are a message routing assistant. Given a guest's most recent message, a list of available response templates (by ID + short summary), and the resort context, pick the 1-5 most relevant templates and summarize what the guest is asking in one short sentence.

Reply ONLY with valid JSON in this exact shape:
{"template_ids": ["id1","id2"], "intent": "guest asking about check-in"}

No prose, no markdown, no code fences. JSON only.`;

    const user = `Resort: ${resort ? resort.name : "unknown"}
Guest's last message: ${lastGuest}

Available templates:
${templateLines || "(none)"}`;

    return [
        { role: "system", content: system },
        { role: "user", content: user },
    ];
}

function buildWriterMessages({ conversation, resort, templates, intent, systemPrompt, instruction }) {
    let system = systemPrompt || DEFAULT_SYSTEM_PROMPT;

    if (resort) {
        const sectionsText = formatResortSections(resort);
        system += `\n\nProperty: ${resort.name}`;
        if (resort.gate_code) system += `\nGate code: ${resort.gate_code}`;
        if (sectionsText) system += `\nProperty info:\n${sectionsText}`;
    }

    if (templates.length > 0) {
        system += `\n\nReference templates (use as tone/info reference, don't copy verbatim):\n`;
        for (const t of templates) {
            system += `\n--- ${t.name} ---\n${t.description}\n`;
        }
    }

    let userContent = `Conversation so far:\n${formatConversation(conversation)}`;
    if (intent) userContent += `\n\nGuest's intent (detected): ${intent}`;
    userContent += `\n\nWrite a short, direct reply to the guest's LAST message only. Do NOT repeat information the host already gave earlier in the thread. Match the guest's tone (casual if casual, formal if formal). Output only the message text, nothing else.`;
    if (instruction) userContent += `\n\nAdditional instruction from host: ${instruction}`;

    return [
        { role: "system", content: system },
        { role: "user", content: userContent },
    ];
}

function buildAdjustMessages({ draft, instruction, systemPrompt }) {
    const system = systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const user = `Current draft:\n${draft}\n\nAdjust it with this instruction: ${instruction}\n\nReturn only the adjusted text, nothing else.`;
    return [
        { role: "system", content: system },
        { role: "user", content: user },
    ];
}

// ============ Public API ============

export async function runRouter({ conversation, resort, templates, groqKey }) {
    const result = await callGroq({
        groqKey,
        messages: buildRouterMessages({ conversation, resort, templates }),
        temperature: 0,
        maxTokens: 200,
    });
    if (!result.ok) return { ok: false, error: result.error, templateIds: [], intent: "" };

    // Parse JSON. Tolerate prose-wrapped JSON by extracting the outermost {}.
    let parsed;
    try {
        parsed = JSON.parse(result.content);
    } catch {
        const match = result.content.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                parsed = JSON.parse(match[0]);
            } catch {
                parsed = null;
            }
        }
    }

    if (!parsed || typeof parsed !== "object") {
        return { ok: true, templateIds: [], intent: "", degraded: true };
    }

    const validIds = Array.isArray(parsed.template_ids)
        ? parsed.template_ids.filter((id) => templates.some((t) => t.id === id))
        : [];
    const intent = typeof parsed.intent === "string" ? parsed.intent.trim() : "";

    return { ok: true, templateIds: validIds, intent };
}

export async function runWriter({
    conversation,
    resort,
    templates,
    intent,
    systemPrompt,
    instruction,
    groqKey,
}) {
    const result = await callGroq({
        groqKey,
        messages: buildWriterMessages({
            conversation,
            resort,
            templates,
            intent,
            systemPrompt,
            instruction,
        }),
        temperature: 0.4,
        maxTokens: 400,
    });
    if (!result.ok) return { ok: false, error: result.error, text: "" };
    const text = (result.content || "").trim();
    if (!text) return { ok: false, error: "Empty response from AI.", text: "" };
    return { ok: true, text };
}

export async function runAdjust({ draft, instruction, systemPrompt, groqKey }) {
    const result = await callGroq({
        groqKey,
        messages: buildAdjustMessages({ draft, instruction, systemPrompt }),
        temperature: 0.4,
        maxTokens: 400,
    });
    if (!result.ok) return { ok: false, error: result.error, text: "" };
    const text = (result.content || "").trim();
    if (!text) return { ok: false, error: "Empty response from AI.", text: "" };
    return { ok: true, text };
}

// Exposed for the Details debug pane on ai.html.
export function buildWriterPromptPreview(args) {
    return buildWriterMessages(args);
}
