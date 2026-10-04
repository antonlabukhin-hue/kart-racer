/**
 * Главное меню по образцу мобильных гонок: одна крупная «Поехали», три режима,
 * снизу вкладки «Гараж / Сезон / Трофеи» со счётчиками, профиль и настройки — в верхней строке.
 * Разметка — в index.html (#main-menu-screen), здесь — заполнение и поведение.
 * Зависимости передаются явно (без window.*).
 */
import { seasonBadge, unclaimedRewards, affordableUpgrades, badgeText } from './menu-badges.js';
import { rankLabel, rankOf } from '../ranks.js';
import { CHESTS } from '../streak.js';
import { lootChance } from '../chest-loot.js';
import { scoreMult } from '../missions.js';
import { weekTheme } from '../infinite.js';
import { renderAvatars, openProfileScreen } from './profile-screen.js';

let chestAutoShown = null; // сундук дня предлагаем сам один раз за день

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setBadge(sel, n) {
    // id или .класс (у вкладок сезона счётчики стоят на обоих экранах)
    const list = sel.charAt(0) === '.' ? document.querySelectorAll(sel) : [document.getElementById(sel)];
    list.forEach(function(el) {
        if (!el) return;
        el.textContent = badgeText(n);
        el.hidden = !(n > 0);
    });
}

/**
 * Обновить меню по профилю.
 * d: { player, rewards, campaignDone, campaignTotal, upgradeLevels, upgrades, costOf, maxLevel, carName }
 */
export function refreshMainMenu(d) {
    const p = d.player;
    if (!p) return;
    const se = p.season || {};
    setText('mm-name', p.name);
    { // уровень и звание игрока (src/ranks.js); уровень сезона — в «Сезоне». Звание — отдельным кусочком: на узком экране прячется
        const lvEl = document.getElementById('mm-level'), lab = String(rankLabel(p.totalXp)), cut = lab.indexOf(' · ');
        if (lvEl) { lvEl.textContent = ''; const a = document.createElement('span'); a.textContent = cut > 0 ? lab.slice(0, cut) : lab; lvEl.appendChild(a);
            if (cut > 0) { const b = document.createElement('span'); b.className = 'mm-rk'; b.textContent = lab.slice(cut); lvEl.appendChild(b); } }
    }
    setText('mm-chips', String(se.chips || 0));
    setText('mm-vhs', String(se.vhs || 0));
    renderAvatars(p); // аватарка в кружке у настроек и в плашке профиля
    // событие недели — на карточке бесконечной трассы (src/infinite.js weekTheme)
    { const n = document.querySelector('.menu-infinite .mm-note'); if (n) n.textContent = '×2 Е · ' + weekTheme().short; }
    setText('mm-note-campaign', d.campaignDone + ' из ' + d.campaignTotal);
    const ups = affordableUpgrades(d.upgradeLevels, se.chips, d.upgrades, d.costOf, d.maxLevel);
    setBadge('mm-badge-garage', ups);
    setBadge('garage-up-badge', ups);
    const upTab = document.querySelector('.garage-tab[data-gtab="upgrades"]');
    if (upTab) upTab.classList.toggle('has-new', ups > 0);
    setBadge('mm-badge-season', seasonBadge(p, d.rewards));
    setBadge('.sb-rewards', unclaimedRewards(p, d.rewards));
    setBadge('.sb-events', p.daily && p.daily.done ? 0 : 1);
    const st = p.stats || {};
    setText('mm-pop-name', p.name);
    const rk = rankOf(p.totalXp);
    setText('mm-pop-stats', 'Звание: ' + rk.rank.icon + ' ' + rk.rank.name + (rk.next ? ' · до «' + rk.next.name + '» ' + Math.max(0, rk.next.xp - (p.totalXp || 0)) + ' XP' : '') + ' · сезон 1, ур. ' + (se.level || 1) + ' · побед ' + (st.wins || 0) + ' из ' + (st.totalRaces || 0) + ' · машина: ' + d.carName);
    renderMissions(d.missions, scoreMult(p));
    // серия дней: огонёк с числом; сундук дня не забран — «!» и предложение при первом заходе за день
    const sb = document.getElementById('mm-streak');
    if (sb && p.streak) {
        sb.hidden = false;
        setText('mm-streak-n', String(p.streak.count));
        sb.classList.toggle('ready', !!d.canClaimChest);
        setBadge('mm-badge-chest', d.canClaimChest ? 1 : 0);
        const mm = document.getElementById('main-menu-screen');
        if (d.canClaimChest && p.streak.count >= 2 && !d.holdChest && chestAutoShown !== p.streak.last && d.chest && mm && mm.classList.contains("active")) { // новичка в первый день не перебиваем; окно «Привет» — первым, сундук — после него
            chestAutoShown = p.streak.last;
            showChest(p, d.chest);
        }
    }
}

/** Три задания — всегда на виду в меню: текст, прогресс «2/4», полоска и награда */
function renderMissions(rows, mult) {
    const box = document.getElementById('mm-missions');
    if (!box || !rows) return;
    box.innerHTML = '<div class="mmm-head">📋 Задания <small>в любом режиме, считаются после заезда · 3 = +1 к множителю</small><b class="mmm-mult" title="Множитель очков бесконечной трассы">×' + (mult || 1) + '</b></div>' + rows.map(function(r) {
        const pct = Math.round(r.progress / r.target * 100);
        return '<div class="mmm-row"><span class="mmm-text"></span><b>' + r.progress + '/' + r.target + '</b><em>+' + r.reward + ' Е</em>'
            + '<i class="mmm-bar"><u style="width:' + pct + '%"></u></i></div>';
    }).join('');
    box.querySelectorAll('.mmm-text').forEach(function(el, i) { el.textContent = rows[i].text; });
}

