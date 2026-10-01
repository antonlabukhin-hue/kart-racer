import { describe, it, expect } from 'vitest';
import { shouldPlayVhs, tapeCounter, VHS_KEY } from '../../src/ui/vhs-intro.js';

const mem = (v) => ({ getItem: k => (k === VHS_KEY ? v : null) });

describe('VHS-заставка', () => {
    it('раз за сессию; в автотестах и при «меньше движения» — нет, ?vhs=1 — всегда', () => {
        expect(shouldPlayVhs({ search: '', session: mem(null) })).toBe(true);
        expect(shouldPlayVhs({ search: '', session: mem('1') })).toBe(false);
        expect(shouldPlayVhs({ search: '', session: mem(null), webdriver: true })).toBe(false);
        expect(shouldPlayVhs({ search: '', session: mem(null), reduceMotion: true })).toBe(false);
        expect(shouldPlayVhs({ search: '?vhs=1', session: mem('1'), webdriver: true })).toBe(true);
        expect(shouldPlayVhs({ search: '?vhs=0', session: mem(null) })).toBe(false);
    });
    it('счётчик ленты', () => {
        expect(tapeCounter(0)).toBe('0:00:07');
        expect(tapeCounter(60500)).toBe('0:01:07');
    });
});
