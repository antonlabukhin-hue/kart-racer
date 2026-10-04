/**
 * Сундук за вызов друга: принял вызов по ссылке и доехал — «дружеский сундук» (раз в день за каждого друга, не больше 3 в день);
 * побил результат друга — сундук богаче. profile.friendChest = { day, names: [] }. Логика — чистая (с тестами).
 */
export const FRIEND_CHEST = { chips: 150, winChips: 300, vhs: 1, perDay: 3 };

/** Выдать сундук за вызов от name. win — побил результат. Возвращает { chips, vhs } или null */
export function grantFriendChest(profile, name, today, win) {
    const f = profile.friendChest = profile.friendChest && profile.friendChest.day === today ? profile.friendChest : { day: today, names: [] };
    const key = String(name || '?');
    if (f.names.indexOf(key) >= 0 || f.names.length >= FRIEND_CHEST.perDay) return null;
    f.names.push(key);
    const g = { chips: win ? FRIEND_CHEST.winChips : FRIEND_CHEST.chips, vhs: win ? FRIEND_CHEST.vhs : 0, win: !!win };
    profile.season = profile.season || {};
    profile.season.chips = (profile.season.chips || 0) + g.chips;
    profile.season.vhs = (profile.season.vhs || 0) + g.vhs;
    return g;
}
