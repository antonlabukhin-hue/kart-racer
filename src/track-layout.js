/**
 * Трассы из данных: раскладка участков лежит в src/tracks/layouts.json,
 * здесь — сборка (по умолчанию → карта → глава кампании) и проверка.
 */
import LAYOUTS from './tracks/layouts.json';

export { LAYOUTS };

// босс появляется примерно с 42% и держится до ~75% — разломы там мешают бою
export const BOSS_ZONE = [0.42, 0.75];
export const MIN_SPACING = 0.05;

// новые участки: длина в единицах трассы; доля — от самой короткой трассы (1320 ед. пути)
export const SEGMENT_LEN = { roadworks: 60, tunnel: 90 };
export const SEGMENT_MARGIN = 0.03;
const MIN_SPAN = 1320;
export function segmentSpan(seg) {
    return [seg.at, seg.at + (SEGMENT_LEN[seg.type] || 60) / MIN_SPAN];
}

function pick(layer, difficulty) {
    const out = {};
    if (!layer) return out;
    if (layer.gaps && layer.gaps[difficulty]) out.gaps = layer.gaps[difficulty].slice();
    if (layer.debris) out.debris = layer.debris.slice();
    if (typeof layer.event === 'number') out.event = layer.event;
    if (Array.isArray(layer.segments)) out.segments = layer.segments.map(function(x) { return Object.assign({}, x); });
    return out;
}

/** { gaps, debris, event, segments } для карты, сложности и (необязательно) главы кампании */
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
    // участки (ремонт, развилка, тоннель) — отрезки: не наезжают на точки и друг на друга
    const segs = Array.isArray(l.segments) ? l.segments : [];
    segs.forEach(function(sg, i) {
        if (!SEGMENT_LEN[sg.type]) { errs.push('неизвестный участок ' + sg.type); return; }
        const sp = segmentSpan(sg);
        if (!(sp[0] > 0.12) || !(sp[1] < 0.93)) errs.push(sg.type + ' ' + sg.at + ': у старта или финиша');
        all.forEach(function(f) {
            if (f > sp[0] - SEGMENT_MARGIN && f < sp[1] + SEGMENT_MARGIN) errs.push(sg.type + ' ' + sg.at + ' и ' + f + ': участки наслаиваются');
        });
        segs.forEach(function(o, j) {
            if (j <= i) return;
            const so = segmentSpan(o);
            if (so[0] < sp[1] + SEGMENT_MARGIN && sp[0] < so[1] + SEGMENT_MARGIN) errs.push(sg.type + ' и ' + o.type + ': участки наслаиваются');
        });
    });
    const sorted = all.slice().sort(function(a, b) { return a - b; });
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - sorted[i - 1] <= MIN_SPACING) errs.push(sorted[i - 1] + ' и ' + sorted[i] + ': участки наслаиваются');
    }
    return errs;
}
