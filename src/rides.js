/**
 * Безумный транспорт на 10 секунд (как механический дракон в Jetpack Joyride): редкий жетон 🚜 на трассе —
 * машина игрока на время становится трактором-тараном, самосвалом или «кукурузником».
 *   трактор  — сносит попутки и препятствия, звенит «Е» за каждый снос;
 *   самосвал — то же, а за каждый снос из кузова вылетает ещё «Е»;
 *   кукурузник — летит над дорогой: аварий нет, «Е» в воздухе собираются.
 * Аварий в это время нет (как «В УДАРЕ»). Чистая логика (выбор, таймер, награды) — с тестами; модели — коробки.
 */
import * as THREE from 'three';
import { RIDE_MODELS } from './ride-models.js';

export const RIDE_TIME = 10;
export const RIDE_EVERY = [1400, 2200]; // ед. между жетонами в бесконечной трассе
export const RIDES = {
    tractor: { icon: '🚜', name: 'ТРАКТОР-ТАРАН', sub: 'Сноси всё на пути!', ramE: 3 },
    dumper: { icon: '🚛', name: 'САМОСВАЛ', sub: 'Сносишь — из кузова сыплются «Е»', ramE: 6 },
    plane: { icon: '✈', name: 'КУКУРУЗНИК', sub: 'Летишь над пробками', ramE: 0, fly: true }
};
export const RIDE_IDS = Object.keys(RIDES);

export function pickRide(rnd, prev) {
    const r = rnd || Math.random, list = RIDE_IDS.filter(function(id) { return id !== prev; });
    return list[Math.floor(r() * list.length) % list.length];
}
/** Состояние: { id, t } — t секунд осталось */
export function createRideState() { return { id: null, t: 0, last: null }; }
export function startRide(st, id) { st.id = id; st.t = RIDE_TIME; st.last = id; return RIDES[id]; }
/** Шаг: вернёт true в момент окончания */
export function tickRide(st, dt) {
    if (!st.id) return false;
    st.t -= dt;
    if (st.t <= 0) { st.id = null; st.t = 0; return true; }
    return false;
}
export function rideOn(st) { return !!(st && st.id); }
/** Высота полёта «кукурузника»: взлёт и посадка по 0.8 с */
export function rideLift(st) {
    if (!st || !st.id || !RIDES[st.id].fly) return 0;
    const up = Math.min(1, (RIDE_TIME - st.t) / 0.8), down = Math.min(1, st.t / 0.8);
    return 1.4 * Math.min(up, down); // ниже моста (src/railway.js DECK_Y) — пролетает под ним
}

/** Модель транспорта — детальная, из src/ride-models.js (anim — маячки и винт, exhaust — точки дыма) */
export function createRideModel(id) {
    const g = (RIDE_MODELS[id] || RIDE_MODELS.tractor)();
    g.userData.ride = id;
    return g;
}

/** Жетон 🚜 на трассе: светящийся круг с иконкой (как усиления) */
let tokenMat = null;
export function createRideToken() {
    if (!tokenMat) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 128;
        const c = cv.getContext('2d');
        const gr = c.createRadialGradient(64, 64, 10, 64, 64, 64);
        gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.65, 'rgba(255,120,60,0.7)'); gr.addColorStop(1, 'rgba(255,90,40,0)');
        c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
        c.lineWidth = 8; c.strokeStyle = '#ff5a2a'; c.beginPath(); c.arc(64, 64, 46, 0, Math.PI * 2); c.stroke();
        c.font = '58px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🚜', 64, 68);
        const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.userData.keep = true;
        tokenMat = new THREE.SpriteMaterial({ map: t, depthWrite: false });
    }
    const grp = new THREE.Group(); const s = new THREE.Sprite(tokenMat); s.scale.set(1.6, 1.6, 1); grp.add(s);
    return grp;
}

/** Шкала безумного транспорта (как у «В УДАРЕ», src/fever.js): название, сколько осталось, мигает в последние 2 с */
export function renderRideBar(st) {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('ride-bar');
    if (!st || !st.id) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'ride-bar'; el.innerHTML = '<b></b><i><u></u></i>'; document.body.appendChild(el); }
    const r = RIDES[st.id], k = Math.max(0, Math.min(1, st.t / RIDE_TIME));
    const title = r.icon + ' ' + r.name + ' ' + st.t.toFixed(1) + ' с';
    if (el.firstChild.textContent !== title) el.firstChild.textContent = title;
    el.querySelector('u').style.width = (k * 100).toFixed(1) + '%';
    el.classList.toggle('ending', st.t < 2);
}
