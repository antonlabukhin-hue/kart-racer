/**
 * Индикатор множителя за риск в заезде: «×3» крупно, очки и тающая полоска — сколько осталось до конца цепочки.
 * Появляется с первым рисковым действием; при росте множителя — «прыжок». DOM трогаем только при изменениях.
 */
import { CHAIN_WINDOW } from '../risk-combo.js';

let last = { mult: 0, points: -1, bar: -1 };

export function renderRiskHud(r) {
    let el = document.getElementById('risk-hud');
    if (!r || r.points <= 0) { if (el) el.hidden = true; return; }
    if (!el) {
        el = document.createElement('div');
        el.id = 'risk-hud';
        el.innerHTML = '<b class="rk-mult"></b><span class="rk-pts"></span><i class="rk-bar"><u></u></i>';
        document.body.appendChild(el);
        last = { mult: 0, points: -1, bar: -1 };
    }
    el.hidden = false;
    if (r.mult !== last.mult) {
        const up = r.mult > last.mult;
        el.querySelector('.rk-mult').textContent = '×' + r.mult;
        el.classList.toggle('hot', r.mult >= 4);
        el.classList.toggle('idle', r.mult === 1);
        if (up && last.mult) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
        last.mult = r.mult;
    }
    if (r.points !== last.points) {
        el.querySelector('.rk-pts').textContent = r.points.toLocaleString('ru-RU');
        last.points = r.points;
        // панель заезда бывает выше обычной (бесконечная трасса) — встаём под неё, а не поверх
        const hud = document.getElementById('game-hud');
        if (hud) {
            el.style.top = '';
            const a = hud.getBoundingClientRect(), b = el.getBoundingClientRect();
            if (a.height && b.left < a.right && b.top < a.bottom && b.bottom > a.top) el.style.top = Math.round(a.bottom + 8) + 'px';
        }
    }
    const bar = Math.round((r.timer / CHAIN_WINDOW) * 100);
    if (bar !== last.bar) { el.querySelector('.rk-bar u').style.width = bar + '%'; last.bar = bar; }
}
