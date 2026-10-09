import { describe, it, expect } from 'vitest';
import { buildTraffic, brakeLights, KINDS, HIT } from '../../src/traffic-cars.js';
import { SFX, SFX_LEVEL } from '../../src/sfx-kit.js';

describe('попутки', () => {
    it('сзади ровно два стоп-сигнала, у мотоцикла — один', () => {
        new Set(KINDS).forEach(function(k) {
            const t = buildTraffic(k, 0x3366aa, { dark: false });
            expect(brakeLights(t.group), k).toBe(k === 'moto' ? 1 : 2);
        });
    });
    it('габариты для столкновений — как были', () => {
        expect(buildTraffic('bus', 0xffffff).hitL).toBe(2.6);
        expect(buildTraffic('moto', 0xffffff).hitW).toBe(HIT.moto[0]);
        expect(buildTraffic('нет такого', 0xffffff).hitL).toBe(HIT.sedan[1]); // неизвестный — седан
    });
});

describe('звуки событий', () => {
    it('у каждого события свой звук с выравниванием громкости', () => {
        ['ring', 'crash', 'crate', 'heart', 'shield', 'nitro'].forEach(function(n) {
            expect(typeof SFX[n]).toBe('function');
            expect(SFX_LEVEL[n]).toBeGreaterThan(0);
        });
    });
});
