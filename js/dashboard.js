import { supabase } from "./supabase.js";
import { requireAuth, signOut } from "./auth.js";
import { initAccounts, loadAccounts } from "./accounts.js";
import {
    loadSectionTypes,
    getSectionTypes,
    getSectionType,
    getSectionIcon,
} from "./section-types.js";
import { initTemplates, loadMessageTemplates } from "./templates.js";
import { initMessages, refreshMessagesView } from "./messages.js";

let resorts = [];
let currentResort = null;
let session = null;

async function init() {
    session = await requireAuth();
    if (!session) return;

    document.body.classList.add("ready");

    document.getElementById("user-email").textContent = session.user.email;
    document.getElementById("sign-out").addEventListener("click", signOut);
    document.getElementById("add-resort").addEventListener("click", openNewResortModal);
    document.getElementById("search").addEventListener("input", renderList);
    document.getElementById("save-btn").addEventListener("click", saveCurrentResort);
    document.getElementById("delete-btn").addEventListener("click", deleteCurrentResort);
    document.getElementById("clone-btn").addEventListener("click", cloneCurrentResort);

    document.querySelectorAll(".nav-tab").forEach(tab => {
        tab.addEventListener("click", () => switchView(tab.dataset.view));
    });

    initNewResortModal();
    initAccounts(showToast);
    initTemplates(showToast, session);
    initMessages(showToast);

    await loadSectionTypes();
    populateAddSectionDropdown();
    await loadResorts();
}

function switchView(view) {
    document.querySelectorAll(".nav-tab").forEach(t =>
        t.classList.toggle("active", t.dataset.view === view)
    );
    document.getElementById("resorts-view").hidden = view !== "resorts";
    document.getElementById("accounts-view").hidden = view !== "accounts";
    document.getElementById("templates-view").hidden = view !== "templates";
    document.getElementById("messages-view").hidden = view !== "messages";

    if (view === "accounts") loadAccounts();
    if (view === "templates") loadMessageTemplates();
    if (view === "messages") refreshMessagesView();
}

// ============ Data ============

async function loadResorts() {
    const { data, error } = await supabase
        .from("resorts")
        .select("*")
        .order("name");

    if (error) {
        showToast("Error loading: " + error.message, "error");
        return;
    }
    resorts = data || [];
    renderList();
}

async function saveCurrentResort() {
    const name = document.getElementById("resort-name").value.trim();
    if (!name) {
        showToast("Enter a resort name.", "error");
        return;
    }

    const aliasesRaw = document.getElementById("resort-aliases").value;
    const aliases = aliasesRaw.split(",").map(s => s.trim()).filter(Boolean);
    const address = document.getElementById("resort-address").value.trim();
    const gateCode = document.getElementById("resort-gate-code").value.trim();

    const payload = {
        name,
        aliases,
        address,
        gate_code: gateCode,
        sections: currentResort.sections || [],
        updated_by: session.user.email,
    };

    let result;
    if (currentResort.id) {
        result = await supabase
            .from("resorts")
            .update(payload)
            .eq("id", currentResort.id)
            .select()
            .single();
    } else {
        result = await supabase
            .from("resorts")
            .insert(payload)
            .select()
            .single();
    }

    if (result.error) {
        showToast("Error: " + result.error.message, "error");
        return;
    }

    showToast("Saved!");
    currentResort = result.data;
    await loadResorts();
    selectResort(currentResort);
}

async function deleteCurrentResort() {
    if (!currentResort || !currentResort.id) return;
    if (!confirm(`Delete "${currentResort.name}"? This cannot be undone.`)) return;

    const { error } = await supabase
        .from("resorts")
        .delete()
        .eq("id", currentResort.id);

    if (error) {
        showToast("Error: " + error.message, "error");
        return;
    }

    currentResort = null;
    document.getElementById("empty-state").hidden = false;
    document.getElementById("editor-content").hidden = true;
    await loadResorts();
    showToast("Deleted.");
}

function cloneCurrentResort() {
    if (!currentResort) return;
    startEditingNewResort({
        name: `Copy of ${currentResort.name}`,
        aliases: [],
        address: currentResort.address || "",
        gate_code: "",
        sections: deepCloneSections(currentResort.sections),
    });
    showToast("Cloned — edit and save.");
}

