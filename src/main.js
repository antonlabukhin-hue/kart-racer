import * as THREE from 'three';

console.log('=== ГОНКА НА ВЫЖИВАНИЕ: 7 ВИДОВ, ГАРАНТИРОВАННЫЙ ПУЛ ===');

// ============================================================
// КЭШИРОВАННЫЕ ВЕКТОРЫ
// ============================================================
const _v = {
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    p1: new THREE.Vector3(),
    p2: new THREE.Vector3(),
    p3: new THREE.Vector3(),
    p4: new THREE.Vector3(),
    dir: new THREE.Vector3()
};

// ============================================================
// БАЗА ДАННЫХ ВИДОВ ЖИВОТНЫХ (7 видов)
// ============================================================
const ANIMAL_TYPES = {
    DOG: {
        id: 'dog',
        name: 'Собака',
        width: 0.35,
        height: 0.25,
        color: 0xA0522D,
        accentColor: 0x8B4513,
        speedCross: 3.2,
        speedZ: 0.02,
        penalty: 0.35,
        timePenalty: 4,
        radius: 0.5,
        design: 'dog',
        emoji: '🐕'
    },
    CAT: {
        id: 'cat',
        name: 'Кот',
        width: 0.22,
        height: 0.16,
        color: 0xFF8C00,
        accentColor: 0xFFE4B5,
        speedCross: 4.8,
        speedZ: 0.015,
        penalty: 0.25,
        timePenalty: 3,
        radius: 0.35,
        design: 'cat',
        emoji: '🐈'
    },
    DEER: {
        id: 'deer',
        name: 'Олень',
        width: 0.55,
        height: 0.50,
        color: 0xCD853F,
        accentColor: 0xFFFFFF,
        speedCross: 5.2,
        speedZ: 0.025,
        penalty: 0.45,
        timePenalty: 6,
        radius: 0.7,
        design: 'deer',
        emoji: '🦌'
    },
    BOAR: {
        id: 'boar',
        name: 'Кабан',
        width: 0.45,
        height: 0.35,
        color: 0x4A3B32,
        accentColor: 0x1A1A1A,
        speedCross: 2.8,
        speedZ: 0.02,
        penalty: 0.5,
        timePenalty: 5,
        radius: 0.65,
        design: 'boar',
        emoji: '🐗'
    },
    FOX: {
        id: 'fox',
        name: 'Лиса',
        width: 0.30,
        height: 0.20,
        color: 0xFF4500,
        accentColor: 0xFFFFFF,
        speedCross: 4.2,
        speedZ: 0.018,
        penalty: 0.3,
        timePenalty: 3.5,
        radius: 0.45,
        design: 'fox',
        emoji: '🦊'
    },
    BEAR: {
        id: 'bear',
        name: 'Медведь',
        width: 0.65,
        height: 0.55,
        color: 0x5C4033,
        accentColor: 0x3D2B1F,
        speedCross: 1.8,
        speedZ: 0.012,
        penalty: 0.6,
        timePenalty: 7,
        radius: 0.9,
        design: 'bear',
        emoji: '🐻'
    },
    HUMAN: {
        id: 'human',
        name: 'Человек',
        width: 0.28,
        height: 0.30,
        color: 0xE8C9A0,
        accentColor: 0x3366CC,
        speedCross: 4.0,
        speedZ: 0.025,
        penalty: 0.2,
        timePenalty: 3,
        radius: 0.4,
        design: 'human',
        emoji: '👤'
    }
};

