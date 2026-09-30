/**
 * Бусты перед бесконечным заездом (как Headstart и Mystery Box в Subway Surfers) — ежедневная трата «Е»:
 *   🚀 «Разгон» — первые HEADSTART_M метров на нитро и под бронёй (удары не считаются);
 *   🛞 «Запаска» — старт с бронёй: один удар — не авария.
 * Выбираются в витрине перед стартом, списываются на «ПОЕХАЛИ». Зависимости — явно (без window.*).
 */
export const HEADSTART_M = 600;
export const BOOSTS = [
    { id: 'headstart', icon: '🚀', name: 'Разгон', text: HEADSTART_M + ' м на нитро под бронёй', price: 300 },
    { id: 'spare', icon: '🛞', name: 'Запаска', text: 'один удар — не авария', price: 150 }
];

/** Купить выбранные: списывает «Е», пока хватает. Возвращает купленные id */
export function buyBoosts(profile, ids) {
    const out = [];
    BOOSTS.forEach(function(b) {
        if (ids.indexOf(b.id) < 0) return;
        const have = (profile.season && profile.season.chips) || 0;
        if (have < b.price) return;
        profile.season.chips = have - b.price;
        out.push(b.id);
    });
    return out;
}

/** Переключатели в витрине: sel — Set выбранных (живёт между заездами), профиль — чтобы показать, хватает ли «Е» */
export function renderBoostBar(el, profile, sel) {
    const have = (profile.season && profile.season.chips) || 0;
    let sum = 0;
    sel.forEach(function(id) { const b = BOOSTS.find(function(x) { return x.id === id; }); if (b) sum += b.price; });
    el.innerHTML = '<div class="bb-title">Перед стартом:</div>' + BOOSTS.map(function(b) {
        const on = sel.has(b.id), can = on || have - sum >= b.price;
        return '<button type="button" class="bb-item' + (on ? ' on' : '') + (can ? '' : ' off') + '" data-b="' + b.id + '"><i>' + b.icon + '</i><span><b>' + b.name + '</b><small>' + b.text + '</small></span><em>' + (on ? '✓ ' : '') + b.price + ' Е</em></button>';
    }).join('');
    el.querySelectorAll('.bb-item').forEach(function(btn) {
        btn.onclick = function() {
            const id = btn.dataset.b;
            if (sel.has(id)) sel.delete(id);
            else if (!btn.classList.contains('off')) sel.add(id);
            renderBoostBar(el, profile, sel);
        };
    });
}
