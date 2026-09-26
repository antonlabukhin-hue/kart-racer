/**
 * Постановочные участки трассы: провалы под трамплинами, конструкции, с которых падают обломки,
 * предупреждающие знаки. Только меши и данные — логика столкновений в main.js (initGame).
 *
 * Почему так (мировая практика раннеров и аркадных гонок):
 * - опасность должна быть обоснована миром и видна заранее: у обломков есть источник
 *   (эстакада / кран / магнит), у трамплина есть причина — разлом дороги перед ним;
 * - «научи → проверь → усложни»: на лёгкой разлом перекрыт трамплинами во всех полосах
 *   (зрелищный прыжок без риска), на средней — в двух, на сложной — в одной;
 * - телеграф: знак за ~70 ед., стрелки к трамплину, мигающие маячки на краю разлома.
 */
import * as THREE from 'three';

/** Цвет «дна» разлома по карте/теме */
export function gapStyle(mapId, isSnow) {
    if (isSnow) return { floor: 0x0d2233, glow: 0x3a8acc, name: 'полынья' };
    if (mapId === 'promzona') return { floor: 0x0a1a08, glow: 0x44ff33, name: 'кислотная траншея' };
    if (mapId === 'svalka') return { floor: 0x1a0c06, glow: 0xff6622, name: 'горящая яма' };
    return { floor: 0x061018, glow: 0x2a6a8a, name: 'размыв' };
}

/** Сколько полос перекрыто трамплинами перед разломом */
export function gapRampLanes(difficulty) {
    if (difficulty === 'hard') return 1;
    if (difficulty === 'medium') return 2;
    return 3;
}

const _texCache = {};
function signTexture(lines, bg, fg) {
    const key = lines.join('|') + bg + fg;
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
    cx.font = 'bold ' + h + 'px Arial, sans-serif';
    const widest = Math.max.apply(null, lines.map(function(t) { return cx.measureText(t).width; }));
    if (widest > 224) { h = Math.floor(h * 224 / widest); cx.font = 'bold ' + h + 'px Arial, sans-serif'; }
    lines.forEach(function(t, i) { cx.fillText(t, 128, 80 + (i - (lines.length - 1) / 2) * (h + 6)); });
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
        new THREE.PlaneGeometry(1.7, 1.06),
        new THREE.MeshBasicMaterial({ map: signTexture(lines, opts.bg || '#ffcc00', opts.fg || '#111111'), side: THREE.DoubleSide })
    );
    board.position.set(0, 2.2, 0.05);
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

/**
 * Конструкция над дорогой — источник падающих обломков.
 *  arsenev: треснувшая эстакада (куски бетона);
 *  snow:    та же эстакада в сосульках;
 *  promzona: портальный кран с тележкой и крюком (бочки, листы);
 *  svalka:  кран-магнит с подвешенным хламом.
 * Возвращает группу; userData.dropY — высота, с которой падает обломок,
 * userData.trolley — подвижная часть (кран ездит над полосами).
 */
