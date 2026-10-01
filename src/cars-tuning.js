/**
 * Тюнинг машин «из кино» и новых (мотоциклы, мопед, трайк, колесница, ковёр-самолёт): те же покупки гаража
 * (CAR_PARTS: спойлер, пороги, выхлоп…), но деталь — по смыслу машины и под её габариты.
 * У мопеда «спойлер» — спинка-дуга, у ковра «багажник» — сундук и т. д.; названия в гараже — partName(carId, id).
 * Детали строятся по габаритам модели (Box3) — у каждой машины на своём месте. Видимость задаёт dressCar (main.js).
 */
import * as THREE from 'three';

/** Тип машины для тюнинга */
export function tuneKind(carId, wheelCount) {
    if (carId === 'carpet') return 'carpet';
    if (carId === 'chariot') return 'chariot';
    if (wheelCount <= 2) return 'bike';
    if (wheelCount === 3) return 'trike';
    return 'car';
}

const NAMES = {
    bike: { spoiler: 'Спинка-дуга', skirts: 'Дуги безопасности', exhaust: 'Прямоток', roof_rack: 'Кофр', lip: 'Ветровик', antenna: 'Флажок на штыре', fog: 'Доп. фары' },
    trike: { spoiler: 'Спинка-дуга', skirts: 'Дуги безопасности', exhaust: 'Прямоток', roof_rack: 'Кофр', lip: 'Ветровик', antenna: 'Флажок на штыре', fog: 'Доп. фары' },
    chariot: { spoiler: 'Жемчужные столбики', skirts: 'Золотые борта', exhaust: 'Шлейф пузырей', roof_rack: 'Сундук с жемчугом', lip: 'Звезда на носу', rims: 'Золотые колёса', antenna: 'Вымпел', fog: 'Морские фонари' },
    carpet: { spoiler: 'Подушка-валик', skirts: 'Золотые борта', exhaust: 'Шлейф искр', roof_rack: 'Сундук', lip: 'Золотая кайма', rims: 'Узор-медальон', antenna: 'Флажок', fog: 'Фонарики' }
};
/** Название детали в гараже для этой машины (null — обычное из CAR_PARTS) */
export function partName(carId, partId, wheelCount) {
    const k = tuneKind(carId, wheelCount == null ? WHEELS[carId] : wheelCount);
    return (NAMES[k] && NAMES[k][partId]) || null;
}
// сколько колёс у машин из src/cars-movie.js и src/cars-fantasy.js (для названий в гараже — без постройки модели)
export const WHEELS = { cyborg: 2, moped: 2, trike: 3, chariot: 2, carpet: 0 };

function mat(color, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: color, metalness: 0.5, roughness: 0.35 }, o || {})); }

/**
 * Построить детали на модели. group — модель (спереди −Z), d — габариты сборщика { L, W, Y, wheels: [[x,y,z,r,w]] }.
 * → { spoiler, skirts, exhaust, roof_rack, lip, rims, antenna, fog, xenon } — группы, скрыты
 */
