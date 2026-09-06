import * as THREE from 'three';

console.log('=== ТРАССА ВВЕРХ (ИСПРАВЛЕННАЯ И РАБОЧАЯ) ===');

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (для надежности)
// ============================================================
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

// ============================================================
// НАСТРОЙКИ
// ============================================================
const TRACK_LENGTH = 200;
const TRACK_WIDTH = 6;
const LANE_WIDTH = 1.5;
const LANES = [-2.25, -0.75, 0.75, 2.25];
const TOTAL_LANES = 4;

// ============================================================
// СОЗДАНИЕ HUD (если его нет на странице)
// ============================================================
function ensureHUD() {
    let hud = document.getElementById('game-hud');
    if (!hud) {
        hud = document.createElement('div');
        hud.id = 'game-hud';
        hud.style.position = 'absolute';
        hud.style.top = '20px';
        hud.style.left = '20px';
        hud.style.color = '#fff';
        hud.style.fontFamily = 'monospace';
        hud.style.fontSize = '20px';
        hud.style.fontWeight = 'bold';
        hud.style.textShadow = '2px 2px 0px #000, 0 0 10px rgba(0,0,0,0.8)';
        hud.style.pointerEvents = 'none';
        hud.style.background = 'rgba(0,0,0,0.5)';
        hud.style.padding = '15px 25px';
        hud.style.borderRadius = '10px';
        hud.style.border = '2px solid rgba(255,255,255,0.1)';
        hud.innerHTML = `
            <div>🏁 ПОЗИЦИЯ: <span id="positionDisplay" style="color:#ffdd00;">1 / 8</span></div>
            <div>⚡ СКОРОСТЬ: <span id="speedDisplay" style="color:#00ff88;">0</span> км/ч</div>
            <div>🔄 КРУГ: <span id="lapDisplay" style="color:#88ccff;">1 / 3</span></div>
        `;
        document.body.appendChild(hud);
    }
}
ensureHUD();

// ============================================================
// СЦЕНА
// ============================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2a3a);
scene.fog = new THREE.Fog(0x1a2a3a, 80, 200);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 12, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ============================================================
// ОСВЕЩЕНИЕ
// ============================================================
const ambient = new THREE.AmbientLight(0x444466, 0.6);
scene.add(ambient);

const light = new THREE.DirectionalLight(0xffeedd, 2);
light.position.set(20, 30, 10);
light.castShadow = true;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
light.shadow.camera.near = 0.1;
light.shadow.camera.far = 150;
light.shadow.camera.left = -30;
light.shadow.camera.right = 30;
light.shadow.camera.top = 30;
light.shadow.camera.bottom = -30;
scene.add(light);

const hemi = new THREE.HemisphereLight(0x88ccff, 0x334422, 0.5);
scene.add(hemi);

// ============================================================
// ЗЕМЛЯ
// ============================================================
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshStandardMaterial({ color: 0x2a4a2a, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
ground.receiveShadow = true;
scene.add(ground);

// ============================================================
// ТРАССА
// ============================================================
const trackGeo = new THREE.PlaneGeometry(TRACK_WIDTH, TRACK_LENGTH);
const trackMat = new THREE.MeshStandardMaterial({
    color: 0x33333c,
    roughness: 0.8,
    metalness: 0.1,
    side: THREE.DoubleSide
});
const track = new THREE.Mesh(trackGeo, trackMat);
track.rotation.x = -Math.PI / 2;
track.position.set(0, 0.01, 0);
track.receiveShadow = true;
scene.add(track);

// Разметка полос
for (let lane = 1; lane < TOTAL_LANES; lane++) {
    const xPos = -TRACK_WIDTH / 2 + lane * LANE_WIDTH;
    for (let i = -TRACK_LENGTH / 2 + 0.5; i < TRACK_LENGTH / 2 - 0.5; i += 1.8) {
        const strip = new THREE.Mesh(
            new THREE.PlaneGeometry(0.08, 0.6),
            new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide })
        );
        strip.rotation.x = -Math.PI / 2;
        strip.position.set(xPos, 0.02, i);
        scene.add(strip);
    }
}

