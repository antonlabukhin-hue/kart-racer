/**
 * Одна шкала заезда вместо трёх (множитель риска, «В УДАРЕ», безумный транспорт):
 *   цепочка — «×3» крупно, очки, пять делений до «В ударе» и тающая полоска — сколько осталось до конца цепочки;
 *   «В УДАРЕ» — та же шкала горит и тает, секунды; транспорт — его значок и название, секунды.
 * Огненная рамка по краям экрана в «В ударе» — отдельно (src/fever.js). DOM трогаем только при изменениях.
 */
import { CHAIN_WINDOW, MAX_MULT, FEVER_TIME } from '../risk-combo.js';
import { RIDES, RIDE_TIME } from '../rides.js';

/** Что показать: null — спрятать; mode 'chain' | 'fever' | 'ride' */
export function powerState(r, ride) {
    if (ride && ride.id && RIDES[ride.id]) {
        const R = RIDES[ride.id];
        return { mode: 'ride', label: R.icon + ' ' + R.name, sec: ride.t, fill: Math.max(0, Math.min(1, ride.t / RIDE_TIME)) };
    }
    if (r && r.fever > 0) return { mode: 'fever', label: '🔥 В УДАРЕ', sec: r.fever, fill: Math.max(0, Math.min(1, r.fever / FEVER_TIME)) };
    if (!r || r.points <= 0) return null;
    return { mode: 'chain', label: '×' + r.mult, mult: r.mult, segs: MAX_MULT, points: r.points, fill: Math.max(0, Math.min(1, r.timer / CHAIN_WINDOW)), feverOk: !!r.feverOk };
}

let last = {};

export function renderRiskHud(r, ride) {
    let el = document.getElementById('risk-hud');
    const st = powerState(r, ride);
    if (!st) { if (el) el.hidden = true; return; }
    if (!el) {
        el = document.createElement('div');
        el.id = 'risk-hud';
        el.innerHTML = '<b class="rk-mult"></b><span class="rk-pts"></span><i class="rk-segs"></i><i class="rk-bar"><u></u></i>';
        document.body.appendChild(el);
        last = {};
    }
    el.hidden = false;
    if (st.mode !== last.mode) {
        el.classList.toggle('fever', st.mode === 'fever');
        el.classList.toggle('ride', st.mode === 'ride');
        last.mode = st.mode; last.label = null; last.pts = null; last.mult = st.mult || 0;
    }
    if (st.label !== last.label) {
        const up = st.mode === 'chain' && st.mult > (last.mult || 0);
        el.querySelector('.rk-mult').textContent = st.label;
        el.classList.toggle('hot', st.mode === 'chain' && st.mult >= 4);
        el.classList.toggle('idle', st.mode === 'chain' && st.mult === 1);
        if (up && last.label) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
        if (st.mode === 'chain') {
            // деления до «В ударе»: ×1 — одно, ×5 — все пять
            const segs = el.querySelector('.rk-segs');
            if (segs.children.length !== st.segs) { segs.innerHTML = ''; for (let i = 0; i < st.segs; i++) segs.appendChild(document.createElement('s')); }
            for (let i = 0; i < segs.children.length; i++) segs.children[i].classList.toggle('on', i < st.mult);
            last.mult = st.mult;
        }
        last.label = st.label;
    }
    const pts = st.mode === 'chain' ? st.points.toLocaleString('ru-RU') : st.sec.toFixed(1) + ' с';
    if (pts !== last.pts) {
        el.querySelector('.rk-pts').textContent = pts;
        last.pts = pts;
        // панель заезда бывает выше обычной (бесконечная трасса) — встаём под неё, а не поверх
        const hud = document.getElementById('game-hud');
        if (hud && st.mode === 'chain') {
            el.style.top = '';
            const a = hud.getBoundingClientRect(), b = el.getBoundingClientRect();
            if (a.height && b.left < a.right && b.top < a.bottom && b.bottom > a.top) el.style.top = Math.round(a.bottom + 8) + 'px';
        }
    }
    const bar = Math.round(st.fill * 100);
    if (bar !== last.bar) { el.querySelector('.rk-bar u').style.width = bar + '%'; last.bar = bar; }
}
