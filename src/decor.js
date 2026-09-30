/**
 * Декор обочин (вынесено из main.js): руины, деревья, заводы, трубы, свалки, щиты, заборы, кусты, шины…
 * Каждая функция возвращает готовую группу — в сцену её добавляет вызывающий (кампания, бесконечная трасса).
 * decorFor(style, r) — какой строитель по стилю участка (arsenev / industrial / junk / forest) и случайному r.
 */
import * as THREE from 'three';

export function createDeadTree(x, z, scale = 1) {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1a, roughness: 0.95 });
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05 * scale, 0.1 * scale, 0.9 * scale, 5),
        trunkMat
    );
    trunk.position.y = 0.45 * scale;
    trunk.castShadow = true;
    group.add(trunk);
    // Сломанные ветки
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
        const branch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02 * scale, 0.03 * scale, 0.35 * scale, 4),
            trunkMat
        );
        branch.position.set(
            (Math.random() - 0.5) * 0.3 * scale,
            0.5 * scale + Math.random() * 0.3 * scale,
            (Math.random() - 0.5) * 0.2 * scale
        );
        branch.rotation.z = (Math.random() - 0.5) * 1.2;
        branch.rotation.x = (Math.random() - 0.5) * 0.8;
        branch.castShadow = true;
        group.add(branch);
    }
    group.position.set(x, 0, z);
    return group;
}

export function createRuinedBuilding(x, z, scale = 1) {
    const group = new THREE.Group();
    const concrete = new THREE.MeshStandardMaterial({ color: 0x6a655c, roughness: 0.9, metalness: 0.05 });
    const darkConcrete = new THREE.MeshStandardMaterial({ color: 0x4a453c, roughness: 0.95 });
    const rust = new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 0.7, metalness: 0.3 });
    const rebar = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.8 });

    const w = (1.2 + Math.random() * 1.8) * scale;
    const d = (1.0 + Math.random() * 1.4) * scale;
    const h = (1.5 + Math.random() * 2.5) * scale;

    // Основной корпус (частично разрушен)
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.7, d), concrete);
    body.position.y = h * 0.35;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Верхние обломки / неровный верх
    const topChunks = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < topChunks; i++) {
        const cw = w * (0.2 + Math.random() * 0.4);
        const ch = h * (0.15 + Math.random() * 0.35);
        const cd = d * (0.2 + Math.random() * 0.4);
        const chunk = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, cd), Math.random() > 0.5 ? concrete : darkConcrete);
        chunk.position.set(
            (Math.random() - 0.5) * w * 0.6,
            h * 0.7 + ch * 0.4,
            (Math.random() - 0.5) * d * 0.6
        );
        chunk.rotation.y = Math.random() * 0.5;
        chunk.rotation.z = (Math.random() - 0.5) * 0.3;
        chunk.castShadow = true;
        group.add(chunk);
    }

    // Окна-дыры
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x1a1814, roughness: 1 });
    for (let i = 0; i < 2; i++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.25 * scale, 0.3 * scale, 0.08), windowMat);
        win.position.set(
            (i === 0 ? -1 : 1) * w * 0.25,
            h * 0.4 + Math.random() * 0.2,
            d * 0.5 + 0.01
        );
        group.add(win);
    }

    // Торчащая арматура
    for (let i = 0; i < 3; i++) {
        const bar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015 * scale, 0.015 * scale, 0.4 * scale + Math.random() * 0.3, 4),
            rebar
        );
        bar.position.set(
            (Math.random() - 0.5) * w * 0.7,
            h * 0.75 + 0.2,
            (Math.random() - 0.5) * d * 0.7
        );
        bar.rotation.x = (Math.random() - 0.5) * 0.6;
        bar.rotation.z = (Math.random() - 0.5) * 0.6;
        group.add(bar);
    }

    // Ржавые куски металла
    if (Math.random() > 0.4) {
        const plate = new THREE.Mesh(
            new THREE.BoxGeometry(0.4 * scale, 0.03, 0.5 * scale),
            rust
        );
        plate.position.set((Math.random() - 0.5) * w * 0.5, h * 0.55, d * 0.4);
        plate.rotation.z = (Math.random() - 0.5) * 0.4;
        group.add(plate);
    }

    // Обломки у основания
    for (let i = 0; i < 3; i++) {
        const rubble = new THREE.Mesh(
            new THREE.BoxGeometry(0.2 + Math.random() * 0.3, 0.1 + Math.random() * 0.15, 0.2 + Math.random() * 0.3),
            darkConcrete
        );
        rubble.position.set(
            (Math.random() - 0.5) * (w + 0.8),
            0.08,
            (Math.random() - 0.5) * (d + 0.8)
        );
        rubble.rotation.y = Math.random() * Math.PI;
        rubble.castShadow = true;
        group.add(rubble);
    }

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    return group;
}

