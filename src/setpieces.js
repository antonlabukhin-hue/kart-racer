/**
 * Постановочные участки трассы: провалы под трамплинами, конструкции, с которых падают обломки,
 * предупреждающие знаки. Только меши и данные — логика столкновений в main.js (initGame).
 *
 * Почему так (мировая практика раннеров и аркадных гонок):
 * - опасность обоснована миром и видна заранее: трамплин стоит только там, где дорогу
 *   перерезал разлом (во всю ширину, трамплин — в одной полосе: объехал — провалился);
 *   падает то, что висит на арке над дорогой (как сосульки), и видно, что именно упадёт;
 * - «научи → проверь → усложни»: на лёгкой 2 разлома, на средней и сложной — 3;
 * - телеграф: знак со схемой полос за ~70 ед., стрелки к трамплину, маячки на краю,
 *   предмет на арке раскачивается перед падением + жёлтое кольцо на асфальте.
 */
import * as THREE from 'three';

/** Цвет «дна» разлома по карте/теме */
export function gapStyle(mapId, isSnow) {
    if (isSnow) return { floor: 0x0d2233, glow: 0x66c8ff, name: 'полынья' };
    if (mapId === 'promzona') return { floor: 0x0a1a08, glow: 0x44ff33, name: 'кислотная траншея' };
    if (mapId === 'svalka') return { floor: 0x1a0c06, glow: 0xff6622, name: 'горящая яма' };
    return { floor: 0x061018, glow: 0x33a8d8, name: 'размыв' };
}

/** Где по ходу трассы разломы (доля пути): на лёгкой два, дальше — три */
export function gapLayout(difficulty) {
    return difficulty === 'easy' ? [0.27, 0.84] : [0.23, 0.34, 0.84];
}

const _texCache = {};
function signTexture(lines, bg, fg, laneMark) {
    const key = lines.join('|') + bg + fg + (laneMark == null ? '' : 'L' + laneMark);
    if (_texCache[key]) return _texCache[key];
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 160;
    const cx = cv.getContext('2d');
    cx.fillStyle = bg;
    cx.fillRect(0, 0, 256, 160);
    cx.strokeStyle = fg;
    cx.lineWidth = 10;
    cx.strokeRect(6, 6, 244, 148);
    cx.fillStyle = fg;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    // шрифт подбирается под самую длинную строку, чтобы текст не обрезался краем щита
    let h = lines.length > 2 ? 34 : 42;
    // схема трёх полос: трамплин — зелёная стрелка, остальные — провал
    let textBottom = 160;
    if (laneMark != null) {
        textBottom = 96;
        for (let i = 0; i < 3; i++) {
            const x0 = 40 + i * 62;
            cx.fillStyle = i === laneMark ? '#1a8a2a' : '#222222';
            cx.fillRect(x0, 100, 52, 48);
            cx.fillStyle = '#ffffff';
            cx.font = 'bold 36px Arial, sans-serif';
            cx.fillText(i === laneMark ? '↑' : '✕', x0 + 26, 126);
        }
        cx.fillStyle = fg;
        h = 34;
    }
    cx.font = 'bold ' + h + 'px Arial, sans-serif';
    const widest = Math.max.apply(null, lines.map(function(t) { return cx.measureText(t).width; }));
    if (widest > 224) { h = Math.floor(h * 224 / widest); cx.font = 'bold ' + h + 'px Arial, sans-serif'; }
    const midY = textBottom / 2;
    lines.forEach(function(t, i) { cx.fillText(t, 128, midY + (i - (lines.length - 1) / 2) * (h + 6)); });
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    _texCache[key] = tex;
    return tex;
}

/** Знак у обочины: щит на столбе, повёрнут к игроку (+z) */
export function createRoadSign(lines, x, z, opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), new THREE.MeshLambertMaterial({ color: 0x9a9aa0 }));
    pole.position.y = 1.1;
    g.add(pole);
    const board = new THREE.Mesh(
        new THREE.PlaneGeometry(opts.big ? 2.4 : 1.7, opts.big ? 1.5 : 1.06),
        new THREE.MeshBasicMaterial({ map: signTexture(lines, opts.bg || '#ffcc00', opts.fg || '#111111', opts.laneMark), side: THREE.DoubleSide })
    );
    board.position.set(0, opts.big ? 2.6 : 2.2, 0.05);
    if (opts.big) pole.scale.y = 1.2;
    g.add(board);
    g.position.set(x, 0, z);
    g.rotation.y = x > 0 ? -0.25 : 0.25; // чуть к дороге — читается издалека
    return g;
}

