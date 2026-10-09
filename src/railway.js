/**
 * Железная дорога над трассой: бетонный мост на опорах с рельсами и контактной сетью
 * и поезд — электричка или товарняк, — который проходит над дорогой ровно тогда, когда под мостом едет игрок.
 * Чистая логика (где мост, когда трогается поезд) — с тестами; меши — простые коробки с общими материалами.
 * Перёд трассы — к −z; мост поперёк дороги (вдоль x).
 */
import * as THREE from 'three';
import { mergeCarParts } from './merge-static.js';

export const BRIDGE_SPAN = 62;      // половина длины моста по x
export const DECK_Y = 3.6;          // низ пролёта над дорогой
export const BRIDGE_EVERY = 11;     // мост — раз в 11 участков (≈660 ед.)
const BRIDGE_STYLES = ['arsenev', 'city', 'industrial', 'village', 'forest'];

/** Есть ли мост на участке i пейзажа style (не на самом старте — там учимся) */
export function hasBridge(i, style) {
    return i >= 6 && i % BRIDGE_EVERY === 7 && BRIDGE_STYLES.indexOf(style) >= 0;
}

/**
 * Когда трогать поезд: игрок в dist ед. до моста едет со скоростью vp (ед./с); поезд — vt ед./с, длина L.
 * Возвращает x головы поезда в момент старта так, чтобы середина состава была над дорогой, когда игрок под мостом.
 * dir — направление движения поезда (+1 / −1).
 */
export function trainStartX(dist, vp, vt, L, dir) {
    const t = Math.max(0.5, dist / Math.max(1, vp));
    return -dir * (vt * t - L / 2);
}

const mats = {};
function M(hex, o) {
    const k = hex + (o ? JSON.stringify(o) : '');
    if (!mats[k]) mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.85, metalness: 0.05 }, o || {}));
    return mats[k];
}
function box(g, w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
}

/** Мост через дорогу в точке z (статичные части — их склеит и «заморозит» участок) */
export function createBridge(z, W) {
    const g = new THREE.Group();
    const conc = M(0xa8a29a), dark = M(0x5a5650), rail = M(0x8a8c90, { metalness: 0.4, roughness: 0.5 }), sleeper = M(0x4a3a2a);
    const L = BRIDGE_SPAN * 2;
    box(g, L, 0.6, 3.2, conc, 0, DECK_Y + 0.3, z);                         // пролёт
    box(g, L, 0.12, 3.3, dark, 0, DECK_Y + 0.06, z);                       // нижний пояс
    [-1, 1].forEach(function(s) {
        box(g, L, 0.5, 0.15, conc, 0, DECK_Y + 0.85, z + s * 1.55);       // ограждение
        box(g, L, 0.06, 0.06, rail, 0, DECK_Y + 0.66, z + s * 0.45);       // рельсы
    });
    for (let x = -BRIDGE_SPAN + 0.5; x < BRIDGE_SPAN; x += 0.9) box(g, 0.25, 0.08, 1.4, sleeper, x, DECK_Y + 0.62, z); // шпалы
    // опоры: у самой обочины и дальше через равные шаги
    [W / 2 + 1.2, 16, 30, 46].forEach(function(px) { [-1, 1].forEach(function(s) {
        box(g, 0.9, DECK_Y, 2.2, conc, s * px, DECK_Y / 2, z);
        box(g, 1.3, 0.3, 2.6, conc, s * px, DECK_Y - 0.15, z);               // оголовок
    }); });
    // контактная сеть: столбы и провод
    for (let x = -BRIDGE_SPAN + 6; x < BRIDGE_SPAN; x += 12) {
        box(g, 0.14, 2.6, 0.14, dark, x, DECK_Y + 1.9, z - 1.45);
        box(g, 0.08, 0.08, 1.5, dark, x, DECK_Y + 3.1, z - 0.75);           // консоль
    }
    box(g, L, 0.03, 0.03, dark, 0, DECK_Y + 3.0, z);                       // провод
    // таблички «Ж/Д» на пролёте над дорогой
    [-1, 1].forEach(function(s) { box(g, 1.6, 0.36, 0.04, M(0xf0f0e8), 0, DECK_Y + 0.3, z + s * 1.62); });
    try { mergeCarParts(g, { all: true }); } catch (e) {} // ~300 шпал, опор и консолей → несколько мешей по материалам
    return g;
}

