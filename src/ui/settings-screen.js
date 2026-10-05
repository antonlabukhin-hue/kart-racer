/**
 * Экран настроек — карточка поверх меню. Значения хранит src/settings.js.
 * Зависимости от игры передаются явно (deps), без глобальных window.*:
 *   onQuality(v), onLang(v), tutorialKeys — что сбросить при включении обучения, sound() → звуковой движок, cloud — облачное сохранение включено (src/cloud-save.js).
 */
import { loadSettings, saveSettings } from '../settings.js';
import { getCode, normalizeCode, pullSave, pushSave, snapshot, applySnapshot } from '../cloud-save.js';

function controlsNote(v) {
    return v === 'swipe' ? 'Свайп влево/вправо — полоса, вниз — тормоз, газ жмётся сам'
        : v === 'buttons' ? 'Руль, газ и тормоз — кнопками на экране'
        : 'Телефон вертикально — свайпы, боком — кнопки';
}

export function openSettingsScreen(deps) {
    const d = deps || {};
    if (document.getElementById('settings-screen')) return;
    let st = loadSettings();
    const el = document.createElement('div');
    el.id = 'settings-screen';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    const slider = function(key, label) {
        const v = Math.round(st[key] * 100);
        return '<label class="st-row"><span>' + label + '</span><input type="range" min="0" max="100" step="5" data-key="' + key + '" value="' + v + '"><b data-val="' + key + '">' + v + '%</b></label>';
    };
    const choice = function(key, opts) {
        return '<div class="st-choice" data-key="' + key + '">' + opts.map(function(o) {
            return '<button type="button" data-v="' + o[0] + '"' + (String(st[key]) === String(o[0]) ? ' class="on"' : '') + '>' + o[1] + '</button>';
        }).join('') + '</div>';
    };
    const toggle = function(key, label) {
        return '<label class="st-toggle"><input type="checkbox" data-key="' + key + '"' + (st[key] ? ' checked' : '') + '><span>' + label + '</span></label>';
    };
    el.innerHTML =
        '<div class="st-card">' +
        '<div class="st-title">⚙ Настройки</div>' +
        '<div class="st-group">Звук</div>' +
        slider('music', '🎵 Музыка') + slider('engine', '🏎 Двигатель') + slider('sfx', '💥 Эффекты') +
        '<div class="st-group">🎙 Ведущий</div>' +
        choice('host', [['voice', 'Голос и текст'], ['text', 'Только текст'], ['off', 'Молчит']]) +
        '<div class="st-group">Графика</div>' +
        choice('quality', [['low', '🚀 Низкое'], ['medium', '⚡ Среднее'], ['high', '🔥 Высокое']]) +
        '<div class="st-group">Камера в заезде</div>' +
        choice('camera', [[0, 'Сзади'], [1, 'Капот'], [2, 'Салон'], [3, 'Сбоку']]) +
        '<div class="st-group">Язык</div>' +
        choice('lang', [['auto', 'Авто'], ['ru', 'Русский'], ['en', 'English']]) +
        '<div class="st-group">Управление на телефоне</div>' +
        choice('controls', [['auto', '📱 Авто'], ['buttons', '🕹 Кнопки'], ['swipe', '👆 Свайпы']]) +
        '<small class="sc-note" id="st-controls-note">' + controlsNote(st.controls) + '</small>' +
        '<small class="sc-note">📱 Заезд идёт и вертикально, и боком — поверни телефон, как удобнее, игра продолжится</small>' +
        '<div class="st-group">Удобство</div>' +
        toggle('shake', 'Тряска камеры при ударах') +
        toggle('vibrate', 'Вибрация телефона при аварии') +
        toggle('ghost', '👻 Призрак лучшего заезда') +
        toggle('curve', '🛣 Повороты и холмы дороги') +
        toggle('tutorial', '🎓 Обучение в заезде (подсказки с паузой)') +
        (d.cloud ? '<div class="st-group">☁ Облачное сохранение</div>' +
            '<div class="st-cloud"><div class="sc-code"><small>Твой код — запиши или сохрани:</small><b id="cloud-code">' + getCode() + '</b><button type="button" class="st-btn" id="cloud-copy">Скопировать</button></div>' +
            '<small class="sc-note">Прогресс сохраняется сам. На новом телефоне введи код — всё вернётся.</small>' +
            '<div class="sc-load"><input id="cloud-input" placeholder="XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters"><button type="button" class="st-btn" id="cloud-load">Загрузить</button></div>' +
            '<small class="sc-status" id="cloud-status"></small></div>' : '') +
        '<button type="button" class="st-btn primary" id="settings-close">← В меню</button>' +
        // для разбора вёрстки на телефоне: экран устройства, окно страницы, масштаб интерфейса, режим приложения
        '<div class="st-copy">© 2026 Антон Лабухин 1989 · Все права защищены</div>' +
        '<div class="st-diag">экран ' + screen.width + '×' + screen.height + ' · окно ' + innerWidth + '×' + innerHeight +
        ' · ×' + (getComputedStyle(document.documentElement).getPropertyValue('--ui-k').trim() || '1') +
        (window.navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) ? ' · приложение' : '') + '</div>' +
        '</div>';
    document.body.appendChild(el);
    const save = function(patch) {
        st = saveSettings(Object.assign(st, patch));
        try { const se = d.sound && d.sound(); if (se && se.applySettings) se.applySettings(st); } catch (e) {}
    };
    el.querySelectorAll('input[type=range]').forEach(function(inp) {
        inp.addEventListener('input', function() {
            const k = inp.dataset.key;
            el.querySelector('[data-val="' + k + '"]').textContent = inp.value + '%';
            save({ [k]: parseInt(inp.value, 10) / 100 });
        });
    });
    // проба громкости эффектов — сразу слышно, что изменилось
    el.querySelector('input[data-key="sfx"]').addEventListener('change', function() {
        try { const se = d.sound && d.sound(); if (se) se.playSfx('pickup', 1.0); } catch (e) {}
    });
    el.querySelectorAll('.st-choice').forEach(function(box) {
        box.addEventListener('click', function(ev) {
            const b = ev.target.closest('button');
            if (!b) return;
            box.querySelectorAll('button').forEach(function(x) { x.classList.toggle('on', x === b); });
            const k = box.dataset.key;
            const v = k === 'camera' ? parseInt(b.dataset.v, 10) : b.dataset.v;
            save({ [k]: v });
            if (k === 'quality' && d.onQuality) d.onQuality(v);
            if (k === 'lang' && d.onLang) d.onLang(v);
            if (k === 'controls') el.querySelector('#st-controls-note').textContent = controlsNote(v);
        });
    });
    el.querySelectorAll('input[type=checkbox]').forEach(function(cb) {
        cb.addEventListener('change', function() {
            save({ [cb.dataset.key]: cb.checked });
            // включили обучение — пройти его заново: брифинг, знакомства с новым на дороге, подсказки
            if (cb.dataset.key === 'tutorial' && cb.checked) (d.tutorialKeys || []).forEach(function(k) { try { localStorage.removeItem(k); } catch (e) {} });
        });
    });
    if (d.cloud) {
        const status = function(t) { el.querySelector('#cloud-status').textContent = t; };
        el.querySelector('#cloud-copy').onclick = function() {
            const c = getCode();
            try { navigator.clipboard.writeText(c).then(function() { status('Код скопирован'); }, function() { status('Код: ' + c); }); } catch (e) { status('Код: ' + c); }
            pushSave(c, snapshot()).then(function(ok) { if (ok) status('Код скопирован · прогресс в облаке'); });
        };
        el.querySelector('#cloud-load').onclick = function() {
            const code = normalizeCode(el.querySelector('#cloud-input').value);
            if (!code) { status('Код — 12 знаков, например K7PQ-2ZMA-9XRD'); return; }
            status('Загружаю…');
            pullSave(code).then(function(data) {
                if (!data) { status('Сохранение не найдено (или нет сети)'); return; }
                if (!confirm('Заменить прогресс на этом устройстве сохранением из облака?')) { status(''); return; }
                applySnapshot(data);
                try { localStorage.setItem('road_racing_cloud_code', code); } catch (e) {}
                location.reload();
            });
        };
    }
    const close = function() { el.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = function(ev) { if (ev.key === 'Escape') close(); };
    el.querySelector('#settings-close').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
}
