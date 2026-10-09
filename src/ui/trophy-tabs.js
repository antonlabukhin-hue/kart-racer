/**
 * «Трофеи»: вкладки — 🎖 значки, ⭐ наклейки «Досье курьера», 📼 артефакты 90-х, 🏆 кубки. Страница всегда открывается сверху
 * (раньше одним длинным списком — открывалась на середине). В подписи вкладки — сколько собрано.
 */
export function wireTrophyTabs() {
    const panel = document.getElementById('garage-panel-trophies');
    if (!panel) return;
    const tabs = panel.querySelectorAll('.tro-tab');
    const count = function(pane) {
        if (pane === 'badges') { const h = panel.querySelector('#badge-set .bs-head b'); return h ? h.textContent : ''; }
        if (pane === 'artifacts') { const h = panel.querySelector('#artifact-set .art-head'); const m = h && h.textContent.match(/(d+) из (d+)/); return m ? m[1] + ' / ' + m[2] : ''; }
        if (pane === 'stickers') { const h = panel.querySelector('#sticker-set .bs-head b'); return h ? h.textContent : ''; }
        const all = panel.querySelectorAll('#trophy-grid .trophy-slot').length, got = panel.querySelectorAll('#trophy-grid .trophy-slot:not(.locked)').length;
        return all ? got + ' / ' + all : '';
    };
    const show = function(pane) {
        tabs.forEach(function(t) { const on = t.dataset.tro === pane; t.classList.toggle('active', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
        panel.querySelectorAll('.tro-pane').forEach(function(p) { p.hidden = p.dataset.pane !== pane; });
        const scr = document.getElementById('garage-screen'), c = scr && scr.querySelector('.content');
        [scr, c, panel].forEach(function(el) { if (el) el.scrollTop = 0; });
    };
    tabs.forEach(function(t) {
        const em = t.querySelector('em'); if (em) em.textContent = count(t.dataset.tro);
        t.onclick = function() { show(t.dataset.tro); };
    });
    show((panel.querySelector('.tro-tab.active') || tabs[0]).dataset.tro);
}
