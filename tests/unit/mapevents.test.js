import { describe, it, expect } from 'vitest';
import { createMapEvent } from '../../src/mapevents.js';

const lanes = [-1.5, 0, 1.5];
// прогон машины сквозь сцену с постоянной скоростью: возвращает попадания
function drive(ev, { x = 0, ups = 25, from = 120, nitroAt = null } = {}) {
    const hits = [];
    let z = ev.z + from, v = ups;
    for (let t = 0; t < 12 && z > ev.z - 50; t += 1 / 60) {
        if (nitroAt != null && t >= nitroAt) v = ups * 1.45;
        const h = ev.update({ x, z, ups: v, dt: 1 / 60, y: 0 });
        if (h) { hits.push(h); if (h.stopAt != null) z = h.stopAt; }
        z -= v / 60;
    }
    return hits;
}

describe('сцены карт', () => {
    it('переезд: на обычной скорости хвост поезда уходит перед машиной', () => {
        const ev = createMapEvent('arsenev', 6, 0, lanes);
        expect(drive(ev)).toHaveLength(0);
    });

    it('переезд: нитро после появления поезда — врезаешься (авария)', () => {
        const ev = createMapEvent('arsenev', 6, 0, lanes);
        // поезд трогается, когда до переезда ~3 с; нитро включаем сразу после
        const hits = drive(ev, { nitroAt: (120 - (25 * 3 + 6)) / 25 + 0.1 });
        expect(hits.some(h => h.kind === 'train' && h.strike)).toBe(true);
    });

    it('пар и шины — не авария, а ожог (скорость и время)', () => {
        ['promzona', 'svalka'].forEach(kind => {
            let hit = null;
            for (let i = 0; i < 30 && !hit; i++) {
                for (const x of lanes) { const h = drive(createMapEvent(kind, 6, 0, lanes), { x, ups: 18 + i })[0]; if (h) { hit = h; break; } }
            }
            expect(hit).not.toBeNull();
            expect(hit.strike).toBe(false);
            expect(hit.speedMul).toBeLessThan(1);
        });
    });
});