function deepCloneSections(sections) {
    if (!sections) return [];
    return JSON.parse(JSON.stringify(sections));
}

// ============ Rendering ============

function renderList() {
    const search = document.getElementById("search").value.trim().toLowerCase();
    const list = document.getElementById("resort-list");
    list.innerHTML = "";

    const filtered = resorts.filter(r =>
        !search ||
        r.name.toLowerCase().includes(search) ||
        (r.aliases || []).some(a => a.toLowerCase().includes(search))
    );

    if (filtered.length === 0) {
        list.innerHTML = '<li class="empty-list">No resorts.</li>';
        return;
    }

    filtered.forEach(r => {
        const li = document.createElement("li");
        li.className = "resort-item";
        if (currentResort && currentResort.id === r.id) li.classList.add("active");
        li.textContent = r.name;
        li.addEventListener("click", () => selectResort(r));
        list.appendChild(li);
    });
}

function selectResort(resort) {
    // Deep clone so edits are local until save.
    currentResort = JSON.parse(JSON.stringify(resort));

    document.getElementById("empty-state").hidden = true;
    document.getElementById("editor-content").hidden = false;
    document.getElementById("resort-name").value = currentResort.name || "";
    document.getElementById("resort-aliases").value = (currentResort.aliases || []).join(", ");
    document.getElementById("resort-address").value = currentResort.address || "";
    document.getElementById("resort-gate-code").value = currentResort.gate_code || "";
    document.getElementById("clone-btn").hidden = false;

    renderSections();
    renderMeta();
    renderList();
}

function startEditingNewResort(seed) {
    currentResort = {
        id: null,
        name: seed.name || "",
        aliases: seed.aliases || [],
        address: seed.address || "",
        gate_code: seed.gate_code || "",
        sections: seed.sections || [],
    };

    document.getElementById("empty-state").hidden = true;
    document.getElementById("editor-content").hidden = false;
    document.getElementById("resort-name").value = currentResort.name;
    document.getElementById("resort-aliases").value = (currentResort.aliases || []).join(", ");
    document.getElementById("resort-address").value = currentResort.address || "";
    document.getElementById("resort-gate-code").value = currentResort.gate_code || "";
    document.getElementById("clone-btn").hidden = true;

    renderSections();
    document.getElementById("meta").textContent = "New resort — not saved yet.";
    document.getElementById("resort-name").focus();
    renderList();
}

function populateAddSectionDropdown() {
    const select = document.getElementById("add-section-type");
    select.innerHTML = '<option value="">+ Add section...</option>';

    getSectionTypes().forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.type;
        opt.textContent = `${s.icon} ${s.title}`;
        select.appendChild(opt);
    });

    const customOpt = document.createElement("option");
    customOpt.value = "custom";
    customOpt.textContent = "\u270F\uFE0F Custom...";
    select.appendChild(customOpt);

    select.onchange = () => {
        const val = select.value;
        if (!val) return;
        addSection(val);
        select.value = "";
    };
}

function addSection(type) {
    if (!currentResort) return;

    let title;
    if (type === "custom") {
        title = prompt("Section name:");
        if (!title) return;
    } else {
        const def = getSectionType(type);
        if (!def) {
            showToast("Unknown section type.", "error");
            return;
        }
        title = def.title;
        if ((currentResort.sections || []).some(s => s.type === type)) {
            showToast("Section already exists.", "error");
            return;
        }
    }

    currentResort.sections = currentResort.sections || [];
    currentResort.sections.push({
        type,
        title,
        items: [{ label: "", value: "" }],
    });
    renderSections();
}

