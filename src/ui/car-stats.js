/**
 * Сравнение машин одинаковыми шкалами (как в Real Racing / Asphalt): у каждой машины те же пять
 * показателей по 10-балльной шкале, при выборе другой машины — разница с текущей (+зелёным / −красным)
 * и отметка, где текущая. bars — из statBars() (src/upgrades.js): [{ id, name, v: 0..1 }].
 */

function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
}

/** 0..1 → 1..10 */
export function points(v) {
    return Math.max(1, Math.min(10, Math.round(v * 10)));
}

/** Разница в баллах с текущей машиной по каждой шкале (0 — если сравнивать не с чем) */
export function statDeltas(bars, compare) {
    return bars.map(function(b, i) { return compare && compare[i] ? points(b.v) - points(compare[i].v) : 0; });
}

/**
 * HTML блока: способность, шкалы, примечание.
 * opts: { ability: { name, desc }, compare: bars текущей машины или null, compareName, note }
 */
export function carStatsHtml(bars, opts) {
    const o = opts || {};
    const d = statDeltas(bars, o.compare);
    const rows = bars.map(function(b, i) {
        const cmp = o.compare && o.compare[i] ? '<u style="left:' + Math.round(o.compare[i].v * 100) + '%" title="' + esc(o.compareName || '') + '"></u>' : '';
        const delta = d[i] ? '<em class="' + (d[i] > 0 ? 'up' : 'down') + '">' + (d[i] > 0 ? '+' : '−') + Math.abs(d[i]) + '</em>' : '<em></em>';
        return '<div class="cs-bar"><span>' + esc(b.name) + '</span><div class="cs-track"><i style="width:' + Math.round(b.v * 100) + '%"></i>' + cmp + '</div>'
            + '<b>' + points(b.v) + '</b>' + delta + '</div>';
    }).join('');
    return (o.ability ? '<div class="cs-ability"><b>★ ' + esc(o.ability.name) + '</b> — ' + esc(o.ability.desc) + '</div>' : '')
        + '<div class="cs-bars">' + rows + '</div>'
        + (o.compare && o.compareName ? '<div class="cs-legend">сравнение с «' + esc(o.compareName) + '»: <em class="up">+</em> лучше, <em class="down">−</em> хуже</div>' : '')
        + (o.note ? '<div class="cs-note">' + esc(o.note) + '</div>' : '');
}
