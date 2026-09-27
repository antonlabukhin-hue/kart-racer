/**
 * Сцена на каждую карту — запоминающийся момент трассы (как поезд в Mario Kart «Kalimari Desert»):
 *  arsenev  — железнодорожный переезд: мигают огни, опускаются шлагбаумы, проходит поезд.
 *             Рассчитан так, что на обычной скорости хвост уходит перед носом машины (эффектно,
 *             но безопасно); на нитро прилетаешь раньше — в состав. Риск против награды.
 *  promzona — паровые трубы: из вентилей поперёк полосы бьёт пар (шипение и пыхтение — телеграф).
 *  svalka   — горящие шины скатываются с куч хлама через дорогу.
 * Модуль не знает про игру: update(ctx) получает положение машины и возвращает попадание
 * { kind, strike, timePenalty, speedMul, text } — main.js применяет его сам.
 */
import * as THREE from 'three';

export const MAP_EVENT_AT = 0.72; // доля трассы: между аркой (0.6) и последним разломом (0.84)

function lambert(c, extra) { return new THREE.MeshLambertMaterial(Object.assign({ color: c }, extra || {})); }

// ---------------------------------------------------------------- переезд
function createCrossing(trackWidth, z0) {
    const g = new THREE.Group();
    const hw = trackWidth / 2;
    // шпалы и рельсы поперёк дороги
    const sleeperMat = lambert(0x4a3a2a), railMat = lambert(0x9a9aa4);
    for (let x = -30; x <= 30; x += 1.2) {
        const sl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 2.6), sleeperMat);
        sl.position.set(x, 0.03, z0);
        g.add(sl);
    }
    [-0.6, 0.6].forEach(function(dz) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(60, 0.1, 0.12), railMat);
        r.position.set(0, 0.08, z0 + dz);
        g.add(r);
    });
    // шлагбаумы и светофоры с двух сторон дороги (перед переездом, со стороны игрока)
    const gates = [], lights = [];
    [-1, 1].forEach(function(side) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.6, 0.25), lambert(0xeeeeee));
        post.position.set(side * (hw + 0.6), 0.8, z0 + 2.4);
        g.add(post);
        const arm = new THREE.Group();
        for (let i = 0; i < 6; i++) {
            const seg = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.1), lambert(i % 2 ? 0xffffff : 0xdd1111));
            seg.position.x = -side * (0.3 + i * 0.55);
            arm.add(seg);
        }
        arm.position.set(side * (hw + 0.6), 1.3, z0 + 2.4);
        arm.rotation.z = side * 1.35; // поднят
        g.add(arm);
        gates.push({ arm: arm, side: side });
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.2), lambert(0x222222));
        head.position.set(side * (hw + 1.4), 2.2, z0 + 2.4);
        g.add(head);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), lambert(0x777777));
        pole.position.set(side * (hw + 1.4), 1.1, z0 + 2.4);
        g.add(pole);
        [-0.18, 0.18].forEach(function(lx, li) {
            const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), new THREE.MeshBasicMaterial({ color: 0x440000 }));
            lamp.position.set(side * (hw + 1.4) + lx, 2.2, z0 + 2.51);
            g.add(lamp);
            lights.push({ mesh: lamp, phase: li });
        });
    });
    // поезд: тепловоз + 3 вагона, едет вдоль x
    const train = new THREE.Group();
    const loco = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.2, 2.3), lambert(0x2a6a3a));
    body.position.y = 1.5; loco.add(body);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.42, 0.25, 2.32), lambert(0xe8c020));
    stripe.position.y = 1.1; loco.add(stripe);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 2.2), lambert(0x1e5a2e));
    cab.position.set(1.7, 3.0, 0); loco.add(cab);
    const headl = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), new THREE.MeshBasicMaterial({ color: 0xfff4c0 }));
    headl.position.set(2.72, 1.9, 0); headl.rotation.y = Math.PI / 2; loco.add(headl);
    train.add(loco);
    const wagonCols = [0x6a3a22, 0x3a4a6a, 0x6a3a22];
    wagonCols.forEach(function(c, i) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.4, 2.3), lambert(c));
        w.position.set(-(i + 1) * 5.9, 1.6, 0);
        train.add(w);
    });
    [0, -5.9, -11.8, -17.7].forEach(function(x) {
        [-1.8, 1.8].forEach(function(wx) {
            const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 2.35, 10), lambert(0x222222));
            wh.rotation.x = Math.PI / 2;
            wh.position.set(x + wx, 0.4, 0);
            train.add(wh);
        });
    });
    train.position.set(-60, 0, z0);
    train.visible = false;
    g.add(train);
    return { group: g, gates: gates, lights: lights, train: train, length: 5.9 * 3 + 5.4 };
}

