import { describe, it, expect } from 'vitest';
import { ensureMissions, applyMissionProgress, missionRows, raceStat, MISSION_POOL } from '../../src/missions.js';
import { createRisk, riskEvent, riskTick, riskCrash, riskToXp, MAX_MULT, CHAIN_WINDOW } from '../../src/risk-combo.js';
import { dayKey, daysBetween, touchStreak, chestFor, canClaimChest, claimChest, CHESTS } from '../../src/streak.js';

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const prof = () => ({ season: { chips: 0, gum: 0 } });

describe('задания: три на виду', () => {
    it('всегда три разных', () => {
        const p = prof();
        const a = ensureMissions(p, seq(0, 0, 0, 0.5, 0.9));
        expect(a).toHaveLength(3);
        expect(new Set(a.map(x => x.id)).size).toBe(3);
    });
    it('прогресс копится между заездами; выполнил — фишки и сразу новое', () => {
        const p = prof();
        p.missions = { active: [{ id: 'jump', target: 2, progress: 0, tier: 0 }, { id: 'wins', target: 2, progress: 0, tier: 0 }, { id: 'gum', target: 3, progress: 0, tier: 0 }], done: 0 };
        let r = applyMissionProgress(p, { state: 'crash', animalsJumped: 1, gumPicked: 0 }, seq(0.5));
        expect(r.completed).toHaveLength(0);
        expect(p.missions.active.find(a => a.id === 'jump').progress).toBe(1);
        r = applyMissionProgress(p, { state: 'win', animalsJumped: 3, strikes: 1 }, seq(0.5));
        expect(r.completed.map(c => c.text)).toContain('Перепрыгни зверей');
        expect(r.chips).toBe(30);
        expect(p.season.chips).toBe(30);
        expect(p.missions.active).toHaveLength(3);
        expect(p.missions.active.some(a => a.id === 'jump')).toBe(false);
        expect(p.missions.done).toBe(1);
    });
    it('чем больше выполнено — тем выше цель', () => {
        const p = prof(); p.missions = { active: [], done: 12 };
        ensureMissions(p, seq(0.1, 0.4, 0.7));
        p.missions.active.forEach(a => expect(a.target).toBe(MISSION_POOL.find(x => x.id === a.id).targets[2]));
    });
    it('особые счётчики: финиш, финиш без аварий, босс', () => {
        expect(raceStat('wins', { state: 'win' })).toBe(1);
        expect(raceStat('cleanWins', { state: 'win', strikes: 1 })).toBe(0);
        expect(raceStat('cleanWins', { state: 'win', strikes: 0 })).toBe(1);
        expect(raceStat('bossDefeated', { bossDefeated: true })).toBe(1);
        expect(missionRows(prof())).toHaveLength(3);
    });
});

describe('множитель за риск', () => {
    it('цепочка растит ×1 → ×5, очки × множитель', () => {
        const r = createRisk();
        expect(riskEvent(r, 'nearMiss')).toEqual({ gained: 50, mult: 2, fever: false });
        expect(riskEvent(r, 'jump').gained).toBe(160);
        riskEvent(r, 'landing'); riskEvent(r, 'nearMiss'); riskEvent(r, 'nearMiss');
        expect(r.mult).toBe(MAX_MULT);
        expect(r.best).toBe(MAX_MULT);
    });
    it('пауза гасит цепочку, авария сбрасывает сразу', () => {
        const r = createRisk();
        riskEvent(r, 'nearMiss'); riskEvent(r, 'nearMiss');
        expect(riskTick(r, CHAIN_WINDOW - 0.1)).toBe(false);
        expect(riskTick(r, 0.2)).toBe(true);
        expect(r.mult).toBe(1);
        riskEvent(r, 'jump'); riskEvent(r, 'jump');
        expect(riskCrash(r)).toBe(3);
        expect(r.mult).toBe(1);
        expect(riskToXp(1000)).toBe(50);
    });
});

describe('ежедневная серия', () => {
    it('дни подряд растят серию, пропуск — заново', () => {
        const p = prof();
        expect(touchStreak(p, '2026-09-01').count).toBe(1);
        expect(touchStreak(p, '2026-09-01').isNewDay).toBe(false);
        expect(touchStreak(p, '2026-09-02').count).toBe(2);
        expect(touchStreak(p, '2026-09-03').count).toBe(3);
        expect(touchStreak(p, '2026-09-05').count).toBe(1);
        expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
        expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    });
    it('сундук раз в день, 7-й — большой, потом по кругу', () => {
        const p = prof();
        touchStreak(p, '2026-09-01');
        expect(canClaimChest(p, '2026-09-01')).toBe(true);
        expect(claimChest(p, '2026-09-01', () => 0.5)).toEqual({ chips: 70, vhs: 0, day: 1 }); // без жвачек: бывшие 5 🍬 — это +50 «Е»
        expect(CHESTS[6].vhs).toBe(1); // 7-й день — кассета всегда
        expect(claimChest(p, '2026-09-01')).toBe(null);
        expect(p.season.chips).toBe(70);
        expect(chestFor(7)).toEqual(CHESTS[6]);
        expect(chestFor(8)).toEqual(CHESTS[0]);
    });
});

import { scoreMult } from '../../src/missions.js';
describe('множитель очков за задания', () => {
    it('каждые 3 выполненных задания — +1, до ×30; «проедь за заезд» — лучший заезд, не сумма', () => {
        expect(scoreMult({ missions: { done: 0 } })).toBe(1);
        expect(scoreMult({ missions: { done: 7 } })).toBe(3);
        expect(scoreMult({ missions: { done: 999 } })).toBe(30);
        const p = { season: { chips: 0 }, missions: { active: [{ id: 'dist', target: 1000, progress: 0, tier: 0 }, { id: 'echips', target: 40, progress: 0, tier: 0 }, { id: 'powers', target: 2, progress: 0, tier: 0 }], done: 0 } };
        applyMissionProgress(p, { state: 'crash', distance: 600, eChips: 30, powers: 1 }, () => 0.5);
        applyMissionProgress(p, { state: 'crash', distance: 700, eChips: 15, powers: 1 }, () => 0.5);
        expect(p.missions.done).toBe(2); // «Е» 30+15 ≥ 40 и усиления 1+1 — выполнены; дистанция — нет (лучший заезд 700 < 1000)
        expect(p.missions.active.find(a => a.id === 'dist').progress).toBe(700);
    });
});
