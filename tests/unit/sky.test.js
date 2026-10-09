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

import { duskAt } from '../../src/infinite.js';
describe('закат и рассвет', () => {
    it('только на стыке с ночью, сильнее всего посередине перехода', () => {
        const day = THEMES.find(function(t) { return !t.night; }), night = THEMES.find(function(t) { return t.night; });
        expect(duskAt(day, day, 0.5)).toBe(null);
        expect(duskAt(day, night, 0.5).k).toBeCloseTo(1);
        expect(duskAt(day, night, 0.1).k).toBeLessThan(0.5);
        expect(duskAt(day, night, 0.5).horizon).not.toBe(duskAt(night, day, 0.5).horizon); // закат ≠ рассвет
    });
});

import { accentCss } from '../../src/infinite.js';
describe('фирменный цвет пейзажа', () => {
    it('у каждого пейзажа свой, между ними — плавно', () => {
        const set = new Set(THEMES.map(function(t) { return accentCss(t); }));
        expect(set.size).toBe(THEMES.length);
        expect(accentCss(THEMES[0], THEMES[1], 0)).toBe(accentCss(THEMES[0]));
        expect(accentCss(THEMES[0], THEMES[1], 1)).toBe(accentCss(THEMES[1]));
    });
});
