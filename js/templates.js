import { supabase } from "./supabase.js";

// CRUD for message templates. Powers the "Templates" tab in the dashboard
// and is the source the message generator reads from.

let templates = [];
let editing = null;
let _showToast;
let _session;
let saving = false;
let _onChange;

export function initTemplates(showToastFn, session, onChangeFn) {
    _showToast = showToastFn;
    _session = session;
    _onChange = onChangeFn;

    document.getElementById("add-template").addEventListener("click", showNewForm);
    document.getElementById("template-save-btn").addEventListener("click", saveTemplate);
    document.getElementById("template-cancel-btn").addEventListener("click", hideForm);
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

function showNewForm() {
    editing = null;
    document.getElementById("template-form-title").textContent = "New Template";
    document.getElementById("template-name").value = "";
    document.getElementById("template-body").value = "";
    document.getElementById("template-form-wrapper").hidden = false;
    document.getElementById("template-name").focus();
}

function showEditForm(template) {
    editing = template;
    document.getElementById("template-form-title").textContent = "Edit Template";
    document.getElementById("template-name").value = template.name || "";
    document.getElementById("template-body").value = template.body || "";
    document.getElementById("template-form-wrapper").hidden = false;
    document.getElementById("template-name").focus();
}

function hideForm() {
    document.getElementById("template-form-wrapper").hidden = true;
    editing = null;
}

function setSaving(isSaving) {
    saving = isSaving;
    const saveBtn = document.getElementById("template-save-btn");
    const cancelBtn = document.getElementById("template-cancel-btn");
    saveBtn.disabled = isSaving;
    cancelBtn.disabled = isSaving;
    saveBtn.textContent = isSaving ? "Saving..." : "Save";
}

async function saveTemplate() {
    if (saving) return;

    const name = document.getElementById("template-name").value.trim();
    const body = document.getElementById("template-body").value;

    if (!name) {
        _showToast("Enter a name.", "error");
        return;
    }
    if (!body.trim()) {
        _showToast("Enter a body.", "error");
        return;
    }

    setSaving(true);
    const payload = {
        name,
        body,
        updated_by: _session && _session.user ? _session.user.email : null,
    };

    let result;
    if (editing) {
        result = await supabase
            .from("message_templates")
            .update(payload)
            .eq("id", editing.id)
            .select()
            .single();
    } else {
        result = await supabase
            .from("message_templates")
            .insert(payload)
            .select()
            .single();
    }
    setSaving(false);

    if (result.error) {
        _showToast("Error: " + result.error.message, "error");
        return;
    }

    _showToast(editing ? "Template updated!" : "Template created!");
    hideForm();
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
        const card = document.createElement("div");
        card.className = "template-card";

        const header = document.createElement("div");
        header.className = "template-card-header";

        const name = document.createElement("div");
        name.className = "template-card-name";
        name.textContent = t.name;
        header.appendChild(name);

        const actions = document.createElement("div");
        actions.className = "template-card-actions";

        const editBtn = document.createElement("button");
        editBtn.className = "btn btn-outline btn-sm";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => showEditForm(t));
        actions.appendChild(editBtn);

        const delBtn = document.createElement("button");
        delBtn.className = "btn btn-danger btn-sm";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", () => deleteTemplate(t));
        actions.appendChild(delBtn);

        header.appendChild(actions);
        card.appendChild(header);

        const body = document.createElement("pre");
        body.className = "template-card-body";
        body.textContent = t.body || "";
        card.appendChild(body);

        container.appendChild(card);
    });
}
