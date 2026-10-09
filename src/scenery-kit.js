/**
 * Набор для насыщенных пейзажей бесконечной трассы: всё, что стоит вдоль участка (дома, магазины, избы, заборы,
 * остановки, деревья, столбы), собирается в ОДНУ геометрию на участок с ОДНИМ общим материалом:
 *   атлас — одна картинка 2048×1024 (фасады хрущёвок и панелек, витрины и вывески, избы с наличниками, шифер,
 *   мозаика остановки, лозунги, гаражи, бетонный забор…), цвет предметов — в вершинах (покраска изб, кузова, кроны);
 *   ночью окна и вывески светятся — второй атлас (emissiveMap) того же расклада, яркость — от света пейзажа.
 * Шаблоны (дом, изба, остановка…) строятся один раз и кэшируются массивами; на участке их только копируют со сдвигом
 * и поворотом на 0/90/180/270° — быстро, без новых объектов three.js. Итог участка — 1 вызов отрисовки.
 */
import * as THREE from 'three';

export const COLS = 8, ROWS = 4;
/** Клетки атласа: [колонка, строка] */
export const CELLS = {
    k5: [0, 0], p9: [1, 0], brick5: [2, 0], tower: [3, 0], side: [4, 0], roof: [5, 0], signsA: [6, 0], signsB: [7, 0],
    vitrine: [0, 1], izba: [1, 1], logs: [2, 1], slate: [3, 1], iron: [4, 1], mosaic: [5, 1], slogans: [6, 1], garage: [7, 1],
    po2: [0, 2], kiosk: [1, 2], planks: [2, 2], brick: [3, 2], white: [4, 2], lamp: [5, 2], stripes: [6, 2], beds: [7, 2],
    p9b: [0, 3], k5b: [1, 3], stalin: [2, 3], school: [3, 3], dk: [4, 3], bark: [5, 3], hay: [6, 3], shed: [7, 3]
};
/** Вывески (по 4 в клетке signsA/signsB), лозунги, киоски — по полосам */
export const SIGNS = ['ГАСТРОНОМ', 'УНИВЕРМАГ', 'АПТЕКА', 'ХЛЕБ', 'ОВОЩИ-ФРУКТЫ', 'ПАРИКМАХЕРСКАЯ', 'СБЕРКАССА', 'ПРОДУКТЫ'];
export const SLOGANS = ['СЛАВА ТРУДУ!', 'МИР! ТРУД! МАЙ!', 'НАРОД И ПАРТИЯ ЕДИНЫ', 'ПЯТИЛЕТКУ — ДОСРОЧНО!'];
export const KIOSKS = ['СОЮЗПЕЧАТЬ', 'МОРОЖЕНОЕ', 'КВАС', 'ТАБАК'];

/** UV-прямоугольник клетки (или полосы i из n по высоте): { u0, v0, u1, v1 } */
export function cellRect(name, strip, n) {
    const c = CELLS[name] || CELLS.white;
    const u0 = c[0] / COLS, u1 = (c[0] + 1) / COLS;
    let vTop = 1 - c[1] / ROWS, vBot = 1 - (c[1] + 1) / ROWS;
    if (strip != null) { const h = (vTop - vBot) / (n || 4); vTop = vTop - strip * h; vBot = vTop - h; }
    const e = 0.5 / 2048; // не захватывать соседа на краю
    return { u0: u0 + e, v0: vBot + e, u1: u1 - e, v1: vTop - e };
}

