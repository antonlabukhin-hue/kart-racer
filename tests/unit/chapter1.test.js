import { describe, it, expect } from 'vitest';
import { CAMPAIGN_STAGE_MODS } from '../../src/data.js';
import { DIFFICULTY_CONFIG } from '../../src/difficulty.js';

describe('глава 1 — знакомство', () => {
    it('трасса короче обычной лёгкой, у босса 2 удара и только первая фаза', () => {
        const m = CAMPAIGN_STAGE_MODS.c01;
        expect(m.trackLength).toBeLessThan(DIFFICULTY_CONFIG.easy.trackLength * 0.85);
        expect(m.bossHp).toBe(2);
        expect(m.bossMaxPhase).toBe(1);
    });
});
