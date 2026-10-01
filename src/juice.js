/**
 * Сочность бесконечной трассы: то, что не меняет правил, но делает скорость и сбор «Е» ощутимыми.
 *   ringPitch — звон «Е» в цепочке с каждой следующей выше (как монетки в Subway Surfers), пауза — с начала;
 *   speedFov — чем ближе к максимальной скорости (и на нитро), тем шире угол камеры;
 *   renderSpeedLines — линии скорости по краям экрана на большой скорости.
 * Замедление времени на «На волоске» было и убрано (ощущалось как подвисание) — здесь его нет.
 */
export const CHAIN_GAP = 0.45;   // с: дольше — цепочка звона начинается заново
export const CHAIN_STEPS = 12;   // на сколько полутонов звон может подняться
export function createRingChain() { return { n: -1, t: -1e9 }; }
/** Взята «Е» в момент now (с): множитель частоты звона — 1, 2^(1/12), … до октавы выше */
export function ringPitch(st, now) {
    st.n = now - st.t <= CHAIN_GAP ? Math.min(CHAIN_STEPS, st.n + 1) : 0;
    st.t = now;
    return Math.pow(2, st.n / 12);
}

export const FOV_SPEED = 6, FOV_NITRO = 3; // градусы сверх обычного
/** Угол камеры сверх обычного: k — скорость / максимум (0..1+), с 60% — плавно растёт */
export function speedFov(k, nitro) {
    const x = Math.max(0, Math.min(1, ((k || 0) - 0.6) / 0.4));
    return x * x * FOV_SPEED + (nitro ? FOV_NITRO : 0);
}

/** Линии скорости: k 0..1 — сила (0 — нет) */
export function speedLinesK(speedK, nitro, fever) {
    const base = Math.max(0, Math.min(1, ((speedK || 0) - 0.82) / 0.18));
    return Math.min(1, base * 0.6 + (nitro ? 0.5 : 0) + (fever ? 0.4 : 0));
}
let _sl = null, _slK = -1;
/**
 * Линии рисуются один раз на маленьком холсте (лучи от центра, к краям ярче, середина прозрачная) и дальше только
 * меняют прозрачность и чуть «дышат» трансформом — это делает видеокарта без перерисовки страницы.
 * (Раньше были CSS-градиент во весь экран с маской и включение через display — при появлении игра подвисала.)
 */
function drawLines() {
    const c = document.createElement('canvas');
    const W = 480, H = 270;
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const cx = W / 2, cy = H * 0.46, R = Math.hypot(W, H) * 0.6;
    for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2 + (i % 3) * 0.013;
        const r0 = R * (0.42 + ((i * 37) % 11) / 60), w = 0.6 + ((i * 13) % 5) * 0.35;
        const grd = g.createLinearGradient(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        grd.addColorStop(0, 'rgba(255,255,255,0)');
        grd.addColorStop(1, 'rgba(255,255,255,0.75)');
        g.strokeStyle = grd; g.lineWidth = w;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke();
    }
    return c;
}
export function renderSpeedLines(k) {
    const v = Math.round(Math.max(0, Math.min(1, k || 0)) * 20) / 20;
    if (v === _slK && _sl && _sl.isConnected) return;
    _slK = v;
    if (!_sl || !_sl.isConnected) {
        _sl = drawLines();
        _sl.id = 'speed-lines';
        _sl.setAttribute('aria-hidden', 'true');
        document.body.appendChild(_sl);
    }
    _sl.style.opacity = String(v);
    _sl.style.animationPlayState = v > 0 ? 'running' : 'paused'; // невидимые — не анимируем
}
