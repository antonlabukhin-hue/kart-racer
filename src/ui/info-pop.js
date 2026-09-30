/**
 * Выскакивающая сбоку плашка-подсказка (не мешает смотреть на дорогу): «рекламу можно сносить» и т.п.
 * hintOnce(key, max) — показывать подсказку только первые max раз (счётчик в localStorage).
 */
export function showInfoPop(icon, title, text) {
    document.querySelectorAll('.info-pop').forEach(function(n) { try { n.remove(); } catch (e) {} });
    const el = document.createElement('div');
    el.className = 'info-pop';
    el.innerHTML = '<i></i><div><b></b><small></small></div>';
    el.querySelector('i').textContent = icon;
    el.querySelector('b').textContent = title;
    el.querySelector('small').textContent = text;
    document.body.appendChild(el);
    setTimeout(function() { el.classList.add('out'); }, 3400);
    setTimeout(function() { try { el.remove(); } catch (e) {} }, 3800);
    return el;
}

export function hintOnce(key, max) {
    let n = 0;
    try { n = Number(localStorage.getItem(key) || 0); } catch (e) {}
    if (n >= max) return false;
    try { localStorage.setItem(key, String(n + 1)); } catch (e) {}
    return true;
}
