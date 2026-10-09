/**
 * Детали у самой обочины бесконечной трассы: советская остановка с мозаикой, ларёк с вывеской,
 * ржавая горбатая машина на кирпичах, бабушка с семечками и банкой огурцов, синий указатель «город, км».
 * pickRoadside — чистая логика (с тестами): что и где поставить на участке; строители — меши.
 * Все сплошные детали — один материал с цветом в вершинах: участок склеивается в один меш (src/merge-static.js)
 * и шейдер собирается один раз на старте, без рывка посреди заезда.
 */
import * as THREE from 'three';

export const CITIES = ['ВЛАДИВОСТОК', 'АРСЕНЬЕВ', 'УССУРИЙСК', 'НАХОДКА', 'ДАЛЬНЕГОРСК', 'СПАССК'];
export const KIOSK_SIGNS = ['ПИВО-ВОДЫ', 'ГАЗЕТЫ', 'ЦВЕТЫ', 'ВИДЕО', 'ПРОДУКТЫ', 'ШАУРМА'];
const SIGN_EVERY = 8; // указатель — каждые 8 участков (480 м)

/** Вес каждой детали по стилю участка: остановка, ларёк, бабушка, ржавая машина */
const WEIGHTS = {
    arsenev: { stop: 0.22, kiosk: 0.22, granny: 0.14, wreck: 0.12 },
    city: { stop: 0.26, kiosk: 0.28, granny: 0.1, wreck: 0.08 },
    village: { stop: 0.18, kiosk: 0.08, granny: 0.34, wreck: 0.18 },
    industrial: { stop: 0.16, kiosk: 0.1, granny: 0.04, wreck: 0.34 },
    junk: { stop: 0.04, kiosk: 0.04, granny: 0.04, wreck: 0.6 },
    forest: { stop: 0.1, kiosk: 0.03, granny: 0.08, wreck: 0.14 }
};

/** Километры до города на указателе: убывают по ходу заезда, не меньше 1 */
export function signKm(i) { return Math.max(1, 250 - Math.round(i * 0.06)); }

/**
 * Что поставить на участке i: [{ kind, side (-1 слева, 1 справа), dz (0..1 вдоль участка), text? }]
 * night — без бабушки (ночью она дома), snow — без ларька.
 */
export function pickRoadside(style, i, rnd, o) {
    o = o || {};
    const w = WEIGHTS[style] || WEIGHTS.arsenev, out = [];
    if (i > 0 && i % SIGN_EVERY === SIGN_EVERY / 2) out.push({ kind: 'sign', side: 1, dz: 0.5, text: CITIES[Math.floor(i / SIGN_EVERY) % CITIES.length] + ' ' + signKm(i) });
    ['stop', 'kiosk', 'granny', 'wreck'].forEach(function(k) {
        if (k === 'granny' && o.night) return;
        if (k === 'kiosk' && o.snow) return;
        if (rnd() < w[k]) out.push({ kind: k, side: rnd() < 0.5 ? -1 : 1, dz: rnd() });
    });
    // одна деталь на сторону рядом: разводим вдоль участка
    for (let a = 0; a < out.length; a++) for (let b = a + 1; b < out.length; b++) {
        if (out[a].side === out[b].side && Math.abs(out[a].dz - out[b].dz) < 0.25) out[b].dz = (out[a].dz + 0.5) % 1;
    }
    return out;
}

/** Отступ от края дороги (м): ближе всех бабушка и указатель, дальше — ларёк и ржавая машина */
export function sideGap(kind) { return { sign: 1.3, granny: 1.5, stop: 2.1, kiosk: 3.2, wreck: 3.4 }[kind] || 2.5; }

/* ---------- меши ---------- */

const mats = {};
let vcMat = null;
/** «Краска» детали: цвет вершин (второй аргумент — прежние свойства материала, больше не нужны) */
function M(hex) { return { paint: hex }; }
const _c = new THREE.Color();
function mesh(geo, p) {
    _c.setHex(p.paint);
    const n = geo.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!vcMat) vcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });
    return new THREE.Mesh(geo, vcMat);
}
function box(g, w, h, d, mat, x, y, z) {
    const m = mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
}
function cyl(g, r0, r1, h, mat, x, y, z, seg) {
    const m = mesh(new THREE.CylinderGeometry(r0, r1, h, seg || 8), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
}

const texCache = {};
function labelTex(text, bg, fg, w, h, once) {
    const k = text + bg + fg;
    if (!once && texCache[k]) return texCache[k];
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.strokeStyle = fg; c.lineWidth = 4; c.strokeRect(5, 5, w - 10, h - 10);
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    const parts = text.split(' ');
    if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) { // «ГОРОД 245» — две строки, км крупнее
        c.font = 'bold ' + Math.round(h * 0.26) + 'px Arial'; c.fillText(parts.slice(0, -1).join(' '), w / 2, h * 0.34, w - 28); // длинный город — ужимается по ширине
        c.font = 'bold ' + Math.round(h * 0.34) + 'px Arial'; c.fillText(parts[parts.length - 1] + ' км', w / 2, h * 0.7);
    } else {
        c.font = 'bold ' + Math.round(h * 0.5) + 'px Arial'; c.fillText(text, w / 2, h / 2 + 2, w - 24);
    }
    const t = new THREE.CanvasTexture(cv);
    if (once) return t; // разовая (км на указателе) — освобождается вместе с участком
    t.userData.keep = true; // общая — участок при удалении её не освобождает
    texCache[k] = t;
    return t;
}
function label(g, text, bg, fg, w, h, x, y, z, pw, ph, once) {
    const k = 'lbl' + text + bg + fg;
    const mat = once ? new THREE.MeshBasicMaterial({ map: labelTex(text, bg, fg, w, h, true) }) : (mats[k] || (mats[k] = new THREE.MeshBasicMaterial({ map: labelTex(text, bg, fg, w, h) })));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
}