// ---------------------------------------------------------------- пар
// Магистраль вдоль обочины → вертикальный стояк с вентилем → колено с соплом, смотрящим на дорогу.
// Струя выходит ИЗ сопла и расширяется к своей полосе (раньше начиналась у края дороги, отдельно
// от трубы, слева была развёрнута широким концом к трубе, а вентиль висел в воздухе).
function createSteam(trackWidth, z0, lanes) {
    const g = new THREE.Group();
    const hw = trackWidth / 2;
    const pipeMat = lambert(0x7a6a5a), rustMat = lambert(0x8a4a22), valveMat = lambert(0xcc2222);
    const pipeX = hw + 1.1;
    [-1, 1].forEach(function(side) {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 44, 12), pipeMat);
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(side * pipeX, 0.3, z0 - 12);
        g.add(pipe);
        for (let k = 0; k < 6; k++) { // хомуты и подпорки
            const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 6, 14), rustMat);
            clamp.position.set(side * pipeX, 0.3, z0 + 8 - k * 7);
            g.add(clamp);
        }
    });
    const jets = [];
    const steamMat = function() { return new THREE.MeshBasicMaterial({ color: 0xf0f4f8, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }); };
    lanes.forEach(function(lane, i) {
        const z = z0 - i * 12;
        const side = lane.x < 0 ? -1 : 1;
        // стояк с вентилем
        const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.75, 10), pipeMat);
        riser.position.set(side * pipeX, 0.65, z);
        g.add(riser);
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.04, 6, 14), valveMat);
        wheel.position.set(side * pipeX, 0.72, z + 0.2); // на стояке, лицом к игроку
        g.add(wheel);
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.03), valveMat);
        spoke.position.copy(wheel.position);
        g.add(spoke);
        // колено и сопло к дороге
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), pipeMat);
        elbow.position.set(side * pipeX, 1.02, z);
        g.add(elbow);
        const nozzleX = side * (pipeX - 0.45);
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.5, 10), pipeMat);
        nozzle.rotation.z = side * Math.PI / 2;
        nozzle.position.set(side * (pipeX - 0.22), 1.02, z);
        g.add(nozzle);
        // струя: узкий конец у сопла, широкий — над дальним краем полосы
        const farEdge = lane.x - side * 1.05;
        const len = Math.abs(nozzleX - farEdge);
        const jetGeo = new THREE.CylinderGeometry(0.55, 0.1, len, 14, 1, true);
        const jet = new THREE.Mesh(jetGeo, steamMat());
        jet.rotation.z = side * Math.PI / 2;           // +y цилиндра (широкий конец) → к центру дороги
        jet.position.set(nozzleX - side * len / 2, 0.95, z);
        jet.userData.noOutline = true;
        g.add(jet);
        // облачко у сопла — пыхтит перед выбросом
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), steamMat());
        puff.position.set(nozzleX - side * 0.25, 1.02, z);
        g.add(puff);
        jets.push({ mesh: jet, puff: puff, z: z, x0: Math.min(nozzleX, farEdge), x1: Math.max(nozzleX, farEdge),
            t: i * 0.9, hitDone: false });
    });
    return { group: g, jets: jets };
}

// ---------------------------------------------------------------- шины
function createTires(trackWidth, z0) {
    const g = new THREE.Group();
    const hw = trackWidth / 2;
    const junkMat = [lambert(0x5a4a3a), lambert(0x7a3a22), lambert(0x3a3a40)];
    const tires = [];
    [0, 1, 2].forEach(function(i) {
        const side = i % 2 ? 1 : -1;
        const z = z0 - i * 14;
        // куча хлама у обочины, с которой скатывается шина
        for (let k = 0; k < 6; k++) {
            const j = new THREE.Mesh(new THREE.BoxGeometry(0.8 + Math.random(), 0.5 + Math.random() * 0.8, 0.8 + Math.random()), junkMat[k % 3]);
            j.position.set(side * (hw + 2 + Math.random() * 1.5), 0.3 + Math.random() * 0.6, z + (Math.random() - 0.5) * 2);
            j.rotation.set(Math.random() * 0.5, Math.random(), Math.random() * 0.5);
            g.add(j);
        }
        const tire = new THREE.Group();
        const t = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.18, 8, 16), lambert(0x151515));
        t.rotation.y = Math.PI / 2;
        tire.add(t);
        const fire = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.3, 8), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85 }));
        fire.position.y = 0.75;
        tire.add(fire);
        const core = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.8, 8), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
        core.position.y = 0.55;
        tire.add(core);
        tire.scale.setScalar(1.4); // крупнее — горящая шина читается с 30+ единиц
        tire.position.set(side * (hw + 1.6), 0.84, z);
        g.add(tire);
        tires.push({ mesh: tire, fire: fire, side: side, z: z, x: side * (hw + 1.6), state: 'wait', hitDone: false });
    });
    return { group: g, tires: tires };
}

/**
 * kind: 'arsenev' | 'promzona' | 'svalka'; laneXs — центры полос.
 * Возвращает { group, update(ctx) } ; ctx = { x, z, ups, dt, y, nitro } → попадание или null.
 */
