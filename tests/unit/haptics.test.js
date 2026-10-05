import { describe, it, expect, vi } from 'vitest';
import { buzz, MIN_GAP } from '../../src/haptics.js';

describe('вибрация на сочных моментах', () => {
    it('короткий импульс; выключена в настройках — молчит; частые события не дребезжат', () => {
        const vibrate = vi.fn();
        vi.stubGlobal('navigator', { vibrate });
        expect(buzz('nitro', false, 0)).toBe(false);
        expect(buzz('nitro', true, 1000)).toBe(true);
        expect(vibrate).toHaveBeenLastCalledWith(25);
        expect(buzz('board', true, 1000 + MIN_GAP - 1)).toBe(false);
        expect(buzz('board', true, 1000 + MIN_GAP + 1)).toBe(true);
        expect(buzz('nope', true, 5000)).toBe(false);
        vi.unstubAllGlobals();
    });
});
