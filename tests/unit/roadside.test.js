import { describe, it, expect } from 'vitest';
import { pickRoadside, signKm, sideGap, CITIES } from '../../src/roadside.js';
import { trailRates, dustColor, dustiness } from '../../src/car-trail.js';
import { flockOffsets, birdsAllowed } from '../../src/sky.js';
import { THEMES } from '../../src/infinite.js';

const seq = function(seed) { let s = seed; return function() { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };

describe('детали у обочины', () => {
    it('указатель «город, км» — каждые 8 участков, километры убывают', () => {
        const signs = [];
        for (let i = 0; i < 40; i++) pickRoadside('arsenev', i, seq(i)).filter(function(x) { return x.kind === 'sign'; }).forEach(function(x) { signs.push(x); });
        expect(signs.length).toBe(5);
        expect(CITIES.some(function(c) { return signs[0].text.indexOf(c) === 0; })).toBe(true);
        expect(signKm(4)).toBeGreaterThanOrEqual(signKm(400));
        expect(signKm(1e6)).toBe(1);
    });
    it('ночью без бабушки, в снегу без ларька; свалка — в основном ржавые машины', () => {
        let granny = 0, kiosk = 0, wreck = 0, n = 0;
        for (let i = 0; i < 300; i++) {
            pickRoadside('arsenev', i, seq(i + 1), { night: true }).forEach(function(x) { if (x.kind === 'granny') granny++; });
            pickRoadside('forest', i, seq(i + 2), { snow: true }).forEach(function(x) { if (x.kind === 'kiosk') kiosk++; });
            pickRoadside('junk', i, seq(i + 3)).forEach(function(x) { n++; if (x.kind === 'wreck') wreck++; });
        }
        expect(granny).toBe(0);
        expect(kiosk).toBe(0);
        expect(wreck / n).toBeGreaterThan(0.5);
    });
    it('две детали на одной стороне не стоят вплотную', () => {
        for (let i = 0; i < 200; i++) {
            const it = pickRoadside('city', i, seq(i + 9));
            for (let a = 0; a < it.length; a++) for (let b = a + 1; b < it.length; b++) {
                if (it[a].side === it[b].side && it[a].kind !== 'sign' && it[b].kind !== 'sign') expect(Math.abs(it[a].dz - it[b].dz)).toBeGreaterThanOrEqual(0.2);
            }
        }
        expect(sideGap('granny')).toBeLessThan(sideGap('kiosk'));
    });
});

describe('выхлоп и пыль', () => {
    it('на нитро выхлопа больше; в воздухе пыли нет; на обочине пыли больше', () => {
        const day = THEMES[0];
        expect(trailRates({ speedK: 1, nitro: true, theme: day }).exhaust).toBeGreaterThan(trailRates({ speedK: 1, theme: day }).exhaust);
        expect(trailRates({ speedK: 1, airborne: true, theme: day }).dust).toBe(0);
        expect(trailRates({ speedK: 1, offroad: true, theme: day }).dust).toBeGreaterThan(trailRates({ speedK: 1, theme: day }).dust);
        expect(trailRates({ speedK: 0.05, theme: day }).dust).toBe(0);
    });
    it('цвет пыли — от пейзажа, снег — белый; ночью пыль еле видна', () => {
        const snow = THEMES.find(function(t) { return t.snow; }), night = THEMES.find(function(t) { return t.night; });
        expect(dustColor(snow)).toBe(0xf4f8ff);
        expect(dustColor(THEMES[0])).not.toBe(dustColor(THEMES[1]));
        expect(dustiness(night)).toBeLessThan(dustiness(THEMES[0]));
    });
});

describe('птицы', () => {
    it('строй «галочкой»: вожак впереди, остальные отстают по обе стороны', () => {
        const f = flockOffsets(5);
        expect(f[0]).toEqual({ back: 0, side: 0, y: 0 });
        expect(f[1].side).toBe(-f[2].side);
        expect(f[3].back).toBeGreaterThan(f[1].back);
    });
    it('ночью и в дождь не летают', () => {
        expect(birdsAllowed(0, 0)).toBe(true);
        expect(birdsAllowed(1, 0)).toBe(false);
        expect(birdsAllowed(0, 1)).toBe(false);
    });
});
