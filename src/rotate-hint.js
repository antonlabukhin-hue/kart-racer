/**
 * Подсказка «телефон можно повернуть»: заезд идёт и вертикально, и боком — об этом не догадаться самому.
 * Показывается на телефоне сразу после «GO!» первых HINT_RACES заездов (через ~2 с, чтобы не сливаться с отсчётом),
 * текст — под текущее положение телефона. Повернул хоть раз посреди заезда — значит, знает: больше не показываем.
 */
export const HINT_KEY = 'road_racing_rotate_hint';
export const HINT_RACES = 3;

export function rotateHintText(portrait) {
    return portrait ? '📱 Можно повернуть телефон боком — заезд продолжится' : '📱 Можно держать телефон вертикально — заезд продолжится';
}

/** Сколько раз уже показали; 'done' — игрок сам повернул телефон */
function load(storage) { try { return storage.getItem(HINT_KEY) || '0'; } catch (e) { return 'done'; } }

/** Показать ли подсказку сейчас (и засчитать показ) */
export function takeRotateHint(storage) {
    const v = load(storage);
    if (v === 'done' || +v >= HINT_RACES) return false;
    try { storage.setItem(HINT_KEY, String(+v + 1)); } catch (e) {}
    return true;
}

/** Игрок повернул телефон посреди заезда — подсказка больше не нужна */
export function rotatedOnce(storage) {
    try { storage.setItem(HINT_KEY, 'done'); } catch (e) {}
}
