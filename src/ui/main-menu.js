/**
 * Главное меню по образцу мобильных гонок: одна крупная «Поехали», три режима,
 * снизу вкладки «Гараж / Сезон / Трофеи» со счётчиками, профиль и настройки — в верхней строке.
 * Разметка — в index.html (#main-menu-screen), здесь — заполнение и поведение.
 * Зависимости передаются явно (без window.*).
 */
import { seasonBadge, unclaimedRewards, affordableUpgrades, badgeText } from './menu-badges.js';

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
    setText('mm-level', 'ур. ' + (se.level || 1));
    setText('mm-chips', String(se.chips || 0));
    setText('mm-gum', String(se.gum || 0));
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
    setText('mm-pop-stats', 'Сезон 1, ур. ' + (se.level || 1) + ' · побед ' + (st.wins || 0) + ' из ' + (st.totalRaces || 0) + ' · машина: ' + d.carName);
}

/**
 * Поведение меню. d: { openRewards(), openEvents(), sound() }
 * Карточка профиля открывается по имени в верхней строке и закрывается кликом мимо.
 */
export function wireMainMenu(d) {
    const btn = document.getElementById('mm-profile');
    const pop = document.getElementById('mm-profile-pop');
    if (btn && pop) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            pop.hidden = !pop.hidden;
            btn.setAttribute('aria-expanded', String(!pop.hidden));
        });
        pop.addEventListener('click', function(e) { if (e.target.closest('button')) pop.hidden = true; }); // «Сменить профиль» — и карточка закрыта
        document.addEventListener('click', function(e) {
            if (!pop.hidden && !pop.contains(e.target)) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
        });
    }
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
}
