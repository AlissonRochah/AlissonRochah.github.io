import { supabase } from "./supabase.js";

let accounts = [];
let aiEnabledByUserId = new Map();
let editingAccount = null;
let _showToast;
let saving = false;

export function initAccounts(showToastFn) {
    _showToast = showToastFn;
    document.getElementById("add-account").addEventListener("click", showNewForm);
    document.getElementById("account-cancel-btn").addEventListener("click", hideForm);
    document.getElementById("account-save-btn").addEventListener("click", saveAccount);
}

export async function loadAccounts() {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        _showToast("Error loading accounts: " + error.message, "error");
        return;
    }
    accounts = data || [];

    const { data: settingsRows } = await supabase
        .from("user_settings")
        .select("auth_user_id, ai_enabled");
    aiEnabledByUserId = new Map((settingsRows || []).map(r => [r.auth_user_id, !!r.ai_enabled]));

    renderTable();
}

async function toggleAiEnabled(account, enabled) {
    if (!account.auth_user_id) {
        _showToast("User has no linked auth account.", "error");
        return;
    }
    const { error } = await supabase
        .from("user_settings")
        .upsert({
            auth_user_id: account.auth_user_id,
            ai_enabled: enabled,
            updated_at: new Date().toISOString(),
        });
    if (error) {
        _showToast("Error: " + error.message, "error");
        await loadAccounts();
        return;
    }
    aiEnabledByUserId.set(account.auth_user_id, enabled);
    _showToast(enabled ? "AI enabled for " + account.email : "AI disabled for " + account.email);
}

function showNewForm() {
    editingAccount = null;
    document.getElementById("account-form-title").textContent = "New Account";
    document.getElementById("account-email").value = "";
    document.getElementById("account-email").disabled = false;
    document.getElementById("account-name").value = "";
    document.getElementById("account-password").value = "";
    document.getElementById("account-password").placeholder = "Min 6 characters";
    document.getElementById("account-password-label").textContent = "Password";
    document.getElementById("account-role").value = "editor";
    document.getElementById("account-form-wrapper").hidden = false;
    document.getElementById("account-email").focus();
}

function showEditForm(account) {
    editingAccount = account;
    document.getElementById("account-form-title").textContent = "Edit Account";
    document.getElementById("account-email").value = account.email;
    document.getElementById("account-email").disabled = true;
    document.getElementById("account-name").value = account.full_name || "";
    document.getElementById("account-password").value = "";
    document.getElementById("account-password").placeholder = "Leave blank to keep current";
    document.getElementById("account-password-label").textContent = "New Password (optional)";
    document.getElementById("account-role").value = account.role || "editor";
    document.getElementById("account-form-wrapper").hidden = false;
    document.getElementById("account-name").focus();
}

function hideForm() {
    document.getElementById("account-form-wrapper").hidden = true;
    editingAccount = null;
}

function setSaving(isSaving) {
    saving = isSaving;
    const saveBtn = document.getElementById("account-save-btn");
    const cancelBtn = document.getElementById("account-cancel-btn");
    saveBtn.disabled = isSaving;
    cancelBtn.disabled = isSaving;
    saveBtn.textContent = isSaving ? "Saving..." : "Save";
}

async function saveAccount() {
    if (saving) return;

    const email = document.getElementById("account-email").value.trim();
    const fullName = document.getElementById("account-name").value.trim();
    const password = document.getElementById("account-password").value;
    const role = document.getElementById("account-role").value;

    if (editingAccount) {
        if (password && password.length < 6) {
            _showToast("Password must be at least 6 characters.", "error");
            return;
        }

        setSaving(true);
        const { error } = await supabase.rpc("admin_update_account", {
            p_profile_id: editingAccount.id,
            p_full_name: fullName,
            p_role: role,
            p_new_password: password || null,
        });
        setSaving(false);

        if (error) {
            _showToast("Error: " + error.message, "error");
            return;
        }
        _showToast("Account updated!");
    } else {
        if (!email) {
            _showToast("Enter an email.", "error");
            return;
        }
        if (!password || password.length < 6) {
            _showToast("Password must be at least 6 characters.", "error");
            return;
        }

        setSaving(true);
        const { error } = await supabase.rpc("admin_create_account", {
            p_email: email,
            p_password: password,
            p_full_name: fullName,
            p_role: role,
        });
        setSaving(false);

        if (error) {
            _showToast("Error: " + error.message, "error");
            return;
        }
        _showToast("Account created!");
    }

    hideForm();
    await loadAccounts();
}

async function deleteAccount(account) {
    if (!confirm(`Delete account "${account.email}"? This cannot be undone.`)) return;

    const { error } = await supabase.rpc("admin_delete_account", {
        p_profile_id: account.id,
    });

    if (error) {
        _showToast("Error: " + error.message, "error");
        return;
    }

    _showToast("Account deleted.");
    await loadAccounts();
}

function renderTable() {
    const tbody = document.getElementById("accounts-tbody");
    const emptyMsg = document.getElementById("accounts-empty");
    tbody.innerHTML = "";

    if (accounts.length === 0) {
        emptyMsg.hidden = false;
        return;
    }
    emptyMsg.hidden = true;

    accounts.forEach(acc => {
        const tr = document.createElement("tr");

        const tdEmail = document.createElement("td");
        tdEmail.textContent = acc.email;
        tr.appendChild(tdEmail);

        const tdName = document.createElement("td");
        tdName.textContent = acc.full_name || "\u2014";
        tr.appendChild(tdName);

        const tdRole = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = "role-badge role-" + (acc.role || "editor");
        badge.textContent = acc.role || "editor";
        tdRole.appendChild(badge);
        tr.appendChild(tdRole);

        const tdAi = document.createElement("td");
        const aiLabel = document.createElement("label");
        aiLabel.className = "ai-toggle";
        const aiCheckbox = document.createElement("input");
        aiCheckbox.type = "checkbox";
        aiCheckbox.checked = !!aiEnabledByUserId.get(acc.auth_user_id);
        aiCheckbox.addEventListener("change", () => toggleAiEnabled(acc, aiCheckbox.checked));
        const aiSlider = document.createElement("span");
        aiSlider.className = "ai-toggle-slider";
        aiLabel.appendChild(aiCheckbox);
        aiLabel.appendChild(aiSlider);
        tdAi.appendChild(aiLabel);
        tr.appendChild(tdAi);

        const tdDate = document.createElement("td");
        tdDate.textContent = acc.created_at
            ? new Date(acc.created_at).toLocaleDateString()
            : "\u2014";
        tr.appendChild(tdDate);

        const tdActions = document.createElement("td");
        tdActions.className = "actions-cell";

        const editBtn = document.createElement("button");
        editBtn.className = "btn btn-outline btn-sm";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => showEditForm(acc));
        tdActions.appendChild(editBtn);

        const delBtn = document.createElement("button");
        delBtn.className = "btn btn-danger btn-sm";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", () => deleteAccount(acc));
        tdActions.appendChild(delBtn);

        tr.appendChild(tdActions);
        tbody.appendChild(tr);
    });
}
