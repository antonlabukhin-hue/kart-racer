/**
 * Новые участки трассы (раскладка — src/tracks/layouts.json, поле segments):
 *   roadworks — ремонт: одна полоса закрыта блоками, сужение конусами, каток;
 *   fork      — развилка: бетонный разделитель, слева жвачки и масло, справа спокойно;
 *   tunnel    — тоннель: стены, свод, лампы, в нём темно и горят фары.
 * Игрок едет в сторону уменьшения z: z0 — въезд, z0 - len — выезд.
 */
import * as THREE from 'three';
import { createBarricade } from './setpieces.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// статичные детали одного материала склеиваем в один меш: десятки вызовов отрисовки → один
/** Статичный объект: матрицы считаются один раз, а не каждый кадр */
export function freezeStatic(obj) {
    obj.updateMatrixWorld(true);
    obj.traverse(function(o) { o.matrixAutoUpdate = false; o.matrixWorldAutoUpdate = false; });
    return obj;
}
function merged(parts, mat) {
    const m = new THREE.Mesh(mergeGeometries(parts), mat);
    parts.forEach(function(g) { g.dispose(); });
    return m;
}
function at(geo, x, y, z, rx, rz) {
    if (rx) geo.rotateX(rx);
    if (rz) geo.rotateZ(rz);
    return geo.translate(x, y, z);
}

/** Ремонт: полоса laneX закрыта */
export function createRoadworks(laneX, z0, len) {
    const g = new THREE.Group();
    const barriers = [];
    const coneMat = new THREE.MeshLambertMaterial({ color: 0xff6a10, emissive: 0x331000, emissiveIntensity: 0.4 });
    const stripe = new THREE.MeshBasicMaterial({ color: 0xffffff });
    // сужение: конусы по диагонали за 14 ед. до въезда
    const cones = [], bands = [];
    for (let i = 0; i < 6; i++) {
        const t = i / 5;
        const x = laneX + (laneX < 0 ? 1 : -1) * (1 - t) * 0.9;
        const z = z0 + 14 - t * 14;
        cones.push(at(new THREE.ConeGeometry(0.16, 0.5, 10), x, 0.25, z));
        bands.push(at(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 10), x, 0.27, z));
    }
    g.add(merged(cones, coneMat), merged(bands, stripe));
    // свежий асфальт на закрытой полосе
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(1.9, len, 1, Math.ceil(len / 4)), new THREE.MeshLambertMaterial({ color: 0x1c1c20 }));
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(laneX, 0.02, z0 - len / 2);
    g.add(patch);
    for (let z = z0; z > z0 - len; z -= 8) {
        const b = createBarricade(laneX, z);
        g.add(b);
        barriers.push(b);
    }
    // каток посреди ремонта
    const roller = new THREE.Group();
    const yellow = new THREE.MeshLambertMaterial({ color: 0xf2b800 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a2a2e });
    roller.add(
        merged([at(new THREE.BoxGeometry(1.3, 0.8, 1.6), 0, 0.9, 0), at(new THREE.BoxGeometry(1.0, 0.7, 0.8), 0, 1.65, -0.3)], yellow),
        merged([at(new THREE.CylinderGeometry(0.55, 0.55, 1.4, 16), 0, 0.55, 1.0, 0, Math.PI / 2), at(new THREE.CylinderGeometry(0.45, 0.45, 1.3, 16), 0, 0.45, -0.8, 0, Math.PI / 2)], dark)
    );
    roller.position.set(laneX, 0, z0 - len * 0.5 - 2);
    g.add(roller);
    return { group: freezeStatic(g), barriers: barriers };
}

