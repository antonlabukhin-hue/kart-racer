import { describe, it, expect } from 'vitest';
import { addNewGift, seenGift, giftKey } from '../../src/ui/gift-garage.js';
import { grantChapterReward } from '../../src/profile.js';

describe('подарки за главы в гараже', () => {
    it('выданный подарок — новый, пока его не тронешь', () => {
        const p = { carLoadout: { ownedPaints: [], ownedParts: [] } };
        expect(grantChapterReward(p, 'c03', 'cheburashka')).toEqual({ paint: 'purple', equip: false, beastHour: false });
        expect(grantChapterReward(p, 'c06', 'cheburashka')).toEqual({ part: 'rims' });
        expect(p.carLoadout.newGifts).toEqual(['paint:purple', 'part:rims']);
        expect(seenGift(p.carLoadout, 'paint', 'purple')).toBe(true);
        expect(seenGift(p.carLoadout, 'paint', 'purple')).toBe(false);
        expect(p.carLoadout.newGifts).toEqual(['part:rims']);
    });
    it('повтор не дублирует', () => {
        const lo = {};
        addNewGift(lo, 'part', 'xenon'); addNewGift(lo, 'part', 'xenon');
        expect(lo.newGifts).toEqual([giftKey('part', 'xenon')]);
        expect(seenGift(null, 'part', 'x')).toBe(false);
    });
});
