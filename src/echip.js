/**
 * Фишка «Е» — железная буква, как в 90-е собирали на улице. Валюта игры и то, что собирается на трассе
 * (вместо звёзд и монет). Геометрия и материалы общие на все фишки: сотни «Е» на трассе — дёшево.
 * createEChip(big) → меш: все «Е» золотые (серые сливались с асфальтом), большая (за прыжок) — ярче и в 1.7 раза крупнее.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let GEO = null;
const MAT = {};

/** Буква «Е»: стойка слева и три перекладины (средняя короче), с фаской-толщиной */
export function eGeometry() {
    if (GEO) return GEO;
    const T = 0.14;          // толщина
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
    const k = big ? 'gold' : 'goldSmall';
    if (!MAT[k]) {
        MAT[k] = big
            ? new THREE.MeshStandardMaterial({ color: 0xffe066, metalness: 0.3, roughness: 0.3, emissive: 0xffb000, emissiveIntensity: 0.75 })
            : new THREE.MeshStandardMaterial({ color: 0xffd84a, metalness: 0.3, roughness: 0.35, emissive: 0xffa800, emissiveIntensity: 0.55 }); // без карты отражений металл тёмный — золото светится само
    }
    return MAT[k];
}

let GLOW = null;
/** Ореол большой «Е» (как был у звезды) — видно издалека, что за прыжок награда */
export function eGlow() {
    if (!GLOW) { GLOW = { geo: new THREE.SphereGeometry(0.62, 12, 8), mat: new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3, depthWrite: false }) }; GLOW.geo.userData.keep = true; }
    return new THREE.Mesh(GLOW.geo, GLOW.mat);
}

export function createEChip(big) {
    const m = new THREE.Mesh(eGeometry(), eMaterial(big));
    m.scale.setScalar(chipScale(big)); // на 10% меньше прежнего — не загораживают дорогу
    m.castShadow = false;
    return m;
}

/** Масштаб фишки (как у createEChip) */
export function chipScale(big) { return (big ? 1.7 : 1.15) * 0.9; }

/**
 * Все «Е» заезда — одним вызовом отрисовки (InstancedMesh) вместо сотни: на трассе их 200+, каждая была своим мешем.
 * chip(big) → «держатель» (Object3D без отрисовки): логика двигает, крутит и прячет его как раньше,
 * а перед каждым кадром (scene.onBeforeRender — уже после пересчёта матриц) видимые держатели копируются в экземпляры.
 * Держатель, убранный из сцены, забывается сам.
 */
export function createEChipBatch(scene, cap) {
    cap = cap || 700;
    const kinds = [false, true].map(function(big) {
        const im = new THREE.InstancedMesh(eGeometry(), eMaterial(big), big ? 64 : cap);
        im.frustumCulled = false; // экземпляры по всей трассе — одна общая проверка не нужна
        im.count = 0;
        im.userData.dynamic = true;
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(im);
        return { im: im, max: big ? 64 : cap, set: new Set() };
    });
    function inScene(o) {
        let x = o;
        while (x) { if (!x.visible) return 0; if (x === scene) return 1; x = x.parent; }
        return -1; // вне сцены
    }
    function sync() {
        kinds.forEach(function(k) {
            let n = 0;
            k.set.forEach(function(o) {
                const s = inScene(o);
                if (s < 0) { if (o.userData.seen) k.set.delete(o); return; }
                o.userData.seen = true;
                if (s && n < k.max) k.im.setMatrixAt(n++, o.matrixWorld);
            });
            k.im.count = n;
            k.im.instanceMatrix.needsUpdate = true;
        });
    }
    const prev = scene.onBeforeRender;
    scene.onBeforeRender = function(r, s, c, t) { if (prev) prev.call(this, r, s, c, t); sync(); };
    return {
        chip: function(big) {
            const o = new THREE.Object3D();
            o.scale.setScalar(chipScale(big));
            o.userData.noCull = true; // не уносить в участки src/chunk-cull.js — у держателя нет геометрии
            kinds[big ? 1 : 0].set.add(o);
            return o;
        },
        sync: sync,
        get count() { return kinds[0].im.count + kinds[1].im.count; }
    };
}
