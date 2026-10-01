/**
 * «Второй шанс» (бесконечная трасса): после пятой аварии — плашка с обратным отсчётом.
 * Продолжить за «Е» (цена растёт) или за видеокассету; не успел или отказался — итоги заезда.
 * Ещё — за рекламу (Яндекс Игры, раз за забег): o.ad + o.watchAd() → Promise<boolean>; на время рекламы отсчёт стоит.
 * o: { costE, haveE, haveVhs, seconds, dist, ad, watchAd, onPay(kind: 'e' | 'vhs' | 'ad'), onDecline() }
 */
export function showSecondChance(o) {
    document.querySelectorAll('.chance-modal').forEach(function(n) { n.remove(); });
    const m = document.createElement('div');
    m.className = 'chance-modal';
    const canE = o.haveE >= o.costE, canV = o.haveVhs >= 1;
    m.innerHTML = '<div class="chance-card" role="dialog" aria-label="Второй шанс">'
        + '<div class="cc-title">💥 РАЗБИЛСЯ!</div>'
        + '<div class="cc-sub">Проехано ' + Math.round(o.dist || 0) + ' м. Продолжить с того же места?</div>'
        + '<div class="cc-ring"><b>' + o.seconds + '</b></div>'
        + (o.ad ? '<button type="button" class="cc-pay-ad">🎬 Дальше за рекламу<small>бесплатно, один раз за забег</small></button>' : '')
        + '<button type="button" class="cc-pay-e"' + (canE ? '' : ' disabled') + '>▶ Дальше за ' + o.costE + ' Е<small>у тебя ' + o.haveE + ' Е</small></button>'
        + '<button type="button" class="cc-pay-v"' + (canV ? '' : ' disabled') + '>📼 Дальше за кассету<small>у тебя ' + o.haveVhs + '</small></button>'
        + '<button type="button" class="cc-no">Итоги заезда</button></div>';
    document.body.appendChild(m);
    let left = o.seconds, done = false, hold = false;
    const finish = function(fn) { if (done) return; done = true; clearInterval(timer); m.remove(); fn(); };
    const timer = setInterval(function() {
        if (hold) return;
        left--;
        const b = m.querySelector('.cc-ring b');
        if (b) b.textContent = String(Math.max(0, left));
        if (left <= 0) finish(o.onDecline);
    }, 1000);
    m.querySelector('.cc-pay-e').onclick = function() { if (canE) finish(function() { o.onPay('e'); }); };
    m.querySelector('.cc-pay-v').onclick = function() { if (canV) finish(function() { o.onPay('vhs'); }); };
    const adBtn = m.querySelector('.cc-pay-ad');
    if (adBtn) adBtn.onclick = function() {
        if (hold || done) return;
        hold = true; adBtn.disabled = true;
        o.watchAd().then(function(ok) { hold = false; if (ok) finish(function() { o.onPay('ad'); }); else { adBtn.disabled = false; adBtn.textContent = 'Реклама не загрузилась'; } });
    };
    m.querySelector('.cc-no').onclick = function() { finish(o.onDecline); };
    return m;
}

/** Значки действующих усилений над спидометром: иконка и полоска оставшегося времени */
export function renderPowerHud(list) {
    let el = document.getElementById('power-hud');
    if (!list.length) { if (el) el.hidden = true; return; }
    if (!el) {
        el = document.createElement('div');
        el.id = 'power-hud';
        document.body.appendChild(el);
    }
    el.hidden = false;
    const key = list.map(function(p) { return p.type; }).join(',');
    if (el.dataset.key !== key) {
        el.dataset.key = key;
        el.innerHTML = list.map(function(p) { return '<div class="ph-item" data-t="' + p.type + '"><i>' + p.icon + '</i><span><em></em></span></div>'; }).join('');
    }
    list.forEach(function(p) {
        const bar = el.querySelector('.ph-item[data-t="' + p.type + '"] em');
        if (bar) bar.style.width = Math.round(p.k * 100) + '%';
    });
}
