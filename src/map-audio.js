/**
 * Звуковая тема карты: темп/тон гоночного трека + процедурный фон (WebAudio, без файлов).
 * arsenev — ветер в тайге, promzona — гул цеха и лязг, svalka — треск огня, snow — вьюга.
 * Во время босса трек ускоряется (напряжение).
 */
export const MAP_AUDIO = {
    arsenev: { rate: 1.0, bed: 'wind', gain: 0.10 },
    promzona: { rate: 0.94, bed: 'factory', gain: 0.12 },
    svalka: { rate: 1.05, bed: 'fire', gain: 0.11 },
    snow: { rate: 0.97, bed: 'blizzard', gain: 0.13 }
};
export const BOSS_RATE_BOOST = 0.05;

/** Тема по карте; снежная трасса важнее карты */
export function mapAudioTheme(mapId, trackTheme) {
    if (trackTheme === 'snow') return Object.assign({ id: 'snow' }, MAP_AUDIO.snow);
    const id = MAP_AUDIO[mapId] ? mapId : 'arsenev';
    return Object.assign({ id: id }, MAP_AUDIO[id]);
}

export function musicRate(theme, bossActive) {
    return Math.round(((theme ? theme.rate : 1) + (bossActive ? BOSS_RATE_BOOST : 0)) * 1000) / 1000;
}

/**
 * Запустить фон. ctx — AudioContext, dest — узел выхода, noise — буфер белого шума.
 * Возвращает { setVolume(v), stop() }.
 */
export function startAmbientBed(ctx, dest, kind, noise, volume) {
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(dest);
    const nodes = [];
    const timers = [];
    const loopNoise = function() {
        const src = ctx.createBufferSource();
        src.buffer = noise;
        src.loop = true;
        nodes.push(src);
        return src;
    };
    const lfo = function(freq, depth, target) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = freq;
        g.gain.value = depth;
        o.connect(g); g.connect(target);
        o.start();
        nodes.push(o);
    };
    const burst = function(freq, q, dur, level, type) {
        const src = ctx.createBufferSource();
        src.buffer = noise;
        const f = ctx.createBiquadFilter();
        f.type = type || 'bandpass';
        f.frequency.value = freq;
        f.Q.value = q;
        const g = ctx.createGain();
        const t = ctx.currentTime;
        g.gain.setValueAtTime(level, t);
        g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
        src.connect(f); f.connect(g); g.connect(out);
        src.start(t, Math.random() * 1.5, dur + 0.05);
    };

    if (kind === 'wind' || kind === 'blizzard') {
        const src = loopNoise();
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = kind === 'blizzard' ? 900 : 420;
        f.Q.value = kind === 'blizzard' ? 4 : 1.5;
        const g = ctx.createGain();
        g.gain.value = 0.6;
        src.connect(f); f.connect(g); g.connect(out);
        lfo(0.13, kind === 'blizzard' ? 380 : 180, f.frequency); // порывы
        lfo(0.21, 0.3, g.gain);
        src.start();
    } else if (kind === 'factory') {
        const hum = ctx.createOscillator();
        hum.type = 'sawtooth';
        hum.frequency.value = 50;
        const hf = ctx.createBiquadFilter();
        hf.type = 'lowpass';
        hf.frequency.value = 160;
        const hg = ctx.createGain();
        hg.gain.value = 0.35;
        hum.connect(hf); hf.connect(hg); hg.connect(out);
        hum.start();
        nodes.push(hum);
        // лязг металла: резонансный всплеск раз в 1.6–3.2 с
        const clank = function() {
            burst(1200 + Math.random() * 1600, 18, 0.35, 0.9);
            timers.push(setTimeout(clank, 1600 + Math.random() * 1600));
        };
        timers.push(setTimeout(clank, 900));
    } else if (kind === 'fire') {
        const src = loopNoise();
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 260;
        const g = ctx.createGain();
        g.gain.value = 0.5;
        src.connect(f); f.connect(g); g.connect(out);
        src.start();
        // треск: короткие щелчки пачками
        const crackle = function() {
            const n = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < n; i++) {
                timers.push(setTimeout(function() { burst(2500 + Math.random() * 3000, 2, 0.04, 0.7, 'highpass'); }, i * 45));
            }
            timers.push(setTimeout(crackle, 180 + Math.random() * 520));
        };
        crackle();
    }

    let stopped = false;
    const api = {
        setVolume: function(v) {
            if (stopped) return;
            try { out.gain.setTargetAtTime(Math.max(0, v), ctx.currentTime, 0.4); } catch (e) { out.gain.value = Math.max(0, v); }
        },
        stop: function() {
            if (stopped) return;
            stopped = true;
            timers.forEach(clearTimeout);
            try { out.gain.setTargetAtTime(0, ctx.currentTime, 0.15); } catch (e) {}
            setTimeout(function() {
                nodes.forEach(function(n) { try { n.stop(); } catch (e) {} });
                try { out.disconnect(); } catch (e) {}
            }, 600);
        }
    };
    api.setVolume(volume);
    return api;
}