// Бордюры
for (let i = -TRACK_LENGTH / 2; i <= TRACK_LENGTH / 2; i += 0.8) {
    for (const side of [-1, 1]) {
        const curb = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.06, 0.35),
            new THREE.MeshStandardMaterial({
                color: Math.floor(i * 2) % 2 === 0 ? 0xff2200 : 0xffffff,
                roughness: 0.5
            })
        );
        curb.position.set(side * (TRACK_WIDTH / 2 + 0.15), 0.03, i);
        scene.add(curb);
    }
}

// Старт (Z = TRACK_LENGTH/2 - 5)
const startLine = new THREE.Mesh(
    new THREE.PlaneGeometry(TRACK_WIDTH - 0.5, 0.4),
    new THREE.MeshStandardMaterial({
        color: 0xffdd00,
        emissive: 0xff8800,
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide
    })
);
startLine.rotation.x = -Math.PI / 2;
startLine.position.set(0, 0.02, TRACK_LENGTH / 2 - 5);
scene.add(startLine);

// Финиш (Z = -TRACK_LENGTH/2 + 5)
for (let i = -TRACK_WIDTH / 2 + 0.3; i < TRACK_WIDTH / 2 - 0.3; i += 0.35) {
    const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, 0.2),
        new THREE.MeshStandardMaterial({
            color: (Math.floor(i * 4) % 2 === 0) ? 0xffffff : 0x000000,
            side: THREE.DoubleSide
        })
    );
    flag.rotation.x = -Math.PI / 2;
    flag.position.set(i, 0.02, -TRACK_LENGTH / 2 + 5);
    scene.add(flag);
}

// ============================================================
// МАШИНКА
// ============================================================
function createCar(color = 0xff3333, isPlayer = false) {
    const car = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.6
    });
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.22, 1.5),
        bodyMat
    );
    body.position.y = 0.22;
    body.castShadow = true;
    car.add(body);

    const cabinMat = new THREE.MeshStandardMaterial({
        color: isPlayer ? 0x88ddff : 0x88ccff,
        roughness: 0.1,
        metalness: 0.2
    });
    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.18, 0.6),
        cabinMat
    );
    cabin.position.set(0, 0.4, 0.1);
    cabin.castShadow = true;
    car.add(cabin);

    const lightMat = new THREE.MeshStandardMaterial({
        color: 0xffff88,
        emissive: 0xffff44,
        emissiveIntensity: 0.8
    });
    const l1 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8), lightMat);
    l1.position.set(-0.25, 0.15, -0.75);
    car.add(l1);
    const l2 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8), lightMat);
    l2.position.set(0.25, 0.15, -0.75);
    car.add(l2);

    const rearMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    const r1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8), rearMat);
    r1.position.set(-0.25, 0.15, 0.75);
    car.add(r1);
    const r2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8), rearMat);
    r2.position.set(0.25, 0.15, 0.75);
    car.add(r2);

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const wheelGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.06, 8);
    const wPos = [
        [-0.4, 0.06, 0.55],
        [0.4, 0.06, 0.55],
        [-0.4, 0.06, -0.55],
        [0.4, 0.06, -0.55]
    ];
    wPos.forEach(p => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.x = Math.PI / 2;
        w.position.set(p[0], p[1], p[2]);
        w.castShadow = true;
        car.add(w);
    });

    const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    const spoiler = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.03, 0.12),
        spoilerMat
    );
    spoiler.position.set(0, 0.5, 0.78);
    car.add(spoiler);

    return car;
}

// ============================================================
// ИГРОК
// ============================================================
const playerCar = createCar(0xff0000, true);
let zPos = TRACK_LENGTH / 2 - 5;
let currentLane = 1;
let targetLane = 1;
playerCar.position.set(LANES[1], 0.1, zPos);
scene.add(playerCar);

