/**
 * «В УДАРЕ» (как суперкроссовки в Subway Surfers): в бесконечной трассе множитель риска дошёл до ×5 —
 * FEVER_TIME секунд (src/risk-combo.js) машина на нитро и неуязвима: попутки отлетают, звери отскакивают,
 * ямы, шипы, масло и разломы не мешают; работают магнит и двойные «Е», за каждую снесённую попутку или зверя — FEVER_RAM_E «Е».
 * Здесь — что делать каждый кадр и как это выглядит (рамка-пламя по краям экрана, плашка, звук).
 */
import { FEVER_TIME } from './risk-combo.js';

export const FEVER_RAM_E = 5;

/** Кадр «В ударе»: усиления заезда (src/powerups.js) держатся, пока горит. Возвращает, сколько секунд нитро держать */
export function feverHold(risk, powers) {
    if (!(risk && risk.fever > 0)) return 0;
    if (powers) {
        powers.magnet = Math.max(powers.magnet || 0, risk.fever);
        powers.x2 = Math.max(powers.x2 || 0, risk.fever);
    }
    return 0.25;
}

/** Рамка по краям экрана: k — 0..1, сколько ещё горит (под конец мигает) */
export function renderFeverFx(risk) {
    let el = document.getElementById('fever-fx');
    const on = !!(risk && risk.fever > 0);
    if (!on) { if (el) el.remove(); return; }
    if (!el) {
        el = document.createElement('div');
        el.id = 'fever-fx';
        el.innerHTML = '<b>🔥 В УДАРЕ <em></em></b><i><u></u></i>';
        document.body.appendChild(el);
    }
    const k = risk.fever / FEVER_TIME;
    el.querySelector('u').style.width = Math.round(k * 100) + '%';
    const sec = el.querySelector('em'); if (sec) sec.textContent = risk.fever.toFixed(1) + ' с'; // сколько ещё осталось
    el.classList.toggle('ending', risk.fever < 1.6);
}
