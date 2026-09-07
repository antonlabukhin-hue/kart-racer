import * as THREE from 'three';

console.log('=== ГОНКА НА ВЫЖИВАНИЕ: УЙТИ ОТ ПРЕПЯТСТВИЙ (v2) ===');

// ============================================================
// МЕНЮ ВЫБОРА КАЧЕСТВА ГРАФИКИ
// ============================================================
function showQualityMenu() {
    const menu = document.createElement('div');
    menu.id = 'quality-menu';
    menu.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.9);
        padding: 40px 50px;
        border-radius: 20px;
        border: 2px solid rgba(255,255,255,0.1);
        color: #fff;
        font-family: 'Arial', sans-serif;
        text-align: center;
        z-index: 1000;
        backdrop-filter: blur(10px);
        min-width: 320px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.8);
    `;
    menu.innerHTML = `
        <h1 style="font-size:32px;margin-bottom:10px;color:#ffdd00;">🏎️ ДОРОЖНЫЙ ПРОРЫВ</h1>
        <p style="color:#888;margin-bottom:6px;font-size:16px;">Выберите качество графики</p>
        <p style="color:#555;margin-bottom:20px;font-size:12px;">2 минуты, препятствия, сужения и погода — доедь до финиша</p>
        <div style="display:flex;flex-direction:column;gap:12px;">
            <button data-quality="high" style="
                padding:14px 30px;
                border:2px solid rgba(255,255,255,0.2);
                border-radius:12px;
                background: rgba(255,255,255,0.05);
                color:#fff;
                font-size:18px;
                cursor:pointer;
                transition: all 0.3s;
                font-weight:bold;
            ">
                🔥 Высокое
                <div style="font-size:12px;color:#888;font-weight:normal;">Тени, текстуры, дальний обзор</div>
            </button>
            <button data-quality="medium" style="
                padding:14px 30px;
                border:2px solid rgba(255,200,0,0.3);
                border-radius:12px;
                background: rgba(255,200,0,0.05);
                color:#fff;
                font-size:18px;
                cursor:pointer;
                transition: all 0.3s;
                font-weight:bold;
            ">
                ⚡ Среднее
                <div style="font-size:12px;color:#888;font-weight:normal;">Тени, текстуры, средний обзор</div>
            </button>
            <button data-quality="low" style="
                padding:14px 30px;
                border:2px solid rgba(0,255,100,0.2);
                border-radius:12px;
                background: rgba(0,255,100,0.05);
                color:#fff;
                font-size:18px;
                cursor:pointer;
                transition: all 0.3s;
                font-weight:bold;
            ">
                🚀 Низкое
                <div style="font-size:12px;color:#888;font-weight:normal;">Без теней, короткий обзор (сложнее реагировать!)</div>
            </button>
        </div>
        <div style="margin-top:20px;font-size:12px;color:#555;">
            Нажмите Esc для выхода
        </div>
    `;
    document.body.appendChild(menu);

    return new Promise((resolve) => {
        menu.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.02)';
                btn.style.borderColor = '#ffdd00';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
                btn.style.borderColor = '';
            });
            btn.addEventListener('click', () => {
                const quality = btn.dataset.quality;
                menu.remove();
                resolve(quality);
            });
        });

        document.addEventListener('keydown', function handler(e) {
            if (e.key === 'Escape') {
                menu.remove();
                document.removeEventListener('keydown', handler);
                resolve('medium');
            }
        });
    });
}

// ============================================================
// ЗВУКОВОЙ ДВИЖОК
// ============================================================
class SoundEngine {
    constructor() {
        this.audioCtx = null;
        this.engineNode = null;
        this.engineGain = null;
        this.gainNode = null;
        this.isPlaying = false;
        this.engineFrequency = 80;
        this.engineVolume = 0.10;
        this.speed = 0;
        this.maxSpeed = 0.35;
        this.enabled = true;
        this.musicNodes = [];
        this.musicGain = null;
        this.musicInterval = null;
        this.isMusicPlaying = false;
        this.initialized = false;
    }

    init() {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.engineGain = this.audioCtx.createGain();
            this.engineGain.gain.value = 0;
            this.engineGain.connect(this.audioCtx.destination);
            this.enabled = true;
            this.initialized = true;
            console.log('🔊 Звук инициализирован');

            this.musicGain = this.audioCtx.createGain();
            this.musicGain.gain.value = 0.12;
            this.musicGain.connect(this.audioCtx.destination);

            const resumeOnGesture = () => {
                if (this.audioCtx && this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }
            };
            document.addEventListener('click', resumeOnGesture, { once: true });
            document.addEventListener('keydown', resumeOnGesture, { once: true });

            return true;
        } catch (e) {
            console.warn('⚠️ Звук не поддерживается');
            this.enabled = false;
            return false;
        }
    }

    startMusic() {
        if (!this.enabled || !this.audioCtx || this.isMusicPlaying) return;
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        this.isMusicPlaying = true;
        this.playMusicLoop();
        this.musicInterval = setInterval(() => this.playMusicLoop(), 5000);
    }

    playMusicLoop() {
        if (!this.enabled || !this.audioCtx || !this.isMusicPlaying) return;

        try {
            const notes = [
                [523, 0.25], [587, 0.25], [659, 0.25], [523, 0.25],
                [659, 0.25], [784, 0.25], [880, 0.25], [784, 0.25],
                [659, 0.3], [587, 0.3], [523, 0.3], [587, 0.3],
                [659, 0.25], [784, 0.25], [880, 0.25], [1047, 0.5]
            ];

            const startTime = this.audioCtx.currentTime;
            let time = 0;

            notes.forEach(([freq, duration]) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.08, startTime + time);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + time + duration);
                osc.connect(gain);
                gain.connect(this.musicGain);
                osc.start(startTime + time);
                osc.stop(startTime + time + duration + 0.05);
                this.musicNodes.push(osc);
                time += duration + 0.05;
            });
        } catch (e) {}
    }

    stopMusic() {
        this.isMusicPlaying = false;
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
        if (this.musicGain) {
            try {
                this.musicGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
            } catch (e) {}
        }
        this.musicNodes.forEach(node => {
            try { node.stop(); } catch (e) {}
        });
        this.musicNodes = [];
    }

    update(speed) {
        if (!this.enabled || !this.audioCtx || !this.initialized) return;

        this.speed = speed;

        try {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        } catch (e) {}

        const normalizedSpeed = Math.abs(speed) / this.maxSpeed;
        const targetFreq = 60 + normalizedSpeed * 200;
        const targetVolume = 0.03 + normalizedSpeed * 0.18;

        if (Math.abs(speed) > 0.01) {
            if (!this.isPlaying) {
                this.startEngine();
            }
            this.engineFrequency += (targetFreq - this.engineFrequency) * 0.1;
            this.engineVolume += (targetVolume - this.engineVolume) * 0.1;

            if (this.engineNode && this.engineGain) {
                try {
                    this.engineNode.frequency.setValueAtTime(this.engineFrequency, this.audioCtx.currentTime);
                    this.engineGain.gain.setValueAtTime(this.engineVolume, this.audioCtx.currentTime);
                } catch (e) {}
            }
        } else {
            if (this.isPlaying) {
                try {
                    if (this.engineGain) {
                        this.engineGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
                    }
                } catch (e) {}
                this.isPlaying = false;
                setTimeout(() => this.stopEngine(), 150);
            }
        }
    }

    startEngine() {
        if (!this.enabled || !this.audioCtx || !this.initialized || this.isPlaying) return;

        try {
            this.engineNode = this.audioCtx.createOscillator();
            this.engineNode.type = 'sawtooth';
            this.engineNode.frequency.value = this.engineFrequency;

            this.gainNode = this.audioCtx.createGain();
            this.gainNode.gain.value = this.engineVolume;

            this.engineNode.connect(this.gainNode);
            this.gainNode.connect(this.engineGain);

            this.engineNode.start();
            this.isPlaying = true;
        } catch (e) {}
    }

    stopEngine() {
        if (!this.enabled || !this.audioCtx) return;
        if (this.engineNode) {
            try {
                this.engineNode.stop();
                this.engineNode.disconnect();
            } catch (e) {}
            this.engineNode = null;
            this.gainNode = null;
            this.isPlaying = false;
        }
    }

    playFinishSound() {
        if (!this.enabled || !this.audioCtx) return;
        try {
            const notes = [523, 659, 784, 1047];
            notes.forEach((freq, i) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + i * 0.12 + 0.25);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(this.audioCtx.currentTime + i * 0.12);
                osc.stop(this.audioCtx.currentTime + i * 0.12 + 0.25);
            });
        } catch (e) {}
    }

    playLapSound() {
        if (!this.enabled || !this.audioCtx) return;
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.2);
        } catch (e) {}
    }

    playCrashSound(volumeScale = 1) {
        if (!this.enabled || !this.audioCtx) return;
        try {
            const t0 = this.audioCtx.currentTime;

            const thud = this.audioCtx.createOscillator();
            const thudGain = this.audioCtx.createGain();
            thud.type = 'triangle';
            thud.frequency.setValueAtTime(180, t0);
            thud.frequency.exponentialRampToValueAtTime(40, t0 + 0.25);
            thudGain.gain.setValueAtTime(0.35 * volumeScale, t0);
            thudGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
            thud.connect(thudGain);
            thudGain.connect(this.audioCtx.destination);
            thud.start(t0);
            thud.stop(t0 + 0.3);

            const bufferSize = Math.floor(this.audioCtx.sampleRate * 0.2);
            const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }
            const noise = this.audioCtx.createBufferSource();
            noise.buffer = buffer;
            const noiseGain = this.audioCtx.createGain();
            noiseGain.gain.setValueAtTime(0.15 * volumeScale, t0);
            noise.connect(noiseGain);
            noiseGain.connect(this.audioCtx.destination);
            noise.start(t0);
        } catch (e) {}
    }
}

// ============================================================
// СИСТЕМА ЧАСТИЦ
// ============================================================
class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.maxParticles = 60;
        this.enabled = true;
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.maxParticles * 3);
        this.sizes = new Float32Array(this.maxParticles);
        this.opacities = new Float32Array(this.maxParticles);
        this.velocities = [];
        this.lifetimes = [];

        for (let i = 0; i < this.maxParticles; i++) {
            this.positions[i * 3] = 0;
            this.positions[i * 3 + 1] = 0;
            this.positions[i * 3 + 2] = 0;
            this.sizes[i] = 0;
            this.opacities[i] = 0;
            this.velocities.push({ x: 0, y: 0, z: 0 });
            this.lifetimes.push(0);
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
        this.geometry.setAttribute('opacity', new THREE.BufferAttribute(this.opacities, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0xccbb88) }
            },
            vertexShader: `
                attribute float size;
                attribute float opacity;
                varying float vOpacity;
                void main() {
                    vOpacity = opacity;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / max(-mvPosition.z, 0.001));
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                varying float vOpacity;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    gl_FragColor = vec4(color, vOpacity * (1.0 - d * 2.0));
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.points = new THREE.Points(this.geometry, material);
        this.points.position.y = 0;
        this.scene.add(this.points);
        this.particleIndex = 0;
    }

    emit(position, velocity, count = 2) {
        if (!this.enabled) return;
        for (let i = 0; i < count; i++) {
            const idx = this.particleIndex % this.maxParticles;
            this.particleIndex++;
            const i3 = idx * 3;
            this.positions[i3] = position.x + (Math.random() - 0.5) * 0.3;
            this.positions[i3 + 1] = position.y + 0.05;
            this.positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.3;
            this.sizes[idx] = 0.08 + Math.random() * 0.2;
            this.opacities[idx] = 0.3 + Math.random() * 0.3;
            this.velocities[idx] = {
                x: (Math.random() - 0.5) * 0.3 + velocity.x * 0.5,
                y: Math.random() * 0.2 + 0.1,
                z: (Math.random() - 0.5) * 0.3 + velocity.z * 0.5
            };
            this.lifetimes[idx] = 0.5 + Math.random() * 0.5;
        }
    }

    update(deltaTime) {
        if (!this.enabled) return;
        for (let i = 0; i < this.maxParticles; i++) {
            const i3 = i * 3;
            if (this.opacities[i] > 0.01) {
                this.lifetimes[i] -= deltaTime;
                if (this.lifetimes[i] <= 0) {
                    this.opacities[i] = 0;
                    this.sizes[i] = 0;
                    continue;
                }
                this.positions[i3] += this.velocities[i].x * deltaTime;
                this.positions[i3 + 1] += this.velocities[i].y * deltaTime;
                this.positions[i3 + 2] += this.velocities[i].z * deltaTime;
                this.velocities[i].y -= 0.1 * deltaTime;
                const lifeRatio = this.lifetimes[i] / 0.8;
                this.opacities[i] = Math.max(0, lifeRatio * 0.5);
                this.sizes[i] = (0.08 + Math.random() * 0.03) * (0.5 + lifeRatio * 0.5);
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
        this.geometry.attributes.opacity.needsUpdate = true;
    }
}

// ============================================================
// ЗАПУСК ИГРЫ
// ============================================================
async function startGame() {
    const quality = await showQualityMenu();
    console.log(`📊 Выбрано качество: ${quality}`);
    initGame(quality);
}

// ============================================================
// НАСТРОЙКИ ГРАФИКИ
// ============================================================
function getConfig(quality) {
    const configs = {
        high: {
            trees: 45,
            shadowMapSize: 512,
            textureSize: 128,
            fogFar: 220,
            shadows: true,
            treeComplexity: 4,
            label: '🔥 Высокое',
            particles: true
        },
        medium: {
            trees: 28,
            shadowMapSize: 256,
            textureSize: 128,
            fogFar: 170,
            shadows: true,
            treeComplexity: 3,
            label: '⚡ Среднее',
            particles: true
        },
        low: {
            trees: 16,
            shadowMapSize: 0,
            textureSize: 64,
            fogFar: 110,
            shadows: false,
            treeComplexity: 2,
            label: '🚀 Низкое',
            particles: false
        }
    };
    return configs[quality] || configs.medium;
}

// ============================================================
// ОСНОВНАЯ ИГРА
// ============================================================
function initGame(quality) {
    const CONFIG = getConfig(quality);
    console.log(`🎮 Запуск с настройками: ${CONFIG.label}`);

    // ============================================================
    // КОНСТАНТЫ ТРАССЫ И ПРАВИЛ
    // ============================================================
    const TRACK_LENGTH = 1800;
    const TRACK_WIDTH = 8;
    const LANE_WIDTH = 2;
    const TOTAL_LANES = 4;
    const LANES = [-3, -1, 1, 3];
    const CAR_WIDTH = 0.8;

    const TIME_LIMIT = 120;
    const MAX_STRIKES = 5;
    const TRIGGER_LOOKAHEAD = 22;

    const START_Z = TRACK_LENGTH / 2 - 60; // увеличен буфер
    const FINISH_Z = -TRACK_LENGTH / 2 + 20;

    // ============================================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ============================================================
    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

    // ============================================================
    // УДАЛЯЕМ СТАРЫЙ HUD
    // ============================================================
    const oldHud = document.getElementById('game-hud');
    if (oldHud) oldHud.remove();
    const oldFinish = document.getElementById('finish-screen');
    if (oldFinish) oldFinish.remove();

    // ============================================================
    // HUD
    // ============================================================
    function createHUD() {
        const hud = document.createElement('div');
        hud.id = 'game-hud';
        hud.style.cssText = `
            position: absolute; top: 20px; left: 20px;
            color: #fff; font-family: 'Arial', sans-serif;
            font-size: 20px; font-weight: bold;
            text-shadow: 0 0 20px rgba(0,0,0,0.8), 2px 2px 0 #000;
            pointer-events: none;
            background: rgba(0,0,0,0.5);
            padding: 15px 25px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.1);
            backdrop-filter: blur(5px);
            min-width: 240px;
            z-index: 100;
        `;
        hud.innerHTML = `
            <div style="color:#ff8844;">⏱ ВРЕМЯ: <span id="timeDisplay" style="color:#fff;display:inline-block;">2:00</span></div>
            <div style="color:#ff5555;">💥 АВАРИИ: <span id="strikesDisplay" style="color:#fff;">0 / ${MAX_STRIKES}</span></div>
            <div style="color:#88ccff;">⚡ СКОРОСТЬ: <span id="speedDisplay" style="color:#fff;">0</span> км/ч</div>
            <div style="margin-top:10px;">
                <div style="background:rgba(255,255,255,0.12);border-radius:6px;height:8px;overflow:hidden;">
                    <div id="progressBar" style="background:linear-gradient(90deg,#ffdd00,#ff8800);height:100%;width:0%;"></div>
                </div>
                <div style="font-size:11px;color:#888;margin-top:4px;">Дистанция до финиша</div>
            </div>
            <div style="margin-top:8px;font-size:12px;color:#666;">
                ${CONFIG.label} · Q-меню
            </div>
        `;
        document.body.appendChild(hud);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes timePenaltyFloat {
                0% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-26px); }
            }
            @keyframes timeHitPulse {
                0% { transform: scale(1.5); }
                100% { transform: scale(1); }
            }
            .time-hit-flash {
                animation: timeHitPulse 0.35s ease-out;
                color: #ff3333 !important;
            }
        `;
        document.head.appendChild(style);
    }
    createHUD();

    function showTimePenaltyPopup(seconds) {
        const timeEl = document.getElementById('timeDisplay');
        if (!timeEl) return;
        const rect = timeEl.getBoundingClientRect();
        const popup = document.createElement('div');
        popup.textContent = `-${seconds}с`;
        popup.style.cssText = `
            position: fixed;
            left: ${rect.right + 8}px;
            top: ${rect.top - 4}px;
            color: #ff3333;
            font-weight: bold;
            font-size: 16px;
            font-family: 'Arial', sans-serif;
            pointer-events: none;
            z-index: 200;
            animation: timePenaltyFloat 1s ease-out forwards;
        `;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 1000);

        timeEl.classList.add('time-hit-flash');
        setTimeout(() => timeEl.classList.remove('time-hit-flash'), 350);
    }

    // ============================================================
    // ЭКРАН ОКОНЧАНИЯ ИГРЫ
    // ============================================================
    function showEndScreen(state, timeTaken) {
        const screen = document.createElement('div');
        screen.id = 'finish-screen';
        screen.style.cssText = `
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 500;
            backdrop-filter: blur(10px);
            font-family: 'Arial', sans-serif;
        `;

        let title, color, message;
        if (state === 'win') {
            title = strikes === 0 ? '🏆 ИДЕАЛЬНЫЙ ЗАЕЗД!' : '🏁 ФИНИШ!';
            color = '#ffdd00';
            message = `Время: ${formatTime(timeTaken)} · Аварий: ${strikes} / ${MAX_STRIKES}`;
        } else if (state === 'timeout') {
            title = '⏰ ВРЕМЯ ВЫШЛО!';
            color = '#ff6644';
            message = `Не удалось доехать до финиша за ${TIME_LIMIT} секунд`;
        } else {
            title = '💥 СЛИШКОМ МНОГО АВАРИЙ';
            color = '#ff3333';
            message = `Столкновений: ${strikes} / ${MAX_STRIKES} — попробуйте снова`;
        }

        screen.innerHTML = `
            <div style="background: rgba(0,0,0,0.9); padding: 50px 60px; border-radius: 25px; border: 2px solid ${color}; text-align: center; max-width: 520px; box-shadow: 0 20px 80px rgba(0,0,0,0.9);">
                <h1 style="font-size:42px;color:${color};margin-bottom:10px;">${title}</h1>
                <div style="font-size:18px;color:#fff;margin:15px 0;">${message}</div>
                <div style="display:flex;gap:15px;justify-content:center;flex-wrap:wrap;">
                    <button onclick="location.reload()" style="padding:12px 30px; border:2px solid ${color}; border-radius:12px; background: rgba(255,255,255,0.06); color:#fff; font-size:18px; cursor:pointer; transition: all 0.3s; font-weight:bold;">
                        🔄 Заново
                    </button>
                </div>
                <div style="margin-top:15px;font-size:14px;color:#555;">Нажмите R для рестарта</div>
            </div>
        `;
        document.body.appendChild(screen);

        if (state === 'win') {
            soundEngine.playFinishSound();
            if (strikes === 0) {
                for (let i = 0; i < 50; i++) {
                    setTimeout(() => {
                        const el = document.createElement('div');
                        el.style.cssText = `
                            position: absolute;
                            left: ${Math.random() * 100}%;
                            top: -20px;
                            width: 8px;
                            height: 8px;
                            background: hsl(${Math.random() * 360}, 80%, 60%);
                            border-radius: 50%;
                            pointer-events: none;
                            z-index: 501;
                            animation: fall ${2 + Math.random() * 2}s linear forwards;
                        `;
                        document.body.appendChild(el);
                        setTimeout(() => el.remove(), 4000);
                    }, i * 50);
                }
                const style = document.createElement('style');
                style.textContent = `@keyframes fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }`;
                document.head.appendChild(style);
            }
        } else {
            soundEngine.playCrashSound(1.2);
        }
    }

    function endGame(state) {
        if (gameState !== 'racing') return;
        gameState = state;
        soundEngine.stopEngine();
        soundEngine.stopMusic();
        const timeTaken = raceTime;
        setTimeout(() => showEndScreen(state, timeTaken), state === 'crash' ? 350 : 500);
        console.log(`🏁 Игра окончена: ${state}, время: ${formatTime(timeTaken)}, аварий: ${strikes}`);
    }

    // ============================================================
    // ЗВУК
    // ============================================================
    const soundEngine = new SoundEngine();
    const soundInit = soundEngine.init();
    if (soundInit) {
        setTimeout(() => soundEngine.startMusic(), 1000);
    }

    // ============================================================
    // СЦЕНА
    // ============================================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x4a8db7);
    scene.fog = new THREE.Fog(0x4a8db7, 50, CONFIG.fogFar);

    // ============================================================
    // СИСТЕМА ЧАСТИЦ
    // ============================================================
    const particleSystem = new ParticleSystem(scene);
    if (!CONFIG.particles) particleSystem.enabled = false;

    // ============================================================
    // ОСВЕЩЕНИЕ
    // ============================================================
    const ambient = new THREE.AmbientLight(0x446688, 0.6);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0x88ccff, 0x445533, 0.5);
    scene.add(hemi);

    const sunLight = new THREE.DirectionalLight(0xffeedd, 1.8);
    sunLight.position.set(30, 50, 20);
    sunLight.castShadow = CONFIG.shadows;
    if (CONFIG.shadows) {
        sunLight.shadow.mapSize.width = CONFIG.shadowMapSize;
        sunLight.shadow.mapSize.height = CONFIG.shadowMapSize;
        sunLight.shadow.camera.near = 1;
        sunLight.shadow.camera.far = 150;
        sunLight.shadow.camera.left = -35;
        sunLight.shadow.camera.right = 35;
        sunLight.shadow.camera.top = 35;
        sunLight.shadow.camera.bottom = -35;
        sunLight.shadow.bias = -0.0005;
        sunLight.shadow.normalBias = 0.02;
    }
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-20, 30, -10);
    scene.add(fillLight);

    // ============================================================
    // КАМЕРА
    // ============================================================
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(0, 15, 25);

    // ============================================================
    // РЕНДЕРЕР
    // ============================================================
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = CONFIG.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    // ============================================================
    // ТЕКСТУРЫ
    // ============================================================
    function createGrassTexture() {
        const size = CONFIG.textureSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#3a7d3a';
        ctx.fillRect(0, 0, size, size);
        const count = size * size / 30;
        for (let i = 0; i < count; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const len = 2 + Math.random() * 4;
            const shade = 60 + Math.random() * 80;
            ctx.strokeStyle = `rgb(${shade}, ${shade + 60}, ${shade - 20})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (Math.random() - 0.5) * len, y + len);
            ctx.stroke();
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(50, 50);
        return texture;
    }

    function createAsphaltTexture() {
        const size = CONFIG.textureSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#444455';
        ctx.fillRect(0, 0, size, size);
        const count = size * size / 15;
        for (let i = 0; i < count; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const sz = 1 + Math.random() * 2;
            const shade = 60 + Math.random() * 80;
            ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade + 10})`;
            ctx.fillRect(x, y, sz, sz);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 70);
        return texture;
    }

    // ============================================================
    // ЗЕМЛЯ
    // ============================================================
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(600, TRACK_LENGTH + 200),
        new THREE.MeshStandardMaterial({ map: createGrassTexture(), roughness: 1, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = CONFIG.shadows;
    scene.add(ground);

    // ============================================================
    // ТРАССА
    // ============================================================
    const trackMat = new THREE.MeshStandardMaterial({
        map: createAsphaltTexture(),
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    const track = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_WIDTH, TRACK_LENGTH), trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.set(0, 0.01, 0);
    track.receiveShadow = CONFIG.shadows;
    scene.add(track);

    // ============================================================
    // РАЗМЕТКА ПОЛОС (InstancedMesh)
    // ============================================================
    function createLaneMarkings() {
        const geo = new THREE.PlaneGeometry(0.1, 0.8);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x88aaff, emissiveIntensity: 0.05, side: THREE.DoubleSide, roughness: 0.3 });
        const spots = [];
        for (let lane = 1; lane < TOTAL_LANES; lane++) {
            const xMark = -TRACK_WIDTH / 2 + lane * LANE_WIDTH;
            for (let i = -TRACK_LENGTH / 2 + 0.5; i < TRACK_LENGTH / 2 - 0.5; i += 2.5) {
                spots.push({ x: xMark, z: i });
            }
        }
        const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
        const dummy = new THREE.Object3D();
        dummy.rotation.x = -Math.PI / 2;
        spots.forEach((p, idx) => {
            dummy.position.set(p.x, 0.02, p.z);
            dummy.updateMatrix();
            mesh.setMatrixAt(idx, dummy.matrix);
        });
        scene.add(mesh);
    }
    createLaneMarkings();

    // ============================================================
    // БОРДЮРЫ (InstancedMesh)
    // ============================================================
    function createCurbs() {
        const redSpots = [];
        const whiteSpots = [];
        for (let i = -TRACK_LENGTH / 2; i <= TRACK_LENGTH / 2; i += 1.2) {
            const isRed = Math.floor(i * 2) % 2 === 0;
            for (const side of [-1, 1]) {
                (isRed ? redSpots : whiteSpots).push({ x: side * (TRACK_WIDTH / 2 + 0.15), z: i });
            }
        }
        const geo = new THREE.BoxGeometry(0.2, 0.08, 0.4);
        function build(spots, color, emissive, emissiveIntensity) {
            if (spots.length === 0) return;
            const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive, emissiveIntensity });
            const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
            const dummy = new THREE.Object3D();
            spots.forEach((p, idx) => {
                dummy.position.set(p.x, 0.04, p.z);
                dummy.updateMatrix();
                mesh.setMatrixAt(idx, dummy.matrix);
            });
            mesh.castShadow = CONFIG.shadows;
            mesh.receiveShadow = CONFIG.shadows;
            scene.add(mesh);
        }
        build(redSpots, 0xff2200, 0xff0000, 0.05);
        build(whiteSpots, 0xffffff, 0x000000, 0);
    }
    createCurbs();

    // ============================================================
    // СТАРТ / ФИНИШ
    // ============================================================
    const startLine = new THREE.Mesh(
        new THREE.PlaneGeometry(TRACK_WIDTH - 0.5, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xff8800, emissiveIntensity: 0.3, side: THREE.DoubleSide })
    );
    startLine.rotation.x = -Math.PI / 2;
    startLine.position.set(0, 0.02, TRACK_LENGTH / 2 - 5);
    scene.add(startLine);

    for (let i = -TRACK_WIDTH / 2 + 0.3; i < TRACK_WIDTH / 2 - 0.3; i += 0.35) {
        const flag = new THREE.Mesh(
            new THREE.PlaneGeometry(0.2, 0.2),
            new THREE.MeshStandardMaterial({ color: (Math.floor(i * 4) % 2 === 0) ? 0xffffff : 0x000000, side: THREE.DoubleSide, roughness: 0.3 })
        );
        flag.rotation.x = -Math.PI / 2;
        flag.position.set(i, 0.02, -TRACK_LENGTH / 2 + 5);
        scene.add(flag);
    }

    // ============================================================
    // ДЕРЕВЬЯ
    // ============================================================
    function createTree(x, z, scale = 1) {
        const group = new THREE.Group();
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06 * scale, 0.12 * scale, 0.5 * scale, 6),
            new THREE.MeshStandardMaterial({ color: 0x5a3d2b, roughness: 0.9 })
        );
        trunk.position.y = 0.25 * scale;
        trunk.castShadow = CONFIG.shadows;
        group.add(trunk);
        const colors = [0x2d7d2d, 0x3a8c3a, 0x4a9a4a, 0x5a8a3a];
        const numCrowns = CONFIG.treeComplexity;
        for (let i = 0; i < numCrowns; i++) {
            const crown = new THREE.Mesh(
                new THREE.SphereGeometry((0.2 + Math.random() * 0.2) * scale, 6),
                new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)], roughness: 0.8 })
            );
            crown.position.set((Math.random() - 0.5) * 0.4 * scale, 0.5 * scale + Math.random() * 0.3 * scale, (Math.random() - 0.5) * 0.4 * scale);
            crown.castShadow = CONFIG.shadows;
            group.add(crown);
        }
        group.position.set(x, 0, z);
        scene.add(group);
    }

    for (let i = 0; i < CONFIG.trees; i++) {
        const z = -TRACK_LENGTH / 2 + Math.random() * TRACK_LENGTH;
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side * (TRACK_WIDTH / 2 + 2 + Math.random() * 4);
        const scale = 0.6 + Math.random() * 0.8;
        createTree(x, z, scale);
    }

    // ============================================================
    // ЗНАК-ПРЕДУПРЕЖДЕНИЕ ПЕРЕД ОСОБОЙ ЗОНОЙ ТРАССЫ
    // ============================================================
    function createZoneSign(z, text, colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, 320, 80);
        ctx.strokeStyle = '#' + colorHex.toString(16).padStart(6, '0');
        ctx.lineWidth = 5;
        ctx.strokeRect(3, 3, 314, 74);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 160, 40);
        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
        const geo = new THREE.PlaneGeometry(5, 1.25);
        const sign = new THREE.Mesh(geo, mat);
        sign.position.set(0, 3.2, z);
        scene.add(sign);

        const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 });
        [-2.4, 2.4].forEach(px => {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6), poleMat);
            pole.position.set(px, 1.6, z);
            scene.add(pole);
        });
    }

    // ============================================================
    // МАШИНКА (игрок + препятствия-автомобили)
    // ============================================================
    function createCar(color = 0xff3333, isPlayer = false) {
        const car = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.2, metalness: 0.7 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 1.4), bodyMat);
        body.position.y = 0.2;
        body.castShadow = CONFIG.shadows;
        car.add(body);

        const cabinMat = new THREE.MeshStandardMaterial({ color: isPlayer ? 0x88ddff : 0x88ccff, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.8 });
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5), cabinMat);
        cabin.position.set(0, 0.38, 0.05);
        cabin.castShadow = CONFIG.shadows;
        car.add(cabin);

        const lightMatL = new THREE.MeshStandardMaterial({ color: 0xffff88, emissive: 0xffff44, emissiveIntensity: 0.8 });
        const lightMatR = new THREE.MeshStandardMaterial({ color: 0xffff88, emissive: 0xffff44, emissiveIntensity: 0.8 });
        const l1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8), lightMatL);
        l1.position.set(-0.2, 0.14, -0.7);
        car.add(l1);
        const l2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8), lightMatR);
        l2.position.set(0.2, 0.14, -0.7);
        car.add(l2);

        const rearMatL = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.4 });
        const rearMatR = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.4 });
        const r1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8), rearMatL);
        r1.position.set(-0.2, 0.14, 0.7);
        car.add(r1);
        const r2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8), rearMatR);
        r2.position.set(0.2, 0.14, 0.7);
        car.add(r2);

        car.userData.lights = { frontLeft: l1, frontRight: l2, rearLeft: r1, rearRight: r2 };

        const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.3, metalness: 0.8 });
        const wheelPos = [[-0.35, 0.06, 0.5], [0.35, 0.06, 0.5], [-0.35, 0.06, -0.5], [0.35, 0.06, -0.5]];
        wheelPos.forEach(p => {
            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.05, 8), tireMat);
            tire.rotation.x = Math.PI / 2;
            tire.position.set(p[0], p[1], p[2]);
            tire.castShadow = CONFIG.shadows;
            car.add(tire);
            if (CONFIG.textureSize >= 128) {
                const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 6), rimMat);
                rim.rotation.x = Math.PI / 2;
                rim.position.set(p[0], p[1], p[2]);
                car.add(rim);
            }
        });
        return car;
    }

    // ============================================================
    // ГЕОМЕТРИЯ ПРЕПЯТСТВИЙ: яма, кочка, животное
    // ============================================================
    function createPothole() {
        const geo = new THREE.CircleGeometry(0.6, 16);
        const mat = new THREE.MeshStandardMaterial({ color: 0x140f0c, roughness: 1 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        return mesh;
    }

    function createBump() {
        const geo = new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({ color: 0x6b5a45, roughness: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.scale.set(1, 0.3, 1);
        return mesh;
    }

    function createAnimalMesh() {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3f, roughness: 0.9 });
        const legMat = new THREE.MeshStandardMaterial({ color: 0x5c4028, roughness: 0.9 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.35), bodyMat);
        body.position.y = 0.35;
        body.castShadow = CONFIG.shadows;
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), bodyMat);
        head.position.set(0.5, 0.45, 0);
        group.add(head);

        [[0.55, 0.6, 0.08], [0.55, 0.6, -0.08]].forEach(p => {
            const ear = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), legMat);
            ear.position.set(p[0], p[1], p[2]);
            group.add(ear);
        });

        [[-0.3, 0.15, 0.12], [0.3, 0.15, 0.12], [-0.3, 0.15, -0.12], [0.3, 0.15, -0.12]].forEach(p => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6), legMat);
            leg.position.set(p[0], p[1], p[2]);
            leg.castShadow = CONFIG.shadows;
            group.add(leg);
        });

        return group;
    }

    // ============================================================
    // ОСОБЫЕ ЗОНЫ ТРАССЫ: сужение / мокрая дорога / ночь
    // ============================================================
    function createNarrowZone(zStart, zEnd) {
        const blockedLanes = Math.random() < 0.5 ? 1 : 2;
        const fromLeftSide = Math.random() < 0.5;
        const laneShift = blockedLanes * LANE_WIDTH;
        const globalMax = TRACK_WIDTH / 2 - CAR_WIDTH / 2 - 0.2;

        let minX, maxX;
        if (fromLeftSide) {
            minX = -globalMax + laneShift;
            maxX = globalMax;
        } else {
            minX = -globalMax;
            maxX = globalMax - laneShift;
        }

        const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 0.3 });
        const coneGeo = new THREE.ConeGeometry(0.15, 0.4, 6);
        const boundaryX = fromLeftSide ? minX - 0.35 : maxX + 0.35;
        for (let z = zStart; z > zEnd; z -= 3) {
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.position.set(boundaryX, 0.2, z);
            cone.castShadow = CONFIG.shadows;
            scene.add(cone);
        }

        createZoneSign(zStart + 5, '🚧 СУЖЕНИЕ ДОРОГИ', 0xff8800);
        return { type: 'narrow', zStart, zEnd, minX, maxX };
    }

    function createWetZone(zStart, zEnd) {
        const geo = new THREE.PlaneGeometry(TRACK_WIDTH, zStart - zEnd);
        const mat = new THREE.MeshStandardMaterial({ color: 0x1c2c3c, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.35 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(0, 0.015, (zStart + zEnd) / 2);
        scene.add(mesh);

        createZoneSign(zStart + 5, '💧 МОКРАЯ ДОРОГА', 0x3399ff);
        return { type: 'wet', zStart, zEnd };
    }

    function createNightZone(zStart, zEnd) {
        createZoneSign(zStart + 5, '🌙 НОЧНОЙ УЧАСТОК', 0x6644aa);
        return { type: 'night', zStart, zEnd, fogFar: CONFIG.fogFar * 0.45 };
    }

    function generateZones() {
        const narrowZones = [];
        const wetZones = [];
        const nightZones = [];

        const totalDistance = START_Z - FINISH_Z;
        const numSlots = 9;
        const slotLength = totalDistance / numSlots;

        for (let i = 1; i < numSlots - 1; i++) {
            if (Math.random() < 0.55) continue;

            const slotZStart = START_Z - i * slotLength;
            const zoneLen = slotLength * (0.55 + Math.random() * 0.25);
            const zStart = slotZStart;
            const zEnd = slotZStart - zoneLen;

            const roll = Math.random();
            if (roll < 0.4) {
                narrowZones.push(createNarrowZone(zStart, zEnd));
            } else if (roll < 0.75) {
                wetZones.push(createWetZone(zStart, zEnd));
            } else {
                nightZones.push(createNightZone(zStart, zEnd));
            }
        }

        return { narrowZones, wetZones, nightZones };
    }

    const { narrowZones, wetZones, nightZones } = generateZones();
    console.log(`🌐 Особых зон трассы: сужений ${narrowZones.length}, мокрых ${wetZones.length}, ночных ${nightZones.length}`);

    function getActiveZone(list, z) {
        for (let i = 0; i < list.length; i++) {
            const zn = list[i];
            if (z <= zn.zStart && z >= zn.zEnd) return zn;
        }
        return null;
    }

    // ============================================================
    // ИГРОК
    // ============================================================
    const playerCar = createCar(0xff2200, true);
    let zPos = TRACK_LENGTH / 2 - 5;
    let xPos = 0;
    let xVelocity = 0;
    const MAX_X_SPEED = 0.5;
    const X_DAMPING = 0.85;
    const STEER_ACCEL = 3.0;
    let gameState = 'racing';
    playerCar.position.set(xPos, 0.1, zPos);
    scene.add(playerCar);

    // ============================================================
    // ГЕНЕРАЦИЯ ПРЕПЯТСТВИЙ
    // ============================================================
    function createStaticObstacle(type, lane, z) {
        const x = LANES[lane];
        let mesh, radius, penalty, y, timePenalty;
        let extra = {};
        if (type === 'car') {
            mesh = createCar(0xcfd3d6);
            y = 0.1;
            radius = 1.0;
            penalty = 0.25;
            timePenalty = 5;
            extra = {
                speed: 0.03 + Math.random() * 0.06,
                canChangeLane: Math.random() < 0.35,
                changeState: 'idle',
                changeTimer: 0,
                targetLane: lane,
                triggerDistance: 16 + Math.random() * 10
            };
        } else if (type === 'pothole') {
            mesh = createPothole();
            y = 0.015;
            radius = 0.6;
            penalty = 0.5;
            timePenalty = 3;
        } else {
            mesh = createBump();
            y = 0.03;
            radius = 0.5;
            penalty = 0.7;
            timePenalty = 2;
        }
        mesh.position.set(x, y, z);
        scene.add(mesh);
        return { type, mesh, x, y, z, lane, radius, penalty, timePenalty, hit: false, ...extra };
    }

    function createAnimalObstacle(z) {
        const mesh = createAnimalMesh();
        const fromLeft = Math.random() < 0.5;
        const startX = fromLeft ? -(TRACK_WIDTH / 2 + 2) : (TRACK_WIDTH / 2 + 2);
        const endX = -startX;
        if (!fromLeft) mesh.scale.x = -1;
        mesh.position.set(startX, 0, z);
        mesh.visible = false;
        scene.add(mesh);
        return {
            type: 'animal',
            mesh,
            z,
            x: startX,
            startX,
            endX,
            duration: 1.2 + Math.random() * 0.6,
            elapsed: 0,
            triggered: false,
            radius: 0.5,
            penalty: 0.4,
            timePenalty: 4,
            hit: false
        };
    }

    function generateObstacles() {
        const list = [];
        const totalDistance = START_Z - FINISH_Z;
        let z = START_Z;

        while (z > FINISH_Z) {
            const progress = clamp(1 - (z - FINISH_Z) / totalDistance, 0, 1);
            const gap = lerp(75, 42, progress) + Math.random() * 20;
            z -= gap;
            if (z <= FINISH_Z) break;

            if (Math.random() < 0.25) {
                list.push(createAnimalObstacle(z));
                continue;
            }

            let blockedCount = 1;
            if (progress > 0.33 && Math.random() < 0.5) blockedCount = 2;
            if (progress > 0.7 && Math.random() < 0.3) blockedCount = 3;
            blockedCount = Math.min(blockedCount, TOTAL_LANES - 1);

            const availableLanes = [0, 1, 2, 3];
            for (let i = 0; i < blockedCount; i++) {
                const idx = Math.floor(Math.random() * availableLanes.length);
                const lane = availableLanes.splice(idx, 1)[0];
                const r = Math.random();
                const type = r < 0.4 ? 'car' : (r < 0.7 ? 'pothole' : 'bump');
                const jitterZ = z + (Math.random() * 6 - 3);
                list.push(createStaticObstacle(type, lane, jitterZ));
            }
        }
        return list;
    }

    const obstacles = generateObstacles();
    console.log(`🚧 Сгенерировано препятствий: ${obstacles.length}`);

    // ============================================================
    // ОБРАБОТКА СТОЛКНОВЕНИЙ
    // ============================================================
    let stunTimer = 0;
    let shakeTime = 0;

    function updateStrikesDisplay() {
        const strikesEl = document.getElementById('strikesDisplay');
        if (strikesEl) {
            strikesEl.textContent = `${strikes} / ${MAX_STRIKES}`;
            strikesEl.style.color = strikes >= MAX_STRIKES - 1 ? '#ff5555' : '#fff';
        }
    }

    function handleObstacleHit(obs) {
        strikes++;
        speed *= obs.penalty;
        stunTimer = 0.4;
        shakeTime = 0.35;

        const penaltySeconds = obs.timePenalty || 3;
        raceTime += penaltySeconds;
        showTimePenaltyPopup(penaltySeconds);

        soundEngine.playCrashSound(obs.type === 'car' ? 1 : (obs.type === 'animal' ? 0.6 : 0.8));
        if (CONFIG.particles) {
            particleSystem.emit(new THREE.Vector3(xPos, 0.2, zPos), new THREE.Vector3(0, 0, 0), 10);
        }
        updateStrikesDisplay();
        console.log(`💥 Столкновение (${obs.type})! -${penaltySeconds}с времени. Аварий: ${strikes}/${MAX_STRIKES}`);
        if (strikes >= MAX_STRIKES) {
            endGame('crash');
        }
    }

    function updateObstacles(dt) {
        obstacles.forEach(obs => {
            if (obs.type === 'animal') {
                if (!obs.triggered) {
                    const distanceAhead = zPos - obs.z;
                    if (distanceAhead > 0 && distanceAhead <= TRIGGER_LOOKAHEAD) {
                        obs.triggered = true;
                        obs.mesh.visible = true;
                    }
                } else if (obs.elapsed < obs.duration) {
                    obs.elapsed += dt;
                    const t = Math.min(obs.elapsed / obs.duration, 1);
                    obs.x = lerp(obs.startX, obs.endX, t);
                    obs.mesh.position.x = obs.x;
                }
            } else if (obs.type === 'car') {
                obs.z -= obs.speed * 60 * dt;

                if (obs.canChangeLane && obs.changeState === 'idle') {
                    const distanceAhead = zPos - obs.z;
                    // НЕ перестраиваться, если игрок слишком близко
                    if (distanceAhead > 0 && distanceAhead <= obs.triggerDistance && distanceAhead > 8) {
                        const dir = obs.lane === 0
                            ? 1
                            : (obs.lane === TOTAL_LANES - 1 ? -1 : (Math.random() < 0.5 ? -1 : 1));
                        obs.targetLane = clamp(obs.lane + dir, 0, TOTAL_LANES - 1);
                        obs.changeState = 'warning';
                        obs.changeTimer = 0;
                    }
                } else if (obs.changeState === 'warning') {
                    obs.changeTimer += dt;
                    const lights = obs.mesh.userData.lights;
                    if (lights) {
                        const dir = obs.targetLane > obs.lane ? 1 : -1;
                        const blinker = dir > 0 ? lights.rearRight : lights.rearLeft;
                        blinker.material.emissiveIntensity = (Math.floor(obs.changeTimer * 6) % 2 === 0) ? 1.4 : 0.1;
                    }
                    if (obs.changeTimer >= 0.6) {
                        obs.changeState = 'changing';
                        obs.changeTimer = 0;
                        obs.fromX = LANES[obs.lane];
                        obs.toX = LANES[obs.targetLane];
                    }
                } else if (obs.changeState === 'changing') {
                    obs.changeTimer += dt;
                    const t = Math.min(obs.changeTimer / 0.8, 1);
                    obs.x = lerp(obs.fromX, obs.toX, t);
                    if (t >= 1) {
                        obs.lane = obs.targetLane;
                        obs.changeState = 'done';
                        const lights = obs.mesh.userData.lights;
                        if (lights) {
                            lights.rearLeft.material.emissiveIntensity = 0.4;
                            lights.rearRight.material.emissiveIntensity = 0.4;
                        }
                    }
                }

                obs.mesh.position.set(obs.x, obs.y, obs.z);
            }

            if (obs.hit) return;
            const isActive = obs.type !== 'animal' || obs.triggered;
            if (!isActive) return;

            const dx = xPos - obs.x;
            const dz = zPos - obs.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < obs.radius + 0.55) {
                obs.hit = true;
                handleObstacleHit(obs);
            }
        });
    }

    // ============================================================
    // УПРАВЛЕНИЕ
    // ============================================================
    const keys = { w: false, s: false, a: false, d: false };

    document.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w' || k === 'ц') { keys.w = true; e.preventDefault(); }
        if (k === 's' || k === 'ы') { keys.s = true; e.preventDefault(); }
        if (k === 'a' || k === 'ф') { keys.a = true; e.preventDefault(); }
        if (k === 'd' || k === 'в') { keys.d = true; e.preventDefault(); }
        if (k === 'q') { location.reload(); }
        if (k === 'r' && gameState !== 'racing') { location.reload(); }
    });

    document.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w' || k === 'ц') { keys.w = false; e.preventDefault(); }
        if (k === 's' || k === 'ы') { keys.s = false; e.preventDefault(); }
        if (k === 'a' || k === 'ф') { keys.a = false; e.preventDefault(); }
        if (k === 'd' || k === 'в') { keys.d = false; e.preventDefault(); }
    });

    // ============================================================
    // ПЕРЕМЕННЫЕ ГОНКИ
    // ============================================================
    let speed = 0;
    let strikes = 0;
    let raceTime = 0;
    const MAX_SPEED = 0.35;
    const ACCELERATION = 0.018;
    const BRAKE_FORCE = 0.025;
    const FRICTION_FORCE = 0.008;
    const FIXED_DT = 1 / 60;
    let accumulator = 0;

    // ============================================================
    // ССЫЛКИ НА HUD-ЭЛЕМЕНТЫ
    // ============================================================
    const timeEl = document.getElementById('timeDisplay');
    const speedEl = document.getElementById('speedDisplay');
    const progressBar = document.getElementById('progressBar');

    function formatTime(time) {
        if (!time || time === Infinity) return '--';
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        const ms = Math.floor((time % 1) * 10);
        return `${m}:${String(s).padStart(2, '0')}.${ms}`;
    }

    function formatCountdown(sec) {
        sec = Math.max(0, Math.ceil(sec));
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    // ============================================================
    // ИГРОВОЙ ЦИКЛ
    // ============================================================
    function update(deltaTime) {
        if (gameState !== 'racing') return;
        accumulator += deltaTime;
        let steps = 0;
        const maxSteps = 3;
        while (accumulator >= FIXED_DT && steps < maxSteps) {
            fixedUpdate(FIXED_DT);
            accumulator -= FIXED_DT;
            steps++;
        }
        if (accumulator > FIXED_DT * 10) accumulator = 0;
    }

    function fixedUpdate(dt) {
        raceTime += dt;

        const narrowZone = getActiveZone(narrowZones, zPos);
        const wetZone = getActiveZone(wetZones, zPos);
        const nightZone = getActiveZone(nightZones, zPos);

        const effectiveBrake = wetZone ? BRAKE_FORCE * 0.7 : BRAKE_FORCE;
        if (stunTimer > 0) {
            stunTimer -= dt;
            if (speed > 0) speed = Math.max(speed - FRICTION_FORCE, 0);
            else if (speed < 0) speed = Math.min(speed + FRICTION_FORCE, 0);
        } else if (keys.w) {
            speed = Math.min(speed + ACCELERATION, MAX_SPEED);
        } else if (keys.s) {
            speed = Math.max(speed - effectiveBrake, -MAX_SPEED * 0.2);
        } else {
            if (speed > 0) speed = Math.max(speed - FRICTION_FORCE, 0);
            else if (speed < 0) speed = Math.min(speed + FRICTION_FORCE, 0);
        }

        soundEngine.update(speed);

        const effectiveSteerAccel = wetZone ? STEER_ACCEL * 0.55 : STEER_ACCEL;
        const effectiveDamping = wetZone ? 0.94 : X_DAMPING;
        if (keys.a) {
            xVelocity = Math.max(xVelocity - effectiveSteerAccel * dt, -MAX_X_SPEED);
        } else if (keys.d) {
            xVelocity = Math.min(xVelocity + effectiveSteerAccel * dt, MAX_X_SPEED);
        } else {
            xVelocity *= effectiveDamping;
            if (Math.abs(xVelocity) < 0.001) xVelocity = 0;
        }
        xPos += xVelocity * dt * 15;

        const globalMaxX = TRACK_WIDTH / 2 - CAR_WIDTH / 2 - 0.2;
        const minXBound = narrowZone ? narrowZone.minX : -globalMaxX;
        const maxXBound = narrowZone ? narrowZone.maxX : globalMaxX;
        xPos = clamp(xPos, minXBound, maxXBound);

        const moveAmount = speed * 60 * dt;
        zPos -= moveAmount;
        zPos = Math.min(zPos, START_Z + 15);

        if (CONFIG.particles && Math.abs(speed) > 0.01) {
            const pos = playerCar.position.clone();
            for (let side of [-0.3, 0.3]) {
                const p = pos.clone();
                p.x += side;
                p.z += 0.5;
                const vel = new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.1, -speed * 2);
                particleSystem.emit(p, vel, 1);
            }
        }

        playerCar.position.set(xPos, 0.1, zPos);
        playerCar.rotation.z = lerp(playerCar.rotation.z, -xVelocity * 0.03, 0.1);

        updateObstacles(dt);

        if (gameState === 'racing' && zPos <= FINISH_Z - 15) {
            endGame('win');
        }

        if (gameState === 'racing' && raceTime >= TIME_LIMIT) {
            endGame('timeout');
        }

        // Ночная зона: плавно меняем туман и освещённость
        const targetFogFar = nightZone ? nightZone.fogFar : CONFIG.fogFar;
        scene.fog.far = lerp(scene.fog.far, targetFogFar, 0.06);
        const targetAmbient = nightZone ? 0.35 : 0.6;
        ambient.intensity = lerp(ambient.intensity, targetAmbient, 0.06);
        const targetHemi = nightZone ? 0.18 : 0.5;
        hemi.intensity = lerp(hemi.intensity, targetHemi, 0.06);

        const targetCamPos = new THREE.Vector3(xPos * 0.3, 4.5, zPos + 10);
        camera.position.lerp(targetCamPos, 0.08);
        camera.lookAt(xPos, 0.5, zPos - 15);
        if (shakeTime > 0) {
            shakeTime -= dt;
            const power = Math.max(0, shakeTime) * 0.3;
            camera.position.x += (Math.random() - 0.5) * power;
            camera.position.y += (Math.random() - 0.5) * power;
        }

        if (speedEl) speedEl.textContent = Math.round(Math.abs(speed) * 550);
        if (timeEl) {
            const remaining = TIME_LIMIT - raceTime;
            timeEl.textContent = formatCountdown(remaining);
            if (!timeEl.classList.contains('time-hit-flash')) {
                timeEl.style.color = remaining <= 15 ? '#ff3333' : '#fff';
            }
        }
        if (progressBar) {
            const progress = clamp(((START_Z - zPos) / (START_Z - FINISH_Z)) * 100, 0, 100);
            progressBar.style.width = progress + '%';
        }
        particleSystem.update(dt);
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
    console.log(`🏎️ ИГРА ЗАПУЩЕНА: ${CONFIG.label}`);
    console.log('───────────────────────────────────────────────');
    console.log(`🎯 Цель: доехать до финиша за ${TIME_LIMIT} секунд`);
    console.log(`💥 До ${MAX_STRIKES} столкновений — каждое ещё и крадёт время`);
    console.log('🚧 Машины теперь едут и иногда перестраиваются (с миганием поворотника)');
    console.log('🌐 На трассе бывают сужения, мокрые и ночные участки');
    console.log('───────────────────────────────────────────────');
    console.log('🎮 W-газ, S-тормоз, A/D-рулить, Q-меню, R-рестарт после конца игры');
    console.log('═══════════════════════════════════════════════');
}

// ============================================================
// ЗАПУСК
// ============================================================
startGame();