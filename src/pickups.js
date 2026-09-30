/**
 * Меши подбираемых предметов обычных трасс: нитро-стрелки на асфальте и сердечко-жвачка (снимает аварию).
 * Позицию и учёт в игре ставит main.js.
 */
import * as THREE from 'three';

/** Три светящихся шеврона на асфальте (как boost pad) */
export function nitroArrowsMesh() {
    const group = new THREE.Group();
    const arrowMat = new THREE.MeshStandardMaterial({
        color: 0x22ff55,
        emissive: 0x11aa33,
        emissiveIntensity: 0.7,
        roughness: 0.4,
        metalness: 0.2
    });
    // Три шеврона на асфальте (как boost pad)
    for (let i = 0; i < 3; i++) {
        const shape = new THREE.Shape();
        // rotation.x = -90°: local +Y → world -Z (направление игрока)
        // остриё в +Y → смотрит вперёд по трассе
        shape.moveTo(0, 0.40);           // остриё вперёд
        shape.lineTo(0.30, -0.05);
        shape.lineTo(0.12, -0.05);
        shape.lineTo(0.12, -0.32);
        shape.lineTo(-0.12, -0.32);
        shape.lineTo(-0.12, -0.05);
        shape.lineTo(-0.30, -0.05);
        shape.closePath();
        const geo = new THREE.ShapeGeometry(shape);
        const mesh = new THREE.Mesh(geo, arrowMat);
        mesh.rotation.x = -Math.PI / 2;
        // ряд стрелок: первая ближе к игроку, дальше по -Z
        mesh.position.set(0, 0.04, -i * 0.55);
        group.add(mesh);
    }
    // Свечение полосы
    const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 2.0),
        new THREE.MeshBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(0, 0.025, -0.6);
    group.add(glow);

    return group;
}

/** Сердечко из двух сфер и конуса с подставкой-свечением */
export function heartGumMesh() {
    const group = new THREE.Group();
    // Сердечко из двух сфер + конус
    const heartMat = new THREE.MeshStandardMaterial({
        color: 0xff3399,
        emissive: 0xaa1166,
        emissiveIntensity: 0.45,
        roughness: 0.35,
        metalness: 0.15
    });
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), heartMat);
    s1.position.set(-0.1, 0.45, 0);
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), heartMat);
    s2.position.set(0.1, 0.45, 0);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.28, 8), heartMat);
    tip.position.set(0, 0.28, 0);
    tip.rotation.x = Math.PI;
    group.add(s1, s2, tip);
    // Подставка-свечение
    const glow = new THREE.Mesh(
        new THREE.CircleGeometry(0.35, 12),
        new THREE.MeshBasicMaterial({ color: 0xff66aa, transparent: true, opacity: 0.3 })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.03;
    group.add(glow);

    return group;
}
