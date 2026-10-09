/**
 * Модели безумного транспорта (src/rides.js) — детальные, «вау»: игрок видит их крупно 10 секунд.
 *   трактор-таран — красный «Беларус»-монстр: решётка с хромом, круглые фары, кабина с рамой и стёклами,
 *                    люстра фар и оранжевый маячок, шины с грунтозацепами, крылья, гидравлика, отвал с «зеброй»;
 *   самосвал      — жёлтый карьерный гигант: шины в рост человека, площадка с перилами и лестницей, кабина сбоку,
 *                    козырёк кузова, рёбра бортов, полный кузов золотых «Е»;
 *   кукурузник    — биплан: звездообразный мотор, трёхлопастный винт, крылья со стойками и растяжками,
 *                    ряд иллюминаторов, хвост с рулями, шасси с обтекателями, бортовой номер.
 * Перёд — к −z. userData.anim(dt) — маячки, винт; userData.exhaust — точки выхлопа (локальные).
 */
import * as THREE from 'three';
import { mergeCarParts } from './merge-static.js';
import { eGeometry, eMaterial } from './echip.js';

const mats = {};
function M(hex, o) { const k = hex + (o ? JSON.stringify(o) : ''); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.55, metalness: 0.15 }, o || {}))); }
const CHROME = function() { return M(0xe4e8ee, { metalness: 0.35, roughness: 0.22 }); };
const RUBBER = function() { return M(0x141416, { roughness: 0.95, metalness: 0 }); };
const DARK = function() { return M(0x26282c, { roughness: 0.7 }); };
const GLASS = function() { return M(0x2a4058, { roughness: 0.08, metalness: 0.6 }); };
const LAMP = function(hex) { return M(hex || 0xfff4d0, { emissive: hex || 0xfff0c0, emissiveIntensity: 0.9, roughness: 0.2 }); };

function box(g, w, h, d, m, x, y, z, rx, ry, rz) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z); if (rx) b.rotation.x = rx; if (ry) b.rotation.y = ry; if (rz) b.rotation.z = rz;
    g.add(b); return b;
}
/** Цилиндр; axis 'x' — ось поперёк машины (колёса, фары-«бочки»), 'z' — вдоль, иначе — вертикальный */
function cyl(g, r0, r1, h, seg, m, x, y, z, axis) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg || 12), m);
    c.position.set(x, y, z);
    if (axis === 'x') c.rotation.z = Math.PI / 2; else if (axis === 'z') c.rotation.x = Math.PI / 2;
    g.add(c); return c;
}
/** Шина с грунтозацепами «ёлочкой», диск с болтами и колпаком. side — ±1 (наружная сторона) */
function tire(g, r, w, x, y, z, rimHex, lugs, side) {
    cyl(g, r * 0.93, r * 0.93, w, 24, RUBBER(), x, y, z, 'x');
    const n = lugs || 18;
    for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        [-1, 1].forEach(function(h) { // две половинки «ёлочки» со сдвигом
            const aa = a + h * 0.06;
            box(g, w * 0.48, r * 0.14, r * 0.2, RUBBER(), x + h * w * 0.25, y + Math.sin(aa) * r * 0.96, z + Math.cos(aa) * r * 0.96, Math.PI / 2 - aa, h * 0.45, 0); // «ёлочка»
        });
    }
    const s = side || Math.sign(x) || 1;
    cyl(g, r * 0.6, r * 0.6, w + 0.02, 18, M(rimHex, { metalness: 0.4, roughness: 0.35 }), x, y, z, 'x');
    cyl(g, r * 0.22, r * 0.28, w * 0.3, 12, CHROME(), x + s * (w / 2 + 0.03), y, z, 'x');
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; cyl(g, r * 0.05, r * 0.05, 0.05, 6, CHROME(), x + s * (w / 2 + 0.01), y + Math.sin(a) * r * 0.4, z + Math.cos(a) * r * 0.4, 'x'); }
}
/** Крыло над колесом — дуга из сегментов */
function fender(g, r, w, x, y, z, m, from, to) {
    const n = 7, a0 = from == null ? Math.PI * 0.08 : from, a1 = to == null ? Math.PI * 0.92 : to;
    for (let i = 0; i < n; i++) {
        const a = a0 + (a1 - a0) * (i + 0.5) / n, len = r * (a1 - a0) / n * 1.15;
        box(g, w, 0.05, len, m, x, y + Math.sin(a) * r, z - Math.cos(a) * r, a - Math.PI / 2);
    }
}
function beacon(g, x, y, z, hex) {
    const m = new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 1.2, roughness: 0.2, transparent: true, opacity: 0.92 });
    cyl(g, 0.11, 0.13, 0.06, 12, DARK(), x, y, z);
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), m); d.position.set(x, y + 0.03, z); g.add(d);
    return m;
}
/** Шеврон «зебра» жёлто-чёрный (канвас); в тестах — просто жёлтый */
let chevMat = null;
function CHEV() {
    if (chevMat) return chevMat;
    if (typeof document === 'undefined') return (chevMat = M(0xf2b81a));
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 32;
    const c = cv.getContext('2d'); c.fillStyle = '#f2b81a'; c.fillRect(0, 0, 128, 32); c.fillStyle = '#1a1a1a';
    for (let x = -32; x < 160; x += 24) { c.beginPath(); c.moveTo(x, 32); c.lineTo(x + 12, 32); c.lineTo(x + 28, 0); c.lineTo(x + 16, 0); c.fill(); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    return (chevMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));
}
function plate(g, text, x, y, z, w) {
    if (typeof document === 'undefined') { box(g, w || 0.42, 0.11, 0.02, M(0xf2f2ee), x, y, z); return; }
    const l = label(text, '#f4f4ee', '#111111', w || 0.42, 0.11); l.position.set(x, y, z + 0.012); g.add(l);
    box(g, (w || 0.42) + 0.03, 0.14, 0.02, DARK(), x, y, z);
}
function label(text, bg, fg, w, h) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    const c = cv.getContext('2d'); c.fillStyle = bg; c.fillRect(0, 0, 256, 64);
    c.fillStyle = fg; c.font = 'bold 40px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 128, 34, 240);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));
}

