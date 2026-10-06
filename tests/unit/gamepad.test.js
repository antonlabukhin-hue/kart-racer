import { describe, it, expect } from 'vitest';
import { readPad, readPads, pressedEdges, nextFocusIndex } from '../../src/gamepad.js';

const pad = (pressed = [], axes = [0, 0], connected = true) => ({
    connected, mapping: 'standard',
    axes,
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 }))
});

describe('геймпад', () => {
    it('курки — газ и тормоз, стик и крестовина — полосы', () => {
        expect(readPad(pad([7]))).toMatchObject({ w: true, s: false, a: false, d: false });
        expect(readPad(pad([6]))).toMatchObject({ s: true });
        expect(readPad(pad([], [-0.8, 0]))).toMatchObject({ a: true, d: false });
        expect(readPad(pad([], [0.2, 0]))).toMatchObject({ a: false, d: false }); // мёртвая зона
        expect(readPad(pad([15]))).toMatchObject({ d: true, right: true });
        expect(readPad(pad([], [0, 0], false))).toBeNull();
    });

    it('несколько геймпадов объединяются', () => {
        const st = readPads([null, pad([7]), pad([14])]);
        expect(st).toMatchObject({ w: true, a: true });
        expect(readPads([])).toBeNull();
    });

    it('нажатие засчитывается один раз, пока кнопку не отпустят', () => {
        const a = readPad(pad([9]));
        expect(pressedEdges(null, a).start).toBe(true);
        expect(pressedEdges(a, readPad(pad([9]))).start).toBeUndefined();
    });

    it('фокус в меню ходит по кругу', () => {
        expect(nextFocusIndex(3, -1, 1)).toBe(0);
        expect(nextFocusIndex(3, -1, -1)).toBe(2);
        expect(nextFocusIndex(3, 2, 1)).toBe(0);
        expect(nextFocusIndex(0, 0, 1)).toBe(-1);
    });
});

describe('не геймпад', () => {
    it('устройства без стандартной раскладки (сканер отпечатка, кнопки корпуса телефона) — игнорируются', async () => {
        const { readPad } = await import('../../src/gamepad.js');
        expect(readPad({ connected: true, mapping: '', axes: [0.9, 0], buttons: [{ pressed: true }, {}, {}, { pressed: true }] })).toBe(null);
    });
});
