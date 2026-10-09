/**
 * Достижения-шутки: «Опоздал на электричку», «Сосед с перфоратором», «Бабушка довольна», «Ёжик в тумане»,
 * «Они существуют», «Сделали на «Запорожце»», «Мем недели». Счётчики — в profile.fun (без DOM, с тестами).
 * record(profile, event) → id достижений, которые открылись прямо сейчас (выдаёт main.js через unlockAchievement).
 */
export const FUN_ACHIEVEMENTS = [
    { id: 'late_train', name: 'Опоздал на электричку', desc: 'Проехать под мостом, когда сверху идёт поезд', event: 'late_train', need: 1 },
    { id: 'perforator', name: 'Сосед с перфоратором', desc: 'Снести 10 рекламных щитов', event: 'board', need: 10 },
    { id: 'granny_ok', name: 'Бабушка довольна', desc: '5 раз встретить бабушку с огурцами', event: 'm_granny_cross', need: 5 },
    { id: 'hedgehog', name: 'Ёжик в тумане', desc: 'Встретить ёжика с узелком', event: 'm_hedgehog', need: 1 },
    { id: 'ufo_seen', name: 'Они существуют', desc: 'Увидеть НЛО над лесом', event: 'm_ufo', need: 1 },
    { id: 'zapor_lost', name: 'Сделали на «Запорожце»', desc: 'Тебя обогнал «Запорожец» на реактивной тяге', event: 'm_zapor_nitro', need: 1 },
    { id: 'meme_week', name: 'В тренде', desc: 'Встретить «мем недели»', event: 'meme_week', need: 1 }
];

/** Засчитать событие; вернуть открытые сейчас достижения (каждое — один раз) */
export function record(profile, event, n) {
    if (!profile || !event) return [];
    const f = profile.fun = profile.fun || { c: {}, got: {} };
    f.c[event] = (f.c[event] || 0) + (n || 1);
    const out = [];
    FUN_ACHIEVEMENTS.forEach(function(a) {
        if (a.event === event && !f.got[a.id] && f.c[event] >= a.need) { f.got[a.id] = true; out.push(a.id); }
    });
    return out;
}
