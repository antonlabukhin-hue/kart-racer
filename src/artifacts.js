/**
 * Альбом «Артефакты 90-х»: редкие светящиеся находки прямо на трассе (бесконечная — примерно раз на круг).
 * Нашёл новую — в альбом с коротким воспоминанием и +ARTIFACT_E «Е»; повтор — +DUP_E. Весь альбом — большая награда.
 * profile.artifacts = { got: { id: время }, done: bool }. Логика — чистая (с тестами); жетон на трассе — createArtifactToken.
 * Не повторяет значки из ящиков (src/badges.js).
 */
import * as THREE from 'three';

export const ARTIFACTS = [
    { id: 'tape_pencil', icon: '✏', name: 'Кассета и карандаш', memo: 'Перемотать кассету без магнитофона — только карандашом. Батарейки берегли.' },
    { id: 'caps', icon: '🪙', name: 'Кэпсы', memo: 'Стопка фишек и бита. Выигрывал у пацанов во дворе — проигрывал на перемене.' },
    { id: 'lottery', icon: '🎫', name: 'Лотерейный билет', memo: 'Стёр — пусто. Стёр второй — опять пусто. Но в следующий раз точно повезёт.' },
    { id: 'gto', icon: '🏅', name: 'Значок ГТО', memo: 'Готов к труду и обороне. Подтянуться восемь раз — и он твой.' },
    { id: 'tie', icon: '🔺', name: 'Пионерский галстук', memo: 'Гладили утюгом каждое утро. Концы сосали, когда думали.' },
    { id: 'heart_insert', icon: '💌', name: 'Вкладыш с сердечком', memo: 'Вкладыш из жвачки: двое и подпись про любовь. Собирали целую пачку.' },
    { id: 'vhs_box', icon: '📦', name: 'Видеокассета в коробке', memo: '«Перед просмотром перемотайте на начало». Коробку берегли больше кассеты.' },
    { id: 'filmstrip', icon: '🎞', name: 'Диафильм', memo: 'Сказка на стене, папа читает подписи. Щелчок — следующий кадр.' },
    { id: 'slingshot', icon: '🪃', name: 'Рогатка', memo: 'Из резинки от трусов и ветки клёна. По банкам — только по банкам!' },
    { id: 'soda', icon: '🥤', name: 'Газировка из автомата', memo: 'С сиропом — три копейки, без сиропа — одна. Стакан на всех.' },
    { id: 'brick_game', icon: '🎮', name: 'Брелок-тетрис', memo: 'Девять тысяч девятьсот девяносто девять игр в одной. На деле — тетрис.' },
    { id: 'calendar', icon: '📅', name: 'Карманный календарик', memo: 'С машиной на обороте. Менялись на перемене — с «Ладой» шёл за три.' }
];
export const ARTIFACT_E = 200, DUP_E = 40;
export const SET_REWARD = { chips: 5000, vhs: 5 };
export const ARTIFACT_CHANCE = 0.55; // на круг бесконечной трассы

/** Какой артефакт выпал: чаще недостающий (70%), иначе любой */
export function rollArtifact(profile, rnd) {
    const r = rnd || Math.random, got = (profile && profile.artifacts && profile.artifacts.got) || {};
    const missing = ARTIFACTS.filter(function(a) { return !got[a.id]; });
    const pool = missing.length && r() < 0.7 ? missing : ARTIFACTS;
    return pool[Math.floor(r() * pool.length) % pool.length];
}

/** Подобрал артефакт a: { art, isNew, chips, setDone } — «Е» и награда за альбом сразу в profile.season */
export function grantArtifact(profile, a, now) {
    const st = profile.artifacts = Object.assign({ got: {}, done: false }, profile.artifacts);
    profile.season = profile.season || {};
    if (st.got[a.id]) { profile.season.chips = (profile.season.chips || 0) + DUP_E; return { art: a, isNew: false, chips: DUP_E, setDone: false }; }
    st.got[a.id] = now || Date.now();
    let chips = ARTIFACT_E, setDone = false;
    if (!st.done && ARTIFACTS.every(function(x) { return st.got[x.id]; })) {
        st.done = true; setDone = true; chips += SET_REWARD.chips;
        profile.season.vhs = (profile.season.vhs || 0) + SET_REWARD.vhs;
    }
    profile.season.chips = (profile.season.chips || 0) + chips;
    return { art: a, isNew: true, chips: chips, setDone: setDone };
}

/** Разметка альбома для «Трофеев» */
export function artifactsHtml(profile) {
    const got = (profile && profile.artifacts && profile.artifacts.got) || {};
    const n = ARTIFACTS.filter(function(a) { return got[a.id]; }).length;
    return '<div class="art-head">📼 Артефакты 90-х · ' + n + ' из ' + ARTIFACTS.length + (n === ARTIFACTS.length ? ' · альбом собран!' : ' · за весь альбом +' + SET_REWARD.chips + ' Е и ' + SET_REWARD.vhs + ' 📼') + '</div>' +
        '<div class="art-grid">' + ARTIFACTS.map(function(a) {
            const on = !!got[a.id];
            return '<div class="art-card' + (on ? ' on' : '') + '" title="' + (on ? a.memo : 'Найди на трассе') + '"><i>' + (on ? a.icon : '❔') + '</i><b>' + (on ? a.name : '???') + '</b>' + (on ? '<small>' + a.memo + '</small>' : '') + '</div>';
        }).join('') + '</div>';
}

/* ---------- жетон на трассе: иконка в золотом кольце, светится ---------- */
const MATS = {};
function tokenMat(icon) {
    if (MATS[icon]) return MATS[icon];
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(64, 64, 20, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,236,150,0.95)'); g.addColorStop(0.6, 'rgba(255,190,60,0.55)'); g.addColorStop(1, 'rgba(255,170,40,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    c.lineWidth = 7; c.strokeStyle = '#ffd23c'; c.beginPath(); c.arc(64, 64, 40, 0, Math.PI * 2); c.stroke();
    c.font = '54px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(icon, 64, 68);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.userData.keep = true;
    MATS[icon] = new THREE.SpriteMaterial({ map: t, depthWrite: false });
    return MATS[icon];
}
export function createArtifactToken(a) {
    const grp = new THREE.Group();
    const s = new THREE.Sprite(tokenMat(a.icon));
    s.scale.set(1.5, 1.5, 1);
    grp.add(s);
    grp.userData.sprite = s;
    return grp;
}
