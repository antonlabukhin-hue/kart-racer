import { pickPattern, expandPattern, patternSpan, patternGap } from './patterns.js';

/**
 * «Бесконечная трасса» — логика без сцены (с тестами): пейзажи по расстоянию, рост сложности, счёт и план участков.
 * Трасса идёт к −z; dist — сколько проехано от старта (ед.). Сцену строит main.js по этому плану.
 */

/** Пейзажи идут по кругу; у каждого — стиль декора (src/decor.js), небо/туман/земля, скользкое пятно, звери */
export const THEMES = [
    { id: 'day', name: 'Арсеньев, день', style: 'arsenev', accent: 0xffc83c, sky: 0xe8c898, zenith: 0x5b8ad0, fog: 0xe0c090, fogNear: 55, fogFar: 200, ground: 0xa08866, light: 1, slide: 'oil',
        animals: ['DOG', 'CAT', 'DEER', 'BOAR', 'FOX', 'HUMAN', 'CHICKEN'] },
    { id: 'village', name: 'Деревня', style: 'village', accent: 0x8ad84a, sky: 0xd4e2ea, zenith: 0x4f8fe0, fog: 0xcad8d4, fogNear: 55, fogFar: 200, ground: 0x7e9a52, light: 1.05, slide: 'oil',
        animals: ['CHICKEN', 'DOG', 'CAT', 'BOAR', 'FOX', 'DEER'] },
    { id: 'promzona', name: 'Промзона', style: 'industrial', accent: 0xff4a3a, sky: 0x9a8a78, zenith: 0x5c6378, fog: 0x8a7a68, fogNear: 40, fogFar: 170, ground: 0x7a7468, light: 0.9, slide: 'acid',
        animals: ['CROC', 'RHINO', 'DINO', 'PEACOCK', 'DOG'] },
    { id: 'snow', name: 'Снежная тайга', style: 'forest', accent: 0x8ad8ff, snow: true, sky: 0xc8d4e0, zenith: 0x7fa3d6, fog: 0xd0dae4, fogNear: 50, fogFar: 195, ground: 0xe8f0f8, light: 1.05, slide: 'ice',
        animals: ['BEAR', 'FOX', 'DEER', 'BOAR'] },
    { id: 'city', name: 'Микрорайон', style: 'city', accent: 0x4ab0ff, sky: 0xdcc8a8, zenith: 0x6690d0, fog: 0xd4c0a0, fogNear: 50, fogFar: 190, ground: 0x8a8a78, light: 0.95, slide: 'oil',
        animals: ['DOG', 'CAT', 'HUMAN', 'CHICKEN'] },
    { id: 'night', name: 'Ночная трасса', style: 'arsenev', accent: 0xff4ad8, night: true, sky: 0x0a1020, zenith: 0x03050e, fog: 0x12182a, fogNear: 22, fogFar: 120, ground: 0x3a4458, light: 0.45, slide: 'oil',
        animals: ['BEAR', 'BOAR', 'DOG', 'CAT', 'FOX', 'DEER'] },
    { id: 'svalka', name: 'Свалка «Надежда»', style: 'junk', accent: 0xffa03a, sky: 0xb0a080, zenith: 0x7488aa, fog: 0xa89878, fogNear: 45, fogFar: 180, ground: 0x8a7650, light: 0.95, slide: 'tar',
        animals: ['LION', 'MONKEY', 'ZEBRA', 'HIPPO', 'GIRAFFE'] },
    { id: 'rain', name: 'Дождь на трассе', style: 'arsenev', accent: 0x5ad8c8, rain: true, sky: 0x6a7a88, zenith: 0x3b4552, fog: 0x6a7a88, fogNear: 25, fogFar: 110, ground: 0x66727c, light: 0.75, slide: 'oil',
        animals: ['DOG', 'DEER', 'FOX', 'CAT', 'HUMAN', 'BOAR'] },
    { id: 'jungle', name: 'Джунгли-зоопарк', style: 'forest', accent: 0x5aff7a, sky: 0x4a6a40, zenith: 0x2f5a4a, fog: 0x3d5a38, fogNear: 30, fogFar: 140, ground: 0x5a7a40, light: 0.9, slide: 'tar',
        animals: ['CROC', 'ELEPHANT', 'RHINO', 'LION', 'MONKEY'] }
];
/** Номер пейзажа по id (для setThemeStart) */
export function themeIndex(id) { return Math.max(0, THEMES.findIndex(function(t) { return t.id === id; })); }
export const THEME_LEN = 900;   // длина пейзажа, ед. (~30–40 с езды)
export const BLEND_LEN = 120;   // на стольких единицах небо, туман и земля плавно перетекают в следующий пейзаж

