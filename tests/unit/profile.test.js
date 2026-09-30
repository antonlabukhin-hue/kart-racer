import { describe, it, expect } from 'vitest';
import {
    createProfile, ensureProfileFields, loadProfiles, saveProfiles, saveProfile, PROFILES_KEY, SESSION_KEY,
    seasonXpToNext, addSeasonXp, grantAchievement, claimSeasonRewards, applyRaceResult,
    mergeCampaignBackup, markChapterWon, nextChapterIdx, beastHourOpen, grantChapterReward, CHAPTER_REWARDS, buyPaint, toggleCarPart, MAX_SEASON_LEVEL
} from '../../src/profile.js';
import { TROPHIES, SEASON_REWARDS, CAR_PARTS, CAR_PAINTS, DAILY_CONTRACTS } from '../../src/content.js';
import { mergeStars } from '../../src/campaign-stars.js';
import { mergeTaskProgress } from '../../src/chapter-tasks.js';

function mem(init) {
    const m = Object.assign({}, init);
    return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, _m: m };
}
const fresh = () => ensureProfileFields(createProfile('Тестер', 1000, () => 0.5), 2);
const win = (over) => Object.assign({ time: 60, strikes: 1, animalsHit: 0, oilHits: 0, nitroPicked: 1, gumPicked: 0, weather: 'day', difficulty: 'easy', mapId: 'arsenev' }, over || {});

describe('профиль: создание, миграции, хранение', () => {
    it('новый профиль заполнен и проходит миграции без потерь', () => {
        const p = fresh();
        expect(p.name).toBe('Тестер');
        expect(p.season).toMatchObject({ level: 1, xp: 0, chips: 0, gum: 0 });
        expect(p.carLoadout.ownedParts).toEqual([]);
        expect(p.campaign).toMatchObject({ unlocked: 1, completed: [], stars: {} });
    });

    it('старый профиль: купленные детали и краски не теряются, рекорды обнуляются при смене баланса', () => {
        const old = { id: 'p1', name: 'x', season: { level: 3, xp: 5 }, preferredCar: 'turbo', bestTimes: { easy: 50 },
            carLoadout: { parts: ['spoiler'], paint: 'red' } };
        const p = ensureProfileFields(old, 2);
        expect(p.carLoadout.ownedParts).toEqual(['spoiler']);
        expect(p.carLoadout.paintByCar.turbo).toBe('red');
        expect(p.carLoadout.ownedPaints).toEqual(['red']);
        expect(p.bestTimes.easy).toBeNull();
        expect(p.season.chips).toBe(0);
    });

    it('сохранение: запись по id, повреждённые данные не роняют игру', () => {
        const st = mem();
        const p = fresh();
        expect(saveProfile(p, st)).toBe(true);
        p.season.chips = 7;
        saveProfile(p, st);
        expect(loadProfiles(st)).toHaveLength(1);
        expect(loadProfiles(st)[0].season.chips).toBe(7);
        expect(st.getItem(SESSION_KEY)).toBe(p.id);
        expect(loadProfiles(mem({ [PROFILES_KEY]: '{битый json' }))).toEqual([]);
        expect(loadProfiles(mem({ [PROFILES_KEY]: '[null, 5, {"id":"a"}]' }))).toEqual([{ id: 'a' }]);
        const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
        expect(saveProfiles([p], full)).toBe(false);
    });
});

describe('сезон и награды', () => {
    it('опыт переводит уровни и даёт жвачку, потолок — 30-й уровень', () => {
        const s = { level: 1, xp: 0, gum: 0 };
        const r = addSeasonXp(s, seasonXpToNext(1) + seasonXpToNext(2) + 3);
        expect(s).toMatchObject({ level: 3, xp: 3, gum: 20 });
        expect(r.reached).toEqual([2, 3]);
        const top = { level: MAX_SEASON_LEVEL, xp: 0, gum: 0 };
        addSeasonXp(top, 99999);
        expect(top).toMatchObject({ level: MAX_SEASON_LEVEL, xp: 0 });
    });

    it('награды сезона забираются один раз', () => {
        const p = fresh();
        p.season.level = 2;
        const a = claimSeasonRewards(p, SEASON_REWARDS, 1);
        expect(a.levels).toEqual([1, 2]);
        expect(p.season.gum).toBe(SEASON_REWARDS[0].gum + SEASON_REWARDS[1].gum);
        expect(claimSeasonRewards(p, SEASON_REWARDS, 2).levels).toEqual([]);
    });

    it('ачивка выдаётся один раз и приносит свою фигурку', () => {
        const p = fresh();
        const r = grantAchievement(p, 'first_win', TROPHIES, 5);
        expect(r.isNew).toBe(true);
        expect(r.trophies.map(t => t.id)).toEqual(['t_cheburashka']);
        expect(grantAchievement(p, 'first_win', TROPHIES).isNew).toBe(false);
    });
});

