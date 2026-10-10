/**
 * Тюнинг машин «из кино» и новых (мотоциклы, мопед, трайк, колесница, ковёр-самолёт): те же покупки гаража
 * (CAR_PARTS: спойлер, пороги, выхлоп…), но деталь — по смыслу машины и прикручена к ней, а не висит в воздухе.
 *  · машины — деталь ставится на поверхность модели, найденную лучами: губа под бампер, противотуманки в бампер,
 *    выхлоп из заднего бампера, пороги к борту между колёсами, спойлер на крышку багажника (если родное крыло уже
 *    есть — «утиный хвост» на кромке), багажник на крышу (на «Призрачном патруле» крыша занята — лестница сзади);
 *  · мотоциклы, мопед, трайк, колесница, ковёр — точки крепления по их собственной модели (рама, вилка, крыло…).
 * Названия в гараже — partName(carId, id). Видимость задаёт dressCar (main.js).
 */
import * as THREE from 'three';

/** Тип машины для тюнинга */
export function tuneKind(carId, wheelCount) {
    if (carId === 'carpet') return 'carpet';
    if (carId === 'chariot') return 'chariot';
    if (carId === 'trike') return 'trike';
    if (wheelCount <= 2) return 'bike';
    if (wheelCount === 3) return 'trike';
    return 'car';
}

const BIKE = { spoiler: 'Спинка-дуга', skirts: 'Дуги безопасности', exhaust: 'Прямоток', roof_rack: 'Кофр', lip: 'Ветровик', antenna: 'Флажок на штыре', fog: 'Доп. фары' };
const NAMES = {
    bike: BIKE,
    trike: Object.assign({}, BIKE, { spoiler: 'Спойлер на кузов', exhaust: 'Насадки-мегафоны' }), // спинка у трайка своя, трубы — тоже
    chariot: { spoiler: 'Жемчужные столбики', skirts: 'Золотой пояс', exhaust: 'Шлейф пузырей', roof_rack: 'Сундук с жемчугом', lip: 'Звезда на носу', rims: 'Золотые колёса', antenna: 'Вымпел', fog: 'Морские фонари' },
    carpet: { spoiler: 'Подушка-валик', skirts: 'Золотой шнур', exhaust: 'Шлейф искр', roof_rack: 'Сундук', lip: 'Золотая кайма', rims: 'Узор-медальон', antenna: 'Флажок', fog: 'Фонарики' }
};
const CAR_NAMES = { ghostcar: { roof_rack: 'Лестница на крышу' }, neon: { spoiler: 'Утиный хвост' }, bull: { spoiler: 'Утиный хвост' } };
// сколько колёс у машин из src/cars-movie.js и src/cars-fantasy.js (для названий в гараже — без постройки модели)
export const WHEELS = { cyborg: 2, moped: 2, trike: 3, chariot: 2, carpet: 0 };

/** Название детали в гараже для этой машины (null — обычное из CAR_PARTS) */
export function partName(carId, partId, wheelCount) {
    if (CAR_NAMES[carId] && CAR_NAMES[carId][partId]) return CAR_NAMES[carId][partId];
    const k = tuneKind(carId, wheelCount == null ? (WHEELS[carId] != null ? WHEELS[carId] : 4) : wheelCount);
    return (NAMES[k] && NAMES[k][partId]) || null;
}

function mat(color, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: color, metalness: 0.5, roughness: 0.35 }, o || {})); }

/** Мелкие построители: всё — в группу детали */
function makeKit() {
    const box = function(g, m, w, h, l, x, y, z, rx) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m); b.position.set(x, y, z); if (rx) b.rotation.x = rx; g.add(b); return b; };
    const ball = function(g, m, r, x, y, z) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), m); s.position.set(x, y, z); g.add(s); return s; };
    /** труба от точки a до точки b */
    const rod = function(g, m, r, a, b) {
        const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]), len = A.distanceTo(B);
        const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), m);
        c.position.copy(A).add(B).multiplyScalar(0.5);
        c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
        g.add(c); return c;
    };
    /** цилиндр-«банка» вдоль оси axis ('x' | 'y' | 'z') */
    const can = function(g, m, r, h, x, y, z, axis) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14), m); c.position.set(x, y, z);
        if (axis === 'x') c.rotation.z = Math.PI / 2; else if (axis === 'z') c.rotation.x = Math.PI / 2;
        g.add(c); return c;
    };
    /** фара/фонарь: корпус-банка вдоль z и светящееся стекло (dz — куда смотрит: −1 вперёд) */
    const lamp = function(g, body, glass, r, x, y, z, dz) { can(g, body, r, 0.06, x, y, z, 'z'); can(g, glass, r * 0.82, 0.012, x, y, z + (dz || -1) * 0.032, 'z'); };
    return { box: box, ball: ball, rod: rod, can: can, lamp: lamp };
}

