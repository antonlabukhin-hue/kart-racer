/**
 * Счётчики на кнопках меню (как красные точки в мобильных играх): «есть что забрать / на что потратить».
 * Чистые функции — считают по профилю, ничего не меняют.
 */

/** Сколько наград сезона уже открыто, но не забрано */
export function unclaimedRewards(profile, rewards) {
    if (!profile || !profile.season) return 0;
    const lv = profile.season.level || 0, got = profile.claimedRewards || {};
    return (rewards || []).filter(function(r) { return r.level <= lv && !got[r.level]; }).length;
}

/** Счётчик вкладки «Сезон»: незабранные награды + смена дня, если ещё не отработана */
export function seasonBadge(profile, rewards) {
    const daily = profile && profile.daily && profile.daily.done ? 0 : 1;
    return unclaimedRewards(profile, rewards) + daily;
}

/**
 * Сколько улучшений машины можно купить прямо сейчас.
 * levels — { engine: 0..max, ... }, upgrades — [{ id }], costOf(id, level) — цена следующего уровня.
 */
export function affordableUpgrades(levels, chips, upgrades, costOf, maxLevel) {
    const lv = levels || {};
    return (upgrades || []).filter(function(u) {
        const l = lv[u.id] || 0;
        return l < maxLevel && costOf(u.id, l) <= (chips || 0);
    }).length;
}

/** Текст счётчика: пусто — не показывать, больше 9 — «9+» */
export function badgeText(n) {
    return n > 0 ? (n > 9 ? '9+' : String(n)) : '';
}