/** Остановка: бетонная стенка с мозаикой, козырёк, скамейка, столбик с «А» */
export function createBusStop(rnd) {
    const g = new THREE.Group(), conc = M(0xb8b0a0);
    box(g, 3, 2.2, 0.18, conc, 0, 1.1, -0.55);
    box(g, 0.16, 2.2, 1.1, conc, -1.42, 1.1, 0);
    box(g, 0.16, 2.2, 1.1, conc, 1.42, 1.1, 0);
    box(g, 3.3, 0.16, 1.5, conc, 0, 2.28, 0.05);
    // мозаика на стенке — цветные плитки
    const pal = [0xd04030, 0x2f78c0, 0xf0c030, 0x3a9a5a, 0xe8e0d0];
    for (let cx = 0; cx < 6; cx++) for (let cy = 0; cy < 3; cy++) box(g, 0.42, 0.42, 0.04, M(pal[Math.floor(rnd() * pal.length)]), -1.05 + cx * 0.42, 1.0 + cy * 0.42, -0.44);
    box(g, 2.2, 0.08, 0.4, M(0x7a5030), 0, 0.5, -0.25);
    box(g, 2.2, 0.5, 0.06, M(0x7a5030), 0, 0.75, -0.43);
    cyl(g, 0.04, 0.04, 2.4, M(0x555555), 1.9, 1.2, 0.5);
    label(g, 'А', '#f2c200', '#1a1a1a', 64, 64, 1.9, 2.25, 0.54, 0.5, 0.5);
    return g;
}

/** Ларёк: цветной короб, тёмная витрина, вывеска */
export function createKiosk(rnd) {
    const g = new THREE.Group(), cols = [0x3a7ac0, 0xd0a020, 0x3a9a6a, 0xc04a3a, 0xe8e0d0];
    const body = M(cols[Math.floor(rnd() * cols.length)]);
    box(g, 1.9, 2.1, 1.6, body, 0, 1.05, 0);
    box(g, 2.1, 0.12, 1.8, M(0xe8e8e8), 0, 2.16, 0);
    box(g, 1.5, 0.75, 0.04, M(0x1a2a34, { emissive: 0x302810, emissiveIntensity: 0.6 }), 0, 1.25, 0.81);
    box(g, 1.6, 0.06, 0.3, M(0xe8e8e8), 0, 0.85, 0.9);
    label(g, KIOSK_SIGNS[Math.floor(rnd() * KIOSK_SIGNS.length)], '#b81c1c', '#ffe680', 256, 64, 0, 1.88, 0.82, 1.8, 0.42);
    return g;
}

/** Ржавая «горбатая» малолитражка на кирпичах: окна, «уши»-воздухозаборники, круглые фары, арки без колёс; перёд — к −z */
export function createWreck(rnd) {
    const g = new THREE.Group(), cols = [0x9a5a32, 0x7a7048, 0x5f7a70, 0xa8763e, 0x8a8f96];
    const body = M(cols[Math.floor(rnd() * cols.length)]), rust = M(0x6a3418), glass = M(0x26343c, { roughness: 0.4 }), dark = M(0x1a1612), chrome = M(0x8a8a8a, { metalness: 0.5, roughness: 0.5 });
    box(g, 0.96, 0.4, 2.1, body, 0, 0.52, 0);                                // кузов
    const hood = box(g, 0.94, 0.12, 0.62, body, 0, 0.74, -0.72); hood.rotation.x = -0.12; // покатый капот
    box(g, 0.86, 0.4, 1.0, body, 0, 0.92, 0.18);                            // кабина
    box(g, 0.88, 0.24, 0.84, glass, 0, 0.95, 0.18);                         // боковые окна (сквозное стекло)
    box(g, 0.74, 0.26, 0.03, glass, 0, 0.94, -0.33);                        // лобовое
    box(g, 0.7, 0.2, 0.03, glass, 0, 0.95, 0.69);                           // заднее
    box(g, 0.78, 0.07, 0.86, body, 0, 1.15, 0.18);                          // «горб» крыши
    [-1, 1].forEach(function(sd) {
        box(g, 0.08, 0.16, 0.34, body, sd * 0.51, 0.82, 0.58);              // «уши»
        box(g, 0.02, 0.1, 0.24, dark, sd * 0.555, 0.82, 0.58);
        [-0.68, 0.68].forEach(function(z) { box(g, 0.02, 0.26, 0.4, dark, sd * 0.485, 0.38, z); }); // пустые арки
        box(g, 0.02, 0.22, 0.4, rust, sd * 0.485, 0.5, -0.05 + rnd() * 0.3); // ржавчина по борту
    });
    [-0.3, 0.3].forEach(function(x) { const l = cyl(g, 0.08, 0.08, 0.04, M(0xd8d0a0, { emissive: 0x2a2614 }), x, 0.6, -1.06, 10); l.rotation.x = Math.PI / 2; });
    box(g, 1.0, 0.07, 0.07, chrome, 0, 0.36, -1.08);                        // бамперы
    box(g, 1.0, 0.07, 0.07, chrome, 0, 0.36, 1.08);
    box(g, 0.5, 0.18, 0.3, rust, 0.15, 0.73, -0.75);                        // ржавое пятно на капоте
    [[-0.38, -0.68], [0.38, -0.68], [-0.38, 0.68], [0.38, 0.68]].forEach(function(p) { box(g, 0.26, 0.24, 0.18, M(0xa04030), p[0], 0.12, p[1]); }); // кирпичи
    g.rotation.z = 0.04 + rnd() * 0.05;
    return g;
}