/** Лучи по модели: где поверхность сверху, снизу, спереди, сзади, сбоку (без колёс и прозрачных подсветок) */
function makeProbe(group) {
    group.updateMatrixWorld(true);
    const meshes = [];
    group.traverse(function(o) {
        if (!o.isMesh || o.visible === false) return;
        if (o.material && o.material.transparent && o.material.opacity < 0.5) return; // свечение, тени
        for (let p = o; p; p = p.parent) if (p.userData && p.userData.isWheel) return;
        if (new THREE.Box3().setFromObject(o).max.y < 0.1) return; // подсветка днища и тени у земли — не кузов
        meshes.push(o);
    });
    const bb = new THREE.Box3().setFromObject(group), ray = new THREE.Raycaster(), V = THREE.Vector3;
    const cast = function(o, d) { ray.set(o, d); return ray.intersectObjects(meshes, false); };
    const probe = {
        bb: bb,
        /** все попадания сверху вниз в точке (x, z): [y…] от верхнего к нижнему */
        downAll: function(x, z) { return cast(new V(x, bb.max.y + 1, z), new V(0, -1, 0)).map(function(h) { return h.point.y; }); },
        /** самая низкая поверхность сверху — сам кузов (крыша, багажник), а не крыло или груз на нём */
        top: function(x, z, fb) { const a = probe.downAll(x, z); return a.length ? a[a.length - 1] : fb; },
        under: function(x, z, fb) { const h = cast(new V(x, -1, z), new V(0, 1, 0))[0]; return h ? h.point.y : fb; },
        front: function(x, y, fb) { const h = cast(new V(x, y, bb.min.z - 1), new V(0, 0, 1))[0]; return h ? h.point.z : fb; },
        rear: function(x, y, fb) { const h = cast(new V(x, y, bb.max.z + 1), new V(0, 0, -1))[0]; return h ? h.point.z : fb; },
        side: function(s, y, z, fb) { const h = cast(new V(s * (bb.max.x + 1), y, z), new V(-s, 0, 0))[0]; return h ? Math.abs(h.point.x) : fb; }
    };
    return probe;
}

/**
 * Верх кузова машин «из кино» — замер лучами по моделям (сверху луч проходит крышу, стекло, линию кузова, сиденья,
 * а у «Неона» ещё и подсветку у земли — поэтому высоты заданы явно): багажник { y, z }, крыша { y, z },
 * wing — своё крыло уже есть (тогда «утиный хвост»), busy — крыша занята оборудованием (тогда лестница сзади),
 * deck — у «Мстителя» крыша — стеклянный купол: багажник на заднюю палубу.
 */
const CAR_AT = {
    thief: { trunk: { y: 0.72, z: 1.12 }, roof: { y: 0.98, z: 0.25 } },
    neon: { trunk: { y: 0.68, z: 1.15 }, roof: { y: 0.93, z: 0.35 }, wing: true },
    bull: { trunk: { y: 0.64, z: 1.15 }, roof: { y: 0.85, z: 0.3 }, wing: true },
    avenger: { trunk: { y: 0.63, z: 1.25 }, roof: { y: 0.66, z: 0.95 }, deck: true },
    ghostcar: { trunk: { y: 1.25, z: 1.3 }, roof: { y: 1.24, z: 0.6 }, busy: true },
    timecar: { trunk: { y: 0.72, z: 1.12 }, roof: { y: 1.0, z: 0.3 } }
};