/** Состав: 'elektrichka' — зелёные вагоны с жёлтой «мордой»; 'freight' — тепловоз, цистерны, вагоны, платформы с лесом */
export function createTrain(kind, rnd) {
    const g = new THREE.Group();
    const r = rnd || Math.random;
    const cars = [];
    const glass = M(0x1c2a36, { roughness: 0.2, metalness: 0.4 }), roof = M(0x8a8a86), under = M(0x2a2a2a);
    let x = 0;
    const car = function(len, build) { const c = new THREE.Group(); build(c, len); c.position.x = x + len / 2; g.add(c); x += len + 0.35; cars.push(c); };
    if (kind === 'elektrichka') {
        const body = M(0x3d7a52), stripe = M(0xd8c060), face = M(0xe8b830), red = M(0xc83a2a);
        for (let i = 0; i < 5; i++) car(9, function(c, len) {
            box(c, len, 1.9, 2.0, body, 0, 1.25, 0);
            box(c, len, 0.12, 2.02, stripe, 0, 0.75, 0);                    // полоса
            box(c, len - 0.4, 0.3, 1.9, roof, 0, 2.32, 0);                   // крыша
            box(c, len, 0.4, 1.8, under, 0, 0.2, 0);                         // тележки
            for (let w = -len / 2 + 1; w < len / 2 - 0.6; w += 1.15) [-1, 1].forEach(function(s) { box(c, 0.75, 0.45, 0.04, glass, w, 1.55, s * 1.01); }); // окна
            [-1, 1].forEach(function(s) { box(c, 0.7, 1.2, 0.05, M(0x2a5a3a), -len / 2 + 1.1, 1.05, s * 1.02); box(c, 0.7, 1.2, 0.05, M(0x2a5a3a), len / 2 - 1.1, 1.05, s * 1.02); }); // двери
            if (i === 0 || i === 4) { // «морда» головного и хвостового вагона
                const end = i === 0 ? -1 : 1;
                box(c, 0.08, 1.9, 2.02, face, end * len / 2, 1.25, 0);
                box(c, 0.1, 0.5, 1.4, glass, end * (len / 2 + 0.02), 1.7, 0);
                box(c, 0.1, 0.25, 1.8, red, end * (len / 2 + 0.02), 0.75, 0);
                [-0.6, 0.6].forEach(function(zz) { box(c, 0.1, 0.14, 0.22, M(0xfff4c0), end * (len / 2 + 0.04), 1.05, zz); }); // фары
            }
            if (i === 1) { box(c, 1.6, 0.06, 0.06, under, 0, 2.95, 0); box(c, 0.06, 0.55, 0.06, under, 0, 2.7, 0); } // пантограф
        });
    } else {
        const loco = M(0x8a2a22), locoB = M(0xd8c060);
        car(8, function(c, len) { // тепловоз
            box(c, len, 1.8, 1.9, loco, 0, 1.3, 0); box(c, len, 0.15, 1.92, locoB, 0, 0.6, 0);
            box(c, 1.6, 0.6, 1.8, glass, -len / 2 + 0.9, 1.75, 0);
            box(c, len, 0.4, 1.7, under, 0, 0.2, 0);
            [-0.55, 0.55].forEach(function(zz) { box(c, 0.1, 0.16, 0.24, M(0xfff4c0), -len / 2 - 0.02, 1.0, zz); });
        });
        const n = 5 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) {
            const t = r();
            if (t < 0.4) car(7, function(c, len) { // цистерна
                const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, len - 0.4, 12), M(0x1e1e22, { roughness: 0.5 })); tank.rotation.z = Math.PI / 2; tank.position.y = 1.35; c.add(tank);
                box(c, len, 0.35, 1.7, under, 0, 0.3, 0); box(c, 0.5, 0.3, 0.5, M(0x1e1e22), 0, 2.3, 0);
            });
            else if (t < 0.75) car(7.5, function(c, len) { // крытый вагон
                const col = [0x7a3a26, 0x5a4a3a, 0x6a2a20][Math.floor(r() * 3)];
                box(c, len, 1.9, 1.95, M(col), 0, 1.3, 0); box(c, len, 0.35, 1.7, under, 0, 0.2, 0);
                [-1, 1].forEach(function(s) { box(c, 1.4, 1.5, 0.04, M(0x3a2a1e), 0, 1.25, s * 0.99); });
            });
            else car(7, function(c, len) { // платформа с лесом
                box(c, len, 0.25, 1.95, under, 0, 0.45, 0);
                for (let k = 0; k < 6; k++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, len - 0.6, 8), M(0x8a6a42)); lg.rotation.z = Math.PI / 2; lg.position.set(0, 0.8 + Math.floor(k / 3) * 0.42, -0.5 + (k % 3) * 0.5); c.add(lg); }
            });
        }
    }
    g.userData.length = x;
    // «морда» — в x = 0, состав тянется к +x; детали склеиваются по материалам (~125 → ~12 вызовов отрисовки)
    try { mergeCarParts(g, { all: true }); } catch (e) {}
    return g;
}

/**
 * Поезд на мосту: update(playerZ, now) каждый кадр. Трогается, когда игрок в TRIGGER ед. до моста,
 * и проходит над дорогой, когда игрок под мостом. Вне моста состав не рисуется.
 */
export const TRIGGER = 170;
export function createBridgeTrain(scene, z, rnd) {
    const r = rnd || Math.random;
    const kind = r() < 0.55 ? 'elektrichka' : 'freight';
    const train = createTrain(kind, r);
    const L = train.userData.length, vt = kind === 'elektrichka' ? 30 : 22, dir = r() < 0.5 ? 1 : -1;
    if (dir > 0) train.rotation.y = Math.PI; // состав построен «мордой» к −x: едет в +x — разворачиваем
    train.position.set(0, DECK_Y + 0.6, z);
    train.visible = false;
    train.userData.dynamic = true;
    scene.add(train);
    let state = 'wait', lastZ = null, lastT = 0, vp = 18, head = 0;
    return {
        train: train, kind: kind,
        update: function(playerZ, now) {
            if (lastZ != null && now > lastT) { const v = (lastZ - playerZ) / ((now - lastT) / 1000); if (v > 1 && v < 200) vp += (v - vp) * 0.1; }
            lastZ = playerZ; lastT = now;
            const dist = playerZ - z;
            if (state === 'wait' && dist < TRIGGER && dist > 20) { state = 'go'; head = trainStartX(dist, vp, vt, L, dir); this._t = now; }
            if (state !== 'go') return;
            const dt = Math.min(0.1, (now - (this._t || now)) / 1000); this._t = now;
            head += dir * vt * dt;
            // голова в head, хвост — позади (против хода): состав виден, пока касается моста
            const tail = head - dir * L;
            train.position.x = head;
            train.visible = Math.max(head, tail) > -BRIDGE_SPAN && Math.min(head, tail) < BRIDGE_SPAN;
            if (dir * tail > BRIDGE_SPAN + 5) { state = 'done'; train.visible = false; }
        },
        dispose: function() { scene.remove(train); }
    };
}