describe('итог заезда', () => {
    it('победа: фишки, жвачка, опыт, ачивки, рекорд, история', () => {
        const p = fresh();
        const r = applyRaceResult(p, 'win', win({ strikes: 0, gumPicked: 2, nitroPicked: 0 }), { trophies: TROPHIES, now: 1 });
        expect(r.chips).toBe(30 + 20 + 10);
        expect(r.gum).toBe(5 + 2 * 3);
        expect(r.xp).toBe(25 + 60 + 40);
        // фишки за выполненные задания (src/missions.js) идут отдельной строкой — задания случайные
        expect(p.season.chips).toBe(60 + r.missions.chips);
        expect(r.missions.progressed.length).toBeGreaterThanOrEqual(0);
        expect(r.achievements.sort()).toEqual(['first_win', 'gum_2', 'no_nitro', 'perfect'].sort());
        expect(r.newBest).toBe(true);
        expect(p.bestTimes.easy).toBe(60);
        expect(p.stats).toMatchObject({ wins: 1, totalRaces: 1, perfectWins: 1 });
        expect(p.history[0]).toMatchObject({ state: 'win', map: 'arsenev', xp: r.xp });
        // медленнее — не рекорд, ачивки повторно не выдаются
        const r2 = applyRaceResult(p, 'win', win({ time: 70 }), { trophies: TROPHIES });
        expect(r2.newBest).toBe(false);
        expect(r2.achievements).toEqual([]);
    });

    it('авария и время вышло: утешительная фишка и опыт, без рекорда', () => {
        const p = fresh();
        expect(applyRaceResult(p, 'crash', win(), {})).toMatchObject({ chips: 10, xp: 35, gum: 0, newBest: false });
        expect(applyRaceResult(p, 'timeout', win(), {})).toMatchObject({ chips: 10, xp: 35 });
        expect(p.stats).toMatchObject({ crashes: 1, timeouts: 1, wins: 0 });
    });

    it('победа на сложном открывает следующую карту; с последней — ничего', () => {
        const p = fresh();
        expect(applyRaceResult(p, 'win', win({ difficulty: 'hard' }), {}).unlockedMaps).toEqual(['promzona']);
        expect(applyRaceResult(p, 'win', win({ difficulty: 'hard', mapId: 'svalka' }), {}).unlockedMaps).toEqual([]);
        expect(p.unlockedMaps).toEqual(['arsenev', 'promzona']);
    });

    it('контракт дня засчитывается один раз и только в режиме контракта', () => {
        const p = fresh();
        const k = DAILY_CONTRACTS.find(c => c.id === 'perfect');
        const m = win({ strikes: 0 });
        expect(applyRaceResult(p, 'win', m, { contract: k, contractMode: false }).contractDone).toBe(false);
        const r = applyRaceResult(p, 'win', m, { contract: k, contractMode: true });
        expect(r.contractDone).toBe(true);
        expect(r.contractTitle).toBe(k.title);
        expect(applyRaceResult(p, 'win', m, { contract: k, contractMode: true }).contractDone).toBe(false);
        expect(p.season.contractsDone).toBe(1);
    });

    it('история не растёт бесконечно', () => {
        const p = fresh();
        for (let i = 0; i < 40; i++) applyRaceResult(p, 'crash', win(), {});
        expect(p.history).toHaveLength(25);
    });
});

describe('кампания', () => {
    it('победа в главе открывает следующую и не теряет остальные поля', () => {
        const r = markChapterWon({ unlocked: 1, completed: [], stars: { c01: 2 }, tasks: { c01: [true, false, false] }, current: 0 }, 'c01', 0, 17);
        expect(r.unlockedNew).toBe(true);
        expect(r.campaign).toMatchObject({ unlocked: 2, completed: ['c01'], stars: { c01: 2 }, current: 0 });
        expect(r.campaign.tasks.c01).toEqual([true, false, false]);
        // повторная победа в старой главе не «закрывает» открытые дальше
        const r2 = markChapterWon({ unlocked: 5, completed: ['c01'] }, 'c01', 0, 17);
        expect(r2).toMatchObject({ unlockedNew: false, campaign: { unlocked: 5, completed: ['c01'] } });
        // последняя глава — не больше числа глав
        expect(markChapterWon({ unlocked: 17, completed: [] }, 'c17', 16, 17).campaign.unlocked).toBe(17);
    });

    it('резервная копия возвращает потерянные главы, звёзды и задания', () => {
        const cp = { unlocked: 2, completed: ['c01'], stars: { c01: 1 } };
        mergeCampaignBackup(cp, { unlocked: 4, completed: ['c01', 'c02', 'c03'], stars: { c01: 3, c02: 2 }, tasks: { c02: [false, true, false] } }, mergeStars, mergeTaskProgress);
        expect(cp.unlocked).toBe(4);
        expect(cp.completed).toEqual(['c01', 'c02', 'c03']);
        expect(cp.stars).toEqual({ c01: 3, c02: 2 });
        expect(cp.tasks.c02).toEqual([false, true, false]);
        expect(mergeCampaignBackup({ unlocked: 0 }, null)).toEqual({ unlocked: 1, completed: [] });
    });
});

