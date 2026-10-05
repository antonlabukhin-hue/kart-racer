/**
 * Детализация машин «из кино» и фантазийных — как у первых машин (src/cars.js): номерные знаки спереди и сзади,
 * зеркала на стойках, швы дверей и ручки, дворники; боковые стёкла — тонкие, заподлицо с кабиной, с чёрным уплотнителем
 * (раньше стекло было одной плитой сквозь кабину: торчало из кузова, а после покраски с одной стороны пропадало).
 * Номера вымышленные: в каждом есть буква, которой на настоящих номерах не бывает (Ж, Ш, Я, Л…).
 */
import * as THREE from 'three';

const plateCache = {};
function plateMat(text) {
    if (plateCache[text]) return plateCache[text];
    let mat;
    if (typeof document === 'undefined') mat = new THREE.MeshBasicMaterial({ color: 0xf4f4f0 });
    else {
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 56; const cx = cv.getContext('2d');
        cx.fillStyle = '#f4f4f0'; cx.fillRect(0, 0, 256, 56);
        cx.strokeStyle = '#111'; cx.lineWidth = 4; cx.strokeRect(2, 2, 252, 52);
        cx.fillStyle = '#111'; cx.font = 'bold 36px Arial, sans-serif'; cx.textBaseline = 'middle'; cx.fillText(text, 12, 30);
        cx.fillRect(196, 4, 2, 48); cx.font = 'bold 22px Arial, sans-serif'; cx.fillText('25', 210, 22);
        cx.fillStyle = '#fff'; cx.fillRect(210, 36, 14, 5); cx.fillStyle = '#1a3aa8'; cx.fillRect(210, 41, 14, 5); cx.fillStyle = '#d01818'; cx.fillRect(210, 46, 14, 5);
        const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace; t.userData.keep = true;
        mat = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide });
    }
    plateCache[text] = mat;
    return mat;
}

/** Точки профиля [[z, y]] стянуть к центру (стекло внутри уплотнителя) */
function shrink(pts, k) {
    let cz = 0, cy = 0; pts.forEach(function(p) { cz += p[0]; cy += p[1]; }); cz /= pts.length; cy /= pts.length;
    return pts.map(function(p) { return [cz + (p[0] - cz) * k, cy + (p[1] - cy) * k]; });
}

/** Боковые окна заподлицо с кабиной шириной cabW: уплотнитель и стекло с каждой стороны отдельно */
export function sideWindows(k, m, pts, cabW) {
    [-1, 1].forEach(function(s) {
        k.profile(m.matte, pts, 0.006, s * (cabW / 2 + 0.001), 0);
        k.profile(m.glass, shrink(pts, 0.9), 0.006, s * (cabW / 2 + 0.004), 0);
    });
}

/**
 * Детали по машине: W — ширина кузова; mirror [z, y, x]; doors [[z, yTop]] — швы; handle [z, y];
 * plateF / plateR [y, z]; wiper [z, y, halfLen]; plate — текст номера
 */
export const DETAILS = {
    thief: { W: 1.28, mirror: [-0.12, 0.66, 0.58], doors: [[-0.16, 0.6], [0.78, 0.62]], handle: [0.62, 0.52], plateF: [0.24, -1.29], plateR: [0.36, 1.28], wiper: [-0.17, 0.645, 0.3], plate: 'Ж 196 УГ' },
    neon: { W: 1.3, mirror: [-0.1, 0.64, 0.58], doors: [[-0.12, 0.58], [0.74, 0.6]], handle: [0.58, 0.5], plateF: [0.25, -1.21], plateR: [0.42, 1.19], wiper: [-0.13, 0.62, 0.3], plate: 'Н 777 ЕЛ' },
    bull: { W: 1.44, mirror: [-0.3, 0.6, 0.56], doors: [[-0.34, 0.54], [0.62, 0.58]], handle: [0.5, 0.5], plateF: [0.28, -1.23], plateR: [0.36, 1.22], wiper: [-0.38, 0.575, 0.3], plate: 'Б 001 ЫК' },
    avenger: { W: 1.36, plateR: [0.25, 1.53], plate: 'М 013 ЩЬ' },
    ghostcar: { W: 1.42, mirror: [-0.24, 0.76, 0.71], doors: [[-0.3, 0.66], [0.5, 0.68], [1.3, 0.7]], handle: [0.38, 0.62], plateF: [0.24, -1.725], plateR: [0.42, 1.635], wiper: [-0.28, 0.69, 0.4], plate: 'П 103 ЯЯ' },
    timecar: { W: 1.3, mirror: [-0.3, 0.66, 0.6], doors: [[-0.36, 0.58], [0.62, 0.64]], handle: [0.5, 0.56], plateF: [0.3, -1.26], wiper: [-0.34, 0.625, 0.3], plate: 'В 088 ЖЙ' }
};

export function applyDetails(k, m, group, carId) {
    const d = DETAILS[carId];
    if (!d) return;
    const seam = m.matte, hw = d.W / 2;
    const plate = function(y, z, back) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.092), plateMat(d.plate));
        p.position.set(0, y, z + (back ? 0.07 : -0.07)); if (!back) p.rotation.y = Math.PI; // за скругление кузова (bevel до 0.05)
        p.userData.plate = true; group.add(p); // меш номера — для именного номера (src/name-plate.js)
        k.box(m.black, 0.44, 0.11, 0.02, 0, y, z + (back ? 0.045 : -0.045));   // рамка
    };
    if (d.plateF) plate(d.plateF[0], d.plateF[1], false);
    if (d.plateR) plate(d.plateR[0], d.plateR[1], true);
    if (d.mirror) [-1, 1].forEach(function(s) {
        const z = d.mirror[0], y = d.mirror[1], x = d.mirror[2];
        k.box(m.black, 0.14, 0.025, 0.04, s * (x + 0.05), y, z + 0.02);                    // кронштейн
        k.box(m.body, 0.07, 0.07, 0.11, s * (x + 0.13), y + 0.03, z, 0, { bodyPaint: true }); // корпус в цвет кузова
        k.box(m.chrome, 0.06, 0.055, 0.008, s * (x + 0.13), y + 0.03, z + 0.058);           // зеркальце
    });
    if (d.doors) [-1, 1].forEach(function(s) {
        d.doors.forEach(function(dz) { k.box(seam, 0.004, dz[1] - 0.28, 0.012, s * (hw + 0.002), 0.28 + (dz[1] - 0.28) / 2, dz[0]); });
        if (d.handle) k.box(m.chrome, 0.012, 0.025, 0.11, s * (hw + 0.006), d.handle[1], d.handle[0]);
    });
    if (d.wiper) [-1, 1].forEach(function(s) {
        k.rod(m.black, 0.008, [s * 0.02, d.wiper[1], d.wiper[0]], [s * d.wiper[2], d.wiper[1] + 0.02, d.wiper[0] - 0.02]);
    });
}