/** С какого пейзажа начинается заезд (каждый раз свой: ночь, снег, дождь…) — индекс в THEMES */
let themeStart = 0;
export function setThemeStart(i) { themeStart = ((Math.floor(i) || 0) % THEMES.length + THEMES.length) % THEMES.length; }
export function getThemeStart() { return themeStart; }

/** Какой пейзаж на расстоянии dist: { theme, next, k } — k 0..1 — доля перехода в следующий */
export function themeAt(dist) {
    const d = Math.max(0, dist || 0) + themeStart * THEME_LEN;
    const i = Math.floor(d / THEME_LEN);
    const into = d - i * THEME_LEN;
    const theme = THEMES[i % THEMES.length], next = THEMES[(i + 1) % THEMES.length];
    const k = Math.max(0, Math.min(1, (into - (THEME_LEN - BLEND_LEN)) / BLEND_LEN));
    return { index: i, theme: theme, next: next, k: k };
}

/** Смешать два цвета 0xRRGGBB */
export function mixHex(a, b, k) {
    const ch = function(s) { return Math.round(((a >> s) & 255) + ((((b >> s) & 255) - ((a >> s) & 255)) * k)); };
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/**
 * Рост сложности по расстоянию. База — «лёгкая» сложность (src/difficulty.js).
 * Машина разгоняется плавно с первого метра: speed — множитель максимальной скорости (SPEED_RANGE: 0.765 → 1.3 к ~8 км).
 * Звери и попутки первые 1000 м — как на старте, дальше плавно растут вместе со скоростью машины (к ~8 км — потолок):
 *   animals — частота зверей (0.55 → 2.6), maxAnimals — сколько сразу (6 → 16), animalSpeed — скорость перебежки (×1 → ×1.6),
 *   traffic — сколько попуток добавить (0 → +8), trafficSpeed — их скорость (×1 → ×1.5).
 * density — плотность препятствий на участке (0.3 → 1.3)
 */
export const RAMP_LEN = 8000;
// скорость машины: на старте на 10% тише прежнего (0.85 → 0.765) — успеваешь освоиться; к ~8 км плавно до 1.3
export const SPEED_RANGE = [0.765, 1.3];
export function rampAt(dist, warm) {
    dist = (dist || 0) + (warm || 0); // warm — «горячий старт» (warmStart)
    const t = Math.max(0, Math.min(1, (dist || 0) / RAMP_LEN));
    const e = t * t * (3 - 2 * t); // медленно в начале, быстрее в середине, мягко к потолку
    const a = Math.max(0, Math.min(1, ((dist || 0) - 1000) / (RAMP_LEN - 1000))), ea = a * a * (3 - 2 * a); // звери и попутки — после 1000 м
    return { t: t, speed: SPEED_RANGE[0] + (SPEED_RANGE[1] - SPEED_RANGE[0]) * e, density: 0.3 + e,
        animals: 0.55 + 2.05 * ea, maxAnimals: Math.round(6 + 10 * ea), animalSpeed: 1 + 0.6 * ea,
        traffic: Math.round(8 * ea), trafficSpeed: 1 + 0.5 * ea };
}

/**
 * «Горячий старт»: опытный игрок не тратит первый километр на пустую дорогу — сложность заезда (rampAt, план участков)
 * начинается с WARM_K его рекорда, но не дальше WARM_MAX м. Новичку (рекорд меньше WARM_FROM м) — как раньше, с нуля.
 * Пейзажи, счёт и дальность от этого не меняются.
 */
export const WARM_FROM = 1000, WARM_K = 0.3, WARM_MAX = 1500;
export function warmStart(best) {
    const b = Math.max(0, best || 0);
    return b < WARM_FROM ? 0 : Math.round(Math.min(WARM_MAX, b * WARM_K));
}

/** Очки забега: метры + «Е» по 10 + очки риска (множитель за риск уже внутри них) */
export function runScore(dist, eChips, riskPoints) {
    return Math.round(Math.max(0, dist || 0)) + (eChips || 0) * 10 + Math.round(riskPoints || 0);
}

/** Опыт за забег: 1 XP за 20 м (+ опыт за риск считает профиль) */
export function runXp(dist) {
    return Math.round(Math.max(0, dist || 0) / 20);
}

/**
 * План участка трассы [d0, d1) (расстояния от старта): что где поставить. rnd — генератор [0,1).
 * Возвращает список { kind, d, lane, ... } — kind: 'obstacle' (type), 'echip' (lane, y), 'nitro', 'gum', 'vhs', 'power' (type), 'gap' (rampLane),
 * 'crate' — ящик «?» (src/hazards.js), 'spikes' — шипы поперёк полосы (с SPIKES_FROM м, чаще с ростом сложности),
 * 'letter' — буква «Слова дня» (только с opts.letters). opts.warm — «горячий старт» (warmStart): сложность как на warm м дальше.
 * Разлом — не чаще раза в GAP_EVERY, вокруг него чисто; «Е» — цепочками по полосам, змейкой и дугой над разломом.
 */
export const LANES = 3;
export const GAP_EVERY = [380, 560];
export const EMPTY_RUN = 70;  // м без «Е» — уже «пустой участок»
export const TRAIL_STEP = 7;  // м между «Е» в редкой дорожке
export const VHS_EVERY = 1700;
export const POWER_EVERY = [450, 750];
export const POWER_KINDS = ['magnet', 'x2', 'shield']; // src/powerups.js
export const CRATE_EVERY = [260, 420];
export const SPIKES_FROM = 600;
export const LETTER_EVERY = [260, 420]; // «Слово дня» (src/word-day.js): буква — раз в столько метров
export function planStretch(d0, d1, rnd, opts) {
    const o = opts || {};
    const r = rnd || Math.random;
    const warm = o.warm || 0;
    const ramp = rampAt(d0, warm);
    const out = [];
    const lane = function() { return Math.floor(r() * LANES); };
    // разломы
    let nextGap = o.nextGap != null ? o.nextGap : d0 + GAP_EVERY[0];
    const gaps = [];
    while (nextGap < d1) {
        const rl = lane();
        gaps.push(nextGap);
        out.push({ kind: 'gap', d: nextGap, rampLane: rl });
        // дуга «Е» над разломом по полосе трамплина — берётся только в прыжке
        for (let i = 0; i < 5; i++) out.push({ kind: 'echip', d: nextGap + 1 + i * 1.6, lane: rl, y: 0.6 + Math.sin(i / 4 * Math.PI) * 1.0 });
        nextGap += GAP_EVERY[0] + r() * (GAP_EVERY[1] - GAP_EVERY[0]);
    }
    const slide = o.slide || 'oil';
    // узоры (src/patterns.js): связки препятствий с цепочкой «Е» по свободному пути; вокруг них — 12 м чисто
    const busy = [];
    const inBusy = function(d) { return busy.some(function(b) { return d > b[0] && d < b[1]; }); };
    const gapNear = function(d) { return gaps.some(function(g) { return d > g - 50 && d < g + 20; }); };
    for (let dd = Math.max(d0, 150) + r() * 60; dd < d1; ) {
        const rp = rampAt(dd, warm);
        const pat = pickPattern(rp.t, dd + warm >= SPIKES_FROM, r);
        const sp = patternSpan(pat);
        if (dd + sp[1] + 3 < d1 && !gapNear(dd + sp[0]) && !gapNear(dd + sp[1] + 3)) {
            const id = o.patId = (o.patId || 0) + 1;
            expandPattern(pat, dd, r() < 0.5).forEach(function(it) {
                if (it.type === 'slide') it.type = slide;
                it.pat = id;
                out.push(it);
            });
            out.push({ kind: 'patEnd', d: dd + pat.len + 3, pat: id, name: pat.id }); // проехал сюда, не задев узор, — «чисто!» (рисковое действие)
            busy.push([dd + sp[0] - 12, dd + sp[1] + 12]);
        }
        dd += sp[1] + patternGap(rp.t) * (0.8 + r() * 0.4);
    }
    const nearGap = function(d) { return gapNear(d) || inBusy(d); };
    // препятствия-одиночки — вдвое реже, чем до узоров: основное делают узоры
    const count = Math.round((d1 - d0) / 120 * ramp.density);
    for (let i = 0; i < count; i++) {
        const d = d0 + r() * (d1 - d0);
        if (nearGap(d)) continue;
        const t = r();
        out.push({ kind: 'obstacle', d: d, lane: lane(), type: t < 0.3 ? 'pothole' : t < 0.6 ? slide : 'bump' });
    }
    // цепочки «Е»: прямая по полосе или змейка через две полосы
    let d = d0 + 20 + r() * 30;
    while (d < d1 - 20) {
        const n = 5 + Math.floor(r() * 4);
        if (!nearGap(d) && !nearGap(d + n * 2.2)) {
            if (r() < 0.35) {
                let ln = lane();
                for (let i = 0; i < n; i++) { if (i === Math.floor(n / 2)) ln = (ln + (r() < 0.5 ? 1 : 2)) % LANES; out.push({ kind: 'echip', d: d + i * 2.2, lane: ln, y: 0.6 }); }
            } else {
                const ln = lane();
                for (let i = 0; i < n; i++) out.push({ kind: 'echip', d: d + i * 2.2, lane: ln, y: 0.6 });
            }
        }
        d += 200 + r() * 150; // реже, чем до узоров: в каждом узоре — своя цепочка «Е»
    }
    // редкие дорожки «Е» на пустых прямых: где больше EMPTY_RUN м без «Е» — 4–6 штук через TRAIL_STEP м по одной полосе
    // (не плотная цепочка, а «хлебные крошки» — ведут по дороге и не дают заскучать)
    {
        const blockedAt = function(dd, l) { return out.some(function(o) { return o.kind === 'obstacle' && o.lane === l && Math.abs(o.d - dd) < 6; }); }; // «Е» не ведут в яму
        const eds = out.filter(function(i) { return i.kind === 'echip' && !i.side; }).map(function(i) { return i.d; }).concat([d0, d1]).sort(function(a, b) { return a - b; });
        for (let i = 1; i < eds.length; i++) {
            for (let from = eds[i - 1] + 18; eds[i] - from > EMPTY_RUN - 18; ) {
                const n = 4 + Math.floor(r() * 3), ln = lane();
                const ok = []; for (let k = 0; k < n; k++) { const dd = from + k * TRAIL_STEP; if (dd < eds[i] - 12 && !nearGap(dd) && !blockedAt(dd, ln)) ok.push(dd); }
                ok.forEach(function(dd) { out.push({ kind: 'echip', d: dd, lane: ln, y: 0.6, trail: true }); });
                from += n * TRAIL_STEP + 30 + r() * 20;
            }
        }
    }
    // нитро и сердечки — реже
    for (let dd = d0 + 90 + r() * 80; dd < d1; dd += 180 + r() * 140) if (!nearGap(dd)) out.push({ kind: 'nitro', d: dd, lane: lane() });
    for (let dd = d0 + 300 + r() * 300; dd < d1; dd += 600 + r() * 400) if (!nearGap(dd)) out.push({ kind: 'gum', d: dd, lane: lane() });
    // кассеты и усиления — отдельно, в стороне от цепочек «Е» (не теряются среди них)
    const eDs = out.filter(function(i) { return i.kind === 'echip'; }).map(function(i) { return i.d; });
    const clearOfE = function(dd) { return !nearGap(dd) && eDs.every(function(e) { return Math.abs(e - dd) > 18; }); };
    const spot = function(dd) { for (let k = 0; k < 12 && !clearOfE(dd); k++) dd += 20; return clearOfE(dd) && dd < d1 ? dd : null; };
    // усиления: магнит, ×2, броня — раз в 450–750 м
    for (let dd = d0 + 150 + r() * 250; dd < d1; dd += POWER_EVERY[0] + r() * (POWER_EVERY[1] - POWER_EVERY[0])) {
        const at = spot(dd);
        if (at == null) continue;
        const type = POWER_KINDS[Math.floor(r() * POWER_KINDS.length)];
        out.push({ kind: 'power', d: at, lane: lane(), type: type });
        // после магнита — «Е» вдоль обеих обочин: без магнита не взять, с ним — собираешь всё (как в Subway Surfers)
        if (type === 'magnet') {
            for (let k = 0; k < 44; k++) {
                const dd2 = at + 24 + k * 3.6;
                if (dd2 >= d1 || gapNear(dd2)) continue; // узорам обочины не мешают
                eDs.push(dd2); // кассеты и буквы — и от этих «Е» в стороне
                out.push({ kind: 'echip', d: dd2, x: -3.5, y: 0.6, side: true });
                out.push({ kind: 'echip', d: dd2, x: 3.5, y: 0.6, side: true });
            }
        }
    }
    // ящики «?» — раз в 260–420 м, тоже в стороне от «Е»
    for (let dd = Math.max(d0, 120) + r() * 120; dd < d1; dd += CRATE_EVERY[0] + r() * (CRATE_EVERY[1] - CRATE_EVERY[0])) {
        const at = spot(dd);
        if (at != null) out.push({ kind: 'crate', d: at, lane: lane() });
    }
    // «Слово дня»: буквы — пока слово не собрано (opts.letters), в стороне от «Е»
    if (o.letters) for (let dd = d0 + 180 + r() * 120; dd < d1; dd += LETTER_EVERY[0] + r() * (LETTER_EVERY[1] - LETTER_EVERY[0])) {
        const at = spot(dd);
        if (at != null) out.push({ kind: 'letter', d: at, lane: lane() });
    }
    // шипы — после SPIKES_FROM м; чем дальше, тем чаще (шаг 380 → 190 м)
    for (let dd = Math.max(d0, SPIKES_FROM - warm) + r() * 150; dd < d1; dd += (380 - 190 * ramp.t) * (0.8 + r() * 0.4)) {
        if (!nearGap(dd)) out.push({ kind: 'spikes', d: dd, lane: lane() });
    }
    // видеокассета — редкость: ~1 на 1.7 км (иногда 2), за длинный заезд 1–3
    const vhsN = Math.floor((d1 - d0) / VHS_EVERY * (o.vhsMul || 1) + r()); // vhsMul — «Мечта»-везунчик: вдвое чаще
    for (let i = 0; i < vhsN; i++) {
        const at = spot(d0 + 40 + r() * Math.max(0, d1 - d0 - 300));
        if (at != null) out.push({ kind: 'vhs', d: at, lane: lane() });
    }
    out.sort(function(a, b) { return a.d - b.d; });
    return { items: out, nextGap: nextGap };
}

/**
 * Событие недели: один пейзаж на неделю «золотой» — в нём каждая «Е» за две. Неделя — с понедельника (местное время),
 * пейзажи идут по кругу. Возвращает { theme, short } — short — короткое имя для карточки в меню.
 */
const WEEK_SHORT = { day: 'Арсеньев', promzona: 'Промзона', snow: 'Тайга', night: 'Ночь', svalka: 'Свалка', rain: 'Дождь', jungle: 'Джунгли' };
export function weekTheme(now) {
    const d = new Date(now != null ? now : Date.now());
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7);
    const week = Math.round((monday.getTime() - new Date(2026, 0, 5).getTime()) / (7 * 86400000)); // 5 янв 2026 — понедельник
    const th = THEMES[((week % THEMES.length) + THEMES.length) % THEMES.length];
    return { theme: th, short: WEEK_SHORT[th.id] || th.name };
}