// ---------- рисование атласа ----------
function rnd(seed) { let s = seed >>> 0; return function() { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function paint(ctx, glow, S) {
    const R = rnd(7);
    const at = function(name) { const c = CELLS[name]; return [c[0] * S, c[1] * S]; };
    const fill = function(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const lit = function() { return R() < 0.45; };
    const litCol = function() { return ['#ffd27a', '#ffe9a8', '#ffb85a', '#fff2c8'][Math.floor(R() * 4)]; };
    // окно: рама, стекло (днём — тёмное с отблеском, иногда шторы), ночью — светится или нет
    function win(x, y, w, h, frame) {
        fill(ctx, x - 2, y - 2, w + 4, h + 4, frame || '#eeeae0');
        const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#5a7088'); g.addColorStop(1, '#2a3848');
        ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        if (R() < 0.35) fill(ctx, x + 1, y + 1, w * 0.3, h - 2, ['#c86a6a', '#d8c070', '#7aa0c8', '#e0e0d0'][Math.floor(R() * 4)]);
        fill(ctx, x + w / 2 - 1, y, 2, h, frame || '#eeeae0');
        if (lit()) fill(glow, x, y, w, h, litCol());
    }
    // фасад дома: этажи × окна, цвет стен, швы панелей, балконы
    function facade(name, floors, cols, wall, o) {
        o = o || {};
        const [x0, y0] = at(name);
        fill(ctx, x0, y0, S, S, wall);
        if (o.brick) for (let y = 0; y < S; y += 6) for (let x = (y / 6) % 2 ? 0 : 6; x < S; x += 12) fill(ctx, x0 + x, y0 + y, 11, 5, R() < 0.5 ? '#a8503a' : '#9a4632');
        if (o.panels) { ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1; for (let i = 1; i < floors; i++) { ctx.beginPath(); ctx.moveTo(x0, y0 + i * S / floors); ctx.lineTo(x0 + S, y0 + i * S / floors); ctx.stroke(); } for (let i = 1; i < cols; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * S / cols, y0); ctx.lineTo(x0 + i * S / cols, y0 + S); ctx.stroke(); } }
        const fh = S / floors, cw = S / cols;
        for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
            const wx = x0 + c * cw + cw * 0.22, wy = y0 + f * fh + fh * 0.22, ww = cw * 0.56, wh = fh * 0.56;
            win(wx, wy, ww, wh, o.frame);
            if (o.balcony && c % 2 === 1 && f < floors - 1) { fill(ctx, wx - 3, wy + wh * 0.62, ww + 6, wh * 0.5, o.balcony); fill(ctx, wx - 3, wy + wh * 0.62, ww + 6, 2, '#666'); }
        }
        if (o.cornice) { fill(ctx, x0, y0, S, 6, o.cornice); for (let f = 1; f < floors; f++) fill(ctx, x0, y0 + f * fh - 2, S, 3, o.cornice); }
    }
    facade('k5', 5, 4, '#cfc6b4', { panels: true });
    facade('k5b', 5, 4, '#e8c8a8', { frame: '#f4f0e6' });
    facade('p9', 9, 4, '#d8d8d0', { panels: true, balcony: '#9aa4a8' });
    facade('p9b', 9, 4, '#c8d4dc', { panels: true, balcony: '#6a8aa8' });
    facade('brick5', 5, 4, '#b05a40', { brick: true });
    facade('tower', 16, 3, '#e0dcd2', { panels: true, balcony: '#b0b4b0' });
    facade('stalin', 5, 4, '#e6d2a0', { cornice: '#f2ead0', frame: '#fff8e6' });
    // глухие стены, крыша
    { const [x, y] = at('side'); fill(ctx, x, y, S, S, '#c4bcac'); for (let i = 0; i < 40; i++) fill(ctx, x + R() * S, y + R() * S, 3 + R() * 10, 2, 'rgba(0,0,0,0.08)'); }
    { const [x, y] = at('roof'); fill(ctx, x, y, S, S, '#4a4a4a'); for (let i = 0; i < 60; i++) fill(ctx, x + R() * S, y + R() * S, 6, 6, 'rgba(255,255,255,0.05)'); }
    // вывески: 4 полосы на клетку, светятся ночью
    function signs(name, list, bg, fg) {
        const [x, y] = at(name), h = S / 4;
        list.forEach(function(t, i) {
            fill(ctx, x, y + i * h, S, h, bg[i % bg.length]);
            ctx.font = 'bold ' + Math.floor(h * (t.length > 10 ? 0.42 : 0.6)) + 'px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = fg; ctx.fillText(t, x + S / 2, y + i * h + h / 2 + 1);
            glow.font = ctx.font; glow.textAlign = 'center'; glow.textBaseline = 'middle'; glow.fillStyle = '#ff6a5a'; glow.fillText(t, x + S / 2, y + i * h + h / 2 + 1);
        });
    }
    signs('signsA', SIGNS.slice(0, 4), ['#1a3a8a', '#8a1a1a', '#1a6a3a', '#7a4a10'], '#fff4d0');
    signs('signsB', SIGNS.slice(4), ['#2a5a2a', '#5a2a6a', '#1a4a6a', '#8a2a1a'], '#fff4d0');
    signs('slogans', SLOGANS, ['#b81a1a'], '#ffe066');
    signs('kiosk', KIOSKS, ['#2a5aa8', '#e8e0d0', '#d89a20', '#2a7a4a'], '#ffffff');
    { const [x, y] = at('kiosk'), h = S / 4; fill(ctx, x, y + h, S, h, '#d8d0c0'); ctx.fillStyle = '#c81a1a'; ctx.font = 'bold ' + Math.floor(h * 0.48) + 'px Arial'; ctx.fillText(KIOSKS[1], x + S / 2, y + h * 1.5); }
    // витрины первого этажа
    { const [x, y] = at('vitrine'); fill(ctx, x, y, S, S, '#b8b0a0'); for (let i = 0; i < 3; i++) { fill(ctx, x + 8 + i * 84, y + 30, 72, 180, '#e8e4dc'); const g = ctx.createLinearGradient(0, y + 34, 0, y + 206); g.addColorStop(0, '#7a98b0'); g.addColorStop(1, '#3a5068'); ctx.fillStyle = g; ctx.fillRect(x + 12 + i * 84, y + 34, 64, 172); fill(glow, x + 12 + i * 84, y + 34, 64, 172, '#ffe9b0'); } fill(ctx, x + S / 2 - 18, y + 120, 36, 136, '#6a4a2a'); }
    // изба: брёвна, окно с резными наличниками
    function logs(x, y, base) { for (let i = 0; i < S; i += 16) { const g = ctx.createLinearGradient(0, y + i, 0, y + i + 16); g.addColorStop(0, base[0]); g.addColorStop(0.5, base[1]); g.addColorStop(1, base[2]); ctx.fillStyle = g; ctx.fillRect(x, y + i, S, 16); } }
    { const [x, y] = at('logs'); logs(x, y, ['#a87a4a', '#8a5a2e', '#5a3a1a']); }
    { const [x, y] = at('izba'); logs(x, y, ['#a87a4a', '#8a5a2e', '#5a3a1a']);
        [40, 150].forEach(function(wx) { fill(ctx, x + wx - 14, y + 64, 94, 128, '#f4f0e8'); fill(ctx, x + wx - 6, y + 50, 78, 14, '#f4f0e8');
            for (let k = 0; k < 6; k++) fill(ctx, x + wx - 10 + k * 15, y + 192, 9, 12, '#f4f0e8');
            fill(ctx, x + wx - 22, y + 74, 8, 108, '#3a7ab8'); fill(ctx, x + wx + 80, y + 74, 8, 108, '#3a7ab8'); win(x + wx, y + 76, 66, 104, '#f4f0e8'); }); }
    // шифер (волны), жесть (белая — красится в вершинах)
    { const [x, y] = at('slate'); fill(ctx, x, y, S, S, '#9a9a94'); for (let i = 0; i < S; i += 10) fill(ctx, x + i, y, 4, S, 'rgba(0,0,0,0.12)'); for (let j = 0; j < S; j += 48) fill(ctx, x, y + j, S, 2, 'rgba(0,0,0,0.2)'); }
    { const [x, y] = at('iron'); fill(ctx, x, y, S, S, '#f0f0f0'); for (let i = 0; i < S; i += 24) fill(ctx, x + i, y, 3, S, 'rgba(0,0,0,0.18)'); }
    // мозаика остановки: солнце, космонавт-ракета, волны
    { const [x, y] = at('mosaic'); fill(ctx, x, y, S, S, '#2a6ab0');
        for (let i = 0; i < 400; i++) fill(ctx, x + R() * S, y + R() * S, 6, 6, ['#2a6ab0', '#3a7ac0', '#1a5aa0'][Math.floor(R() * 3)]);
        ctx.fillStyle = '#f2b020'; ctx.beginPath(); ctx.arc(x + 70, y + 70, 40, 0, 7); ctx.fill();
        for (let a = 0; a < 12; a++) { ctx.save(); ctx.translate(x + 70, y + 70); ctx.rotate(a * Math.PI / 6); fill(ctx, 44, -4, 26, 8, '#f2b020'); ctx.restore(); }
        ctx.fillStyle = '#e8e8e8'; ctx.beginPath(); ctx.moveTo(x + 180, y + 40); ctx.lineTo(x + 200, y + 150); ctx.lineTo(x + 160, y + 150); ctx.fill(); fill(ctx, x + 168, y + 150, 24, 20, '#d83a2a');
        fill(ctx, x, y + 200, S, 56, '#1a8a5a'); for (let i = 0; i < S; i += 32) { ctx.fillStyle = '#4ac08a'; ctx.beginPath(); ctx.arc(x + i + 16, y + 210, 14, Math.PI, 0); ctx.fill(); } }
    // гаражи: ряд ворот разных цветов
    { const [x, y] = at('garage'); fill(ctx, x, y, S, S, '#b8b0a0'); ['#3a6a3a', '#8a3a2a', '#3a4a7a', '#7a7a3a'].forEach(function(c, i) { fill(ctx, x + 6 + i * 63, y + 70, 54, 180, c); fill(ctx, x + 6 + i * 63 + 26, y + 70, 2, 180, 'rgba(0,0,0,0.3)'); fill(ctx, x + 6 + i * 63, y + 60, 54, 6, '#888'); }); fill(ctx, x, y, S, 20, '#6a6a6a'); }
    // бетонный забор ПО-2 (ромбы)
    { const [x, y] = at('po2'); fill(ctx, x, y, S, S, '#b4ae9e'); ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 3; for (let i = -S; i < S * 2; i += 32) { ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i + S, y + S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + i + S, y); ctx.lineTo(x + i, y + S); ctx.stroke(); } fill(ctx, x, y, 6, S, '#8a8478'); fill(ctx, x + S - 6, y, 6, S, '#8a8478'); }
    // доски, кирпич, белое, фонарь
    { const [x, y] = at('planks'); for (let i = 0; i < S; i += 21) fill(ctx, x + i, y, 20, S, R() < 0.5 ? '#9a7a54' : '#8a6a46'); for (let i = 0; i < 30; i++) fill(ctx, x + R() * S, y + R() * S, 2, 2, '#4a3a2a'); }
    { const [x, y] = at('brick'); fill(ctx, x, y, S, S, '#8a4a36'); for (let yy = 0; yy < S; yy += 8) for (let xx = (yy / 8) % 2 ? 0 : 8; xx < S; xx += 16) fill(ctx, x + xx, y + yy, 15, 7, R() < 0.5 ? '#a8563e' : '#9a4c36'); }
    { const [x, y] = at('white'); fill(ctx, x, y, S, S, '#ffffff'); }
    { const [x, y] = at('lamp'); fill(ctx, x, y, S, S, '#fff6d8'); fill(glow, x, y, S, S, '#fff0c0'); }
    { const [x, y] = at('stripes'); for (let i = 0; i < 8; i++) fill(ctx, x, y + i * S / 8, S, S / 8, i % 2 ? '#f0f0f0' : '#c82a1a'); }
    { const [x, y] = at('beds'); fill(ctx, x, y, S, S, '#5a4028'); for (let i = 8; i < S; i += 32) { fill(ctx, x, y + i, S, 18, '#4a8a34'); for (let k = 0; k < S; k += 14) fill(ctx, x + k, y + i + 3, 8, 10, '#6aa844'); } }
    { const [x, y] = at('school'); fill(ctx, x, y, S, S, '#e8dcc0'); for (let f = 0; f < 3; f++) for (let c = 0; c < 3; c++) win(x + 12 + c * 82, y + 70 + f * 62, 66, 44); fill(ctx, x, y, S, 56, '#e8dcc0'); ctx.fillStyle = '#2a3a8a'; ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ШКОЛА', x + S / 2, y + 30); }
    { const [x, y] = at('dk'); fill(ctx, x, y, S, S, '#f0e8d4'); for (let c = 0; c < 6; c++) { fill(ctx, x + 16 + c * 40, y + 70, 18, 186, '#ffffff'); fill(ctx, x + 14 + c * 40, y + 70, 22, 8, '#d8d0bc'); } fill(ctx, x, y, S, 60, '#e2d8c0'); ctx.fillStyle = '#8a1a1a'; ctx.font = 'bold 26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ДОМ КУЛЬТУРЫ', x + S / 2, y + 32); glow.fillStyle = '#ffd27a'; glow.font = ctx.font; glow.textAlign = 'center'; glow.textBaseline = 'middle'; glow.fillText('ДОМ КУЛЬТУРЫ', x + S / 2, y + 32); }
    { const [x, y] = at('bark'); fill(ctx, x, y, S, S, '#ecebe4'); for (let i = 0; i < 70; i++) fill(ctx, x + R() * S, y + R() * S, 6 + R() * 14, 3, '#2a2a2a'); }
    { const [x, y] = at('hay'); fill(ctx, x, y, S, S, '#c8a850'); for (let i = 0; i < 300; i++) fill(ctx, x + R() * S, y + R() * S, 1, 10, R() < 0.5 ? '#a8883a' : '#e0c870'); }
    { const [x, y] = at('shed'); for (let i = 0; i < S; i += 21) fill(ctx, x + i, y, 20, S, R() < 0.5 ? '#6a5a4a' : '#5a4a3c'); fill(ctx, x + 90, y + 100, 76, 156, '#3a2e24'); }
}

