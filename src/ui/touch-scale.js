/**
 * Сенсорные устройства: интерфейс заезда (кнопки, панель времени, спидометр, полоса босса) — от размера экрана,
 * а не от CSS-пикселей. На iPhone в режиме «на экран Домой» iOS бывает раскладывает страницу шире экрана
 * (≈1300 вместо 932) и уменьшает целиком — кнопки становились мелкими, а «телефонные» правила по высоте
 * экрана не срабатывали. Здесь:
 *  - html.touch-ui / html.touch-land — признак «сенсорный экран» (и альбомная ориентация) для CSS;
 *  - --ui-k — множитель размера: короткая сторона окна / 390 (iPhone), 0.85…1.7;
 *  - после поворота — заново выставляем meta viewport, чтобы iOS пересчитал масштаб;
 *  - раскладка шире экрана (окно больше физической ширины телефона) — прописываем в meta точную ширину экрана:
 *    иначе «телефонные» правила (меню во весь экран) не срабатывают и меню остаётся маленьким окном.
 */
export function uiScale(w, h) {
    const s = Math.min(w, h) / 390;
    return Math.max(0.85, Math.min(1.7, s));
}

/** Физическая ширина экрана в текущей ориентации, если окно разложено заметно шире неё (иначе 0) */
export function fixWidth(innerW, innerH, screenW, screenH) {
    if (!screenW || !screenH) return 0;
    const phys = innerW > innerH ? Math.max(screenW, screenH) : Math.min(screenW, screenH);
    return innerW > phys * 1.15 ? Math.round(phys) : 0;
}

export function isTouchDevice(win) {
    const w = win || window;
    try {
        return (w.matchMedia && w.matchMedia('(pointer: coarse)').matches) || (w.navigator.maxTouchPoints || 0) > 0;
    } catch (e) { return false; }
}

export function installTouchScale() {
    const root = document.documentElement;
    const vm = document.querySelector('meta[name="viewport"]');
    const base = vm ? vm.getAttribute('content') : '';
    const apply = function() {
        const touch = isTouchDevice();
        const w = window.innerWidth, h = window.innerHeight;
        root.classList.toggle('touch-ui', touch);
        root.classList.toggle('touch-land', touch && w > h);
        root.style.setProperty('--ui-k', touch ? uiScale(w, h).toFixed(3) : '1');
        const fw = touch ? fixWidth(w, h, window.screen && screen.width, window.screen && screen.height) : 0;
        const m = document.querySelector('meta[name="viewport"]');
        if (fw && m) m.setAttribute('content', base.replace('width=device-width', 'width=' + fw));
    };
    const refit = function() {
        // iOS: после поворота в режиме приложения масштаб страницы «застревает» — переустановка meta его сбрасывает
        const m = document.querySelector('meta[name="viewport"]');
        if (m) { m.setAttribute('content', base + ', width=device-width'); m.setAttribute('content', base); }
        apply();
        setTimeout(apply, 300);
    };
    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', refit);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', apply);
}
