import { describe, it, expect } from 'vitest';
import { checkGiftCars, takeGiftPending, grantGiftCar, giftProgress, wonWeek, isGiftCar, GIFT_DUP_VHS, STREAK_DAYS } from '../../src/gift-cars.js';
import { RIVALS } from '../../src/leaderboard.js';

const MON = new Date(2026, 9, 5, 12).getTime(); // понедельник 5 окт 2026
const DAY = 86400000;
const P = (o) => Object.assign({ name: 'Тестер', unlockedCars: ['cheburashka'], season: { chips: 0, vhs: 0 }, streak: { count: 1 } }, o);

describe('машины в подарок', () => {
    it('7 дней подряд — «Трайк» один раз; плашка в очереди', () => {
        const p = P({ streak: { count: STREAK_DAYS - 1 } });
        expect(checkGiftCars(p, { now: MON, board: [] })).toEqual([]);
        p.streak.count = STREAK_DAYS;
        expect(checkGiftCars(p, { now: MON, board: [] })).toEqual([{ car: 'trike', reason: 'streak7', dup: false }]);
        expect(p.unlockedCars).toContain('trike');
        expect(checkGiftCars(p, { now: MON + DAY, board: [] })).toEqual([]);
        expect(takeGiftPending(p)).toMatchObject({ car: 'trike' });
        expect(takeGiftPending(p)).toBe(null);
    });
    it('уже есть — кассеты вместо машины', () => {
        const p = P({ unlockedCars: ['cheburashka', 'trike'] });
        expect(grantGiftCar(p, 'streak7', MON)).toEqual({ car: 'trike', reason: 'streak7', dup: true });
        expect(p.season.vhs).toBe(GIFT_DUP_VHS);
        expect(p.unlockedCars.filter(c => c === 'trike').length).toBe(1);
    });
    it('король недели: первым в таблице «Неделя» прошлой недели — «Призрачный патруль»', () => {
        const top = Math.round(RIVALS[0].dist * 0.5); // на неделе у соперников — половина
        const lastWeek = MON - 3 * DAY;
        expect(wonWeek([{ name: 'Тестер', dist: top + 100, at: lastWeek }], 'Тестер', lastWeek)).toBe(true);
        expect(wonWeek([{ name: 'Тестер', dist: top - 100, at: lastWeek }], 'Тестер', lastWeek)).toBe(false);
        expect(wonWeek([{ name: 'Тестер', dist: top + 100, at: lastWeek }, { name: 'Вася', dist: top + 500, at: lastWeek }], 'Тестер', lastWeek)).toBe(false);
        const p = P();
        expect(checkGiftCars(p, { now: MON, board: [{ name: 'Тестер', dist: top + 100, at: lastWeek }] })).toEqual([{ car: 'ghostcar', reason: 'weekTop', dup: false }]);
        // эту неделю уже проверили — второй раз не дарим
        expect(checkGiftCars(p, { now: MON + DAY, board: [{ name: 'Тестер', dist: top + 100, at: lastWeek }] })).toEqual([]);
        // неделя без заездов — ничего
        expect(checkGiftCars(P(), { now: MON, board: [] })).toEqual([]);
    });
    it('в витрине — как получить и сколько осталось', () => {
        expect(isGiftCar('trike')).toBe(true);
        expect(isGiftCar('neon')).toBe(false);
        expect(giftProgress(P({ streak: { count: 3 } }), 'trike', {}).left).toBe('У тебя 3 из 7 дней');
        expect(giftProgress(P(), 'ghostcar', { board: [], now: MON }).left).toContain(RIVALS[0].name);
        expect(giftProgress(P(), 'neon', {})).toBe(null);
    });
});