let shared = null;
/** Общий материал набора (один на всю игру). lite — атлас вдвое меньше */
export function kitMaterial(lite) {
    if (shared) return shared;
    const W = lite ? 1024 : 2048, S = W / COLS;
    const mk = function() { const c = document.createElement('canvas'); c.width = W; c.height = S * ROWS; return c; };
    const c1 = mk(), c2 = mk();
    const ctx = c1.getContext('2d'), glow = c2.getContext('2d');
    glow.fillStyle = '#000'; glow.fillRect(0, 0, c2.width, c2.height);
    const sc = S / 256; ctx.scale(sc, sc); glow.scale(sc, sc);
    paint(ctx, glow, 256);
    const map = new THREE.CanvasTexture(c1), em = new THREE.CanvasTexture(c2);
    [map, em].forEach(function(t) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.keep = true; });
    shared = new THREE.MeshStandardMaterial({ map: map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 0.88, metalness: 0.02 });
    shared.userData.kit = true;
    return shared;
}
/** Ночь: окна и вывески светятся (k 0..1) */
export function setKitGlow(k) { if (shared) shared.emissiveIntensity = Math.max(0, Math.min(1, k)); }

let water = null;
export function waterMaterial() {
    if (!water) water = new THREE.MeshStandardMaterial({ color: 0x3a6e8e, roughness: 0.12, metalness: 0.35 });
    return water;
}

