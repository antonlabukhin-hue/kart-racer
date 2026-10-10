import { describe, it, expect } from 'vitest';
import { zoneFree, calmAhead, MAJOR_GAP } from '../../src/director.js';

describe('режиссёр участков', () => {
    const busy = [[-200, -150]]; // разлом/событие на отрезке z −200…−150
    it('крупное рядом с крупным — нельзя, с запасом — можно', () => {
        expect(zoneFree(busy, -140, -120, MAJOR_GAP)).toBe(false);
        expect(zoneFree(busy, -100, -90, MAJOR_GAP)).toBe(true);
        expect(zoneFree(busy, -175, -170, 0)).toBe(false);
        expect(zoneFree([], -1, 1, 100)).toBe(true);
    });
    it('звери не выбегают, пока событие впереди близко или машина в нём', () => {
        expect(calmAhead(busy, -100)).toBe(true);   // до события 50 м
        expect(calmAhead(busy, -170)).toBe(true);   // внутри
        expect(calmAhead(busy, -30)).toBe(false);   // далеко
        expect(calmAhead(busy, -260)).toBe(false);  // уже проехали
    });
});
