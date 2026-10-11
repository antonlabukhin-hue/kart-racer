import { describe, it, expect } from 'vitest';
import { cutInAllowed, wantsCut, blinkOn, CUT_SAFE, SIGNAL_TIME, CUT_FROM, LANE_CHANGE_RATE } from '../../src/traffic-signal.js';

describe('перестроения попуток', () => {
    it('в полосу игрока близко перед ним — нельзя, далеко или позади — можно; в другую — всегда', () => {
        expect(cutInAllowed(1, 1, 20)).toBe(false);
        expect(cutInAllowed(1, 1, CUT_SAFE + 5)).toBe(true);
        expect(cutInAllowed(1, 1, -10)).toBe(true);
        expect(cutInAllowed(2, 1, 5)).toBe(true);
    });
    it('«нарочно перед игроком» — только издалека', () => {
        expect(wantsCut(10)).toBe(false);
        expect(wantsCut(50)).toBe(true);
        expect(wantsCut(90)).toBe(false);
    });
    it('задуманный «подрез» успевает: после поворотника игрок ещё дальше CUT_SAFE, манёвр — быстрее полсекунды', () => {
        const ups = 22; // ед./с — скорость игрока на пике относительно попутки
        expect(cutInAllowed(1, 1, CUT_FROM + 1 - ups * SIGNAL_TIME)).toBe(true);
        expect(1 / LANE_CHANGE_RATE).toBeLessThan(0.5);
    });
    it('поворотник мигает, пока горит, и гаснет', () => {
        const on = []; for (let t = SIGNAL_TIME; t > 0; t -= 0.05) on.push(blinkOn(t));
        expect(on.some(Boolean)).toBe(true);
        expect(on.some(v => !v)).toBe(true);
        expect(blinkOn(0)).toBe(false);
    });
});