/* ======================= трактор-таран ======================= */
function tractor() {
    const g = new THREE.Group(), red = M(0xd8281e, { roughness: 0.32, metalness: 0.35 }), dark = DARK(), yel = M(0xf2b81a, { roughness: 0.35, metalness: 0.3 });
    // рама и моторный отсек
    box(g, 0.62, 0.22, 2.6, dark, 0, 0.62, -0.2);
    box(g, 0.78, 0.6, 1.55, red, 0, 1.02, -0.62);                          // капот
    box(g, 0.8, 0.06, 1.58, red, 0, 1.33, -0.62);                          // крышка капота с кантом
    for (let i = 0; i < 5; i++) [-1, 1].forEach(function(s) { box(g, 0.02, 0.06, 0.5, dark, s * 0.4, 0.85 + i * 0.09, -0.5); }); // жалюзи по бокам
    // решётка: хромовая рамка и планки, круглые фары, поворотники
    box(g, 0.8, 0.62, 0.05, CHROME(), 0, 1.02, -1.42);
    for (let i = 0; i < 6; i++) box(g, 0.66, 0.035, 0.06, dark, 0, 0.78 + i * 0.09, -1.43);
    [-0.28, 0.28].forEach(function(x) { cyl(g, 0.11, 0.11, 0.08, 16, CHROME(), x, 1.42, -1.38, 'z'); cyl(g, 0.085, 0.085, 0.09, 16, LAMP(), x, 1.42, -1.38, 'z'); });
    [-0.36, 0.36].forEach(function(x) { box(g, 0.08, 0.06, 0.04, LAMP(0xffa020), x, 0.68, -1.44); });
    // выхлопная труба с изгибом и крышкой
    cyl(g, 0.06, 0.06, 1.1, 10, CHROME(), 0.26, 1.85, -0.85);
    cyl(g, 0.075, 0.06, 0.12, 10, DARK(), 0.26, 2.42, -0.85);
    box(g, 0.16, 0.02, 0.16, CHROME(), 0.26, 2.5, -0.85, 0.3);
    // кабина: рама, стёкла, крыша с люстрой и маячком
    const cz = 0.62;
    box(g, 1.16, 0.25, 1.05, red, 0, 1.32, cz);                            // низ кабины
    [[-0.56, -0.5], [0.56, -0.5], [-0.56, 0.5], [0.56, 0.5]].forEach(function(p) { box(g, 0.07, 0.95, 0.07, red, p[0], 1.92, cz + p[1]); });
    box(g, 1.04, 0.85, 0.02, GLASS(), 0, 1.9, cz - 0.52);                  // лобовое
    box(g, 1.04, 0.85, 0.02, GLASS(), 0, 1.9, cz + 0.52);                  // заднее
    [-1, 1].forEach(function(s) { box(g, 0.02, 0.85, 0.96, GLASS(), s * 0.57, 1.9, cz); box(g, 0.02, 0.04, 0.96, red, s * 0.575, 1.9, cz); }); // боковые + поперечина
    box(g, 1.3, 0.1, 1.25, red, 0, 2.42, cz);                              // крыша с козырьком
    box(g, 1.2, 0.03, 1.15, M(0xf2f2ee), 0, 2.48, cz);                     // белая полоса крыши
    box(g, 0.9, 0.08, 0.1, dark, 0, 2.52, cz - 0.6);                       // люстра
    for (let i = 0; i < 4; i++) cyl(g, 0.05, 0.05, 0.05, 10, LAMP(), -0.33 + i * 0.22, 2.52, cz - 0.66, 'z');
    const bA = beacon(g, -0.42, 2.47, cz + 0.4, 0xff8a10), bB = beacon(g, 0.42, 2.47, cz + 0.4, 0xff8a10);
    [-1, 1].forEach(function(s) { box(g, 0.25, 0.03, 0.03, dark, s * 0.7, 2.1, cz - 0.5); box(g, 0.04, 0.16, 0.1, CHROME(), s * 0.84, 2.1, cz - 0.5); }); // зеркала
    box(g, 0.3, 0.05, 0.2, dark, 0.66, 0.95, cz - 0.2); box(g, 0.3, 0.05, 0.2, dark, 0.66, 0.65, cz - 0.2); // ступеньки
    cyl(g, 0.18, 0.18, 0.55, 14, M(0x3a3a40, { metalness: 0.5 }), -0.62, 1.0, -0.2, 'z');                  // бак
    // колёса: задние — огромные, передние — поменьше; крылья
    tire(g, 0.8, 0.5, -0.92, 0.8, cz, 0xf2b81a, 22); tire(g, 0.8, 0.5, 0.92, 0.8, cz, 0xf2b81a, 22);
    fender(g, 0.88, 0.56, -0.92, 0.8, cz, red); fender(g, 0.88, 0.56, 0.92, 0.8, cz, red);
    tire(g, 0.44, 0.3, -0.66, 0.44, -1.05, 0xf2b81a, 14); tire(g, 0.44, 0.3, 0.66, 0.44, -1.05, 0xf2b81a, 14);
    fender(g, 0.5, 0.34, -0.66, 0.44, -1.05, red, 0.35, 2.6); fender(g, 0.5, 0.34, 0.66, 0.44, -1.05, red, 0.35, 2.6);
    // отвал: изогнутый лист, рёбра, нож, «зебра» по кромке, гидроцилиндры
    for (let i = 0; i < 6; i++) { const a = -0.55 + i * 0.22; box(g, 2.3, 0.2, 0.08, yel, 0, 0.3 + i * 0.17, -1.95 + Math.sin(a) * 0.12 - 0.05, a * 0.6); }
    box(g, 2.36, 0.08, 0.14, CHROME(), 0, 0.17, -2.0);                    // нож
    for (let i = 0; i < 10; i++) box(g, 0.235, 0.12, 0.04, i % 2 ? dark : yel, -1.06 + i * 0.235, 1.28, -1.92);  // «зебра»
    [-0.8, -0.27, 0.27, 0.8].forEach(function(x) { box(g, 0.06, 1.05, 0.12, yel, x, 0.75, -1.86); }); // рёбра
    [-0.45, 0.45].forEach(function(x) {
        cyl(g, 0.07, 0.07, 0.75, 10, dark, x, 0.75, -1.45, 'z');          // гидроцилиндр
        cyl(g, 0.035, 0.035, 0.5, 8, CHROME(), x, 0.75, -1.75, 'z');      // шток
    });
    // зад (его игрок видит всё время): рама заднего стекла, рабочие фары, навеска, шеврон, номер, фонари на крыльях
    box(g, 1.04, 0.05, 0.03, red, 0, 1.9, cz + 0.54); box(g, 0.05, 0.85, 0.03, red, 0, 1.9, cz + 0.54);       // рама стекла крестом
    box(g, 0.5, 0.06, 0.05, dark, 0, 1.55, cz + 0.55);                                                         // дворник
    [-0.36, 0.36].forEach(function(x) { box(g, 0.2, 0.12, 0.08, dark, x, 2.36, cz + 0.62); box(g, 0.16, 0.08, 0.02, LAMP(), x, 2.36, cz + 0.665); }); // рабочие фары на крыше
    box(g, 0.98, 0.32, 0.05, CHEV(), 0, 1.06, cz + 0.6);                                                       // «зебра» на заднем щите
    plate(g, 'ТАРАН 01', 0, 0.82, cz + 0.62, 0.46);
    [-1, 1].forEach(function(sd) {
        box(g, 0.16, 0.12, 0.05, LAMP(0xff2010), sd * 0.92, 1.62, cz + 0.86); box(g, 0.08, 0.12, 0.05, LAMP(0xffa020), sd * 0.78, 1.62, cz + 0.86); // фонари на крыльях
        box(g, 0.08, 0.08, 0.7, dark, sd * 0.3, 0.55, cz + 0.85, 0.15);                                         // нижние тяги навески
        box(g, 0.48, 0.32, 0.04, RUBBER(), sd * 0.92, 0.3, cz + 0.55);                                          // брызговики
    });
    cyl(g, 0.04, 0.04, 0.6, 8, CHROME(), 0, 0.95, cz + 0.85, 'z');                                              // верхняя тяга
    cyl(g, 0.06, 0.06, 0.25, 10, M(0xf2b81a), 0, 0.68, cz + 0.68, 'z');                                         // вал отбора мощности
    box(g, 0.66, 0.08, 0.1, dark, 0, 0.5, cz + 1.18);                                                           // поперечина навески
    const anim = makeAnim([bA, bB], 3.5);
    return finish(g, anim, [{ x: 0.26, y: 2.55, z: -0.85 }]);
}