/** Точки крепления мото и трайка (по их моделям в src/cars-movie.js и src/cars-fantasy.js) */
const BIKE_AT = {
    // мопед: багажник у него свой (y 0.66, z 0.62…0.87), фара y 0.84 z −0.57, вилка x ±0.06 от (0.24, −0.62) до (0.86, −0.5)
    moped: { rackY: 0.67, rackZ: 0.75, rackW: 0.28, bar: [0.11, 0.72, 0.6], barTop: 1.02, guard: { x: 0.2, y0: 0.3, y1: 0.62, z: -0.36 },
        pipe: [[0.12, 0.27, 0.45], [0.15, 0.3, 0.95]], fork: { x: 0.06, y: 0.62, z: -0.55 }, light: { y: 0.84, z: -0.6 }, flag: [-0.13, 0.67, 0.86] },
    // чоппер «Киборг»: сиденье до z 0.55 (y 0.78), заднее крыло — тор r 0.34 вокруг (0.3, 0.72), фара y 0.88 z −0.64
    cyborg: { rackY: 0.665, rackZ: 0.82, rackW: 0.26, plate: true, bar: [0.1, 0.7, 0.6], barTop: 1.12, guard: { x: 0.25, y0: 0.26, y1: 0.55, z: -0.3 },
        pipe: [[-0.12, 0.36, 0.02], [-0.18, 0.3, 0.32], [-0.18, 0.33, 1.0]], fork: { x: 0.08, y: 0.65, z: -0.656 }, light: { y: 0.88, z: -0.67 }, flag: [-0.12, 0.665, 0.95] },
    // трайк: задний кузов, верх ~0.65 на z 0.85; родная спинка и трубы по бокам до z 1.2; вилка от (0.3, −1.05) до (1.02, −0.72)
    trike: { trunk: { y: 0.6, z: 1.06 }, rackY: 0.66, rackZ: 0.76, rackW: 0.44, guard: { x: 0.28, y0: 0.28, y1: 0.6, z: -0.42 },
        tips: [[-0.34, 0.34, 1.2], [0.34, 0.34, 1.2]], fork: { x: 0.08, y: 0.66, z: -0.885 }, light: { y: 0.9, z: -0.88 }, flag: [-0.3, 0.6, 1.0] }
};

/**
 * Построить детали на модели. group — модель (спереди −Z), d — габариты сборщика { L, W, Y, wheels: [[x,y,z,r,w]] }.
 * → { spoiler, skirts, exhaust, roof_rack, lip, rims, antenna, fog, xenon } — группы, скрыты
 */
export function buildTuning(group, d, carId, bodyMat) {
    const kind = tuneKind(carId, (d.wheels || []).length);
    const P = makeProbe(group), K = makeKit();
    const black = mat(0x141414, { metalness: 0.6, roughness: 0.45 }), chrome = mat(0xd0d3da, { metalness: 0.85, roughness: 0.2 });
    const gold = mat(0xf2c033, { metalness: 0.85, roughness: 0.25 }), paint = bodyMat || mat(0xcc2200);
    const glass = mat(0xfff2b0, { emissive: 0xffd060, emissiveIntensity: 1.2 });
    const parts = {};
    const G = function(id) { const g = new THREE.Group(); g.visible = false; g.name = 'tune_' + id; group.add(g); parts[id] = g; return g; };
    const wheels = d.wheels || [];
    const hw = d.W ? d.W / 2 : Math.max(-P.bb.min.x, P.bb.max.x);
    const M = { black: black, chrome: chrome, glass: glass, paint: paint };

    if (kind === 'car') buildCar(G, K, P, M, d, hw, CAR_AT[carId]);
    else if (kind === 'bike' || kind === 'trike') buildBike(G, K, carId, kind, M);
    else if (kind === 'chariot') buildChariotParts(G, K, gold);
    else buildCarpetParts(G, K, P, gold);

    // литьё — золотые диски снаружи колёс (машины, мотоциклы, трайк)
    if (!parts.rims) {
        const rm = G('rims'); rm.userData.wheelPart = true; // литьё — на колёсах: высокая подвеска поднимает кузов, а не диски (src/suspension.js)
        wheels.forEach(function(w) {
            const side = w[0] === 0 ? [-1, 1] : [Math.sign(w[0])];
            side.forEach(function(s) { K.can(rm, gold, w[3] * 0.62, 0.02, w[0] + s * ((w[4] || 0.2) / 2 + 0.02), w[1], w[2], 'x'); });
        });
    }
    G('xenon'); // ксенон — цвет фар (dressCar), отдельной детали нет
    Object.keys(parts).forEach(function(id) { parts[id].traverse(function(o) { if (o.isMesh) o.castShadow = true; }); });
    return parts;
}