const ANIMAL_KEYS = Object.keys(ANIMAL_TYPES);

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
        background: rgba(0,0,0,0.95);
        padding: 40px 50px;
        border-radius: 20px;
        border: 2px solid rgba(255,255,255,0.15);
        color: #fff;
        font-family: 'Arial', sans-serif;
        text-align: center;
        z-index: 1000;
        backdrop-filter: blur(15px);
        min-width: 320px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.85);
    `;
    menu.innerHTML = `
        <h1 style="font-size:32px;margin-bottom:10px;color:#ffdd00;letter-spacing:1px;">🏎️ ДОРОЖНЫЙ ПРОРЫВ</h1>
        <p style="color:#bbb;margin-bottom:6px;font-size:16px;">Выберите качество графики</p>
        <p style="color:#666;margin-bottom:25px;font-size:12px;">3 стабильные полосы · Пыль из-под колес · 7 видов животных</p>
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
                <div style="font-size:12px;color:#aaa;font-weight:normal;">Мягкие тени, густая пыль, дальний обзор</div>
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
                <div style="font-size:12px;color:#999;font-weight:normal;">Стандартные тени и пыль, средний обзор</div>
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
                <div style="font-size:12px;color:#888;font-weight:normal;">Без теней, базовая пыль, короткий обзор</div>
            </button>
        </div>
        <div style="margin-top:20px;font-size:12px;color:#666;">
            Нажмите Esc для выхода (по умолчанию Среднее)
        </div>
    `;
    document.body.appendChild(menu);

    return new Promise((resolve) => {
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                menu.remove();
                document.removeEventListener('keydown', keyHandler);
                resolve('medium');
            }
        };
        document.addEventListener('keydown', keyHandler);

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
                document.removeEventListener('keydown', keyHandler);
                if (soundEngine && soundEngine.audioCtx && soundEngine.audioCtx.state === 'suspended') {
                    soundEngine.audioCtx.resume();
                }
                resolve(quality);
            });
        });
    });
}

// ============================================================
// ЗВУКОВОЙ ДВИЖОК (УЛУЧШЕННЫЙ)
// ============================================================
class SoundEngine {
    constructor() {
        this.audioCtx = null;
        this.engineNode = null;
        this.engineNode2 = null;
        this.engineLFO = null;
        this.engineLFOGain = null;
        this.engineGain = null;
        this.engineGain2 = null;
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
        this.noiseBuffer = null;
        this.resumeOnGesture = null;
        this.stopEngineTimeoutId = null;
        this._currentStopId = 0;
    }

    init() {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.engineGain = this.audioCtx.createGain();
            this.engineGain.gain.value = 0;
            this.engineGain.connect(this.audioCtx.destination);
            this.enabled = true;
            this.initialized = true;

            this.musicGain = this.audioCtx.createGain();
            this.musicGain.gain.value = 0.10;
            this.musicGain.connect(this.audioCtx.destination);

            this.noiseBuffer = this.createNoiseBuffer();

            this.resumeOnGesture = () => {
                if (this.audioCtx && this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }
            };
            document.addEventListener('click', this.resumeOnGesture, { once: false });
            document.addEventListener('keydown', this.resumeOnGesture, { once: false });

            return true;
        } catch (e) {
            console.warn('⚠️ Аудиоконтекст не поддерживается браузером');
            this.enabled = false;
            return false;
        }
    }

    createNoiseBuffer() {
        if (!this.audioCtx) return null;
        try {
            const bufferSize = Math.floor(this.audioCtx.sampleRate * 0.25);
            const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }
            return buffer;
        } catch (e) {
            return null;
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
                [659, 0.25], [784, 0.25], [880, 0.25], [784, 0.25]
            ];
            const startTime = this.audioCtx.currentTime;
            let time = 0;
            notes.forEach(([freq, duration]) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.06, startTime + time);
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
            try { this.musicGain.gain.setValueAtTime(0, this.audioCtx.currentTime); } catch (e) {}
        }
        this.musicNodes.forEach(node => {
            try { node.stop(); } catch (e) {}
        });
        this.musicNodes = [];
    }

    update(speed) {
        if (!this.enabled || !this.audioCtx || !this.initialized) return;
        this.speed = speed;

        const normalizedSpeed = Math.abs(speed) / this.maxSpeed;
        const targetFreq = 55 + normalizedSpeed * 180;
        const targetVolume = 0.02 + normalizedSpeed * 0.15;

        if (Math.abs(speed) > 0.01) {
            if (!this.isPlaying) {
                this.startEngine();
            }
            this.engineFrequency += (targetFreq - this.engineFrequency) * 0.15;
            this.engineVolume += (targetVolume - this.engineVolume) * 0.15;
            
            if (this.engineNode && this.engineNode2 && this.engineGain) {
                try {
                    // Обновляем частоту основного тона
                    this.engineNode.frequency.setValueAtTime(this.engineFrequency, this.audioCtx.currentTime);
                    // Вторая гармоника на октаву выше
                    this.engineNode2.frequency.setValueAtTime(this.engineFrequency * 2, this.audioCtx.currentTime);
                    // Громкость
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
                this._currentStopId++;
                const stopId = this._currentStopId;
                this.stopEngineTimeoutId = setTimeout(() => {
                    if (stopId === this._currentStopId && !this.isPlaying) {
                        this.stopEngine();
                    }
                }, 150);
            }
        }
    }

    startEngine() {
        if (!this.enabled || !this.audioCtx || !this.initialized || this.isPlaying) return;
        this._currentStopId++;
        try {
            // Основной тон - "рёв" мотора
            this.engineNode = this.audioCtx.createOscillator();
            this.engineNode.type = 'sawtooth';
            this.engineNode.frequency.value = this.engineFrequency;
            
            // Вторая гармоника на октаву выше - добавляет "рычания"
            this.engineNode2 = this.audioCtx.createOscillator();
            this.engineNode2.type = 'square';
            this.engineNode2.frequency.value = this.engineFrequency * 2;
            
            this.engineGain2 = this.audioCtx.createGain();
            this.engineGain2.gain.value = 0.25;
            
            // Лёгкое тремоло (вибрация оборотов) через LFO
            this.engineLFO = this.audioCtx.createOscillator();
            this.engineLFO.type = 'sine';
            this.engineLFO.frequency.value = 12;
            
            this.engineLFOGain = this.audioCtx.createGain();
            this.engineLFOGain.gain.value = 0.08;
            
            this.engineLFO.connect(this.engineLFOGain);
            this.engineLFOGain.connect(this.engineGain.gain);
            
            this.engineNode2.connect(this.engineGain2);
            this.engineGain2.connect(this.engineGain);
            this.engineNode.connect(this.engineGain);
            
            this.engineNode.start();
            this.engineNode2.start();
            this.engineLFO.start();
            
            this.isPlaying = true;
        } catch (e) {}
    }

    stopEngine() {
        if (!this.enabled || !this.audioCtx) return;
        if (this.engineNode) {
            try {
                this.engineNode.stop();
                this.engineNode.disconnect();
                if (this.engineNode2) {
                    this.engineNode2.stop();
                    this.engineNode2.disconnect();
                }
                if (this.engineLFO) {
                    this.engineLFO.stop();
                    this.engineLFO.disconnect();
                }
                if (this.engineLFOGain) {
                    this.engineLFOGain.disconnect();
                }
                if (this.engineGain2) {
                    this.engineGain2.disconnect();
                }
            } catch (e) {}
            this.engineNode = null;
            this.engineNode2 = null;
            this.engineLFO = null;
            this.engineLFOGain = null;
            this.engineGain2 = null;
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
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + i * 0.1 + 0.3);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(this.audioCtx.currentTime + i * 0.1);
                osc.stop(this.audioCtx.currentTime + i * 0.1 + 0.3);
            });
        } catch (e) {}
    }

    playCrashSound(volumeScale = 1) {
        if (!this.enabled || !this.audioCtx) return;
        try {
            const t0 = this.audioCtx.currentTime;
            const thud = this.audioCtx.createOscillator();
            const thudGain = this.audioCtx.createGain();
            thud.type = 'triangle';
            thud.frequency.setValueAtTime(150, t0);
            thud.frequency.exponentialRampToValueAtTime(30, t0 + 0.3);
            thudGain.gain.setValueAtTime(0.4 * volumeScale, t0);
            thudGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
            thud.connect(thudGain);
            thudGain.connect(this.audioCtx.destination);
            thud.start(t0);
            thud.stop(t0 + 0.35);

            if (this.noiseBuffer) {
                const noise = this.audioCtx.createBufferSource();
                noise.buffer = this.noiseBuffer;
                const noiseGain = this.audioCtx.createGain();
                noiseGain.gain.setValueAtTime(0.2 * volumeScale, t0);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
                noise.connect(noiseGain);
                noiseGain.connect(this.audioCtx.destination);
                noise.start(t0);
            }
        } catch (e) {}
    }

    dispose() {
        if (this.resumeOnGesture) {
            document.removeEventListener('click', this.resumeOnGesture);
            document.removeEventListener('keydown', this.resumeOnGesture);
        }
        if (this.audioCtx) {
            try { this.audioCtx.close(); } catch (e) {}
        }
        this.stopMusic();
        this.stopEngine();
    }
}

// ============================================================
// СИСТЕМА ЧАСТИЦ
// ============================================================
class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.maxParticles = 120;
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
            uniforms: { color: { value: new THREE.Color(0xD2B48C) } },
            vertexShader: `
                attribute float size;
                attribute float opacity;
                varying float vOpacity;
                void main() {
                    vOpacity = opacity;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (250.0 / max(-mvPosition.z, 0.01));
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                varying float vOpacity;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    float alpha = smoothstep(0.5, 0.1, d) * vOpacity;
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            blending: THREE.NormalBlending,
            depthWrite: false
        });

        this.points = new THREE.Points(this.geometry, material);
        this.scene.add(this.points);
        this.particleIndex = 0;
    }

    emit(position, velocity, count = 2, customSize = 0.15) {
        if (!this.enabled) return;
        for (let i = 0; i < count; i++) {
            const idx = this.particleIndex % this.maxParticles;
            this.particleIndex++;
            const i3 = idx * 3;

            this.positions[i3] = position.x + (Math.random() - 0.5) * 0.15;
            this.positions[i3 + 1] = position.y + 0.02;
            this.positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.1;

            this.sizes[idx] = customSize * (0.6 + Math.random() * 0.8);
            this.opacities[idx] = 0.4 + Math.random() * 0.3;

            this.velocities[idx] = {
                x: velocity.x + (Math.random() - 0.5) * 0.4,
                y: Math.random() * 0.3 + 0.1,
                z: velocity.z + Math.random() * 0.5
            };
            this.lifetimes[idx] = 0.6 + Math.random() * 0.4;
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

                this.velocities[i].x *= 0.95;
                this.velocities[i].z *= 0.95;
                this.velocities[i].y += 0.05 * deltaTime;

                const lifeRatio = this.lifetimes[i] / 1.0;
                this.opacities[i] = Math.max(0, lifeRatio * 0.5);
                this.sizes[i] *= 1.02;
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
        this.geometry.attributes.opacity.needsUpdate = true;
    }

    dispose() {
        if (this.geometry) this.geometry.dispose();
        if (this.points && this.points.material) this.points.material.dispose();
        if (this.points) this.scene.remove(this.points);
    }
}

