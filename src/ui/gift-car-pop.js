/**
 * Плашки «машины в подарок» в главном меню (src/gift-cars.js):
 *   showGiftCarsIntro — один раз после обновления: какие машины и за что дарят;
 *   showGiftCarPop — «🎁 Тебе подарок — машина «…»!» с кнопкой «Смотреть» (витрина на этой машине).
 * Показываются, когда в меню нет другой плашки (сундук дня, новинки) — по очереди, а не стопкой.
 */
import { GIFT_CARS, GIFT_DUP_VHS } from '../gift-cars.js';

export const GIFT_INTRO_KEY = 'road_racing_gift_cars_intro_v1';
const BUSY = '.chest-modal,.newcars-modal,.gift-modal,.giftcar-modal,.ach-plaque,.meet-modal,.hello-modal,.td-modal';

/** Запустить fn, когда главное меню на экране и в нём нет другой плашки (проверка раз в 0.7 с, до ~40 с; не дождались — giveUp) */
export function whenMenuFree(fn, giveUp) {
    let n = 0;
    const t = setInterval(function() {
        const mm = document.getElementById('main-menu-screen');
        const menuOn = mm && mm.style.display !== 'none' && mm.getClientRects().length;
        if (++n > 60) { clearInterval(t); if (giveUp) giveUp(); return; }
        if (!menuOn || document.querySelector(BUSY)) return;
        clearInterval(t);
        fn();
    }, 700);
    return t;
}

export function introSeen(storage) {
    try { return !!(storage || localStorage).getItem(GIFT_INTRO_KEY); } catch (e) { return true; }
}

function modal(html, cls) {
    const m = document.createElement('div');
    m.className = 'giftcar-modal';
    m.innerHTML = '<div class="giftcar-card ' + (cls || '') + '" role="dialog">' + html + '</div>';
    document.body.appendChild(m);
    return m;
}

export function showGiftCarsIntro(o) {
    if (document.querySelector('.giftcar-modal')) return null;
    const names = o.names || {};
    const m = modal('<div class="nc-burst">🎁 НОВОЕ 🎁</div>'
        + '<div class="nc-title">Машины в подарок!</div>'
        + '<div class="nc-sub">Не за «Е» — за постоянство. В витрине их не купить.</div>'
        + '<div class="gc-list">' + Object.keys(GIFT_CARS).map(function(id) {
            const g = GIFT_CARS[id];
            return '<div><i>' + g.icon + '</i><b>«' + (names[id] || id) + '»</b><span>' + g.how + '</span></div>';
        }).join('') + '</div>'
        + '<button type="button" class="nc-go">🚗 Посмотреть машины</button><button type="button" class="nc-later">Понятно</button>');
    const close = function() { try { localStorage.setItem(GIFT_INTRO_KEY, '1'); } catch (e) {} m.remove(); };
    m.querySelector('.nc-later').onclick = close;
    m.querySelector('.nc-go').onclick = function() { close(); if (o.onOpen) o.onOpen(Object.keys(GIFT_CARS)[0]); };
    return m;
}

/** gift — { car, reason, dup }; name — имя машины */
export function showGiftCarPop(gift, o) {
    const g = GIFT_CARS[gift.car] || {};
    const m = modal('<div class="nc-burst">' + (g.icon || '🎁') + ' ' + (g.title || 'ПОДАРОК').toUpperCase() + ' ' + (g.icon || '🎁') + '</div>'
        + '<div class="nc-title">🎁 Тебе подарок!</div>'
        + '<div class="gc-car">Машина «' + o.name + '»</div>'
        + '<div class="nc-sub">' + (gift.dup ? 'Она у тебя уже есть — держи ' + GIFT_DUP_VHS + ' 📼 видеокассет!' : 'Уже в гараже — поехали на ней!') + '</div>'
        + '<button type="button" class="nc-go">🚗 Смотреть</button><button type="button" class="nc-later">Позже</button>', 'is-gift');
    const close = function() { m.remove(); if (o.onClose) o.onClose(); };
    m.querySelector('.nc-later').onclick = close;
    m.querySelector('.nc-go').onclick = function() { close(); if (o.onOpen) o.onOpen(gift.car); };
    return m;
}