function buildCar(G, K, P, M, d, hw, at) {
    const wheels = d.wheels || [];
    const zF = P.front(0, 0.35, -d.L / 2), zR = P.rear(0, 0.4, d.L / 2);
    const fw = wheels.filter(function(w) { return w[2] < 0; })[0], rw = wheels.filter(function(w) { return w[2] > 0; })[0];
    // ГУБА — под передним бампером: верх губы — низ бампера, чуть выступает вперёд
    const yBotF = P.under(0, zF + 0.1, 0.18);
    const zBumper = P.front(0, yBotF + 0.03, zF);
    K.box(G('lip'), M.black, hw * 1.5, 0.035, 0.16, 0, yBotF - 0.018, zBumper + 0.04);
    // ПРОТИВОТУМАНКИ — утоплены в передний бампер
    const fg = G('fog'), yFog = yBotF + 0.07;
    [-1, 1].forEach(function(s) {
        const x = s * hw * 0.6, z = P.front(x, yFog, null);
        if (z != null) K.lamp(fg, M.black, M.glass, 0.05, x, yFog, z + 0.012, -1);
    });
    // ВЫХЛОП — две трубы из-под заднего бампера
    const ex = G('exhaust'), yBotR = P.under(0, zR - 0.1, 0.2), yEx = yBotR + 0.05;
    [-0.22, -0.34].forEach(function(x) {
        const z = P.rear(x, yEx, P.rear(x, yEx + 0.08, zR));
        K.can(ex, M.chrome, 0.045, 0.2, x, yEx, z + 0.05, 'z');
        K.can(ex, M.black, 0.032, 0.012, x, yEx, z + 0.151, 'z');
    });
    // ПОРОГИ — к борту между колёсными арками
    const sk = G('skirts');
    if (fw && rw) {
        const z0 = fw[2] + fw[3] + 0.06, z1 = rw[2] - rw[3] - 0.06, zc = (z0 + z1) / 2;
        let ySk = null, xSk = null;
        [0.22, 0.27, 0.32, 0.38].some(function(y) { const x = P.side(1, y, zc, null); if (x != null) { ySk = y; xSk = x; return true; } return false; });
        if (xSk != null) [-1, 1].forEach(function(s) { K.box(sk, M.black, 0.05, 0.07, z1 - z0, s * (xSk + 0.005), ySk, zc); });
    }
    // СПОЙЛЕР — на крышку багажника; уже есть родное крыло — «утиный хвост» на кромке; у универсала — козырёк на краю крыши
    const sp = G('spoiler');
    const A = at || {}, tr = A.trunk || { y: P.top(0, zR - 0.18, (d.Y || 0.42) + 0.3), z: zR - 0.18 };
    const yTrunk = tr.y, zEdge = P.rear(0, yTrunk - 0.04, tr.z + 0.15);
    if (A.wing) {
        K.box(sp, M.paint, hw * 1.3, 0.045, 0.16, 0, yTrunk + 0.03, zEdge - 0.07, -0.35);
    } else if (A.busy) {
        K.box(sp, M.paint, hw * 1.7, 0.04, 0.22, 0, yTrunk + 0.03, zEdge - 0.06, -0.12);
        [-1, 1].forEach(function(s) { K.box(sp, M.black, 0.03, 0.08, 0.2, s * hw * 0.85, yTrunk + 0.05, zEdge - 0.06); });
    } else {
        const xs = hw * 0.5, zs = zEdge - 0.12, yWing = yTrunk + 0.2;
        [-1, 1].forEach(function(s) {
            K.box(sp, M.black, 0.04, yWing - yTrunk + 0.02, 0.08, s * xs, (yTrunk + yWing) / 2, zs);
            K.box(sp, M.paint, 0.03, 0.14, 0.3, s * hw * 0.8, yWing + 0.04, zs);
        });
        K.box(sp, M.black, hw * 1.6, 0.04, 0.26, 0, yWing, zs);
    }
    // БАГАЖНИК НА КРЫШУ — на саму крышу; крыша занята — лестница на задней двери; купол — на заднюю палубу
    const rf = A.roof || { y: P.top(0, 0.2, 0.9), z: 0.2 }, yRoof = rf.y, zRoof = rf.z;
    const rr = G('roof_rack');
    if (A.busy) {
        const xl = Math.min(hw * 0.55, 0.4), yl0 = yBotR + 0.15;
        const zl = P.rear(xl, (yl0 + yRoof) / 2, zR) + 0.03;
        [-1, 1].forEach(function(s) { K.box(rr, M.chrome, 0.03, yRoof - yl0, 0.03, xl + s * 0.11, (yl0 + yRoof) / 2, zl); });
        for (let y = yl0 + 0.08; y < yRoof - 0.02; y += 0.12) K.box(rr, M.chrome, 0.22, 0.02, 0.03, xl, y, zl);
    } else {
        const len = A.deck ? 0.44 : 0.74, xr = Math.max(0.2, P.side(1, yRoof - 0.04, zRoof, hw * 0.6) - 0.09);
        [-1, 1].forEach(function(s) {
            K.box(rr, M.black, 0.035, 0.035, len, s * xr, yRoof + 0.07, zRoof);
            [-1, 1].forEach(function(e) { K.box(rr, M.black, 0.04, 0.08, 0.05, s * xr, yRoof + 0.035, zRoof + e * (len / 2 - 0.06)); });
        });
        (A.deck ? [-0.12, 0.12] : [-0.22, 0.05, 0.3]).forEach(function(dz) { K.box(rr, M.black, xr * 2, 0.025, 0.035, 0, yRoof + 0.09, zRoof + dz); });
    }
    // АНТЕННА — из заднего крыла справа (у универсала — с края крыши)
    const an = G('antenna'), xa = hw * 0.62, za = A.busy ? zRoof + 0.5 : zEdge - 0.3, ya = A.busy ? yRoof : yTrunk;
    K.can(an, M.black, 0.02, 0.03, xa, ya + 0.01, za, 'y');
    K.rod(an, M.black, 0.007, [xa, ya, za], [xa, ya + 0.7, za + 0.06]);
}

