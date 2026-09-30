/**
 * Экран финиша: одна главная кнопка по исходу заезда (как в мобильных гонках) и награды «фишками»
 * с набегающим счётчиком. Кнопки сохраняют прежние id — обработчики в main.js вешаются по ним.
 */

/**
 * Какие кнопки и в каком порядке. o: { camp, state: 'win'|'crash'|'timeout', hasNext, endless, canUpgrade }
 * kind: primary — золотая (одна), secondary — обычная, ghost — тихая («В меню»).
 */
export function finishActions(o) {
    const win = o.state === 'win';
    const garage = { id: 'finish-garage-btn', label: o.canUpgrade ? '🔧 Гараж · можно прокачать' : '🔧 Гараж', kind: 'secondary', hot: !!o.canUpgrade };
    const retry = { id: 'finish-restart-btn', label: '🔄 Повторить', kind: 'secondary' };
    const menu = { id: 'finish-menu-btn', label: '🏠 В меню', kind: 'ghost' };
    const list = [];
    if (o.camp && win) {
        list.push({ id: 'finish-next-btn', label: o.hasNext ? '⏭ Дальше: следующая глава' : '📖 К списку глав', kind: 'primary' });
        list.push(retry, garage);
    } else {
        list.push(Object.assign({}, retry, { kind: 'primary' }));
        if (o.endless) list.push({ id: 'finish-challenge-btn', label: '📨 Вызвать друга', kind: 'secondary' });
        // проиграл и хватает фишек — гараж выше: прокачка и есть ответ на поражение
        list.push(garage);
    }
    list.push(menu);
    return list;
}

export function finishButtonsHtml(o) {
    // .fin-actions прилипает к низу карточки: главная кнопка видна без прокрутки
    return '<div class="fin-actions">' + finishActions(o).map(function(b) {
        return '<button type="button" id="' + b.id + '" class="fin-btn ' + b.kind + (b.hot ? ' hot' : '') + '">' + b.label + '</button>';
    }).join('') + '</div>';
}

/** Статистика заезда плитками: [[иконка, подпись, значение], ...] */
export function statTilesHtml(list) {
    if (!list || !list.length) return '';
    return '<div class="fin-stats">' + list.map(function(x) {
        return '<div><i>' + x[0] + '</i><b>' + x[2] + '</b><small>' + x[1] + '</small></div>';
    }).join('') + '</div>';
}

/** Награды «фишками»: число набегает от 0 (animateRewardChips). totals — { chips, gum } после заезда */
export function rewardChipsHtml(r, totals) {
    if (!r) return '';
    const items = [['Е', r.chips, 'железные «Е»'], ['🍬', r.gum, 'жвачки'], ['📼', r.vhs, 'видеокассеты'], ['XP', r.xp, 'опыт']].filter(function(x) { return (x[1] || 0) > 0; });
    if (!items.length) return '';
    return '<div class="fin-rewards">' + items.map(function(x, i) {
        return '<span class="fin-chip" style="animation-delay:' + (0.15 + i * 0.12) + 's" title="' + x[2] + '"><i>' + x[0] + '</i> +<b data-to="' + x[1] + '">' + x[1] + '</b></span>';
    }).join('') + '</div>'
        + (totals ? '<div class="fin-total">всего: Е ' + (totals.chips || 0) + ' · 🍬 ' + (totals.gum || 0) + '</div>' : '');
}

/** Набегающие числа в наградах (0 → итог за ~0.8 с); без анимации, если пользователь её отключил */
export function animateRewardChips(root, raf) {
    const els = root ? root.querySelectorAll('.fin-chip b[data-to]') : [];
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!els.length || reduce) return;
    const step = raf || requestAnimationFrame;
    const t0 = Date.now();
    els.forEach(function(el) { el.textContent = '0'; });
    (function tick() {
        const k = Math.min(1, (Date.now() - t0) / 800);
        els.forEach(function(el) { el.textContent = String(Math.round((+el.dataset.to) * (1 - Math.pow(1 - k, 3)))); });
        if (k < 1) step(tick);
    })();
}

/** «Почти!» при поражении: сколько % трассы оставалось (мотивирует на «ещё раз») */
export function nearlyText(leftPct) {
    if (leftPct == null || leftPct > 60) return '';
    if (leftPct <= 15) return '\nДо финиша оставалось ' + leftPct + '% — почти доехал!';
    return '\nДо финиша оставалось ' + leftPct + '%';
}

/** Клавиши на финише: Enter — главная кнопка, R — «Повторить» (одно нажатие — и снова на трассе) */
export function bindFinishKeys(screen) {
    const onKey = function(e) {
        if (!screen.isConnected) { document.removeEventListener('keydown', onKey, true); return; }
        const k = (e.key || '').toLowerCase();
        const btn = k === 'enter' ? screen.querySelector('.fin-btn.primary') : (k === 'r' || k === 'к') ? screen.querySelector('#finish-restart-btn') : null;
        if (!btn || e.repeat) return;
        e.preventDefault(); e.stopPropagation();
        document.removeEventListener('keydown', onKey, true);
        btn.click();
    };
    document.addEventListener('keydown', onKey, true);
}

function escT(t) { return String(t).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/**
 * Очки риска и задания на финише: «🔥 Риск 1 240 · лучший ×5 · +62 XP» и строки заданий —
 * выполненные с наградой, продвинувшиеся — «3/7 (+2)». r — награды заезда (r.risk, r.riskXp, r.missions).
 */
export function retentionHtml(r) {
    if (!r) return '';
    let h = '';
    if (r.risk && r.risk.points > 0) {
        h += '<div class="fin-risk">🔥 Риск <b>' + r.risk.points.toLocaleString('ru-RU') + '</b> · лучший ×' + r.risk.best
            + (r.riskXp ? ' · <em>+' + r.riskXp + ' XP</em>' : '') + '</div>';
    }
    const m = r.missions;
    if (m && (m.completed.length || m.progressed.length)) {
        h += '<div class="fin-missions">' + m.completed.map(function(c) {
            return '<div class="done">✅ ' + escT(c.text) + ' — <b>+' + c.reward + ' Е</b></div>';
        }).join('') + m.progressed.filter(function(x) { return x.after < x.target; }).map(function(x) {
            return '<div>📋 ' + escT(x.text) + ': ' + x.after + '/' + x.target + ' <em>(+' + (x.after - x.before) + ')</em></div>';
        }).join('') + '</div>';
    }
    return h;
}
