/**
 * Профиль игрока: создание и миграции, хранение, сезон и опыт, награды за заезд,
 * ачивки, кампания, покупки в гараже. Только логика — без DOM и уведомлений:
 * main.js вызывает эти функции и сам показывает сообщения. Хранилище передаётся
 * параметром (в тестах — объект в памяти), поэтому всё покрыто tests/unit/profile.test.js.
 */
import { applyMissionProgress, ensureMissions } from './missions.js';
import { rankOf, totalFromSeason, RANKS } from './ranks.js';
import { riskToXp } from './risk-combo.js';
import { countArrowRun } from './move-tutor.js';

export const PROFILES_KEY = 'road_racing_profiles_v1';
export const SESSION_KEY = 'road_racing_session_player';
export const MAX_SEASON_LEVEL = 30;
export const HISTORY_LIMIT = 25;
export const MAP_ORDER = ['arsenev', 'promzona', 'svalka'];

export function campaignBackupKey(p) {
    return 'road_racing_campaign_' + (p && (p.id || p.name) || 'p');
}

export function defaultSeason() {
    return { level: 1, xp: 0, chips: 0, contractsDone: 0, titles: [] };
}

export function defaultStats() {
    return {
        wins: 0, crashes: 0, timeouts: 0, totalRaces: 0,
        animalsHit: 0, oilHits: 0, nitroPicked: 0, gumPicked: 0,
        nightWins: 0, rainWins: 0, perfectWins: 0, hardWins: 0
    };
}

export function createProfile(name, now, rnd) {
    const t = now != null ? now : Date.now();
    const r = rnd || Math.random;
    return {
        id: 'p_' + t.toString(36) + '_' + r().toString(36).slice(2, 7),
        name: String(name).trim().slice(0, 16),
        createdAt: t,
        preferredCar: 'cheburashka',
        unlockedCars: ['cheburashka'],
        hasSeenShop: false,
        season: defaultSeason(),
        stats: defaultStats(),
        bestTimes: { easy: null, medium: null, hard: null },
        achievements: {},
        history: [],
        unlockedMaps: ['arsenev'],
        campaign: { unlocked: 1, completed: [] },
        claimedRewards: {},
        daily: { date: null, done: false, contractId: null }
    };
}

/** Дописать недостающие поля и провести миграции старых профилей (мутирует p) */
export function ensureProfileFields(p, balanceVersion) {
    if (!p.unlockedCars) p.unlockedCars = ['cheburashka'];
    if (p.hasSeenShop == null) p.hasSeenShop = false;
    if (!p.claimedRewards) p.claimedRewards = {};
    if (!p.daily) p.daily = { date: null, done: false, contractId: null };
    if (!p.season) p.season = defaultSeason();
    if (!p.stats) p.stats = defaultStats();
    if (!p.achievements) p.achievements = {};
    if (!Array.isArray(p.unlockedMaps)) p.unlockedMaps = ['arsenev'];
    if (!p.campaign) p.campaign = { unlocked: 1, completed: [] };
    if (p.campaign.unlocked == null) p.campaign.unlocked = 1;
    if (!Array.isArray(p.campaign.completed)) p.campaign.completed = [];
    if (!p.campaign.stars || typeof p.campaign.stars !== 'object') p.campaign.stars = {};
    // трассы и лимит времени поменялись (баланс v2: 90 с) — старые рекорды несравнимы
    if (balanceVersion != null && p.balanceVer !== balanceVersion) {
        p.bestTimes = { easy: null, medium: null, hard: null };
        p.balanceVer = balanceVersion;
    }
    if (!p.bestTimes) p.bestTimes = { easy: null, medium: null, hard: null };
    if (p.season.chips == null) p.season.chips = 0;
    // экономика «Е» (v2): цены и награды выросли в 10 раз — накопленное тоже ×10, один раз
    if (p.econVer !== 2) { p.season.chips = (p.season.chips || 0) * 10; p.econVer = 2; }
    // весь опыт за всё время (уровень и звание игрока, src/ranks.js): у старых профилей — из прогресса сезона
    if (p.totalXp == null) p.totalXp = totalFromSeason(p.season, seasonXpToNext);
    // жвачки убраны (ни на что не тратились): накопленные — в «Е», 1 к 10, один раз
    if (p.season.gum != null) { p.season.chips = (p.season.chips || 0) + Math.max(0, p.season.gum || 0) * 10; delete p.season.gum; }
    if (!p.carLoadout) p.carLoadout = { parts: [], ownedParts: [], paint: 'stock', paintByCar: {} };
    if (!p.carLoadout.parts) p.carLoadout.parts = [];
    // раньше один список parts означал и «куплено», и «установлено» — снятие стирало покупку
    if (!Array.isArray(p.carLoadout.ownedParts)) p.carLoadout.ownedParts = p.carLoadout.parts.slice();
    if (!p.carLoadout.paintByCar || typeof p.carLoadout.paintByCar !== 'object') p.carLoadout.paintByCar = {};
    // общий paint → текущей машине
    if (p.carLoadout.paint && p.preferredCar && !p.carLoadout.paintByCar[p.preferredCar]) {
        p.carLoadout.paintByCar[p.preferredCar] = p.carLoadout.paint;
    }
    // ownedPaints — купленные цвета; миграция: всё, что стоит на машинах, считаем купленным
    if (!Array.isArray(p.carLoadout.ownedPaints)) {
        const was = Object.values(p.carLoadout.paintByCar);
        if (p.carLoadout.paint) was.push(p.carLoadout.paint);
        p.carLoadout.ownedPaints = Array.from(new Set(was.filter(function(id) { return id && id !== 'stock'; })));
    }
    if (!p.trophies) p.trophies = {};
    ensureMissions(p);
    return p;
}