function buildBike(G, K, carId, kind, M) {
    const A = BIKE_AT[carId] || BIKE_AT.moped;
    const red = mat(0xd02828, { metalness: 0.1, roughness: 0.7 }), tint = mat(0x33506e, { transparent: true, opacity: 0.5, metalness: 0.6, roughness: 0.1 });
    // СПИНКА-ДУГА за сиденьем (у трайка своя — у него «спойлер на кузов»)
    const sp = G('spoiler');
    if (A.trunk) {
        const t = A.trunk;
        [-1, 1].forEach(function(s) { K.box(sp, M.black, 0.04, 0.08, 0.06, s * 0.3, t.y + 0.04, t.z - 0.02); });
        K.box(sp, M.paint, 0.8, 0.04, 0.18, 0, t.y + 0.09, t.z, 0.25);
    } else {
        const b = A.bar;
        [-1, 1].forEach(function(s) { K.rod(sp, M.chrome, 0.016, [s * b[0], b[1], b[2]], [s * b[0], A.barTop, b[2] + 0.06]); });
        K.rod(sp, M.chrome, 0.016, [-b[0], A.barTop, b[2] + 0.06], [b[0], A.barTop, b[2] + 0.06]);
        K.box(sp, M.black, b[0] * 2 - 0.02, 0.14, 0.04, 0, A.barTop - 0.12, b[2] + 0.05);
    }
    // ДУГИ БЕЗОПАСНОСТИ — от рамы у мотора наружу и обратно
    const sk = G('skirts'), g = A.guard;
    [-1, 1].forEach(function(s) {
        const a = [s * 0.05, g.y1, g.z + 0.05], b = [s * g.x, g.y1 - 0.06, g.z], c = [s * g.x, g.y0, g.z + 0.12], e = [s * 0.07, g.y0 + 0.02, g.z + 0.24];
        K.rod(sk, M.chrome, 0.018, a, b); K.rod(sk, M.chrome, 0.018, b, c); K.rod(sk, M.chrome, 0.018, c, e);
    });
    // ПРЯМОТОК (мото) / НАСАДКИ-МЕГАФОНЫ на родные трубы (трайк)
    const ex = G('exhaust');
    if (A.tips) A.tips.forEach(function(t) { K.can(ex, M.chrome, 0.055, 0.2, t[0], t[1], t[2] + 0.08, 'z'); K.can(ex, M.black, 0.04, 0.01, t[0], t[1], t[2] + 0.185, 'z'); });
    else {
        for (let i = 0; i < A.pipe.length - 1; i++) K.rod(ex, M.chrome, 0.035, A.pipe[i], A.pipe[i + 1]);
        const end = A.pipe[A.pipe.length - 1];
        K.can(ex, M.chrome, 0.05, 0.22, end[0], end[1], end[2] - 0.08, 'z');
    }
    // КОФР — на багажник / заднее крыло (у «Киборга» — на площадку-кронштейн от сиденья)
    const rr = G('roof_rack');
    if (A.plate) { K.box(rr, M.black, A.rackW, 0.02, 0.3, 0, A.rackY, A.rackZ); [-1, 1].forEach(function(s) { K.rod(rr, M.black, 0.012, [s * 0.1, A.rackY, A.rackZ - 0.14], [s * 0.1, 0.62, 0.5]); }); }
    K.box(rr, M.paint, A.rackW + 0.04, 0.22, 0.26, 0, A.rackY + 0.12, A.rackZ);
    K.box(rr, M.black, A.rackW + 0.05, 0.03, 0.27, 0, A.rackY + 0.2, A.rackZ);
    // ВЕТРОВИК — над фарой, на двух кронштейнах
    const lp = G('lip'), L0 = A.light;
    const ws = K.box(lp, tint, kind === 'trike' ? 0.42 : 0.36, 0.26, 0.015, 0, L0.y + 0.22, L0.z - 0.02, -0.3);
    ws.renderOrder = 2;
    [-1, 1].forEach(function(s) { K.rod(lp, M.chrome, 0.01, [s * 0.07, L0.y + 0.04, L0.z + 0.04], [s * 0.1, L0.y + 0.13, L0.z]); });
    // ФЛАЖОК — штырь в углу багажника / кузова
    const an = G('antenna'), f = A.flag;
    K.rod(an, M.black, 0.008, f, [f[0], f[1] + 0.6, f[2] + 0.04]);
    K.box(an, red, 0.008, 0.11, 0.18, f[0], f[1] + 0.54, f[2] + 0.13);
    // ДОП. ФАРЫ — на кронштейнах к перьям вилки
    const fg = G('fog'), F = A.fork;
    [-1, 1].forEach(function(s) {
        K.rod(fg, M.chrome, 0.01, [s * F.x, F.y, F.z], [s * (F.x + 0.08), F.y, F.z - 0.02]);
        K.lamp(fg, M.black, M.glass, 0.045, s * (F.x + 0.11), F.y, F.z - 0.03, -1);
    });
}