// ============================================================
// СОПЕРНИКИ
// ============================================================
const opponentColors = [0xff8800, 0x0088ff, 0xff00ff, 0x00ff88, 0xffcc00, 0x00ffaa, 0xff66aa];
const opponents = [];
const NUM_OPPONENTS = 7;

for (let i = 0; i < NUM_OPPONENTS; i++) {
    const car = createCar(opponentColors[i % opponentColors.length]);
    const lane = i % TOTAL_LANES;
    const startZ = TRACK_LENGTH / 2 - 15 - (i * (TRACK_LENGTH / (NUM_OPPONENTS + 1)));
    car.position.set(LANES[lane], 0.1, startZ);
    scene.add(car);

    opponents.push({
        mesh: car,
        z: startZ,
        lane: lane,
        speed: 0.03 + Math.random() * 0.04,
        color: opponentColors[i % opponentColors.length]
    });
}

// ============================================================
// ДЕРЕВЬЯ
// ============================================================
for (let i = 0; i < 120; i++) {
    const z = -TRACK_LENGTH / 2 + Math.random() * TRACK_LENGTH;
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = side * (TRACK_WIDTH / 2 + 1.5 + Math.random() * 5);

    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.12, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x5a3d2b, roughness: 0.9 })
    );
    trunk.position.set(x, 0.25, z);
    trunk.castShadow = true;
    scene.add(trunk);

    const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.25 + Math.random() * 0.25, 6),
        new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.28 + Math.random() * 0.12, 0.6, 0.25 + Math.random() * 0.15),
            roughness: 0.8
        })
    );
    crown.position.set(x, 0.6 + Math.random() * 0.25, z);
    crown.castShadow = true;
    scene.add(crown);
}

// ============================================================
// УПРАВЛЕНИЕ (A - ВЛЕВО, D - ВПРАВО)
// ============================================================
const keys = { w: false, s: false };
let laneChangeCooldown = 0;

document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();

    if (k === 'w' || k === 'ц') { keys.w = true; e.preventDefault(); }
    if (k === 's' || k === 'ы') { keys.s = true; e.preventDefault(); }

    if ((k === 'a' || k === 'ф') && laneChangeCooldown <= 0) {
        if (targetLane > 0) {
            targetLane--;
            laneChangeCooldown = 0.2;
            console.log('◄ ВЛЕВО, полоса:', targetLane);
        }
        e.preventDefault();
    }
    if ((k === 'd' || k === 'в') && laneChangeCooldown <= 0) {
        if (targetLane < TOTAL_LANES - 1) {
            targetLane++;
            laneChangeCooldown = 0.2;
            console.log('► ВПРАВО, полоса:', targetLane);
        }
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'ц') { keys.w = false; e.preventDefault(); }
    if (k === 's' || k === 'ы') { keys.s = false; e.preventDefault(); }
});

console.log('Управление: W-газ, S-тормоз, A-ВЛЕВО, D-ВПРАВО');

// ============================================================
// ПЕРЕМЕННЫЕ
// ============================================================
let speed = 0;
let laps = 0;

const MAX_SPEED = 0.35;
const ACCEL = 0.008;
const BRAKE = 0.025;
const FRICTION = 0.005;
const LANE_CHANGE_SPEED = 4.0;

// ============================================================
// HUD
// ============================================================
const posEl = document.getElementById('positionDisplay');
const speedEl = document.getElementById('speedDisplay');
const lapEl = document.getElementById('lapDisplay');

function getPosition() {
    let pos = 1;
    opponents.forEach(opp => {
        // Кто впереди — у того меньше Z
        if (opp.z < zPos) pos++;
    });
    return pos;
}