// ---------------- хранение ----------------

export function loadProfiles(storage) {
    try {
        const raw = storage && storage.getItem(PROFILES_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list.filter(function(p) { return p && typeof p === 'object' && p.id; }) : [];
    } catch (e) { return []; }
}

export function saveProfiles(list, storage) {
    try { if (storage) storage.setItem(PROFILES_KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
}

/** Записать профиль в общий список (заменить по id или добавить) */
export function saveProfile(profile, storage) {
    const list = loadProfiles(storage);
    const i = list.findIndex(function(p) { return p.id === profile.id; });
    if (i >= 0) list[i] = profile; else list.push(profile);
    const ok = saveProfiles(list, storage);
    try { if (storage) storage.setItem(SESSION_KEY, profile.id); } catch (e) {}
    return ok;
}

// ---------------- сезон ----------------

export function seasonXpToNext(level) {
    return 80 + (level - 1) * 25;
}

/** Начислить опыт сезона; за каждый уровень +100 «Е». Возвращает { levelsGained, reached } */
export function addSeasonXp(season, amount) {
    const before = season.level;
    season.xp += amount;
    let guard = 0;
    while (season.xp >= seasonXpToNext(season.level) && season.level < MAX_SEASON_LEVEL && guard < 40) {
        season.xp -= seasonXpToNext(season.level);
        season.level += 1;
        season.chips = (season.chips || 0) + 100;
        guard++;
    }
    if (season.level >= MAX_SEASON_LEVEL) season.xp = 0;
    const reached = [];
    for (let l = before + 1; l <= season.level; l++) reached.push(l);
    return { levelsGained: season.level - before, reached: reached };
}

/** Ачивка + фигурки-трофеи за неё. Возвращает { isNew, trophies: [новые трофеи] } */
export function grantAchievement(profile, id, trophies, now) {
    if (!profile || !id) return { isNew: false, trophies: [] };
    if (!profile.achievements) profile.achievements = {};
    if (profile.achievements[id]) return { isNew: false, trophies: [] };
    const t = now != null ? now : Date.now();
    profile.achievements[id] = t;
    if (!profile.trophies) profile.trophies = {};
    const got = [];
    (trophies || []).forEach(function(tr) {
        if (tr.need === id && !profile.trophies[tr.id]) { profile.trophies[tr.id] = t; got.push(tr); }
    });
    return { isNew: true, trophies: got };
}

/** Забрать доступные награды сезона (уровни ≤ текущего). Возвращает { chips, levels } */
export function claimSeasonRewards(profile, rewards, now) {
    const out = { chips: 0, levels: [] };
    const lv = profile.season.level;
    (rewards || []).forEach(function(r) {
        if (r.level <= lv && !profile.claimedRewards[r.level]) {
            profile.claimedRewards[r.level] = now != null ? now : Date.now();
            profile.season.chips += r.chips;
            out.chips += r.chips;
            out.levels.push(r.level);
        }
    });
    return out;
}

// ---------------- награды за заезд ----------------

/**
 * Итог заезда: статистика, фишки, жвачка, опыт, ачивки, рекорд, открытие карт, контракт дня, история.
 * state — 'win' | 'crash' | 'timeout'; meta — { time, strikes, animalsHit, oilHits, nitroPicked, gumPicked,
 * weather, difficulty, mapId }; ctx — { trophies, contract, contractMode, now }.
 * Мутирует profile, возвращает награды и что изменилось.
 */
export function applyRaceResult(profile, state, meta, ctx) {
    const c = ctx || {};
    const m = meta || {};
    const st = profile.stats;
    const levelBefore = profile.season.level;
    const achievements = [];
    const trophies = [];
    const tryAch = function(id) {
        const r = grantAchievement(profile, id, c.trophies, c.now);
        if (r.isNew) { achievements.push(id); r.trophies.forEach(function(t) { trophies.push(t); }); }
    };

    st.totalRaces = (st.totalRaces || 0) + 1;
    st.animalsHit = (st.animalsHit || 0) + (m.animalsHit || 0);
    st.oilHits = (st.oilHits || 0) + (m.oilHits || 0);
    st.nitroPicked = (st.nitroPicked || 0) + (m.nitroPicked || 0);
    st.gumPicked = (st.gumPicked || 0) + (m.gumPicked || 0);

    let xp = 25;
    let chips = state === 'win' ? 30 : 10; // базовые «Е» за любой заезд
    let newBest = false;
    const unlockedMaps = [];

    if (state === 'win') {
        st.wins = (st.wins || 0) + 1;
        xp += 60;
        chips += 20;
        tryAch('first_win');
        if (m.strikes === 0) { st.perfectWins = (st.perfectWins || 0) + 1; tryAch('perfect'); xp += 40; chips += 10; }
        if (m.weather === 'night') { st.nightWins = (st.nightWins || 0) + 1; tryAch('night_rider'); xp += 15; }
        if (m.weather === 'rain') { st.rainWins = (st.rainWins || 0) + 1; tryAch('rain_man'); xp += 15; }
        if (m.difficulty === 'hard') { st.hardWins = (st.hardWins || 0) + 1; tryAch('hard_win'); xp += 30; }
        if ((m.gumPicked || 0) >= 2) tryAch('gum_2');
        if ((m.nitroPicked || 0) === 0) tryAch('no_nitro');
        if ((m.oilHits || 0) >= 5) tryAch('oil_lover');
        if ((m.animalsHit || 0) >= 5) tryAch('bear_friend');
        chips += (5 + (m.gumPicked || 0) * 3) * 10; // бонус за победу и сердечки (раньше — жвачки)

        const d = m.difficulty;
        if (d && (profile.bestTimes[d] == null || m.time < profile.bestTimes[d])) {
            profile.bestTimes[d] = m.time;
            newBest = true;
        }
        // победа на сложном открывает следующую карту
        if (d === 'hard' && m.mapId) {
            const idx = MAP_ORDER.indexOf(m.mapId);
            if (idx >= 0 && idx < MAP_ORDER.length - 1) {
                const next = MAP_ORDER[idx + 1];
                if (profile.unlockedMaps.indexOf(next) < 0) { profile.unlockedMaps.push(next); unlockedMaps.push(next); }
            }
        }
    } else if (state === 'crash') {
        st.crashes = (st.crashes || 0) + 1;
        xp += 10;
    } else {
        st.timeouts = (st.timeouts || 0) + 1;
        xp += 10;
    }
    // фишки за «чистые отрезки» (src/clean-run.js) — за любой исход заезда
    chips += Math.max(0, Math.min(200, m.bonusChips || 0));
    // собранные на трассе фишки «Е» (src/echip.js) — без потолка: в бесконечной трассе их сотни
    chips += Math.max(0, Math.floor(m.eChips || 0));
    // видеокассеты (src/cassette.js) — редкая валюта, только за них — уникальная машина
    const vhs = Math.max(0, Math.floor(m.vhs || 0));
    profile.season.vhs = (profile.season.vhs || 0) + vhs;
    // бесконечная трасса: опыт за дальность (1 XP за 20 м) и рекорд
    countArrowRun(profile); // стрелки движений: учёт заездов после обновления (src/move-tutor.js)
    let infBest = null;
    if (m.distance > 0) {
        const dist = Math.round(m.distance);
        xp += Math.round(dist / 20);
        const inf = profile.infinite = Object.assign({ best: 0, bestScore: 0, runs: 0 }, profile.infinite);
        inf.runs++;
        infBest = { prev: inf.best, isNew: dist > inf.best };
        inf.best = Math.max(inf.best, dist);
        inf.bestScore = Math.max(inf.bestScore, Math.round(m.infScore || 0));
        infBest.best = inf.best;
    }
    if (st.totalRaces >= 10) tryAch('races10');
    if (st.wins >= 5) tryAch('wins5');

    // контракт дня
    let contractDone = false;
    const k = c.contract;
    if (c.contractMode && k && profile.daily && !profile.daily.done && typeof k.check === 'function' &&
        k.check(Object.assign({}, m, { state: state }))) {
        profile.daily.done = true;
        xp += k.xp; chips += k.chips;
        profile.season.contractsDone = (profile.season.contractsDone || 0) + 1;
        contractDone = true;
    }

    // очки риска (src/risk-combo.js) → опыт; задания (src/missions.js) — фишки начисляет сама applyMissionProgress
    const riskXp = riskToXp(m.riskPoints);
    xp += riskXp;
    const missions = applyMissionProgress(profile, Object.assign({}, m, { state: state, earnedE: chips }), c.rnd);

    profile.season.chips = (profile.season.chips || 0) + chips;
    const lv = addSeasonXp(profile.season, xp);
    // уровень и звание игрока — от всего опыта
    const rankBefore = rankOf(profile.totalXp || 0).index;
    profile.totalXp = (profile.totalXp || 0) + xp;
    const rankAfter = rankOf(profile.totalXp).index;
    if (lv.reached.indexOf(5) >= 0) tryAch('season5');

    profile.history = profile.history || [];
    profile.history.unshift({
        at: c.now != null ? c.now : Date.now(), state: state, map: m.mapId, difficulty: m.difficulty,
        weather: m.weather, time: m.time, strikes: m.strikes, xp: xp
    });
    if (profile.history.length > HISTORY_LIMIT) profile.history.length = HISTORY_LIMIT;

    return {
        xp: xp, chips: chips, vhs: vhs,
        levelBefore: levelBefore, levelAfter: profile.season.level,
        achievements: achievements, trophies: trophies,
        contractDone: contractDone, contractTitle: contractDone ? k.title : '',
        newBest: newBest, unlockedMaps: unlockedMaps,
        riskXp: riskXp, missions: missions, infBest: infBest,
        totalXp: profile.totalXp, rankUp: rankAfter > rankBefore ? RANKS[rankAfter] : null
    };
}

// ---------------- кампания ----------------

/** Слить прогресс кампании с резервной копией (защита от потерянных глав): мутирует cp */
export function mergeCampaignBackup(cp, bak, mergeStars, mergeTasks) {
    if (cp.unlocked == null || cp.unlocked < 1) cp.unlocked = 1;
    if (!Array.isArray(cp.completed)) cp.completed = [];
    if (!bak || typeof bak !== 'object') return cp;
    if (bak.unlocked > cp.unlocked) cp.unlocked = bak.unlocked;
    if (Array.isArray(bak.completed)) bak.completed.forEach(function(id) { if (cp.completed.indexOf(id) < 0) cp.completed.push(id); });
    if (bak.stars && mergeStars) cp.stars = mergeStars(cp.stars, bak.stars);
    if (bak.tasks && mergeTasks) {
        if (!cp.tasks) cp.tasks = {};
        Object.keys(bak.tasks).forEach(function(id) { cp.tasks[id] = mergeTasks(cp.tasks[id], bak.tasks[id] || []).done; });
    }
    return cp;
}

/**
 * Победа в главе idx из tracksCount: отметить пройденной, открыть следующую.
 * Остальные поля кампании (звёзды, задания, текущая глава) сохраняются.
 * Возвращает { campaign, unlockedNew }.
 */
export function markChapterWon(campaign, trackId, idx, tracksCount) {
    const cp = Object.assign({}, campaign);
    cp.completed = (cp.completed || []).slice();
    if (cp.completed.indexOf(trackId) < 0) cp.completed.push(trackId);
    const was = cp.unlocked || 1;
    const need = Math.min(tracksCount, idx + 2);
    cp.unlocked = Math.max(1, was, need);
    return { campaign: cp, unlockedNew: cp.unlocked > was };
}

/**
 * Какую главу запускает большая кнопка «Играть»: первую открытую и не пройденную,
 * а если все открытые пройдены — последнюю открытую.
 */
export function nextChapterIdx(campaign, tracks) {
    const cp = campaign || {};
    const open = Math.max(1, Math.min(tracks.length, cp.unlocked || 1));
    const done = cp.completed || [];
    for (let i = 0; i < open; i++) if (done.indexOf(tracks[i].id) < 0) return i;
    return open - 1;
}

/** Награда за первую главу: краска «Такси 90-х» и открытый «Звериный час» */
export const CHAPTER1_ID = 'c01';
export const CHAPTER1_PAINT = 'yellow';

/** «Звериный час» открыт после главы 1 (или если в нём уже играли до этого правила) */
export function beastHourOpen(profile) {
    if (!profile) return false;
    if ((profile.endlessBest || 0) > 0) return true;
    const done = (profile.campaign && profile.campaign.completed) || [];
    return done.indexOf(CHAPTER1_ID) >= 0;
}

/**
 * Коллекция кампании: награда за главы 1, 3, 6, 9, 12, 15 и 17 — краска или деталь в гараж бесплатно.
 * Глава 1 ещё и открывает «Звериный час», её краска сразу ставится на машину.
 */
export const CHAPTER_REWARDS = {
    c01: { paint: CHAPTER1_PAINT, equip: true, beastHour: true },
    c03: { paint: 'purple' },
    c06: { part: 'rims' },
    c09: { paint: 'chrome' },
    c12: { part: 'xenon' },
    c15: { part: 'spoiler' },
    c17: { paint: 'black' }
};

/**
 * Выдать награду за главу (один раз). Возвращает { paint } / { part } (+ equip, beastHour)
 * или null — у главы нет награды или она уже в коллекции.
 */
export function grantChapterReward(profile, trackId, carId) {
    const rw = CHAPTER_REWARDS[trackId];
    if (!rw || !profile || !profile.carLoadout) return null;
    const lo = profile.carLoadout;
    if (rw.paint) {
        if (!Array.isArray(lo.ownedPaints)) lo.ownedPaints = [];
        if (lo.ownedPaints.indexOf(rw.paint) >= 0) return null;
        lo.ownedPaints.push(rw.paint);
        if (!Array.isArray(lo.newGifts)) lo.newGifts = [];
        lo.newGifts.push('paint:' + rw.paint); // в гараже сияет золотом, пока не тронешь (src/ui/gift-garage.js)
        if (rw.equip && carId) {
            if (!lo.paintByCar || typeof lo.paintByCar !== 'object') lo.paintByCar = {};
            lo.paintByCar[carId] = rw.paint;
            lo.paint = rw.paint;
        }
        return { paint: rw.paint, equip: !!rw.equip, beastHour: !!rw.beastHour };
    }
    if (!Array.isArray(lo.ownedParts)) lo.ownedParts = [];
    if (lo.ownedParts.indexOf(rw.part) >= 0) return null;
    lo.ownedParts.push(rw.part);
    if (!Array.isArray(lo.newGifts)) lo.newGifts = [];
    lo.newGifts.push('part:' + rw.part);
    return { part: rw.part };
}

// ---------------- гараж ----------------

/**
 * Покраска: купить (если не куплена и платная) и поставить на машину.
 * Возвращает { ok, paid, reason } — reason: 'same' | 'no_chips' | 'unknown'.
 */
export function buyPaint(profile, carId, paint) {
    if (!paint) return { ok: false, reason: 'unknown' };
    const lo = profile.carLoadout;
    const current = (lo.paintByCar && lo.paintByCar[carId]) || lo.paint || 'stock';
    if (current === paint.id) return { ok: false, reason: 'same' };
    const needPay = paint.price > 0 && lo.ownedPaints.indexOf(paint.id) < 0;
    if (needPay && profile.season.chips < paint.price) return { ok: false, reason: 'no_chips' };
    if (needPay) { profile.season.chips -= paint.price; lo.ownedPaints.push(paint.id); }
    lo.paintByCar[carId] = paint.id;
    lo.paint = paint.id; // совместимость
    return { ok: true, paid: needPay ? paint.price : 0 };
}

/**
 * Деталь: установлена — снять (остаётся купленной); нет — купить при необходимости и поставить,
 * заменив деталь того же слота. Возвращает { ok, action: 'removed'|'installed', paid, reason }.
 */
export function toggleCarPart(profile, part, allParts) {
    if (!part) return { ok: false, reason: 'unknown' };
    const lo = profile.carLoadout;
    if (lo.parts.indexOf(part.id) >= 0) {
        lo.parts = lo.parts.filter(function(id) { return id !== part.id; });
        return { ok: true, action: 'removed', paid: 0 };
    }
    const owned = lo.ownedParts.indexOf(part.id) >= 0;
    if (!owned && profile.season.chips < part.price) return { ok: false, reason: 'no_chips' };
    if (!owned) { profile.season.chips -= part.price; lo.ownedParts.push(part.id); }
    const sameSlot = (allParts || []).filter(function(p) { return p.slot === part.slot; }).map(function(p) { return p.id; });
    lo.parts = lo.parts.filter(function(id) { return sameSlot.indexOf(id) < 0; });
    lo.parts.push(part.id);
    return { ok: true, action: 'installed', paid: owned ? 0 : part.price };
}
