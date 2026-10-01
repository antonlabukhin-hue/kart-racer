/**
 * Подарок в гараже: краска или деталь за главу кампании (src/profile.js grantChapterReward) сияет золотом,
 * пока её не тронешь; с итогов главы кнопка «Смотреть в гараже» открывает гараж с поздравительной плашкой.
 * profile.carLoadout.newGifts — ['paint:purple', 'part:rims'] — ещё не тронутые подарки.
 */
export function giftKey(kind, id) { return kind + ':' + id; }

/** Новый подарок (при выдаче) */
export function addNewGift(lo, kind, id) {
    if (!lo) return;
    if (!Array.isArray(lo.newGifts)) lo.newGifts = [];
    const k = giftKey(kind, id);
    if (lo.newGifts.indexOf(k) < 0) lo.newGifts.push(k);
}

/** Подарок тронули (покрасил, поставил деталь) — больше не сияет. true — был новым */
export function seenGift(lo, kind, id) {
    if (!lo || !Array.isArray(lo.newGifts)) return false;
    const i = lo.newGifts.indexOf(giftKey(kind, id));
    if (i < 0) return false;
    lo.newGifts.splice(i, 1);
    return true;
}

/** Подсветить в панели гаража кружки красок и строки деталей, которые ещё не тронуты */
export function markGiftGlow(box, lo) {
    if (!box || !lo || !Array.isArray(lo.newGifts)) return;
    lo.newGifts.forEach(function(k) {
        const kind = k.split(':')[0], id = k.slice(kind.length + 1);
        const el = box.querySelector(kind === 'paint' ? '.color-swatch[data-paint="' + id + '"]' : '.part-row[data-part="' + id + '"]');
        if (el) el.classList.add('gift-glow');
    });
}

/** Поздравительная плашка в гараже. gift — { paint | part }, info — { name, color? } */
export function showGiftPlaque(gift, info) {
    document.querySelectorAll('.gift-modal').forEach(function(n) { n.remove(); });
    const isPaint = !!gift.paint;
    const m = document.createElement('div');
    m.className = 'gift-modal';
    const swatch = isPaint && info.color != null ? '<span class="gm-swatch" style="background:#' + (info.color >>> 0).toString(16).padStart(6, '0') + '"></span>' : '<span class="gm-icon">🛠</span>';
    m.innerHTML = '<div class="gift-card" role="dialog" aria-label="Подарок">'
        + '<div class="gm-title">🎁 ПОДАРОК ЗА ГЛАВУ!</div>'
        + '<div class="gm-item">' + swatch + '<b></b></div>'
        + '<div class="gm-sub"></div>'
        + '<button type="button" class="gm-ok">Отлично!</button></div>';
    m.querySelector('.gm-item b').textContent = (isPaint ? 'Краска «' : 'Деталь «') + info.name + '»';
    m.querySelector('.gm-sub').textContent = isPaint
        ? (gift.equip ? 'Уже на твоей машине. Сияющий кружок — она же: красить можно любую машину.' : 'Она уже твоя, бесплатно. Нажми на сияющий золотом кружок — и машина перекрасится.')
        : 'Она уже твоя, бесплатно. Нажми на сияющую золотом строку — и деталь встанет на машину.';
    document.body.appendChild(m);
    const close = function() { m.remove(); };
    m.querySelector('.gm-ok').onclick = close;
    m.addEventListener('click', function(e) { if (e.target === m) close(); });
    return m;
}

/** Подарок, с которым открываем гараж (кнопка на итогах главы): поставить — и взять один раз при открытии гаража */
let pending = null;
export function setPendingGift(g) { pending = g || null; }
export function peekPendingGift() { return pending; }
export function takePendingGift() { const g = pending; pending = null; return g; }