// ============================================================
// РИСОВАНИЕ ЖИВОТНЫХ НА CANVAS
// ============================================================
function drawCat(ctx, w, h, color, accentColor, legWiggle) {
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -h / 2, w, h * 0.7);
    ctx.beginPath();
    ctx.arc(w / 2 - 2, -h / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w / 2 - 6, -h / 2 - 6);
    ctx.lineTo(w / 2 - 8, -h / 2 - 14);
    ctx.lineTo(w / 2 - 2, -h / 2 - 8);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 4);
    ctx.quadraticCurveTo(-w / 2 - 10, -h - 5, -w / 2 - 5, -h - 10);
    ctx.stroke();
    ctx.fillStyle = accentColor;
    ctx.fillRect(-w / 3, h / 5, 4, 6 + legWiggle);
    ctx.fillRect(w / 4, h / 5, 4, 6 - legWiggle);
}

function drawDog(ctx, w, h, color, accentColor, legWiggle) {
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -h / 2, w, h * 0.8);
    ctx.fillRect(w / 3, -h * 0.9, 12, 12);
    ctx.fillStyle = accentColor;
    ctx.fillRect(w / 3 + 2, -h * 0.8, 4, 10);
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(-w / 2, -h / 3);
    ctx.rotate(Math.sin(0) * 0.5);
    ctx.fillRect(-8, -3, 8, 4);
    ctx.restore();
    ctx.fillStyle = accentColor;
    ctx.fillRect(-w / 3, h / 3, 5, 8 + legWiggle);
    ctx.fillRect(w / 4, h / 3, 5, 8 - legWiggle);
}

function drawDeer(ctx, w, h, color, accentColor, legWiggle) {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-w / 3, 0, 4, h * 0.6 + legWiggle);
    ctx.fillRect(w / 3, 0, 4, h * 0.6 - legWiggle);
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -h * 0.5, w, h * 0.5);
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(-5, -h * 0.4, 2, 0, Math.PI * 2);
    ctx.arc(5, -h * 0.35, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(w / 2.5, -h * 0.4);
    ctx.rotate(-Math.PI / 4);
    ctx.fillRect(0, -18, 8, 20);
    ctx.fillRect(0, -22, 14, 8);
    ctx.strokeStyle = '#3A200A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -22);
    ctx.lineTo(-5, -35);
    ctx.moveTo(-2, -28);
    ctx.lineTo(-10, -30);
    ctx.stroke();
    ctx.restore();
}

function drawBoar(ctx, w, h, color, accentColor, legWiggle) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 3);
    ctx.lineTo(-w / 2, -h / 3);
    ctx.lineTo(w / 3, -h / 2);
    ctx.lineTo(w / 2, h / 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(w / 2 - 2, -h / 6, 5, 6);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 4, 0);
    ctx.lineTo(w / 2, -6);
    ctx.lineTo(w / 2 + 2, 0);
    ctx.fill();
    ctx.fillStyle = accentColor;
    ctx.fillRect(-w / 3, h / 3, 7, 6 + legWiggle);
    ctx.fillRect(w / 4, h / 3, 7, 6 - legWiggle);
}

function drawFox(ctx, w, h, color, accentColor, legWiggle) {
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -h / 2, w, h * 0.7);
    ctx.beginPath();
    ctx.moveTo(w / 3, -h / 2);
    ctx.lineTo(w / 2 + 8, -h / 4);
    ctx.lineTo(w / 3, 0);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2 - 10, -h / 3, 12, 8);
    ctx.fillStyle = accentColor;
    ctx.fillRect(-w / 2 - 14, -h / 3, 4, 8);
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(-w / 3, h / 5, 3, 7 + legWiggle);
    ctx.fillRect(w / 4, h / 5, 3, 7 - legWiggle);
}

function drawBear(ctx, w, h, color, accentColor, legWiggle) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w / 2 - 4, -h / 4, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w / 2 - 10, -h / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accentColor;
    ctx.fillRect(-w / 3, h / 3, 12, 12 + legWiggle);
    ctx.fillRect(w / 4, h / 3, 12, 12 - legWiggle);
}

function drawHuman(ctx, w, h, color, accentColor, legWiggle) {
    ctx.fillStyle = accentColor;
    ctx.fillRect(-w * 0.3, -h * 0.1, w * 0.6, h * 0.5);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -h * 0.25, w * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#332211';
    ctx.beginPath();
    ctx.arc(0, -h * 0.3, w * 0.2, Math.PI, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#445566';
    ctx.fillRect(-w * 0.15, h * 0.1, w * 0.1, h * 0.3 + legWiggle);
    ctx.fillRect(w * 0.05, h * 0.1, w * 0.1, h * 0.3 - legWiggle);
    ctx.fillStyle = color;
    ctx.fillRect(-w * 0.35, -h * 0.05, w * 0.08, h * 0.25);
    ctx.fillRect(w * 0.27, -h * 0.05, w * 0.08, h * 0.25);
}

// ============================================================
// СОЗДАНИЕ 3D МОДЕЛИ ЖИВОТНОГО
// ============================================================
const _animalAssetCache = {};

function getAnimalAssets(typeId) {
    if (_animalAssetCache[typeId]) return _animalAssetCache[typeId];

    const type = ANIMAL_TYPES[typeId] || ANIMAL_TYPES.DOG;

    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cx = size / 2;
    const cy = size / 2;
    const scale = size / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = type.width * scale * 1.2;
    const h = type.height * scale * 1.2;
    const color = '#' + type.color.toString(16).padStart(6, '0');
    const accentColor = '#' + type.accentColor.toString(16).padStart(6, '0');
    const legWiggle = 0;

    ctx.save();
    ctx.translate(cx, cy);

    switch (type.design) {
        case 'cat': drawCat(ctx, w, h, color, accentColor, legWiggle); break;
        case 'dog': drawDog(ctx, w, h, color, accentColor, legWiggle); break;
        case 'deer': drawDeer(ctx, w, h, color, accentColor, legWiggle); break;
        case 'boar': drawBoar(ctx, w, h, color, accentColor, legWiggle); break;
        case 'fox': drawFox(ctx, w, h, color, accentColor, legWiggle); break;
        case 'bear': drawBear(ctx, w, h, color, accentColor, legWiggle); break;
        case 'human': drawHuman(ctx, w, h, color, accentColor, legWiggle); break;
    }
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        opacity: 1.0
    });

    const shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.35
    });
    const shadowGeometry = new THREE.CircleGeometry(type.width * 0.55, 8);

    const assets = { type, texture, spriteMaterial, shadowMaterial, shadowGeometry };
    _animalAssetCache[typeId] = assets;
    return assets;
}

