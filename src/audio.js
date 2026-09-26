/**
 * SoundEngine — Web Audio (двигатель, SFX) + HTML5 (музыка гонки)
 */
class SoundEngine {
    constructor() {
        this.audioCtx = null;
        this.engineNode = null;
        this.engineGain = null;
        this.isPlaying = false;
        this.engineFrequency = 80;
        this.engineVolume = 0.10;
        this.speed = 0;
        this.maxSpeed = 0.35;
        this.enabled = true;
        this.initialized = false;

        // Музыка
        this.musicGain = null;
        this.musicBuffer = null;
        this.currentMusicSource = null;
        this.isMusicPlaying = false;
        this.musicStarted = false;
        this.musicVolume = 0.55;
        this.engineVolumeMultiplier = 0.6;
        this.musicUrl = 'music/race-music.mp3';
        this.menuMusicUrl = 'music/menu-music.mp3';
        this.menuAudio = null;
        this.menuMusicPlaying = false;
        this.musicLoaded = false;
        this.musicLoadPromise = null;
        this.useProceduralFallback = true;

        this.noiseBuffer = null;
        this.musicNodes = [];
        this.musicInterval = null;

        this._engineId = 0;
        this._isEngineStopping = false;
        this._engineStopTimeout = null;

        this.engineNode2 = null;
        this.engineNode2Gain = null;
        this.engineFilter = null;
        this.carMaxSpeed = 0.35;
    }

