/**
 * Смена окружения по ходу трассы: трасса делится на три зоны («биома»), в каждой свои декорации
 * и свой цвет земли с плавным переходом; на въезде в зону — плашка с названием.
 *   town — окраина Арсеньева (руины, быт 90-х), forest — тайга, industrial — промзона, junk — свалка.
 */
import * as THREE from 'three';

export const BIOME_PLAN = {
    arsenev: [{ from: 0, style: 'town' }, { from: 0.36, style: 'forest' }, { from: 0.7, style: 'industrial' }],
    promzona: [{ from: 0, style: 'industrial' }, { from: 0.4, style: 'junk' }, { from: 0.72, style: 'forest' }],
    svalka: [{ from: 0, style: 'junk' }, { from: 0.38, style: 'forest' }, { from: 0.7, style: 'town' }]
};

export const BIOME_INFO = {
    town: { ground: 0x4a4432, label: '🏚 Окраина Арсеньева' },
    forest: { ground: 0x2c4a22, label: '🌲 Тайга: дорога через лес' },
    industrial: { ground: 0x3a3e32, label: '🏭 Промзона: трубы и цеха' },
    junk: { ground: 0x4a4228, label: '🗑 Свалка «Надежда»' }
};

const BLEND = 0.04; // ширина перехода между зонами (доля трассы)

export function biomePlan(mapId) {
    return BIOME_PLAN[mapId] || BIOME_PLAN.arsenev;
}

/** Номер зоны на доле пути progress (0..1) */
export function biomeIndexAt(mapId, progress) {
    const plan = biomePlan(mapId);
    let i = 0;
    for (let k = 0; k < plan.length; k++) if (progress >= plan[k].from) i = k;
    return i;
}

export function biomeAt(mapId, progress) {
    return biomePlan(mapId)[biomeIndexAt(mapId, progress)].style;
}

/** Цвет земли с плавным переходом у границ зон */
const _a = new THREE.Color(), _b = new THREE.Color();
export function groundColorAt(mapId, progress, out) {
    const plan = biomePlan(mapId);
    const i = biomeIndexAt(mapId, progress);
    const res = out || new THREE.Color();
    res.setHex(BIOME_INFO[plan[i].style].ground);
    // ближе к следующей границе — смешиваем со следующей зоной
    const next = plan[i + 1];
    if (next && next.from - progress < BLEND) {
        const t = 0.5 * (1 - (next.from - progress) / BLEND);
        res.lerp(_a.setHex(BIOME_INFO[next.style].ground), t);
    }
    const cur = plan[i];
    if (i > 0 && progress - cur.from < BLEND) {
        const t = 0.5 * (1 - (progress - cur.from) / BLEND);
        res.lerp(_b.setHex(BIOME_INFO[plan[i - 1].style].ground), t);
    }
    return res;
}

// ---------------- декор тайги ----------------
const mats = {};
// декор неподвижен: матрицы один раз, без пересчёта каждый кадр
function freeze(o) {
    o.updateMatrixWorld(true);
    o.traverse(function(c) { c.matrixAutoUpdate = false; c.matrixWorldAutoUpdate = false; });
}
function mat(key, color) {
    if (!mats[key]) mats[key] = new THREE.MeshLambertMaterial({ color: color });
    return mats[key];
}

/** Валун в мху */
export function createRock(scene, x, z, scale) {
    const s = scale || 1;
    const g = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 * s, 0), mat('rock', 0x7a7a74));
    rock.scale.set(1.3, 0.7, 1);
    rock.position.y = 0.3 * s;
    rock.rotation.set(Math.random(), Math.random() * 3, 0);
    g.add(rock);
    const moss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 * s, 0), mat('moss', 0x3a6a2a));
    moss.scale.set(1.4, 0.4, 1.1);
    moss.position.set(0.1 * s, 0.62 * s, 0);
    g.add(moss);
    g.position.set(x, 0, z);
    freeze(g);
    scene.add(g);
    return g;
}

/** Поваленное бревно */
export function createLog(scene, x, z, scale) {
    const s = scale || 1;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.22 * s, 2.2 * s, 8), mat('log', 0x6a4a2a));
    log.rotation.z = Math.PI / 2;
    log.rotation.y = Math.random() * Math.PI;
    log.position.set(x, 0.2 * s, z);
    freeze(log);
    scene.add(log);
    return log;
}

/**
 * Лес стеной: сотни деревьев за несколько вызовов отрисовки (InstancedMesh на ствол и крону).
 * trees — [{ x, z, s, kind: 'pine' | 'birch', rot }].
 */
export function createForestInstanced(scene, trees, mergeGeometries) {
    const pines = trees.filter(function(t) { return t.kind === 'pine'; });
    const birches = trees.filter(function(t) { return t.kind !== 'pine'; });
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    function fill(mesh, list) {
        list.forEach(function(t, i) {
            q.setFromAxisAngle(up, t.rot || 0);
            p.set(t.x, 0, t.z);
            sc.set(t.s, t.s, t.s);
            m.compose(p, q, sc);
            mesh.setMatrixAt(i, m);
        });
        mesh.instanceMatrix.needsUpdate = true;
        freeze(mesh);
        mesh.frustumCulled = false; // деревья по всей длине трассы — общий bbox не считаем
        scene.add(mesh);
    }
    if (pines.length) {
        const trunk = new THREE.CylinderGeometry(0.08, 0.13, 1.6, 6).translate(0, 0.8, 0);
        const cones = [];
        for (let i = 0; i < 4; i++) cones.push(new THREE.ConeGeometry(0.75 - i * 0.14, 0.8 - i * 0.1, 8).translate(0, 1.3 + i * 0.45, 0));
        fill(new THREE.InstancedMesh(trunk, mat('pineTrunk', 0x8a4a22), pines.length), pines);
        fill(new THREE.InstancedMesh(mergeGeometries(cones), mat('pineA', 0x24522c), pines.length), pines);
    }
    if (birches.length) {
        const trunk = new THREE.CylinderGeometry(0.06, 0.09, 2.0, 6).translate(0, 1.0, 0);
        const crown = mergeGeometries([
            new THREE.IcosahedronGeometry(0.7, 0).translate(0, 2.3, 0),
            new THREE.IcosahedronGeometry(0.5, 0).translate(0.3, 2.0, 0.1),
            new THREE.IcosahedronGeometry(0.5, 0).translate(-0.28, 2.05, -0.1)
        ]);
        fill(new THREE.InstancedMesh(trunk, mat('birch', 0xe8e4d8), birches.length), birches);
        fill(new THREE.InstancedMesh(crown, mat('birchLeafG', 0x5a8a34), birches.length), birches);
    }
}

/** Деревья для лесной зоны: плотно вдоль обочин (случайность — через rnd для тестов) */
export function forestTrees(mapId, zAtProgress, trackWidth, density, rnd) {
    const r = rnd || Math.random;
    const out = [];
    const plan = biomePlan(mapId);
    plan.forEach(function(zn, i) {
        if (zn.style !== 'forest') return;
        const from = zn.from, to = plan[i + 1] ? plan[i + 1].from : 1;
        const n = Math.round((to - from) * density);
        for (let k = 0; k < n; k++) {
            const prog = from + r() * (to - from);
            const side = r() < 0.5 ? -1 : 1;
            out.push({
                x: side * (trackWidth / 2 + 3.2 + r() * 22),
                z: zAtProgress(prog),
                s: 0.8 + r() * 0.8,
                kind: r() < 0.62 ? 'pine' : 'birch',
                rot: r() * Math.PI * 2
            });
        }
    });
    return out;
}
