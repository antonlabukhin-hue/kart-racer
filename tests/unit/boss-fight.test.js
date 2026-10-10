import { describe, it, expect } from 'vitest';
import { bossHp, phaseForHp, damageFor, addCharge, closeDodge, CHARGE, CHARGE_MAX, createVolleyTracker, barricadeLanes, arenaOpen, ARENA_END, hitStopFor, HIT_STOP_TIME_SCALE } from '../../src/boss-fight.js';

describe('бой с боссом', () => {
    it('HP главы, в разумных пределах', () => {
        expect(bossHp(3)).toBe(3);
        expect(bossHp(6)).toBe(6);
        expect(bossHp(undefined)).toBe(3);
        expect(bossHp(20)).toBe(8);
    });

    it('фазы по доле HP', () => {
        expect([6, 5, 4, 3, 2, 1].map(h => phaseForHp(h, 6))).toEqual([1, 1, 2, 2, 3, 3]);
        expect(phaseForHp(4, 4)).toBe(1);
        expect(phaseForHp(1, 4)).toBe(3);
    });

    it('случайное касание не ранит; таран по полной шкале, прыжок и отбитый снаряд — ранят', () => {
        expect(damageFor('ram', { vulnerable: false })).toBe(0);
        expect(damageFor('ram', { vulnerable: true })).toBe(1);
        expect(damageFor('ram', { vulnerable: true, nitro: true })).toBe(2);
        expect(damageFor('stomp', {})).toBe(3);
        expect(damageFor('reflect', {})).toBe(1);
    });

    it('промах всего залпа открывает босса; попадание хоть одним — нет', () => {
        const missed = [];
        const t = createVolleyTracker(id => missed.push(id));
        const a = t.fire(3);
        t.gone(a); t.gone(a);
        expect(missed).toEqual([]);
        t.gone(a);
        expect(missed).toEqual([a]);
        const b = t.fire(2);
        t.hit(b); t.gone(b); t.gone(b);
        expect(missed).toEqual([a]);
        expect(t.pending).toBe(0);
        t.gone(999); // неизвестный залп — без ошибок
    });

    it('шкала тарана: два залпа мимо — таран, попадание отнимает, уворот от рывка — сразу', () => {
        const b = {};
        expect(addCharge(b, CHARGE.volley)).toBe(false);
        expect(addCharge(b, CHARGE.volley)).toBe(true);
        expect(b.charge).toBe(0); // заполнилась — обнулилась
        addCharge(b, CHARGE.volley); addCharge(b, CHARGE.hit);
        expect(b.charge).toBe(CHARGE.volley + CHARGE.hit);
        addCharge(b, -500); expect(b.charge).toBe(0); // не ниже нуля
        expect(addCharge({}, CHARGE.runBy)).toBe(true);
        expect(CHARGE_MAX).toBe(100);
    });

    it('снаряд впритирку — из соседней полосы, не через полосу', () => {
        expect(closeDodge(1.2)).toBe(true);
        expect(closeDodge(-1.5)).toBe(true);
        expect(closeDodge(3.8)).toBe(false);
    });

    it('баррикада: перекрыты две полосы, просвет меняется', () => {
        for (let i = 0; i < 50; i++) {
            const r = barricadeLanes(i % 3, 1);
            expect(r.blocked).toHaveLength(2);
            expect(r.gap).not.toBe(1);
            expect(r.blocked).not.toContain(r.gap);
        }
    });

    it('арена закрывается к концу трассы', () => {
        expect(arenaOpen(0.5)).toBe(true);
        expect(arenaOpen(ARENA_END)).toBe(false);
    });
});

describe('стоп-кадр при ударе', () => {
    it('короткий (≤0.1 с — не «подвисание»), сверху — дольше тарана, снаряд — короче', () => {
        const stomp = hitStopFor({ stomp: true, heavy: true, contact: true });
        const ram = hitStopFor({ contact: true });
        expect(stomp).toBeLessThanOrEqual(0.1);
        expect(stomp).toBeGreaterThan(hitStopFor({ heavy: true, contact: true }));
        expect(hitStopFor({ heavy: true, contact: true })).toBeGreaterThan(ram);
        expect(hitStopFor({})).toBeLessThan(ram);
        expect(HIT_STOP_TIME_SCALE).toBeLessThan(0.2);
    });
});
