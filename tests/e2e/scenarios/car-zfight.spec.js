import { test, expect } from '@playwright/test';
import { login } from '../helpers.js';
// «рябь» (z-fighting): две видимые непрозрачные детали машины перекрываются и лежат гранью в одной плоскости —
// в движении такое место мерцает. Проверяем все машины без тюнинга и с полным тюнингом.
test('машины: ни одна деталь не лежит гранью в плоскости другой', async ({ page }) => {
    await login(page, 'Тестер', './');
    const r = await page.evaluate(() => {
        const T = window.THREE, K = window.__artKit, out = [];
        for (const id of ['cheburashka', 'kirpich', 'turbo']) for (const tuned of [false, true]) {
            const b = K.buildCar(id); Object.values(b.parts || {}).forEach(m => { if (m) m.visible = tuned; });
            if (tuned) window.applyUpgradeVisuals(b.upgrades, { engine: 3, tires: 3, armor: 3, nitro: 3 });
            const g = b.group; g.updateMatrixWorld(true);
            const ms = []; g.traverse(o => { if (!o.isMesh) return; for (let p = o; p; p = p.parent) if (!p.visible) return;
                if (o.material.transparent) return; let wheel = false; for (let p = o; p; p = p.parent) if (p.userData.isWheel) wheel = true; if (wheel) return;
                // только «коробки» без поворота (иначе грани не по осям)
                const e = new T.Euler().setFromRotationMatrix(new T.Matrix4().extractRotation(o.matrixWorld)); const rot = Math.abs(e.x) + Math.abs(e.y) + Math.abs(e.z);
                ms.push({ o, box: new T.Box3().setFromObject(o), rot, name: o.geometry.type + ' ' + '#' + o.material.color.getHexString() + (o.userData.bodyPaint ? ' paint' : '') + (o.userData.isLight ? ' light' : '') }); });
            const eps = 1e-4, ax = ['x', 'y', 'z'];
            for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
                const A = ms[i], B = ms[j]; if (A.rot > 0.01 || B.rot > 0.01) continue;
                for (let k = 0; k < 3; k++) {
                    const a = ax[k], o1 = ax[(k + 1) % 3], o2 = ax[(k + 2) % 3];
                    const ov1 = Math.min(A.box.max[o1], B.box.max[o1]) - Math.max(A.box.min[o1], B.box.min[o1]);
                    const ov2 = Math.min(A.box.max[o2], B.box.max[o2]) - Math.max(A.box.min[o2], B.box.min[o2]);
                    if (ov1 <= 0.004 || ov2 <= 0.004) continue;
                    for (const side of ['min', 'max']) if (Math.abs(A.box[side][a] - B.box[side][a]) < eps) {
                        // грань наружу: у обоих одна и та же сторона
                        out.push({ id, tuned, axis: side + a, at: +A.box[side][a].toFixed(3), area: +(ov1 * ov2).toFixed(4), A: A.name, B: B.name,
                            ca: [A.box.getCenter(new T.Vector3())].map(v => [v.x, v.y, v.z].map(n => +n.toFixed(2)))[0] });
                    }
                }
            }
        }
        return out;
    });
    expect(r).toEqual([]);
});
