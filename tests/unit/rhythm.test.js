import { describe, it, expect } from 'vitest';
import { rhythmAt, densityAt, RHYTHM } from '../../src/rhythm.js';
import { LAYOUTS, resolveLayout } from '../../src/track-layout.js';

describe('ритм заезда', () => {
    it('разгон спокойный, слалом плотный, босс — фокус, финал — самый плотный', () => {
        const [start, slalom, boss, fin] = [0.05, 0.3, 0.6, 0.9].map(rhythmAt);
        expect(start).toBeLessThan(1);
        expect(slalom).toBeGreaterThan(1);
        expect(boss).toBeLessThan(slalom);
        expect(fin).toBeGreaterThan(slalom);
    });

    it('в среднем за заезд зверей столько же, сколько при ровной частоте (±10%)', () => {
        let sum = 0;
        const n = 1000;
        for (let i = 0; i < n; i++) sum += rhythmAt(i / n);
        expect(sum / n).toBeGreaterThan(0.9);
        expect(sum / n).toBeLessThan(1.1);
        expect(RHYTHM[0].from).toBe(0);
    });

    it('на ремонте и развилке зверей реже, в тоннеле — как обычно', () => {
        ['arsenev', 'promzona', 'svalka'].forEach(m => {
            const l = resolveLayout(LAYOUTS, { mapId: m, difficulty: 'hard' });
            l.segments.forEach(sg => {
                const inside = densityAt(sg.at + 0.01, l);
                if (sg.type === 'tunnel') expect(inside).toBe(rhythmAt(sg.at + 0.01));
                else expect(inside).toBeLessThan(rhythmAt(sg.at + 0.01));
            });
        });
        expect(densityAt(0.3, null)).toBe(rhythmAt(0.3));
    });
});