function renderSections() {
    const container = document.getElementById("sections-container");
    container.innerHTML = "";

    (currentResort.sections || []).forEach((section, sIdx) => {
        const def = getSectionType(section.type);
        const icon = def ? def.icon : getSectionIcon(section.type);
        const readOnlyTitle = section.type !== "custom" && !!def;
        // Prefer the canonical title for known types so stale JSONB titles
        // never drift from the central definition.
        const displayTitle = def ? def.title : (section.title || "");

        const card = document.createElement("div");
        card.className = "section-card";

        const header = document.createElement("div");
        header.className = "section-card-header";

        const iconEl = document.createElement("span");
        iconEl.className = "section-icon";
        iconEl.textContent = icon;
        header.appendChild(iconEl);

        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.className = "section-title-input";
        titleInput.value = displayTitle;
        if (readOnlyTitle) titleInput.readOnly = true;
        titleInput.addEventListener("input", (e) => {
            currentResort.sections[sIdx].title = e.target.value;
        });
        header.appendChild(titleInput);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn-icon btn-delete-section";
        deleteBtn.title = "Remove section";
        deleteBtn.textContent = "\u00D7";
        deleteBtn.addEventListener("click", () => {
            currentResort.sections.splice(sIdx, 1);
            renderSections();
        });
        header.appendChild(deleteBtn);

        card.appendChild(header);

        const itemsContainer = document.createElement("div");
        itemsContainer.className = "section-items";
        card.appendChild(itemsContainer);

        (section.items || []).forEach((item, iIdx) => {
            itemsContainer.appendChild(buildItemRow(sIdx, iIdx, item));
        });

        const addItemBtn = document.createElement("button");
        addItemBtn.className = "btn-add-item";
        addItemBtn.textContent = "+ Add line";
        addItemBtn.addEventListener("click", () => {
            currentResort.sections[sIdx].items = currentResort.sections[sIdx].items || [];
            currentResort.sections[sIdx].items.push({ label: "", value: "" });
            renderSections();
        });
        card.appendChild(addItemBtn);

        container.appendChild(card);
    });
}

function buildItemRow(sIdx, iIdx, item) {
    const row = document.createElement("div");
    row.className = "item-row";

    const label = document.createElement("input");
    label.type = "text";
    label.placeholder = "Label";
    label.value = item.label || "";
    label.addEventListener("input", (e) => {
        currentResort.sections[sIdx].items[iIdx].label = e.target.value;
    });

    const value = document.createElement("input");
    value.type = "text";
    value.placeholder = "Value";
    value.value = item.value || "";
    value.addEventListener("input", (e) => {
        currentResort.sections[sIdx].items[iIdx].value = e.target.value;
    });

    const del = document.createElement("button");
    del.className = "btn-icon btn-delete-item";
    del.title = "Remove";
    del.textContent = "\u00D7";
    del.addEventListener("click", () => {
        currentResort.sections[sIdx].items.splice(iIdx, 1);
        renderSections();
    });

    row.appendChild(label);
    row.appendChild(value);
    row.appendChild(del);
    return row;
}

function renderMeta() {
    const meta = document.getElementById("meta");
    if (!currentResort.id) {
        meta.textContent = "New resort — not saved yet.";
        return;
    }
    const when = currentResort.updated_at
        ? new Date(currentResort.updated_at).toLocaleString()
        : "\u2014";
    const who = currentResort.updated_by || "\u2014";
    meta.textContent = `Last updated ${when} by ${who}`;
}

// ============ New Resort Modal ============

function initNewResortModal() {
    document.getElementById("modal-close").addEventListener("click", closeNewResortModal);
    document.getElementById("modal-backdrop").addEventListener("click", (e) => {
        if (e.target.id === "modal-backdrop") closeNewResortModal();
    });
    document.getElementById("start-blank").addEventListener("click", () => {
        closeNewResortModal();
        startEditingNewResort({});
    });
    document.getElementById("clone-picker").addEventListener("change", (e) => {
        const id = e.target.value;
        if (!id) return;
        const src = resorts.find(r => r.id === id);
        if (!src) return;
        closeNewResortModal();
        startEditingNewResort({
            name: `Copy of ${src.name}`,
            address: src.address || "",
            sections: deepCloneSections(src.sections),
        });
        showToast(`Cloning "${src.name}"`);
    });
}

function openNewResortModal() {
    const clonePicker = document.getElementById("clone-picker");
    clonePicker.innerHTML = '<option value="">Select a resort...</option>';
    resorts.forEach(r => {
        const opt = document.createElement("option");
        opt.value = r.id;
        opt.textContent = r.name;
        clonePicker.appendChild(opt);
    });
    document.getElementById("modal-backdrop").hidden = false;
}

function closeNewResortModal() {
    document.getElementById("modal-backdrop").hidden = true;
    document.getElementById("clone-picker").value = "";
}

// ============ Toast ============

function showToast(msg, type = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.className = "toast " + type + " show";
    setTimeout(() => toast.classList.remove("show"), 2500);
}

init();