/** Генератор [0,1) по сиду (mulberry32): у одинакового сида — одинаковая раскладка трассы */
export function seededRnd(seed) {
    let a = (seed >>> 0) || 1;
    return function() {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Выполнить fn, пока Math.random — это rnd (постановочные участки круга, src/landmarks.js и main.js populateLap, берут Math.random;
 * по сиду они должны встать так же — «Заезд дня» и вызов другу). Код синхронный — подмена не утекает.
 */
export function withRandom(rnd, fn) {
    const prev = Math.random;
    Math.random = rnd;
    try { return fn(); } finally { Math.random = prev; }
}

/**
 * Закат и рассвет на стыке с ночью: переход в ночной пейзаж идёт через оранжево-розовое небо,
 * выход из ночи — через розоватый рассвет. a, b — пейзажи, k — доля второго (как в themeAt).
 * → { k: 0..1 сила (пик посередине перехода), horizon, zenith, fog } или null.
 */
export const SUNSET = { horizon: 0xff9a52, zenith: 0x4a3a78, fog: 0xd88a5a };
export const SUNRISE = { horizon: 0xf6b8a0, zenith: 0x5a78b8, fog: 0xe0b0a0 };
export function duskAt(a, b, k) {
    if (!a || !b || !!a.night === !!b.night) return null;
    const s = Math.sin(Math.max(0, Math.min(1, k)) * Math.PI); // 0 → 1 → 0
    if (s < 0.01) return null;
    const p = b.night ? SUNSET : SUNRISE;
    return { k: s, horizon: p.horizon, zenith: p.zenith, fog: p.fog };
}

/** Фирменный цвет пейзажа (рамки плашек заезда) — CSS-строка; между пейзажами — плавно */
export function accentCss(a, b, k) {
    const h = mixHex(a.accent != null ? a.accent : 0xffd23c, b && b.accent != null ? b.accent : 0xffd23c, k || 0);
    return '#' + h.toString(16).padStart(6, '0');
}
