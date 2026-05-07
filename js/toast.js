// Shared toast notification. Every page renders <div id="toast" class="toast">
// somewhere at the bottom of <body>; this fills it with text and fades it in
// and out automatically.

const TOAST_TIMEOUT_MS = 2500;

export function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = "toast " + type + " show";
    clearTimeout(toast._tid);
    toast._tid = setTimeout(() => toast.classList.remove("show"), TOAST_TIMEOUT_MS);
}
