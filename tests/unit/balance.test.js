import { describe, it, expect } from 'vitest';
import { campaignHardConfig } from '../../src/balance.js';

const hard = { trackLength: 1550, timeLimit: 90, triggerLookahead: 13, animalCrossMul: 1.4, timePenaltyMul: 1.05, animalSpawnRate: 1.15, laneChangeMul: 0.95 };
const medium = { trackLength: 1500, timeLimit: 90, triggerLookahead: 15.2, animalCrossMul: 0.7, timePenaltyMul: 0.78, animalSpawnRate: 2.15, laneChangeMul: 0.52 };

describe('нарастание сложности кампании', () => {
    it('последняя глава — полная сложная', () => {
        const c = campaignHardConfig(hard, medium, 16, 17);
        expect(c.triggerLookahead).toBeCloseTo(13);
        expect(c.animalCrossMul).toBeCloseTo(1.4);
    });

    it('ранняя «сложная» глава мягче: зверь срывается раньше и бежит медленнее', () => {
        const c6 = campaignHardConfig(hard, medium, 5, 17);
        const c12 = campaignHardConfig(hard, medium, 11, 17);
        expect(c6.triggerLookahead).toBeGreaterThan(c12.triggerLookahead);
        expect(c6.animalCrossMul).toBeLessThan(c12.animalCrossMul);
        expect(c6.animalSpawnRate).toBeGreaterThan(c12.animalSpawnRate);
    });

    it('длина трассы и лимит времени остаются от сложной, исходный объект не меняется', () => {
        const c = campaignHardConfig(hard, medium, 5, 17);
        expect(c.trackLength).toBe(1550);
        expect(c.timeLimit).toBe(90);
        expect(hard.triggerLookahead).toBe(13);
    });
});
