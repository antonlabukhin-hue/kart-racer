/**
 * Шкала брони — как полоска HP босса, но размером и местом как шкала «В УДАРЕ» (низ экрана по центру).
 * 5 ячеек; горят столько, сколько ударов ещё держит броня (без прокачки — одна). Удар — ячейка гаснет;
 * погасла последняя — шкала исчезает. «В УДАРЕ» главнее: пока горит, шкала брони спрятана (и показывается снова после).
 */
export const ARMOR_CELLS = 5;

/** Что показать: null — ничего; иначе { lit } — сколько ячеек горит */
export function armorBarState(hits, feverOn) {
    if (feverOn || !(hits > 0)) return null;
    return { lit: Math.min(ARMOR_CELLS, hits) };
}

let el = null, lastLit = -1;
export function renderArmorBar(hits, feverOn) {
    const st = armorBarState(hits, feverOn);
    if (!st) { if (el) { el.remove(); el = null; } lastLit = -1; return; }
    if (!el || !el.isConnected) {
        el = document.createElement('div');
        el.id = 'armor-bar';
        el.innerHTML = '<b>🛡 БРОНЯ</b><span>' + '<i></i>'.repeat(ARMOR_CELLS) + '</span>';
        document.body.appendChild(el);
        lastLit = -1;
    }
    if (st.lit === lastLit) return;
    const cells = el.querySelectorAll('i');
    cells.forEach(function(c, i) { c.classList.toggle('on', i < st.lit); });
    if (lastLit > st.lit) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); } // удар — шкала вздрагивает
    lastLit = st.lit;
}

export function removeArmorBar() { if (el) { el.remove(); el = null; } lastLit = -1; }