/**
 * Разлом поперёк всей дороги: тёмное «дно», рваные края асфальта, маячки.
 * zNear — ближний к игроку край (игрок едет в сторону уменьшения z), len — длина по z.
 */
export function createGapMesh(trackWidth, zNear, len, style) {
    const g = new THREE.Group();
    const w = trackWidth + 1.2;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshBasicMaterial({ color: style.floor }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.03, zNear - len / 2);
    g.add(floor);
    // «глубина»: светящаяся полоса по центру (вода / кислота / огонь)
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, len * 0.45),
        new THREE.MeshBasicMaterial({ color: style.glow, transparent: true, opacity: 0.55 }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(0, 0.035, zNear - len / 2);
    glow.userData.gapGlow = true;
    g.add(glow);
    // рваные края: куски асфальта, свисающие в разлом
    const chunkMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3e });
    const rebarMat = new THREE.MeshLambertMaterial({ color: 0x8a4a22 });
    [zNear, zNear - len].forEach(function(edgeZ, side) {
        const dir = side === 0 ? -1 : 1; // внутрь разлома
        for (let i = 0; i < 9; i++) {
            const x = -w / 2 + 0.4 + i * (w - 0.8) / 8 + (Math.random() - 0.5) * 0.3;
            const ch = new THREE.Mesh(new THREE.BoxGeometry(0.5 + Math.random() * 0.4, 0.1, 0.35 + Math.random() * 0.4), chunkMat);
            ch.position.set(x, 0.02, edgeZ + dir * (0.1 + Math.random() * 0.25));
            ch.rotation.set(dir * (0.15 + Math.random() * 0.2), Math.random() * 0.4, (Math.random() - 0.5) * 0.2);
            g.add(ch);
            if (i % 3 === 1) {
                const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 4), rebarMat);
                rb.position.set(x + 0.2, 0.1, edgeZ + dir * 0.35);
                rb.rotation.x = Math.PI / 2 + dir * 0.5;
                g.add(rb);
            }
        }
    });
    // мигающие маячки по краям дороги у ближнего края
    const beacons = [];
    [-w / 2 - 0.1, w / 2 + 0.1].forEach(function(x) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 0.18), new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
        post.position.set(x, 0.45, zNear + 0.4);
        g.add(post);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff8800 }));
        lamp.position.set(x, 0.98, zNear + 0.4);
        g.add(lamp);
        beacons.push(lamp);
    });
    // светящиеся кромки — разлом читается полосой издалека, а не только вблизи
    [zNear, zNear - len].forEach(function(edgeZ) {
        const edge = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.28), new THREE.MeshBasicMaterial({ color: style.glow }));
        edge.rotation.x = -Math.PI / 2;
        edge.position.set(0, 0.04, edgeZ);
        g.add(edge);
    });
    g.userData.beacons = beacons;
    g.userData.glow = glow;
    return g;
}

/** Жёлтые стрелки на асфальте, ведущие к трамплину (за 10–40 ед. до него) */
export function createLaneChevrons(x, zFrom, count) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0.85 });
    for (let i = 0; i < count; i++) {
        const shape = new THREE.Shape();
        shape.moveTo(-0.45, 0); shape.lineTo(0, 0.45); shape.lineTo(0.45, 0);
        shape.lineTo(0.45, -0.2); shape.lineTo(0, 0.25); shape.lineTo(-0.45, -0.2);
        const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(x, 0.025, zFrom - i * 3.2);
        g.add(m);
    }
    return g;
}