// ---------- геометрия ----------
/** Накопитель вершин участка (без индексов: 6 вершин на грань) */
export function createBatch() { return { p: [], n: [], uv: [], c: [] }; }

const tmpCol = new THREE.Color();
function push(b, x, y, z, nx, ny, nz, u, v, col) { b.p.push(x, y, z); b.n.push(nx, ny, nz); b.uv.push(u, v); b.c.push(col.r, col.g, col.b); }
/** Четырёхугольник: центр c, вектор вправо r (полуширина), вверх u (полувысота), нормаль n; rect — UV, col — цвет */
export function quad(b, c, r, u, n, rect, col, mirror) {
    const cs = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
    const R = rect || cellRect('white');
    cs.forEach(function(k) {
        const s = mirror ? -k[0] : k[0];
        push(b, c[0] + r[0] * k[0] + u[0] * k[1], c[1] + r[1] * k[0] + u[1] * k[1], c[2] + r[2] * k[0] + u[2] * k[1], n[0], n[1], n[2],
            R.u0 + (s + 1) / 2 * (R.u1 - R.u0), R.v0 + (k[1] + 1) / 2 * (R.v1 - R.v0), col);
    });
}
/**
 * Коробка: центр основания (x, y, z), размеры (w по x, h, d по z); f — UV граней { px, nx, pz, nz, py } (по умолчанию все — rect),
 * col — цвет (hex или Color). Грани читаются снаружи: надписи на ±x видны с дороги правильно.
 */
