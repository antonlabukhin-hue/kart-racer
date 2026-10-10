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
export const PORTRAIT_RIG = { dist: 5.2, height: 3.0, lookY: -0.15, lookZoff: -15 }; // взгляд ниже — машина на 5% выше от нижнего края (замер: низ машины 0.88 → 0.83 высоты) // машина у низа экрана (~¾ высоты), как боком
/** Вертикально: камера почти не отстаёт на скорости (боком на телефоне 0.3) и угол на нитро растёт втрое меньше — машина держится у низа экрана */
export const PORTRAIT_FOLLOW = 0.4; // (не используется для вида сзади вертикально — там PORTRAIT_BOOST_LAG)
export const PORTRAIT_FOV_K = 0.6;

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
        return { dist: o.dist - spdK * 0.2, height: o.height - spdK * 0.15, lookY: o.lookY + ((typeof window !== 'undefined' && window.__lookShift) || 0), lookZoff: o.lookZoff };
    }
    const L = (typeof window !== 'undefined' && window.__lookShift) || 0; // подбор кадра на скриншотах
    if (view === 'mobile') return { dist: 5.0 - spdK * 0.3, height: 2.2 - spdK * 0.15, lookY: 0.3 + L, lookZoff: -11 }; // боком — машина на 5% выше (0.87 → 0.82)
    return { dist: 6.8 - spdK * 0.6, height: 2.7 - spdK * 0.15, lookY: -0.15 + L, lookZoff: -5.8 };
}

/**
 * «Долли-зум»: угол обзора на скорости шире — камера во столько же раз ближе к машине.
 * Машина остаётся того же размера и на том же месте в кадре, а мир по краям «летит».
 * Возвращает множитель расстояния камеры (1 — угол базовый, <1 — шире, камера ближе).
 */
export function dollyK(baseFov, fov) {
    if (!(baseFov > 0) || !(fov > 0)) return 1;
    return Math.tan(baseFov * rad / 2) / Math.tan(fov * rad / 2);
}

/**
 * «Долли» полное: камера, точка взгляда и постоянное отставание масштабируются вокруг машины вместе —
 * направление взгляда то же, машина в кадре на месте (замер: сдвиг на нитро ≤2% экрана вертикально, ≤4% боком).
 */
export const DOLLY_POW = 1;
export const DOLLY_LOOK = 1;

/** Отставание камеры вдоль дороги — постоянное, как на базовой скорости: нитро, «В УДАРЕ» и рост скорости машину не отодвигают */
export function chaseLag(maxSpeed, follow) {
    return follow > 0 ? maxSpeed * (1 - follow) / follow : 0;
}