export function createMapEvent(kind, trackWidth, z0, laneXs) {
    if (kind === 'promzona') {
        const order = [0, 2, 1].map(function(i) { return { x: laneXs[i] }; });
        const s = createSteam(trackWidth, z0, order);
        return {
            kind: kind, group: s.group, z: z0,
            update: function(ctx) {
                let hit = null;
                s.jets.forEach(function(j) {
                    // цикл 3.2 с: 1.4 тишина → 0.8 шипение (пыхтит) → 1.0 выброс
                    j.t = (j.t + ctx.dt) % 3.2;
                    const phase = j.t < 1.4 ? 'idle' : j.t < 2.2 ? 'warn' : 'blast';
                    // выброс: струя на всю длину; шипение: пыхтит облачко у сопла
                    j.mesh.material.opacity = phase === 'blast' ? 0.55 + Math.random() * 0.2 : 0;
                    j.puff.material.opacity = phase === 'warn' ? 0.25 + Math.random() * 0.35 : phase === 'blast' ? 0.6 : 0;
                    j.puff.scale.setScalar(phase === 'warn' ? 0.7 + Math.random() * 0.5 : 1.2);
                    j.phase = phase;
                    if (phase !== 'blast') j.hitDone = false;
                    if (phase === 'blast' && !j.hitDone && ctx.y < 0.9 && Math.abs(ctx.z - j.z) < 0.8 && ctx.x > j.x0 - 0.3 && ctx.x < j.x1 + 0.3) {
                        j.hitDone = true;
                        hit = { kind: 'steam', strike: false, timePenalty: 1.5, speedMul: 0.6, text: '♨ Ожог паром!' };
                    }
                });
                return hit;
            },
            debug: s
        };
    }
    if (kind === 'svalka') {
        const s = createTires(trackWidth, z0);
        return {
            kind: kind, group: s.group, z: z0,
            update: function(ctx) {
                let hit = null;
                s.tires.forEach(function(t) {
                    t.fire.scale.y = 0.8 + Math.random() * 0.5;
                    const dist = ctx.z - t.z;
                    // срывается за ~1.1 с до подъезда: к приезду машины катится по дальней от себя
                    // половине дороги — ближняя полоса уже свободна, дальняя под ударом
                    if (t.state === 'wait' && dist > 0 && dist < ctx.ups * 1.1 + 2) t.state = 'roll';
                    if (t.state === 'roll') {
                        t.x -= t.side * 5.5 * ctx.dt;
                        t.mesh.position.x = t.x;
                        t.mesh.children[0].rotation.x -= t.side * 12 * ctx.dt;
                        if (Math.abs(t.x) > trackWidth / 2 + 3 && Math.sign(t.x) !== t.side) { t.state = 'gone'; t.mesh.visible = false; }
                        if (!t.hitDone && ctx.y < 0.7 && Math.abs(ctx.x - t.x) < 0.8 && Math.abs(ctx.z - t.z) < 0.8) {
                            t.hitDone = true;
                            hit = { kind: 'tire', strike: false, timePenalty: 1.5, speedMul: 0.6, text: '🔥 Горящая шина!' };
                        }
                    }
                });
                return hit;
            },
            debug: s
        };
    }
    // arsenev (по умолчанию)
    const c = createCrossing(trackWidth, z0);
    const st = { state: 'idle', t: 0, v: 16.5, hitCd: 0 };
    return {
        kind: 'arsenev', group: c.group, z: z0,
        update: function(ctx) {
            const dist = ctx.z - z0;
            st.hitCd -= ctx.dt;
            if (st.state === 'idle' && dist > 0 && dist < ctx.ups * 3.0 + 6) {
                // голова доходит до края дороги через ~1 с, хвост уходит через ~2.7 с —
                // на крейсерской скорости машина подъезжает сразу за хвостом
                st.state = 'run';
                st.t = 0;
                c.train.visible = true;
                c.train.position.x = -trackWidth / 2 - 0.5 - st.v * 1.0;
            }
            const warn = st.state === 'run' && c.train.position.x - c.length < trackWidth / 2 + 2;
            c.lights.forEach(function(l) {
                const on = warn && Math.floor(performance.now() / 350 + l.phase) % 2 === 0;
                l.mesh.material.color.setHex(on ? 0xff2020 : 0x440000);
            });
            c.gates.forEach(function(gt) {
                const target = warn ? 0 : gt.side * 1.35;
                gt.arm.rotation.z += (target - gt.arm.rotation.z) * Math.min(1, ctx.dt * 4);
            });
            if (st.state !== 'run') return null;
            st.t += ctx.dt;
            c.train.position.x += st.v * ctx.dt;
            const head = c.train.position.x + 2.7, tail = c.train.position.x - c.length + 2.7;
            if (tail > 60) { st.state = 'done'; c.train.visible = false; return null; }
            if (st.hitCd <= 0 && ctx.y < 2.5 && Math.abs(ctx.z - z0) < 1.5 && ctx.x > tail - 0.5 && ctx.x < head + 0.5) {
                st.hitCd = 2.0;
                return { kind: 'train', strike: true, timePenalty: 4, speedMul: 0, text: '🚂 Поезд!', stopAt: z0 + 1.8 };
            }
            return null;
        },
        debug: { crossing: c, st: st }
    };
}