export function createDebrisSource(kind, trackWidth, z) {
    const g = new THREE.Group();
    const span = trackWidth + 3.4;
    const concrete = new THREE.MeshLambertMaterial({ color: kind === 'snow' ? 0xb8c4cc : 0x8a8a86 });
    const steel = new THREE.MeshLambertMaterial({ color: kind === 'svalka' ? 0x6a4a2a : 0xd8a020 });
    if (kind === 'arsenev' || kind === 'snow') {
        [-span / 2, span / 2].forEach(function(x) {
            const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4.4, 0.9), concrete);
            p.position.set(x, 2.2, z);
            g.add(p);
        });
        const deck = new THREE.Mesh(new THREE.BoxGeometry(span + 1.2, 0.6, 5), concrete);
        deck.position.set(0, 4.7, z);
        g.add(deck);
        // ограждение и трещины
        const rail = new THREE.Mesh(new THREE.BoxGeometry(span + 1.2, 0.35, 0.12), new THREE.MeshLambertMaterial({ color: 0x5a5a5a }));
        rail.position.set(0, 5.15, z + 2.45);
        g.add(rail);
        const crackMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
        for (let i = 0; i < 5; i++) {
            const c = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 1.2 + Math.random()), crackMat);
            c.position.set(-span / 2 + 1 + i * span / 5, 4.39, z + (Math.random() - 0.5) * 2);
            c.rotation.y = (Math.random() - 0.5) * 1.2;
            g.add(c);
        }
        if (kind === 'snow') {
            const ice = new THREE.MeshLambertMaterial({ color: 0xd8f0ff, emissive: 0x335577, emissiveIntensity: 0.3 });
            for (let i = 0; i < 12; i++) {
                const ic = new THREE.Mesh(new THREE.ConeGeometry(0.1 + Math.random() * 0.08, 0.5 + Math.random() * 0.6, 5), ice);
                ic.rotation.x = Math.PI;
                ic.position.set(-span / 2 + 0.6 + i * (span - 1.2) / 11, 4.1, z + 2.2);
                g.add(ic);
            }
        } else {
            // торчащая арматура снизу
            const rebar = new THREE.MeshLambertMaterial({ color: 0x8a4a22 });
            for (let i = 0; i < 6; i++) {
                const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 4), rebar);
                r.position.set(-span / 2 + 1 + i * (span - 2) / 5, 4.1, z + (Math.random() - 0.5) * 3);
                r.rotation.z = (Math.random() - 0.5) * 0.8;
                g.add(r);
            }
        }
        g.userData.dropY = 4.2;
    } else {
        // портальный кран: две ноги, балка, тележка с тросом
        [-span / 2, span / 2].forEach(function(x) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 6.4, 0.35), steel);
            leg.position.set(x, 3.2, z);
            g.add(leg);
            const brace = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 0.12), steel);
            brace.position.set(x, 1.8, z + 0.8);
            brace.rotation.x = 0.5;
            g.add(brace);
        });
        const beam = new THREE.Mesh(new THREE.BoxGeometry(span + 0.8, 0.5, 0.7), steel);
        beam.position.set(0, 6.4, z);
        g.add(beam);
        // косые полосы на балке
        const hazard = new THREE.MeshBasicMaterial({ color: 0x111111 });
        for (let i = 0; i < 8; i++) {
            const s = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.52, 0.02), hazard);
            s.position.set(-span / 2 + 0.6 + i * (span - 1.2) / 7, 6.4, z + 0.36);
            s.rotation.z = 0.6;
            g.add(s);
        }
        const trolley = new THREE.Group();
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.9), new THREE.MeshLambertMaterial({ color: 0x3a3a40 }));
        box.position.y = 5.95;
        trolley.add(box);
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 4), new THREE.MeshLambertMaterial({ color: 0x222222 }));
        cable.position.y = 4.95;
        trolley.add(cable);
        if (kind === 'svalka') {
            const magnet = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 16), new THREE.MeshLambertMaterial({ color: 0x2a2a2e }));
            magnet.position.y = 4.1;
            trolley.add(magnet);
            const junk = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.5), new THREE.MeshLambertMaterial({ color: 0x7a3a22 }));
            junk.position.y = 3.8;
            junk.rotation.y = 0.4;
            trolley.add(junk);
        } else {
            const hook = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 10, Math.PI * 1.4), new THREE.MeshLambertMaterial({ color: 0xcc8800 }));
            hook.position.y = 3.95;
            trolley.add(hook);
        }
        trolley.position.z = z;
        g.add(trolley);
        g.userData.trolley = trolley;
        g.userData.dropY = 3.9;
    }
    return g;
}

/**
 * Куда ставить участки по ходу трассы (доля пути 0..1).
 * Ритм: спокойный старт → разлом → босс (0.42–0.7) → опасный участок → финальный разлом → спринт.
 */
export const SETPIECE_LAYOUT = {
    gaps: [0.27, 0.84],
    debrisZones: [0.17, 0.6, 0.93]
};
