import { describe, it, expect } from 'vitest';
import { buildTraffic, brakeLights, KINDS, HIT, TALL_H, hopClears } from '../../src/traffic-cars.js';
import * as THREE from 'three';
import { HOP_V } from '../../src/hop-duck.js';
import { GRAVITY } from '../../src/race-physics.js';
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

describe('высокие попутки', () => {
    const peak = function(v) { return v * v / (2 * GRAVITY); };
    it('грузовик и автобус выше прыжка с места (и у «Горбатого»), легковые — ниже', () => {
        ['truck', 'bus'].forEach(function(k) {
            const h = new THREE.Box3().setFromObject(buildTraffic(k, 0x3366aa).group).max.y;
            expect(h, k).toBeGreaterThanOrEqual(TALL_H[k] - 0.02);
            expect(hopClears(k, peak(HOP_V * 1.15)), k).toBe(false);
        });
        ['sedan', 'suv', 'van', 'moto'].forEach(function(k) { expect(hopClears(k, 0.6), k).toBe(true); });
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
