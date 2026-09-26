/**
 * Зимний декор трасс (этап C).
 * Импортируется из main.js — без проблем с областью видимости.
 */
import * as THREE from 'three';

export function createSpruce(scene, x, z, scale) {
    scale = scale || 1;
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3520 });
    const needleMat = new THREE.MeshLambertMaterial({ color: 0x1a5a32 });
    const snowMat = new THREE.MeshLambertMaterial({ color: 0xeef6ff });
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06 * scale, 0.1 * scale, 0.7 * scale, 6),
        trunkMat
    );
    trunk.position.y = 0.35 * scale;
    group.add(trunk);
    for (let i = 0; i < 4; i++) {
        const h = (0.55 - i * 0.08) * scale;
        const r = (0.55 - i * 0.1) * scale;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), needleMat);
        cone.position.y = (0.7 + i * 0.35) * scale;
        group.add(cone);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.45, 6, 5), snowMat);
        cap.position.y = cone.position.y + h * 0.25;
        cap.scale.y = 0.35;
        group.add(cap);
    }
    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI;
    scene.add(group);
    return group;
}

export function createSnowman(scene, x, z, scale) {
    scale = scale || 1;
    const group = new THREE.Group();
    const snow = new THREE.MeshLambertMaterial({ color: 0xf0f6ff });
    const dark = new THREE.MeshLambertMaterial({ color: 0x222228 });
    const carrot = new THREE.MeshLambertMaterial({ color: 0xff7722 });
    const sizes = [0.28, 0.22, 0.16];
    let y = 0;
    for (let i = 0; i < 3; i++) {
        const r = sizes[i] * scale;
        y += r;
        const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 7), snow);
        ball.position.y = y;
        group.add(ball);
        y += r * 0.85;
    }
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03 * scale, 0.12 * scale, 5), carrot);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, y - sizes[2] * scale * 0.3, 0.14 * scale);
    group.add(nose);
    [-0.05, 0.05].forEach(function (sx) {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.02 * scale, 5, 5), dark);
        e.position.set(sx * scale, y - sizes[2] * scale * 0.15, 0.12 * scale);
        group.add(e);
    });
    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}

export function createSnowBank(scene, x, z, scale) {
    scale = scale || 1;
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xe8f0fa });
    for (let i = 0; i < 3; i++) {
        const w = (1.2 + Math.random() * 0.8) * scale;
        const h = (0.35 + Math.random() * 0.25) * scale;
        const d = (0.8 + Math.random() * 0.6) * scale;
        const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), mat);
        mound.scale.set(w, h, d);
        mound.position.set((i - 1) * 0.5 * scale, h * 0.35, (Math.random() - 0.5) * 0.4);
        group.add(mound);
    }
    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}

export function createIcePatch(scene, x, z, scale) {
    scale = scale || 1;
    const mat = new THREE.MeshStandardMaterial({
        color: 0xa8d4f0,
        roughness: 0.15,
        metalness: 0.55,
        transparent: true,
        opacity: 0.55
    });
    const mesh = new THREE.Mesh(
        new THREE.CircleGeometry((0.5 + Math.random() * 0.7) * scale, 10),
        mat
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.03, z);
    scene.add(mesh);
    return mesh;
}

export const SNOW_TRACK_IDS = { c04: 1, c08: 1, c12: 1, c16: 1 };

export function isSnowTheme(trackId, explicitTheme) {
    if (explicitTheme === 'snow') return true;
    if (trackId && SNOW_TRACK_IDS[trackId]) return true;
    return false;
}
