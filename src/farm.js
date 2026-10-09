/**
 * Поле у деревни: пашня бороздами или пшеница по рельефу, стога по краю, и техника за работой —
 * синий трактор с плугом или зелёный комбайн, которые ездят по полю туда-обратно.
 * Поле — статичный меш (склеится и «заморозится» с участком), техника — отдельные движущиеся объекты.
 * hasField / fieldSide — чистая логика (с тестами).
 */
import * as THREE from 'three';
import { mergeCarParts } from './merge-static.js';

export const FIELD_X0 = 7, FIELD_X1 = 26; // от края дороги, ед.: сразу за штакетником (избы с этой стороны не ставятся)

/** Поле на участке i деревни — через участок; сторона чередуется */
export function hasField(i, style) { return style === 'village' && i >= 2 && i % 2 === 0; }
export function fieldSide(i) { return (i / 2) % 2 ? 1 : -1; }
/** Пшеница или пашня (комбайн или трактор) */
export function fieldKind(i) { return (i / 2) % 3 === 1 ? 'wheat' : 'plow'; }

const mats = {};
function M(hex, o) {
    const k = hex + (o ? JSON.stringify(o) : '');
    if (!mats[k]) mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.85, metalness: 0.05 }, o || {}));
    return mats[k];
}
function box(g, w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; }
function wheel(g, r, w, x, y, z, hub) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14), M(0x161616, { roughness: 0.95 })); t.rotation.z = Math.PI / 2; t.position.set(x, y, z); g.add(t);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, w + 0.02, 10), M(hub)); h.rotation.z = Math.PI / 2; h.position.set(x, y, z); g.add(h);
}

/** Поле: борозды полосами вдоль z, по высоте рельефа; heightAt(x, z) — высота земли */
export function createField(side, z0, len, W, kind, heightAt) {
    const g = new THREE.Group();
    const hA = heightAt || function() { return 0; };
    const x0 = W / 2 + FIELD_X0, x1 = W / 2 + FIELD_X1, rows = 12, seg = 6;
    const cols = kind === 'wheat' ? [0xd8b84a, 0xc8a83e] : [0x5a3e26, 0x6e4c30];
    for (let rI = 0; rI < rows; rI++) {
        const x = side * (x0 + (rI + 0.5) * (x1 - x0) / rows), w = (x1 - x0) / rows * 0.92;
        for (let z = z0 - 1; z > z0 - len + 1; z -= seg) {
            const zc = z - seg / 2, y = hA(x, zc);
            box(g, w, kind === 'wheat' ? 0.5 : 0.14, seg + 0.05, M(cols[rI % 2]), x, y + (kind === 'wheat' ? 0.2 : 0.02), zc);
        }
    }
    // стога сена по краю поля
    for (let k = 0; k < 3; k++) {
        const x = side * (x0 - 1.5), z = z0 - 8 - k * 18, y = hA(x, z);
        const hay = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 1.1, 1.6, 8), M(0xc8a85a)); hay.position.set(x, y + 0.8, z); g.add(hay);
    }
    return g;
}

/** Трактор с плугом (перёд — к −z) */
export function createTractor() {
    const g = new THREE.Group();
    const blue = M(0x2a5ab8), red = M(0xc83a2a), dark = M(0x222428), glass = M(0x1c2a36, { roughness: 0.2 });
    box(g, 0.6, 0.45, 1.4, blue, 0, 0.75, -0.25);                 // капот-моторный отсек
    box(g, 0.9, 0.9, 0.85, blue, 0, 1.25, 0.55);                  // кабина
    box(g, 0.92, 0.6, 0.7, glass, 0, 1.4, 0.55);                  // стёкла
    box(g, 0.98, 0.06, 0.95, blue, 0, 1.72, 0.55);                // крыша
    box(g, 0.08, 0.6, 0.08, dark, 0.2, 1.3, -0.6);                // выхлопная труба
    box(g, 0.62, 0.12, 0.05, M(0xd8d4c8), 0, 0.85, -0.96);        // решётка
    wheel(g, 0.62, 0.38, -0.62, 0.62, 0.55, 0xc83a2a); wheel(g, 0.62, 0.38, 0.62, 0.62, 0.55, 0xc83a2a); // задние большие
    wheel(g, 0.34, 0.24, -0.45, 0.34, -0.7, 0xc83a2a); wheel(g, 0.34, 0.24, 0.45, 0.34, -0.7, 0xc83a2a);  // передние
    box(g, 1.2, 0.12, 0.3, red, 0, 0.35, 1.4);                    // плуг: рама
    [-0.4, 0, 0.4].forEach(function(x) { box(g, 0.12, 0.35, 0.3, dark, x, 0.2, 1.55); }); // лемеха
    g.userData.dust = { y: 0.2, z: 1.6 };
    try { mergeCarParts(g, { all: true }); } catch (e) {}
    return g;
}