export function box(b, x, y, z, w, h, d, f, col) {
    f = f || {};
    const C = col && col.isColor ? col : tmpCol.set(col != null ? col : 0xffffff).clone();
    const def = f.all || cellRect('white');
    const hw = w / 2, hh = h / 2, hd = d / 2, cy = y + hh;
    quad(b, [x + hw, cy, z], [0, 0, -hd], [0, hh, 0], [1, 0, 0], f.px || def, C, f.mx);
    quad(b, [x - hw, cy, z], [0, 0, hd], [0, hh, 0], [-1, 0, 0], f.nx || def, C, f.mx);
    quad(b, [x, cy, z + hd], [hw, 0, 0], [0, hh, 0], [0, 0, 1], f.pz || def, C);
    quad(b, [x, cy, z - hd], [-hw, 0, 0], [0, hh, 0], [0, 0, -1], f.nz || def, C);
    if (!f.noTop) quad(b, [x, y + h, z], [hw, 0, 0], [0, 0, -hd], [0, 1, 0], f.py || def, C);
}
/** Цилиндр/конус (n граней): низ (x, y, z) радиус r0, верх радиус r1, высота h */
export function cyl(b, x, y, z, r0, r1, h, n, rect, col, cap) {
    const C = col && col.isColor ? col : tmpCol.set(col != null ? col : 0xffffff).clone();
    const R = rect || cellRect('white');
    for (let i = 0; i < n; i++) {
        const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, am = (a0 + a1) / 2;
        const p = [[Math.cos(a0) * r0, 0, Math.sin(a0) * r0, 0], [Math.cos(a1) * r0, 0, Math.sin(a1) * r0, 1], [Math.cos(a1) * r1, h, Math.sin(a1) * r1, 1], [Math.cos(a0) * r1, h, Math.sin(a0) * r1, 0]];
        const nx = Math.cos(am), nz = Math.sin(am), ny = (r0 - r1) / Math.max(0.001, h);
        const L = Math.hypot(nx, ny, nz);
        [0, 2, 1, 0, 3, 2].forEach(function(k) { const q = p[k]; push(b, x + q[0], y + q[1], z + q[2], nx / L, ny / L, nz / L, R.u0 + (i + q[3]) / n * (R.u1 - R.u0), q[1] > 0 ? R.v1 : R.v0, C); });
        if (cap && r1 > 0) { [[0, 0, 0], [Math.cos(a1) * r1, 0, Math.sin(a1) * r1], [Math.cos(a0) * r1, 0, Math.sin(a0) * r1]].forEach(function(q) { push(b, x + q[0], y + h, z + q[2], 0, 1, 0, (R.u0 + R.u1) / 2, (R.v0 + R.v1) / 2, C); }); }
    }
}
/** Двускатная крыша вдоль оси x (конёк по x): над прямоугольником w×d на высоте y, высота конька h */
export function gable(b, x, y, z, w, d, h, rect, col, endRect, endCol) {
    const C = col && col.isColor ? col : tmpCol.set(col != null ? col : 0xffffff).clone();
    rect = rect || cellRect('white');
    const hw = w / 2, hd = d / 2, sl = Math.hypot(hd, h);
    const ny = hd / sl, nz = h / sl;
    // скаты (+z и −z)
    quad(b, [x, y + h / 2, z + hd / 2], [hw, 0, 0], [0, h / 2, -hd / 2], [0, ny, nz], rect, C);
    quad(b, [x, y + h / 2, z - hd / 2], [-hw, 0, 0], [0, h / 2, hd / 2], [0, ny, -nz], rect, C);
    // фронтоны (треугольники на ±x)
    const E = endCol != null ? (endCol.isColor ? endCol : new THREE.Color(endCol)) : C, ER = endRect || rect;
    [1, -1].forEach(function(s) {
        const tri = [[x + s * hw, y, z + s * hd], [x + s * hw, y, z - s * hd], [x + s * hw, y + h, z]];
        const uvs = [[ER.u0, ER.v0], [ER.u1, ER.v0], [(ER.u0 + ER.u1) / 2, ER.v1]];
        tri.forEach(function(q, i) { push(b, q[0], q[1], q[2], s, 0, 0, uvs[i][0], uvs[i][1], E); });
    });
}