function createAnimalMesh(typeId) {
    const assets = getAnimalAssets(typeId);
    const type = assets.type;
    const group = new THREE.Group();

    const sprite = new THREE.Sprite(assets.spriteMaterial);
    sprite.scale.set(type.width * 1.2, type.height * 1.2, 1);
    sprite.position.y = type.height * 0.5;
    group.add(sprite);

    const shadow = new THREE.Mesh(assets.shadowGeometry, assets.shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    group.userData = {
        type: typeId,
        sprite: sprite
    };
    return group;
}

// ============================================================
// МЕНЕДЖЕР СПАВНА С ГАРАНТИРОВАННЫМИ ВИДАМИ
// ============================================================
class AnimalSpawner {
    constructor(scene, roadWidth, roadCenter, finishZ, triggerLookahead) {
        this.scene = scene;
        this.roadWidth = roadWidth;
        this.roadCenter = roadCenter;
        this.finishZ = finishZ;
        this.triggerLookahead = triggerLookahead;
        this.animals = [];
        this.spawnTimer = 0;
        this.minSpawnInterval = 1.0;
        this.maxSpawnInterval = 2.5;
        this.nextSpawnTime = this.getRandomInterval();
        this.totalSpawned = 0;
        this.maxAnimals = 35;
        this.enabled = true;
        
        this.mandatoryPool = [];
        this.speciesCount = {};
        ANIMAL_KEYS.forEach(key => { this.speciesCount[key] = 0; });
        
        this.buildMandatoryPool();
        this.shufflePool();
    }

    buildMandatoryPool() {
        // ОБЯЗАТЕЛЬНЫЕ ВИДЫ (ГАРАНТИРОВАННО)
        const mandatory = [
            { type: 'DOG', count: 3 },
            { type: 'HUMAN', count: 4 },
            { type: 'DEER', count: 2 },
            { type: 'BEAR', count: 4 },
            { type: 'CAT', count: 3 },
            { type: 'FOX', count: 3 },
            { type: 'BOAR', count: 2 },
        ];
        
        this.mandatoryPool = [];
        
        mandatory.forEach(item => {
            for (let i = 0; i < item.count; i++) {
                this.mandatoryPool.push(item.type);
            }
        });
        
        console.log(`🐕🐄🐘👤 Пул обязательных животных: ${this.mandatoryPool.length} особей`);
        console.log(`   🐕 Собаки: 3, 👤 Люди: 4, 🦌 Олени: 2, 🐻 Медведи: 4, 🐈 Коты: 3, 🦊 Лисы: 3, 🐗 Кабаны: 2`);
    }

    shufflePool() {
        for (let i = this.mandatoryPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.mandatoryPool[i], this.mandatoryPool[j]] = [this.mandatoryPool[j], this.mandatoryPool[i]];
        }
    }

    getRandomInterval() {
        return Math.random() * (this.maxSpawnInterval - this.minSpawnInterval) + this.minSpawnInterval;
    }

    getNextSpecies() {
        if (this.mandatoryPool.length > 0) {
            const species = this.mandatoryPool.pop();
            if (this.mandatoryPool.length === 0) {
                console.log('🔄 Все обязательные животные появились! Добавляем случайных...');
            }
            return species;
        }
        
        const keys = ANIMAL_KEYS;
        return keys[Math.floor(Math.random() * keys.length)];
    }

    update(deltaTime, playerZ) {
        if (!this.enabled || playerZ < this.finishZ) return;

        this.spawnTimer += deltaTime;
        const totalActive = this.animals.length;

        if (this.spawnTimer >= this.nextSpawnTime && totalActive < this.maxAnimals) {
            this.spawnTimer = 0;
            this.nextSpawnTime = this.getRandomInterval();

            const spawnZ = playerZ - 60 - Math.random() * 20;
            if (spawnZ > this.finishZ) {
                const typeId = this.getNextSpecies();
                const animal = this.createAnimal(spawnZ, typeId);
                this.animals.push(animal);
                this.totalSpawned++;
                this.speciesCount[typeId] = (this.speciesCount[typeId] || 0) + 1;
                
                if (this.totalSpawned % 3 === 0) {
                    const remaining = this.mandatoryPool.length;
                    console.log(`🔄 Спавн #${this.totalSpawned}: ${ANIMAL_TYPES[typeId].name} (осталось в пуле: ${remaining})`);
                }
            }
        }

        for (let i = this.animals.length - 1; i >= 0; i--) {
            const animal = this.animals[i];
            this.updateAnimal(animal, deltaTime, playerZ);
            if (animal.triggered) animal.aliveTime += deltaTime;

            const staleTimeout = animal.aliveTime > 15;
            if (animal.z > playerZ + 40 || animal.hit || staleTimeout || animal.z < playerZ - 180) {
                this.disposeAnimal(animal);
                if (animal.speciesKey) {
                    this.speciesCount[animal.speciesKey] = Math.max(0, (this.speciesCount[animal.speciesKey] || 0) - 1);
                }
                this.animals.splice(i, 1);
            }
        }
    }

    createAnimal(z, forcedType = null) {
        const typeId = forcedType || this.getNextSpecies();
        const type = ANIMAL_TYPES[typeId];

        const mesh = createAnimalMesh(typeId);

        const fromLeft = Math.random() < 0.5;
        const startX = fromLeft ? -(this.roadWidth / 2 + 2) : (this.roadWidth / 2 + 2);
        const endX = -startX;
        if (!fromLeft) mesh.scale.x = -1;
        mesh.position.set(startX, 0, z);
        mesh.visible = false;
        this.scene.add(mesh);

        return {
            type: 'animal',
            speciesKey: typeId,
            speciesId: type.id,
            animalType: typeId,
            mesh: mesh,
            z: z,
            x: startX,
            startX: startX,
            endX: endX,
            duration: 1.1 + Math.random() * 0.7,
            elapsed: 0,
            triggered: false,
            aliveTime: 0,
            radius: type.radius || 0.5,
            penalty: type.penalty || 0.35,
            timePenalty: type.timePenalty || 4,
            speedZ: type.speedZ || 0.02,
            speedCross: type.speedCross || 3.0,
            direction: fromLeft ? 1 : -1,
            hit: false
        };
    }

    updateAnimal(animal, deltaTime, playerZ) {
        if (!animal.triggered) {
            const distanceAhead = playerZ - animal.z;
            if (distanceAhead > 0 && distanceAhead <= this.triggerLookahead) {
                animal.triggered = true;
                animal.mesh.visible = true;
            }
            return;
        }

        if (animal.elapsed < animal.duration) {
            animal.elapsed += deltaTime;
            const t = Math.min(animal.elapsed / animal.duration, 1);
            const easedT = t * t * (3 - 2 * t);
            animal.x = animal.startX + (animal.endX - animal.startX) * easedT;
            animal.mesh.position.x = animal.x;
        }

        const t2 = Math.min(animal.elapsed / animal.duration, 1);
        const zMove = animal.speedZ || 0.02;
        animal.z -= zMove * 60 * deltaTime * (1 + t2 * 0.4);
        animal.mesh.position.z = animal.z;
    }

    disposeAnimal(animal) {
        this.scene.remove(animal.mesh);
    }

    getActiveAnimals() {
        return this.animals.filter(a => a.triggered && !a.hit);
    }

    clear() {
        this.animals.forEach(a => this.disposeAnimal(a));
        this.animals = [];
        this.totalSpawned = 0;
        ANIMAL_KEYS.forEach(key => { this.speciesCount[key] = 0; });
        this.buildMandatoryPool();
        this.shufflePool();
    }

    getStats() {
        const species = {};
        ANIMAL_KEYS.forEach(key => {
            species[key] = this.speciesCount[key] || 0;
        });
        return {
            total: this.totalSpawned,
            active: this.animals.length,
            triggered: this.animals.filter(a => a.triggered && !a.hit).length,
            species: species,
            remainingInPool: this.mandatoryPool.length
        };
    }
}

