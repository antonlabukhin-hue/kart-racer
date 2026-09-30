/**
 * Усиления бесконечной трассы (по мотивам Subway Surfers, в нашем лоре):
 *   🧲 Магнит — «Е» сами летят в машину, ×2 — каждая «Е» считается за две, 🛡 Броня — следующий удар не авария.
 * Логика — без сцены (с тестами); жетон на трассе строит createPowerToken.
 * «Второй шанс»: после пятой аварии — продолжить за «Е» (цена растёт вдвое) или за видеокассету, не больше двух раз.
 */
import * as THREE from 'three';

export const POWERS = {
    magnet: { icon: '🧲', name: 'Магнит', time: 10, color: '#ff4d4d' },
    x2: { icon: '×2', name: 'Двойные «Е»', time: 15, color: '#ffd23c' },
    shield: { icon: '🛡', name: 'Броня', time: 0, color: '#66ddff' }
};
export const POWER_TYPES = Object.keys(POWERS);
export const POWER_EVERY = [450, 750];

/**
 * Прокачка усилений за «Е» (как в Subway Surfers — главная трата монет): каждый уровень +2 с действия, 5 уровней.
 * profile.powerLv = { magnet, x2 }
 */
export const POWER_LEVELS = 5;
export const POWER_UP_COST = [150, 300, 600, 1200, 2400];
export const POWER_UPGRADABLE = ['magnet', 'x2'];
export function powerTime(type, lv) {
    return POWERS[type].time + 2 * Math.max(0, Math.min(POWER_LEVELS, lv || 0));
}
export function nextPowerCost(lv) {
    return (lv || 0) >= POWER_LEVELS ? null : POWER_UP_COST[lv || 0];
}
/** Купить следующий уровень усиления: списывает «Е». { ok, cost } | { ok: false, reason: 'max' | 'no_chips' } */
export function buyPowerLevel(profile, type) {
    if (POWER_UPGRADABLE.indexOf(type) < 0) return { ok: false, reason: 'max' };
    const lv = profile.powerLv = Object.assign({ magnet: 0, x2: 0 }, profile.powerLv);
    const cost = nextPowerCost(lv[type]);
    if (cost == null) return { ok: false, reason: 'max' };
    if ((profile.season.chips || 0) < cost) return { ok: false, reason: 'no_chips', cost: cost };
    profile.season.chips -= cost;
    lv[type]++;
    return { ok: true, cost: cost, level: lv[type] };
}

/** Состояние усилений заезда: секунды, сколько ещё действует каждое; lv — прокачка из профиля */
export function createPowers(lv) {
    return { magnet: 0, x2: 0, picked: 0, lv: Object.assign({ magnet: 0, x2: 0 }, lv) };
}

/** Подобрано усиление: время действия не складывается, а обновляется до полного */
export function activatePower(st, type) {
    const p = POWERS[type];
    if (!p) return false;
    st.picked++;
    if (p.time > 0) st[type] = powerTime(type, st.lv && st.lv[type]);
    return true;
}

export function tickPowers(st, dt) {
    const d = Math.max(0, dt || 0);
    st.magnet = Math.max(0, st.magnet - d);
    st.x2 = Math.max(0, st.x2 - d);
}

/** Сколько «Е» даёт одна фишка */
export function eValue(st) {
    return st && st.x2 > 0 ? 2 : 1;
}

/** Магнит: «Е» впереди (до 14 ед.) и сбоку (до 4.5 ед.) подтягивается к машине. Мутирует chip {x, z}; true — тянется */
export function magnetPull(st, chip, carX, carZ, dt, reach) {
    if (!st || st.magnet <= 0) return false;
    const r = reach || 1; // 1 — усиление, 0.5 — способность «Зубила» (всегда, но ближе)
    const ahead = carZ - chip.z;
    if (ahead < -1.5 || ahead > 14 * r || Math.abs(chip.x - carX) > 4.5 * r) return false;
    const k = Math.min(1, (dt || 0) * 9);
    chip.x += (carX - chip.x) * k;
    chip.z += (carZ - chip.z) * k;
    return true;
}

/** Активные усиления для значков на экране: [{ type, icon, left, k }] */
export function activePowers(st) {
    return ['magnet', 'x2'].filter(function(t) { return st[t] > 0; })
        .map(function(t) { return { type: t, icon: POWERS[t].icon, left: st[t], k: st[t] / powerTime(t, st.lv && st.lv[t]) }; });
}

export const MAX_CONTINUES = 2;
/** Цена «Второго шанса» в «Е»: 100, потом 200 (n — сколько раз уже продолжал) */
export function continueCost(n) {
    return 100 * Math.pow(2, Math.max(0, n || 0));
}

const TEX = {};
function tokenTexture(type) {
    if (TEX[type]) return TEX[type];
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const p = POWERS[type];
    g.fillStyle = 'rgba(20,16,28,0.92)';
    g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
    g.lineWidth = 9; g.strokeStyle = p.color;
    g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke();
    g.fillStyle = p.color;
    g.font = 'bold ' + (type === 'x2' ? 60 : 64) + 'px system-ui, "Segoe UI Emoji", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(p.icon, 64, 68);
    const t = new THREE.CanvasTexture(c);
    t.userData.keep = true;
    TEX[type] = t;
    return t;
}
const MATS = {};
/** Жетон усиления: круглая бляха-значок, всегда лицом к камере, с цветным ореолом */
export function createPowerToken(type) {
    if (!MATS[type]) MATS[type] = new THREE.SpriteMaterial({ map: tokenTexture(type), depthWrite: false });
    const grp = new THREE.Group();
    const s = new THREE.Sprite(MATS[type]);
    s.scale.set(1.25, 1.25, 1);
    grp.add(s);
    return grp;
}
