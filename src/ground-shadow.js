/**
 * Мягкая тень-пятно под машиной: на телефоне настоящие тени выключены (renderer.shadowMap),
 * а без тени машины «висят» над асфальтом. Одна текстура и одна геометрия на всех — дёшево.
 */
import * as THREE from 'three';

/** Размер пятна по габаритам машины: чуть шире и длиннее кузова */
export function blobSize(w, l) {
    return { w: w * 1.45, l: l * 1.25 };
}

let tex = null, geo = null, mat = null;
function texture() {
    if (tex) return tex;
    const cv = document.createElement('canvas');
    cv.width = 64; cv.height = 128;
    const ctx = cv.getContext('2d');
    // вытянутое пятно: плотная середина, мягкий край
    ctx.translate(32, 64); ctx.scale(1, 2);
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 31);
    g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.6, 'rgba(0,0,0,0.62)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-32, -32, 64, 64);
    tex = new THREE.CanvasTexture(cv);
    tex.userData.keep = true; // общая — не освобождать вместе с машиной (src/inf-world.js disposeTree)
    return tex;
}

/** Пятно под объектом obj; w, l — ширина и длина машины, y — высота земли в координатах obj */
export function addBlobShadow(obj, w, l, y) {
    if (!geo) { geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2); geo.userData.keep = true; }
    const s = blobSize(w, l);
    if (!mat) mat = new THREE.MeshBasicMaterial({ map: texture(), transparent: true, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(s.w, 1, s.l);
    m.position.y = y == null ? 0.02 : y;
    m.position.z = l * 0.12; // чуть позади: камера сзади — пятно выглядывает из-под бампера
    m.renderOrder = -1; // под колёсами, раньше прочих прозрачных
    m.userData.blob = true;
    obj.add(m);
    return m;
}
