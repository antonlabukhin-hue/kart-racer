/**
 * Заезд вертикально — как в Subway Surfers: телефон не нужно поворачивать.
 * На узком экране три полосы должны помещаться по ширине, поэтому держим постоянным горизонтальный
 * угол обзора (вертикальный считается из пропорций экрана), а камеру ставим выше и дальше —
 * машина внизу экрана, дорога впереди видна далеко.
 */
export const PORTRAIT_HFOV = 50;   // градусов по горизонтали в вертикальном экране
export const MAX_PORTRAIT_FOV = 82; // вертикальный угол — не шире, иначе края «рыбьим глазом»

const rad = Math.PI / 180;

/** Камера вертикально: ниже крыши тоннеля (4,6 м), смотрит вперёд — машина у нижнего края, как в горизонтальном режиме */
export const PORTRAIT_RIG = { dist: 5.2, height: 3.0, lookY: 1.2, lookZoff: -15 }; // машина у низа экрана (~¾ высоты), как боком
/** Вертикально: камера почти не отстаёт на скорости (боком на телефоне 0.3) и угол на нитро растёт втрое меньше — машина держится у низа экрана */
export const PORTRAIT_FOLLOW = 0.4; // (не используется для вида сзади вертикально — там PORTRAIT_BOOST_LAG)
export const PORTRAIT_FOV_K = 0.6;
export const PORTRAIT_BOOST_LAG = 14; // на скорости выше обычной (нитро, «В УДАРЕ») камера отстаёт — машина немного уезжает вперёд

/** Вертикальный угол камеры: экран боком — как был (base), вертикально — из горизонтального PORTRAIT_HFOV */
export function fovFor(aspect, base) {
    if (!(aspect > 0) || aspect >= 1) return base;
    const v = 2 * Math.atan(Math.tan(PORTRAIT_HFOV * rad / 2) / aspect) / rad;
    return Math.max(base, Math.min(MAX_PORTRAIT_FOV, v));
}

/** Камера «сзади»: где стоит и куда смотрит. view — 'portrait' | 'mobile' | 'desktop', spdK — 0..1 доля скорости */
export function chaseRig(view, spdK) {
    if (view === 'portrait') {
        const o = (typeof window !== 'undefined' && window.__portraitRig) || PORTRAIT_RIG; // __portraitRig — подбор вида на скриншотах
        return { dist: o.dist - spdK * 0.2, height: o.height - spdK * 0.15, lookY: o.lookY, lookZoff: o.lookZoff };
    }
    if (view === 'mobile') return { dist: 5.0 - spdK * 0.3, height: 2.2 - spdK * 0.15, lookY: 1.15, lookZoff: -11 };
    return { dist: 6.8 - spdK * 0.6, height: 2.7 - spdK * 0.15, lookY: 0.7, lookZoff: -5.8 };
}
