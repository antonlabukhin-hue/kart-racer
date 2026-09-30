import { describe, it, expect } from 'vitest';
import { uiScale } from '../../src/ui/touch-scale.js';

describe('масштаб интерфейса на сенсорных экранах', () => {
    it('от короткой стороны окна: iPhone ≈ 1, маленький — не меньше 0.85, раздутый iOS-вид — крупнее', () => {
        expect(uiScale(844, 390)).toBeCloseTo(1, 5);
        expect(uiScale(667, 375)).toBeCloseTo(375 / 390, 5);
        expect(uiScale(568, 300)).toBe(0.85);
        // iOS разложил страницу ~1300×600 и уменьшил: элементы увеличиваются, на экране выходят обычного размера
        expect(uiScale(1300, 600)).toBeCloseTo(600 / 390, 5);
        expect(uiScale(2000, 1200)).toBe(1.7);
    });
});

import { fixWidth } from '../../src/ui/touch-scale.js';
describe('раскладка шире экрана (iPhone «на экран Домой»)', () => {
    it('окно заметно шире физического экрана — нужна точная ширина', () => {
        expect(fixWidth(980, 2000, 393, 852)).toBe(393);   // вертикально
        expect(fixWidth(1300, 600, 393, 852)).toBe(852);   // горизонтально
    });
    it('обычная раскладка — ничего не трогаем', () => {
        expect(fixWidth(393, 852, 393, 852)).toBe(0);
        expect(fixWidth(852, 393, 393, 852)).toBe(0);
        expect(fixWidth(1280, 720, 0, 0)).toBe(0);
    });
});
