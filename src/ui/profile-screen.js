/**
 * Профиль игрока: круглая кнопка с аватаркой рядом с настройками → экран с аватаркой (загрузить фото),
 * званием, прогрессом и кодом облачного сохранения. Аватарка — маленький JPEG (128×128) в профиле:
 * сохраняется вместе с ним и уходит в облако. Зависимости — явно (без window.*).
 */
import { rankLabel } from '../ranks.js';
import { getCode } from '../cloud-save.js';
import { BADGES } from '../badges.js';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/** Содержимое кружка: фото или первая буква имени */
export function avatarHtml(p) {
    if (p && typeof p.avatar === 'string' && p.avatar.indexOf('data:image/') === 0) return '<img alt="" src="' + p.avatar + '">';
    const ch = p && p.name ? p.name.trim().charAt(0).toUpperCase() : '👤';
    return '<span>' + esc(ch || '👤') + '</span>';
}
export function renderAvatars(p) {
    document.querySelectorAll('.js-avatar').forEach(function(el) { el.innerHTML = avatarHtml(p); });
}

/** Картинка → квадрат size×size по центру, JPEG dataURL (маленький — для профиля и облака) */
export function shrinkImage(file, size) {
    return new Promise(function(resolve, reject) {
        const url = URL.createObjectURL(file), img = new Image();
        img.onload = function() {
            const cv = document.createElement('canvas'); cv.width = cv.height = size;
            const g = cv.getContext('2d'), s = Math.min(img.width, img.height);
            g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
            URL.revokeObjectURL(url);
            resolve(cv.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('img')); };
        img.src = url;
    });
}

/** Сводка прогресса для экрана профиля */
export function profileStats(p, carTotal) {
    const st = p.stats || {}, se = p.season || {}, inf = p.infinite || {};
    const badges = p.badges && p.badges.got ? Object.keys(p.badges.got).length : 0;
    return [
        ['🏁', 'Заездов', st.totalRaces || 0], ['🏆', 'Побед', st.wins || 0],
        ['🛣', 'Рекорд дальности', (inf.best || 0).toLocaleString('ru-RU') + ' м'], ['Е', 'Железных «Е»', se.chips || 0],
        ['📼', 'Кассет', se.vhs || 0], ['🚗', 'Машин', (p.unlockedCars || []).length + ' / ' + carTotal],
        ['🎖', 'Значков 90-х', badges + ' / ' + BADGES.length], ['📝', 'Серия «Слова дня»', (p.wordDay && p.wordDay.streak) || 0]
    ];
}

/** d: { player, save(), carTotal, cloud, logout(), install() } — две последние кнопки показываются, если переданы */
export function openProfileScreen(d) {
    const p = d.player;
    if (!p || document.querySelector('.pf-modal')) return;
    const m = document.createElement('div');
    m.className = 'pf-modal';
    const render = function() {
        m.innerHTML = '<div class="pf-card" role="dialog" aria-label="Профиль">'
            + '<button type="button" class="pf-ava js-avatar" title="Загрузить аватарку">' + avatarHtml(p) + '</button>'
            + '<div class="pf-ava-hint">' + (p.avatar ? 'Нажми на фото, чтобы сменить' : '📷 Нажми, чтобы загрузить аватарку') + '</div>'
            + '<div class="pf-name">' + esc(p.name) + '</div><div class="pf-rank">' + esc(rankLabel(p.totalXp || 0)) + ' · сезон 1, ур. ' + ((p.season && p.season.level) || 1) + '</div>'
            + '<div class="pf-grid">' + profileStats(p, d.carTotal || 0).map(function(r) { return '<span><i>' + r[0] + '</i><b>' + esc(r[2]) + '</b><small>' + r[1] + '</small></span>'; }).join('') + '</div>'
            + (d.cloud ? '<div class="pf-cloud">☁ Код сохранения: <b>' + getCode() + '</b><small>Вход с другого браузера или телефона: Настройки → «Загрузить» по коду</small></div>' : '')
            + (p.avatar ? '<button type="button" class="pf-del">Убрать аватарку</button>' : '')
            + (d.install ? '<button type="button" class="pf-btn pf-install">📲 Установить на телефон</button>' : '')
            + (d.logout ? '<button type="button" class="pf-btn pf-logout">Сменить профиль</button>' : '')
            + '<button type="button" class="pf-close">Закрыть</button>'
            + '<input type="file" accept="image/*" class="pf-file" hidden></div>';
        const file = m.querySelector('.pf-file');
        m.querySelector('.pf-ava').onclick = function() { file.click(); };
        file.onchange = function() {
            const f = file.files && file.files[0];
            if (!f) return;
            shrinkImage(f, 128).then(function(url) { p.avatar = url; if (d.save) d.save(); render(); renderAvatars(p); }).catch(function() {});
        };
        const del = m.querySelector('.pf-del');
        if (del) del.onclick = function() { delete p.avatar; if (d.save) d.save(); render(); renderAvatars(p); };
        m.querySelector('.pf-close').onclick = function() { m.remove(); };
        const inst = m.querySelector('.pf-install'), out = m.querySelector('.pf-logout');
        if (inst) inst.onclick = function() { m.remove(); d.install(); };
        if (out) out.onclick = function() { m.remove(); d.logout(); };
    };
    render();
    m.addEventListener('click', function(e) { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
    return m;
}
