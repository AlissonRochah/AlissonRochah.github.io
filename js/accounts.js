import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const signupClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
});

let accounts = [];
let editingAccount = null;
let _showToast;

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
    renderTable();
}

function showNewForm() {
    editingAccount = null;
    document.getElementById("account-form-title").textContent = "New Account";
    document.getElementById("account-email").value = "";
    document.getElementById("account-email").disabled = false;
    document.getElementById("account-name").value = "";
    document.getElementById("account-password").value = "";
    document.getElementById("account-password-field").hidden = false;
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
    document.getElementById("account-password-field").hidden = true;
    document.getElementById("account-role").value = account.role || "editor";
    document.getElementById("account-form-wrapper").hidden = false;
    document.getElementById("account-name").focus();
}

function hideForm() {
    document.getElementById("account-form-wrapper").hidden = true;
    editingAccount = null;
}

async function saveAccount() {
    const email = document.getElementById("account-email").value.trim();
    const fullName = document.getElementById("account-name").value.trim();
    const password = document.getElementById("account-password").value;
    const role = document.getElementById("account-role").value;

    if (editingAccount) {
        const { error } = await supabase
            .from("profiles")
            .update({ full_name: fullName, role })
            .eq("id", editingAccount.id);

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

        const { data, error } = await signupClient.auth.signUp({ email, password });

        if (error) {
            _showToast("Error: " + error.message, "error");
            return;
        }

        const { error: profileError } = await supabase
            .from("profiles")
            .insert({
                auth_user_id: data.user?.id || null,
                email,
                full_name: fullName,
                role,
            });

        if (profileError) {
            _showToast("Error saving profile: " + profileError.message, "error");
            return;
        }
        _showToast("Account created!");
    }

    hideForm();
    await loadAccounts();
}

async function deleteAccount(account) {
    if (!confirm(`Delete account "${account.email}"? This cannot be undone.`)) return;

    const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", account.id);

    if (error) {
        _showToast("Error: " + error.message, "error");
        return;
    }

    if (account.auth_user_id) {
        await supabase.rpc("delete_auth_user", { target_user_id: account.auth_user_id }).catch(() => {});
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
