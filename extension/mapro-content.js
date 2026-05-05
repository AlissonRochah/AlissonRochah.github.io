// MasterBot Bridge — content script for MAPRO booking pages.
// Loaded on https://app.mapro.us/booking/reservation/*
// Listens for messages from the background service worker and automates
// the booking page DOM (calls MAPRO's own add_service() and clicks Save).

(() => {
    if (!/\/booking\/reservation\/\d+/.test(location.pathname)) return;

    function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    async function waitFor(predicate, timeoutMs, label) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const v = predicate();
            if (v) return v;
            await sleep(150);
        }
        throw new Error("Timed out waiting for " + (label || "condition"));
    }

    // The page injects MAPRO's globals (add_service, uuid, jQuery) into the
    // page world. Content scripts run in an isolated world, so we proxy via
    // a script we inject into the page world.
    function injectInPage(fn, args) {
        return new Promise((resolve, reject) => {
            const callId = "mb_" + Math.random().toString(36).slice(2);
            const scriptText = `
                (async () => {
                    const args = ${JSON.stringify(args)};
                    try {
                        const result = await (${fn.toString()})(args);
                        document.dispatchEvent(new CustomEvent(${JSON.stringify("mb-ret-" + callId)}, { detail: { ok: true, result } }));
                    } catch (e) {
                        document.dispatchEvent(new CustomEvent(${JSON.stringify("mb-ret-" + callId)}, { detail: { ok: false, error: String(e && e.message || e) } }));
                    }
                })();
            `;
            const onRet = (e) => {
                document.removeEventListener("mb-ret-" + callId, onRet);
                if (e.detail && e.detail.ok) resolve(e.detail.result);
                else reject(new Error((e.detail && e.detail.error) || "page eval failed"));
            };
            document.addEventListener("mb-ret-" + callId, onRet);
            const s = document.createElement("script");
            s.textContent = scriptText;
            (document.head || document.documentElement).appendChild(s);
            s.remove();
        });
    }

    function addServiceInPage(args) {
        const { kind } = args;
        const PATTERNS = {
            bbq:  /\bbbq\b/i,
            ph35: /(pool\s*heat.*35|ph\s*35)/i,
            ph75: /(pool\s*heat.*75|ph\s*75)/i,
            ph:   /pool\s*heat/i,
        };
        const pattern = PATTERNS[kind];
        if (!pattern) throw new Error("Unknown service kind: " + kind);

        const sampleSelect = document.querySelector('form[data-ajax="booking-reservar"] select[name="id"]');
        if (!sampleSelect) throw new Error("Booking form not loaded yet");
        const opt = Array.from(sampleSelect.options).find((o) => o.value && pattern.test(o.textContent));
        if (!opt) {
            const available = Array.from(sampleSelect.options).filter((o) => o.value).map((o) => o.textContent.trim());
            throw new Error(`No "${kind}" service for this property. Available: ${available.join(" | ")}`);
        }
        const serviceId = opt.value;
        const serviceLabel = opt.textContent.trim();

        if (typeof window.add_service !== "function") throw new Error("MAPRO add_service is not defined");
        if (typeof window.uuid === "undefined" || !window.uuid.v4) throw new Error("MAPRO uuid is not defined");

        const before = document.querySelectorAll('form[data-ajax="booking-reservar"] .reservation-service-container').length;
        window.add_service({
            onlyActive: 1,
            servico_padrao: 0,
            valor: "0.00",
            valor_desconto: "0.00",
            valor_sale: "0.00",
            valor_tourist: "0.00",
            display: "none",
        }, window.uuid.v4());

        return new Promise((resolve, reject) => {
            const tStart = Date.now();
            const tick = () => {
                const containers = document.querySelectorAll('form[data-ajax="booking-reservar"] .reservation-service-container');
                if (containers.length > before) {
                    const newContainer = containers[containers.length - 1];
                    const sel = newContainer.querySelector('select[name="id"]');
                    if (!sel) return reject(new Error("New service has no select"));
                    const $ = window.jQuery || window.$;
                    if ($) {
                        $(sel).val(serviceId).trigger("change");
                    } else {
                        sel.value = serviceId;
                        sel.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                    // MAPRO populates everything else (price, dates, excludeTaxes) on its own
                    // when the option is chosen — let the change handler run, then save.
                    setTimeout(() => {
                        const saveLink = Array.from(document.querySelectorAll('a.bt2[data-submit]'))
                            .find((a) => (a.textContent || "").trim() === "Save");
                        if (!saveLink) return reject(new Error("Save button not found"));
                        saveLink.click();
                        const waitStart = Date.now();
                        const watch = () => {
                            const errVisible = Array.from(document.querySelectorAll(".f-erro.reserva-erro"))
                                .some((el) => el.offsetParent !== null);
                            const okVisible = Array.from(document.querySelectorAll(".f-sucesso.reserva-sucesso"))
                                .some((el) => el.offsetParent !== null);
                            if (okVisible) return resolve({ serviceId, serviceLabel, status: "saved" });
                            if (errVisible) return reject(new Error("MAPRO returned validation error"));
                            if (Date.now() - waitStart > 15000) return reject(new Error("Save timed out"));
                            setTimeout(watch, 250);
                        };
                        watch();
                    }, 600);
                } else if (Date.now() - tStart > 5000) {
                    reject(new Error("Service block did not appear after add_service()"));
                } else {
                    setTimeout(tick, 100);
                }
            };
            tick();
        });
    }

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (!msg || msg.action !== "mapro-add-service") return false;
        (async () => {
            try {
                await waitFor(() => {
                    return !!document.querySelector('form[data-ajax="booking-reservar"] select[name="id"]');
                }, 15000, "booking form to load");
                const result = await injectInPage(addServiceInPage, msg.payload || {});
                sendResponse({ ok: true, data: result });
            } catch (e) {
                sendResponse({ ok: false, error: String((e && e.message) || e) });
            }
        })();
        return true;
    });
})();
