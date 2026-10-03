/**
 * Наклейки за три звезды кампании: за ★★★ в главе — своя наклейка в коллекцию и кусок лора «Досье курьера»
 * (кто такой Неизвестный голос, что в багажнике, куда ведёт трасса). Видно в «Трофеях»; вся коллекция — большая награда (раз).
 * profile.stickers = { got: { c01: время, … }, done: bool }. Логика — чистая (с тестами).
 */
export const STICKERS = {
    c01: { icon: '🏁', name: 'Выезд', lore: 'Арсеньев, 2037. Курьеру дали коробку с антидотом и одно правило: не открывать и не останавливаться.' },
    c02: { icon: '🌫', name: 'Туманный мост', lore: 'На мосту туман держится с девяностых. Говорят, его включает тот же, кто выключил радио.' },
    c03: { icon: '🌙', name: 'Ночной объезд', lore: 'Ночью звери выходят к дороге не сами — их кто-то гонит. Следы ведут к Промзоне.' },
    c04: { icon: '❄', name: 'Снежные ворота', lore: 'Ворота Промзоны замёрзли в октябре. Снег здесь пахнет химией и жжёной резиной.' },
    c05: { icon: '🏭', name: 'Цех №7', lore: 'В Цехе №7 когда-то делали кассеты. Теперь там делают что-то, от чего звери злеют.' },
    c06: { icon: '🔴', name: 'Красные трубы', lore: 'Неизвестный голос впервые назвал курьера по имени. Значит, знает, кто он.' },
    c07: { icon: '🗑', name: 'Надежда', lore: 'На свалке «Надежда» нашли старый пейджер. На экране — одно слово: «ЦЕНТР».' },
    c08: { icon: '☃', name: 'Первый снег', lore: 'Снеговики вдоль свалки поставлены не детьми. Каждый смотрит в сторону Центра.' },
    c09: { icon: '🌅', name: 'Холодный рассвет', lore: 'Рассвет показал главное: антидот нужен не городу, а тому, кто в Центре.' },
    c10: { icon: '📼', name: 'Последний VHS', lore: 'На последней кассете — запись 1997 года. Голос на ней совпадает с Неизвестным голосом.' },
    c11: { icon: '🚧', name: 'Подступы', lore: 'Подступы к Центру перекрыты. Значит, курьера ждут — или боятся.' },
    c12: { icon: '🏚', name: 'Снежный двор', lore: 'Во дворе Центра стоит «Ушастик» — точная копия машины курьера. Номер тот же.' },
    c13: { icon: '📻', name: 'Радиорынок', lore: 'На радиорынке продают приёмники, которые ловят только одну частоту — голос.' },
    c14: { icon: '🌉', name: 'Чёрный дым', lore: 'С эстакады видно: дым идёт из Центра. Антидот — единственное, что его остановит.' },
    c15: { icon: '⛏', name: 'Пустой желудок', lore: 'Карьер вырыли не за песком. На дне — антенна размером с дом.' },
    c16: { icon: '🕳', name: 'Белое молчание', lore: 'В тоннеле радио замолкает. Впервые за всю дорогу курьер слышит только мотор.' },
    c17: { icon: '🏆', name: 'Крыша Центра', lore: 'На крыше нет никого. Голос был записью. Антидот доставлен — город снова слышит музыку.' }
};
export const STICKER_IDS = Object.keys(STICKERS);
export const SET_REWARD = { chips: 5000, vhs: 5 };

/** За главу с ★★★ — наклейка (один раз). { sticker, id, setDone } или null. Награда за всю коллекцию — сразу в profile.season */
export function grantSticker(profile, chapterId, stars) {
    const s = STICKERS[chapterId];
    if (!s || stars < 3) return null;
    const st = profile.stickers = Object.assign({ got: {}, done: false }, profile.stickers);
    if (st.got[chapterId]) return null;
    st.got[chapterId] = Date.now();
    let setDone = false;
    if (!st.done && STICKER_IDS.every(function(id) { return st.got[id]; })) {
        st.done = true; setDone = true;
        profile.season = profile.season || {};
        profile.season.chips = (profile.season.chips || 0) + SET_REWARD.chips;
        profile.season.vhs = (profile.season.vhs || 0) + SET_REWARD.vhs;
    }
    return { id: chapterId, sticker: s, setDone: setDone };
}

/** Догнать старые профили: главы, где ★★★ уже есть, а наклейки ещё нет. Возвращает, сколько выдано */
export function backfillStickers(profile) {
    const stars = (profile.campaign && profile.campaign.stars) || {};
    let n = 0;
    STICKER_IDS.forEach(function(id) { if ((stars[id] || 0) >= 3 && grantSticker(profile, id, 3)) n++; });
    return n;
}

const esc = function(s) { return String(s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

/** Коллекция в «Трофеях»: собранные — с лором по нажатию, остальные — «глава N: ★★★» */
export function stickersHtml(profile) {
    const got = (profile.stickers && profile.stickers.got) || {};
    const n = STICKER_IDS.filter(function(id) { return got[id]; }).length;
    return '<div class="badge-set sticker-set"><div class="bs-head">⭐ Наклейки «Досье курьера» <b>' + n + ' / ' + STICKER_IDS.length + '</b><small>★★★ в главе — наклейка и кусок истории · все — +'
        + SET_REWARD.chips + ' Е и ' + SET_REWARD.vhs + ' 📼</small></div><div class="bs-grid">'
        + STICKER_IDS.map(function(id, i) {
            const s = STICKERS[id];
            return got[id] ? '<span class="got" data-sticker="' + id + '" title="' + esc(s.lore) + '"><i>' + s.icon + '</i><small>' + esc(s.name) + '</small></span>'
                : '<span><i>?</i><small>глава ' + (i + 1) + ' ★★★</small></span>';
        }).join('') + '</div><div class="sticker-lore" hidden></div></div>';
}

/** Плашка на итогах главы */
export function stickerFinishHtml(g) {
    return '<div class="fin-sticker"><i>' + g.sticker.icon + '</i><div><b>Наклейка «' + esc(g.sticker.name) + '»!</b><small>' + esc(g.sticker.lore) + '</small>'
        + (g.setDone ? '<em>Вся коллекция собрана: +' + SET_REWARD.chips + ' Е и ' + SET_REWARD.vhs + ' 📼!</em>' : '') + '</div></div>';
}
