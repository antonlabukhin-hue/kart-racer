/**
 * VHS-заставка при запуске: «вставили кассету» — снег, полоса трекинга, «PLAY ►» и счётчик ленты в углу,
 * потом картинка проявляется с дрожью и разъездом цветов. ~3 с, касание — пропустить.
 * Раз за сессию (sessionStorage); в автотестах — только с ?vhs=1. Без файлов: шум рисуется на маленьком холсте.
 */
export const VHS_KEY = 'road_racing_vhs_seen';

export function shouldPlayVhs(o) {
    const q = o.search || '';
    if (/[?&]vhs=1\b/.test(q)) return true;
    if (/[?&]vhs=0\b/.test(q) || o.webdriver || o.reduceMotion) return false;
    try { return !o.session.getItem(VHS_KEY); } catch (e) { return true; }
}

/** Счётчик ленты «0:00:07» по времени (мс) от начала */
export function tapeCounter(ms) {
    const s = Math.floor(ms / 1000) + 7;
    return '0:' + String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

export function playVhsIntro(opts) {
    const o = opts || {};
    try { sessionStorage.setItem(VHS_KEY, '1'); } catch (e) {}
    const root = document.createElement('div');
    root.className = 'vhs-intro';
    root.innerHTML = '<canvas width="160" height="90"></canvas><div class="vhs-band"></div>'; // только шипение: без счётчика ленты и надписей — они ложились на надписи заставки
    document.body.appendChild(root);
    document.body.classList.add('vhs-reveal'); // заставка игры под снегом дрожит и «плывёт» цветами, пока лента не встала
    const cv = root.querySelector('canvas'), g = cv.getContext('2d'), img = g.createImageData(160, 90);
    const t0 = performance.now(), SNOW = 1200, TOTAL = 3000;
    let raf = 0, done = false;
    const finish = function() {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        root.classList.add('vhs-out');
        document.body.classList.remove('vhs-reveal');
        setTimeout(function() { root.remove(); if (o.onDone) o.onDone(); }, 380);
    };
    const frame = function(now) {
        const t = now - t0;
        // снег: сначала сплошной, потом редеет — сквозь него проступает картинка (заставка под слоем)
        const k = t < SNOW ? 1 : Math.max(0, 1 - (t - SNOW) / 900);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
            const v = Math.random() * 255;
            d[i] = d[i + 1] = d[i + 2] = v;
            d[i + 3] = 255 * k * (0.55 + Math.random() * 0.45);
        }
        g.putImageData(img, 0, 0);
        root.style.setProperty('--vhs-k', k.toFixed(2));
        if (t > SNOW) root.classList.add('vhs-play-on');
        if (t >= TOTAL) { finish(); return; }
        raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    root.addEventListener('pointerdown', finish);
    document.addEventListener('keydown', function k() { document.removeEventListener('keydown', k); finish(); });
    return { skip: finish, el: root };
}
