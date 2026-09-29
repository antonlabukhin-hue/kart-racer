/**
 * Установка игры на телефон «как приложение» (иконка на рабочем столе, запуск на весь экран, работа без сети).
 * Android/Chrome/Edge: ловим beforeinstallprompt и показываем свою кнопку. iPhone/iPad (Safari): системной кнопки
 * нет — показываем подсказку «Поделиться → На экран «Домой»». Уже установлено — кнопки нет.
 */
let deferred = null;

export function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
        || (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches)
        || window.navigator.standalone === true;
}

export function isIOS() {
    const ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Регистрация service worker (только сайт, не тестовая сборка и не автотесты) */
export function registerSW(isTestBuild) {
    if (isTestBuild || navigator.webdriver || !('serviceWorker' in navigator)) return;
    window.addEventListener('load', function() { navigator.serviceWorker.register('./sw.js').catch(function() {}); });
}

/** Кнопка «📲 Установить на телефон»: btn — элемент, notify(title, text) — показать подсказку */
export function wireInstall(btn, notify) {
    if (!btn) return;
    const show = function(on) { btn.hidden = !on; };
    show(false);
    if (isStandalone()) return;
    window.addEventListener('beforeinstallprompt', function(e) { e.preventDefault(); deferred = e; show(true); });
    window.addEventListener('appinstalled', function() { deferred = null; show(false); });
    if (isIOS()) show(true);
    btn.addEventListener('click', function() {
        if (deferred) {
            deferred.prompt();
            deferred.userChoice.finally(function() { deferred = null; show(false); });
        } else if (isIOS()) {
            notify('📲 Установить на iPhone', 'В Safari нажми «Поделиться» (квадрат со стрелкой) → «На экран «Домой»». Если открыто из Telegram — сначала «Открыть в Safari».');
        }
    });
}
