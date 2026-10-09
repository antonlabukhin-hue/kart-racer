/**
 * Чайки над свалкой: белые «галочки» кружат над кучами мусора на разной высоте и машут крыльями.
 * Один материал и одна геометрия на всех; update(playerZ, now) — как у поездов и техники (src/inf-world.js).
 */
import * as THREE from 'three';

let geo = null, mat = null;
function gullGeo() {
    if (geo) return geo;
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, -0.08, 0, -0.9, 0.3, 0.15, -0.28, 0.1, 0, 0, -0.08, 0, 0.28, 0.1, 0, 0.9, 0.3, 0.15], 3));
    geo.computeVertexNormals();
    geo.userData.keep = true;
    return geo;
}

/** Есть ли чайки на участке i пейзажа style */
export function hasGulls(i, style) { return style === 'junk' && i % 2 === 1; }

export function createGulls(scene, cx, cz, n) {
    if (!mat) mat = new THREE.MeshBasicMaterial({ color: 0xf4f4f0, side: THREE.DoubleSide });
    const g = new THREE.Group();
    g.userData.dynamic = true;
    const birds = [];
    for (let k = 0; k < (n || 5); k++) {
        const m = new THREE.Mesh(gullGeo(), mat);
        m.userData = { r: 4 + Math.random() * 6, h: 7 + Math.random() * 5, a: Math.random() * 6.28, w: (0.35 + Math.random() * 0.3) * (Math.random() < 0.5 ? -1 : 1), ph: Math.random() * 6 };
        g.add(m); birds.push(m);
    }
    scene.add(g);
    let last = 0;
    return {
        group: g,
        update: function(playerZ, now) {
            const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
            birds.forEach(function(m) {
                const u = m.userData; u.a += u.w * dt; u.ph += dt * 7;
                m.position.set(cx + Math.cos(u.a) * u.r, u.h + Math.sin(u.a * 2) * 0.6, cz + Math.sin(u.a) * u.r);
                m.rotation.y = -u.a + (u.w > 0 ? 0 : Math.PI);
                m.scale.set(1.4, Math.sin(u.ph) * 1.2, 1.4);
            });
        },
        dispose: function() { scene.remove(g); }
    };
}
