/**
 * Цель на итогах заезда: «Ещё 2 650 Е — и „Нива“ в твоём гараже» с полоской прогресса — сразу видно, зачем ехать снова.
 * Цель — самая дешёвая машина за «Е», которой у игрока нет (подарочные и за кассеты — не в счёт). Логика — чистая (с тестами).
 */
const fmt = function(n) { return Math.round(n).toLocaleString('ru-RU'); };
const esc = function(s) { return String(s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

/** o: { owned — id машин игрока, chips — «Е» на счету, presets — CAR_PRESETS, order — порядок витрины, isGift(id) } → { id, name, price, left, k } | null */
export function nextCarGoal(o) {
    const owned = o.owned || [];
    const ids = (o.order || Object.keys(o.presets)).filter(function(id) {
        const p = o.presets[id];
        return p && p.priceChips > 0 && !p.priceVhs && owned.indexOf(id) < 0 && !(o.isGift && o.isGift(id));
    }).sort(function(a, b) { return o.presets[a].priceChips - o.presets[b].priceChips; });
    if (!ids.length) return null;
    const id = ids[0], price = o.presets[id].priceChips, chips = Math.max(0, o.chips || 0);
    return { id: id, name: o.presets[id].name, price: price, left: Math.max(0, price - chips), k: Math.min(1, chips / price) };
}

export function carGoalHtml(g) {
    if (!g) return '';
    const text = g.left > 0 ? 'Ещё ' + fmt(g.left) + ' Е — и «' + esc(g.name) + '» в твоём гараже' : 'Хватает на «' + esc(g.name) + '»! Загляни в «Машины»';
    return '<div class="fin-cargoal' + (g.left > 0 ? '' : ' ready') + '" data-car="' + esc(g.id) + '"><i>🚗</i><span>' + text
        + '</span><u><b style="width:' + Math.round(g.k * 100) + '%"></b></u><small>' + fmt(g.price - g.left) + ' / ' + fmt(g.price) + ' Е</small></div>';
}
