/**
 * Высокая подвеска машины игрока: в заезде кузов приподнят над колёсами (видны амортизаторы и пружины) —
 * машина как будто «на пружинах», поэтому может прыгать и приседать. Подныр опускает кузов к колёсам —
 * машина становится обычной высоты, а не сплющенной.
 * liftCar(car) — колёса (userData.isWheel) остаются на месте, всё остальное (кроме тени) переезжает в группу кузова.
 * Машина без колёс-ступиц (ковёр-самолёт и т. п.) — подныр по-старому, сжатием (fallback: true).
 */
import * as THREE from 'three';

export const LIFT = 0.17;      // подъём кузова в единицах модели (машина в заезде уменьшена ×0.62)
export const SQUAT = 0.03;     // в подныре кузов ещё чуть ниже обычного — «присел»

/** Высота кузова: k — доля подныра 0..1 */
export function bodyY(k) { return LIFT - (LIFT + SQUAT) * Math.max(0, Math.min(1, k)); }

let springMat = null, shockMat = null;
function mats() {
    if (!springMat) {
        springMat = new THREE.MeshStandardMaterial({ color: 0xe8281e, roughness: 0.35, metalness: 0.4 });
        shockMat = new THREE.MeshStandardMaterial({ color: 0xe4e8ee, roughness: 0.22, metalness: 0.5 });
    }
}

export function liftCar(car, wheelR) {
    const wheels = car.children.filter(function(c) { return c.userData && c.userData.isWheel; });
    if (wheels.length < 2) return { fallback: true, setDuck: function() {} };
    mats();
    const body = new THREE.Group();
    body.name = 'suspensionBody';
    car.children.slice().forEach(function(c) {
        if (c.userData && (c.userData.isWheel || c.userData.blob)) return;
        car.remove(c); body.add(c);
    });
    car.add(body);
    // у каждого колеса — амортизатор (хром) и пружина (красные витки): от ступицы до кузова
    const struts = wheels.map(function(w) {
        const g = new THREE.Group();
        const inward = -Math.sign(w.position.x || 1) * 0.2; // внутри колеса — видно сзади и в просвет
        g.position.set(w.position.x + inward, w.position.y, w.position.z);
        const shock = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), shockMat); shock.position.y = 0.5; g.add(shock);
        for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 12), springMat); t.rotation.x = Math.PI / 2; t.position.y = 0.12 + i * 0.18; g.add(t); }
        car.add(g);
        return g;
    });
    const r = wheelR || 0.24;
    const strutLen = function(y) { return Math.max(0.05, r * 0.35 + y + 0.12); }; // от оси колеса до днища кузова
    const set = function(k) {
        const y = bodyY(k);
        body.position.y = y;
        const L = strutLen(y);
        struts.forEach(function(s) { s.scale.y = L; });
    };
    set(0);
    return { fallback: false, body: body, setDuck: set };
}
