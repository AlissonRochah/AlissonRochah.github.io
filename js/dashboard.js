import { supabase } from "./supabase.js";
import { requireAuth, signOut } from "./auth.js";
import { initAccounts, loadAccounts } from "./accounts.js";

// Fixed section types. Users can still add a "custom" section with a free-form title.
const SECTION_TYPES = [
    { type: "gate",       title: "Gate Access",         icon: "🚪" },
    { type: "contacts",   title: "Contacts",            icon: "☎️" },
    { type: "amenities",  title: "Community Amenities", icon: "🏊" },
    { type: "pool",       title: "Pool",                icon: "💧" },
    { type: "trash",      title: "Trash",               icon: "🗑️" },
    { type: "parking",    title: "Parking",             icon: "🅿️" },
    { type: "packages",   title: "Packages",            icon: "📦" },
    { type: "pets",       title: "Pets",                icon: "🐾" },
    { type: "ev",         title: "Electric Car",        icon: "🔌" },
    { type: "additional", title: "Additional Info",    icon: "ℹ️" },
];

let resorts = [];
let currentResort = null;
let session = null;

async function init() {
    session = await requireAuth();
    if (!session) return;

    document.body.classList.add("ready");

    document.getElementById("user-email").textContent = session.user.email;
    document.getElementById("sign-out").addEventListener("click", signOut);
    document.getElementById("add-resort").addEventListener("click", createNewResort);
    document.getElementById("search").addEventListener("input", renderList);
    document.getElementById("save-btn").addEventListener("click", saveCurrentResort);
    document.getElementById("delete-btn").addEventListener("click", deleteCurrentResort);

    document.querySelectorAll(".nav-tab").forEach(tab => {
        tab.addEventListener("click", () => switchView(tab.dataset.view));
    });

    initAccounts(showToast);
    populateAddSectionDropdown();
    await loadResorts();
}

function switchView(view) {
    document.querySelectorAll(".nav-tab").forEach(t =>
        t.classList.toggle("active", t.dataset.view === view)
    );
    document.getElementById("resorts-view").hidden = view !== "resorts";
    document.getElementById("accounts-view").hidden = view !== "accounts";
    if (view === "accounts") loadAccounts();
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

    renderSections();
    renderMeta();
    renderList();
}

function createNewResort() {
    currentResort = {
        id: null,
        name: "",
        aliases: [],
        address: "",
        gate_code: "",
        sections: [],
    };

    document.getElementById("empty-state").hidden = true;
    document.getElementById("editor-content").hidden = false;
    document.getElementById("resort-name").value = "";
    document.getElementById("resort-aliases").value = "";
    document.getElementById("resort-address").value = "";
    document.getElementById("resort-gate-code").value = "";

    renderSections();
    document.getElementById("meta").textContent = "New resort — not saved yet.";
    document.getElementById("resort-name").focus();
}

function populateAddSectionDropdown() {
    const select = document.getElementById("add-section-type");
    SECTION_TYPES.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.type;
        opt.textContent = `${s.icon} ${s.title}`;
        select.appendChild(opt);
    });
    const customOpt = document.createElement("option");
    customOpt.value = "custom";
    customOpt.textContent = "✏️ Custom...";
    select.appendChild(customOpt);

    select.addEventListener("change", () => {
        const val = select.value;
        if (!val) return;
        addSection(val);
        select.value = "";
    });
}

function addSection(type) {
    if (!currentResort) return;

    let title;
    if (type === "custom") {
        title = prompt("Section name:");
        if (!title) return;
    } else {
        const def = SECTION_TYPES.find(s => s.type === type);
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
        const def = SECTION_TYPES.find(s => s.type === section.type);
        const icon = def ? def.icon : "✏️";
        const readOnlyTitle = section.type !== "custom";

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
        titleInput.value = section.title || "";
        if (readOnlyTitle) titleInput.readOnly = true;
        titleInput.addEventListener("input", (e) => {
            currentResort.sections[sIdx].title = e.target.value;
        });
        header.appendChild(titleInput);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn-icon btn-delete-section";
        deleteBtn.title = "Remove section";
        deleteBtn.textContent = "×";
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
    del.textContent = "×";
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
        : "—";
    const who = currentResort.updated_by || "—";
    meta.textContent = `Last updated ${when} by ${who}`;
}

// ============ Toast ============

function showToast(msg, type = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.className = "toast " + type + " show";
    setTimeout(() => toast.classList.remove("show"), 2500);
}

init();
