import { describe, it, expect } from 'vitest';
import { bossHp, phaseForHp, damageFor, createVolleyTracker, barricadeLanes, arenaOpen, ARENA_END } from '../../src/boss-fight.js';

describe('бой с боссом', () => {
    it('HP главы +1, в разумных пределах', () => {
        expect(bossHp(3)).toBe(4);
        expect(bossHp(6)).toBe(7);
        expect(bossHp(undefined)).toBe(4);
        expect(bossHp(20)).toBe(8);
    });

    it('фазы по доле HP', () => {
        expect([6, 5, 4, 3, 2, 1].map(h => phaseForHp(h, 6))).toEqual([1, 1, 2, 2, 3, 3]);
        expect(phaseForHp(4, 4)).toBe(1);
        expect(phaseForHp(1, 4)).toBe(3);
    });

    it('броня: таран без окна уязвимости не ранит, кувалда и прыжок — ранят', () => {
        expect(damageFor('ram', { vulnerable: false })).toBe(0);
        expect(damageFor('ram', { vulnerable: true })).toBe(1);
        expect(damageFor('ram', { vulnerable: true, nitro: true })).toBe(2);
        expect(damageFor('ram', { hammer: true })).toBe(1);
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
