import { describe, it, expect } from 'vitest';
import { calcCampaignStars, mergeStars, totalStars, starsText } from '../../src/campaign-stars.js';

describe('звёзды кампании', () => {
    it('звёзды считаются по авариям', () => {
        expect(calcCampaignStars(0)).toBe(3);
        expect(calcCampaignStars(1)).toBe(2);
        expect(calcCampaignStars(2)).toBe(2);
        expect(calcCampaignStars(3)).toBe(1);
        expect(calcCampaignStars(4)).toBe(1);
        expect(calcCampaignStars(undefined)).toBe(3);
    });

    it('при слиянии остаётся лучший результат, мусор отбрасывается', () => {
        expect(mergeStars({ c01: 2, c02: 3 }, { c01: 3, c03: 1 })).toEqual({ c01: 3, c02: 3, c03: 1 });
        expect(mergeStars({ c01: 9 }, null)).toEqual({ c01: 3 });
        expect(mergeStars({ c01: 'x', c02: -1 }, undefined)).toEqual({});
    });

    it('сумма и текст', () => {
        expect(totalStars({ c01: 3, c02: 1 })).toBe(4);
        expect(totalStars(null)).toBe(0);
        expect(starsText(2)).toBe('★★☆');
        expect(starsText(0)).toBe('☆☆☆');
    });
});
