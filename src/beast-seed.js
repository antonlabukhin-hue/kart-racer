/**
 * Процедурный «Звериный час»: весь забег строится из одного числа (сида).
 * Одинаковый сид — одинаковые волны: карта, погода, разломы, арки, сцена и участки трассы.
 * Сид дня общий для всех игроков (соревнование), по ссылке-вызову — сид друга.
 * Звери и трафик остаются случайными — меняется ритм, а не заученная трасса.
 */
import { validateLayout, BOSS_ZONE, SEGMENT_LEN, segmentSpan } from './track-layout.js';
import { ENDLESS_MAPS } from './endless.js';

/** Генератор [0, 1) по сиду (mulberry32) */
export function rng32(seed) {
    let a = seed >>> 0;
    return function() {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
}

/** Сид дня: одинаков у всех в один календарный день (по местной дате) */
export function dailySeed(date) {
    const d = date || new Date();
    const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    return hash('beast-hour:' + key);
}

/** 3F7A-21C9 — читаемый код сида */
export function seedCode(seed) {
    const h = ((seed >>> 0).toString(16).toUpperCase()).padStart(8, '0');
    return h.slice(0, 4) + '-' + h.slice(4);
}

/** Код → сид (null — не похоже на код) */
export function parseSeedCode(code) {
    const m = /^([0-9A-F]{4})-?([0-9A-F]{4})$/i.exec(String(code || '').trim());
    return m ? (parseInt(m[1] + m[2], 16) >>> 0) : null;
}

const r2 = function(v) { return Math.round(v * 1000) / 1000; };

/**
 * План волны: { map, weather, layout: { gaps, debris, event, segments } }.
 * Карты идут в перемешанном по сиду порядке (подряд одна и та же не выпадает),
 * первая волна — днём, дальше ночь и дождь случаются чаще.
 */
export function wavePlan(seed, wave) {
    const w = Math.max(1, wave | 0);
    const order = ENDLESS_MAPS.slice();
    const ro = rng32(seed ^ 0xA5A5A5A5);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(ro() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
    const map = order[(w - 1) % order.length];
    const r = rng32((seed ^ Math.imul(w, 0x9E3779B1)) >>> 0);
    const wr = r();
    const weather = w === 1 ? 'day' : (wr < 0.5 ? 'day' : wr < 0.78 ? 'night' : 'rain');
    const nGaps = w <= 1 ? 1 : (w <= 3 ? 2 : 3);
    let layout = null;
    // точки ставим жадно по сетке с шагом, чтобы всё помещалось без наслоений
    const pickFrom = function(cands, taken, n) {
        const out = [];
        const pool = cands.slice();
        while (out.length < n && pool.length) {
            const i = Math.floor(r() * pool.length);
            const f = pool.splice(i, 1)[0];
            if (taken.every(function(t) { return Math.abs(t - f) > 0.07; })) { out.push(f); taken.push(f); }
        }
        return out;
    };
    const grid = function(from, to, step) { const g = []; for (let x = from; x <= to + 1e-9; x += step) g.push(r2(x + (r() - 0.5) * 0.01)); return g; };
    for (let attempt = 0; attempt < 60 && !layout; attempt++) {
        const taken = [];
        const segments = [];
        const types = Object.keys(SEGMENT_LEN);
        const nSeg = r() < 0.25 ? 0 : (r() < 0.6 ? 1 : 2);
        for (let i = 0; i < nSeg; i++) segments.push({ type: types[Math.floor(r() * types.length)], at: r2(0.16 + r() * 0.56) });
        const outsideSegs = function(f) { return segments.every(function(sg) { const sp = segmentSpan(sg); return f < sp[0] - 0.05 || f > sp[1] + 0.05; }); };
        const gapCands = grid(0.15, BOSS_ZONE[0] - 0.03, 0.04).concat(grid(BOSS_ZONE[1] + 0.03, 0.9, 0.04)).filter(outsideSegs);
        const gaps = pickFrom(gapCands, taken, nGaps);
        const debris = pickFrom(grid(0.13, 0.93, 0.04).filter(outsideSegs), taken, 2 + (r() < 0.5 ? 1 : 0));
        const event = pickFrom(grid(0.5, 0.88, 0.03).filter(outsideSegs), taken, 1)[0];
        if (gaps.length < nGaps || debris.length < 2 || event == null) continue;
        const cand = {
            gaps: gaps.sort(function(x, y) { return x - y; }),
            debris: debris.sort(function(x, y) { return x - y; }),
            event: event,
            segments: segments
        };
        if (validateLayout(cand).length === 0) layout = cand;
    }
    return { map: map, weather: weather, layout: layout };
}