function buildChariotParts(G, K, gold) {
    // чаша: центр (0, 0.86, 0.3), радиус 0.62 (по z 0.65), обод — тор на высоте 0.86; веер на z 0.88; колёса x ±0.66 на z 0.3
    const pearl = mat(0xfff4f0, { metalness: 0.4, roughness: 0.15 });
    const sp = G('spoiler'); // жемчужины на золотых столбиках — на ободе сзади по бокам
    [-1, 1].forEach(function(s) { const x = s * 0.47, z = 0.3 + 0.42; K.rod(sp, gold, 0.022, [x, 0.86, z], [x, 1.22, z]); K.ball(sp, pearl, 0.08, x, 1.28, z); });
    const sk = G('skirts'); // золотой пояс по чаше чуть ниже обода
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.585, 0.025, 8, 36), gold); belt.rotation.x = Math.PI / 2; belt.scale.set(1, 1.05, 1); belt.position.set(0, 0.76, 0.3); sk.add(belt);
    const ex = G('exhaust'); // пузыри поднимаются за веером — так и задумано, «шлейф»
    const bub = mat(0xaee8ff, { transparent: true, opacity: 0.6, metalness: 0.1, roughness: 0.05 });
    [[0.0, 0.92, 1.02, 0.06], [0.14, 1.08, 1.12, 0.05], [-0.1, 1.24, 1.2, 0.045], [0.05, 1.4, 1.28, 0.035]].forEach(function(b) { K.ball(ex, bub, b[3], b[0], b[1], b[2]); });
    const rr = G('roof_rack'); // сундук с жемчугом — на сиденье справа от Посейдона (сиденье: верх 0.96, z 0.5)
    K.box(rr, mat(0x6a3b17, { metalness: 0.1, roughness: 0.8 }), 0.26, 0.18, 0.22, 0.3, 1.05, 0.52);
    K.box(rr, gold, 0.27, 0.03, 0.23, 0.3, 1.14, 0.52); K.ball(rr, pearl, 0.04, 0.3, 1.18, 0.52);
    const lp = G('lip'); // звезда на носу чаши
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), gold); star.position.set(0, 0.9, -0.36); star.scale.set(1, 1, 0.5); lp.add(star);
    const rm = G('rims'); rm.userData.wheelPart = true; // золотые колёса: обод снаружи колеса
    [-1, 1].forEach(function(s) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 8, 24), gold); t.rotation.y = Math.PI / 2; t.position.set(s * 0.73, 0.38, 0.3); rm.add(t); });
    const an = G('antenna'); // вымпел на древке у обода слева сзади
    K.rod(an, gold, 0.012, [-0.55, 0.86, 0.55], [-0.55, 1.62, 0.58]);
    K.box(an, mat(0x2266ff, { metalness: 0.1, roughness: 0.7 }), 0.01, 0.14, 0.26, -0.55, 1.54, 0.72);
    const fg = G('fog'); // морские фонари на столбиках у носа чаши
    const sea = mat(0x99ffee, { emissive: 0x44ffdd, emissiveIntensity: 1.2 });
    [-1, 1].forEach(function(s) { const x = s * 0.42, z = 0.3 - 0.46; K.rod(fg, gold, 0.012, [x, 0.86, z], [x, 1.02, z]); K.ball(fg, sea, 0.055, x, 1.07, z); });
}

