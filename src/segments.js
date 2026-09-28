/**
 * Новые участки трассы (раскладка — src/tracks/layouts.json, поле segments):
 *   roadworks — ремонт: одна полоса закрыта блоками, сужение конусами, каток;
 *   fork      — развилка: бетонный разделитель, слева жвачки и масло, справа спокойно;
 *   tunnel    — тоннель: стены, свод, лампы, в нём темно и горят фары.
 * Игрок едет в сторону уменьшения z: z0 — въезд, z0 - len — выезд.
 */
import * as THREE from 'three';
import { createBarricade } from './setpieces.js';

/** Ремонт: полоса laneX закрыта */
export function createRoadworks(laneX, z0, len) {
    const g = new THREE.Group();
    const barriers = [];
    const coneMat = new THREE.MeshLambertMaterial({ color: 0xff6a10, emissive: 0x331000, emissiveIntensity: 0.4 });
    const stripe = new THREE.MeshBasicMaterial({ color: 0xffffff });
    // сужение: конусы по диагонали за 14 ед. до въезда
    for (let i = 0; i < 6; i++) {
        const t = i / 5;
        const x = laneX + (laneX < 0 ? 1 : -1) * (1 - t) * 0.9;
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 10), coneMat);
        c.position.set(x, 0.25, z0 + 14 - t * 14);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 10), stripe);
        band.position.y = 0.02;
        c.add(band);
        g.add(c);
    }
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
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 1.6), yellow);
    body.position.y = 0.9;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.8), yellow);
    cab.position.set(0, 1.65, -0.3);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.4, 16), dark);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, 0.55, 1.0);
    const rear = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.3, 16), dark);
    rear.rotation.z = Math.PI / 2;
    rear.position.set(0, 0.45, -0.8);
    roller.add(body, cab, drum, rear);
    roller.position.set(laneX, 0, z0 - len * 0.5 - 2);
    g.add(roller);
    return { group: g, barriers: barriers };
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
    for (let z = z0; z > z0 - len; z -= 8) {
        const d = Math.min(8, z - (z0 - len));
        const piece = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }), concrete);
        piece.position.set(medianX, 0, z - d);
        g.add(piece);
    }
    // нос: жёлто-чёрная полосатая стенка и три отбойные бочки
    for (let i = 0; i < 4; i++) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.06), i % 2 ? bk : yb);
        s.position.set(medianX, 0.12 + i * 0.18, z0 + 0.05);
        g.add(s);
    }
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0xff7a00, emissive: 0x331800, emissiveIntensity: 0.5 });
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [0.8, 1.7, 2.6].forEach(function(dz) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 14), barrelMat);
        b.position.set(medianX, 0.4, z0 + dz);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.305, 0.305, 0.12, 14), white);
        band.position.y = 0.15;
        b.add(band);
        g.add(b);
    });
    return { group: g };
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
    for (let z = z0; z > z0 - len; z -= 10) {
        const d = Math.min(10, z - (z0 - len));
        [-1, 1].forEach(function(s) {
            const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, d), wallMat);
            w.position.set(s * halfW, h / 2, z - d / 2);
            g.add(w);
            // светящаяся полоса вдоль стены — ориентир в темноте
            const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, d * 0.9), lampMat);
            strip.position.set(s * (halfW - 0.28), 0.9, z - d / 2);
            g.add(strip);
        });
        const c = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 0.5, 0.4, d), ceilMat);
        c.position.set(0, h + 0.2, z - d / 2);
        g.add(c);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.5), lampMat);
        lamp.position.set(0, h - 0.05, z - d / 2);
        g.add(lamp);
    }
    const portalMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(wallCol).multiplyScalar(0.8) });
    [z0, z0 - len].forEach(function(pz) {
        const top = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 2.4, 1.2, 1.0), portalMat);
        top.position.set(0, h + 0.8, pz);
        g.add(top);
        [-1, 1].forEach(function(s) {
            const col = new THREE.Mesh(new THREE.BoxGeometry(1.2, h + 1.4, 1.0), portalMat);
            col.position.set(s * (halfW + 0.6), (h + 1.4) / 2, pz);
            g.add(col);
        });
    });
    return { group: g };
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
