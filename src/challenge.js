/**
 * «Вызов другу» по «Звериному часу» и бесконечной трассе (m=inf, счёт — метры): ссылка с сидом, счётом, волной и именем.
 * Друг открывает ссылку — в меню баннер «Вызов от …», забег идёт по тому же сиду,
 * на финише видно, побит ли вызов. Сервера нет: всё в адресе ссылки.
 * Плюс лучший результат «Звериного часа дня» на устройстве (dailyBest).
 */
import { seedCode, parseSeedCode } from './beast-seed.js';

const MAX_SCORE = 10000000;

function cleanName(n) {
    return String(n || '').replace(/[<>&"'`\u0000-\u001f]/g, '').trim().slice(0, 16);
}

/** Ссылка-вызов: base — адрес игры (параметры и якорь отбрасываются) */
export function challengeUrl(base, c) {
    const q = new URLSearchParams();
    q.set('ch', seedCode(c.seed));
    q.set('s', String(Math.max(0, Math.min(MAX_SCORE, Math.round(c.score || 0)))));
    if (c.wave) q.set('w', String(Math.max(1, Math.min(99, c.wave | 0))));
    if (c.mode === 'inf') q.set('m', 'inf'); // бесконечная трасса: s — метры (без m — «Звериный час», s — очки)
    const n = cleanName(c.name);
    if (n) q.set('n', n);
    return String(base).split('?')[0].split('#')[0] + '?' + q.toString();
}

/** Разобрать вызов из location.search; null — вызова нет или ссылка битая */
export function parseChallenge(search) {
    let q;
    try { q = new URLSearchParams(search || ''); } catch (e) { return null; }
    const seed = parseSeedCode(q.get('ch'));
    if (seed == null) return null;
    const score = parseInt(q.get('s'), 10);
    const wave = parseInt(q.get('w'), 10);
    return {
        seed: seed,
        score: isFinite(score) ? Math.max(0, Math.min(MAX_SCORE, score)) : 0,
        wave: isFinite(wave) ? Math.max(1, Math.min(99, wave)) : null,
        mode: q.get('m') === 'inf' ? 'inf' : 'beast',
        name: cleanName(q.get('n')) || 'Друг'
    };
}

/** Строка поиска без параметров вызова (остальные — например, ?start= в тестах — сохраняются) */
export function stripChallenge(search) {
    const q = new URLSearchParams(search || '');
    ['ch', 's', 'w', 'n', 'm'].forEach(function(k) { q.delete(k); });
    const t = q.toString();
    return t ? '?' + t : '';
}

/** Итог вызова: 'win' — побил, 'tie', 'lose' */
export function challengeResult(myScore, theirScore) {
    const a = myScore || 0, b = theirScore || 0;
    return a > b ? 'win' : a === b ? 'tie' : 'lose';
}

/** Лучший за сегодня: prev — { seed, best } из профиля. Возвращает новую запись и был ли рекорд дня */
export function dailyBest(prev, seed, score) {
    const same = prev && prev.seed === seed;
    const before = same ? (prev.best || 0) : 0;
    return { rec: { seed: seed, best: Math.max(before, score || 0) }, isNew: (score || 0) > before, before: before };
}
