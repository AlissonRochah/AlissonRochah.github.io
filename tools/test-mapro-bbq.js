// Cole TODO esse arquivo no Console do DevTools enquanto estiver numa
// página de booking do MAPRO (https://app.mapro.us/booking/reservation/<id>).
//
// Fluxo: add_service → seleciona BBQ → espera calcula_valores assentar
// (não um timer fixo: olha o campo `value` do novo bloco) → opcional Save.
//
// Por padrão CLICA Save automaticamente. Pra desligar:
//   window.MB_TEST = { autoSave: false };

(async () => {
    const cfg = Object.assign({ autoSave: true }, window.MB_TEST || {});

    const form = document.querySelector('form[data-ajax="booking-reservar"]');
    if (!form) return console.error("[MB] Form do booking não carregou");

    const sampleSel = form.querySelector('select[name="id"]');
    const opt = [...sampleSel.options].find(o => /\bbbq\b/i.test(o.textContent));
    if (!opt) {
        const list = [...sampleSel.options].filter(o => o.value).map(o => o.textContent.trim()).join(" | ");
        return console.error("[MB] Sem BBQ nessa property. Opções:\n" + list);
    }

    console.log("[MB] Adicionando:", opt.textContent.trim(), "(id=" + opt.value + ")");

    const before = form.querySelectorAll(".reservation-service-container").length;
    add_service({
        onlyActive: 1,
        servico_padrao: 0,
        valor: "0.00",
        valor_desconto: "0.00",
        valor_sale: "0.00",
        valor_tourist: "0.00",
        display: "none",
    }, uuid.v4());

    const tStart = Date.now();
    while (form.querySelectorAll(".reservation-service-container").length === before) {
        if (Date.now() - tStart > 5000) return console.error("[MB] Bloco novo não apareceu");
        await new Promise(r => setTimeout(r, 100));
    }

    const last = [...form.querySelectorAll(".reservation-service-container")].pop();
    const innerSel = last.querySelector('select[name="id"]');
    $(innerSel).val(opt.value).trigger("change");
    // Pequeno respiro pro change handler propagar (não precisa do calcula_valores assentar
    // — o MouseEvent nativo do Save dispara a validação no momento certo).
    await new Promise(r => setTimeout(r, 200));

    const inputs = [...last.querySelectorAll("input,select,textarea")]
        .filter(i => i.name)
        .map(i => `  ${i.name} = ${JSON.stringify(i.value)}`);
    console.log("[MB] Campos no novo bloco:\n" + inputs.join("\n"));

    if (!cfg.autoSave) {
        console.log("[MB] autoSave=false — clica Save manualmente.");
        return;
    }

    // Pode haver vários "Save" na página (modais escondidos). Pega só os visíveis.
    const saveCandidates = [...document.querySelectorAll('a.bt2[data-submit]')]
        .filter(a => (a.textContent || "").trim() === "Save");
    console.log(`[MB] Save candidatos: ${saveCandidates.length}`);
    saveCandidates.forEach((a, i) => {
        console.log(`  [${i}] visible=${a.offsetParent !== null} dataSubmit=${a.getAttribute("data-submit")}`);
    });
    const saveLink = saveCandidates.find(a => a.offsetParent !== null) || saveCandidates[0];
    if (!saveLink) return console.error("[MB] Botão Save não encontrado");

    // Blur ativo (caso algum input esteja com foco e precise commit) + scroll
    const wasFocused = document.activeElement;
    console.log("[MB] activeElement antes do click:", wasFocused && (wasFocused.name || wasFocused.tagName));
    if (wasFocused && wasFocused.blur) wasFocused.blur();
    saveLink.scrollIntoView({ block: "center", behavior: "instant" });
    await new Promise(r => setTimeout(r, 100));

    console.log("[MB] Disparando mousedown → mouseup → click nativos...");
    const mouseInit = { bubbles: true, cancelable: true, view: window, button: 0 };
    saveLink.dispatchEvent(new MouseEvent("mousedown", { ...mouseInit, buttons: 1 }));
    saveLink.dispatchEvent(new MouseEvent("mouseup", { ...mouseInit, buttons: 0 }));
    saveLink.dispatchEvent(new MouseEvent("click", { ...mouseInit, buttons: 0 }));

    const watchStart = Date.now();
    while (Date.now() - watchStart < 15000) {
        const errEls = [...document.querySelectorAll(".f-erro.reserva-erro")].filter(el => el.offsetParent !== null);
        const okEls = [...document.querySelectorAll(".f-sucesso.reserva-sucesso")].filter(el => el.offsetParent !== null);
        if (okEls.length) return console.log("[MB] ✅ Salvou com sucesso");
        if (errEls.length) {
            const msg = errEls.map(el => el.textContent.trim()).join(" | ");
            console.error("[MB] ❌ Erro MAPRO:", msg);
            // Quais campos estão marcados como inválidos?
            const bad = [...document.querySelectorAll(".has-error,.error,[class*='erro']")]
                .filter(el => el.offsetParent !== null && el.querySelector("input,select,textarea"))
                .map(el => {
                    const f = el.querySelector("input,select,textarea");
                    return `${f.name || f.id || "?"} = ${JSON.stringify(f.value)}`;
                });
            if (bad.length) console.error("[MB] Campos marcados:", bad);
            return;
        }
        await new Promise(r => setTimeout(r, 250));
    }
    console.error("[MB] ⏱ Save não retornou em 15s");
})();
