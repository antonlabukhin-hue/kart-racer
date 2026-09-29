/**
 * Поделиться ссылкой: «Поделиться» телефона → буфер обмена → плашка со ссылкой и кнопкой «Скопировать».
 * Никаких системных prompt/alert. onCopied — показать «скопировано» (например, Notify).
 */
export function shareLink(url, opts) {
    const o = opts || {};
    try {
        if (navigator.share) { navigator.share({ title: o.title || document.title, text: o.text || '', url: url }).catch(function() {}); return 'share'; }
    } catch (e) {}
    try {
        navigator.clipboard.writeText(url).then(function() { if (o.onCopied) o.onCopied(); }, function() { showLinkBox(url, o.label); });
        return 'clipboard';
    } catch (e) {
        showLinkBox(url, o.label);
        return 'box';
    }
}

/** Плашка со ссылкой: выделенное поле и кнопки «Скопировать» / «Закрыть» */
export function showLinkBox(url, label) {
    document.querySelectorAll('.share-link').forEach(function(n) { n.remove(); });
    const box = document.createElement('div');
    box.className = 'share-link';
    box.innerHTML = '<b></b><input readonly><div class="sl-row"><button type="button" class="sl-copy">Скопировать</button><button type="button" class="sl-close">Закрыть</button></div>';
    box.firstChild.textContent = label || '🔗 Ссылка';
    const inp = box.querySelector('input');
    inp.value = url;
    box.querySelector('.sl-copy').onclick = function() {
        inp.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (e) {}
        box.querySelector('.sl-copy').textContent = ok ? '✓ Скопировано' : 'Выделено — Ctrl+C';
    };
    box.querySelector('.sl-close').onclick = function() { box.remove(); };
    document.body.appendChild(box);
    inp.focus();
    inp.select();
    return box;
}
