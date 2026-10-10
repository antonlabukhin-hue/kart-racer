/**
 * Модели попуток: седан, внедорожник, фургон-«буханка», грузовик с бортами, автобус, мотоцикл с мотоциклистом.
 * Перёд — к −z. Сзади у машин ровно два стоп-сигнала (у мотоцикла — один), номер, бампер.
 * buildTraffic(kind, color, o) → { group, hitW, hitL, rearY } — габариты для столкновений как раньше.
 * Материалы — общие по цвету; дальше main.js склеивает детали (mergeCarParts) и делит материалы.
 */
import * as THREE from 'three';

export const KINDS = ['sedan', 'sedan', 'truck', 'bus', 'moto', 'van', 'suv'];
/** Габариты для столкновений (как были): ширина, длина */
/** Высокие — выше прыжка с места (пик ~1.1, у «Горбатого» ~1.5): перепрыгнуть можно только легковые */
export const TALL_H = { truck: 1.55, bus: 1.5 };
/** Прыжок с места перелетает попутку kind на высоте y? (с трамплина — перелетает всё, как раньше) */
export function hopClears(kind, y) { return !TALL_H[kind] || y > TALL_H[kind]; }
export const HIT = { moto: [0.44, 1.21], truck: [0.95, 2.2], bus: [1.0, 2.6], van: [0.85, 1.7], suv: [0.9, 1.6], sedan: [0.8, 1.45] };

const mats = {};
function M(hex, o) {
    const k = hex + (o ? JSON.stringify(o) : '');
    if (!mats[k]) mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.6, metalness: 0.1 }, o || {}));
    return mats[k];
}
const B = function(hex) { if (!mats['b' + hex]) mats['b' + hex] = new THREE.MeshBasicMaterial({ color: hex }); return mats['b' + hex]; };
const GLASS = function() { return M(0x1c2a36, { roughness: 0.15, metalness: 0.5 }); };
const TIRE = function() { return M(0x141414, { roughness: 0.95 }); };
const CHROME = function() { return M(0xdfe3e8, { metalness: 0.25, roughness: 0.3 }); }; // светлый: металлу без карты отражений нечего отражать
const DARK = function() { return M(0x1e1e22, { roughness: 0.8 }); };

function box(g, w, h, d, mat, x, y, z, rx) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    g.add(m);
    return m;
}
function wheel(g, r, w, x, y, z) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 12), TIRE());
    t.rotation.z = Math.PI / 2; t.position.set(x, y, z); g.add(t);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.01, 10), CHROME());
    hub.rotation.z = Math.PI / 2; hub.position.set(x + Math.sign(x) * 0.005, y, z); g.add(hub);
}
/** Два стоп-сигнала, номер и бампер сзади (rz — задняя плоскость) */
function rear(g, w, y, rz, opt) {
    opt = opt || {};
    const lw = opt.lw || 0.15, lh = opt.lh || 0.08;
    [-1, 1].forEach(function(s) {
        box(g, lw, lh, 0.03, B(0xff1a10), s * (w / 2 - lw / 2 - 0.03), y, rz);
        if (opt.amber) box(g, lw * 0.45, lh, 0.03, B(0xff9a1a), s * (w / 2 - lw - 0.05), y, rz);
    });
    box(g, 0.2, 0.06, 0.02, B(0xf2f2ee), 0, opt.plateY || y - 0.09, rz + 0.005);
    if (!opt.noBumper) box(g, w + 0.04, 0.05, 0.06, opt.bumper || CHROME(), 0, opt.bumperY || y - 0.14, rz);
}
/** Фары спереди: dark — ночь/дождь (ярче) */
function front(g, w, y, fz, dark, opt) {
    opt = opt || {};
    const mat = B(dark ? 0xfffbe6 : 0xd8d4b8);
    [-1, 1].forEach(function(s) { box(g, opt.lw || 0.13, opt.lh || 0.07, 0.03, mat, s * (w / 2 - (opt.lw || 0.13) / 2 - 0.04), y, fz); });
    if (opt.grille !== false) box(g, w * 0.42, opt.gh || 0.07, 0.025, DARK(), 0, y, fz + 0.003);
    if (!opt.noBumper) box(g, w + 0.04, 0.05, 0.06, opt.bumper || CHROME(), 0, opt.bumperY || y - 0.11, fz);
}
function mirrors(g, w, y, z) { [-1, 1].forEach(function(s) { box(g, 0.05, 0.05, 0.07, DARK(), s * (w / 2 + 0.04), y, z); }); }

