import { describe, it, expect } from 'vitest';
import { targetRpm, stepRpm, firingHz, engineProfile, ENGINE_PROFILES, GEAR_EDGES } from '../../src/engine-sound.js';
import { CAR_PRESETS } from '../../src/data.js';

describe('звук двигателя: обороты', () => {
    const p = engineProfile('cheburashka');
    it('стоим — холостые, внутри передачи обороты растут', () => {
        expect(targetRpm(0, 0, p)).toBe(p.idle);
        expect(targetRpm(0.3, 2, p)).toBeGreaterThan(targetRpm(0.2, 2, p));
    });
    it('на переключении вверх обороты падают (слышен сброс)', () => {
        const e = GEAR_EDGES[3];
        expect(targetRpm(e + 0.001, 3, p)).toBeLessThan(targetRpm(e - 0.001, 2, p) * 0.75);
    });
    it('не выше отсечки', () => {
        for (let g = 0; g <= 5; g++) expect(targetRpm(GEAR_EDGES[g + 1], g, p)).toBeLessThanOrEqual(p.red);
    });
    it('обороты падают быстрее, чем растут', () => {
        const up = stepRpm(3000, 4000, 0.016) - 3000, down = 4000 - stepRpm(4000, 3000, 0.016);
        expect(down).toBeGreaterThan(up);
    });
    it('большие машины ниже: V8 «Бычок» ниже мопеда и «Ушастика» на полном газу', () => {
        const f = function(id) { const q = engineProfile(id); return firingHz(q.red * 0.9, q.cyl) / (q.cyl >= 8 ? 2 : 1); };
        expect(engineProfile('bull').exh).toBeLessThan(engineProfile('cheburashka').exh);
        expect(engineProfile('moped').exh).toBeGreaterThan(engineProfile('cheburashka').exh);
        expect(f('bull')).toBeGreaterThan(0);
    });
    it('у каждой машины свой профиль', () => {
        Object.keys(CAR_PRESETS).forEach(function(id) { expect(ENGINE_PROFILES[id], id).toBeTruthy(); });
    });
});
