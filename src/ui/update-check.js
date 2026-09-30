/**
 * Новая версия игры на сайте: приложение «на экране Домой» подолгу висит в памяти телефона и не перезагружается —
 * игроки оставались на старой версии (без новых машин, мировой таблицы…). При возвращении в игру и раз в 10 минут
 * сверяем имя главного скрипта на сайте (у Vite в нём хэш: новая сборка = новое имя) с загруженным; если другое —
 * плашка «Обновить». Во время заезда не беспокоим.
 */
export function scriptName(html) {
    const m = String(html || '').match(/assets\/index-[\w-]+\.js/);
    return m ? m[0] : null;
}

export function installUpdateCheck(o) {
    const opts = o || {};
    const cur = function() {
        const s = document.querySelector('script[src*="assets/index-"]');
        return s ? scriptName(s.getAttribute('src')) : null;
    };
    let shown = false, last = 0;
    const check = function() {
        if (shown || !cur() || Date.now() - last < 60000) return;
        if (document.body.classList.contains('race-mode')) return;
        last = Date.now();
        fetch('./?v=' + Date.now(), { cache: 'no-store' }).then(function(r) { return r.ok ? r.text() : ''; }).then(function(html) {
            const fresh = scriptName(html);
            if (!fresh || fresh === cur() || shown || document.body.classList.contains('race-mode')) return;
            shown = true;
            const el = document.createElement('div');
            el.className = 'update-pop';
            el.innerHTML = '<b>🆕 Вышла новая версия</b><button type="button">Обновить</button>';
            el.querySelector('button').onclick = function() { location.reload(); };
            document.body.appendChild(el);
            if (opts.onShow) opts.onShow(el);
        }).catch(function() {});
    };
    document.addEventListener('visibilitychange', function() { if (!document.hidden) check(); });
    setInterval(check, 10 * 60 * 1000);
    setTimeout(check, 15000);
}
