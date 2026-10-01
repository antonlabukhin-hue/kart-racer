/**
 * Три задания всегда на виду (как в Subway Surfers / Hill Climb Racing): у каждого заезда есть цель.
 * Прогресс копится между заездами; выполнил — фишки и сразу новое задание (чуть сложнее).
 * profile.missions = { active: [{ id, target, progress, tier }], done: число выполненных }
 * Только логика — без DOM; показывают меню, финиш и пауза.
 * Каждое задание выполнимо в ЛЮБОМ режиме (кампания, бесконечная трасса, «Звериный час»): где нет финиша или босса —
 * засчитывается равноценное (1 км в бесконечной, побег от ГАИ), метры и «Е» считаются во всех заездах.
 */

/** stat — какое поле итога заезда копится (см. raceStat) */
export const MISSION_POOL = [
    { id: 'jump', text: 'Перепрыгни зверей', stat: 'animalsJumped', targets: [2, 4, 7] },
    { id: 'near', text: 'Проскочи «на волоске»', stat: 'nearMiss', targets: [4, 7, 12] },
    { id: 'land', text: 'Чистые посадки после трамплина', stat: 'cleanLandings', targets: [2, 4, 6] },
    { id: 'boards', text: 'Снеси рекламные щиты', stat: 'billboards', targets: [2, 4, 7] },
    { id: 'wins', text: 'Финишируй (в бесконечной — проедь 1 км)', stat: 'wins', targets: [2, 3, 5] },
    { id: 'clean', text: 'Без аварий: финиш или первые 500 м', stat: 'cleanWins', targets: [1, 2, 3] },
    { id: 'boss', text: 'Победи босса или уйди от погони ГАИ', stat: 'bossDefeated', targets: [1, 2, 3] },
    { id: 'gum', text: 'Собери сердечки', stat: 'gumPicked', targets: [3, 6, 10] },
    { id: 'nitro', text: 'Подбери нитро', stat: 'nitroPicked', targets: [3, 6, 10] },
    { id: 'risk', text: 'Набери очков риска', stat: 'riskPoints', targets: [800, 2000, 4000] },
    { id: 'dist', text: 'Проедь за один заезд, м', stat: 'distance', targets: [1000, 2500, 5000], best: true },
    { id: 'echips', text: 'Заработай железные «Е»', stat: 'eChips', targets: [40, 120, 250] },
    { id: 'powers', text: 'Подбери усиления или нитро', stat: 'powers', targets: [2, 4, 7] }
];

export const MISSION_REWARD = [30, 50, 80]; // «Е» за задание по сложности

/** Сколько «очков задания» дал заезд: meta из итога заезда + state */
export const INF_FINISH_M = 1000; // «финиш» бесконечной трассы
export const CLEAN_START_M = 500; // «без аварий» бесконечной трассы — первые N м
const num = function(v) { return Math.max(0, Math.floor(Number(v) || 0)); };
export function raceStat(stat, m) {
    const win = m.state === 'win';
    if (stat === 'wins') return win || num(m.distance) >= INF_FINISH_M ? 1 : 0;
    if (stat === 'cleanWins') return (win && !(m.strikes > 0)) || num(m.cleanDist) >= CLEAN_START_M ? 1 : 0;
    if (stat === 'bossDefeated') return m.bossDefeated || num(m.escapes) > 0 ? 1 : 0;
    if (stat === 'distance') return num(m.runDist != null ? m.runDist : m.distance); // метры любого заезда
    if (stat === 'eChips') return Math.max(num(m.eChips), num(m.earnedE)); // в кампании «Е» — за заезд целиком
    if (stat === 'powers') return num(m.powers) + num(m.nitroPicked);
    return num(m[stat]);
}

/**
 * Множитель очков (как в Subway Surfers): каждые 3 выполненных задания — навсегда +1, до ×30.
 * Умножает счёт бесконечной трассы (рекорды и рейтинг)
 */
export const MAX_SCORE_MULT = 30;
export function scoreMult(profile) {
    const d = (profile && profile.missions && profile.missions.done) || 0;
    return Math.min(MAX_SCORE_MULT, 1 + Math.floor(d / 3));
}

function tierFor(done) {
    return done >= 12 ? 2 : done >= 4 ? 1 : 0;
}

function newMission(exclude, done, rnd) {
    const r = rnd || Math.random;
    const free = MISSION_POOL.filter(function(x) { return exclude.indexOf(x.id) < 0; });
    const def = free[Math.floor(r() * free.length) % free.length];
    const tier = tierFor(done);
    return { id: def.id, target: def.targets[tier], progress: 0, tier: tier };
}

/** Дописать недостающие задания (всегда три разных); мутирует profile */
export function ensureMissions(profile, rnd) {
    if (!profile.missions || !Array.isArray(profile.missions.active)) profile.missions = { active: [], done: 0 };
    const ms = profile.missions;
    ms.active = ms.active.filter(function(a) { return a && MISSION_POOL.some(function(x) { return x.id === a.id; }); });
    while (ms.active.length < 3) {
        ms.active.push(newMission(ms.active.map(function(a) { return a.id; }), ms.done || 0, rnd));
    }
    return ms.active;
}

export function missionDef(id) {
    return MISSION_POOL.find(function(x) { return x.id === id; });
}

/**
 * Засчитать заезд. Возвращает { chips, completed: [{ text, reward }], progressed: [{ id, text, before, after, target }] }.
 * Выполненные заменяются новыми сразу — три задания на виду всегда.
 */
export function applyMissionProgress(profile, m, rnd) {
    ensureMissions(profile, rnd);
    const ms = profile.missions;
    const out = { chips: 0, completed: [], progressed: [] };
    ms.active = ms.active.map(function(a) {
        const def = missionDef(a.id);
        const add = raceStat(def.stat, m);
        if (!add) return a;
        const before = a.progress;
        // «за заезд» (best) — лучший результат одного заезда, а не сумма
        a.progress = Math.min(a.target, def.best ? Math.max(a.progress, add) : a.progress + add);
        out.progressed.push({ id: a.id, text: def.text, before: before, after: a.progress, target: a.target });
        if (a.progress >= a.target) {
            const reward = MISSION_REWARD[a.tier] || 30;
            out.chips += reward;
            out.completed.push({ text: def.text, target: a.target, reward: reward });
            ms.done = (ms.done || 0) + 1;
            return null;
        }
        return a;
    }).filter(Boolean);
    ensureMissions(profile, rnd);
    profile.season.chips = (profile.season.chips || 0) + out.chips;
    return out;
}

/** Строки для показа: [{ text, progress, target, reward }] */
export function missionRows(profile) {
    ensureMissions(profile);
    return profile.missions.active.map(function(a) {
        const def = missionDef(a.id);
        return { id: a.id, text: def.text, progress: a.progress, target: a.target, reward: MISSION_REWARD[a.tier] || 30 };
    });
}
