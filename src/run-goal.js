/**
 * Одна цель на итогах бесконечной трассы: вместо десятка цифр — что остановило, куда целиться и как.
 *   «💥 Конец заезда: автобус, 1 234 м» (одно и то же несколько раз — «3 аварии из 4 — попутки»)
 *   «🎯 Цель: …» — самая близкая цель из «почти» (src/nearly.js): рекорд, соперник, задание; нет — рекорд + 150 м
 *   «💡 …» — совет по причине: один ответ на класс угрозы (src/threat-style.js).
 * Самая сильная причина ещё раз — не валюта, а «я знаю, где проиграл». Логика — чистая (с тестами).
 */
import { HURDLES } from './hop-duck.js';
import { HAZARD_KIND } from './hazards.js';

const CAR_NAMES = { bus: 'автобус', truck: 'грузовик', van: 'фургон', moto: 'мотоцикл', sedan: 'попутка', car: 'попутка' };

/** Причина аварии → { name (кто/что, именительный), cls (класс угрозы) } */
export function causeInfo(cause, animalNames) {
    const s = String(cause || '');
    if (s.indexOf('car:') === 0 || s === 'car') return { name: CAR_NAMES[s.slice(4)] || 'попутка', cls: 'car' };
    if (animalNames && animalNames[s]) return { name: animalNames[s].toLowerCase(), cls: 'threat' };
    if (/^[A-Z]+$/.test(s)) return { name: 'зверь', cls: 'threat' };
    if (HURDLES[s]) return { name: HURDLES[s].name.toLowerCase(), cls: HURDLES[s].act === 'duck' ? 'duck' : 'jump' };
    if (s === 'gap') return { name: 'разлом', cls: 'gap' };
    if (s === 'ремонт' || s === 'roadworks') return { name: 'ремонт дороги', cls: 'block' };
    if (HAZARD_KIND[s]) return { name: s, cls: HAZARD_KIND[s] === 'skid' ? 'slide' : 'slow' };
    return { name: s || 'авария', cls: 'other' };
}

export const TIPS = {
    car: 'Поворотник мигает до перестроения — уходи раньше. Краем задел — не авария',
    threat: 'Розовое кольцо — зверь: курица мечется, медведь встаёт посреди дороги',
    jump: 'Красное кольцо и труба — прыжок ▲ (пробел)',
    duck: 'Шлагбаум с табличкой — подныр ▼ (Shift)',
    gap: 'Разлом — только по трамплину',
    block: 'Красное кольцо — путь перекрыт: объезжай заранее',
    slow: 'Оранжевое кольцо — тормозит: объезжай',
    slide: 'Голубое кольцо — заносит: объезжай, руль ровно',
    other: 'Цепочка «Е» показывает свободный путь'
};

/**
 * o: { dist, best (рекорд до заезда), isNew, crashes — [{ cause, dist }], near — строки «почти» [{ icon, text }], animalNames — { BEAR: 'Медведь' } }
 * → { why, goal, tip } (строки, без разметки)
 */
export function runGoal(o) {
    const cr = (o && o.crashes) || [], last = cr[cr.length - 1];
    const fmt = function(n) { return Math.round(n || 0).toLocaleString('ru-RU'); };
    let why = '';
    if (last) {
        const ci = causeInfo(last.cause, o.animalNames);
        const same = cr.filter(function(c) { return causeInfo(c.cause, o.animalNames).cls === ci.cls; }).length;
        why = same >= 2 && cr.length >= 2 ? '💥 ' + (same === cr.length ? 'Все аварии' : same + ' аварии из ' + cr.length) + ' — ' + (ci.cls === 'car' ? 'попутки' : ci.cls === 'threat' ? 'звери' : ci.name)
            : '💥 Конец заезда: ' + ci.name + (last.dist != null ? ', ' + fmt(last.dist) + ' м' : '');
    }
    const n = o && o.near && o.near[0];
    const goal = n ? '🎯 ' + n.text : o && o.isNew ? '🎯 Новый рекорд! Следующая цель — ' + fmt(Math.ceil(((o.dist || 0) + 150) / 50) * 50) + ' м'
        : '🎯 Цель — ' + fmt(Math.ceil((Math.max(o && o.best || 0, o && o.dist || 0) + 150) / 50) * 50) + ' м';
    const tip = last ? '💡 ' + TIPS[causeInfo(last.cause, o.animalNames).cls] : '';
    return { why: why, goal: goal, tip: tip };
}

export function runGoalHtml(g) {
    if (!g) return '';
    const esc = function(s) { return String(s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    return '<div class="f2-goal">' + (g.why ? '<div class="g-why">' + esc(g.why) + '</div>' : '') + '<div class="g-goal">' + esc(g.goal) + '</div>' + (g.tip ? '<div class="g-tip">' + esc(g.tip) + '</div>' : '') + '</div>';
}
