import { loadMessageTemplates, getTemplates } from "./templates.js";

// Message generator. User picks templates (checkboxes), enters host/guest
// names, clicks Generate — the selected templates are joined with blank
// lines and {host}/{guest} placeholders are substituted. Result is copied
// to the clipboard.

let _showToast;

export function initMessages(showToastFn) {
    _showToast = showToastFn;
    document.getElementById("generate-msg-btn").addEventListener("click", generate);
    document.getElementById("copy-msg-btn").addEventListener("click", copyGenerated);
    document.getElementById("clear-msg-btn").addEventListener("click", clearGenerator);
}

export async function refreshMessagesView() {
    // Ensure templates are loaded so the picker stays up to date.
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
    const checked = document.querySelectorAll("#msg-template-picker input:checked");

    if (checked.length === 0) {
        _showToast("Select at least one template.", "error");
        return;
    }

    const parts = Array.from(checked).map(cb => {
        let body = cb.dataset.body || "";
        body = body.replace(/\{host\}/gi, host || "{host}");
        body = body.replace(/\{guest\}/gi, guest || "{guest}");
        return body;
    });

    const message = parts.join("\n\n");
    document.getElementById("msg-output").value = message;

    copyGenerated(true);
}

function copyGenerated(silentIfEmpty = false) {
    const output = document.getElementById("msg-output");
    if (!output.value) {
        if (!silentIfEmpty) _showToast("Nothing to copy.", "error");
        return;
    }
    navigator.clipboard
        .writeText(output.value)
        .then(() => _showToast("Copied to clipboard!"))
        .catch(err => _showToast("Copy failed: " + err.message, "error"));
}

function clearGenerator() {
    document.getElementById("msg-host").value = "";
    document.getElementById("msg-guest").value = "";
    document.getElementById("msg-output").value = "";
    document.querySelectorAll("#msg-template-picker input:checked").forEach(cb => {
        cb.checked = false;
    });
}