/** Комбайн: жатка с мотовилом спереди, кабина, бункер, выгрузной шнек (перёд — к −z) */
export function createCombine() {
    const g = new THREE.Group();
    const green = M(0x3a8a3a), red = M(0xc83a2a), dark = M(0x222428), glass = M(0x1c2a36, { roughness: 0.2 }), yel = M(0xe8c040);
    box(g, 1.5, 1.3, 2.4, green, 0, 1.25, 0.3);                    // корпус
    box(g, 1.0, 0.8, 0.8, glass, 0, 2.2, -0.6);                    // кабина
    box(g, 1.1, 0.08, 0.9, green, 0, 2.64, -0.6);
    box(g, 1.3, 0.6, 1.2, green, 0, 2.15, 0.7);                    // бункер
    box(g, 0.18, 0.18, 1.8, yel, 0.85, 2.3, 0.9);                  // шнек
    box(g, 2.9, 0.4, 0.7, red, 0, 0.45, -1.4);                     // жатка
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.8, 10), yel); reel.rotation.z = Math.PI / 2; reel.position.set(0, 0.95, -1.5); g.add(reel);
    wheel(g, 0.7, 0.4, -0.85, 0.7, -0.3, 0xe8c040); wheel(g, 0.7, 0.4, 0.85, 0.7, -0.3, 0xe8c040);
    wheel(g, 0.42, 0.3, -0.7, 0.42, 1.25, 0xe8c040); wheel(g, 0.42, 0.3, 0.7, 0.42, 1.25, 0xe8c040);
    box(g, 0.1, 0.7, 0.1, dark, -0.5, 2.2, 1.2);                   // труба
    try { mergeCarParts(g, { all: true }); } catch (e) {}
    return g;
}

/**
 * Техника на поле: едет вдоль борозд (по z) туда-обратно, разворачиваясь в конце поля.
 * update(playerZ, now) — каждый кадр (как у поезда, src/railway.js); heightAt — по рельефу.
 */
export function createFarmWork(scene, side, z0, len, W, kind, heightAt) {
    const m = kind === 'wheat' ? createCombine() : createTractor();
    const hA = heightAt || function() { return 0; };
    const x = side * (W / 2 + FIELD_X0 + 3 + Math.random() * (FIELD_X1 - FIELD_X0 - 6));
    const zA = z0 - 6, zB = z0 - len + 6, v = kind === 'wheat' ? 2.2 : 3;
    let z = zA - Math.random() * (zA - zB), dir = -1, t = 0, last = 0;
    m.userData.dynamic = true;
    scene.add(m);
    return {
        mesh: m,
        update: function(playerZ, now) {
            const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now; t += dt;
            z += dir * v * dt;
            if (z < zB) { z = zB; dir = 1; } else if (z > zA) { z = zA; dir = -1; }
            m.position.set(x, hA(x, z) + Math.sin(t * 9) * 0.02, z); // чуть потряхивает на кочках
            m.rotation.y = dir < 0 ? 0 : Math.PI;
        },
        dispose: function() { scene.remove(m); }
    };
}