/** Развилка: бетонный разделитель вдоль x = medianX, на въезде — нос с отбойными бочками */
export function createForkMedian(medianX, z0, len) {
    const g = new THREE.Group();
    const concrete = new THREE.MeshLambertMaterial({ color: 0xb8b4aa });
    const yb = new THREE.MeshBasicMaterial({ color: 0xffd400 });
    const bk = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    // отбойник «нью-джерси»: трапеция в сечении, кусками по 8 ед. (гнётся с «кривым миром»)
    const shape = new THREE.Shape();
    shape.moveTo(-0.3, 0); shape.lineTo(0.3, 0); shape.lineTo(0.12, 0.75); shape.lineTo(-0.12, 0.75); shape.closePath();
    const pieces = [];
    for (let z = z0; z > z0 - len; z -= 8) {
        const d = Math.min(8, z - (z0 - len));
        pieces.push(at(new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }), medianX, 0, z - d));
    }
    g.add(merged(pieces, concrete));
    // нос: жёлто-чёрная полосатая стенка и три отбойные бочки
    const ys = [], ks = [];
    for (let i = 0; i < 4; i++) (i % 2 ? ks : ys).push(at(new THREE.BoxGeometry(0.62, 0.18, 0.06), medianX, 0.12 + i * 0.18, z0 + 0.05));
    g.add(merged(ys, yb), merged(ks, bk));
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0xff7a00, emissive: 0x331800, emissiveIntensity: 0.5 });
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const barrels = [], bandsB = [];
    [0.8, 1.7, 2.6].forEach(function(dz) {
        barrels.push(at(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 14), medianX, 0.4, z0 + dz));
        bandsB.push(at(new THREE.CylinderGeometry(0.305, 0.305, 0.12, 14), medianX, 0.55, z0 + dz));
    });
    g.add(merged(barrels, barrelMat), merged(bandsB, white));
    return { group: freezeStatic(g) };
}

/** Тоннель: стены и свод кусками по 10 ед., лампы под сводом, порталы на въезде и выезде */
export function createTunnel(trackWidth, z0, len, style) {
    const g = new THREE.Group();
    const wallCol = style === 'promzona' ? 0x7a3a2a : style === 'snow' ? 0x9aa6b0 : 0x6a6a66;
    const wallMat = new THREE.MeshLambertMaterial({ color: wallCol });
    const ceilMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(wallCol).multiplyScalar(0.6) });
    const lampMat = new THREE.MeshBasicMaterial({ color: style === 'promzona' ? 0xffb050 : 0xfff2c0 });
    const halfW = trackWidth / 2 + 0.7;
    const h = 4.6;
    // куски по 10 ед. нужны «кривому миру» (он гнёт вершины), но рисуются одним мешем на материал
    const walls = [], lamps = [], ceil = [], portals = [];
    for (let z = z0; z > z0 - len; z -= 10) {
        const d = Math.min(10, z - (z0 - len));
        [-1, 1].forEach(function(s) {
            walls.push(at(new THREE.BoxGeometry(0.5, h, d), s * halfW, h / 2, z - d / 2));
            // светящаяся полоса вдоль стены — ориентир в темноте
            lamps.push(at(new THREE.BoxGeometry(0.06, 0.08, d * 0.9), s * (halfW - 0.28), 0.9, z - d / 2));
        });
        ceil.push(at(new THREE.BoxGeometry(halfW * 2 + 0.5, 0.4, d), 0, h + 0.2, z - d / 2));
        lamps.push(at(new THREE.BoxGeometry(1.4, 0.08, 0.5), 0, h - 0.05, z - d / 2));
    }
    const portalMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(wallCol).multiplyScalar(0.8) });
    [z0, z0 - len].forEach(function(pz) {
        portals.push(at(new THREE.BoxGeometry(halfW * 2 + 2.4, 1.2, 1.0), 0, h + 0.8, pz));
        [-1, 1].forEach(function(s) { portals.push(at(new THREE.BoxGeometry(1.2, h + 1.4, 1.0), s * (halfW + 0.6), (h + 1.4) / 2, pz)); });
    });
    g.add(merged(walls, wallMat), merged(lamps, lampMat), merged(ceil, ceilMat), merged(portals, portalMat));
    return { group: freezeStatic(g) };
}

/**
 * Развилка: держать машину по свою сторону разделителя.
 * side — -1 слева, 1 справа; half — полуширина разделителя + полуширина машины.
 * Возвращает { x, scraped } — новая координата и «тёрся о бетон».
 */
export function clampToForkSide(x, medianX, side, half) {
    if (side < 0 && x > medianX - half) return { x: medianX - half, scraped: true };
    if (side > 0 && x < medianX + half) return { x: medianX + half, scraped: true };
    return { x: x, scraped: false };
}

/** Какая полоса закрыта на ремонт (крайняя), по номеру участка */
export function roadworksLane(index, seed) {
    return [0, 2, 0, 2][(index + Math.floor(seed || 0)) % 4];
}

/** Плавное затемнение в тоннеле: k стремится к target со скоростью rate в секунду */
export function approach(k, target, dt, rate) {
    const step = (rate || 3) * dt;
    return k < target ? Math.min(target, k + step) : Math.max(target, k - step);
}
