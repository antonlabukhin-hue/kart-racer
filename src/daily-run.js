/**
 * «Заезд дня» бесконечной трассы: одна попытка в день, у всех одна и та же трасса (сид дня) и одно условие дня,
 * своя дневная таблица (src/daily-board.js). Условия меняются по кругу: «Одна авария», «Ночь и гололёд», «Час пик»…
 * Без бустов, «горячего старта» и «Второго шанса» — у всех равные условия.
 * profile.daily = { day, started, dist, score }. Логика — чистая (с тестами).
 */
export const DAILY_RULES = [
    { id: 'one_crash', icon: '💥', name: 'Одна авария', desc: 'Первая авария — конец заезда', strikes: 1 },
    { id: 'night_ice', icon: '🌙', name: 'Ночь и гололёд', desc: 'Старт ночью, все скользкие пятна — лёд', themeStart: 3, slide: 'ice' },
    { id: 'rush', icon: '🚗', name: 'Час пик', desc: 'Попуток вдвое больше с первого метра', trafficMul: 2, trafficAdd: 4 },
    { id: 'zoo', icon: '🐾', name: 'Зоопарк сбежал', desc: 'Зверей вдвое больше', animalMul: 2 },
    { id: 'no_nitro', icon: '🚫', name: 'Без нитро', desc: 'Нитро на трассе не попадается', noNitro: true },
    { id: 'turbo', icon: '🚀', name: 'Турбо-день', desc: 'Скорость +15% с самого старта', speedMul: 1.15 },
    { id: 'hot', icon: '🔥', name: 'Сразу жарко', desc: 'Сложность с первого метра — как на 3 км', warm: 3000 }
];

function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}
/** Сид дня — общий для всех: из даты 'ГГГГ-ММ-ДД' */
export function dailySeedOf(day) { return hash('daily|' + day) || 1; }

/** Условие дня: по кругу, день за днём (с 1 января 2026) */
export function ruleOf(day) {
    const s = String(day).split('-');
    const n = Math.round((Date.UTC(+s[0], +s[1] - 1, +s[2]) - Date.UTC(2026, 0, 1)) / 86400000);
    return DAILY_RULES[((n % DAILY_RULES.length) + DAILY_RULES.length) % DAILY_RULES.length];
}

/** Состояние игрока сегодня: { day, started, dist, score } */
export function dailyState(profile, day) {
    const d = profile && profile.daily;
    return d && d.day === day ? d : { day: day, started: false, dist: 0, score: 0 };
}
export function canPlayDaily(profile, day) { return !dailyState(profile, day).started; }
/** Попытка началась (засчитывается сразу: вышел посреди — попытка потрачена) */
export function startDaily(profile, day) { profile.daily = { day: day, started: true, dist: 0, score: 0 }; }
/** Итог попытки */
export function finishDaily(profile, day, dist, score) {
    const d = dailyState(profile, day);
    profile.daily = { day: day, started: true, dist: Math.max(d.dist || 0, Math.round(dist || 0)), score: Math.max(d.score || 0, Math.round(score || 0)) };
    return profile.daily;
}

/** Сид для обычного заезда (вызов другу — тот же сид у друга) */
export function randomSeed(rnd) { return (Math.floor((rnd || Math.random)() * 0xffffffff) >>> 0) || 1; }