/* ======================= карьерный самосвал ======================= */
function dumper() {
    const g = new THREE.Group(), yel = M(0xf2b01a, { roughness: 0.33, metalness: 0.3 }), dark = DARK(), steel = M(0x8a8c90, { metalness: 0.5, roughness: 0.4 });
    // колёса — 6 гигантских
    [-1.15, 0.6, 1.5].forEach(function(z, i) { [-1, 1].forEach(function(s) { tire(g, 0.72, 0.5, s * (i ? 0.95 : 0.98), 0.72, z, 0xe8c040, 22); }); });
    // рама и передняя площадка
    box(g, 1.3, 0.35, 3.6, dark, 0, 0.95, 0.2);
    box(g, 2.3, 0.08, 0.95, steel, 0, 1.6, -1.25);                        // площадка
    for (let i = 0; i < 9; i++) box(g, 0.04, 0.45, 0.04, yel, -1.1 + i * 0.275, 1.85, -1.7);  // стойки перил
    box(g, 2.25, 0.04, 0.04, yel, 0, 2.08, -1.7);                          // поручень
    for (let i = 0; i < 5; i++) box(g, 0.45, 0.04, 0.1, steel, -1.05, 0.55 + i * 0.22, -1.72 + i * 0.08, -0.35); // лестница
    // решётка радиатора и фары
    box(g, 1.3, 0.85, 0.06, dark, 0, 1.15, -1.72);
    for (let i = 0; i < 7; i++) box(g, 1.2, 0.04, 0.07, CHROME(), 0, 0.8 + i * 0.11, -1.74);
    for (let i = 0; i < 6; i++) cyl(g, 0.07, 0.07, 0.06, 12, LAMP(), -0.95 + i * 0.38, 1.68, -1.73, 'z');   // ряд фар на площадке
    // кабина слева на площадке
    box(g, 0.95, 0.85, 0.85, yel, -0.6, 2.08, -1.15);
    box(g, 0.97, 0.45, 0.02, GLASS(), -0.6, 2.2, -1.58);
    box(g, 0.02, 0.45, 0.7, GLASS(), -1.08, 2.2, -1.15); box(g, 0.02, 0.45, 0.7, GLASS(), -0.12, 2.2, -1.15);
    box(g, 1.05, 0.06, 0.95, dark, -0.6, 2.53, -1.15);
    const bA = beacon(g, -0.85, 2.58, -1.1, 0xff8a10), bB = beacon(g, -0.35, 2.58, -1.1, 0xff8a10);
    [-1, 1].forEach(function(s) { box(g, 0.04, 0.04, 0.6, dark, s * 1.15, 2.1, -1.55); box(g, 0.06, 0.25, 0.14, CHROME(), s * 1.18, 2.1, -1.85); }); // зеркала на штангах
    cyl(g, 0.07, 0.07, 1.1, 10, CHROME(), 0.75, 2.1, -1.0); cyl(g, 0.07, 0.07, 1.1, 10, CHROME(), 0.95, 2.1, -1.0); // две трубы
    // кузов: днище, борта с рёбрами, козырёк над кабиной, наклонный зад
    box(g, 2.3, 0.12, 2.7, yel, 0, 1.45, 0.65);
    [-1, 1].forEach(function(s) {
        box(g, 0.1, 1.1, 2.7, yel, s * 1.12, 2.0, 0.65);
        for (let i = 0; i < 5; i++) box(g, 0.08, 1.05, 0.1, dark, s * 1.19, 1.98, -0.5 + i * 0.58); // рёбра
        box(g, 0.14, 0.1, 2.75, dark, s * 1.15, 2.55, 0.65);                                          // кант
    });
    box(g, 2.3, 1.1, 0.1, yel, 0, 2.0, -0.7);                              // передний борт
    box(g, 2.4, 0.08, 1.0, yel, 0, 2.62, -1.15, -0.12);                    // козырёк над кабиной
    box(g, 2.3, 1.1, 0.1, yel, 0, 2.0, 1.98);                              // задний борт
    for (let i = 0; i < 4; i++) box(g, 0.1, 1.05, 0.08, dark, -0.75 + i * 0.5, 2.0, 2.05); // рёбра заднего борта
    box(g, 2.35, 0.1, 0.12, dark, 0, 2.55, 2.0);                           // кант
    // гора золотых «Е»: насыпь и буквы торчат
    box(g, 2.1, 0.5, 2.4, M(0xd8a020, { emissive: 0x7a5000, emissiveIntensity: 0.5, roughness: 0.4, metalness: 0.5 }), 0, 2.2, 0.6);
    const eg = eGeometry(), em = eMaterial(true);
    for (let i = 0; i < 14; i++) {
        const e = new THREE.Mesh(eg, em);
        e.position.set(-0.85 + (i % 5) * 0.42 + (i % 2) * 0.1, 2.55 + (i % 3) * 0.08, -0.25 + Math.floor(i / 5) * 0.8);
        e.rotation.set((i * 0.7) % 1 - 0.5, i * 1.3, (i * 0.9) % 0.8 - 0.4); e.scale.setScalar(0.9);
        g.add(e);
    }
    // зад: шеврон, два ряда фонарей, номер, брызговики, задняя лестница
    box(g, 1.3, 0.3, 0.05, CHEV(), 0, 1.0, 1.93);
    [-1, 1].forEach(function(sd) {
        [0, 1].forEach(function(r) { box(g, 0.24, 0.13, 0.05, LAMP(r ? 0xffa020 : 0xff2010), sd * (0.42 + r * 0.26), 1.32, 1.93); });
        box(g, 0.55, 0.45, 0.04, RUBBER(), sd * 0.95, 0.42, 2.0);
    });
    plate(g, 'Е 777 ЕЕ', 0, 0.75, 1.94, 0.5);
    for (let i = 0; i < 4; i++) box(g, 0.32, 0.04, 0.08, steel, 0.55, 0.6 + i * 0.22, 1.98);
    [0.4, 0.7].forEach(function(x) { box(g, 0.04, 0.9, 0.04, steel, x, 0.92, 1.98); });
    const anim = makeAnim([bA, bB], 3);
    return finish(g, anim, [{ x: 0.75, y: 2.7, z: -1.0 }, { x: 0.95, y: 2.7, z: -1.0 }]);
}

