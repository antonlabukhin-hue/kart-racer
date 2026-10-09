import { describe, it, expect } from 'vitest';
import { zenithFor, skylineKind, skylineShapes } from '../../src/sky.js';
import { blobSize } from '../../src/ground-shadow.js';
import { THEMES } from '../../src/infinite.js';

describe('небо бесконечной трассы', () => {
    it('у каждого пейзажа свой цвет зенита, ночью — почти чёрный', () => {
        THEMES.forEach(function(t) { expect(typeof zenithFor(t)).toBe('number'); });
        const night = THEMES.find(function(t) { return t.night; });
        expect(zenithFor(night)).toBeLessThan(0x101010);
        expect(zenithFor({ sky: 0xe0c090 })).not.toBe(0xe0c090); // без своего — уводится в синеву
    });
    it('силуэт на горизонте есть у каждого стиля декора', () => {
        THEMES.forEach(function(t) { expect(skylineShapes(skylineKind(t.style)).length).toBeGreaterThan(5); });
        expect(skylineKind('city')).toBe('city');
        expect(skylineKind('нет такого')).toBe('town');
    });
    it('раскладка силуэта одинакова от запуска к запуску и не выше слоя', () => {
        ['town', 'city', 'village', 'forest', 'industrial', 'junk', 'ridge'].forEach(function(k) {
            const a = skylineShapes(k), b = skylineShapes(k);
            expect(a).toEqual(b);
            a.forEach(function(s) { expect(s.h).toBeGreaterThan(0); expect(s.h).toBeLessThanOrEqual(1); });
        });
        // в городе — телебашня, в деревне — церковь
        expect(skylineShapes('city').some(function(s) { return s.t === 'tower'; })).toBe(true);
        expect(skylineShapes('village').some(function(s) { return s.t === 'dome'; })).toBe(true);
    });
});

describe('тень-пятно под машиной', () => {
    it('чуть больше кузова', () => {
        const s = blobSize(1, 2);
        expect(s.w).toBeGreaterThan(1);
        expect(s.l).toBeGreaterThan(2);
    });
});
