/**
 * «Фото на память»: игра сама снимает лучший момент заезда (проезд под поездом, встреча со сценкой, таран
 * в «В УДАРЕ», большой прыжок) и на финише показывает его поляроидом с подписью и датой — сохранить или поделиться.
 * request(caption, score) — во время update; afterRender(canvas) — сразу после renderer.render (кадр WebGL читается
 * только в том же кадре). Лучший — по score; не чаще раза в 1.5 с. Подпись и раскладка — чистые (с тестами).
 */
export const PHOTO_W = 540, PHOTO_H = 640, SHOT = 492;

/** Дата для подписи: 12.10.2026 */
export function photoDate(d) {
    const p = function(n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear();
}
/** Кадр из холста w×h: квадрат по центру, чуть ниже середины (машина — внизу кадра) */
export function cropRect(w, h) {
    const s = Math.min(w, h), x = (w - s) / 2, y = Math.min(h - s, Math.max(0, (h - s) * 0.62));
    return { x: Math.round(x), y: Math.round(y), s: Math.round(s) };
}

export function createPhotoBook(now) {
    const clock = now || function() { return performance.now(); };
    let pending = null, best = null, lastShot = -1e9;
    return {
        /** Хочется снять: caption — подпись, score — насколько момент крутой */
        request: function(caption, score) {
            if (best && score <= best.score) return;
            if (pending && score <= pending.score) return;
            pending = { caption: caption, score: score };
        },
        afterRender: function(canvas) {
            if (!pending || typeof document === 'undefined') return;
            const t = clock();
            if (t - lastShot < 1500) return;
            const p = pending; pending = null; lastShot = t;
            try {
                const out = document.createElement('canvas'); out.width = PHOTO_W; out.height = PHOTO_H;
                const c = out.getContext('2d');
                c.fillStyle = '#f7f4ec'; c.fillRect(0, 0, PHOTO_W, PHOTO_H);
                const r = cropRect(canvas.width, canvas.height), m = (PHOTO_W - SHOT) / 2;
                c.drawImage(canvas, r.x, r.y, r.s, r.s, m, m, SHOT, SHOT);
                c.fillStyle = 'rgba(255,170,60,0.08)'; c.fillRect(m, m, SHOT, SHOT); // тёплый «плёночный» тон
                c.fillStyle = '#2a2a3a'; c.textAlign = 'center';
                c.font = 'italic 700 30px "Comic Sans MS","Segoe Print",cursive';
                c.fillText(p.caption, PHOTO_W / 2, m + SHOT + 52, PHOTO_W - 40);
                c.font = '600 18px "Courier New",monospace'; c.fillStyle = '#c85a2a';
                c.fillText('Дорожный прорыв · ' + photoDate(new Date()), PHOTO_W / 2, m + SHOT + 86);
                best = { caption: p.caption, score: p.score, url: out.toDataURL('image/jpeg', 0.86) };
            } catch (e) { /* холст без доступа — без фото */ }
        },
        get best() { return best; },
        reset: function() { pending = null; best = null; }
    };
}

/** Карточка на финише */
export function photoHtml(ph) {
    if (!ph || !ph.url) return '';
    return '<div class="fin-photo"><img src="' + ph.url + '" alt="Фото на память"><button type="button" class="fin-photo-share">📸 Сохранить фото</button></div>';
}
/** Кнопка: поделиться файлом (телефон) или скачать */
export function bindPhoto(root, ph) {
    const b = root && root.querySelector('.fin-photo-share');
    if (!b || !ph) return;
    b.onclick = function(e) {
        e.stopPropagation();
        const name = 'dorozhny-proryv-' + photoDate(new Date()).replace(/\./g, '-') + '.jpg';
        fetch(ph.url).then(function(r) { return r.blob(); }).then(function(blob) {
            const file = typeof File !== 'undefined' ? new File([blob], name, { type: 'image/jpeg' }) : null;
            if (file && navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file], title: 'Дорожный прорыв', text: ph.caption });
            const a = document.createElement('a'); a.href = ph.url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        }).catch(function() {});
    };
}
