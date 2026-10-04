import { describe, it, expect } from 'vitest';
import { checkComeback, claimComeback, comebackGift } from '../../src/comeback.js';
import { weekState, addWeekDist, goalFor } from '../../src/week-car.js';
import { checkNamePlate, plateText, namePlateOn } from '../../src/name-plate.js';
import { grantFriendChest } from '../../src/friend-chest.js';
import { CAR_PRESETS } from '../../src/data.js';

const prof = function() { return { name: 'Антон', unlockedCars: ['cheburashka'], season: { chips: 0, vhs: 0 } }; };

describe('подарок за возвращение', () => {
    it('3+ дня без игры — подарок, раз в неделю', () => {
        const p = prof();
        p.streak = { count: 4, last: '2026-10-01' };
        expect(checkComeback(p, '2026-10-02')).toBe(null);
        const g = checkComeback(p, '2026-10-05');
        expect(g).toEqual(comebackGift(4));
        expect(claimComeback(p).chips).toBe(350);
        expect(p.season.chips).toBe(350);
        expect(claimComeback(p)).toBe(null);
        p.streak.last = '2026-10-05';
        expect(checkComeback(p, '2026-10-09')).toBe(null); // не чаще раза в 7 дней
        expect(checkComeback(p, '2026-10-20')).not.toBe(null);
    });
});

describe('машина недели', () => {
    it('своя машина недели, которой нет; 15 км — бесплатно', () => {
        const p = prof();
        const w = weekState(p, '2026-09-28', CAR_PRESETS, function(id) { return id === 'trike' || id === 'ghostcar'; });
        expect(p.unlockedCars).not.toContain(w.car);
        expect(CAR_PRESETS[w.car].priceChips).toBeGreaterThanOrEqual(10000);
        expect(CAR_PRESETS[w.car].priceChips).toBeLessThanOrEqual(50000);
        expect(w.goal).toBe(goalFor(CAR_PRESETS[w.car].priceChips));
        expect(addWeekDist(p, '2026-09-28', w.goal - 6, CAR_PRESETS)).toBe(null);
        expect(addWeekDist(p, '2026-09-28', 6, CAR_PRESETS)).toEqual({ car: w.car });
        expect(p.unlockedCars).toContain(w.car);
        expect(addWeekDist(p, '2026-09-28', 5000, CAR_PRESETS)).toBe(null);
    });
    it('новая неделя — счёт заново', () => {
        const p = prof();
        addWeekDist(p, '2026-09-28', 5000, CAR_PRESETS);
        expect(weekState(p, '2026-10-05', CAR_PRESETS).dist).toBe(0);
    });
});

describe('именной номер', () => {
    it('14 дней подряд — один раз', () => {
        const p = prof();
        p.streak = { count: 13 };
        expect(checkNamePlate(p)).toBe(false);
        p.streak.count = 14;
        expect(checkNamePlate(p)).toBe(true);
        expect(checkNamePlate(p)).toBe(false);
        expect(namePlateOn(p)).toBe(true);
        expect(plateText('очень длинное имя')).toBe('ОЧЕНЬ ДЛ');
    });
});

describe('сундук за вызов друга', () => {
    it('раз в день за друга, не больше 3, победа — богаче', () => {
        const p = prof();
        expect(grantFriendChest(p, 'Вася', '2026-10-04', false).chips).toBe(150);
        expect(grantFriendChest(p, 'Вася', '2026-10-04', true)).toBe(null);
        expect(grantFriendChest(p, 'Петя', '2026-10-04', true)).toEqual({ chips: 300, vhs: 1, win: true });
        grantFriendChest(p, 'Коля', '2026-10-04');
        expect(grantFriendChest(p, 'Маша', '2026-10-04')).toBe(null);
        expect(grantFriendChest(p, 'Вася', '2026-10-05')).not.toBe(null);
    });
});
