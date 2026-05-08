// Page Visibility override for gateaccess.net.
//
// Brave (and Chrome) hide background tabs by reporting document.hidden=true
// and visibilityState="hidden". gateaccess.net's DevExpress JS noticeably
// pauses / skips work in that state, which is why opening the page in an
// active:false tab made it freeze. We need the page to behave as if it's
// always visible so the extension's automated login + add flow can run in
// a hidden tab without stealing focus.
//
// Runs in the MAIN world at document_start so the override is in place
// before any of the page's own scripts evaluate.

(function () {
    try {
        Object.defineProperty(document, "hidden", {
            configurable: true,
            get: () => false,
        });
        Object.defineProperty(document, "visibilityState", {
            configurable: true,
            get: () => "visible",
        });
        // Some libraries also key off webkitVisibilityState / webkitHidden.
        Object.defineProperty(document, "webkitHidden", {
            configurable: true,
            get: () => false,
        });
        Object.defineProperty(document, "webkitVisibilityState", {
            configurable: true,
            get: () => "visible",
        });
        // Suppress visibilitychange listeners — anything that would trigger
        // on hide/show should never fire while we're driving the tab.
        const origAdd = document.addEventListener.bind(document);
        document.addEventListener = function (type, handler, opts) {
            if (type === "visibilitychange" || type === "webkitvisibilitychange") return;
            return origAdd(type, handler, opts);
        };
    } catch (_) {
        // If any of the descriptors can't be redefined we just continue —
        // the gate flow will still try to run.
    }
})();
