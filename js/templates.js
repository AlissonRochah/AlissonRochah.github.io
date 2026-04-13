import { supabase } from "./supabase.js";

// CRUD for message templates. Matches the old app's behavior exactly:
//   - A single add form at the top (always visible).
//   - Save upserts by name, so re-adding with an existing name updates it
//     (mirrors the old Firestore setDoc pattern that used the name as the
//     document ID).
//   - List below shows each template as a horizontal row with Title, Body,
//     and Delete button.
//   - No edit button — edit happens by typing the same name again.

let templates = [];
let _showToast;
let _session;
let _onChange;
let saving = false;

export function initTemplates(showToastFn, session, onChangeFn) {
    _showToast = showToastFn;
    _session = session;
    _onChange = onChangeFn;
    document.getElementById("template-save-btn").addEventListener("click", saveTemplate);
}

export function getTemplates() {
    return templates;
}

export async function loadMessageTemplates() {
    const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name");

    if (error) {
        _showToast("Error loading templates: " + error.message, "error");
        return [];
    }
    templates = data || [];
    renderList();
    if (_onChange) _onChange(templates);
    return templates;
}

function setSaving(isSaving) {
    saving = isSaving;
    const saveBtn = document.getElementById("template-save-btn");
    saveBtn.disabled = isSaving;
    saveBtn.textContent = isSaving ? "Saving..." : "Add Template";
}

async function saveTemplate() {
    if (saving) return;

    const name = document.getElementById("template-name").value.trim();
    const body = document.getElementById("template-body").value;

    if (!name) {
        _showToast("Enter a title.", "error");
        return;
    }
    if (!body.trim()) {
        _showToast("Enter a template body.", "error");
        return;
    }

    setSaving(true);
    const payload = {
        name,
        body,
        updated_by: _session && _session.user ? _session.user.email : null,
    };

    // Upsert on name so re-adding overwrites, matching the old setDoc pattern.
    const { error } = await supabase
        .from("message_templates")
        .upsert(payload, { onConflict: "name" });
    setSaving(false);

    if (error) {
        _showToast("Error: " + error.message, "error");
        return;
    }

    _showToast("Template saved!");
    document.getElementById("template-name").value = "";
    document.getElementById("template-body").value = "";
    document.getElementById("template-name").focus();
    await loadMessageTemplates();
}

async function deleteTemplate(template) {
    if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;

    const { error } = await supabase
        .from("message_templates")
        .delete()
        .eq("id", template.id);

    if (error) {
        _showToast("Error: " + error.message, "error");
        return;
    }

    _showToast("Template deleted.");
    await loadMessageTemplates();
}

function renderList() {
    const container = document.getElementById("templates-list");
    const emptyMsg = document.getElementById("templates-empty");
    container.innerHTML = "";

    if (templates.length === 0) {
        emptyMsg.hidden = false;
        return;
    }
    emptyMsg.hidden = true;

    templates.forEach(t => {
        const row = document.createElement("div");
        row.className = "template-row";

        const title = document.createElement("div");
        title.className = "template-row-title";
        title.textContent = t.name;
        row.appendChild(title);

        const body = document.createElement("div");
        body.className = "template-row-body";
        body.textContent = t.body || "";
        row.appendChild(body);

        const delBtn = document.createElement("button");
        delBtn.className = "btn btn-danger btn-sm";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", () => deleteTemplate(t));
        row.appendChild(delBtn);

        container.appendChild(row);
    });
}
