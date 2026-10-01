/**
 * «Появились новые машины — скорее смотреть!»: яркая светящаяся плашка при входе в главное меню после обновления.
 * Один раз на выпуск (метка tag в localStorage). «Смотреть» — витрина сразу на первой новинке.
 * Зависимости — явно: { tag, names, onOpen }.
 */
export const NEW_SEEN_KEY = 'road_racing_new_cars_seen';

export function shouldShowNew(tag, storage) {
    let v = null;
    try { v = (storage || localStorage).getItem(NEW_SEEN_KEY); } catch (e) {}
    return v !== tag && v !== 'all';
}
export function markNewSeen(tag, storage) {
    try { (storage || localStorage).setItem(NEW_SEEN_KEY, tag); } catch (e) {}
}

export function showNewCarsPop(o) {
    if (document.querySelector('.newcars-modal')) return null;
    const m = document.createElement('div');
    m.className = 'newcars-modal';
    m.innerHTML = '<div class="newcars-card" role="dialog" aria-label="Новые машины">'
        + '<div class="nc-burst">🔥 НОВИНКИ 🔥</div>'
        + '<div class="nc-title">Появились новые машины!</div>'
        + '<div class="nc-sub">Скорее смотреть — у каждой своя способность</div>'
        + '<div class="nc-list">' + o.names.map(function(n) { return '<span>' + n + '</span>'; }).join('') + '</div>'
        + '<button type="button" class="nc-go">🚗 Смотреть</button><button type="button" class="nc-later">Позже</button></div>';
    document.body.appendChild(m);
    const close = function() { markNewSeen(o.tag); m.remove(); };
    m.querySelector('.nc-later').onclick = close;
    m.querySelector('.nc-go').onclick = function() { close(); if (o.onOpen) o.onOpen(); };
    return m;
}
