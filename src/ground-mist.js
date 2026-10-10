/**
 * Утренний туман: низкие полосы дымки над полями по обочинам (деревня, тайга). Над дорогой тумана нет —
 * помехи должны читаться издалека. Полосы едут вместе с игроком и плавно проявляются при смене пейзажа.
 * update(dt, x, z, on, colorHex) — каждый кадр. Чистая часть (яркость по пейзажу) — с тестами.
 */
import * as THREE from 'three';

/** Насколько густой туман в пейзаже (0 — нет) */
export function mistFor(theme) {
    if (!theme || theme.night || theme.rain) return 0;
    return theme.id === 'village' ? 1 : theme.id === 'snow' ? 0.7 : 0;
}

export function createGroundMist(scene, o) {
    const W = (o && o.trackWidth) || 6, n = (o && o.lite) ? 6 : 10;
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const t = c.getContext('2d');
    for (let i = 0; i < 28; i++) { // рваная полоса из мягких пятен
        const x = 20 + Math.random() * 216, y = 20 + Math.random() * 24, r = 14 + Math.random() * 22;
        const g = t.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        t.fillStyle = g; t.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const tex = new THREE.CanvasTexture(c); tex.userData.keep = true;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, fog: true });
    const geo = new THREE.PlaneGeometry(22, 4.5);
    const bands = [];
    for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(geo, mat);
        const side = i % 2 ? 1 : -1;
        m.userData = { dynamic: true, side: side, dx: W / 2 + 3.5 + (i % 3) * 4, dz: 20 + i * 14, y: 0.45 + (i % 4) * 0.2 };
        m.frustumCulled = false;
        m.visible = false;
        scene.add(m); bands.push(m);
    }
    let a = 0;
    return {
        update: function(dt, x, z, on, colorHex) {
            a += ((on || 0) * 0.62 - a) * Math.min(1, (dt || 0) * 1.2);
            const vis = a > 0.01;
            if (colorHex != null) mat.color.setHex(colorHex);
            mat.opacity = a;
            for (let i = 0; i < bands.length; i++) {
                const m = bands[i], u = m.userData;
                m.visible = vis;
                if (!vis) continue;
                const span = bands.length * 14;
                const bz = z - 12 - ((((z - 12 - u.dz) % span) + span) % span); // полосы стоят на месте, игрок едет сквозь — проехал, и полоса встаёт впереди
                m.position.set(x * 0.2 + u.side * u.dx, u.y, bz);
                m.rotation.y = u.side * 0.25;
            }
        }
    };
}