/**
 * Сундук дня: семь дней серии, сегодняшний подсвечен; «Забрать» начисляет награду.
 * c: { claim() → { chips, vhs, day } | null, after() — обновить меню }
 */
export function showChest(p, c) {
    document.querySelectorAll('.chest-modal').forEach(function(n) { n.remove(); });
    const day = ((Math.max(1, p.streak.count) - 1) % CHESTS.length) + 1;
    const claimed = p.streak.claimed === p.streak.last;
    const m = document.createElement('div');
    m.className = 'chest-modal';
    m.innerHTML = '<div class="chest-card" role="dialog" aria-label="Сундук дня">'
        + '<div class="ch-title">🔥 Серия: ' + p.streak.count + ' ' + dayWord(p.streak.count) + ' подряд</div>'
        + '<div class="ch-sub">Заходи каждый день — сундук богаче, 7-й — большой. Пропуск — серия заново.</div>'
        + '<div class="ch-loot">🛠 Иногда внутри — <b>деталь тюнинга</b> или <b>уровень прокачки</b>! В 7-й день — всегда.</div>'
        + (p.giftCars && p.giftCars.got && p.giftCars.got.trike ? '' : '<div class="ch-gift">🎁 7 дней подряд — машина «Трайк» в подарок!</div>' /* src/gift-cars.js */)
        + '<div class="ch-days">' + CHESTS.map(function(x, i) {
            const n = i + 1;
            return '<div class="ch-day' + (n < day ? ' past' : n === day ? ' today' + (claimed ? ' opened' : '') : '') + '"><small>день ' + n + '</small><i>' + (n === 7 ? '🎁' : '📦') + '</i>'
                + '<span>Е ' + x.chips + (x.vhs ? '<br>📼' + x.vhs : '') + (n === 7 ? '<br>🛠 тюнинг' : lootChance(n) >= 0.35 ? '<br>🛠?' : '') + '</span></div>';
        }).join('') + '</div>'
        + (claimed ? '<div class="ch-got">Сегодня уже забран — приходи завтра</div>' : '<button type="button" class="ch-claim">Забрать сундук</button>')
        + '<button type="button" class="ch-later">' + (claimed ? 'Понятно' : 'Позже') + '</button></div>';
    document.body.appendChild(m);
    const close = function() { m.remove(); if (c.after) c.after(); };
    m.querySelector('.ch-later').onclick = close;
    m.addEventListener('click', function(e) { if (e.target === m) close(); });
    const cl = m.querySelector('.ch-claim');
    if (cl) cl.onclick = function() {
        const got = c.claim();
        if (!got) { close(); return; }
        cl.outerHTML = '<div class="ch-got">+' + got.chips + ' Е' + (got.vhs ? ' · +' + got.vhs + ' 📼 кассета!' : '') + '</div>'
            + (got.lootText ? '<div class="ch-tune"></div>' : '');
        const tune = m.querySelector('.ch-tune'); if (tune) tune.textContent = got.lootText;
        const ok = m.querySelector('.ch-later'); ok.textContent = 'Отлично!'; ok.classList.add('ch-ok');
        m.querySelector('.ch-day.today').classList.add('opened');
    };
}

function dayWord(n) {
    const a = n % 10, b = n % 100;
    return a === 1 && b !== 11 ? 'день' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'дня' : 'дней';
}

/**
 * Поведение меню. d: { openRewards(), openEvents(), sound() }
 * Карточка профиля открывается по имени в верхней строке и закрывается кликом мимо.
 */
export function wireMainMenu(d) {
    // одна кнопка профиля слева (аватарка + уровень) — экран профиля (src/ui/profile-screen.js);
    // там же «Сменить профиль» и «Установить на телефон» (кнопки из прежней выпадашки — скрыты, но их обработчики живы)
    const btn = document.getElementById('mm-profile');
    if (btn) btn.addEventListener('click', function() {
        const out = document.getElementById('main-menu-logout'), inst = document.getElementById('mm-install');
        openProfileScreen({ player: d.player(), save: d.save, carTotal: d.carTotal || 0, cloud: !!d.cloud,
            logout: out ? function() { out.click(); } : null, install: inst && !inst.hidden ? function() { inst.click(); } : null });
    });
    // «Сезон» — два экрана под одной вкладкой: переключатель сверху у обоих
    document.querySelectorAll('.season-tab[data-stab]').forEach(function(t) {
        t.addEventListener('click', function() {
            if (t.classList.contains('active')) return;
            if (d.sound) d.sound();
            const scr = t.closest('#rewards-screen, #events-screen');
            if (scr) { scr.classList.remove('active'); scr.style.display = 'none'; }
            if (t.dataset.stab === 'events') d.openEvents(); else d.openRewards();
        });
    });
    // огонёк серии — открыть сундук дня (или посмотреть серию, если сегодня уже забран)
    const sb = document.getElementById('mm-streak');
    if (sb && d.chest) sb.addEventListener('click', function() { const p = d.player(); if (p && p.streak) showChest(p, d.chest); });
}
