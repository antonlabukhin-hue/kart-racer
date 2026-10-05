import { describe, it, expect } from 'vitest';
import { armorBarState, ARMOR_CELLS } from '../../src/ui/armor-bar.js';

describe('шкала брони', () => {
    it('5 ячеек, горят по числу ударов; без брони — нет; «В УДАРЕ» главнее', () => {
        expect(ARMOR_CELLS).toBe(5);
        expect(armorBarState(0, false)).toBe(null);
        expect(armorBarState(1, false)).toEqual({ lit: 1 }); // без прокачки — одна
        expect(armorBarState(4, false)).toEqual({ lit: 4 });
        expect(armorBarState(9, false)).toEqual({ lit: 5 });
        expect(armorBarState(3, true)).toBe(null);
    });
});
