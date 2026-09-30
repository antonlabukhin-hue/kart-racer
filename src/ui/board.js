/**
 * Окна главного меню: «🏆 Рекорды» (вкладки «Неделя» / «Всё время», src/leaderboard.js)
 * и «📝 Слово дня» (что это и сколько собрано, src/word-day.js). Зависимости передаются явно.
 */
import { topRuns, rankOf, BOARD_SIZE } from '../leaderboard.js';
import { wordProgress, wordReward } from '../word-day.js';

function modal(html) {
    document.querySelectorAll('.board-modal').forEach(function(n) { n.remove(); });
    const m = document.createElement('div');
    m.className = 'board-modal';
    m.innerHTML = '<div class="board-card" role="dialog">' + html + '<button type="button" class="bd-close">Закрыть</button></div>';
    document.body.appendChild(m);
    m.querySelector('.bd-close').onclick = function() { m.remove(); };
    m.addEventListener('click', function(e) { if (e.target === m) m.remove(); });
    return m;
}
function esc(s) { return String(s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/** o: { me, list, now, carName(id), fetchOnline(scope) → Promise<заезды | null> — мировая таблица (src/online-board.js) } */
export function showBoard(o) {
    const m = modal('<div class="bd-title">🏆 Рекорды дальности</div><div class="bd-tabs"><button type="button" data-s="week" class="on">Неделя</button><button type="button" data-s="all">Всё время</button></div><ol class="bd-list"></ol>'
        + '<div class="bd-note"></div>');
    let shown = 'week', online = {};
    const note = function(t) { m.querySelector('.bd-note').textContent = t; };
    const render = function(scope) {
        shown = scope;
        const rows = topRuns((online[scope] || []).concat(o.list), scope, o.now, o.me);
        const my = rankOf(rows, o.me);
        let show = rows.slice(0, BOARD_SIZE);
        if (my > BOARD_SIZE) show = show.concat([rows[my - 1]]);
        m.querySelector('.bd-list').innerHTML = show.map(function(r) {
            const place = rows.indexOf(r) + 1;
            return '<li class="' + (r.me ? 'me' : r.rival ? 'rival' : '') + '"><i>' + (place <= 3 ? ['🥇', '🥈', '🥉'][place - 1] : place) + '</i><span>' + esc(r.name)
                + (r.car && o.carName ? '<small>' + esc(o.carName(r.car)) + '</small>' : '') + '</span><b>' + r.dist.toLocaleString('ru-RU') + ' м</b></li>';
        }).join('') || '<li><span>Пока пусто — прокатись!</span></li>';
        m.querySelectorAll('.bd-tabs button').forEach(function(b) { b.classList.toggle('on', b.dataset.s === scope); });
    };
    // сразу — рекорды устройства, следом — мировая таблица с сервера (без сети остаётся локальная)
    const load = function(scope) {
        render(scope);
        if (!o.fetchOnline) { note('Рекорды этого устройства и соперники с трассы.'); return; }
        if (online[scope]) { note('🌍 Мировая таблица: игроки со всего мира'); return; }
        note('Загружаю мировую таблицу…');
        o.fetchOnline(scope).then(function(list) {
            if (!m.isConnected) return;
            if (list) online[scope] = list;
            if (shown !== scope) return;
            render(scope);
            note(list ? '🌍 Мировая таблица: игроки со всего мира' : 'Нет сети — показаны рекорды этого устройства.');
        });
    };
    m.querySelectorAll('.bd-tabs button').forEach(function(b) { b.onclick = function() { load(b.dataset.s); }; });
    load('week');
    return m;
}

/** s — wordState(...) */
export function showWordInfo(s) {
    const r = wordReward((s.streak || 0) + 1);
    return modal('<div class="bd-title">📝 Слово дня</div><div class="wd-word">' + esc(wordProgress(s.word, s.got)) + '</div>'
        + '<p class="wd-text">' + (s.done ? 'Сегодня слово собрано! Завтра — новое. Серия: ' + s.streak + ' дн.'
            : 'Буквы лежат на бесконечной трассе — по одной, всегда та, что нужна. Собери слово за день: <b>+' + r.chips + ' Е</b>' + (r.vhs ? ' и 📼' : '') + '. Каждый день подряд — награда больше.') + '</p>');
}

/** Карточки в меню: слово дня и место в таблице */
export function renderMenuExtras(o) {
    const w = document.getElementById('mm-word-text');
    if (w) w.textContent = o.word.done ? '✔ ' + o.word.word : wordProgress(o.word.word, o.word.got);
    const b = document.getElementById('mm-board-text');
    if (b) {
        const rows = topRuns(o.list, 'week', o.now, o.me), my = rankOf(rows, o.me);
        b.textContent = my ? '#' + my + ' на неделе' : 'соперники ждут';
    }
}
