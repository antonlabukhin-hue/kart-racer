/**
 * Геймпад (стандартная раскладка Xbox/PlayStation):
 *   гонка — левый стик / крестовина: полосы, RT или A: газ, LT или B: тормоз, Start: пауза, Y: камера;
 *   меню — крестовина / стик: фокус по кнопкам, A: нажать, B: назад (Escape).
 * Опрос идёт своим rAF-циклом — работает и на паузе, и в меню.
 */
export const DEADZONE = 0.35;

const btn = function(pad, i) {
    const b = pad && pad.buttons && pad.buttons[i];
    return !!(b && (b.pressed || b.value > 0.3));
};

/** Состояние одного геймпада в «клавишах» игры */
export function readPad(pad) {
    // только настоящие геймпады (стандартная раскладка): на части телефонов браузер выдаёт за «геймпад» сканер отпечатка
    // или кнопки корпуса — их случайные «нажатия» сами переключали камеру и подруливали
    if (!pad || !pad.connected || pad.mapping !== 'standard') return null;
    const ax = (pad.axes && pad.axes[0]) || 0;
    const ay = (pad.axes && pad.axes[1]) || 0;
    const left = btn(pad, 14) || ax < -DEADZONE;
    const right = btn(pad, 15) || ax > DEADZONE;
    return {
        w: btn(pad, 7) || btn(pad, 0),
        s: btn(pad, 6) || btn(pad, 1),
        a: left,
        d: right,
        up: btn(pad, 12) || ay < -DEADZONE,
        down: btn(pad, 13) || ay > DEADZONE,
        left: left,
        right: right,
        ok: btn(pad, 0),
        back: btn(pad, 1),
        start: btn(pad, 9),
        camera: btn(pad, 3)
    };
}

/** Объединить все подключённые геймпады (любой может рулить) */
export function readPads(pads) {
    let out = null;
    for (let i = 0; pads && i < pads.length; i++) {
        const r = readPad(pads[i]);
        if (!r) continue;
        if (!out) { out = r; continue; }
        Object.keys(r).forEach(function(k) { out[k] = out[k] || r[k]; });
    }
    return out;
}

/** Кнопки, нажатые именно в этом кадре */
export function pressedEdges(prev, now) {
    const e = {};
    if (!now) return e;
    Object.keys(now).forEach(function(k) { if (now[k] && !(prev && prev[k])) e[k] = true; });
    return e;
}

/** Следующий элемент для фокуса в меню: dir = +1 / −1, по кругу */
export function nextFocusIndex(count, current, dir) {
    if (count <= 0) return -1;
    if (current < 0) return dir > 0 ? 0 : count - 1;
    return (current + dir + count) % count;
}

/**
 * Запуск опроса. hooks: { inRace(): bool, togglePause(), cycleCamera(), focusables(): Element[] }
 * Состояние для гонки — window.__padKeys ({ w, s, a, d } или null).
 */
export function startGamepadPolling(hooks) {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return function() {};
    let prev = null, rafId = 0, repeatT = 0, lastDir = 0;
    const tick = function(now) {
        rafId = requestAnimationFrame(tick);
        let st = null;
        try { st = readPads(navigator.getGamepads()); } catch (e) { st = null; }
        window.__padKeys = st ? { w: st.w, s: st.s, a: st.a, d: st.d } : null;
        if (!st) { prev = null; return; }
        const ed = pressedEdges(prev, st);
        prev = st;
        const racing = hooks.inRace() && !window.__racePaused;
        if (ed.start && hooks.inRace()) hooks.togglePause();
        if (ed.camera && racing) hooks.cycleCamera();
        if (racing) return;
        // меню и пауза: навигация фокусом, с автоповтором при удержании
        const dir = (st.down || st.right) ? 1 : (st.up || st.left) ? -1 : 0;
        if (dir && (dir !== lastDir || now - repeatT > 260)) {
            const list = hooks.focusables();
            const cur = list.indexOf(document.activeElement);
            const nx = nextFocusIndex(list.length, cur, dir);
            if (nx >= 0) {
                const el = list[nx];
                if (!el.matches('button, input, select, textarea, a[href]') && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
                el.focus({ preventScroll: false });
                try { el.scrollIntoView({ block: 'nearest' }); } catch (e) {}
                document.body.classList.add('pad-nav');
            }
            repeatT = now;
        }
        lastDir = dir;
        if (ed.ok && document.activeElement && document.activeElement !== document.body) document.activeElement.click();
        if (ed.back) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    };
    rafId = requestAnimationFrame(tick);
    return function() { cancelAnimationFrame(rafId); };
}
