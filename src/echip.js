/**
 * Фишка «Е» — железная буква, как в 90-е собирали на улице. Валюта игры и то, что собирается на трассе
 * (вместо звёзд и монет). Геометрия и материалы общие на все фишки: сотни «Е» на трассе — дёшево.
 * createEChip(big) → меш: обычная — сталь, большая (за прыжок) — золото, в 1.7 раза крупнее.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let GEO = null;
const MAT = {};

/** Буква «Е»: стойка слева и три перекладины (средняя короче), с фаской-толщиной */
export function eGeometry() {
    if (GEO) return GEO;
    const T = 0.09;          // толщина
    const H = 0.62, W = 0.42, B = 0.12; // высота, ширина, толщина штриха
    const box = function(w, h, x, y) { const g = new THREE.BoxGeometry(w, h, T); g.translate(x, y, 0); return g; };
    GEO = mergeGeometries([
        box(B, H, -W / 2 + B / 2, 0),              // стойка
        box(W, B, 0, H / 2 - B / 2),               // верх
        box(W * 0.78, B, -W * 0.11, 0),            // середина
        box(W, B, 0, -H / 2 + B / 2)               // низ
    ]);
    GEO.computeBoundingSphere();
    GEO.userData.keep = true; // одна на все фишки — src/inf-world.js disposeTree её не трогает
    return GEO;
}

export function eMaterial(big) {
    const k = big ? 'gold' : 'steel';
    if (!MAT[k]) {
        MAT[k] = big
            ? new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: 0.9, roughness: 0.25, emissive: 0x6a4200, emissiveIntensity: 0.55 })
            : new THREE.MeshStandardMaterial({ color: 0xd8dce4, metalness: 0.85, roughness: 0.28, emissive: 0x303844, emissiveIntensity: 0.45 });
    }
    return MAT[k];
}

export function createEChip(big) {
    const m = new THREE.Mesh(eGeometry(), eMaterial(big));
    if (big) m.scale.setScalar(1.7);
    m.castShadow = false;
    return m;
}