export function createFactory(x, z, scale = 1) {
    const group = new THREE.Group();
    const concrete = new THREE.MeshStandardMaterial({ color: 0x5a5854, roughness: 0.9 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x6a5040, roughness: 0.5, metalness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a3834, roughness: 0.95 });
    // Корпус
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2*scale, 2.4*scale, 1.6*scale), concrete);
    body.position.y = 1.2*scale;
    body.castShadow = true;
    group.add(body);
    // Труба
    const chimney = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25*scale, 0.3*scale, 3.5*scale, 8),
        metal
    );
    chimney.position.set(0.6*scale, 2.8*scale, 0);
    chimney.castShadow = true;
    group.add(chimney);
    // Дым-шар (статичный намёк)
    const smoke = new THREE.Mesh(
        new THREE.SphereGeometry(0.45*scale, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.35 })
    );
    smoke.position.set(0.6*scale, 4.8*scale, 0);
    group.add(smoke);
    // Пристройка
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.2*scale, 1.2*scale, 1.2*scale), dark);
    wing.position.set(-1.2*scale, 0.6*scale, 0);
    group.add(wing);
    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * 0.5;
    return group;
}

export function createPipeStack(x, z, scale = 1) {
    const group = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.45, metalness: 0.7 });
    for (let i = 0; i < 3; i++) {
        const pipe = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12*scale, 0.12*scale, 1.5*scale + Math.random(), 6),
            metal
        );
        pipe.position.set((i-1)*0.35*scale, 0.8*scale, 0);
        pipe.rotation.z = (Math.random()-0.5)*0.4;
        pipe.castShadow = true;
        group.add(pipe);
    }
    // Горизонтальная труба
    const hpipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1*scale, 0.1*scale, 2*scale, 6),
        metal
    );
    hpipe.rotation.z = Math.PI/2;
    hpipe.position.set(0, 1.4*scale, 0);
    group.add(hpipe);
    group.position.set(x, 0, z);
    return group;
}

export function createScrapPile(x, z, scale = 1) {
    const group = new THREE.Group();
    const colors = [0x5a554c, 0x6a4a2a, 0x444444, 0x3a5030, 0x8a5a2a];
    for (let i = 0; i < 6 + Math.floor(Math.random()*4); i++) {
        const mat = new THREE.MeshStandardMaterial({
            color: colors[Math.floor(Math.random()*colors.length)],
            roughness: 0.7 + Math.random()*0.3,
            metalness: Math.random()*0.5
        });
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(
                0.3*scale + Math.random()*0.8*scale,
                0.2*scale + Math.random()*0.5*scale,
                0.3*scale + Math.random()*0.8*scale
            ),
            mat
        );
        mesh.position.set(
            (Math.random()-0.5)*1.8*scale,
            0.15*scale + Math.random()*0.8*scale,
            (Math.random()-0.5)*1.8*scale
        );
        mesh.rotation.set(Math.random(), Math.random(), Math.random());
        mesh.castShadow = true;
        group.add(mesh);
    }
    group.position.set(x, 0, z);
    return group;
}

export function createWreckCar(x, z, scale = 1) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.8, metalness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6*scale, 0.45*scale, 0.9*scale), bodyMat);
    body.position.y = 0.35*scale;
    body.rotation.z = (Math.random()-0.5)*0.4;
    body.rotation.y = Math.random()*Math.PI;
    body.castShadow = true;
    group.add(body);
    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.7*scale, 0.35*scale, 0.8*scale),
        new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.9 })
    );
    cabin.position.set(0.2*scale, 0.65*scale, 0);
    group.add(cabin);
    group.position.set(x, 0, z);
    return group;
}

export function createBillboard(x, z, scale = 1) {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06*scale, 0.08*scale, 2.2*scale, 6),
        new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.5 })
    );
    pole.position.y = 1.1*scale;
    group.add(pole);
    const board = new THREE.Mesh(
        new THREE.BoxGeometry(1.8*scale, 1.0*scale, 0.08*scale),
        new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 })
    );
    board.position.y = 2.3*scale;
    board.rotation.z = (Math.random()-0.5)*0.2;
    group.add(board);
    group.position.set(x, 0, z);
    return group;
}

export function createCinemaBanner(x, z, text) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 3.2, 6),
        new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.5 })
    );
    pole.position.y = 1.6; pole.castShadow = true; g.add(pole);
    const board = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.2, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x1a1020, roughness: 0.7 })
    );
    board.position.y = 2.8; board.castShadow = true; g.add(board);
    // canvas text
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 64;
    const cx = cv.getContext('2d');
    cx.fillStyle = '#1a1020'; cx.fillRect(0,0,128,64);
    cx.fillStyle = '#ff2244'; cx.fillRect(4,4,120,56);
    cx.fillStyle = '#1a1020'; cx.fillRect(7,7,114,50);
    cx.fillStyle = '#ffdd44'; cx.font = 'bold 14px Arial';
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(text, 64, 32);
    const tex = new THREE.CanvasTexture(cv);
    if (window.optimizeTexture) window.optimizeTexture(tex, { mipmaps: false, nearest: false, anisotropy: 1 });
    const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 1.05),
        new THREE.MeshBasicMaterial({ map: tex })
    );
    sign.position.set(0, 2.8, 0.06); g.add(sign);
    g.position.set(x, 0, z);
    g.rotation.y = (x > 0 ? -0.3 : 0.3);
    return g;
}