/** Бабушка на табурете: пальто, платок, ведро семечек, ящик с банкой огурцов */
export function createGranny(rnd) {
    const g = new THREE.Group();
    const coat = M([0x5a4a3a, 0x3a3a4a, 0x6a3a3a][Math.floor(rnd() * 3)]);
    box(g, 0.4, 0.05, 0.4, M(0x7a5030), 0, 0.45, 0);                      // табурет
    [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].forEach(function(p) { box(g, 0.05, 0.45, 0.05, M(0x7a5030), p[0], 0.22, p[1]); });
    cyl(g, 0.16, 0.3, 0.75, coat, 0, 0.85, 0);                            // пальто
    cyl(g, 0.3, 0.3, 0.3, coat, 0, 0.4, 0.12);                             // подол до земли
    const head = mesh(new THREE.SphereGeometry(0.13, 10, 8), M(0xe8b898)); head.position.set(0, 1.35, 0); g.add(head);
    const scarf = mesh(new THREE.SphereGeometry(0.15, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), M([0xc0392b, 0x2e86c1, 0xd4ac0d][Math.floor(rnd() * 3)]));
    scarf.position.set(0, 1.37, -0.02); g.add(scarf);
    cyl(g, 0.15, 0.12, 0.3, M(0x8a8a90, { metalness: 0.5, roughness: 0.5 }), 0.42, 0.15, 0.25); // ведро
    cyl(g, 0.14, 0.14, 0.02, M(0x2a2620), 0.42, 0.3, 0.25);               // семечки
    box(g, 0.5, 0.35, 0.35, M(0x9a7040), -0.45, 0.18, 0.2);                // ящик
    cyl(g, 0.08, 0.08, 0.22, M(0x8ac070, { transparent: true, opacity: 0.85 }), -0.45, 0.47, 0.2); // банка огурцов
    return g;
}

/** Синий указатель «ГОРОД N км» на двух столбах */
export function createKmSign(text) {
    const g = new THREE.Group(), pole = M(0x9a9aa0, { metalness: 0.4, roughness: 0.5 });
    cyl(g, 0.05, 0.05, 2.4, pole, -0.7, 1.2, -0.09); // столбы — за щитом
    cyl(g, 0.05, 0.05, 2.4, pole, 0.7, 1.2, -0.09);
    box(g, 1.9, 1.0, 0.06, M(0x1c4fa0), 0, 2.0, 0);
    label(g, text, '#1c4fa0', '#ffffff', 256, 128, 0, 2.0, 0.04, 1.8, 0.9, true);
    return g;
}

/**
 * Поставить детали участка в группу g. o: { style, i, z0, len, W, rnd, heightAt, night, snow }
 * Стоят лицом к дороге; камера сзади видит их сбоку и спереди.
 */
export function placeRoadside(g, o) {
    const items = pickRoadside(o.style, o.i, o.rnd, { night: o.night, snow: o.snow });
    items.forEach(function(it) {
        let m;
        if (it.kind === 'stop') m = createBusStop(o.rnd);
        else if (it.kind === 'kiosk') m = createKiosk(o.rnd);
        else if (it.kind === 'wreck') m = createWreck(o.rnd);
        else if (it.kind === 'granny') m = createGranny(o.rnd);
        else m = createKmSign(it.text);
        const x = it.side * (o.W / 2 + sideGap(it.kind)), z = o.z0 - (0.1 + it.dz * 0.8) * o.len;
        m.position.set(x, (o.heightAt ? o.heightAt(x, z) : 0) - 0.03, z);
        // лицом к дороге; указатель — лицом к машине (навстречу)
        m.rotation.y = it.kind === 'sign' ? -0.35 * it.side : (it.side > 0 ? -Math.PI / 2 : Math.PI / 2);
        g.add(m);
    });
    return items;
}
