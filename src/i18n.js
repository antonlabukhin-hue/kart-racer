/**
 * Локализация. Исходный язык игры — русский (текст прямо в разметке и в main.js).
 * Для английского: словарь «русская строка → английская» (src/locales/en.js) + шаблоны
 * для строк с числами. Переводятся текстовые узлы и атрибуты (title, placeholder, alt,
 * aria-label); MutationObserver переводит и то, что игра дорисовывает на лету (HUD, финиш,
 * карточки). Что не нашлось в словаре — остаётся по-русски.
 */
import EN from './locales/en.js';

const DICTS = { en: EN };
const ATTRS = ['title', 'placeholder', 'alt', 'aria-label'];
const SLAVIC = /^(ru|uk|be|kk)\b/i;

/** 'auto' | 'ru' | 'en' → 'ru' | 'en' */
export function resolveLang(setting, navLangs) {
    if (setting === 'ru' || setting === 'en') return setting;
    const list = (navLangs && navLangs.length) ? navLangs : ['ru'];
    return list.some(function(l) { return SLAVIC.test(String(l)); }) ? 'ru' : 'en';
}

/** Перевод одной строки (пробелы по краям сохраняются); null — перевода нет */
export function translateText(str, lang) {
    const d = DICTS[lang];
    if (!d || str == null) return null;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(String(str));
    const core = m[2];
    if (!core || !/[А-Яа-яЁё]/.test(core)) return null;
    let out = Object.prototype.hasOwnProperty.call(d.strings, core) ? d.strings[core] : null;
    if (out == null) {
        for (let i = 0; i < d.patterns.length; i++) {
            const p = d.patterns[i];
            if (p[0].test(core)) { out = core.replace(p[0], p[1]); break; }
        }
    }
    return out == null ? null : m[1] + out + m[3];
}

let _lang = 'ru';
let _observer = null;
const ORIG = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

function translateNode(node) {
    if (node.nodeType === 3) {
        const p = node.parentNode;
        if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE')) return;
        const t = translateText(node.nodeValue, _lang);
        if (t != null && t !== node.nodeValue) {
            if (ORIG && !ORIG.has(node)) ORIG.set(node, node.nodeValue);
            node.nodeValue = t;
        }
        return;
    }
    if (node.nodeType !== 1) return;
    for (let i = 0; i < ATTRS.length; i++) {
        const a = ATTRS[i];
        if (!node.hasAttribute(a)) continue;
        const v = node.getAttribute(a);
        const t = translateText(v, _lang);
        if (t != null && t !== v) {
            node.setAttribute('data-ru-' + a, v);
            node.setAttribute(a, t);
        }
    }
}

function walk(root) {
    if (!root) return;
    translateNode(root);
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    const w = document.createTreeWalker(root, 5 /* ELEMENT | TEXT */);
    let n;
    while ((n = w.nextNode())) translateNode(n);
}

function restore(root) {
    const w = document.createTreeWalker(root, 5);
    let n;
    while ((n = w.nextNode())) {
        if (n.nodeType === 3 && ORIG && ORIG.has(n)) { n.nodeValue = ORIG.get(n); ORIG.delete(n); }
        else if (n.nodeType === 1) {
            ATTRS.forEach(function(a) {
                const k = 'data-ru-' + a;
                if (n.hasAttribute(k)) { n.setAttribute(a, n.getAttribute(k)); n.removeAttribute(k); }
            });
        }
    }
}

export function getLang() { return _lang; }

/** Включить язык: перевести страницу и следить за новыми узлами */
export function applyLang(lang) {
    _lang = lang === 'en' ? 'en' : 'ru';
    if (typeof document === 'undefined') return _lang;
    document.documentElement.lang = _lang;
    if (_observer) { _observer.disconnect(); _observer = null; }
    if (_lang === 'ru') { restore(document.body); return _lang; }
    walk(document.body);
    document.title = translateText(document.title, _lang) || document.title;
    _observer = new MutationObserver(function(list) {
        for (let i = 0; i < list.length; i++) {
            const r = list[i];
            if (r.type === 'characterData') translateNode(r.target);
            else if (r.type === 'attributes') translateNode(r.target);
            else for (let j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
        }
    });
    _observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    return _lang;
}

/** Перевод строки для кода (confirm, Notify и т.п.) */
export function tr(str) {
    return translateText(str, _lang) || str;
}
