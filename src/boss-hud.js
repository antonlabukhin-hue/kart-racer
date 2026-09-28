/**
 * Полоска босса в HUD: имя, сегменты HP и название фазы — игрок всегда видит,
 * что босс сейчас делает и сколько ещё бить. Логика состояния — чистая (с тестами),
 * DOM обновляется только при изменении.
 */
import { phaseForHp } from './boss-fight.js';
import { splitBossName } from './boss-intro.js';

export const PHASE_LABELS = {
    1: 'Фаза 1 · обстрел',
    2: 'Фаза 2 · баррикады',
    3: 'Фаза 3 · ярость'
};

/** Что показать по состоянию босса; null — полоску спрятать */
export function bossHudState(boss, maxPhase) {
    if (!boss || !boss.active || boss.dying || !(boss.hp > 0)) return null;
    const maxHp = Math.max(1, boss.maxHp || 3);
    const hp = Math.max(0, Math.min(maxHp, boss.hp));
    const phase = Math.min(maxPhase || 3, phaseForHp(hp, maxHp));
    return {
        nick: splitBossName(boss.name).nick,
        hp: hp,
        maxHp: maxHp,
        phase: phase,
        label: PHASE_LABELS[phase],
        open: boss.vulnT > 0
    };
}

/** Ключ для сравнения: DOM трогаем только когда он меняется */
export function bossHudKey(st) {
    return st ? [st.nick, st.hp, st.maxHp, st.phase, st.open ? 1 : 0].join('|') : '';
}

let _el = null;
let _key = null;
let _cue = null;

/** Крупное «БЕЙ!» по центру, пока босс открыт: появляется в момент открытия, гаснет с окном */
function renderCue(open) {
    if (open) {
        if (!_cue || !_cue.isConnected) {
            _cue = document.createElement('div');
            _cue.id = 'boss-cue';
            _cue.innerHTML = '<b>БЕЙ!</b><small>тарань, пока открыт</small>';
            document.body.appendChild(_cue);
        }
        if (!_cue.classList.contains('on')) { void _cue.offsetWidth; _cue.classList.add('on'); }
    } else if (_cue) {
        _cue.classList.remove('on');
    }
}

function ensureEl() {
    if (_el && _el.isConnected) return _el;
    _el = document.createElement('div');
    _el.id = 'boss-hud';
    _el.innerHTML = '<div class="bh-top"><span class="bh-name"></span><span class="bh-phase"></span></div><div class="bh-hp"></div>';
    document.body.appendChild(_el);
    _key = null;
    return _el;
}

/** Обновить полоску (вызывать каждый кадр); st из bossHudState */
export function renderBossHud(st) {
    const key = bossHudKey(st);
    renderCue(!!(st && st.open));
    if (key === _key && (!st || (_el && _el.isConnected))) return;
    if (!st) {
        if (_el) _el.classList.remove('on');
        _key = key;
        return;
    }
    const el = ensureEl();
    const hurt = _key != null && _key !== '' && st.hp < Number(String(_key).split('|')[1]);
    _key = key;
    el.querySelector('.bh-name').textContent = '«' + st.nick + '»';
    const ph = el.querySelector('.bh-phase');
    ph.textContent = st.label;
    ph.className = 'bh-phase p' + st.phase;
    const box = el.querySelector('.bh-hp');
    if (box.children.length !== st.maxHp) {
        box.innerHTML = '';
        for (let i = 0; i < st.maxHp; i++) box.appendChild(document.createElement('i'));
    }
    for (let i = 0; i < box.children.length; i++) box.children[i].classList.toggle('on', i < st.hp);
    el.className = 'on p' + st.phase + (st.open ? ' open' : '');
    if (hurt) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
}

/** Убрать полоску совсем (выход из заезда) */
export function removeBossHud() {
    try { if (_el) _el.remove(); } catch (e) {}
    try { if (_cue) _cue.remove(); } catch (e) {}
    _el = null;
    _cue = null;
    _key = null;
}
