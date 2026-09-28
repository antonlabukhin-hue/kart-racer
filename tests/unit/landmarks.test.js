import { describe, it, expect } from 'vitest';
import { pickSetpieces, placeFracs, createSetpieceEvent, createLandmark, EVENT_POOL, LANDMARK_POOL } from '../../src/landmarks.js';

const LANES = [-1.5, 0, 1.5];
// машина едет к z0 = 0 (25 ед./с) в полосе x; первое попадание или null
function drive(ev, x, v = 25) {
    let z = 140, hit = null;
    for (let t = 0; t < 10 && !hit && z > -10; t += 1 / 60) { z -= v / 60; hit = ev.update({ x, z, dt: 1 / 60, y: 0, ups: v }); }
    return hit;
}

describe('узнаваемые детали трасс', () => {
    it('в заезде 1–2 события и 2 приметы своей карты, без повторов', () => {
        for (const map of ['arsenev', 'promzona', 'svalka']) {
            for (let i = 0; i < 30; i++) {
                const p = pickSetpieces(map);
                expect(p.events.length).toBeGreaterThanOrEqual(1);
                expect(new Set(p.events).size).toBe(p.events.length);
                p.events.forEach(e => expect(EVENT_POOL[map]).toContain(e));
                expect(p.landmarks.length).toBe(2);
                expect(p.landmarks[0]).not.toBe(p.landmarks[1]);
                p.landmarks.forEach(l => expect(LANDMARK_POOL[map]).toContain(l));
            }
        }
    });

    it('места — вне арены босса и подальше от занятых', () => {
        const busy = [0.2, 0.3, 0.88];
        for (let i = 0; i < 30; i++) {
            placeFracs(2, busy).forEach(f => {
                expect(f < 0.42 || f > 0.82).toBe(true);
                busy.forEach(b => expect(Math.abs(b - f)).toBeGreaterThan(0.055));
            });
        }
    });

    it('ПАЗик перекрывает правую полосу, левая свободна', () => {
        expect(drive(createSetpieceEvent('bus', 6, 0, LANES), 1.5)).toMatchObject({ kind: 'bus', strike: true });
        expect(drive(createSetpieceEvent('bus', 6, 0, LANES), -1.5)).toBeNull();
    });

    it('магнитный кран роняет кузов в свою полосу, соседняя свободна', () => {
        const ev = createSetpieceEvent('magnet', 6, 0, LANES);
        const lane = ev.lane;
        expect(drive(ev, LANES[lane])).toMatchObject({ kind: 'magnet' });
        expect(drive(createSetpieceEvent('magnet', 6, 0, LANES), 99)).toBeNull();
    });

    it('бульдозер сдвигает хлам в крайнюю полосу со своей стороны, другая крайняя свободна', () => {
        const ev = createSetpieceEvent('dozer', 6, 0, LANES);
        expect(drive(ev, ev.side * 1.5)).toMatchObject({ kind: 'dozer' });
        const ev2 = createSetpieceEvent('dozer', 6, 0, LANES);
        expect(drive(ev2, -ev2.side * 1.5)).toBeNull();
    });

    it('трактор пересекает дорогу и уходит; кран качает блок поперёк всех полос', () => {
        const tr = createSetpieceEvent('tractor', 6, 0, LANES);
        let z = 140;
        for (let t = 0; t < 12; t += 1 / 60) tr.update({ x: 99, z: (z -= 25 / 60), dt: 1 / 60, y: 0, ups: 25 });
        expect(tr.debug.state).toBe('gone');
        // блок за мах проходит над каждой полосой (свой кран на полосу — у попадания есть пауза)
        for (const x of LANES) {
            const cr = createSetpieceEvent('crane', 6, 0, LANES);
            let hit = null;
            for (let t = 0; t < 12 && !hit; t += 0.02) hit = cr.update({ x, z: 0, dt: 0.02, y: 0, ups: 25 });
            expect(hit, 'полоса ' + x).toMatchObject({ kind: 'crane' });
        }
    });

    it('все приметы строятся', () => {
        new Set([].concat(...Object.values(LANDMARK_POOL))).forEach(k => {
            const g = createLandmark(k, 10, 5);
            expect(g.children.length).toBeGreaterThan(0);
        });
    });
});
