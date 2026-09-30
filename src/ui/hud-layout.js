/**
 * Раскладка HUD заезда на телефоне: спидометр слева встаёт под панель времени, а не поверх неё
 * (в бесконечной трассе панель выше обычной: метры, «Е», пейзаж). Проверка раз в полсекунды — дёшево.
 */
export function belowTop(anchor, el, gap, viewH) {
    if (!anchor || !el || !anchor.height) return null;
    const overlap = el.left < anchor.right && el.right > anchor.left && el.top < anchor.bottom + gap && el.bottom > anchor.top;
    if (!overlap) return null;
    const top = Math.round(anchor.bottom + gap);
    return top + el.height <= viewH ? top : null;
}

export function installHudLayout() {
    let set = false;
    setInterval(function() {
        const sp = document.getElementById('hud-speedo'), hud = document.getElementById('game-hud');
        if (!sp) return;
        if (!document.body.classList.contains('race-mode') || !hud) { if (set) { sp.style.removeProperty('top'); set = false; } return; }
        if (set) sp.style.removeProperty('top');
        const top = belowTop(hud.getBoundingClientRect(), sp.getBoundingClientRect(), 6, window.innerHeight);
        if (top != null) { sp.style.setProperty('top', top + 'px', 'important'); set = true; } else set = false;
    }, 500);
}