function buildCarpetParts(G, K, P, gold) {
    // ковёр волнистый: высоту поверхности берём лучом в каждой точке — всё лежит на ковре
    const S = function(x, z) { return P.top(x, z, 0.48); };
    const pillow = mat(0xb02a5a, { metalness: 0.05, roughness: 0.9 }), wood = mat(0x6a3b17, { metalness: 0.1, roughness: 0.8 });
    const sp = G('spoiler'); // подушка-валик поперёк, сзади
    K.can(sp, pillow, 0.08, 0.9, 0, S(0, 0.95) + 0.08, 0.95, 'x');
    [-1, 1].forEach(function(s) { K.can(sp, gold, 0.082, 0.04, s * 0.45, S(s * 0.45, 0.95) + 0.08, 0.95, 'x'); });
    const sk = G('skirts'); // золотой шнур по длинным краям — повторяет волну ковра
    [-1, 1].forEach(function(s) {
        const x = s * 0.6;
        for (let z = -0.9; z < 1.05; z += 0.15) K.rod(sk, gold, 0.014, [x, S(x, z) + 0.012, z], [x, S(x, z + 0.15) + 0.012, z + 0.15]);
    });
    const ex = G('exhaust'); // шлейф искр за ковром — летят следом
    const spark = mat(0xffe680, { emissive: 0xffc030, emissiveIntensity: 1.4 });
    [[0, 1.25, 0.05], [0.15, 1.42, 0.04], [-0.12, 1.58, 0.03]].forEach(function(p) { K.ball(ex, spark, p[2], p[0], 0.44, p[1]); });
    const rr = G('roof_rack'); // сундук справа сзади
    const yc = S(0.38, 0.85);
    K.box(rr, wood, 0.34, 0.22, 0.26, 0.38, yc + 0.11, 0.85); K.box(rr, gold, 0.35, 0.03, 0.27, 0.38, yc + 0.215, 0.85);
    const lp = G('lip'); // золотая кайма по загнутому переднему краю
    for (let x = -0.6; x < 0.6; x += 0.15) K.rod(lp, gold, 0.016, [x, S(x, -1.08) + 0.012, -1.08], [x + 0.15, S(x + 0.15, -1.08) + 0.012, -1.08]);
    const rm = G('rims'); // узор-медальон на ковре слева спереди
    const md = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 24), gold); md.rotation.x = Math.PI / 2; md.position.set(-0.22, S(-0.22, -0.55) + 0.015, -0.55); rm.add(md);
    const an = G('antenna'); // флажок в заднем левом углу
    const ya = S(-0.5, 1.0);
    K.rod(an, gold, 0.01, [-0.5, ya, 1.0], [-0.5, ya + 0.62, 1.02]);
    K.box(an, mat(0x22aa55, { metalness: 0.1, roughness: 0.7 }), 0.01, 0.12, 0.2, -0.5, ya + 0.56, 1.13);
    const fg = G('fog'); // фонарики на столбиках у переднего края
    const lampM = mat(0xffcc66, { emissive: 0xffaa30, emissiveIntensity: 1.3 });
    [-1, 1].forEach(function(s) { const x = s * 0.45, z = -0.82, y = S(x, z); K.rod(fg, gold, 0.01, [x, y, z], [x, y + 0.22, z]); K.ball(fg, lampM, 0.05, x, y + 0.26, z); });
}
