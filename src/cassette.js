/**
 * Видеокассета VHS — редкая валюта: 1–3 за длинный заезд бесконечной трассы, изредка на обычных трассах
 * и в сундуках. Только за кассеты — уникальная машина. Материалы общие, геометрия — одна на все кассеты.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let GEO = null;
const MAT = {};

function geos() {
    if (GEO) return GEO;
    const box = function(w, h, d, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
    const reel = function(x) { const g = new THREE.CylinderGeometry(0.075, 0.075, 0.13, 12); g.rotateX(Math.PI / 2); g.translate(x, 0.02, 0); return g; };
    GEO = {
        body: box(0.74, 0.44, 0.1, 0, 0, 0),
        label: box(0.5, 0.13, 0.11, 0, 0.12, 0),       // белая наклейка сверху
        window: box(0.36, 0.13, 0.108, 0, 0.02, 0),     // тёмное окошко с катушками
        reels: mergeGeometries([reel(-0.11), reel(0.11)]),
        glow: new THREE.SphereGeometry(0.55, 12, 8)
    };
    Object.keys(GEO).forEach(function(k) { GEO[k].userData.keep = true; }); // общая: при уборке позади не освобождается
    return GEO;
}
function mat(key, opts) {
    if (!MAT[key]) MAT[key] = new THREE.MeshStandardMaterial(opts);
    return MAT[key];
}

/** Кассета стоймя, лицом к машине, в фиолетовом ореоле — видно издалека */
export function createCassette() {
    const g = geos();
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(g.body, mat('body', { color: 0x1a1a1e, roughness: 0.45, metalness: 0.2, emissive: 0x2a1040, emissiveIntensity: 0.6 })));
    grp.add(new THREE.Mesh(g.label, mat('label', { color: 0xfff4d8, roughness: 0.6, emissive: 0x6a5a30, emissiveIntensity: 0.35 })));
    grp.add(new THREE.Mesh(g.window, mat('win', { color: 0x333a48, roughness: 0.2, metalness: 0.5 })));
    grp.add(new THREE.Mesh(g.reels, mat('reel', { color: 0xeeeeee, roughness: 0.4 })));
    grp.add(new THREE.Mesh(g.glow, mat('glow', { color: 0xc060ff, transparent: true, opacity: 0.12, depthWrite: false, emissive: 0x9030ff, emissiveIntensity: 1 })));
    grp.scale.setScalar(1.3);
    return grp;
}