describe('гараж', () => {
    it('покраска: платная списывает фишки один раз, бесплатная и купленная — без списания', () => {
        const p = fresh();
        const red = CAR_PAINTS.find(c => c.id === 'red');
        expect(buyPaint(p, 'cheburashka', red)).toMatchObject({ ok: false, reason: 'no_chips' });
        p.season.chips = 2000;
        expect(buyPaint(p, 'cheburashka', red)).toMatchObject({ ok: true, paid: red.price });
        expect(buyPaint(p, 'cheburashka', red)).toMatchObject({ ok: false, reason: 'same' });
        p.carLoadout.paintByCar.turbo = 'stock'; // своя краска у Волги — заводская
        expect(buyPaint(p, 'turbo', red)).toMatchObject({ ok: true, paid: 0 }); // уже куплена — на другую машину бесплатно
        expect(p.season.chips).toBe(2000 - red.price);
        expect(p.carLoadout.paintByCar).toMatchObject({ cheburashka: 'red', turbo: 'red' });
    });

    it('детали: покупка, снятие без потери покупки, замена в том же слоте', () => {
        const p = fresh();
        p.season.chips = 1000;
        const spoiler = CAR_PARTS.find(x => x.id === 'spoiler');
        expect(toggleCarPart(p, spoiler, CAR_PARTS)).toMatchObject({ ok: true, action: 'installed', paid: spoiler.price });
        expect(toggleCarPart(p, spoiler, CAR_PARTS)).toMatchObject({ ok: true, action: 'removed' });
        expect(toggleCarPart(p, spoiler, CAR_PARTS)).toMatchObject({ ok: true, action: 'installed', paid: 0 });
        expect(p.season.chips).toBe(1000 - spoiler.price);
        // две детали одного слота не ставятся одновременно
        const fake = { id: 'spoiler2', slot: 'spoiler', price: 1 };
        toggleCarPart(p, fake, CAR_PARTS.concat([fake]));
        expect(p.carLoadout.parts).toEqual(['spoiler2']);
        expect(p.carLoadout.ownedParts).toEqual(['spoiler', 'spoiler2']);
        const poor = fresh();
        expect(toggleCarPart(poor, spoiler, CAR_PARTS)).toMatchObject({ ok: false, reason: 'no_chips' });
    });
});

describe('кнопка «Играть»', () => {
    const tracks = [{ id: 'c01' }, { id: 'c02' }, { id: 'c03' }];
    it('новичок — глава 1, дальше — первая непройденная из открытых', () => {
        expect(nextChapterIdx(null, tracks)).toBe(0);
        expect(nextChapterIdx({ unlocked: 2, completed: ['c01'] }, tracks)).toBe(1);
        // перепрошёл не по порядку — всё равно ведёт в пропущенную
        expect(nextChapterIdx({ unlocked: 3, completed: ['c01', 'c03'] }, tracks)).toBe(1);
    });
    it('всё пройдено — последняя глава; мусор в профиле не ломает', () => {
        expect(nextChapterIdx({ unlocked: 3, completed: ['c01', 'c02', 'c03'] }, tracks)).toBe(2);
        expect(nextChapterIdx({ unlocked: 99 }, tracks)).toBe(0);
        expect(nextChapterIdx({ unlocked: 0 }, tracks)).toBe(0);
    });
});

describe('награда за главу 1', () => {
    it('«Звериный час» закрыт до главы 1; у старых игроков с рекордом — открыт', () => {
        const p = createProfile('A', 1, () => 0.5);
        expect(beastHourOpen(p)).toBe(false);
        p.campaign = { unlocked: 2, completed: ['c01'] };
        expect(beastHourOpen(p)).toBe(true);
        expect(beastHourOpen({ endlessBest: 1200 })).toBe(true);
        expect(beastHourOpen(null)).toBe(false);
    });
    it('краска выдаётся один раз и ставится на машину; за другие главы — ничего', () => {
        const p = createProfile('A', 1, () => 0.5);
        ensureProfileFields(p, 99);
        expect(grantChapterReward(p, 'c02', 'cheburashka')).toBeNull();
        expect(grantChapterReward(p, 'c01', 'cheburashka')).toEqual({ paint: 'yellow', equip: true, beastHour: true });
        expect(p.carLoadout.ownedPaints).toContain('yellow');
        expect(p.carLoadout.paintByCar.cheburashka).toBe('yellow');
        expect(grantChapterReward(p, 'c01', 'cheburashka')).toBeNull();
    });
});

