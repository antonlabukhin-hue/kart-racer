/**
 * Трассы из данных: раскладка участков лежит в src/tracks/layouts.json,
 * здесь — сборка (по умолчанию → карта → глава кампании) и проверка.
 */
import LAYOUTS from './tracks/layouts.json';

export { LAYOUTS };

// босс появляется примерно с 42% и держится до ~75% — разломы там мешают бою
export const BOSS_ZONE = [0.42, 0.75];
export const MIN_SPACING = 0.05;

function pick(layer, difficulty) {
    const out = {};
    if (!layer) return out;
    if (layer.gaps && layer.gaps[difficulty]) out.gaps = layer.gaps[difficulty].slice();
    if (layer.debris) out.debris = layer.debris.slice();
    if (typeof layer.event === 'number') out.event = layer.event;
    return out;
}

/** { gaps, debris, event } для карты, сложности и (необязательно) главы кампании */
export function resolveLayout(data, opts) {
    const d = data || LAYOUTS;
    const o = opts || {};
    const diff = ['easy', 'medium', 'hard'].indexOf(o.difficulty) >= 0 ? o.difficulty : 'medium';
    return Object.assign(
        pick(d.default, diff),
        pick(d.maps && d.maps[o.mapId], diff),
        pick(o.campaignId && d.campaign && d.campaign[o.campaignId], diff)
    );
}

/** Список проблем раскладки (пустой — всё хорошо) */
export function validateLayout(l) {
    const errs = [];
    if (!l || !Array.isArray(l.gaps) || !Array.isArray(l.debris) || typeof l.event !== 'number') return ['нет gaps/debris/event'];
    const all = l.gaps.concat(l.debris, [l.event]);
    all.forEach(function(f) {
        if (!(f > 0.1)) errs.push(f + ': слишком близко к старту');
        if (!(f < 0.96)) errs.push(f + ': на финишной прямой');
    });
    l.gaps.forEach(function(f) {
        if (f >= BOSS_ZONE[0] && f <= BOSS_ZONE[1]) errs.push(f + ': разлом в зоне босса');
    });
    const sorted = all.slice().sort(function(a, b) { return a - b; });
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - sorted[i - 1] <= MIN_SPACING) errs.push(sorted[i - 1] + ' и ' + sorted[i] + ': участки наслаиваются');
    }
    return errs;
}