/** Что висит на арке и падает — своё на каждой трассе */
const HANGERS = {
    arsenev: ['chunk', 'lamp', 'chunk'],
    snow: ['icicles', 'icicles', 'icicles'],
    promzona: ['barrel', 'barrelBlue', 'barrel'],
    svalka: ['tire', 'fridge', 'tire']
};
function makeHanger(kind) {
    const g = new THREE.Group();
    let h = 0.6; // высота предмета: низ висит на -h от точки подвеса
    if (kind === 'icicles') {
        const ice = new THREE.MeshLambertMaterial({ color: 0xd8f0ff, emissive: 0x335577, emissiveIntensity: 0.35 });
        [[0, 0.9, 0.16], [-0.22, 0.6, 0.11], [0.2, 0.7, 0.12], [0.08, 0.45, 0.08]].forEach(function(c) {
            const m = new THREE.Mesh(new THREE.ConeGeometry(c[2], c[1], 6), ice);
            m.rotation.x = Math.PI;
            m.position.set(c[0], -c[1] / 2, 0);
            g.add(m);
        });
        h = 0.9;
    } else if (kind === 'barrel' || kind === 'barrelBlue') {
        const col = kind === 'barrel' ? 0xd8a020 : 0x2a5aaa;
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.75, 12), new THREE.MeshLambertMaterial({ color: col }));
        m.position.y = -0.375;
        g.add(m);
        [0.2, 0.55].forEach(function(y) {
            const r = new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.03, 4, 16), new THREE.MeshLambertMaterial({ color: 0x333333 }));
            r.rotation.x = Math.PI / 2;
            r.position.y = -y;
            g.add(r);
        });
        if (kind === 'barrel') {
            const sym = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.02), new THREE.MeshBasicMaterial({ color: 0x111111 }));
            sym.position.set(0, -0.38, 0.345);
            sym.rotation.z = Math.PI / 4;
            g.add(sym);
        }
        h = 0.75;
    } else if (kind === 'tire') {
        const m = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.14, 8, 16), new THREE.MeshLambertMaterial({ color: 0x1a1a1c }));
        m.position.y = -0.46;
        g.add(m);
        h = 0.92;
    } else if (kind === 'fridge') {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.95, 0.55), new THREE.MeshLambertMaterial({ color: 0xe8e4d8 }));
        m.position.y = -0.475;
        m.rotation.z = 0.12;
        g.add(m);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.05), new THREE.MeshLambertMaterial({ color: 0x888888 }));
        handle.position.set(0.22, -0.35, 0.29);
        g.add(handle);
        const rust = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.01), new THREE.MeshLambertMaterial({ color: 0x8a4a22 }));
        rust.position.set(-0.1, -0.8, 0.28);
        g.add(rust);
        h = 0.95;
    } else if (kind === 'lamp') {
        // оборванный уличный фонарь с советским плафоном
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), new THREE.MeshLambertMaterial({ color: 0x555a5a }));
        pole.position.y = -0.3;
        g.add(pole);
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 0.22, 10), new THREE.MeshLambertMaterial({ color: 0x3a4a3a }));
        shade.position.y = -0.7;
        g.add(shade);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
        bulb.position.y = -0.82;
        g.add(bulb);
        h = 0.9;
    } else {
        // кусок бетона на арматуре
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.6), new THREE.MeshLambertMaterial({ color: 0x8a8a86 }));
        m.position.y = -0.4;
        m.rotation.set(0.2, 0.3, 0.15);
        g.add(m);
        const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 4), new THREE.MeshLambertMaterial({ color: 0x8a4a22 }));
        rb.position.set(0.15, 0, 0);
        g.add(rb);
        h = 0.7;
    }
    // крупнее, чем «по жизни»: предмет должен читаться с 50+ единиц
    const k = 1.35;
    g.scale.setScalar(k);
    g.userData.height = h * k;
    return g;
}

/**
 * Арка над дорогой; над каждой полосой на ней что-то висит — оно и падает (как сосулька).
 *  arsenev — треснувший бетонный путепровод: куски бетона на арматуре, оборванный фонарь;
 *  snow — тот же путепровод в сосульках;
 *  promzona — стальная ферма в «зебре», бочки на цепях;
 *  svalka — арка из металлолома, покрышки и старый холодильник.
 * userData.hangers[i] = { mesh, x } по laneXs.
 */
