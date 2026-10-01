/**
 * Коллекция значков 90-х: выпадают из ящиков «?» бесконечной трассы. Новый — в коллекцию, повтор — +DUP_E «Е».
 * Собрал все — большая награда (раз). profile.badges = { got: { id: время }, done: bool }
 * Логика — чистая (с тестами); показ — в «Трофеях» (src/ui/badges-view.js не нужен: разметка здесь же).
 */
export const BADGES = [
    { id: 'tech', icon: '🔧', name: 'Юный техник' },
    { id: 'turbo', icon: '🏎', name: 'Вкладыш от жвачки' },
    { id: 'tama', icon: '🥚', name: 'Электронный питомец' },
    { id: 'pager', icon: '📟', name: 'Пейджер' },
    { id: 'cart', icon: '🕹', name: 'Картридж 9999 в 1' },
    { id: 'tape', icon: '📼', name: 'Кассета «Сборник»' },
    { id: 'cube', icon: '🧊', name: 'Кубик-головоломка' },
    { id: 'walkman', icon: '🎧', name: 'Плеер с наушниками' }
];
export const DUP_E = 50;
export const SET_REWARD = { chips: 2000, vhs: 2 };

/**
 * Выпал значок (rnd — [0,1)): { badge, isNew, dupChips, setDone } — начисления в profile.season сразу.
 */
export function dropBadge(profile, rnd) {
    const b = profile.badges = Object.assign({ got: {}, done: false }, profile.badges);
    const r = rnd || Math.random;
    const badge = BADGES[Math.floor(r() * BADGES.length) % BADGES.length];
    profile.season = profile.season || {};
    if (b.got[badge.id]) {
        profile.season.chips = (profile.season.chips || 0) + DUP_E;
        return { badge: badge, isNew: false, dupChips: DUP_E, setDone: false };
    }
    b.got[badge.id] = Date.now();
    let setDone = false;
    if (!b.done && BADGES.every(function(x) { return b.got[x.id]; })) {
        b.done = true; setDone = true;
        profile.season.chips = (profile.season.chips || 0) + SET_REWARD.chips;
        profile.season.vhs = (profile.season.vhs || 0) + SET_REWARD.vhs;
    }
    return { badge: badge, isNew: true, dupChips: 0, setDone: setDone };
}

/** Разметка коллекции: собранные — ярко, остальные — «?» */
export function badgesHtml(profile) {
    const got = (profile.badges && profile.badges.got) || {};
    const n = BADGES.filter(function(x) { return got[x.id]; }).length;
    return '<div class="badge-set"><div class="bs-head">🎖 Значки 90-х <b>' + n + ' / ' + BADGES.length + '</b><small>выпадают из ящиков «?» · все — +' + SET_REWARD.chips + ' Е и ' + SET_REWARD.vhs + ' 📼</small></div><div class="bs-grid">'
        + BADGES.map(function(x) { return got[x.id] ? '<span class="got" title="' + x.name + '"><i>' + x.icon + '</i><small>' + x.name + '</small></span>' : '<span><i>?</i><small>???</small></span>'; }).join('')
        + '</div></div>';
}
