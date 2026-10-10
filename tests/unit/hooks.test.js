import { describe, it, expect } from 'vitest';
import { checkTestDrives, tickets, useTicket, ladder, pickCar, tdOffer } from '../../src/test-drive.js';
import { checkSecretPaints, racesIn, raceStreak, countRace } from '../../src/secret-paints.js';
import { helloDue, markHello, unseenNews, markSeen, NEWS } from '../../src/ui/hello-news.js';
import { CAR_PRESETS } from '../../src/data.js';

const prof = function() { return { name: 'Тест', unlockedCars: ['cheburashka'] }; };
const S = function(o) { return Object.assign({ chapters: 0, beastWaves: 0, infBest: 0 }, o); };

describe('тест-драйвы за вехи', () => {
    it('2 главы — билет на «Ракету», один раз', () => {
        const p = prof();
        expect(checkTestDrives(p, S({ chapters: 1 }), CAR_PRESETS)).toEqual([]);
        const t = checkTestDrives(p, S({ chapters: 2 }), CAR_PRESETS);
        expect(t.map(function(k) { return k.car; })).toEqual(['raketa']);
        expect(checkTestDrives(p, S({ chapters: 3 }), CAR_PRESETS)).toEqual([]);
        expect(tickets(p).length).toBe(1);
    });
    it('3 волны — мотоцикл «Трайк» (подарочный — без цены, с подсказкой)', () => {
        const p = prof();
        const t = checkTestDrives(p, S({ beastWaves: 3 }), CAR_PRESETS);
        expect(t[0].car).toBe('trike');
        const o = tdOffer('trike', CAR_PRESETS);
        expect(o.price).toBe(0);
        expect(o.how).toMatch(/7 дней/);
    });
    it('4000 м, потом +1000 к рекорду, и дальше каждые +1000', () => {
        const p = prof();
        const D = 86400000; // билеты — не чаще раза в 3 дня
        expect(checkTestDrives(p, S({ infBest: 4200 }), CAR_PRESETS, D)[0].car).toBe('avenger');
        expect(checkTestDrives(p, S({ infBest: 5100 }), CAR_PRESETS, 5 * D)).toEqual([]);
        expect(checkTestDrives(p, S({ infBest: 5200 }), CAR_PRESETS, 5 * D)[0].car).toBe('timecar');
        const more = checkTestDrives(p, S({ infBest: 6300 }), CAR_PRESETS, 9 * D);
        expect(more.length).toBe(1);
        expect(p.unlockedCars).not.toContain(more[0].car);
    });
    it('машина уже есть — билет на самую дорогую из отсутствующих', () => {
        const p = prof();
        p.unlockedCars.push('raketa');
        const c = pickCar(p, 'raketa', CAR_PRESETS);
        expect(c).not.toBe('raketa');
        expect(CAR_PRESETS[c].priceChips).toBeGreaterThan(0);
    });
    it('билет тратится; купленная машина — билет не показывается', () => {
        const p = prof();
        checkTestDrives(p, S({ chapters: 2, beastWaves: 3 }), CAR_PRESETS);
        expect(useTicket(p, 'raketa')).toBe(true);
        expect(useTicket(p, 'raketa')).toBe(false);
        p.unlockedCars.push('trike');
        expect(tickets(p).length).toBe(0);
    });
    it('лестница: 4-я веха закрыта до 4000 м, прогресс считается', () => {
        const l = ladder(prof(), S({ chapters: 1, infBest: 1000 }));
        expect(l.find(function(m) { return m.id === 'rec1000'; }).locked).toBe(true);
        expect(l.find(function(m) { return m.id === 'camp2'; }).prog).toEqual([1, 2]);
    });
});

describe('секретные краски', () => {
    it('10 заездов за 3 дня — неон', () => {
        const p = prof();
        let got = [];
        for (let i = 0; i < 5; i++) got = got.concat(checkSecretPaints(p, '2026-10-01'));
        for (let i = 0; i < 4; i++) got = got.concat(checkSecretPaints(p, '2026-10-03'));
        expect(got).toEqual([]);
        got = checkSecretPaints(p, '2026-10-03');
        expect(got.map(function(x) { return x.id; })).toEqual(['neon']);
        expect(racesIn(p, '2026-10-04', 3)).toBe(5);
    });
    it('7 дней подряд — золото', () => {
        const p = prof();
        let got = [];
        for (let d = 1; d <= 7; d++) got = got.concat(checkSecretPaints(p, '2026-10-0' + d));
        expect(got.map(function(x) { return x.id; })).toContain('gold');
        expect(raceStreak(p, '2026-10-07')).toBe(7);
    });
    it('старые дни забываются', () => {
        const p = prof();
        countRace(p, '2026-09-01');
        countRace(p, '2026-10-01');
        expect(Object.keys(p.activity)).toEqual(['2026-10-01']);
    });
});

describe('окно «Привет»', () => {
    it('новое — показать; прочитал — раз в день', () => {
        const p = prof();
        expect(unseenNews(p).length).toBe(NEWS.length);
        expect(helloDue(p, '2026-10-04')).toBe(true);
        markHello(p, '2026-10-04');
        expect(helloDue(p, '2026-10-04')).toBe(false);
        expect(helloDue(p, '2026-10-05')).toBe(true);
    });
    it('видел «машины в подарок» раньше — это уже не новость', () => {
        const p = prof();
        markSeen(p, 'gift-cars-v1');
        expect(unseenNews(p).map(function(x) { return x.id; })).not.toContain('gift-cars-v1');
    });
});

describe('тест-драйвы — раз в 3 дня и без повторов', () => {
    it('вторая веха в тот же день ждёт очереди и выдаётся через 3 дня; машины в билетах и лестнице разные', async () => {
        const { checkTestDrives, ladder, tickets, TICKET_EVERY_MS } = await import('../../src/test-drive.js');
        const p = { unlockedCars: ['cheburashka', 'raketa', 'avenger'], season: { chips: 0 } }; // «Ракета» и «Мститель» уже есть
        const t0 = 1e12;
        const q = checkTestDrives(p, { chapters: 2, beastWaves: 3, infBest: 0 }, CAR_PRESETS, t0);
        expect(q.length).toBe(1);
        expect(q.queued.length).toBe(1); // вторая веха выполнена — на итогах пишем, когда придёт билет, а не молчим
        expect(q.queued[0].inDays).toBe(3);
        expect(q.queued[0].car).toBeTruthy();
        expect(checkTestDrives(p, { chapters: 2, beastWaves: 3, infBest: 0 }, CAR_PRESETS, t0 + 1000)).toEqual([]);
        expect(checkTestDrives(p, { chapters: 2, beastWaves: 3, infBest: 0 }, CAR_PRESETS, t0 + TICKET_EVERY_MS).length).toBe(1);
        const cars = tickets(p).map(k => k.car);
        expect(new Set(cars).size).toBe(cars.length);
        const lad = ladder(p, { chapters: 2, beastWaves: 3, infBest: 0 }, CAR_PRESETS).filter(s => !s.done).map(s => s.car);
        lad.forEach(c => expect(cars).not.toContain(c));
        expect(new Set(lad).size).toBe(lad.length);
        lad.forEach(c => expect(p.unlockedCars).not.toContain(c));
    });
});