    init() {
        if (this.initialized && this.audioCtx) return true;
        try {
            // Лениво: создаём контекст; resume — по жесту (уже есть listeners)
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            console.log('🔊 AudioContext создан:', this.audioCtx.state);

            // Двигатель
            this.engineGain = this.audioCtx.createGain();
            this.engineGain.gain.value = 0;
            this.engineGain.connect(this.audioCtx.destination);

            // Музыка
            this.musicGain = this.audioCtx.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.audioCtx.destination);

            this.noiseBuffer = this.createNoiseBuffer();
            this.enabled = true;
            this.initialized = true;

            this.createVolumeControls();

            const resumeAudio = () => {
                if (this.audioCtx && this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume().then(() => console.log('🔊 AudioContext resumed')).catch(()=>{});
                }
                // В меню — только меню-музыка; в гонке — гоночный трек
                const racing = !!(window.__inRace);
                if (racing) {
                    if (!this.isMusicPlaying) this.startMusic();
                } else {
                    this.startMenuMusic();
                }
            };
            document.addEventListener('click', resumeAudio);
            document.addEventListener('keydown', resumeAudio);
            document.addEventListener('touchstart', resumeAudio, { passive: true });

            return true;
        } catch (e) {
            console.warn('⚠️ Аудио не поддерживается:', e);
            this.enabled = false;
            return false;
        }
    }

    createNoiseBuffer() {
        if (!this.audioCtx) return null;
        try {
            const bufferSize = Math.floor(this.audioCtx.sampleRate * 0.2);
            const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }
            return buffer;
        } catch (e) { return null; }
    }

    createVolumeControls() {
        const old = document.getElementById('volume-controls');
        if (old) old.remove();

        const controls = document.createElement('div');
        controls.id = 'volume-controls';
        
        const status = this.musicLoaded ? '🎵 MP3' : '⏳ Загрузка...';
        
        controls.innerHTML = `
            <div class="slider-group">
                <label>🎵 МУЗЫКА</label>
                <input type="range" id="music-volume" min="0" max="100" value="${Math.round(this.musicVolume * 100)}">
                <span class="volume-value" id="music-volume-value">${Math.round(this.musicVolume * 100)}%</span>
                <span id="music-status" style="color:rgba(255,255,255,0.3);font-size:9px;">${status}</span>
            </div>
            <div class="slider-group">
                <label>🏎️ ДВИГАТЕЛЬ</label>
                <input type="range" id="engine-volume" min="0" max="100" value="${Math.round(this.engineVolumeMultiplier * 100)}">
                <span class="volume-value" id="engine-volume-value">${Math.round(this.engineVolumeMultiplier * 100)}%</span>
            </div>
        `;
        document.body.appendChild(controls);

        document.getElementById('music-volume').addEventListener('input', (e) => {
            const val = parseInt(e.target.value) / 100;
            // Только громкость — НЕ перезапускать трек (иначе двоится)
            this.setMusicVolume(val);
            document.getElementById('music-volume-value').textContent = Math.round(val * 100) + '%';
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().catch(function(){});
            }
            // Если музыка ещё не играла (первый жест) — один раз запустить
            if (window.__inRace) {
                if (!this.isMusicPlaying && !(this.raceAudio && !this.raceAudio.paused)) {
                    try { this.startMusic(); } catch (err) {}
                    try { if (this.startRaceMusicHTML) this.startRaceMusicHTML(); } catch (err) {}
                }
            } else if (!this.isMusicPlaying && !(this.menuAudio && !this.menuAudio.paused)) {
                try { this.startMenuMusic(); } catch (err) {}
            }
        });

        document.getElementById('engine-volume').addEventListener('input', (e) => {
            const val = parseInt(e.target.value) / 100;
            this.engineVolumeMultiplier = val;
            document.getElementById('engine-volume-value').textContent = Math.round(val * 100) + '%';
        });
    }

    async loadMusic() {
        if (this.musicLoadPromise) return this.musicLoadPromise;
        this.musicLoadPromise = this._loadMusic();
        try { return await this.musicLoadPromise; }
        finally { this.musicLoadPromise = null; }
    }

    async _loadMusic() {
        const candidates = [
            this.musicUrl,
            'music/race-music.mp3',
            './music/race-music.mp3',
            'race-music.mp3',
            'assets/music/race-music.mp3'
        ];
        
        for (const url of candidates) {
            try {
                // быстрая проверка наличия файла
                if (window.AssetHub) {
                    const ok = await AssetHub.exists(url);
                    if (ok === false) {
                        console.log('⏭ нет файла:', url);
                        continue;
                    }
                }
                console.log('🎵 Пробую загрузить:', url);
                const response = await fetch(url);
                if (!response.ok) {
                    if (window.AssetHub) AssetHub.cache[url] = false;
                    continue;
                }
                
                const arrayBuffer = await response.arrayBuffer();
                if (!this.audioCtx) break;
                this.musicBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
                this.musicLoaded = true;
                this.musicUrl = url;
                if (window.AssetHub) AssetHub.cache[url] = true;
                
                console.log(`✅ MP3 загружен из ${url} (${this.musicBuffer.duration.toFixed(1)} сек)`);
                
                const statusEl = document.getElementById('music-status');
                if (statusEl) statusEl.textContent = '🎵 MP3';
                
                if (this.musicStarted && !this.isMusicPlaying) {
                    this.startMusic();
                }
                return true;
            } catch (e) {
                // пробуем следующий путь
            }
        }
        
        console.warn('⚠️ MP3 не найден ни по одному пути');
        console.warn('💡 Создай папку music/ рядом с index.html и положи туда race-music.mp3');
        
        this.musicBuffer = null;
        this.musicLoaded = false;
        
        const statusEl = document.getElementById('music-status');
        if (statusEl) statusEl.textContent = this.useProceduralFallback ? '🎹 Procedural' : '❌ Нет MP3';
        
        return false;
    }

    
    // ---- Музыка меню (отдельный MP3, HTML5 Audio) ----
    startMenuMusic() {
        if (!this.enabled) return;
        // Только флаг гонки — надёжнее, чем угадывать по DOM
        if (window.__inRace) return;

        // остановить гоночный трек
        try { this.stopMusic(); } catch (e) {}

        if (!this.menuAudio) {
            this.menuAudio = new Audio();
            this.menuAudio.loop = true;
            this.menuAudio.preload = 'auto';
            this.menuAudio.volume = Math.max(0, Math.min(1, (this.musicVolume || 0.55) * 0.85));
            this.menuAudio.src = this.menuMusicUrl;
            this.menuAudio.addEventListener('error', () => {
                console.warn('⚠ menu-music.mp3 не найден:', this.menuMusicUrl);
                this.menuMusicPlaying = false;
            });
        }
        if (this.menuMusicPlaying && !this.menuAudio.paused) return;
        const play = () => {
            this.menuAudio.volume = Math.max(0, Math.min(1, (this.musicVolume || 0.55) * 0.85));
            const p = this.menuAudio.play();
            if (p && p.then) {
                p.then(() => {
                    this.menuMusicPlaying = true;
                    console.log('🎵 Меню-музыка:', this.menuMusicUrl);
                }).catch(err => {
                    console.warn('menu music play blocked:', err && err.message);
                });
            } else {
                this.menuMusicPlaying = true;
            }
        };
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().then(play).catch(play);
        } else {
            play();
        }
    }
    stopMenuMusic() {
        this.menuMusicPlaying = false;
        if (this.menuAudio) {
            try {
                this.menuAudio.pause();
                this.menuAudio.currentTime = 0;
            } catch (e) {}
        }
    }
    /** HTML5 fallback гоночной музыки (ночь/mobile, если WebAudio молчит) */
    startRaceMusicHTML() {
        try {
            // уже играет — не создавать второй поток
            if (this.raceAudio && !this.raceAudio.paused) {
                this.isMusicPlaying = true;
                return;
            }
            // флаг true после прошлого заезда, но audio на паузе — перезапуск
            if (this.isMusicPlaying && this.currentMusicSource) return;
            this.isMusicPlaying = false;
            // остановить WebAudio-копию, чтобы не двоилось
            try {
                if (this.currentMusicSource) {
                    this.currentMusicSource.stop();
                    this.currentMusicSource = null;
                }
                if (this.musicInterval) {
                    clearInterval(this.musicInterval);
                    this.musicInterval = null;
                }
            } catch (e) {}
            if (!this.raceAudio) {
                this.raceAudio = new Audio(this.musicUrl || 'music/race-music.mp3');
                this.raceAudio.loop = true;
                this.raceAudio.preload = 'auto';
            }
            this.raceAudio.volume = Math.max(0, Math.min(1, this.musicVolume || 0.55));
            const p = this.raceAudio.play();
            if (p && p.then) {
                p.then(() => { this.isMusicPlaying = true; console.log('🎵 Race MP3 (HTML5)'); })
                 .catch(()=>{});
            } else {
                this.isMusicPlaying = true;
            }
        } catch (e) {}
    }
    stopRaceMusicHTML() {
        if (this.raceAudio) {
            try { this.raceAudio.pause(); this.raceAudio.currentTime = 0; } catch (e) {}
        }
    }
    setMusicVolume(v) {
        this.musicVolume = Math.max(0, Math.min(1, v));
        if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
        if (this.menuAudio) this.menuAudio.volume = this.musicVolume * 0.85;
        if (this.raceAudio) this.raceAudio.volume = this.musicVolume;
        // Не перезапускать трек — только громкость
    }


    startMusic() {
        try { this.stopMenuMusic(); } catch (e) {}
        if (!this.enabled || !this.audioCtx) return;
        // Если уже играет HTML5-гонка — не дублировать WebAudio
        if (this.raceAudio && !this.raceAudio.paused) {
            this.isMusicPlaying = true;
            return;
        }
        // Если «играет», но источника нет — сброс
        if (this.isMusicPlaying && !this.currentMusicSource && !this.musicInterval) {
            this.isMusicPlaying = false;
        }
        if (this.isMusicPlaying) return;

        this.musicStarted = true;

        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().then(() => this._playMusic()).catch(() => this._playMusic());
        } else {
            this._playMusic();
        }
    }

    _playMusic() {
        if (this.isMusicPlaying) return;

        // Не скачиваем 3.4 MiB race-трека на заставке: загрузка начинается
        // только после фактического старта гонки.
        if (!this.musicLoaded) {
            this.loadMusic().then(() => {
                if (!this.isMusicPlaying) this._playMusic();
            });
            return;
        }

        // 1. Пробуем MP3
        if (this.musicBuffer && this.musicLoaded) {
            this._playMp3Loop();
            return;
        }

        // 2. Fallback — процедурная музыка
        if (this.useProceduralFallback) {
            console.log('🎹 Запуск процедурной музыки');
            this.isMusicPlaying = true;
            this.playProceduralLoop();
            this.musicInterval = setInterval(() => this.playProceduralLoop(), 4800);
            return;
        }

        // Ждём загрузку MP3
        setTimeout(() => {
            if (!this.isMusicPlaying) this._playMusic();
        }, 800);
    }

    _playMp3Loop() {
        if (!this.musicBuffer) return;

        // Останавливаем предыдущий
        if (this.currentMusicSource) {
            try { this.currentMusicSource.stop(); } catch(e) {}
        }

        const source = this.audioCtx.createBufferSource();
        source.buffer = this.musicBuffer;
        source.loop = true;
        source.connect(this.musicGain);
        source.start(0);

        this.currentMusicSource = source;
        this.isMusicPlaying = true;
        console.log('🎵 MP3 loop запущен');
    }

    playProceduralLoop() {
        if (!this.enabled || !this.audioCtx || !this.isMusicPlaying) return;
        try {
            const t0 = this.audioCtx.currentTime + 0.05;
            const melody = [
                [523,0.14],[587,0.14],[659,0.14],[784,0.14],
                [659,0.14],[587,0.14],[523,0.14],[659,0.14],
                [784,0.14],[880,0.14],[784,0.14],[659,0.14],
                [880,0.14],[988,0.14],[880,0.14],[784,0.14]
            ];
            const bass = [
                [130,0.28],[130,0.28],[146,0.28],[146,0.28],
                [164,0.28],[164,0.28],[146,0.28],[146,0.28]
            ];

            let t = 0;
            melody.forEach(([freq, dur]) => {
                const osc = this.audioCtx.createOscillator();
                const g = this.audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.value = freq;
                g.gain.setValueAtTime(0.04, t0 + t);
                g.gain.exponentialRampToValueAtTime(0.001, t0 + t + dur);
                osc.connect(g);
                g.connect(this.musicGain);
                osc.start(t0 + t);
                osc.stop(t0 + t + dur + 0.02);
                this.musicNodes.push(osc);
                t += dur + 0.015;
            });

            t = 0;
            bass.forEach(([freq, dur]) => {
                const osc = this.audioCtx.createOscillator();
                const g = this.audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.value = freq;
                g.gain.setValueAtTime(0.028, t0 + t);
                g.gain.exponentialRampToValueAtTime(0.001, t0 + t + dur);
                osc.connect(g);
                g.connect(this.musicGain);
                osc.start(t0 + t);
                osc.stop(t0 + t + dur + 0.02);
                this.musicNodes.push(osc);
                t += dur + 0.015;
            });
        } catch (e) {
            console.warn('Ошибка procedural:', e);
        }
    }

    stopMusic() {
        this.isMusicPlaying = false;
        this.musicStarted = false;
        try { this.stopRaceMusicHTML(); } catch (e) {}

        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
        if (this.currentMusicSource) {
            try { this.currentMusicSource.stop(); } catch(e) {}
            this.currentMusicSource = null;
        }
        this.musicNodes.forEach(n => { try { n.stop(); } catch(e) {} });
        this.musicNodes = [];

        if (this.musicGain) {
            try { this.musicGain.gain.setValueAtTime(0, this.audioCtx.currentTime); } catch(e) {}
        }
    }

    // ========== ДВИГАТЕЛЬ ==========
    update(speed, gearOpt) {
        if (!this.enabled) return;
        if (!this.audioCtx || !this.initialized) {
            try { this.init(); } catch (e) {}
            if (!this.audioCtx) return;
        }
        try { if (this.audioCtx.state === 'suspended') this.audioCtx.resume(); } catch (e) {}

        this.speed = speed;
        const maxS = (this.carMaxSpeed > 0.05) ? this.carMaxSpeed : (this.maxSpeed || 0.35);
        const absSp = Math.abs(speed || 0);
        const n = Math.max(0, Math.min(1, absSp / maxS));

        // 5 передач: 10/26/44/62/80%
        const edges = [0, 0.10, 0.26, 0.44, 0.62, 0.80, 1.0];
        let gear = 0;
        for (let g = 5; g >= 1; g--) if (n >= edges[g]) { gear = g; break; }
        if (gearOpt != null && gearOpt !== undefined) gear = Math.max(0, Math.min(5, gearOpt | 0));

        if (this._lastGear != null && gear !== this._lastGear) {
            this._gearShiftDrop = 0.5;
        }
        this._lastGear = gear;
        this._gear = gear;

        const g0 = edges[gear], g1 = edges[Math.min(gear + 1, 6)];
        const inG = g1 > g0 ? Math.max(0, Math.min(1, (n - g0) / (g1 - g0))) : 0;

        // Широкий диапазон — ухо точно слышит смену
        const bases = [70, 100, 140, 190, 250, 330];
        const spans = [45, 55, 65, 75, 90, 100];
        let freq = bases[gear] + inG * spans[gear];
        if (absSp < 0.01) freq = 55;
        if (this._gearShiftDrop > 0) {
            freq *= 0.5;
            this._gearShiftDrop = Math.max(0, this._gearShiftDrop - 0.045);
        }

        const volMul = (this.engineVolumeMultiplier != null) ? this.engineVolumeMultiplier : 0.6;
        let vol = (0.04 + n * 0.18) * volMul;
        if (absSp < 0.01) vol = 0.001;

        this.engineFrequency = freq;
        this.engineVolume = vol;

        if (absSp > 0.012) {
            if (this._engineStopTimeout) {
                clearTimeout(this._engineStopTimeout);
                this._engineStopTimeout = null;
            }
            this._isEngineStopping = false;
            if (!this.isPlaying || !this.engineNode) this.startEngine();
            this._applyEngineTone(freq, vol);
        } else if (this.isPlaying) {
            this.stopEngineSmooth();
        }
    }

    _applyEngineTone(freq, vol) {
        if (!this.audioCtx || !this.engineNode) return;
        try {
            const t = this.audioCtx.currentTime;
            const f = Math.max(40, Math.min(520, freq));
            const v = Math.max(0.0008, Math.min(0.4, vol));
            // cancel + setValue = гарантированное изменение каждый кадр
            this.engineNode.frequency.cancelScheduledValues(t);
            this.engineNode.frequency.setValueAtTime(f, t);
            if (this.engineNode2) {
                this.engineNode2.frequency.cancelScheduledValues(t);
                this.engineNode2.frequency.setValueAtTime(f * 0.5, t);
            }
            if (this.engineFilter) {
                const cut = Math.max(400, Math.min(2800, 350 + f * 4));
                this.engineFilter.frequency.cancelScheduledValues(t);
                this.engineFilter.frequency.setValueAtTime(cut, t);
            }
            if (this.engineGain) {
                this.engineGain.gain.cancelScheduledValues(t);
                this.engineGain.gain.setValueAtTime(v, t);
            }
        } catch (e) {
            this.isPlaying = false;
            this.engineNode = null;
            this.engineNode2 = null;
        }
    }

    startEngine() {
        if (!this.enabled || !this.audioCtx) return;
        this._stopEngineNow();
        try {
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            this._engineId = (this._engineId || 0) + 1;
            const f0 = Math.max(40, this.engineFrequency || 70);
            const v0 = Math.max(0.02, this.engineVolume || 0.06);

            if (!this.engineGain) {
                this.engineGain = this.audioCtx.createGain();
                this.engineGain.connect(this.audioCtx.destination);
            }
            this.engineGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
            this.engineGain.gain.setValueAtTime(v0, this.audioCtx.currentTime);

            if (!this.engineFilter) {
                this.engineFilter = this.audioCtx.createBiquadFilter();
                this.engineFilter.type = 'lowpass';
                this.engineFilter.Q.value = 1.0;
            }
            try { this.engineFilter.disconnect(); } catch (e) {}
            this.engineFilter.frequency.value = 1200;
            this.engineFilter.connect(this.engineGain);

            const osc = this.audioCtx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = f0;
            osc.connect(this.engineFilter);
            osc.start();

            const osc2 = this.audioCtx.createOscillator();
            osc2.type = 'square';
            osc2.frequency.value = f0 * 0.5;
            const g2 = this.audioCtx.createGain();
            g2.gain.value = 0.4;
            osc2.connect(g2);
            g2.connect(this.engineFilter);
            osc2.start();

            this.engineNode = osc;
            this.engineNode2 = osc2;
            this.engineNode2Gain = g2;
            this.isPlaying = true;
            this._isEngineStopping = false;
        } catch (e) {
            console.warn('startEngine', e);
            this.engineNode = null;
            this.engineNode2 = null;
            this.isPlaying = false;
        }
    }

    stopEngineSmooth() {
        if (this._isEngineStopping || !this.isPlaying) return;
        this._isEngineStopping = true;
        try {
            if (this.engineGain && this.audioCtx) {
                const t = this.audioCtx.currentTime;
                this.engineGain.gain.cancelScheduledValues(t);
                this.engineGain.gain.setValueAtTime(Math.max(0.001, this.engineVolume || 0.05), t);
                this.engineGain.gain.linearRampToValueAtTime(0.0001, t + 0.1);
            }
        } catch (e) {}
        const id = this._engineId;
        if (this._engineStopTimeout) clearTimeout(this._engineStopTimeout);
        this._engineStopTimeout = setTimeout(() => {
            if (this._engineId === id) this._stopEngineNow();
            this._engineStopTimeout = null;
        }, 120);
    }

    _stopEngineNow() {
        if (this._engineStopTimeout) {
            clearTimeout(this._engineStopTimeout);
            this._engineStopTimeout = null;
        }
        try {
            if (this.engineNode) {
                try { this.engineNode.stop(); } catch (e) {}
                try { this.engineNode.disconnect(); } catch (e) {}
            }
        } catch (e) {}
        try {
            if (this.engineNode2) {
                try { this.engineNode2.stop(); } catch (e) {}
                try { this.engineNode2.disconnect(); } catch (e) {}
            }
        } catch (e) {}
        try { if (this.engineNode2Gain) this.engineNode2Gain.disconnect(); } catch (e) {}
        this.engineNode = null;
        this.engineNode2 = null;
        this.engineNode2Gain = null;
        this.isPlaying = false;
        this._isEngineStopping = false;
        try {
            if (this.engineGain && this.audioCtx) {
                this.engineGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
                this.engineGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
            }
        } catch (e) {}
    }

    restartEngine() {
        this._stopEngineNow();
        this.startEngine();
    }

    playFinishSound() {
        if (!this.enabled || !this.audioCtx) return;
        try {
            [523, 659, 784, 1047].forEach((freq, i) => {
                const osc = this.audioCtx.createOscillator();
                const g = this.audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                g.gain.setValueAtTime(0.12, this.audioCtx.currentTime + i * 0.1);
                g.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + i * 0.1 + 0.3);
                osc.connect(g);
                g.connect(this.audioCtx.destination);
                osc.start(this.audioCtx.currentTime + i * 0.1);
                osc.stop(this.audioCtx.currentTime + i * 0.1 + 0.3);
            });
        } catch(e) {}
    }

    playCrashSound(volumeScale = 1) {
        if (!this.enabled || !this.audioCtx) return;
        try {
            const t0 = this.audioCtx.currentTime;
            const thud = this.audioCtx.createOscillator();
            const g = this.audioCtx.createGain();
            thud.type = 'triangle';
            thud.frequency.setValueAtTime(140, t0);
            thud.frequency.exponentialRampToValueAtTime(30, t0 + 0.3);
            g.gain.setValueAtTime(0.35 * volumeScale, t0);
            g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32);
            thud.connect(g);
            g.connect(this.audioCtx.destination);
            thud.start(t0);
            thud.stop(t0 + 0.32);

            if (this.noiseBuffer) {
                const noise = this.audioCtx.createBufferSource();
                noise.buffer = this.noiseBuffer;
                const ng = this.audioCtx.createGain();
                ng.gain.setValueAtTime(0.16 * volumeScale, t0);
                ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
                noise.connect(ng);
                ng.connect(this.audioCtx.destination);
                noise.start(t0);
            }
        } catch(e) {}
    }


    playSfx(type, volScale) {
        if (!this.enabled) return;
        try {
            if (!this.audioCtx) this.init();
            if (!this.audioCtx) return;
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            const t0 = this.audioCtx.currentTime;
            const vs = (volScale != null ? volScale : 1) * 0.9;
            const mk = (wave, freq, dur, peak, slide) => {
                const o = this.audioCtx.createOscillator();
                const g = this.audioCtx.createGain();
                o.type = wave;
                o.frequency.setValueAtTime(freq, t0);
                if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + dur);
                g.gain.setValueAtTime(Math.max(0.001, peak * vs), t0);
                g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
                o.connect(g); g.connect(this.audioCtx.destination);
                o.start(t0); o.stop(t0 + dur + 0.02);
            };
            switch (type) {
                case 'shoot': mk('square', 420, 0.12, 0.1, 120); mk('sawtooth', 180, 0.15, 0.06, 60); break;
                case 'hit': mk('triangle', 220, 0.18, 0.14, 50); break;
                // --- боссы (этап B: узнаваемые слои) ---
                case 'boss_spawn': {
                    // тяжёлый удар + рык
                    mk('sawtooth', 48, 0.55, 0.24, 32);
                    mk('square', 85, 0.4, 0.16, 40);
                    mk('triangle', 160, 0.3, 0.1, 70);
                    mk('sine', 55, 0.5, 0.12, 30);
                    if (this.noiseBuffer) {
                        const n = this.audioCtx.createBufferSource();
                        n.buffer = this.noiseBuffer;
                        const ng = this.audioCtx.createGain();
                        const f = this.audioCtx.createBiquadFilter();
                        f.type = 'lowpass'; f.frequency.value = 500;
                        ng.gain.setValueAtTime(0.22 * vs, t0);
                        ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
                        n.connect(f); f.connect(ng); ng.connect(this.audioCtx.destination);
                        n.start(t0);
                    }
                    break;
                }
                case 'boss_roar': {
                    mk('sawtooth', 42, 0.65, 0.26, 22);
                    mk('square', 72, 0.5, 0.18, 35);
                    mk('sawtooth', 95, 0.35, 0.1, 50);
                    if (this.noiseBuffer) {
                        const n = this.audioCtx.createBufferSource();
                        n.buffer = this.noiseBuffer;
                        const ng = this.audioCtx.createGain();
                        const f = this.audioCtx.createBiquadFilter();
                        f.type = 'bandpass'; f.frequency.value = 280; f.Q.value = 0.7;
                        ng.gain.setValueAtTime(0.22 * vs, t0);
                        ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
                        n.connect(f); f.connect(ng); ng.connect(this.audioCtx.destination);
                        n.start(t0);
                    }
                    break;
                }
                case 'boss_windup': {
                    // нарастающий «замах» — игрок слышит telegraph
                    mk('sine', 120, 0.35, 0.08, 380);
                    mk('triangle', 180, 0.32, 0.12, 420);
                    mk('square', 90, 0.25, 0.06, 200);
                    break;
                }
                case 'boss_melee': {
                    // свист + удар
                    mk('triangle', 280, 0.12, 0.1, 60);
                    mk('square', 70, 0.22, 0.22, 28);
                    mk('sawtooth', 55, 0.2, 0.16, 30);
                    if (this.noiseBuffer) {
                        const n = this.audioCtx.createBufferSource();
                        n.buffer = this.noiseBuffer;
                        const ng = this.audioCtx.createGain();
                        ng.gain.setValueAtTime(0.2 * vs, t0);
                        ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
                        n.connect(ng); ng.connect(this.audioCtx.destination);
                        n.start(t0);
                    }
                    break;
                }
                case 'boss_gun': {
                    mk('square', 680, 0.07, 0.16, 90);
                    mk('sawtooth', 220, 0.12, 0.12, 50);
                    mk('triangle', 110, 0.14, 0.1, 40);
                    if (this.noiseBuffer) {
                        const n = this.audioCtx.createBufferSource();
                        n.buffer = this.noiseBuffer;
                        const ng = this.audioCtx.createGain();
                        const f = this.audioCtx.createBiquadFilter();
                        f.type = 'highpass'; f.frequency.value = 800;
                        ng.gain.setValueAtTime(0.12 * vs, t0);
                        ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
                        n.connect(f); f.connect(ng); ng.connect(this.audioCtx.destination);
                        n.start(t0);
                    }
                    break;
                }
                case 'boss_rocket': {
                    // свист ракеты + бас
                    mk('sawtooth', 200, 0.35, 0.12, 80);
                    mk('sine', 90, 0.4, 0.14, 40);
                    mk('square', 60, 0.25, 0.1, 35);
                    if (this.noiseBuffer) {
                        const n = this.audioCtx.createBufferSource();
                        n.buffer = this.noiseBuffer;
                        const ng = this.audioCtx.createGain();
                        const f = this.audioCtx.createBiquadFilter();
                        f.type = 'lowpass'; f.frequency.setValueAtTime(1200, t0);
                        f.frequency.exponentialRampToValueAtTime(200, t0 + 0.4);
                        ng.gain.setValueAtTime(0.16 * vs, t0);
                        ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
                        n.connect(f); f.connect(ng); ng.connect(this.audioCtx.destination);
                        n.start(t0);
                    }
                    break;
                }
                case 'boss_snipe': {
                    mk('sine', 900, 0.15, 0.1, 400);
                    mk('square', 500, 0.1, 0.12, 120);
                    mk('triangle', 200, 0.12, 0.08, 60);
                    break;
                }
                case 'boss_hurt': {
                    mk('sawtooth', 160, 0.16, 0.14, 55);
                    mk('triangle', 80, 0.2, 0.12, 35);
                    mk('square', 50, 0.15, 0.1, 30);
                    break;
                }
                case 'boss_die': {
                    mk('sawtooth', 70, 0.55, 0.24, 25);
                    mk('square', 45, 0.6, 0.18, 22);
                    mk('triangle', 100, 0.4, 0.12, 30);
                    mk('sine', 40, 0.5, 0.1, 20);
                    if (this.noiseBuffer) {
                        const n = this.audioCtx.createBufferSource();
                        n.buffer = this.noiseBuffer;
                        const ng = this.audioCtx.createGain();
                        ng.gain.setValueAtTime(0.26 * vs, t0);
                        ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.65);
                        n.connect(ng); ng.connect(this.audioCtx.destination);
                        n.start(t0);
                    }
                    break;
                }
                case 'explode':
                    mk('triangle', 90, 0.35, 0.22, 35);
                    mk('sawtooth', 55, 0.4, 0.16, 28);
                    mk('square', 180, 0.12, 0.08, 60);
                    if (this.noiseBuffer) {
                        const n = this.audioCtx.createBufferSource();
                        n.buffer = this.noiseBuffer;
                        const ng = this.audioCtx.createGain();
                        ng.gain.setValueAtTime(0.2 * vs, t0);
                        ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
                        n.connect(ng); ng.connect(this.audioCtx.destination);
                        n.start(t0);
                    }
                    break;
                case 'animal': mk('sawtooth', 160, 0.2, 0.1, 90); mk('square', 300, 0.1, 0.05, 200); break;
                case 'nitro': mk('sawtooth', 200, 0.35, 0.12, 600); break;
                case 'click': mk('sine', 800, 0.05, 0.08, 400); break;
                case 'whoosh':
                    mk('sine', 280, 0.12, 0.07, 90);
                    mk('triangle', 180, 0.1, 0.05, 70);
                    break;
                case 'gear': {
                    // щелчок + короткий «whine» смены
                    mk('square', 100, 0.09, 0.2, 45);
                    mk('triangle', 180, 0.11, 0.14, 70);
                    mk('sawtooth', 260, 0.08, 0.08, 90);
                    mk('sine', 70, 0.14, 0.1, 40);
                    if (this.noiseBuffer) {
                        const n = this.audioCtx.createBufferSource();
                        n.buffer = this.noiseBuffer;
                        const ng = this.audioCtx.createGain();
                        const f = this.audioCtx.createBiquadFilter();
                        f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.5;
                        ng.gain.setValueAtTime(0.12 * vs, t0);
                        ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
                        n.connect(f); f.connect(ng); ng.connect(this.audioCtx.destination);
                        n.start(t0);
                    }
                    break;
                }
                case 'pickup':
                    mk('sine', 660, 0.08, 0.1, 990);
                    mk('square', 440, 0.06, 0.05, 660);
                    break;
                case 'pickup_nitro':
                    mk('sawtooth', 200, 0.15, 0.12, 500);
                    mk('sine', 500, 0.12, 0.08, 900);
                    break;
                case 'countdown':
                    mk('square', 440, 0.12, 0.14, 440);
                    break;
                case 'go':
                    mk('sawtooth', 220, 0.2, 0.16, 440);
                    mk('square', 330, 0.18, 0.12, 550);
                    mk('sine', 660, 0.15, 0.08, 880);
                    break;
                case 'nitro_loop':
                    mk('sawtooth', 160, 0.1, 0.05, 280);
                    break;
                case 'coins':
                    mk('sine', 880, 0.06, 0.1, 1200);
                    mk('sine', 1100, 0.08, 0.08, 1400);
                    break;
                case 'spray':
                    mk('sawtooth', 400, 0.15, 0.06, 200);
                    if (this.noiseBuffer) {
                        const n = this.audioCtx.createBufferSource();
                        n.buffer = this.noiseBuffer;
                        const ng = this.audioCtx.createGain();
                        const f = this.audioCtx.createBiquadFilter();
                        f.type = 'highpass'; f.frequency.value = 1200;
                        ng.gain.setValueAtTime(0.08 * vs, t0);
                        ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
                        n.connect(f); f.connect(ng); ng.connect(this.audioCtx.destination);
                        n.start(t0);
                    }
                    break;
                case 'fanfare':
                    [523, 659, 784, 1047].forEach(function(freq, i) {
                        const o = this.audioCtx.createOscillator();
                        const g = this.audioCtx.createGain();
                        o.type = 'sine'; o.frequency.value = freq;
                        g.gain.setValueAtTime(0.1 * vs, t0 + i * 0.09);
                        g.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.09 + 0.28);
                        o.connect(g); g.connect(this.audioCtx.destination);
                        o.start(t0 + i * 0.09); o.stop(t0 + i * 0.09 + 0.3);
                    }.bind(this));
                    break;
                case 'brake':
                    mk('sawtooth', 320, 0.2, 0.07, 90);
                    if (this.noiseBuffer) {
                        const n = this.audioCtx.createBufferSource();
                        n.buffer = this.noiseBuffer;
                        const ng = this.audioCtx.createGain();
                        const f = this.audioCtx.createBiquadFilter();
                        f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 2;
                        ng.gain.setValueAtTime(0.07 * vs, t0);
                        ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
                        n.connect(f); f.connect(ng); ng.connect(this.audioCtx.destination);
                        n.start(t0);
                    }
                    break;
                case 'ambient':
                    mk('triangle', 180 + Math.random() * 80, 0.4, 0.04, 100);
                    break;
                case 'horn':
                    mk('square', 220, 0.25, 0.08, 180);
                    mk('square', 277, 0.22, 0.06, 200);
                    break;
                case 'bump':
                    mk('triangle', 70, 0.12, 0.1, 40);
                    break;
                case 'win': [523,659,784].forEach((f,i)=>{ const o=this.audioCtx.createOscillator(); const g=this.audioCtx.createGain(); o.type='sine'; o.frequency.value=f; g.gain.setValueAtTime(0.1*vs,t0+i*0.1); g.gain.exponentialRampToValueAtTime(0.001,t0+i*0.1+0.25); o.connect(g); g.connect(this.audioCtx.destination); o.start(t0+i*0.1); o.stop(t0+i*0.1+0.25); }); break;
                case 'lose': mk('triangle', 300, 0.4, 0.12, 80); break;
                case 'boss': mk('square', 90, 0.35, 0.14, 45); break;
                default: mk('sine', 440, 0.1, 0.06, 200);
            }
        } catch (e) {}
    }

    /** Звук атаки босса по типу attack из CAMPAIGN_BOSSES / BOSS_COMBAT. */
    playBossAttack(attack, volScale) {
        const atk = attack || 'default';
        const melee = (atk === 'sweep' || atk === 'ram' || atk === 'hammer' || atk === 'chain' || atk === 'saw' || atk === 'tools');
        if (atk === 'rocket' || atk === 'flame') {
            this.playSfx('boss_rocket', volScale != null ? volScale : 1.05);
        } else if (atk === 'snipe' || atk === 'neon') {
            this.playSfx('boss_snipe', volScale != null ? volScale : 1.0);
        } else if (melee) {
            this.playSfx('boss_melee', volScale != null ? volScale : 1.05);
        } else {
            this.playSfx('boss_gun', volScale != null ? volScale : 1.05);
            this.playSfx('shoot', 0.55);
        }
    }


    dispose() {
        this.stopMusic();
        this._stopEngineNow();
        if (this.audioCtx) {
            try { this.audioCtx.close(); } catch(e) {}
        }
    }
}


export { SoundEngine };
export default SoundEngine;
