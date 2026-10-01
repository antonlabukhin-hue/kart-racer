/**
 * «Слово дня» (по мотивам охоты за словами в Subway Surfers): каждый день — своё слово из 90-х.
 * Буквы по одной лежат на бесконечной трассе — всегда та, что нужна следующей; прогресс копится
 * между заездами за день. Собрал слово — награда в «Е», за серию дней подряд — больше (7-й день — и кассета).
 * profile.wordDay = { day: 'ГГГГ-ММ-ДД', got: сколько букв, done, streak, last: день последнего собранного }
 * Логика — без сцены (с тестами); жетон-буква — createLetterToken.
 */
import * as THREE from 'three';

export const WORDS = [
    'ПРИСТАВКА', 'ЖВАЧКА', 'ПЕЙДЖЕР', 'ВИДИК', 'КАССЕТА', 'ДИСКЕТА', 'ВКЛАДЫШ', 'ЛАМБАДА', 'ГАРАЖ', 'ЛАРЁК',
    'КООПЕРАТИВ', 'ВАУЧЕР', 'КИОСК', 'ВИДЕОСАЛОН', 'МАГНИТОФОН', 'ПЛЕЕР', 'ДИСКОТЕКА', 'КОРОБОЧКА', 'ТУРБО', 'ЛИМОНАД',
    'ФЕНЕЧКА', 'КАРТРИДЖ', 'ДЖОЙСТИК', 'ТЕЛЕВИЗОР', 'РАДИОЛА', 'МАЛИНОВЫЙ', 'БАРАХОЛКА', 'ЧЕЛНОК', 'ЭЛЕКТРИЧКА', 'ВИДЕОКАМЕРА'
];
export const WORD_REWARD = [300, 400, 500, 600, 700, 800, 1000]; // «Е» за 1…7-й день серии

/** Слово на день (один и тот же у всех в этот день) */
export function wordFor(day) {
    let h = 0;
    for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
    return WORDS[h % WORDS.length];
}

function daysBetween(a, b) {
    const t = function(k) { const s = k.split('-'); return Date.UTC(+s[0], +s[1] - 1, +s[2]); };
    return Math.round((t(b) - t(a)) / 86400000);
}

/** Состояние на сегодня (новый день — слово заново) */
export function wordState(profile, today) {
    const w = profile.wordDay = Object.assign({ day: null, got: 0, done: false, streak: 0, last: null }, profile.wordDay);
    if (w.day !== today) { w.day = today; w.got = 0; w.done = false; }
    const word = wordFor(today);
    return { word: word, got: w.got, done: w.done, next: w.done ? null : word.charAt(w.got), streak: w.streak };
}

/** Строка прогресса: «ЖВА _ _ _» */
export function wordProgress(word, got) {
    return word.split('').map(function(c, i) { return i < got ? c : '_'; }).join(' ');
}

/** Награда за собранное слово при серии streak (1…) */
export function wordReward(streak) {
    const k = Math.max(1, streak);
    return { chips: WORD_REWARD[Math.min(k, WORD_REWARD.length) - 1], vhs: k % 7 === 0 ? 1 : 0 };
}

/**
 * Подобрана буква: +1 к слову. Возвращает { letter, got, word, done, reward } — reward только на последней букве
 * (начисляется в profile.season сразу: «Е» и кассета).
 */
export function collectLetter(profile, today) {
    const s = wordState(profile, today);
    if (s.done) return null;
    const w = profile.wordDay;
    const letter = s.word.charAt(w.got);
    w.got++;
    const out = { letter: letter, got: w.got, word: s.word, done: false, reward: null };
    if (w.got >= s.word.length) {
        w.done = true;
        w.streak = w.last && daysBetween(w.last, today) === 1 ? w.streak + 1 : 1;
        w.last = today;
        const r = wordReward(w.streak);
        profile.season = profile.season || {};
        profile.season.chips = (profile.season.chips || 0) + r.chips;
        profile.season.vhs = (profile.season.vhs || 0) + r.vhs;
        out.done = true; out.reward = r; out.streak = w.streak;
    }
    return out;
}

// ---- жетон-буква на трассе: светящийся жёлто-фиолетовый кружок с буквой (спрайт — всегда лицом к камере)
const MATS = {};
function letterMat(ch) {
    if (MATS[ch]) return MATS[ch];
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 10, 64, 64, 62);
    grd.addColorStop(0, '#fff6c0'); grd.addColorStop(0.55, '#ffc21a'); grd.addColorStop(1, 'rgba(160,60,255,0.0)');
    g.fillStyle = grd; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    g.lineWidth = 6; g.strokeStyle = '#7a2cff'; g.beginPath(); g.arc(64, 64, 46, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#3a0a7a'; g.font = '900 64px system-ui, "Segoe UI", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, 64, 68);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData.keep = true;
    MATS[ch] = new THREE.SpriteMaterial({ map: tex, depthWrite: false });
    return MATS[ch];
}
export function createLetterToken(ch) {
    const grp = new THREE.Group();
    const s = new THREE.Sprite(letterMat(ch));
    s.scale.set(1.7, 1.7, 1);
    grp.add(s);
    grp.userData.sprite = s;
    return grp;
}
/** Сменить букву на жетоне (взяли нужную — остальные впереди показывают следующую) */
export function setTokenLetter(grp, ch) {
    if (grp && grp.userData.sprite) grp.userData.sprite.material = letterMat(ch);
}

/**
 * Буква подобрана на трассе: засчитать, жетоны впереди — на следующую букву (или убрать, если слово собрано).
 * tokens — активные жетоны-буквы { mesh, active }. Возвращает { title, sub, done } для плашки или null.
 */
export function pickupLetter(profile, today, tokens) {
    const r = collectLetter(profile, today);
    if (!r) return null;
    const next = r.done ? null : r.word.charAt(r.got);
    (tokens || []).forEach(function(t) {
        if (next) setTokenLetter(t.mesh, next);
        else { t.active = false; t.mesh.visible = false; }
    });
    if (r.done) return { title: '📝 СЛОВО «' + r.word + '»!', sub: '+' + r.reward.chips + ' Е' + (r.reward.vhs ? ' и 📼' : '') + ' · серия ' + r.streak + ' дн.', done: true };
    return { title: '📝 БУКВА «' + r.letter + '»', sub: 'Слово дня: ' + wordProgress(r.word, r.got), done: false };
}
