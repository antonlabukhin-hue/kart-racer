import { describe, it, expect } from 'vitest';
import { createPipeDrop } from '../../src/mapevents.js';

const LANES = [-2, 0, 2];
// машина едет к z0 = 0 со скоростью 25 ед./с в полосе x; возвращает первое попадание
function drive(pd, x) {
    let z = 120, hit = null;
    for (let t = 0; t < 8 && !hit; t += 1 / 60) {
        z -= 25 / 60;
        hit = pd.update({ x: x, z: z, dt: 1 / 60, y: 0, ups: 25 });
    }
    return hit;
}

describe('падающая труба', () => {
    it('сначала раскачивается, потом падает до подъезда машины', () => {
        const pd = createPipeDrop(6, 0, LANES, 2);
        pd.update({ x: 0, z: 200, dt: 0.1, y: 0, ups: 25 });
        expect(pd.debug.state).toBe('hang');
        pd.update({ x: 0, z: 45, dt: 0.1, y: 0, ups: 25 });
        expect(pd.debug.state).toBe('warn');
        for (let i = 0; i < 90; i++) pd.update({ x: 0, z: 40 - i * 0.4, dt: 1 / 60, y: 0, ups: 25 });
        expect(['fall', 'down']).toContain(pd.debug.state);
    });

    it('в перекрытых полосах — авария, в свободной — проезд', () => {
        expect(drive(createPipeDrop(6, 0, LANES, 2), LANES[0])).toMatchObject({ kind: 'pipe', strike: true });
        expect(drive(createPipeDrop(6, 0, LANES, 2), LANES[1])).toMatchObject({ kind: 'pipe' });
        expect(drive(createPipeDrop(6, 0, LANES, 2), LANES[2])).toBeNull();
        expect(drive(createPipeDrop(6, 0, LANES, 0), LANES[0])).toBeNull();
    });

    it('перелёт над лежащей трубой — мимо', () => {
        const pd = createPipeDrop(6, 0, LANES, 2);
        let z = 120, hit = null;
        for (let t = 0; t < 8 && !hit; t += 1 / 60) { z -= 25 / 60; hit = pd.update({ x: 0, z: z, dt: 1 / 60, y: Math.abs(z) < 3 ? 1.2 : 0, ups: 25 }); }
        expect(hit).toBeNull();
    });
});
