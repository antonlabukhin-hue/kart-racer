import { describe, it, expect } from 'vitest';
import { belowTop } from '../../src/ui/hud-layout.js';

const r = (left, top, w, h) => ({ left, top, right: left + w, bottom: top + h, width: w, height: h });
describe('спидометр под панелью заезда', () => {
    it('налезает на панель — встаёт под неё', () => {
        expect(belowTop(r(8, 8, 140, 150), r(14, 104, 92, 110), 6, 390)).toBe(164);
    });
    it('не налезает — не трогаем; не влезает по высоте — тоже', () => {
        expect(belowTop(r(8, 8, 140, 90), r(14, 104, 92, 110), 6, 390)).toBe(null);
        expect(belowTop(r(8, 8, 140, 300), r(14, 104, 92, 110), 6, 390)).toBe(null);
    });
});