// ============================================================
// ЗАПУСК ИГРЫ
// ============================================================
let soundEngine = null;

async function startGame() {
    const quality = await showQualityMenu();
    initGame(quality);
}

// ============================================================
// НАСТРОЙКИ ГРАФИКИ
// ============================================================
function getConfig(quality) {
    const configs = {
        high: {
            trees: 40,
            shadowMapSize: 1024,
            textureSize: 128,
            fogFar: 200,
            shadows: true,
            treeComplexity: 4,
            label: '🔥 Высокое',
            particles: true,
            particleDensity: 3
        },
        medium: {
            trees: 25,
            shadowMapSize: 512,
            textureSize: 128,
            fogFar: 160,
            shadows: true,
            treeComplexity: 3,
            label: '⚡ Среднее',
            particles: true,
            particleDensity: 2
        },
        low: {
            trees: 15,
            shadowMapSize: 0,
            textureSize: 64,
            fogFar: 110,
            shadows: false,
            treeComplexity: 2,
            label: '🚀 Низкое',
            particles: true,
            particleDensity: 1
        }
    };
    return configs[quality] || configs.medium;
}

// ============================================================
// ОСНОВНАЯ ИГРА
// ============================================================
function initGame(quality) {
    const CONFIG = getConfig(quality);

    // ============================================================
    // КОНСТАНТЫ (БЕЗ СУЖЕНИЙ)
    // ============================================================
    const TRACK_LENGTH = 1800;
    const TRACK_WIDTH = 6;
    const LANE_WIDTH = 2;
    const TOTAL_LANES = 3;
    const CAR_WIDTH = 0.8;

    const TIME_LIMIT = 120;
    const MAX_STRIKES = 5;
    const TRIGGER_LOOKAHEAD = 24;
    const FOG_NEAR = 45;

    const START_Z = TRACK_LENGTH / 2 - 60;
    const FINISH_Z = -TRACK_LENGTH / 2 + 20;

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

    function formatTime(time) {
        if (time === undefined || time === null || time === Infinity) return '--';
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        const ms = Math.floor((time % 1) * 10);
        return `${m}:${String(s).padStart(2, '0')}.${ms}`;
    }

    // Удаление старых элементов
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
            background: rgba(0,0,0,0.6);
            padding: 15px 25px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.15);
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
                <div style="font-size:11px;color:#bbb;margin-top:4px;">Дистанция до финиша</div>
            </div>
            <div style="margin-top:8px;font-size:12px;color:#888;">
                ${CONFIG.label} · Нажмите Q для выхода · 3 полосы
            </div>
        `;
        document.body.appendChild(hud);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes timePenaltyFloat {
                0% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-30px); }
            }
            @keyframes timeHitPulse {
                0% { transform: scale(1.4); }
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
            left: ${rect.right + 10}px;
            top: ${rect.top - 2}px;
            color: #ff3333;
            font-weight: bold;
            font-size: 18px;
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
    // ЭКРАН ОКОНЧАНИЯ
    // ============================================================
    function showEndScreen(state, timeTaken) {
        const screen = document.createElement('div');
        screen.id = 'finish-screen';
        screen.style.cssText = `
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.9);
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
            <div style="background: rgba(0,0,0,0.95); padding: 50px 60px; border-radius: 25px; border: 2px solid ${color}; text-align: center; max-width: 520px; box-shadow: 0 20px 80px rgba(0,0,0,0.9);">
                <h1 style="font-size:42px;color:${color};margin-bottom:10px;">${title}</h1>
                <div style="font-size:18px;color:#fff;margin:15px 0;">${message}</div>
                <div style="display:flex;gap:15px;justify-content:center;flex-wrap:wrap;">
                    <button onclick="location.reload()" style="padding:12px 30px; border:2px solid ${color}; border-radius:12px; background: rgba(255,255,255,0.06); color:#fff; font-size:18px; cursor:pointer; transition: all 0.3s; font-weight:bold;">
                        🔄 Заново
                    </button>
                </div>
                <div style="margin-top:15px;font-size:14px;color:#666;">Нажмите R для быстрого рестарта</div>
            </div>
        `;
        document.body.appendChild(screen);

        if (state === 'win') {
            soundEngine.playFinishSound();
        } else {
            soundEngine.playCrashSound(1.2);
        }
    }

    function endGame(state) {
        if (gameState !== 'racing') return;
        gameState = state;

        soundEngine.stopEngine();
        soundEngine.stopMusic();
        animalSpawner.clear();

        document.removeEventListener('keydown', keydownHandler);
        document.removeEventListener('keyup', keyupHandler);
        window.removeEventListener('resize', resizeHandler);

        const hud = document.getElementById('game-hud');
        if (hud) hud.remove();

        const timeTaken = raceTime;
        setTimeout(() => showEndScreen(state, timeTaken), state === 'crash' ? 350 : 500);
    }

    // ============================================================
    // ЗВУК
    // ============================================================
    if (soundEngine) {
        soundEngine.dispose();
    }
    soundEngine = new SoundEngine();
    const soundInit = soundEngine.init();
    if (soundInit) {
        setTimeout(() => soundEngine.startMusic(), 1000);
    }

    // ============================================================
    // СЦЕНА
    // ============================================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x4a8db7);
    scene.fog = new THREE.Fog(0x4a8db7, FOG_NEAR, CONFIG.fogFar);

    const particleSystem = new ParticleSystem(scene);
    if (!CONFIG.particles) particleSystem.enabled = false;

    // ============================================================
    // ОСВЕЩЕНИЕ
    // ============================================================
    const ambient = new THREE.AmbientLight(0x446688, 0.65);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0x88ccff, 0x445533, 0.55);
    scene.add(hemi);

    const sunLight = new THREE.DirectionalLight(0xffeedd, 1.8);
    sunLight.position.set(30, 50, 20);
    sunLight.castShadow = CONFIG.shadows;
    if (CONFIG.shadows) {
        sunLight.shadow.mapSize.width = CONFIG.shadowMapSize;
        sunLight.shadow.mapSize.height = CONFIG.shadowMapSize;
        sunLight.shadow.camera.near = 1;
        sunLight.shadow.camera.far = 150;
        sunLight.shadow.camera.left = -25;
        sunLight.shadow.camera.right = 25;
        sunLight.shadow.camera.top = 25;
        sunLight.shadow.camera.bottom = -25;
        sunLight.shadow.bias = -0.0004;
        sunLight.shadow.normalBias = 0.025;
    }
    sunLight.target = new THREE.Object3D();
    sunLight.target.position.set(0, 0, 0);
    scene.add(sunLight.target);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.35);
    fillLight.position.set(-20, 30, -10);
    scene.add(fillLight);

    // ============================================================
    // ФАРЫ МАШИНЫ
    // ============================================================
    const headlight1 = new THREE.SpotLight(0xffeedd, 0);
    headlight1.angle = 0.4;
    headlight1.penumbra = 0.7;
    headlight1.decay = 1.5;
    headlight1.distance = 40;
    headlight1.position.set(-0.3, 0.3, -0.8);
    scene.add(headlight1);

    const headlight2 = new THREE.SpotLight(0xffeedd, 0);
    headlight2.angle = 0.4;
    headlight2.penumbra = 0.7;
    headlight2.decay = 1.5;
    headlight2.distance = 40;
    headlight2.position.set(0.3, 0.3, -0.8);
    scene.add(headlight2);

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
    renderer.toneMappingExposure = 1.25;
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
    // ЗЕМЛЯ И ТРАССА
    // ============================================================
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(600, TRACK_LENGTH + 200),
        new THREE.MeshStandardMaterial({ map: createGrassTexture(), roughness: 1, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = CONFIG.shadows;
    scene.add(ground);

    const trackMat = new THREE.MeshStandardMaterial({
        map: createAsphaltTexture(),
        roughness: 0.75,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    const track = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_WIDTH, TRACK_LENGTH), trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.set(0, 0.01, 0);
    track.receiveShadow = CONFIG.shadows;
    scene.add(track);

    // ============================================================
    // РАЗМЕТКА ПОЛОС (3 полосы)
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
    // БОРДЮРЫ
    // ============================================================
    function createCurbs() {
        const geo = new THREE.BoxGeometry(0.15, 0.06, 0.35);
        const spots = [];
        for (let i = -TRACK_LENGTH / 2; i <= TRACK_LENGTH / 2; i += 1.2) {
            for (const side of [-1, 1]) {
                spots.push({ x: side * (TRACK_WIDTH / 2 + 0.15), z: i, isRed: Math.floor(i * 2) % 2 === 0 });
            }
        }
        const mat1 = new THREE.MeshStandardMaterial({ color: 0xff2200, roughness: 0.4, emissive: 0xff0000, emissiveIntensity: 0.05 });
        const mat2 = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
        const mesh1 = new THREE.InstancedMesh(geo, mat1, spots.filter(s => s.isRed).length);
        const mesh2 = new THREE.InstancedMesh(geo, mat2, spots.filter(s => !s.isRed).length);
        const dummy = new THREE.Object3D();
        let idx1 = 0, idx2 = 0;
        spots.forEach(p => {
            dummy.position.set(p.x, 0.03, p.z);
            dummy.updateMatrix();
            const mesh = p.isRed ? mesh1 : mesh2;
            const idx = p.isRed ? idx1++ : idx2++;
            mesh.setMatrixAt(idx, dummy.matrix);
        });
        if (idx1 > 0) { mesh1.castShadow = CONFIG.shadows; mesh1.receiveShadow = CONFIG.shadows; scene.add(mesh1); }
        if (idx2 > 0) { mesh2.castShadow = CONFIG.shadows; mesh2.receiveShadow = CONFIG.shadows; scene.add(mesh2); }
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
    // ЗОНЫ: МОКРЫЙ АСФАЛЬТ И НОЧЬ
    // ============================================================
    function createWetZone(zStart, zEnd) {
        const geo = new THREE.PlaneGeometry(TRACK_WIDTH, zStart - zEnd);
        const mat = new THREE.MeshStandardMaterial({ 
            color: 0x1c2c3c, 
            roughness: 0.05, 
            metalness: 0.6, 
            transparent: true, 
            opacity: 0.3 
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(0, 0.015, (zStart + zEnd) / 2);
        scene.add(mesh);
        return { type: 'wet', zStart, zEnd };
    }

    function createNightZone(zStart, zEnd) {
        const fogFar = Math.max(CONFIG.fogFar * 0.45, FOG_NEAR + 30);
        return { type: 'night', zStart, zEnd, fogFar };
    }

    function generateZones() {
        const wetZones = [];
        const nightZones = [];

        const totalDistance = START_Z - FINISH_Z;
        const numSlots = 8;
        const slotLength = totalDistance / numSlots;

        for (let i = 1; i < numSlots - 1; i++) {
            if (Math.random() < 0.5) continue;

            const slotZStart = START_Z - i * slotLength;
            const zoneLen = slotLength * (0.5 + Math.random() * 0.3);
            const zStart = slotZStart;
            const zEnd = slotZStart - zoneLen;

            const roll = Math.random();
            if (roll < 0.5) {
                wetZones.push(createWetZone(zStart, zEnd));
            } else {
                nightZones.push(createNightZone(zStart, zEnd));
            }
        }

        return { wetZones, nightZones };
    }

    const { wetZones, nightZones } = generateZones();
    console.log(`🌐 Зон: мокрых ${wetZones.length}, ночных ${nightZones.length}`);

    function getActiveZone(list, z) {
        for (let i = 0; i < list.length; i++) {
            const zn = list[i];
            if (z <= zn.zStart && z >= zn.zEnd) return zn;
        }
        return null;
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
    // МАШИНА ИГРОКА
    // ============================================================
    function createCar(color = 0xff3333, isPlayer = false) {
        const car = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.2, metalness: 0.7 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 1.4), bodyMat);
        body.position.y = 0.2;
        body.castShadow = CONFIG.shadows;
        body.receiveShadow = CONFIG.shadows;
        car.add(body);

        const cabinMat = new THREE.MeshStandardMaterial({ color: isPlayer ? 0x88ddff : 0x88ccff, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.8 });
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5), cabinMat);
        cabin.position.set(0, 0.38, 0.05);
        cabin.castShadow = CONFIG.shadows;
        car.add(cabin);

        const lightMat = new THREE.MeshStandardMaterial({ color: 0xffff88, emissive: 0xffff44, emissiveIntensity: 0.8 });
        const l1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8), lightMat);
        l1.position.set(-0.2, 0.14, -0.7);
        car.add(l1);
        const l2 = l1.clone();
        l2.position.x = 0.2;
        car.add(l2);

        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.4
        });
        const shadowGeo = new THREE.PlaneGeometry(1.0, 1.6);
        const fakeShadow = new THREE.Mesh(shadowGeo, shadowMat);
        fakeShadow.rotation.x = -Math.PI / 2;
        fakeShadow.position.y = 0.015;
        car.add(fakeShadow);

        const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
        const wheelPos = [
            [-0.35, 0.06, 0.5],
            [0.35, 0.06, 0.5],
            [-0.35, 0.06, -0.5],
            [0.35, 0.06, -0.5]
        ];
        wheelPos.forEach(p => {
            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8), tireMat);
            tire.rotation.x = Math.PI / 2;
            tire.position.set(p[0], p[1], p[2]);
            tire.castShadow = CONFIG.shadows;
            car.add(tire);
        });
        return car;
    }

    // ============================================================
    // ЖИВОТНЫЕ
    // ============================================================
    const animalSpawner = new AnimalSpawner(scene, TRACK_WIDTH, 0, FINISH_Z, TRIGGER_LOOKAHEAD);

    function initAnimals() {
        // Создаем ВСЕ виды животных на старте, чтобы они точно были видны
        const startZ = START_Z - 10;
        ANIMAL_KEYS.forEach((typeId, index) => {
            const z = startZ - index * 8 - Math.random() * 5;
            if (z > FINISH_Z) {
                const animal = animalSpawner.createAnimal(z, typeId);
                animal.triggered = true;
                animal.mesh.visible = true;
                animalSpawner.animals.push(animal);
                animalSpawner.totalSpawned++;
                animalSpawner.speciesCount[typeId] = (animalSpawner.speciesCount[typeId] || 0) + 1;
            }
        });
        console.log(`🚧 Начальных животных: ${animalSpawner.animals.length}`);
        const types = animalSpawner.animals.map(a => ANIMAL_TYPES[a.speciesKey]?.name || a.speciesKey);
        console.log(`🐕🐈🦌🐗🦊🐻👤 Виды на старте: ${types.join(', ')}`);
    }
    initAnimals();

    // ============================================================
    // СТОЛКНОВЕНИЯ
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
        if (gameState !== 'racing') return;
        strikes++;
        speed *= obs.penalty || 0.35;
        stunTimer = 0.4;
        shakeTime = 0.35;

        const penaltySeconds = obs.timePenalty || 4;
        raceTime += penaltySeconds;
        showTimePenaltyPopup(penaltySeconds);

        soundEngine.playCrashSound(obs.type === 'car' ? 1 : 0.6);

        if (CONFIG.particles) {
            particleSystem.emit(_v.pos.set(xPos, 0.2, zPos), _v.vel.set(0, 0.5, 0), 15, 0.25);
        }
        updateStrikesDisplay();

        if (strikes >= MAX_STRIKES) {
            endGame('crash');
        }
    }

    // ============================================================
    // УПРАВЛЕНИЕ
    // ============================================================
    const keys = { w: false, s: false, a: false, d: false };

    const keydownHandler = (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w' || k === 'ц') { keys.w = true;
            e.preventDefault(); }
        if (k === 's' || k === 'ы') { keys.s = true;
            e.preventDefault(); }
        if (k === 'a' || k === 'ф') { keys.a = true;
            e.preventDefault(); }
        if (k === 'd' || k === 'в') { keys.d = true;
            e.preventDefault(); }
        if (k === 'q') { location.reload(); }
        if (k === 'r' && gameState !== 'racing') { location.reload(); }
    };

    const keyupHandler = (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w' || k === 'ц') { keys.w = false;
            e.preventDefault(); }
        if (k === 's' || k === 'ы') { keys.s = false;
            e.preventDefault(); }
        if (k === 'a' || k === 'ф') { keys.a = false;
            e.preventDefault(); }
        if (k === 'd' || k === 'в') { keys.d = false;
            e.preventDefault(); }
    };

    document.addEventListener('keydown', keydownHandler);
    document.addEventListener('keyup', keyupHandler);

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

    const timeEl = document.getElementById('timeDisplay');
    const speedEl = document.getElementById('speedDisplay');
    const progressBar = document.getElementById('progressBar');

    function formatCountdown(sec) {
        sec = Math.max(0, Math.ceil(sec));
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    // ============================================================
    // ИГРОК
    // ============================================================
    const playerCar = createCar(0xff2200, true);
    let zPos = TRACK_LENGTH / 2 - 5;
    let xPos = 0;
    let xVelocity = 0;
    const MAX_X_SPEED = 0.55;
    const DRY_DAMPING = 0.82;
    const DRY_STEER = 3.2;
    let gameState = 'racing';
    playerCar.position.set(xPos, 0.1, zPos);
    scene.add(playerCar);

    // ============================================================
    // RESIZE
    // ============================================================
    const resizeHandler = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resizeHandler);

    // ============================================================
    // ИГРОВОЙ ЦИКЛ (БЕЗ СУЖЕНИЙ)
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

        const wetZone = getActiveZone(wetZones, zPos);
        const nightZone = getActiveZone(nightZones, zPos);
        const inWet = !!wetZone;

        // ============================================================
        // ГАЗ / ТОРМОЗ (мокрая дорога = хуже тормоза)
        // ============================================================
        const effectiveBrake = inWet ? BRAKE_FORCE * 0.7 : BRAKE_FORCE;

        if (stunTimer > 0) {
            stunTimer -= dt;
            if (speed > 0) speed = Math.max(speed - FRICTION_FORCE, 0);
        } else if (keys.w) {
            speed = Math.min(speed + ACCELERATION, MAX_SPEED);
        } else if (keys.s) {
            speed = Math.max(speed - effectiveBrake, -MAX_SPEED * 0.2);
        } else {
            if (speed > 0) speed = Math.max(speed - FRICTION_FORCE, 0);
        }

        soundEngine.update(speed);

        // ============================================================
        // РУЛЕНИЕ - физика мокрого асфальта (увеличение скольжения на 50%)
        // ============================================================
        const dryFriction = 1 - DRY_DAMPING;           // "тормозящая" часть демпфера
        const wetFriction = dryFriction * 0.5;          // на мокром трение вдвое слабее -> скольжение +100% по времени затухания заноса
        const effectiveDamping = inWet ? (1 - wetFriction) : DRY_DAMPING;
        const effectiveSteer = inWet ? DRY_STEER * 0.65 : DRY_STEER;

        if (keys.a) {
            xVelocity = Math.max(xVelocity - effectiveSteer * dt, -MAX_X_SPEED);
        } else if (keys.d) {
            xVelocity = Math.min(xVelocity + effectiveSteer * dt, MAX_X_SPEED);
        } else {
            xVelocity *= effectiveDamping;
            if (Math.abs(xVelocity) < 0.001) xVelocity = 0;
        }
        xPos += xVelocity * dt * 15;

        // Ограничение по ширине дороги (ПОСТОЯННАЯ ШИРИНА, БЕЗ СУЖЕНИЙ)
        const globalMaxX = TRACK_WIDTH / 2 - CAR_WIDTH / 2 - 0.1;
        xPos = clamp(xPos, -globalMaxX, globalMaxX);

        // ============================================================
        // ДВИЖЕНИЕ
        // ============================================================
        const moveAmount = speed * 60 * dt;
        zPos -= moveAmount;
        zPos = Math.min(zPos, START_Z + 15);

        // ============================================================
        // ПЫЛЬ
        // ============================================================
        if (CONFIG.particles && Math.abs(speed) > 0.05) {
            const pos = playerCar.position;
            const density = CONFIG.particleDensity;
            const isDrifting = Math.abs(xVelocity) > 0.2;

            for (let side of [-0.35, 0.35]) {
                _v.p1.set(pos.x + side, pos.y, pos.z + 0.6);
                _v.vel.set(
                    -xVelocity * 0.5 + (Math.random() - 0.5) * 0.2,
                    0.2 + Math.random() * 0.3,
                    speed * 1.5 + Math.random() * 0.5
                );
                const count = isDrifting ? density * 2 : density;
                const size = isDrifting ? 0.22 : 0.15;
                particleSystem.emit(_v.p1, _v.vel, count, size);
            }
        }

        // ============================================================
        // ИГРОК
        // ============================================================
        playerCar.position.set(xPos, 0.1, zPos);
        playerCar.rotation.z = lerp(playerCar.rotation.z, -xVelocity * 0.04, 0.12);

        // Обновляем позицию фар
        headlight1.position.copy(playerCar.position);
        headlight1.position.x -= 0.3;
        headlight1.position.y += 0.3;
        headlight1.position.z -= 0.8;
        headlight1.target.position.copy(playerCar.position);
        headlight1.target.position.z -= 10;
        
        headlight2.position.copy(playerCar.position);
        headlight2.position.x += 0.3;
        headlight2.position.y += 0.3;
        headlight2.position.z -= 0.8;
        headlight2.target.position.copy(playerCar.position);
        headlight2.target.position.z -= 10;

        // ============================================================
        // ЖИВОТНЫЕ
        // ============================================================
        animalSpawner.update(dt, zPos);

        if (gameState === 'racing') {
            const activeAnimals = animalSpawner.getActiveAnimals();
            activeAnimals.forEach(obs => {
                if (obs.hit) return;
                const dx = xPos - obs.x;
                const dz = zPos - obs.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < obs.radius + 0.45) {
                    obs.hit = true;
                    handleObstacleHit(obs);
                }
            });
        }

        // ============================================================
        // ПОБЕДА / ПОРАЖЕНИЕ
        // ============================================================
        if (gameState === 'racing' && zPos <= FINISH_Z - 15) {
            endGame('win');
        }
        if (gameState === 'racing' && raceTime >= TIME_LIMIT) {
            endGame('timeout');
        }

        // ============================================================
        // НОЧНАЯ ЗОНА (плавное затемнение + фары)
        // ============================================================
        const targetFogFar = nightZone ? nightZone.fogFar : CONFIG.fogFar;
        scene.fog.far = lerp(scene.fog.far, targetFogFar, 0.06);
        
        const targetAmbient = nightZone ? 0.08 : 0.65;
        ambient.intensity = lerp(ambient.intensity, targetAmbient, 0.06);
        
        const targetHemi = nightZone ? 0.05 : 0.55;
        hemi.intensity = lerp(hemi.intensity, targetHemi, 0.06);
        
        // Включаем фары в ночной зоне
        const headlightIntensity = nightZone ? 1.8 : 0;
        headlight1.intensity = lerp(headlight1.intensity, headlightIntensity, 0.08);
        headlight2.intensity = lerp(headlight2.intensity, headlightIntensity, 0.08);

        // ============================================================
        // КАМЕРА
        // ============================================================
        const targetCamPos = _v.p3.set(xPos * 0.35, 4.2, zPos + 9);
        camera.position.lerp(targetCamPos, 0.08);
        camera.lookAt(_v.p4.set(xPos, 0.5, zPos - 12));

        // ============================================================
        // ТЕНИ
        // ============================================================
        if (CONFIG.shadows && sunLight.shadow.camera) {
            sunLight.position.set(xPos + 30, 50, zPos + 20);
            sunLight.target.position.set(xPos, 0, zPos);
            sunLight.target.updateMatrixWorld();
        }

        // ============================================================
        // ТРЯСКА
        // ============================================================
        if (shakeTime > 0) {
            shakeTime -= dt;
            const power = Math.max(0, shakeTime) * 0.35;
            camera.position.x += (Math.random() - 0.5) * power;
            camera.position.y += (Math.random() - 0.5) * power;
        }

        // ============================================================
        // HUD
        // ============================================================
        if (speedEl) speedEl.textContent = Math.round(Math.abs(speed) * 580);
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

        // ============================================================
        // СТАТИСТИКА
        // ============================================================
        if (Math.floor(raceTime) % 10 === 0 && Math.floor(raceTime) !== Math.floor(raceTime - dt)) {
            const stats = animalSpawner.getStats();
            const speciesStr = Object.entries(stats.species)
                .filter(([k, v]) => v > 0)
                .map(([k, v]) => `${ANIMAL_TYPES[k]?.emoji || ''} ${ANIMAL_TYPES[k]?.name || k}: ${v}`)
                .join(', ');
            console.log(`📊 Животных: всего ${stats.total}, активно ${stats.active}, в зоне ${stats.triggered}`);
            console.log(`   Виды: ${speciesStr}`);
            console.log(`   Осталось в пуле: ${stats.remainingInPool}`);
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

    animate(performance.now());
}

// ============================================================
// ЗАПУСК
// ============================================================
startGame();