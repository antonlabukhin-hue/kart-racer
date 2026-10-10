/**
 * Листопад и ветер (пейзаж «Деревня» и осенний Арсеньев): листья кружатся вокруг машины, ветер сносит их вбок,
 * встречный поток — назад, к камере. Одна отрисовка (InstancedMesh из маленьких пластинок), листья не падают сквозь дорогу:
 * упавший переносится вверх, в облако вокруг игрока. update(dt, x, z, speed01) — каждый кадр; visible — по пейзажу.
 * Чистая часть (сдвиг листа с ветром и кувырком) — с тестами.
 */
import * as THREE from 'three';

export const LEAF_FALL = 1.6;   // ед./с вниз
export const WIND = 2.2;        // ед./с вбок (порывами)
const COLORS = [0xe0a030, 0xd06a20, 0xb84a18, 0xe8c040, 0x9a6a2a];

/** Сдвиг листа за кадр: [dx, dy, dz]; t — время (порывы ветра), ph — фаза листа */
export function leafStep(dt, speed01, t, ph) {
    const gust = 0.6 + 0.4 * Math.sin(t * 0.7 + ph * 0.3);
    const back = 3 + 24 * Math.max(0, Math.min(1, speed01 || 0));
    return [(WIND * gust + Math.sin(t * 3 + ph) * 0.8) * dt, (-LEAF_FALL + Math.sin(t * 2.3 + ph) * 0.6) * dt, back * dt];
}

export function createLeaves(scene, opts) {
    const o = opts || {};
    const count = o.count || 60, W = o.width || 24, D = o.depth || 50, H = o.height || 7;
    const geo = new THREE.PlaneGeometry(0.16, 0.11);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.frustumCulled = false;
    mesh.userData.dynamic = true; // не «статика»: заморозка сцены и куски-чанки его не трогают
    mesh.visible = false;
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) mesh.setColorAt(i, c.setHex(COLORS[i % COLORS.length]));
    scene.add(mesh);
    const p = new Float32Array(count * 4); // x, y, z, фаза
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    const place = function(i, x, z, anyY) {
        p[i * 4] = x - W * 0.6 + Math.random() * W; // ветер дует вправо — новые листья чаще слева
        p[i * 4 + 1] = anyY ? Math.random() * H : H * (0.6 + Math.random() * 0.4);
        p[i * 4 + 2] = z - D * 0.7 + Math.random() * D;
        p[i * 4 + 3] = Math.random() * 10;
    };
    let ready = false, t = 0;
    return {
        mesh: mesh,
        get visible() { return mesh.visible; },
        set visible(on) { mesh.visible = !!on; },
        update: function(dt, x, z, speed01) {
            if (!mesh.visible) return;
            if (!ready) { for (let i = 0; i < count; i++) place(i, x, z, true); ready = true; }
            const d = Math.min(dt, 0.05);
            t += d;
            for (let i = 0; i < count; i++) {
                const i4 = i * 4, ph = p[i4 + 3], st = leafStep(d, speed01, t, ph);
                p[i4] += st[0]; p[i4 + 1] += st[1]; p[i4 + 2] += st[2];
                if (p[i4 + 1] < 0.05 || p[i4 + 2] > z + D * 0.3 || p[i4 + 2] < z - D || Math.abs(p[i4] - x) > W) place(i, x, z, false);
                e.set(t * 2.1 + ph, t * 1.3 + ph * 2, t * 1.7); q.setFromEuler(e);
                m4.compose(v.set(p[i4], p[i4 + 1], p[i4 + 2]), q, s);
                mesh.setMatrixAt(i, m4);
            }
            mesh.instanceMatrix.needsUpdate = true;
        }
    };
}
