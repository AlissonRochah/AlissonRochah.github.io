import { loadMessageTemplates, getTemplates } from "./templates.js";

// Message generator. Matches the old app's behavior exactly:
//   - Inputs: Your Name, Guest's Name, checkboxes for templates.
//   - Click "Generate Message" → builds the final message:
//       Hello {guestName},
//       {template 1}
//       {template 2}
//       {yourName}
//   - Writes the message into the output textarea.
//   - Copies it to the clipboard.
//   - Unchecks all checkboxes.

let _showToast;

export function initMessages(showToastFn) {
    _showToast = showToastFn;
    document.getElementById("generate-msg-btn").addEventListener("click", generate);
}

export async function refreshMessagesView() {
    await loadMessageTemplates();
    renderTemplatePicker();
}

function renderTemplatePicker() {
    const container = document.getElementById("msg-template-picker");
    container.innerHTML = "";

    const templates = getTemplates();
    if (templates.length === 0) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "No templates yet. Create one in the Templates tab.";
        container.appendChild(empty);
        return;
    }

    templates.forEach(t => {
        const label = document.createElement("label");
        label.className = "msg-template-option";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = t.id;
        cb.dataset.body = t.body || "";
        label.appendChild(cb);

        const name = document.createElement("span");
        name.textContent = t.name;
        label.appendChild(name);

        container.appendChild(label);
    });
}

function generate() {
    const host = document.getElementById("msg-host").value.trim();
    const guest = document.getElementById("msg-guest").value.trim();

    if (!host) {
        _showToast("Enter your name.", "error");
        return;
    }
    if (!guest) {
        _showToast("Enter the guest's name.", "error");
        return;
    }

    const checked = document.querySelectorAll("#msg-template-picker input:checked");
    if (checked.length === 0) {
        _showToast("Select at least one template.", "error");
        return;
    }

    const parts = Array.from(checked).map(cb => cb.dataset.body || "");

    let message = `Hello ${guest},\n\n`;
    if (parts.length > 0) {
        message += parts.join("\n\n") + "\n\n";
    }
    message += host;

    document.getElementById("msg-output").value = message;

    navigator.clipboard
        .writeText(message)
        .then(() => _showToast("Copied to clipboard!"))
        .catch(err => _showToast("Copy failed: " + err.message, "error"));

    // Reset checkboxes for the next message (matches old behavior).
    checked.forEach(cb => { cb.checked = false; });
}
