/**
 * Дым из труб и бочек: клубы поднимаются, сносятся ветром, растут и тают.
 * Одно облако точек на участок обочины (один вызов отрисовки), обычное смешивание — серый не светится.
 * sources — [{ x, y, z, dark, size }]; update(playerZ, now) — как у поездов и техники (src/inf-world.js).
 * puffAt — чистая логика клуба по возрасту (с тестами).
 */
import * as THREE from 'three';

export const PUFF_LIFE = 4.5;   // сек
const PER_SOURCE = 14;          // клубов на источник одновременно
const WIND = 0.9;               // ед./с вбок

/** Клуб по возрасту age (0..PUFF_LIFE): подъём, снос, размер, прозрачность */
export function puffAt(age, size) {
    const u = Math.max(0, Math.min(1, age / PUFF_LIFE));
    return {
        dy: age * 1.6 - age * age * 0.06,   // поднимается, к концу медленнее
        dx: age * WIND,
        s: (size || 1) * (1 + u * 3.2),
        a: Math.min(1, u * 5) * (1 - u) * 0.75
    };
}

export function createSmoke(scene, sources) {
    const N = sources.length * PER_SOURCE;
    const pos = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N), col = new Float32Array(N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.ShaderMaterial({
        vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying float vA; varying vec3 vC;
            void main() { vA = alpha; vC = color; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = min(size * (420.0 / max(-mvPosition.z, 0.01)), 160.0); gl_Position = projectionMatrix * mvPosition; }`,
        fragmentShader: `varying float vA; varying vec3 vC;
            void main() { float d = length(gl_PointCoord - vec2(0.5)); if (d > 0.5) discard; gl_FragColor = vec4(vC, smoothstep(0.5, 0.18, d) * vA); }`,
        transparent: true, depthWrite: false, fog: false
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.dynamic = true;
    scene.add(pts);
    // у каждого клуба — своя фаза, чтобы источник дымил ровно, а не очередями
    const phase = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        phase[i] = (i % PER_SOURCE) / PER_SOURCE * PUFF_LIFE + Math.random() * 0.2;
        const s = sources[Math.floor(i / PER_SOURCE)], g = s.dark ? 0.22 + Math.random() * 0.08 : 0.72 + Math.random() * 0.12;
        col[i * 3] = g; col[i * 3 + 1] = g; col[i * 3 + 2] = g + 0.02;
    }
    let t0 = 0;
    return {
        points: pts,
        update: function(playerZ, now) {
            if (!t0) t0 = now;
            const t = (now - t0) / 1000;
            for (let i = 0; i < N; i++) {
                const s = sources[Math.floor(i / PER_SOURCE)], age = (t + phase[i]) % PUFF_LIFE, p = puffAt(age, s.size);
                pos[i * 3] = s.x + p.dx; pos[i * 3 + 1] = s.y + p.dy; pos[i * 3 + 2] = s.z + Math.sin(i * 1.7 + age) * 0.3;
                size[i] = p.s; alpha[i] = p.a;
            }
            geo.attributes.position.needsUpdate = true; geo.attributes.size.needsUpdate = true; geo.attributes.alpha.needsUpdate = true;
        },
        dispose: function() { scene.remove(pts); geo.dispose(); mat.dispose(); }
    };
}
