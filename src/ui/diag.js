/**
 * Диагностика на устройстве: адрес с ?diag=1 — в углу экрана раз в секунду: кадры, вызовы отрисовки, геометрии и текстуры
 * в памяти видеокарты, звук (состояние, сбои мотора, последняя ошибка), последние ошибки страницы.
 * Каждую секунду заезда пишет «след» в localStorage: если вкладку выкинуло (iPhone закрывает её при нехватке памяти),
 * при следующем запуске в углу видно, на каком метре и с какими числами заезд оборвался.
 */
const KEY = 'road_racing_diag_trail';
let src = null;
/** Источник чисел заезда: fn() → { dist, renderer } (вызывается из main.js, когда заезд идёт) */
export function setDiagSource(fn) { src = fn; }

export function diagOn(search) { return /[?&]diag=1\b/.test(search || ''); }

export function installDiag(o) {
    const errors = [];
    window.addEventListener('error', function(e) { errors.push((e.message || 'error') + ' @' + (e.lineno || '?')); if (errors.length > 3) errors.shift(); });
    window.addEventListener('unhandledrejection', function(e) { errors.push('promise: ' + String(e.reason && (e.reason.message || e.reason))); if (errors.length > 3) errors.shift(); });
    let prev = null;
    try { prev = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:99999;max-width:62vw;padding:4px 6px;border-radius:6px;background:rgba(0,0,0,0.72);color:#9fff9f;font:10px/1.3 monospace;pointer-events:none;white-space:pre-wrap;';
    document.body.appendChild(box);
    let frames = 0, last = performance.now();
    (function tick() { frames++; requestAnimationFrame(tick); })();
    setInterval(function() {
        const now = performance.now(), fps = Math.round(frames * 1000 / (now - last)); frames = 0; last = now;
        const s = src ? src() : null, r = s && s.renderer, info = r && r.info;
        const se = o.sound && o.sound();
        const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB' : '—';
        const row = { t: Date.now(), racing: !!(s && s.racing), dist: s ? Math.round(s.dist || 0) : 0, fps: fps,
            geo: info ? info.memory.geometries : 0, tex: info ? info.memory.textures : 0, calls: info ? info.render.calls : 0, tri: info ? info.render.triangles : 0,
            audio: se ? (se.audioCtx ? se.audioCtx.state : 'нет') + (se._engSimple ? ' простой' : '') + ' сбоев ' + (se.engineErrors || 0) : '—', err: se && se.lastAudioError || '' };
        try { localStorage.setItem(KEY, JSON.stringify(row)); } catch (e) {}
        box.textContent = 'fps ' + row.fps + ' · ' + row.dist + ' м · вызовов ' + row.calls + ' · треуг ' + Math.round(row.tri / 1000) + 'k\n'
            + 'геом ' + row.geo + ' · текст ' + row.tex + ' · JS ' + mem + '\nзвук: ' + row.audio + (row.err ? '\nзвук-ошибка: ' + row.err : '')
            + (errors.length ? '\nошибки: ' + errors.join(' | ') : '')
            + (prev && prev.racing ? '\nПРОШЛЫЙ ЗАЕЗД ОБОРВАЛСЯ: ' + prev.dist + ' м, геом ' + prev.geo + ', текст ' + prev.tex + ', fps ' + prev.fps + ', звук ' + prev.audio : '');
    }, 1000);
}