/** Шаблон из накопителя: типизированные массивы (кэшируются) */
export function freezeBatch(b) { return { p: new Float32Array(b.p), n: new Float32Array(b.n), uv: new Float32Array(b.uv), c: new Float32Array(b.c) }; }
const templates = new Map();
/** Шаблон по имени: строитель fn(batch) вызывается один раз */
export function template(name, fn) {
    if (!templates.has(name)) { const b = createBatch(); fn(b); templates.set(name, freezeBatch(b)); }
    return templates.get(name);
}

/** Поставить шаблон: сдвиг (x, y, z), поворот rot четвертями оборота (0..3), масштаб s, оттенок tint (умножается на цвет) */
/** Запретные полосы обочины (мост над дорогой, поле у деревни): [{ z0, z1, minX, maxX?, side? }] — туда застройка не ставится */
let KEEP = null;
export function setKeepOut(list) { KEEP = list && list.length ? list : null; }
export function keptOut(x, z) {
    if (!KEEP) return false;
    for (let i = 0; i < KEEP.length; i++) { const q = KEEP[i]; if (z <= q.z0 && z >= q.z1 && Math.abs(x) > q.minX && (!q.side || Math.sign(x) === q.side) && (q.maxX == null || Math.abs(x) < q.maxX)) return true; }
    return false;
}
export function place(b, t, x, y, z, rot, s, tint) {
    if (KEEP && keptOut(x, z)) return;
    const k = ((rot | 0) % 4 + 4) % 4, S = s || 1;
    const cos = [1, 0, -1, 0][k], sin = [0, 1, 0, -1][k];
    const tr = tint != null ? (tint.isColor ? tint : new THREE.Color(tint)) : null;
    const p = t.p, n = t.n, uv = t.uv, c = t.c;
    for (let i = 0; i < p.length; i += 3) {
        const px = p[i] * S, pz = p[i + 2] * S;
        b.p.push(x + px * cos + pz * sin, y + p[i + 1] * S, z - px * sin + pz * cos);
        b.n.push(n[i] * cos + n[i + 2] * sin, n[i + 1], -n[i] * sin + n[i + 2] * cos);
        if (tr) b.c.push(c[i] * tr.r, c[i + 1] * tr.g, c[i + 2] * tr.b); else b.c.push(c[i], c[i + 1], c[i + 2]);
    }
    for (let i = 0; i < uv.length; i++) b.uv.push(uv[i]);
}

/** Готовый меш участка (один вызов отрисовки) или null, если пусто */
export function batchMesh(b, material) {
    if (!b.p.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material);
    m.matrixAutoUpdate = false; m.updateMatrix();
    m.receiveShadow = true;
    m.userData.noMerge = true;
    return m;
}
