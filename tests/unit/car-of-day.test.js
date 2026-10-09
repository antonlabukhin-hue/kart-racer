import { describe, it, expect } from 'vitest';
import { carOfDay, dayPrice, canTestDrive, markTestDrive, buyCarOfDay, DISCOUNT } from '../../src/car-of-day.js';

const presets = { cheburashka: { priceChips: 0 }, turbo: { priceChips: 4500 }, gazel: { priceChips: 8500 }, zubilo: { priceChips: 0, priceVhs: 5 }, trike: { priceChips: 15000 } };
const order = ['trike', 'turbo', 'gazel', 'zubilo', 'cheburashka'];
const isGift = id => id === 'trike';

describe('машина дня', () => {
    it('только за «Е», не подарочная, не купленная; весь день одна и та же', () => {
        const p = { name: 'Тестер', unlockedCars: ['cheburashka'] };
        const a = carOfDay(p, '2026-10-03', order, presets, isGift);
        expect(['turbo', 'gazel']).toContain(a);
        expect(carOfDay(p, '2026-10-03', order, presets, isGift)).toBe(a);
        expect(carOfDay({ name: 'Тестер', unlockedCars: ['cheburashka', 'turbo', 'gazel'] }, '2026-10-03', order, presets, isGift)).toBe(null);
        const days = new Set(Array.from({ length: 20 }, (_, i) => carOfDay(p, '2026-10-' + (10 + i), order, presets, isGift)));
        expect(days.size).toBe(2); // меняется по дням
    });
    it('скидка 30%, круглая цена', () => {
        expect(DISCOUNT).toBe(0.3);
        expect(dayPrice(4500)).toBe(3150);
        expect(dayPrice(8500)).toBe(5950);
    });
    it('тест-драйв — раз в 3 дня', () => {
        const p = {};
        expect(canTestDrive(p, '2026-10-03')).toBe(true);
        markTestDrive(p, '2026-10-03');
        expect(canTestDrive(p, '2026-10-03')).toBe(false);
        expect(canTestDrive(p, '2026-10-05')).toBe(false);
        expect(canTestDrive(p, '2026-10-06')).toBe(true);
    });
    it('покупка со скидкой', () => {
        const p = { unlockedCars: ['cheburashka'], season: { chips: 3000 } };
        expect(buyCarOfDay(p, 'turbo', 4500)).toEqual({ ok: false, reason: 'no_chips', cost: 3150 });
        p.season.chips = 4000;
        expect(buyCarOfDay(p, 'turbo', 4500)).toEqual({ ok: true, cost: 3150 });
        expect(p).toMatchObject({ preferredCar: 'turbo', season: { chips: 850 } });
        expect(buyCarOfDay(p, 'turbo', 4500).reason).toBe('owned');
    });
});

describe('машина дня — без повторов в соседние дни', () => {
    it('три дня подряд — три разные машины', async () => {
        const { carOfDay } = await import('../../src/car-of-day.js');
        const presets = { a: { priceChips: 100 }, b: { priceChips: 200 }, c: { priceChips: 300 }, d: { priceChips: 400 } };
        const p = { name: 'Антон', unlockedCars: [] };
        const cars = ['2026-10-07', '2026-10-08', '2026-10-09'].map(d => carOfDay(p, d, ['a', 'b', 'c', 'd'], presets));
        expect(new Set(cars).size).toBe(3);
    });
});
