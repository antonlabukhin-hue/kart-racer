/**
 * Надписи в заезде (радио, ведущий, «БРОНЯ», «НИТРО!», штрафы, реплики босса…) — в одном месте сверху,
 * мелко и по одной: новая убирает прежнюю. Создают их разные части игры — здесь только перехват:
 * следим за детьми body и помечаем такие элементы классом .rt (вид — в css/style.css).
 */
export const TOAST_SEL = '.animal-shout, .radio-line, .story-plaque, .big-plaque, .announcer, .penalty-pop, .crash-tag';

let current = null;

function take(el) {
    if (current === el && el.classList.contains('rt')) return; // уже на месте (и не зацикливаемся на своей же смене класса)
    if (current && current !== el && current.isConnected) {
        if (current.classList.contains('announcer')) current.classList.add('out'); // ведущего не удаляем — он переиспользует рамку
        else current.remove();
    }
    el.classList.add('rt');
    current = el;
}

export function installRaceToasts() {
    if (typeof MutationObserver === 'undefined' || !document.body) return;
    // ведущий меняет текст в той же рамке и снова показывает её классом «in» — это тоже новая надпись
    const announcerSeen = new WeakSet();
    const onAnnouncer = new MutationObserver(function(list) {
        list.forEach(function(m) { if (m.target.classList.contains('in') && !m.target.classList.contains('out')) take(m.target); });
    });
    new MutationObserver(function(list) {
        if (!document.body.classList.contains('race-mode')) return;
        list.forEach(function(m) {
            m.addedNodes.forEach(function(n) {
                if (n.nodeType !== 1 || !n.matches(TOAST_SEL)) return;
                take(n);
                if (n.classList.contains('announcer') && !announcerSeen.has(n)) {
                    announcerSeen.add(n);
                    onAnnouncer.observe(n, { attributes: true, attributeFilter: ['class'] });
                }
            });
        });
    }).observe(document.body, { childList: true });
}