export function createDebrisSource(kind, trackWidth, z, laneXs) {
    const g = new THREE.Group();
    const span = trackWidth + 3.4;
    const topY = 5.2;
    const concrete = new THREE.MeshLambertMaterial({ color: kind === 'snow' ? 0xb8c4cc : 0x8a8a86 });
    const steel = new THREE.MeshLambertMaterial({ color: kind === 'svalka' ? 0x6a4a2a : 0xd8a020 });
    const legMat = (kind === 'arsenev' || kind === 'snow') ? concrete : steel;
    [-span / 2, span / 2].forEach(function(x) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.7, topY, 0.9), legMat);
        leg.position.set(x, topY / 2, z);
        g.add(leg);
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(span + 1.2, 0.7, kind === 'promzona' ? 1.0 : 2.6), legMat);
    beam.position.set(0, topY + 0.35, z);
    g.add(beam);
    if (kind === 'promzona') {
        const hazard = new THREE.MeshBasicMaterial({ color: 0x111111 });
        for (let i = 0; i < 9; i++) {
            const st = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.02), hazard);
            st.position.set(-span / 2 + 0.5 + i * (span - 1) / 8, topY + 0.35, z + 0.51);
            st.rotation.z = 0.6;
            g.add(st);
        }
    } else if (kind === 'svalka') {
        const junk = new THREE.MeshLambertMaterial({ color: 0x7a3a22 });
        for (let i = 0; i < 6; i++) {
            const j = new THREE.Mesh(new THREE.BoxGeometry(0.5 + Math.random() * 0.5, 0.35, 0.5), junk);
            j.position.set(-span / 2 + 0.8 + i * (span - 1.6) / 5, topY + 0.85, z + (Math.random() - 0.5));
            j.rotation.set(Math.random() * 0.4, Math.random(), Math.random() * 0.4);
            g.add(j);
        }
    } else {
        const crackMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
        for (let i = 0; i < 5; i++) {
            const c = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 1.2 + Math.random()), crackMat);
            c.position.set(-span / 2 + 1 + i * span / 5, topY - 0.01, z + (Math.random() - 0.5) * 1.6);
            c.rotation.y = (Math.random() - 0.5) * 1.2;
            g.add(c);
        }
        if (kind === 'snow') {
            // мелкие сосульки по всей кромке — «опасные» над полосами крупнее
            const ice = new THREE.MeshLambertMaterial({ color: 0xd8f0ff, emissive: 0x335577, emissiveIntensity: 0.3 });
            for (let i = 0; i < 14; i++) {
                const ic = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3 + Math.random() * 0.2, 5), ice);
                ic.rotation.x = Math.PI;
                ic.position.set(-span / 2 + 0.4 + i * (span - 0.8) / 13, topY - 0.2, z + 1.2);
                g.add(ic);
            }
        }
    }
    const list = HANGERS[kind] || HANGERS.arsenev;
    const chainMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const hangers = [];
    const chainLen = kind === 'snow' ? 0 : 0.9;
    (laneXs || [-trackWidth * 0.28, 0, trackWidth * 0.28]).forEach(function(x, i) {
        const item = makeHanger(list[i % list.length]);
        if (chainLen > 0) {
            const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, chainLen, 4), chainMat);
            chain.position.set(x, topY - chainLen / 2, z);
            g.add(chain);
        }
        item.position.set(x, topY - chainLen, z);
        g.add(item);
        hangers.push({ mesh: item, x: x });
    });
    g.userData.hangers = hangers;
    return g;
}

/**
 * Куда ставить участки по ходу трассы (доля пути 0..1).
 * Ритм: спокойный старт → разлом → босс (0.42–0.7) → опасный участок → финальный разлом → спринт.
 */
export const SETPIECE_LAYOUT = {
    debrisZones: [0.14, 0.6, 0.93]
};

/**
 * Конусы перед разломом в полосах без трамплина — «сюда нельзя». Не преграда: сбитый конус
 * отлетает (main.js), машина едет дальше — прямо в разлом. userData.cones[] = { mesh, x, z }.
 */
export function createGapCones(laneXs, rampLane, zNear) {
    const g = new THREE.Group();
    const coneMat = new THREE.MeshLambertMaterial({ color: 0xff6a00 });
    const bandMat = new THREE.MeshBasicMaterial({ color: 0xf4f4f4 });
    const cones = [];
    laneXs.forEach(function(x, li) {
        if (li === rampLane) return;
        [-0.55, 0, 0.55].forEach(function(dx) {
            const cone = new THREE.Group();
            const c = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 10), coneMat);
            c.position.y = 0.3;
            cone.add(c);
            const b = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.135, 0.09, 10), bandMat);
            b.position.y = 0.34;
            cone.add(b);
            const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), coneMat);
            base.position.y = 0.02;
            cone.add(base);
            cone.position.set(x + dx, 0, zNear + 1.2);
            g.add(cone);
            cones.push({ mesh: cone, x: x + dx, z: zNear + 1.2, hit: false, vel: null, t: 0 });
        });
    });
    g.userData.cones = cones;
    return g;
}
