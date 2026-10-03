/**
 * «Почти» на итогах бесконечного заезда — то, что тянет нажать «Повторить»: до рекорда не хватило 140 м,
 * до соперника 60 м, до задания — 1 прыжок. Показываем одну-две самые близкие цели (по доле оставшегося).
 * Логика — чистая (с тестами).
 */
const fmt = function(n) { return Math.round(n).toLocaleString('ru-RU'); };

/**
 * o: { dist, best (рекорд до заезда), isNew, targets — лесенка целей src/rival-chase.js [{ name, dist, mine }],
 *      missions — [{ text, after, target }] (прогресс заданий после заезда) }
 * Возвращает [{ icon, text, k }] — k: сколько осталось от цели (0..1), чем меньше, тем ближе.
 */
export function nearlyLines(o) {
    const out = [];
    const dist = Math.round(o.dist || 0);
    if (!o.isNew && o.best > dist) {
        const gap = o.best - dist, k = gap / o.best;
        if (gap <= Math.max(300, o.best * 0.35)) out.push({ icon: '🏁', text: 'До рекорда не хватило ' + fmt(gap) + ' м!', k: k });
    }
    const rival = (o.targets || []).filter(function(t) { return !t.mine && t.dist > dist; }).sort(function(a, b) { return a.dist - b.dist; })[0];
    if (rival && rival.dist - dist <= 400) out.push({ icon: '🎯', text: 'До «' + rival.name + '» — ' + fmt(rival.dist - dist) + ' м', k: (rival.dist - dist) / rival.dist });
    (o.missions || []).forEach(function(m) {
        const left = m.target - m.after;
        if (left > 0 && left <= Math.max(1, Math.ceil(m.target * 0.2))) out.push({ icon: '📋', text: '«' + m.text + '» — осталось ' + fmt(left), k: left / m.target });
    });
    return out.sort(function(a, b) { return a.k - b.k; }).slice(0, 2);
}

export function nearlyHtml(lines) {
    if (!lines || !lines.length) return '';
    return '<div class="fin-nearly">' + lines.map(function(l) {
        return '<div><i>' + l.icon + '</i>' + String(l.text).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + '</div>';
    }).join('') + '<small>Ещё разок — и получится!</small></div>';
}