const builders = {
    sedan: function(g, body, dark) {
        // три объёма: капот, салон, багажник; стёкла наклонные
        box(g, 0.8, 0.24, 1.42, body, 0, 0.24, 0);
        box(g, 0.66, 0.22, 0.6, body, 0, 0.47, 0.06);                     // крыша-салон
        box(g, 0.67, 0.14, 0.5, GLASS(), 0, 0.47, 0.06);                   // боковые стёкла
        box(g, 0.62, 0.03, 0.22, GLASS(), 0, 0.49, -0.27, -1.06);          // лобовое — от капота к крыше
        box(g, 0.62, 0.03, 0.22, GLASS(), 0, 0.49, 0.41, 1.06);            // заднее — от крыши к багажнику
        box(g, 0.78, 0.04, 0.4, body, 0, 0.38, -0.5);                      // капот
        [[-0.38, -0.48], [0.38, -0.48], [-0.38, 0.48], [0.38, 0.48]].forEach(function(p) { wheel(g, 0.11, 0.09, p[0], 0.11, p[1]); });
        front(g, 0.8, 0.27, -0.715, dark);
        rear(g, 0.8, 0.28, 0.715, { amber: true });
        mirrors(g, 0.66, 0.4, -0.22);
    },
    suv: function(g, body, dark) {
        // «внедорожник»: высокий, короткие свесы, чёрные расширители арок, багажник на крыше
        box(g, 0.9, 0.42, 1.5, body, 0, 0.37, 0);
        box(g, 0.84, 0.36, 0.95, body, 0, 0.76, 0.08);
        box(g, 0.85, 0.22, 0.85, GLASS(), 0, 0.78, 0.08);
        box(g, 0.76, 0.24, 0.03, GLASS(), 0, 0.78, -0.41);
        box(g, 0.72, 0.2, 0.03, GLASS(), 0, 0.8, 0.56);
        box(g, 0.7, 0.05, 0.7, DARK(), 0, 0.97, 0.1);                       // багажник на крыше
        [[-0.42, -0.5], [0.42, -0.5], [-0.42, 0.52], [0.42, 0.52]].forEach(function(p) {
            wheel(g, 0.16, 0.12, p[0], 0.16, p[1]);
            box(g, 0.05, 0.08, 0.38, DARK(), p[0] + Math.sign(p[0]) * 0.03, 0.33, p[1]); // расширитель арки
        });
        front(g, 0.9, 0.42, -0.755, dark, { lw: 0.12, lh: 0.1 });
        rear(g, 0.9, 0.42, 0.755, { lw: 0.08, lh: 0.16 });
        mirrors(g, 0.84, 0.72, -0.3);
    },
    van: function(g, body, dark) {
        // фургон-«буханка»: высокий кузов, разделённое лобовое, окна по бокам, белая полоса
        box(g, 0.85, 0.7, 1.6, body, 0, 0.5, 0);
        box(g, 0.83, 0.06, 1.55, M(0xece8dc), 0, 0.88, 0);                  // крыша светлая
        [-0.17, 0.17].forEach(function(x) { box(g, 0.32, 0.24, 0.03, GLASS(), x, 0.66, -0.805); });
        [-1, 1].forEach(function(s) { [-0.35, 0.05, 0.45].forEach(function(z) { box(g, 0.02, 0.2, 0.3, GLASS(), s * 0.43, 0.68, z); }); });
        [-0.16, 0.16].forEach(function(x) { box(g, 0.26, 0.2, 0.03, GLASS(), x, 0.68, 0.805); }); // задние двери
        box(g, 0.02, 0.5, 0.02, DARK(), 0, 0.55, 0.81);                    // шов задних дверей
        [[-0.38, -0.55], [0.38, -0.55], [-0.38, 0.55], [0.38, 0.55]].forEach(function(p) { wheel(g, 0.13, 0.1, p[0], 0.13, p[1]); });
        front(g, 0.85, 0.36, -0.805, dark, { lw: 0.1, lh: 0.1 });
        rear(g, 0.85, 0.36, 0.805, { lw: 0.08, lh: 0.12 });
        mirrors(g, 0.85, 0.66, -0.7);
    },
    truck: function(g, body, dark) {
        // грузовик с высоким тентом: выше прыжка — перепрыгнуть можно только легковые (TALL_H)
        box(g, 0.9, 0.75, 0.7, body, 0, 0.6, -0.72);
        box(g, 0.72, 0.3, 0.03, GLASS(), 0, 0.8, -1.075);
        [-1, 1].forEach(function(s) { box(g, 0.02, 0.26, 0.36, GLASS(), s * 0.455, 0.8, -0.72); });
        box(g, 0.94, 0.08, 1.4, M(0x3a3a3a), 0, 0.26, 0.3);                // рама
        const tent = M([0x3a5a7a, 0x4a5a3a, 0x8a3a2a, 0xc8b890][body.color.getHex() % 4], { roughness: 0.95 }); // тент — синий, хаки, бордо или песочный
        box(g, 0.98, 1.2, 1.36, tent, 0, 0.95, 0.32);                      // тент до 1.55
        [-0.2, 0.32, 0.84].forEach(function(z) { box(g, 1.0, 0.04, 0.05, DARK(), 0, 1.53, z); }); // дуги каркаса
        [-1, 1].forEach(function(s) { box(g, 0.01, 0.06, 1.3, M(0xd8d0b0), s * 0.495, 0.42, 0.32); }); // стяжка тента
        box(g, 0.02, 1.1, 0.02, DARK(), 0, 0.95, 1.005);                   // шов задних створок
        [[-0.4, -0.72], [0.4, -0.72], [-0.4, 0.15], [0.4, 0.15], [-0.4, 0.62], [0.4, 0.62]].forEach(function(p) { wheel(g, 0.15, 0.12, p[0], 0.15, p[1]); });
        front(g, 0.9, 0.36, -1.075, dark, { gh: 0.14 });
        rear(g, 0.95, 0.3, 1.0, { lw: 0.12, lh: 0.07, bumper: DARK() });
        mirrors(g, 0.9, 0.82, -0.9);
    },
    bus: function(g, body, dark) {
        // автобус: высокий — цветной низ, светлый верх, сплошная полоса окон, дверь, большое лобовое
        box(g, 1.0, 0.6, 2.5, body, 0, 0.45, 0);
        box(g, 1.0, 0.7, 2.5, M(0xece8dc), 0, 1.1, 0);
        box(g, 0.96, 0.06, 2.4, M(0xd8d4c8), 0, 1.48, 0);                  // крыша
        [-1, 1].forEach(function(s) { box(g, 0.02, 0.4, 2.1, GLASS(), s * 0.505, 1.08, 0.05); });
        box(g, 0.02, 0.8, 0.3, GLASS(), 0.51, 0.75, -0.85);                 // дверь справа
        box(g, 0.88, 0.6, 0.03, GLASS(), 0, 1.0, -1.255);                   // лобовое
        box(g, 0.8, 0.4, 0.03, GLASS(), 0, 1.1, 1.255);                     // заднее
        box(g, 0.5, 0.1, 0.03, M(0x222222), 0, 1.38, -1.258);               // табличка маршрута
        [[-0.42, -0.85], [0.42, -0.85], [-0.42, 0.85], [0.42, 0.85]].forEach(function(p) { wheel(g, 0.16, 0.12, p[0], 0.16, p[1]); });
        front(g, 1.0, 0.36, -1.255, dark, { lw: 0.14 });
        rear(g, 1.0, 0.4, 1.255, { lw: 0.1, lh: 0.14 });
        mirrors(g, 1.0, 1.0, -1.15);
    },
    moto: function(g, body, dark) {
        // мотоцикл с мотоциклистом в шлеме; сзади — один фонарь
        box(g, 0.24, 0.16, 0.9, body, 0, 0.3, 0);
        const tank = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), body); tank.scale.set(1, 0.7, 1.4); tank.position.set(0, 0.42, -0.12); g.add(tank);
        box(g, 0.2, 0.07, 0.34, DARK(), 0, 0.42, 0.18);                    // сиденье
        box(g, 0.4, 0.03, 0.03, CHROME(), 0, 0.58, -0.36);                 // руль
        wheel(g, 0.15, 0.08, 0.001, 0.15, 0.4); wheel(g, 0.15, 0.08, 0.001, 0.15, -0.42);
        // мотоциклист
        const jacket = M(0x2a2a30);
        box(g, 0.26, 0.32, 0.18, jacket, 0, 0.62, 0.08, -0.35);            // спина
        [-1, 1].forEach(function(s) { box(g, 0.07, 0.07, 0.3, jacket, s * 0.15, 0.6, -0.12, 0.3); }); // руки
        const helm = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), M(0xf2f2f2, { roughness: 0.3, metalness: 0.2 })); helm.position.set(0, 0.86, -0.04); g.add(helm);
        box(g, 0.14, 0.05, 0.02, GLASS(), 0, 0.86, -0.15);                 // визор
        box(g, 0.1, 0.06, 0.03, B(0xff1a10), 0, 0.38, 0.46);               // один стоп-сигнал
        box(g, 0.12, 0.05, 0.02, B(0xf2f2ee), 0, 0.3, 0.47);               // номер
        box(g, 0.1, 0.08, 0.03, B(dark ? 0xfffbe6 : 0xd8d4b8), 0, 0.5, -0.47); // фара
    }
};

/** kind — из KINDS, color — цвет кузова, o: { dark } (ночь/дождь — фары ярче) */
export function buildTraffic(kind, color, o) {
    o = o || {};
    const g = new THREE.Group();
    const k = builders[kind] ? kind : 'sedan';
    builders[k](g, M(color, { roughness: 0.35, metalness: 0.45 }), !!o.dark);
    g.traverse(function(m) { if (m.isMesh) m.castShadow = true; });
    const hit = HIT[k];
    if (k === 'moto') g.scale.setScalar(1.1); // мотоциклы — на 10% крупнее, заметнее
    return { group: g, hitW: hit[0], hitL: hit[1], rearY: k === 'moto' ? 0.38 : 0.28 };
}

/** Сколько стоп-сигналов сзади (красных деталей на задней плоскости) — для проверки в тестах */
export function brakeLights(group) {
    let n = 0;
    group.traverse(function(m) { if (m.isMesh && m.material.isMeshBasicMaterial && m.material.color.getHex() === 0xff1a10) n++; });
    return n;
}
