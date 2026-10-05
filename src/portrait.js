/**
 * Заезд вертикально — как в Subway Surfers: телефон не нужно поворачивать.
 * На узком экране три полосы должны помещаться по ширине, поэтому держим постоянным горизонтальный
 * угол обзора (вертикальный считается из пропорций экрана), а камеру ставим выше и дальше —
 * машина внизу экрана, дорога впереди видна далеко.
 */
export const PORTRAIT_HFOV = 50;   // градусов по горизонтали в вертикальном экране
export const MAX_PORTRAIT_FOV = 82; // вертикальный угол — не шире, иначе края «рыбьим глазом»

const rad = Math.PI / 180;

/** Вертикальный угол камеры: экран боком — как был (base), вертикально — из горизонтального PORTRAIT_HFOV */
export function fovFor(aspect, base) {
    if (!(aspect > 0) || aspect >= 1) return base;
    const v = 2 * Math.atan(Math.tan(PORTRAIT_HFOV * rad / 2) / aspect) / rad;
    return Math.max(base, Math.min(MAX_PORTRAIT_FOV, v));
}

/** Камера «сзади»: где стоит и куда смотрит. view — 'portrait' | 'mobile' | 'desktop', spdK — 0..1 доля скорости */
export function chaseRig(view, spdK) {
    if (view === 'portrait') return { dist: 4.2 - spdK * 0.2, height: 5.0 - spdK * 0.2, lookY: 0, lookZoff: -6 }; // круто сверху: горизонт у верха экрана, машина внизу (~¾ высоты)
    if (view === 'mobile') return { dist: 5.0 - spdK * 0.3, height: 2.2 - spdK * 0.15, lookY: 1.15, lookZoff: -11 };
    return { dist: 6.8 - spdK * 0.6, height: 2.7 - spdK * 0.15, lookY: 0.7, lookZoff: -5.8 };
}
