/**
 * Цели прямо на дороге (как отметки друзей в Subway Surfers): на дальности твоего рекорда — растяжка «РЕКОРД» через всю трассу,
 * на дальностях соперников из таблицы (src/rival-chase.js) — щит на обочине с именем и метрами.
 * Ставятся заранее, за AHEAD ед., и убираются позади. Что и где ставить — чистая функция (с тестами).
 */
import * as THREE from 'three';

export const AHEAD = 320, BEHIND = 30;

/** Какие цели должны стоять на дороге, когда проехано dist: targets — [{ name, dist, mine? }] */
export function goalsInView(targets, dist) {
    // у самого старта (до 60 м) щитов не ставим — там и так всё видно в панели заезда
    return (targets || []).filter(function(t) { return t && t.dist >= 60 && t.dist > dist - BEHIND && t.dist <= dist + AHEAD; });
}

/** Ключ цели — чтобы не ставить её дважды (таблица из сети может прийти позже и заменить список) */
export function goalKey(t) { return (t.mine ? '★' : t.name) + '@' + Math.round(t.dist); }

function textTexture(lines, w, h, bg, fg, border) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.lineWidth = 10; g.strokeStyle = border; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(function(l, i) {
        g.font = (i ? '700 ' : '900 ') + l.size + 'px system-ui, "Segoe UI", Arial, sans-serif';
        let txt = l.text;
        while (g.measureText(txt).width > w - 40 && txt.length > 4) txt = txt.slice(0, -2) + '…';
        g.fillText(txt, w / 2, l.y);
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

/** Растяжка «РЕКОРД» над дорогой: две стойки и шахматное полотно */
export function createRecordArch(dist, width) {
    const g = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5, metalness: 0.4 });
    [-1, 1].forEach(function(s) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 4.2, 8), poleMat);
        p.position.set(s * (width / 2 + 0.6), 2.1, 0);
        g.add(p);
    });
    const tex = textTexture([{ text: '🏁 ТВОЙ РЕКОРД', size: 64, y: 62 }, { text: Math.round(dist) + ' м', size: 50, y: 128 }], 1024, 176, '#16120c', '#ffd23c', '#ffd23c');
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(width + 1.4, 1.3), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    banner.position.y = 3.6;
    g.add(banner);
    // шахматная лента по краю полотна
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 8;
    const cg = cv.getContext('2d');
    for (let i = 0; i < 32; i++) { cg.fillStyle = (i % 2) ? '#111' : '#fff'; cg.fillRect(i * 4, 0, 4, 4); cg.fillStyle = (i % 2) ? '#fff' : '#111'; cg.fillRect(i * 4, 4, 4, 4); }
    const ct = new THREE.CanvasTexture(cv); ct.magFilter = THREE.NearestFilter;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(width + 1.4, 0.24), new THREE.MeshBasicMaterial({ map: ct, side: THREE.DoubleSide }));
    strip.position.y = 2.84;
    g.add(strip);
    // линия финиша на асфальте
    const line = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.7), new THREE.MeshBasicMaterial({ map: ct, transparent: true, opacity: 0.85, depthWrite: false }));
    line.rotation.x = -Math.PI / 2; line.position.y = 0.02;
    g.add(line);
    return g;
}

/** Щит соперника на обочине: имя и его дальность */
export function createRivalBoard(name, dist, side, width) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 3.0, 6), new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.4 }));
    pole.position.y = 1.5;
    g.add(pole);
    const tex = textTexture([{ text: '🎯 ' + name, size: 58, y: 64 }, { text: Math.round(dist) + ' м', size: 50, y: 142 }], 900, 200, '#0e1a2a', '#bfe9ff', '#66ddff');
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.93), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    board.position.y = 3.3;
    g.add(board);
    g.position.x = side * (width / 2 + 2.6);
    g.rotation.y = -side * 0.35; // чуть к дороге — читается издалека
    return g;
}

/** Цели на дороге заезда: tick(dist) — каждый кадр; getTargets() — актуальная лесенка целей */
export function createRoadGoals(scene, startZ, width, getTargets) {
    const built = new Map();
    let side = 1;
    function dispose(o) {
        o.traverse(function(c) { if (c.geometry) c.geometry.dispose(); if (c.material && c.material.map) c.material.map.dispose(); });
    }
    return {
        get count() { return built.size; },
        tick: function(dist) {
            const want = goalsInView(getTargets(), dist);
            const keys = new Set(want.map(goalKey));
            want.forEach(function(t) {
                const k = goalKey(t);
                if (built.has(k)) return;
                const m = t.mine ? createRecordArch(t.dist, width) : createRivalBoard(t.name, t.dist, (side = -side), width);
                m.position.z = startZ - t.dist;
                scene.add(m);
                built.set(k, m);
            });
            built.forEach(function(m, k) {
                if (keys.has(k)) return;
                scene.remove(m); dispose(m); built.delete(k);
            });
        }
    };
}