export function buildTuning(group, d, carId, bodyMat) {
    const kind = tuneKind(carId, (d.wheels || []).length);
    group.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(group);
    // ширина и длина — из размеров сборщика (в габаритах сцены бывают тень и упряжка), высота — по модели
    // высота поверхности модели в точке (x, z): луч сверху вниз — крыша, багажник (а не антенна или плавник)
    const ray = new THREE.Raycaster(), meshes = []; group.traverse(function(o) { if (o.isMesh && o.visible !== false) meshes.push(o); });
    const surf = function(x, z, fb) { ray.set(new THREE.Vector3(x, bb.max.y + 1, z), new THREE.Vector3(0, -1, 0)); const h = ray.intersectObjects(meshes, false)[0]; return h ? h.point.y : fb; };
    const y1 = bb.max.y, hw = d.W ? d.W / 2 : Math.max(-bb.min.x, bb.max.x), zF = d.L ? -d.L / 2 : bb.min.z, zR = d.L ? d.L / 2 : bb.max.z;
    const black = mat(0x141414, { metalness: 0.6, roughness: 0.45 }), chrome = mat(0xd0d3da, { metalness: 0.85, roughness: 0.2 });
    const gold = mat(0xf2c033, { metalness: 0.85, roughness: 0.25 }), paint = bodyMat || mat(0xcc2200);
    const lamp = mat(0xfff2b0, { emissive: 0xffd060, emissiveIntensity: 1.2 });
    const parts = {};
    const G = function(id) { const g = new THREE.Group(); g.visible = false; g.name = 'tune_' + id; group.add(g); parts[id] = g; return g; };
    const box = function(g, m, w, h, l, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m); b.position.set(x, y, z); g.add(b); return b; };
    const cyl = function(g, m, r, h, x, y, z, rx, rz) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), m); c.position.set(x, y, z); c.rotation.set(rx || 0, 0, rz || 0); g.add(c); return c; };
    const ball = function(g, m, r, x, y, z) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), m); s.position.set(x, y, z); g.add(s); return s; };
    const wheels = d.wheels || [];
    const rearW = wheels.filter(function(w) { return w[2] > 0; }), frontW = wheels.filter(function(w) { return w[2] < 0; });
    const yRear = Math.min(y1 - 0.08, (d.Y || 0.42) + 0.3); // высота «багажника» сзади
    const rearTop = rearW.length ? rearW[0][1] + rearW[0][3] : 0.5; // верх заднего колеса (мотоциклы)

    if (kind === 'car') {
        // спойлер — крыло на стойках над багажником
        const yT = surf(0, zR - 0.22, yRear), yRoof = surf(0, 0.05, y1);
        const sp = G('spoiler');
        box(sp, black, hw * 1.6, 0.04, 0.26, 0, yT + 0.2, zR - 0.2);
        [-1, 1].forEach(function(s) { box(sp, black, 0.04, 0.2, 0.08, s * hw * 0.55, yT + 0.1, zR - 0.2); box(sp, paint, 0.03, 0.12, 0.3, s * hw * 0.8, yT + 0.24, zR - 0.2); });
        const sk = G('skirts');
        [-1, 1].forEach(function(s) { box(sk, black, 0.06, 0.08, Math.abs(zR - zF) * 0.42, s * (hw + 0.01), 0.17, 0); });
        const ex = G('exhaust');
        [-0.22, -0.36].forEach(function(x) { cyl(ex, chrome, 0.05, 0.22, x, 0.2, zR + 0.04, Math.PI / 2); });
        const rr = G('roof_rack');
        [-1, 1].forEach(function(s) { box(rr, black, 0.04, 0.04, 0.8, s * hw * 0.42, yRoof + 0.05, 0.05); });
        [-0.25, 0.3].forEach(function(z) { box(rr, black, hw * 0.9, 0.03, 0.04, 0, yRoof + 0.07, z); });
        box(G('lip'), black, hw * 1.7, 0.05, 0.12, 0, 0.13, zF - 0.02);
        const an = G('antenna');
        cyl(an, black, 0.008, 0.7, hw * 0.65, surf(hw * 0.65, zR - 0.35, yRear) + 0.35, zR - 0.35);
        const fg = G('fog');
        [-1, 1].forEach(function(s) { ball(fg, lamp, 0.06, s * hw * 0.6, 0.24, zF - 0.01); });
    } else if (kind === 'bike' || kind === 'trike') {
        const seatZ = rearW.length ? rearW[0][2] - 0.15 : zR * 0.4, wR = kind === 'trike' ? hw * 0.8 : 0.16;
        // спинка-дуга за сиденьем (как у чопперов)
        const sp = G('spoiler');
        [-1, 1].forEach(function(s) { cyl(sp, chrome, 0.018, 0.5, s * 0.13, yRear + 0.2, seatZ + 0.28, -0.25); });
        cyl(sp, chrome, 0.018, 0.28, 0, yRear + 0.44, seatZ + 0.34, 0, Math.PI / 2);
        box(sp, black, 0.24, 0.14, 0.04, 0, yRear + 0.3, seatZ + 0.31);
        // дуги безопасности по бокам у двигателя
        const sk = G('skirts');
        [-1, 1].forEach(function(s) { cyl(sk, chrome, 0.02, 0.36, s * (kind === 'trike' ? 0.32 : 0.24), 0.3, (frontW.length ? frontW[0][2] : zF) + 0.45, 0, s * 0.2); });
        // прямоток — длинная труба справа назад
        const ex = G('exhaust');
        cyl(ex, chrome, 0.04, 0.8, wR + 0.06, 0.26, seatZ + 0.15, Math.PI / 2 - 0.08);
        ball(ex, black, 0.035, wR + 0.06, 0.29, seatZ + 0.55);
        // кофр сзади
        box(G('roof_rack'), paint, kind === 'trike' ? 0.6 : 0.34, 0.24, 0.3, 0, rearTop + 0.16, Math.min(zR - 0.18, seatZ + 0.5)); // стоит на заднем крыле
        // ветровик — тонированное стекло спереди
        const lp = G('lip');
        const ws = box(lp, mat(0x335577, { transparent: true, opacity: 0.55, metalness: 0.6, roughness: 0.1 }), 0.36, 0.3, 0.02, 0, Math.min(y1 + 0.08, 1.1), zF + 0.42);
        ws.rotation.x = -0.35;
        // флажок на штыре
        const an = G('antenna');
        cyl(an, black, 0.008, 0.6, -(wR * 0.6 + 0.08), rearTop + 0.4, seatZ + 0.5);
        box(an, mat(0xff3030, { metalness: 0.1, roughness: 0.7 }), 0.01, 0.12, 0.2, -(wR * 0.6 + 0.08), rearTop + 0.64, seatZ + 0.6);
        // доп. фары по бокам вилки
        const fg = G('fog');
        [-1, 1].forEach(function(s) { ball(fg, lamp, 0.05, s * 0.14, 0.62, zF + 0.32); });
    } else if (kind === 'chariot') {
        const sp = G('spoiler'); // жемчужины на золотых столбиках по задним углам
        [-1, 1].forEach(function(s) { cyl(sp, gold, 0.025, 0.5, s * hw * 0.55, 0.9, zR - 0.15); ball(sp, mat(0xfff4f0, { metalness: 0.4, roughness: 0.15 }), 0.09, s * hw * 0.55, 1.2, zR - 0.15); });
        const sk = G('skirts');
        [-1, 1].forEach(function(s) { box(sk, gold, 0.05, 0.08, 0.9, s * (hw * 0.6), 0.72, 0.3); });
        const ex = G('exhaust');
        [[0, 0.5, 0.15], [0.12, 0.62, 0.35], [-0.1, 0.75, 0.55]].forEach(function(p) { ball(ex, mat(0xaee8ff, { transparent: true, opacity: 0.6, metalness: 0.1, roughness: 0.05 }), 0.06, p[0], p[1], zR + p[2]); });
        const rr = G('roof_rack');
        box(rr, mat(0x6a3b17, { metalness: 0.1, roughness: 0.8 }), 0.34, 0.2, 0.24, 0.25, 0.75, zR - 0.25); ball(rr, mat(0xfff4f0, { metalness: 0.4, roughness: 0.2 }), 0.05, 0.25, 0.88, zR - 0.25);
        ball(G('lip'), gold, 0.08, 0, 0.75, zF + 0.1);
        const rm = G('rims');
        wheels.forEach(function(w) { const c = cyl(rm, gold, w[3] * 0.75, (w[4] || 0.1) + 0.03, w[0], w[1], w[2], 0, Math.PI / 2); c.geometry = new THREE.TorusGeometry(w[3] * 0.85, 0.03, 8, 20); c.rotation.set(0, Math.PI / 2, 0); });
        const an = G('antenna');
        cyl(an, gold, 0.01, 0.9, -0.3, 1.15, zR - 0.2); box(an, mat(0x2266ff, { metalness: 0.1, roughness: 0.7 }), 0.01, 0.14, 0.24, -0.3, 1.5, zR - 0.08);
        const fg = G('fog');
        [-1, 1].forEach(function(s) { ball(fg, mat(0x99ffee, { emissive: 0x44ffdd, emissiveIntensity: 1.2 }), 0.06, s * 0.35, 0.95, zR - 0.05); });
    } else { // ковёр-самолёт
        const top = (d.Y || 0.45) + 0.06;
        cyl(G('spoiler'), mat(0xb02a5a, { metalness: 0.05, roughness: 0.9 }), 0.1, 0.9, 0, top + 0.08, zR - 0.3, 0, Math.PI / 2); // подушка-валик сзади
        const sk = G('skirts'); // золотые борта вдоль длинных краёв
        [-1, 1].forEach(function(s) { box(sk, gold, 0.03, 0.05, (d.L || 2.3) * 0.86, s * (hw - 0.03), top + 0.03, 0); });
        const ex = G('exhaust'); // шлейф искр
        [0.2, 0.45, 0.75].forEach(function(z, i) { ball(ex, mat(0xffe680, { emissive: 0xffc030, emissiveIntensity: 1.4 }), 0.05 - i * 0.01, (i - 1) * 0.15, top + 0.05, zR + z); });
        const rr = G('roof_rack'); // сундук
        box(rr, mat(0x6a3b17, { metalness: 0.1, roughness: 0.8 }), 0.36, 0.24, 0.26, 0.35, top + 0.12, zR - 0.45); box(rr, gold, 0.38, 0.04, 0.28, 0.35, top + 0.25, zR - 0.45);
        box(G('lip'), gold, hw * 1.9, 0.02, 0.06, 0, top - 0.02, zF + 0.02); // золотая кайма
        const rm = G('rims'); // узор-медальон
        const md = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24), gold); md.rotation.x = Math.PI / 2; md.position.set(0, top, -0.15); rm.add(md);
        const an = G('antenna');
        cyl(an, gold, 0.01, 0.7, -0.4, top + 0.35, zR - 0.2); box(an, mat(0x22aa55, { metalness: 0.1, roughness: 0.7 }), 0.01, 0.12, 0.2, -0.4, top + 0.62, zR - 0.1);
        const fg = G('fog'); // фонарики на углах
        [[-1, -1], [1, -1]].forEach(function(p) { ball(fg, mat(0xffcc66, { emissive: 0xffaa30, emissiveIntensity: 1.3 }), 0.06, p[0] * (hw - 0.05), top + 0.1, zF + 0.12); });
    }
    // литьё — золотые диски на колёсах (машины, мотоциклы, трайк)
    if (!parts.rims) {
        const rm = G('rims');
        wheels.forEach(function(w) {
            const side = w[0] === 0 ? [-1, 1] : [Math.sign(w[0])];
            side.forEach(function(s) { const c = cyl(rm, gold, w[3] * 0.66, 0.02, w[0] + s * ((w[4] || 0.2) / 2 + 0.03), w[1], w[2], 0, Math.PI / 2); c.userData.rim = true; }); // снаружи родного диска
        });
    }
    G('xenon'); // ксенон — цвет фар (dressCar), отдельной детали нет
    group.traverse(function(o) { if (o.isMesh && o.name === '' && o.parent && /^tune_/.test(o.parent.name)) o.castShadow = true; });
    return parts;
}
