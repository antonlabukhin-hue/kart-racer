import { describe, it, expect } from 'vitest';
import { TUTORIAL, tutorialFor, pickCoach } from '../../src/tutorial.js';

describe('обучение в первых главах', () => {
    it('три обучающие главы, дальше подсказок нет', () => {
        expect(TUTORIAL).toHaveLength(3);
        expect(tutorialFor(3)).toEqual([]);
        const ids = TUTORIAL.flat().map(s => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('подсказка — по ситуации и только один раз', () => {
        const steps = tutorialFor(0);
        const shown = new Set();
        expect(pickCoach(steps, shown, { t: 0.2 })).toBeNull();
        expect(pickCoach(steps, shown, { t: 1 }).id).toBe('lanes');
        shown.add('lanes');
        expect(pickCoach(steps, shown, { t: 5, gap: 200 })).toBeNull();
        expect(pickCoach(steps, shown, { t: 5, gap: 60 }).id).toBe('gap');
        expect(pickCoach(steps, shown, { t: 5, gap: -3 })).toBeNull(); // разлом позади
        expect(pickCoach(steps, shown, { t: 5, animal: true }).id).toBe('animal');
        shown.add('animal'); shown.add('gap');
        expect(pickCoach(steps, shown, { t: 5, boss: true }).id).toBe('boss');
        shown.add('boss');
        expect(pickCoach(steps, shown, { t: 9, boss: true, animal: true, gap: 10 })).toBeNull();
    });
});
