/**
 * Именной номер: 14 дней подряд в игре — золотой номерной знак с твоим именем на всех твоих машинах (в гараже, витрине и на трассе).
 * profile.namePlate = { got: время, on: bool }. Логика — чистая; картинка номера — plateCanvas (в браузере).
 */
export const PLATE_DAYS = 14;

/** Заслужил ли (по серии дней) — выдаёт один раз. true — только что получил */
export function checkNamePlate(profile) {
    if (profile.namePlate && profile.namePlate.got) return false;
    if (!(profile.streak && profile.streak.count >= PLATE_DAYS)) return false;
    profile.namePlate = { got: Date.now(), on: true, fresh: true }; // fresh — ещё не поздравили (окно «Привет»)
    return true;
}

let texCache = null;
/** Повесить именной номер на модель машины (меши номеров помечены userData.plate в src/cars.js) */
export function applyNamePlate(group, name, THREE) {
    const t = plateText(name);
    if (!texCache || texCache.name !== t) { const tex = new THREE.CanvasTexture(plateCanvas(name)); tex.anisotropy = 4; texCache = { name: t, mat: new THREE.MeshBasicMaterial({ map: tex }) }; }
    group.traverse(function(o) { if (o.isMesh && o.userData && o.userData.plate) o.material = texCache.mat; });
}

export function namePlateOn(profile) { return !!(profile && profile.namePlate && profile.namePlate.got && profile.namePlate.on !== false); }

/** Текст номера: имя заглавными, до 8 символов */
export function plateText(name) {
    return String(name || 'ГОНЩИК').toUpperCase().replace(/\s+/g, ' ').trim().slice(0, 8);
}

/** Канвас золотого именного номера (256×56, как обычный) */
export function plateCanvas(name) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 56;
    const cx = cv.getContext('2d');
    const g = cx.createLinearGradient(0, 0, 0, 56); g.addColorStop(0, '#fff2a8'); g.addColorStop(0.5, '#f2c033'); g.addColorStop(1, '#b07a00');
    cx.fillStyle = g; cx.fillRect(0, 0, 256, 56);
    cx.strokeStyle = '#3a2400'; cx.lineWidth = 4; cx.strokeRect(2, 2, 252, 52);
    const t = plateText(name);
    cx.fillStyle = '#2a1800'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    let size = 36; cx.font = 'bold ' + size + 'px Arial, sans-serif';
    while (size > 18 && cx.measureText('★ ' + t + ' ★').width > 236) { size -= 2; cx.font = 'bold ' + size + 'px Arial, sans-serif'; }
    cx.fillText('★ ' + t + ' ★', 128, 30);
    return cv;
}
