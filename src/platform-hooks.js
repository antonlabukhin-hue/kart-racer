/**
 * Площадка (src/platform.js) ↔ игра: реклама за награду (второй шанс, ×2 «Е» за забег), межэкранная реклама
 * между заездами, «Касса» в магазине машин (покупки), разметка геймплея и пауза звука на время рекламы.
 * События заездов приходят из журнала аналитики (src/analytics.js setSender) — main.js почти не трогаем.
 * d: { platform, player(), save(), refresh(), notify, metrics }
 */
import { grantProduct } from './platform.js';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/** Строка «Касса»: товары с ценой площадки (иконка валюты — с площадки, требование Яндекса) */
export function payHtml(list) {
    if (!list || !list.length) return '';
    return '<div class="pay-title">🛒 Касса</div><div class="pay-list">' + list.map(function(p) {
        const cur = p.currencyIcon ? ' <img alt="" src="' + esc(p.currencyIcon) + '">' : '';
        return '<button type="button" class="pay-item' + (p.hot ? ' hot' : '') + '" data-pay="' + esc(p.id) + '">'
            + '<i>' + esc(p.icon) + '</i><span>' + esc(p.title) + '</span><b>' + esc(p.priceValue != null ? p.priceValue : p.price) + cur + '</b></button>';
    }).join('') + '</div>';
}

/** На время рекламы: заезд — на паузу (меню паузы), звук — тише воды */
export function pauseForAd() {
    try { if (window.__inRace && !window.__racePaused && window.toggleRacePause) window.toggleRacePause(); } catch (e) {}
    try { window.soundEngine.suspendAll(); } catch (e) {}
}
export function resumeForAd() { try { window.soundEngine.resumeAll(); } catch (e) {} }

export function wirePlatform(d) {
    const pf = d.platform;
    const st = { runs: 0, chanceAd: false, lastRun: null, skipAd: false };

    // события заездов (вместе с метриками)
    const onEvent = function(ev) {
        if (d.metrics) d.metrics.event(ev);
        if (ev.e === 'race_start') { st.chanceAd = false; st.lastRun = null; if (d.announcer) d.announcer.hush(); } // реплика с прошлых итогов не тянется в новый заезд
        if (ev.e === 'race_end' && d.announcer && !(ev.mode === 'endless' && ev.state === 'win')) setTimeout(function() { d.announcer.say('finish'); }, 900); // пройденная волна «Звериного часа» — не финиш: там карточка волны
        if (ev.e === 'race_end') { st.runs++; if (typeof ev.dist === 'number') { const p = d.player(); st.lastRun = ev; st.chips0 = p && p.season ? p.season.chips || 0 : 0; addDoubleBtn(20); } }
    };

    // ×2 «Е» за забег бесконечной трассы — кнопка на экране итогов
    const addDoubleBtn = function(tries) {
        const run = st.lastRun, box = document.getElementById('finish-actions');
        if (!run || !pf.rewardedAvailable()) return;
        if (!box) { if (tries > 0) setTimeout(function() { addDoubleBtn(tries - 1); }, 300); return; } // итоги появляются после события
        if (box.querySelector('.ad-double')) return;
        const pl = d.player(), gain = pl && pl.season ? (pl.season.chips || 0) - st.chips0 : 0; // столько «Е» начислено за забег
        if (!(gain > 0)) return;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'fin-btn ad-btn ad-double';
        b.innerHTML = '🎬 ×2 «Е» за рекламу <small>+' + gain + ' Е</small>';
        b.onclick = function() {
            if (b.disabled) return;
            b.disabled = true;
            pf.rewarded().then(function(ok) {
                const p = d.player();
                if (!ok || !p) { b.disabled = false; return; }
                p.season = p.season || {};
                p.season.chips = (p.season.chips || 0) + gain;
                st.lastRun = null;
                try { d.save(); d.refresh(); } catch (e) {}
                b.className = 'fin-btn ad-btn ad-double done';
                b.innerHTML = '✅ +' + gain + ' Е — удвоено!';
            });
        };
        const acts = box.querySelector('.fin-actions') || box;
        acts.insertBefore(b, acts.firstChild);
    };

    // межэкранная реклама: по нажатию «Повторить» / «В меню» на итогах (не в первые два заезда сессии)
    document.addEventListener('click', function(e) {
        const t = e.target && e.target.closest && e.target.closest('#finish-restart-btn, #finish-menu-btn, #finish-next-btn');
        if (!t || st.skipAd || st.runs < 3) return;
        const p = d.player();
        if (pf.name !== 'yandex' && !pf.mock) return;
        e.preventDefault(); e.stopImmediatePropagation();
        pf.interstitial(p && p.noAds).then(function() { st.skipAd = true; t.click(); st.skipAd = false; });
    }, true);

    // «Касса» в магазине машин
    const renderPay = function() {
        const box = document.getElementById('shop-pay');
        if (!box || !pf.paymentsAvailable()) return;
        pf.catalog().then(function(list) {
            const p = d.player();
            list = list.filter(function(x) { return !(x.forever && p && p.noAds); });
            box.innerHTML = payHtml(list);
            box.hidden = !list.length;
            box.querySelectorAll('[data-pay]').forEach(function(btn) {
                btn.onclick = function() {
                    pf.buy(btn.dataset.pay, function(id) {
                        const pl = d.player(), got = grantProduct(pl, id);
                        try { d.save(); d.refresh(); } catch (e) {}
                        const cur = document.getElementById('shop-currency');
                        if (cur && pl) cur.textContent = 'Е: ' + (pl.season.chips || 0) + ' · 📼 ' + (pl.season.vhs || 0);
                        if (got && d.notify) d.notify.success('🛒 Спасибо за покупку!', got.noads ? 'Реклама между заездами отключена' : 'Уже на счету');
                        if (got && got.noads) renderPay();
                    });
                };
            });
        });
    };

    pf.init();
    pf.loaded();
    renderPay();
    pf.restore(function(id) { const p = d.player(); if (p) { grantProduct(p, id); try { d.save(); d.refresh(); } catch (e) {} } });

    return {
        onEvent: onEvent,
        /** второй шанс: можно ли продолжить за рекламу (раз за забег) */
        chanceAd: function() { return pf.rewardedAvailable() && !st.chanceAd; },
        /** посмотреть рекламу за второй шанс → Promise<boolean> */
        watchChance: function() { return pf.rewarded().then(function(ok) { if (ok) st.chanceAd = true; return ok; }); }
    };
}
