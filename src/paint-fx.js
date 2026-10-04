/**
 * Как выглядит покраска кузова: обычные краски, хром и секретные (src/secret-paints.js) —
 * 💡 «Неон» светится и мягко пульсирует, 🌈 «Радуга» переливается всеми цветами, 🥇 «Золото» — металл с бликом.
 * paintBody(mesh, paint, color) — одна точка для гаража, витрины, фона меню и машины в заезде.
 * Живые краски анимируются своим циклом requestAnimationFrame (работает в любом рендере, в том числе после склейки мешей).
 */
const live = new Set();
let raf = 0;
const MAX_LIVE = 64;

function tick() {
    raf = 0;
    if (!live.size) return;
    const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    live.forEach(function(m) {
        const fx = m.userData.paintFx;
        if (fx === 'rainbow') {
            const h = (t * 0.12) % 1;
            m.color.setHSL(h, 0.9, 0.52);
            if (m.emissive) { m.emissive.setHSL(h, 0.9, 0.5); m.emissiveIntensity = 0.28; }
        } else if (fx === 'glow' && m.emissive) {
            m.emissiveIntensity = 0.55 + 0.25 * Math.sin(t * 3.2);
        } else live.delete(m);
    });
    raf = requestAnimationFrame(tick);
}

function track(m) {
    if (live.has(m)) return;
    if (live.size >= MAX_LIVE) live.delete(live.values().next().value);
    live.add(m);
    m.addEventListener('dispose', function() { live.delete(m); });
    if (!raf && typeof requestAnimationFrame !== 'undefined') raf = requestAnimationFrame(tick);
}

/** Покрасить меш кузова. paint — { id, fx? }, color — hex */
export function paintBody(o, paint, color) {
    const m = o.material, id = paint && paint.id, fx = (paint && paint.fx) || null;
    if (!m || !m.color) return;
    m.userData.paintFx = fx;
    m.color.setHex(color);
    m.metalness = id === 'chrome' ? 0.85 : fx === 'gold' ? 0.9 : fx === 'rainbow' ? 0.5 : 0.35;
    m.roughness = id === 'chrome' ? 0.2 : fx === 'gold' ? 0.22 : fx === 'glow' ? 0.45 : 0.4;
    if (m.emissive) {
        if (fx === 'glow') { m.emissive.setHex(color); m.emissiveIntensity = 0.6; }
        else if (fx === 'gold') { m.emissive.setHex(0x3a2600); m.emissiveIntensity = 0.5; }
        else if (fx !== 'rainbow') { m.emissive.setHex(0x000000); m.emissiveIntensity = 1; }
    }
    if (fx === 'rainbow' || fx === 'glow') track(m); else live.delete(m);
}
