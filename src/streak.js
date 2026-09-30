/**
 * Ежедневная серия: заходишь каждый день подряд — растёт серия и сундук дня богаче (7-й — большой).
 * Пропустил день — серия заново. profile.streak = { count, last: 'ГГГГ-ММ-ДД', claimed: 'ГГГГ-ММ-ДД' | null }
 */
export const CHESTS = [
    { chips: 20, gum: 5 }, { chips: 30, gum: 8 }, { chips: 40, gum: 10 }, { chips: 50, gum: 12 },
    { chips: 60, gum: 15 }, { chips: 80, gum: 20 }, { chips: 120, gum: 30, vhs: 1 }
];
export const CHEST_VHS_CHANCE = 0.1; // видеокассета: в обычный день изредка, в 7-й — всегда

/** Локальная дата 'ГГГГ-ММ-ДД' */
export function dayKey(d) {
    const x = d instanceof Date ? d : new Date(d);
    const p = function(n) { return (n < 10 ? '0' : '') + n; };
    return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate());
}

/** Сколько дней от a до b (ключи dayKey) */
export function daysBetween(a, b) {
    const t = function(k) { const s = k.split('-'); return Date.UTC(+s[0], +s[1] - 1, +s[2]); };
    return Math.round((t(b) - t(a)) / 86400000);
}

/** Отметить заход сегодня (мутирует profile). Возвращает { count, isNewDay } */
export function touchStreak(profile, today) {
    const st = profile.streak;
    if (!st || !st.last) {
        profile.streak = { count: 1, last: today, claimed: null };
        return { count: 1, isNewDay: true };
    }
    const gap = daysBetween(st.last, today);
    if (gap <= 0) return { count: st.count, isNewDay: false };
    st.count = gap === 1 ? st.count + 1 : 1;
    st.last = today;
    return { count: st.count, isNewDay: true };
}

/** Сундук для дня серии (с 8-го дня — снова с первого, но серия продолжает расти) */
export function chestFor(count) {
    return CHESTS[(Math.max(1, count) - 1) % CHESTS.length];
}

export function canClaimChest(profile, today) {
    const st = profile.streak;
    return !!st && st.last === today && st.claimed !== today;
}

/** Забрать сундук дня: начисляет фишки и жвачку. null — сегодня уже забран */
export function claimChest(profile, today, rnd) {
    if (!canClaimChest(profile, today)) return null;
    const c = chestFor(profile.streak.count);
    profile.season.chips = (profile.season.chips || 0) + c.chips;
    profile.season.gum = (profile.season.gum || 0) + c.gum;
    const vhs = c.vhs || ((rnd || Math.random)() < CHEST_VHS_CHANCE ? 1 : 0);
    profile.season.vhs = (profile.season.vhs || 0) + vhs;
    profile.streak.claimed = today;
    return { chips: c.chips, gum: c.gum, vhs: vhs, day: profile.streak.count };
}