/* ======================= кукурузник ======================= */
function plane() {
    const g = new THREE.Group();
    const skin = M(0xeef1f4, { roughness: 0.35, metalness: 0.2 }), blue = M(0x2a5ab8, { roughness: 0.35 }), red = M(0xd8281e, { roughness: 0.35 }), dark = DARK();
    // фюзеляж: сужается к хвосту
    const secs = [[-1.0, 0.62, 0.66], [-0.3, 0.66, 0.72], [0.6, 0.6, 0.66], [1.4, 0.46, 0.5], [2.1, 0.3, 0.36], [2.7, 0.18, 0.24]];
    for (let i = 0; i < secs.length - 1; i++) {
        const a = secs[i], b = secs[i + 1], len = b[0] - a[0];
        const geo = new THREE.CylinderGeometry(b[1], a[1], len, 12); geo.rotateX(Math.PI / 2);
        const s = new THREE.Mesh(geo, skin); s.position.set(0, 1.05 + (0.66 - (a[2] + b[2]) / 2) * 0.4, (a[0] + b[0]) / 2); s.scale.y = (a[2] + b[2]) / (a[1] + b[1]); g.add(s);
    }
    box(g, 0.05, 0.12, 3.4, blue, -0.66, 1.0, 0.7); box(g, 0.05, 0.12, 3.4, blue, 0.66, 1.0, 0.7);   // полоса по борту
    // кабина: остекление и иллюминаторы
    box(g, 0.9, 0.35, 0.5, GLASS(), 0, 1.65, -0.95, -0.5);
    [-1, 1].forEach(function(s) {
        box(g, 0.02, 0.28, 0.42, GLASS(), s * 0.6, 1.5, -0.85);
        for (let i = 0; i < 5; i++) cyl(g, 0.09, 0.09, 0.03, 12, GLASS(), s * 0.665, 1.25, -0.05 + i * 0.32, 'x');
    });
    // мотор: капот-кольцо, цилиндры звездой, кок, винт
    cyl(g, 0.62, 0.66, 0.55, 18, dark, 0, 1.05, -1.3, 'z');
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; cyl(g, 0.08, 0.08, 0.32, 8, steel(), Math.cos(a) * 0.45, 1.05 + Math.sin(a) * 0.45, -1.58, 'z'); }
    const prop = new THREE.Group(); prop.position.set(0, 1.05, -1.72); g.add(prop);
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.35, 14), red); spinner.rotation.x = -Math.PI / 2; spinner.position.z = -0.12; prop.add(spinner);
    for (let i = 0; i < 3; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.05, 0.04), M(0x2a2a2c, { roughness: 0.4 })); bl.position.set(Math.cos(i * 2.094) * 0.55, Math.sin(i * 2.094) * 0.55, 0); bl.rotation.z = i * 2.094 - Math.PI / 2; prop.add(bl);
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.05), M(0xf2c81a)); tip.position.set(Math.cos(i * 2.094) * 1.02, Math.sin(i * 2.094) * 1.02, 0); tip.rotation.z = bl.rotation.z; prop.add(tip); }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), new THREE.MeshBasicMaterial({ color: 0x9aa0a8, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
    prop.add(disc);
    prop.traverse(function(o) { if (o.isMesh) o.userData.noMerge = true; });
    // крылья: верхнее длиннее, концы красные, стойки и растяжки
    const wing = function(span, y, z) {
        box(g, span, 0.09, 1.05, skin, 0, y, z);
        box(g, span, 0.03, 0.12, M(0xb8bec4, { metalness: 0.5 }), 0, y + 0.06, z - 0.47); // передняя кромка
        [-1, 1].forEach(function(s) { box(g, 0.5, 0.1, 1.06, red, s * (span / 2 - 0.25), y, z); });
        for (let i = 1; i < 6; i++) box(g, 0.02, 0.1, 1.0, M(0xc8cdd2, { metalness: 0.5 }), -span / 2 + i * span / 6, y + 0.01, z); // нервюры
    };
    wing(6.4, 2.05, -0.55); wing(5.2, 0.62, -0.45);
    [-1, 1].forEach(function(s) {
        [-0.85, -0.25].forEach(function(dz) { box(g, 0.06, 1.42, 0.08, dark, s * 2.0, 1.34, dz); });       // I-стойки
        box(g, 0.025, 1.9, 0.025, dark, s * 1.4, 1.34, -0.55, 0, 0, s * 0.62);                              // растяжки крест-накрест
        box(g, 0.025, 1.9, 0.025, dark, s * 1.4, 1.34, -0.55, 0, 0, -s * 0.62);
        box(g, 0.05, 0.75, 0.06, dark, s * 0.55, 1.6, -0.6, 0, 0, s * 0.35);                                // стойка к фюзеляжу
    });
    // хвост: стабилизатор, киль, рули
    box(g, 2.2, 0.06, 0.62, skin, 0, 1.25, 2.55); box(g, 2.2, 0.06, 0.2, red, 0, 1.25, 2.95);
    box(g, 0.06, 1.05, 0.75, skin, 0, 1.75, 2.62); box(g, 0.065, 0.45, 0.4, red, 0, 2.1, 2.85);
    [-1, 1].forEach(function(s) { box(g, 0.02, 0.6, 0.02, dark, s * 0.55, 1.0, 2.5, 0, 0, s * 0.6); });
    // шасси: стойки, колёса с обтекателями, хвостовое колесо
    [-1, 1].forEach(function(s) {
        box(g, 0.07, 0.8, 0.07, dark, s * 0.85, 0.58, -0.6, 0, 0, -s * 0.35);
        box(g, 0.06, 0.65, 0.06, dark, s * 0.75, 0.55, -0.25, 0.4);
        cyl(g, 0.3, 0.3, 0.2, 18, RUBBER(), s * 1.0, 0.3, -0.55, 'x'); cyl(g, 0.15, 0.15, 0.22, 12, CHROME(), s * 1.0, 0.3, -0.55, 'x');
        box(g, 0.24, 0.22, 0.6, skin, s * 1.0, 0.55, -0.55);               // обтекатель
    });
    cyl(g, 0.1, 0.1, 0.08, 12, RUBBER(), 0, 0.55, 2.55, 'x');
    box(g, 0.1, 0.1, 0.06, LAMP(), 0, 1.75, 3.0); // хвостовой огонь
    [-1, 1].forEach(function(sd) { box(g, 0.12, 0.08, 0.12, LAMP(sd < 0 ? 0xff2020 : 0x20e040), sd * 3.2, 2.05, -0.55); }); // навигационные огни на концах крыла
    // бортовой номер
    if (typeof document !== 'undefined') [-1, 1].forEach(function(s) { const l = label('СССР-07052', '#d8dde2', '#1a2a5a', 1.1, 0.27); l.position.set(s * 0.6, 0.78, 1.3); l.rotation.y = s * Math.PI / 2 + (s < 0 ? Math.PI : 0); l.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(l); });
    const bA = beacon(g, 0, 2.12, 0.1, 0xff2020);
    const anim = makeAnim([bA], 2, prop);
    return finish(g, anim, [{ x: -0.55, y: 1.1, z: -1.15 }, { x: 0.55, y: 1.1, z: -1.15 }]);
}
function steel() { return M(0x8a8c90, { metalness: 0.6, roughness: 0.35 }); }

/** Маячки мигают по очереди; винт крутится */
function makeAnim(beacons, hz, prop) {
    let t = 0;
    return function(dt) {
        t += dt;
        beacons.forEach(function(m, i) { const on = Math.sin(t * hz * Math.PI * 2 + i * Math.PI) > 0; m.emissiveIntensity = on ? 2.2 : 0.15; });
        if (prop) prop.rotation.z += dt * 55;
    };
}
function finish(g, anim, exhaust) {
    try { mergeCarParts(g, { all: true }); } catch (e) {}
    g.traverse(function(o) { if (o.isMesh) { o.castShadow = true; } });
    g.userData.anim = anim;
    g.userData.exhaust = exhaust || [];
    return g;
}

export const RIDE_MODELS = { tractor: tractor, dumper: dumper, plane: plane };
