/**
 * Уровень и звание игрока — опытность и статус в игре (в отличие от уровня сезона, который обнуляется).
 * Растут от всего опыта за всё время: заезды, километры бесконечной трассы, риск, задания.
 * profile.totalXp — весь опыт; у старых профилей восстанавливается из прогресса сезона.
 */
export const RANKS = [
    { xp: 0, name: 'Новичок', icon: '🚲' },
    { xp: 400, name: 'Водила', icon: '🚗' },
    { xp: 1200, name: 'Шофёр', icon: '🚕' },
    { xp: 3000, name: 'Дальнобойщик', icon: '🚚' },
    { xp: 6500, name: 'Ас трассы', icon: '🏎' },
    { xp: 12000, name: 'Король дорог', icon: '👑' },
    { xp: 22000, name: 'Легенда 90-х', icon: '📼' }
];

/** Уровень игрока: 1 на старте, каждый следующий чуть дороже (400 XP — 5-й, 3000 — 11-й, 22000 — 30-й) */
export function playerLevel(totalXp) {
    return Math.floor(Math.sqrt(Math.max(0, totalXp || 0) / 25)) + 1;
}

/** Звание по всему опыту: { rank, index, next, k } — k 0..1 — путь до следующего звания */
export function rankOf(totalXp) {
    const x = Math.max(0, totalXp || 0);
    let i = 0;
    while (i + 1 < RANKS.length && x >= RANKS[i + 1].xp) i++;
    const next = RANKS[i + 1] || null;
    const k = next ? (x - RANKS[i].xp) / (next.xp - RANKS[i].xp) : 1;
    return { rank: RANKS[i], index: i, next: next, k: k };
}

/** Весь опыт старого профиля — из уровня и опыта сезона (xpToNext — seasonXpToNext из profile.js) */
export function totalFromSeason(season, xpToNext) {
    const s = season || {};
    let t = s.xp || 0;
    for (let l = 1; l < (s.level || 1); l++) t += xpToNext(l);
    return t;
}

/** Строка для меню: «ур. 12 · 🚕 Шофёр» */
export function rankLabel(totalXp) {
    const r = rankOf(totalXp).rank;
    return 'ур. ' + playerLevel(totalXp) + ' · ' + r.icon + ' ' + r.name;
}
