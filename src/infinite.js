/**
 * «Бесконечная трасса» — логика без сцены (с тестами): пейзажи по расстоянию, рост сложности, счёт и план участков.
 * Трасса идёт к −z; dist — сколько проехано от старта (ед.). Сцену строит main.js по этому плану.
 */

/** Пейзажи идут по кругу; у каждого — стиль декора (src/decor.js), небо/туман/земля, скользкое пятно, звери */
export const THEMES = [
    { id: 'day', name: 'Арсеньев, день', style: 'arsenev', sky: 0xe8c898, fog: 0xe0c090, fogNear: 55, fogFar: 200, ground: 0xa08866, light: 1, slide: 'oil',
        animals: ['DOG', 'CAT', 'DEER', 'BOAR', 'FOX', 'HUMAN', 'CHICKEN'] },
    { id: 'promzona', name: 'Промзона', style: 'industrial', sky: 0x9a8a78, fog: 0x8a7a68, fogNear: 40, fogFar: 170, ground: 0x7a7468, light: 0.9, slide: 'acid',
        animals: ['CROC', 'RHINO', 'DINO', 'PEACOCK', 'DOG'] },
    { id: 'snow', name: 'Снежная тайга', style: 'forest', snow: true, sky: 0xc8d4e0, fog: 0xd0dae4, fogNear: 35, fogFar: 160, ground: 0xe8f0f8, light: 1.05, slide: 'ice',
        animals: ['BEAR', 'FOX', 'DEER', 'BOAR'] },
    { id: 'night', name: 'Ночная трасса', style: 'arsenev', night: true, sky: 0x0a1020, fog: 0x12182a, fogNear: 22, fogFar: 120, ground: 0x3a4458, light: 0.45, slide: 'oil',
        animals: ['BEAR', 'BOAR', 'DOG', 'CAT', 'FOX', 'DEER'] },
    { id: 'svalka', name: 'Свалка «Надежда»', style: 'junk', sky: 0xb0a080, fog: 0xa89878, fogNear: 45, fogFar: 180, ground: 0x8a7650, light: 0.95, slide: 'tar',
        animals: ['LION', 'MONKEY', 'ZEBRA', 'HIPPO', 'GIRAFFE'] },
    { id: 'rain', name: 'Дождь на трассе', style: 'arsenev', rain: true, sky: 0x6a7a88, fog: 0x6a7a88, fogNear: 25, fogFar: 110, ground: 0x66727c, light: 0.75, slide: 'oil',
        animals: ['DOG', 'DEER', 'FOX', 'CAT', 'HUMAN', 'BOAR'] },
    { id: 'jungle', name: 'Джунгли-зоопарк', style: 'forest', sky: 0x4a6a40, fog: 0x3d5a38, fogNear: 30, fogFar: 140, ground: 0x5a7a40, light: 0.9, slide: 'tar',
        animals: ['CROC', 'ELEPHANT', 'RHINO', 'LION', 'MONKEY'] }
];
export const THEME_LEN = 900;   // длина пейзажа, ед. (~30–40 с езды)
export const BLEND_LEN = 120;   // на стольких единицах небо, туман и земля плавно перетекают в следующий пейзаж

/** Какой пейзаж на расстоянии dist: { theme, next, k } — k 0..1 — доля перехода в следующий */
export function themeAt(dist) {
    const d = Math.max(0, dist || 0);
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
 * Рост сложности по расстоянию: 0 на старте → 1 к ~6 км. speed — множитель максимальной скорости (1 → 1.35),
 * animals — множитель частоты зверей (1 → 1.8), density — плотность препятствий на участке (0.5 → 1.3)
 */
export const RAMP_LEN = 6000;
export function rampAt(dist) {
    const t = Math.max(0, Math.min(1, (dist || 0) / RAMP_LEN));
    const e = t * (2 - t); // быстрее в начале, мягче к концу
    return { t: t, speed: 1 + 0.35 * e, animals: 1 + 0.8 * e, density: 0.5 + 0.8 * e };
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
 * Возвращает список { kind, d, lane, ... } — kind: 'obstacle' (type), 'echip' (lane, y), 'nitro', 'gum', 'gap' (rampLane).
 * Разлом — не чаще раза в GAP_EVERY, вокруг него чисто; «Е» — цепочками по полосам, змейкой и дугой над разломом.
 */
export const LANES = 3;
export const GAP_EVERY = [380, 560];
export function planStretch(d0, d1, rnd, opts) {
    const o = opts || {};
    const r = rnd || Math.random;
    const ramp = rampAt(d0);
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
    const nearGap = function(d) { return gaps.some(function(g) { return d > g - 50 && d < g + 20; }); };
    // препятствия
    const slide = o.slide || 'oil';
    const count = Math.round((d1 - d0) / 60 * ramp.density);
    for (let i = 0; i < count; i++) {
        const d = d0 + r() * (d1 - d0);
        if (nearGap(d)) continue;
        const t = r();
        out.push({ kind: 'obstacle', d: d, lane: lane(), type: t < 0.3 ? 'pothole' : t < 0.6 ? slide : 'bump' });
    }
    // цепочки «Е»: прямая по полосе или змейка через две полосы
    let d = d0 + 20 + r() * 30;
    while (d < d1 - 20) {
        if (!nearGap(d)) {
            const n = 5 + Math.floor(r() * 4);
            if (r() < 0.35) {
                let ln = lane();
                for (let i = 0; i < n; i++) { if (i === Math.floor(n / 2)) ln = (ln + (r() < 0.5 ? 1 : 2)) % LANES; out.push({ kind: 'echip', d: d + i * 2.2, lane: ln, y: 0.6 }); }
            } else {
                const ln = lane();
                for (let i = 0; i < n; i++) out.push({ kind: 'echip', d: d + i * 2.2, lane: ln, y: 0.6 });
            }
        }
        d += 55 + r() * 60;
    }
    // нитро и сердечки — реже
    for (let dd = d0 + 90 + r() * 80; dd < d1; dd += 180 + r() * 140) if (!nearGap(dd)) out.push({ kind: 'nitro', d: dd, lane: lane() });
    for (let dd = d0 + 300 + r() * 300; dd < d1; dd += 600 + r() * 400) if (!nearGap(dd)) out.push({ kind: 'gum', d: dd, lane: lane() });
    out.sort(function(a, b) { return a.d - b.d; });
    return { items: out, nextGap: nextGap };
}
