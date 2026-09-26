/**
 * Звёзды за главы кампании (0–3), хранятся в profile.campaign.stars = { c01: 3, ... }
 *   ★     — доехал до финиша
 *   ★★    — не больше 2 аварий
 *   ★★★   — без аварий
 */

export const MAX_STARS_PER_TRACK = 3;

export const STAR_RULES = [
    'финиш',
    'не больше 2 аварий',
    'без аварий'
];

export function calcCampaignStars(strikes) {
    const s = Math.max(0, Number(strikes) || 0);
    if (s === 0) return 3;
    if (s <= 2) return 2;
    return 1;
}

/** Объединить два словаря звёзд: по каждой трассе берётся лучший результат */
export function mergeStars(a, b) {
    const out = {};
    [a, b].forEach(function(src) {
        if (!src || typeof src !== 'object') return;
        Object.keys(src).forEach(function(id) {
            const v = Math.min(MAX_STARS_PER_TRACK, Math.max(0, Math.floor(Number(src[id]) || 0)));
            if (v > (out[id] || 0)) out[id] = v;
        });
    });
    return out;
}

export function totalStars(stars) {
    if (!stars) return 0;
    return Object.keys(stars).reduce(function(sum, id) { return sum + (stars[id] || 0); }, 0);
}

/** '★★☆' */
export function starsText(n) {
    const k = Math.max(0, Math.min(MAX_STARS_PER_TRACK, n || 0));
    return '★'.repeat(k) + '☆'.repeat(MAX_STARS_PER_TRACK - k);
}
