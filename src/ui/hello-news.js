/**
 * «Привет, Имя!» — окно после заставки: новости игры и «что ждёт тебя сегодня».
 * Новое (чего игрок ещё не видел) — сверху, золотом и с меткой «НОВОЕ»; виденное — ниже, свёрнутой строкой.
 * Показывается, когда есть непрочитанные новости или раз в день (первый заход). profile.news = { seen: [id], day: 'ГГГГ-ММ-ДД' }.
 * Новость добавить — строка в NEWS (id — уникальный, навсегда). Логика показа — чистая (с тестами).
 */
export const NEWS = [
    { id: 'testdrive-v1', icon: '🎟', title: 'Тест-драйвы за задания', text: 'Пройди 2 главы, 3 волны или 4 000 м — и прокатись один заезд на машине или мотоцикле, которых у тебя нет. Понравится — скидка на финише.', act: 'td', btn: 'Какие задания?' },
    { id: 'chest-tuning-v1', icon: '🛠', title: 'Тюнинг в сундуках', text: 'В сундуке дня теперь бывают детали и уровни прокачки твоей машины. В 7-й день — всегда!', act: 'chest', btn: 'К сундуку' },
    { id: 'secret-paints-v1', icon: '🌈', title: 'Секретные краски', text: 'Светящийся неон, переливающаяся радуга и ещё одна — за заезды несколько дней подряд. В гараже их не купить.', act: 'garage', btn: 'В гараж' },
    { id: 'engine-v1', icon: '🔊', title: 'Моторы зазвучали', text: 'У каждой машины свой мотор: слышно обороты и переключения, большие — басят, мопед — трещит.' },
    { id: 'gift-cars-v1', icon: '🎁', title: 'Машины в подарок', text: '«Трайк» — за 7 дней подряд, «Призрачный патруль» — королю недели. Не купить — только заслужить.', act: 'gift', btn: 'Смотреть' }
];

function state(p) {
    const n = p.news = Object.assign({ seen: [], day: null }, p.news);
    if (!Array.isArray(n.seen)) n.seen = [];
    return n;
}

/** Непрочитанные новости */
export function unseenNews(profile) {
    const s = state(profile).seen;
    return NEWS.filter(function(x) { return s.indexOf(x.id) < 0; });
}

/** Автотесты отключают окно этим ключом (его проверяет свой тест) */
export const HELLO_SKIP_KEY = 'road_racing_hello_skip';

/** Показать ли окно: есть новое или сегодня ещё не здоровались */
export function helloDue(profile, today, storage) {
    try { const st = storage || (typeof localStorage !== 'undefined' ? localStorage : null); if (st && st.getItem(HELLO_SKIP_KEY)) return false; } catch (e) {}
    return unseenNews(profile).length > 0 || state(profile).day !== today;
}

/** Отметить: всё прочитано, сегодня поздоровались */
export function markHello(profile, today) {
    const n = state(profile);
    NEWS.forEach(function(x) { if (n.seen.indexOf(x.id) < 0) n.seen.push(x.id); });
    n.day = today;
}

/** Для старых игроков: что уже видели раньше (плашка «машины в подарок» — до этого окна) */
export function markSeen(profile, id) {
    const n = state(profile);
    if (n.seen.indexOf(id) < 0) n.seen.push(id);
}

const esc = function(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

function greet(h) { return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Привет' : 'Добрый вечер'; }

/**
 * o — { profile, today, hour, today: [{ icon, text, act? }] — «сегодня для тебя», onAct(act), onClose() }
 * Возвращает элемент окна.
 */
export function showHello(o) {
    document.querySelectorAll('.hello-modal').forEach(function(n) { n.remove(); });
    const fresh = unseenNews(o.profile), old = NEWS.filter(function(x) { return fresh.indexOf(x) < 0; });
    const item = function(x, isNew) {
        return '<div class="hn-item' + (isNew ? ' new' : '') + '"><i>' + x.icon + '</i><div><b>' + esc(x.title) + (isNew ? '<em>НОВОЕ</em>' : '') + '</b><span>' + esc(x.text) + '</span></div>'
            + (x.act && x.btn && isNew ? '<button type="button" class="hn-act" data-act="' + x.act + '">' + esc(x.btn) + ' →</button>' : '') + '</div>';
    };
    const m = document.createElement('div');
    m.className = 'hello-modal';
    m.innerHTML = '<div class="hello-card" role="dialog" aria-label="Новости">'
        + '<div class="hn-hi">' + greet(o.hour) + ', <b>' + esc(o.profile.name || 'гонщик') + '</b>! 👋</div>'
        + '<div class="hn-sub">' + (fresh.length ? 'Пока тебя не было, в игре появилось новое:' : 'Рады видеть снова! Вот что ждёт тебя сегодня:') + '</div>'
        + '<div class="hn-scroll">' + (fresh.length ? '<div class="hn-list">' + fresh.map(function(x) { return item(x, true); }).join('') + '</div>' : '')
        + (o.forYou && o.forYou.length ? '<div class="hn-today"><div class="hn-th">⭐ Сегодня для тебя</div>' + o.forYou.map(function(t) {
            return '<button type="button" class="hn-row"' + (t.act ? ' data-act="' + t.act + '"' : '') + '><i>' + t.icon + '</i><span>' + esc(t.text) + '</span>' + (t.act ? '<em>›</em>' : '') + '</button>';
        }).join('') + '</div>' : '')
        + (old.length ? '<details class="hn-old"><summary>Ранее в игре · ' + old.length + '</summary>' + old.map(function(x) { return item(x, false); }).join('') + '</details>' : '')
        + '</div><button type="button" class="hn-go">🏁 Поехали!</button></div>';
    document.body.appendChild(m);
    markHello(o.profile, o.today);
    const close = function() { m.remove(); if (o.onClose) o.onClose(); };
    m.querySelector('.hn-go').onclick = close;
    m.addEventListener('click', function(e) { if (e.target === m) close(); });
    m.querySelectorAll('[data-act]').forEach(function(b) { b.onclick = function() { const a = b.dataset.act; m.remove(); if (o.onClose) o.onClose(); if (o.onAct) o.onAct(a); }; });
    return m;
}