export function createCrateStack(x, z, scale = 1) {
    const group = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a40, roughness: 0.85 });
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.5*scale, 0.4*scale, 0.5*scale), wood);
        c.position.set((Math.random()-0.5)*0.3, 0.2*scale + i*0.42*scale, (Math.random()-0.5)*0.2);
        c.rotation.y = Math.random() * 0.4;
        c.castShadow = true;
        group.add(c);
    }
    group.position.set(x, 0, z);
    return group;
}

export function createFence(x, z, scale = 1) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x5a5a55, metalness: 0.4, roughness: 0.6 });
    for (let i = 0; i < 4; i++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08*scale, 0.9*scale, 0.08*scale), mat);
        post.position.set(0, 0.45*scale, (i-1.5)*0.55*scale);
        group.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06*scale, 0.06*scale, 2.2*scale), mat);
    rail.position.set(0, 0.55*scale, 0);
    group.add(rail);
    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI;
    return group;
}

export function createBush(x, z, scale = 1) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a6a30, roughness: 0.95 });
    for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.35*scale, 8, 6), mat);
        b.position.set((Math.random()-0.5)*0.4, 0.25*scale, (Math.random()-0.5)*0.4);
        b.scale.set(1, 0.7 + Math.random()*0.3, 1);
        group.add(b);
    }
    group.position.set(x, 0, z);
    return group;
}

export function createTireStack(x, z, scale = 1) {
    const group = new THREE.Group();
    const rubber = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(0.28*scale, 0.1*scale, 6, 12), rubber);
        t.rotation.x = Math.PI / 2;
        t.position.y = 0.12*scale + i * 0.2*scale;
        group.add(t);
    }
    group.position.set(x, 0, z);
    return group;
}

export function createRoadBarrier(x, z, scale = 1) {
    const group = new THREE.Group();
    const conc = new THREE.MeshStandardMaterial({ color: 0x8a8880, roughness: 0.9 });
    const stripe = new THREE.MeshStandardMaterial({ color: 0xc04020, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2*scale, 0.55*scale, 0.4*scale), conc);
    body.position.y = 0.28*scale;
    group.add(body);
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.15*scale, 0.12*scale, 0.42*scale), stripe);
    s.position.y = 0.4*scale;
    group.add(s);
    group.position.set(x, 0, z);
    group.rotation.y = (Math.random()-0.5)*0.3;
    return group;
}

export function createSatelliteDish(x, z, scale = 1) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x9a9aa0, metalness: 0.6, roughness: 0.4 });
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05*scale, 0.08*scale, 0.8*scale, 6), mat);
    stand.position.y = 0.4*scale;
    group.add(stand);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.35*scale, 10, 8, 0, Math.PI), mat);
    dish.position.set(0, 0.85*scale, 0.1*scale);
    dish.rotation.x = -0.6;
    group.add(dish);
    group.position.set(x, 0, z);
    return group;
}

/** Строитель декора по стилю участка: как в кампании (доли те же). forest — null для rock/log (они в src/biomes.js) */
export function decorFor(style, r) {
    if (style === 'industrial') {
        if (r < 0.28) return createFactory; if (r < 0.48) return createPipeStack; if (r < 0.62) return function(x, z, s) { return createRuinedBuilding(x, z, s * 0.8); };
        if (r < 0.74) return createCrateStack; if (r < 0.84) return createRoadBarrier; if (r < 0.92) return createFence; return createDeadTree;
    }
    if (style === 'junk') {
        if (r < 0.25) return createScrapPile; if (r < 0.42) return createWreckCar; if (r < 0.55) return createBillboard;
        if (r < 0.68) return createTireStack; if (r < 0.78) return createCrateStack; if (r < 0.88) return createSatelliteDish;
        return function(x, z, s) { return createDeadTree(x, z, s * 0.9); };
    }
    if (style === 'forest') return r < 0.9 ? (r < 0.7 ? null : createBush) : createDeadTree;
    if (r < 0.28) return createRuinedBuilding; if (r < 0.42) return createDeadTree; if (r < 0.54) return createBush;
    if (r < 0.66) return function(x, z, s) { return createBillboard(x, z, s * 0.9); }; if (r < 0.76) return createFence;
    if (r < 0.86) return createRoadBarrier; if (r < 0.93) return createCrateStack; return createTireStack;
}