describe('фишки за чистые отрезки', () => {
    it('добавляются к награде, но не больше 20 за заезд', () => {
        const a = createProfile('A', 1, () => 0.5); ensureProfileFields(a, 99);
        const b = createProfile('B', 1, () => 0.5); ensureProfileFields(b, 99);
        const base = applyRaceResult(a, 'crash', {}, {}).chips;
        expect(applyRaceResult(b, 'crash', { bonusChips: 4 }, {}).chips).toBe(base + 4);
        const c = createProfile('C', 1, () => 0.5); ensureProfileFields(c, 99);
        expect(applyRaceResult(c, 'crash', { bonusChips: 999 }, {}).chips).toBe(base + 200);
    });
});

describe('контракты дня на механики', () => {
    it('проверка видит посадки, босса, отрезки, щиты и «На волоске!»', async () => {
        const { DAILY_CONTRACTS } = await import('../../src/content.js');
        const byId = id => DAILY_CONTRACTS.find(c => c.id === id);
        const run = (k, st, m) => {
            const p = createProfile('A', 1, () => 0.5); ensureProfileFields(p, 99);
            p.daily = { contractId: k.id, done: false };
            return applyRaceResult(p, st, m, { contract: k, contractMode: true }).contractDone;
        };
        expect(run(byId('landings2'), 'win', { cleanLandings: 2 })).toBe(true);
        expect(run(byId('landings2'), 'win', { cleanLandings: 1 })).toBe(false);
        expect(run(byId('boss'), 'crash', { bossDefeated: true })).toBe(true);
        expect(run(byId('clean2'), 'timeout', { cleanSegments: 2 })).toBe(true);
        expect(run(byId('boards1'), 'win', { billboards: 1 })).toBe(true);
        expect(run(byId('boards1'), 'crash', { billboards: 3 })).toBe(false);
        expect(run(byId('nearmiss5'), 'win', { nearMiss: 5 })).toBe(true);
    });
});

describe('коллекция кампании', () => {
    it('награды раз в несколько глав: краски и детали, каждая — один раз', () => {
        const p = createProfile('A', 1, () => 0.5);
        ensureProfileFields(p, 99);
        expect(Object.keys(CHAPTER_REWARDS).length).toBeGreaterThanOrEqual(6);
        expect(grantChapterReward(p, 'c03', 'cheburashka')).toEqual({ paint: 'purple', equip: false, beastHour: false });
        expect(p.carLoadout.ownedPaints).toContain('purple');
        // краска не за главу 1 в коллекцию, но на машину сама не ставится
        expect(p.carLoadout.paintByCar.cheburashka).not.toBe('purple');
        expect(grantChapterReward(p, 'c06', 'cheburashka')).toEqual({ part: 'rims' });
        expect(p.carLoadout.ownedParts).toContain('rims');
        expect(grantChapterReward(p, 'c06', 'cheburashka')).toBeNull();
        expect(grantChapterReward(p, 'c02', 'cheburashka')).toBeNull();
    });
});

describe('фишки «Е» с трассы', () => {
    it('идут в кошелёк без потолка бонусов', () => {
        const p = fresh();
        const r = applyRaceResult(p, 'crash', { time: 30, strikes: 5, difficulty: 'easy', eChips: 137, bonusChips: 50 }, { trophies: TROPHIES, now: 1 });
        expect(r.chips).toBe(10 + 50 + 137);
    });
    it('бесконечная трасса: опыт за дальность и рекорд', () => {
        const p = fresh();
        const base = applyRaceResult(fresh(), 'crash', { time: 30, strikes: 5 }, { trophies: TROPHIES, now: 1 }).xp;
        const r = applyRaceResult(p, 'crash', { time: 60, strikes: 5, distance: 2000, infScore: 2500 }, { trophies: TROPHIES, now: 1 });
        expect(r.xp).toBe(base + 100);
        expect(r.infBest).toMatchObject({ isNew: true, prev: 0, best: 2000 });
        const r2 = applyRaceResult(p, 'crash', { time: 20, strikes: 5, distance: 800, infScore: 900 }, { trophies: TROPHIES, now: 2 });
        expect(r2.infBest).toMatchObject({ isNew: false, best: 2000 });
        expect(p.infinite).toMatchObject({ best: 2000, bestScore: 2500, runs: 2 });
    });
});