// ============================================================
// ИГРОВОЙ ЦИКЛ
// ============================================================
function update(deltaTime) {
    if (laneChangeCooldown > 0) {
        laneChangeCooldown -= deltaTime;
    }

    // --- ГАЗ / ТОРМОЗ ---
    if (keys.w) {
        speed = Math.min(speed + ACCEL, MAX_SPEED);
    } else if (keys.s) {
        speed = Math.max(speed - BRAKE, -MAX_SPEED * 0.2);
    } else {
        if (speed > 0) speed = Math.max(speed - FRICTION, 0);
        else if (speed < 0) speed = Math.min(speed + FRICTION, 0);
    }

    // --- ПЕРЕСТРОЕНИЕ ---
    const diff = targetLane - currentLane;
    if (Math.abs(diff) > 0.005) {
        currentLane += Math.sign(diff) * LANE_CHANGE_SPEED * deltaTime;
    } else {
        currentLane = targetLane;
    }
    currentLane = clamp(currentLane, 0, TOTAL_LANES - 1);

    // --- ДВИЖЕНИЕ ---
    zPos -= speed * 55 * deltaTime;

    // Круги
    if (zPos < -TRACK_LENGTH / 2) {
        zPos = TRACK_LENGTH / 2;
        laps++;
        console.log(`🏁 КРУГ ${laps} ЗАВЕРШЁН!`);
    }
    if (zPos > TRACK_LENGTH / 2) {
        zPos = -TRACK_LENGTH / 2;
    }

    // --- РАСЧЕТ X ПОЗИЦИИ ---
    let xPos;
    if (currentLane <= 0) {
        xPos = LANES[0];
    } else if (currentLane >= TOTAL_LANES - 1) {
        xPos = LANES[TOTAL_LANES - 1];
    } else {
        const floorLane = Math.floor(currentLane);
        const frac = currentLane - floorLane;
        xPos = LANES[floorLane] + frac * (LANES[floorLane + 1] - LANES[floorLane]);
    }

    playerCar.position.set(xPos, 0.1, zPos);

    // Наклон
    const lateralSpeed = (currentLane - targetLane);
    playerCar.rotation.z = lerp(playerCar.rotation.z, lateralSpeed * 0.06, 0.1);

    // --- СОПЕРНИКИ ---
    opponents.forEach(opp => {
        opp.z -= opp.speed * 55 * deltaTime;
        if (opp.z < -TRACK_LENGTH / 2) opp.z = TRACK_LENGTH / 2;

        opp.mesh.position.set(LANES[opp.lane], 0.1, opp.z);
    });

    // --- КАМЕРА ---
    const targetCamPos = new THREE.Vector3(
        xPos * 0.3,
        4.0,
        zPos + 8
    );
    camera.position.lerp(targetCamPos, 0.08);
    camera.lookAt(xPos, 0.5, zPos - 15);

    // --- HUD ---
    if (posEl) posEl.textContent = `${getPosition()} / ${opponents.length + 1}`;
    if (speedEl) speedEl.textContent = Math.round(Math.abs(speed) * 600);
    if (lapEl) lapEl.textContent = `${Math.min(laps + 1, 3)} / 3`;

    // Проверка победы
    if (laps >= 3) {
        console.log('🏆 ПОБЕДА! Вы прошли 3 круга!');
        // Можно добавить визуальное уведомление
    }
}

// ============================================================
// АНИМАЦИЯ
// ============================================================
let lastTime = performance.now();

function animate(currentTime) {
    requestAnimationFrame(animate);
    const deltaTime = Math.min(0.05, (currentTime - lastTime) / 1000);
    lastTime = currentTime;

    update(deltaTime);
    renderer.render(scene, camera);
}

// ============================================================
// RESIZE
// ============================================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================
// СТАРТ
// ============================================================
animate(performance.now());

console.log('═══════════════════════════════════════════════');
console.log('🏎️  ГОНКА ЗАПУЩЕНА!');
console.log('───────────────────────────────────────────────');
console.log('Управление:');
console.log('  W - Газ');
console.log('  S - Тормоз');
console.log('  A - ВЛЕВО');
console.log('  D - ВПРАВО');
console.log('───────────────────────────────────────────────');
console.log(`Длина трассы: ${TRACK_LENGTH} м`);
console.log(`Соперников: ${NUM_OPPONENTS}`);
console.log('Цель: пройти 3 круга!');
console.log('═══════════════════════════════════════════════');