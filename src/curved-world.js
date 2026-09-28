/**
 * «Кривой мир»: дорога визуально поворачивает и уходит на холмы, а физика остаётся прямой
 * (приём раннеров вроде Subway Surfers). Вершины каждого материала сдвигаются в пространстве камеры
 * на curve · d², где d — расстояние от камеры дальше BEND_START: вблизи мир ровный, вдали изогнут.
 *
 * install() — один раз: подмешивает изгиб во все шейдеры через onBeforeCompile (кроме глубины теней).
 * setCurve(x, y) — каждый кадр; вне заезда 0 (гараж и меню не изгибаются).
 */
import * as THREE from 'three';

export const BEND_START = 8;
export const CURVE = { value: new THREE.Vector2(0, 0) };

const BEND_GLSL = `
uniform vec2 uWorldCurve;
vec4 bendView(vec4 mv) {
    float d = max(0.0, -mv.z - ${BEND_START.toFixed(1)});
    mv.x += uWorldCurve.x * d * d;
    mv.y += uWorldCurve.y * d * d;
    return mv;
}
`;

let installed = false;
export function install() {
    if (installed) return;
    installed = true;
    const bentChunk = THREE.ShaderChunk.project_vertex.replace(
        'gl_Position = projectionMatrix * mvPosition;',
        'mvPosition = bendView( mvPosition );\n\tgl_Position = projectionMatrix * mvPosition;'
    );
    const prev = THREE.Material.prototype.onBeforeCompile;
    THREE.Material.prototype.onBeforeCompile = function(shader, renderer) {
        if (prev) prev.call(this, shader, renderer);
        // тени считаются из камеры света — изгиб там исказил бы их
        if (this.isMeshDepthMaterial || this.isMeshDistanceMaterial) return;
        let vs = shader.vertexShader;
        const hasChunk = vs.indexOf('#include <project_vertex>') >= 0;
        const hasInline = vs.indexOf('gl_Position = projectionMatrix * mvPosition;') >= 0;
        if (!hasChunk && !hasInline) return;
        if (hasChunk) vs = vs.replace('#include <project_vertex>', bentChunk);
        else vs = vs.replace('gl_Position = projectionMatrix * mvPosition;', 'mvPosition = bendView( mvPosition );\n\tgl_Position = projectionMatrix * mvPosition;');
        // объявление — перед main()
        vs = vs.replace('void main()', BEND_GLSL + '\nvoid main()');
        shader.vertexShader = vs;
        shader.uniforms.uWorldCurve = CURVE;
    };
}

export function setCurve(x, y) {
    CURVE.value.set(x || 0, y || 0);
}

/**
 * Изгиб по пройденному пути: плавные повороты и холмы с разным периодом, чтобы узор не повторялся.
 * dist — сколько проехано (ед.), seed — своя трасса = свой рисунок; strength 0..1.
 * Возвращает { x, y } — коэффициенты для setCurve.
 */
export const MAX_TURN = 0.0016;
export const MAX_HILL = 0.0007;
export function curveAt(dist, seed, strength) {
    const k = strength == null ? 1 : strength;
    const s = seed || 0;
    const turn = Math.sin(dist * 0.0041 + s) * 0.7 + Math.sin(dist * 0.0093 + s * 2.3) * 0.3;
    const hill = Math.sin(dist * 0.0029 + s * 1.7) * 0.75 + Math.sin(dist * 0.0071 + s * 0.6) * 0.25;
    // вблизи старта мир ровный: изгиб нарастает за первые 60 ед.
    const ramp = Math.min(1, Math.max(0, dist / 60));
    if (ramp === 0 || k === 0) return { x: 0, y: 0 };
    return { x: MAX_TURN * turn * k * ramp, y: MAX_HILL * hill * k * ramp };
}
