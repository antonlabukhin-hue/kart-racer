/**
 * Сохранение в аккаунт Яндекса (player.setData / getData) — на Яндекс Играх прогресс живёт в аккаунте игрока:
 * сменил устройство или браузер — вошёл тем же Яндексом, и всё на месте. Без «кода сохранения».
 * Снимок — те же ключи, что у облака (src/cloud-save.js snapshot), с отметкой времени at.
 * Правило: новее — главнее. При запуске: в аккаунте новее, чем на устройстве, — записать на устройство и перезапустить игру;
 * иначе — отправить своё. После каждого сохранения профиля — отправка (не чаще раза в delay мс).
 * Логика — чистая (с тестами): площадка, хранилище и время — снаружи.
 */
import { snapshot, applySnapshot } from './cloud-save.js';

export const LOCAL_AT_KEY = 'road_racing_local_at';
export const MAX_BYTES = 190000; // у Яндекса предел ~200 КБ на данные игрока

/** Что делать при запуске: 'pull' — взять из аккаунта, 'push' — отправить своё, 'none' — совпадает */
export function decide(localAt, remote) {
    const la = +localAt || 0;
    if (remote && remote.keys && Object.keys(remote.keys).length && (+remote.at || 0) > la + 1000) return 'pull';
    if (remote && (+remote.at || 0) === la && la > 0) return 'none';
    return 'push';
}

/**
 * o: { data: { load() → Promise<snap|null>, save(snap) → Promise<bool> }, storage, now(), delay, onPulled() }
 * → { boot() → Promise<'pull'|'push'|'none'|'off'>, schedule() }
 */
export function createYandexSave(o) {
    const st = o.storage, now = o.now || Date.now;
    let timer = null;
    const localAt = function() { try { return +st.getItem(LOCAL_AT_KEY) || 0; } catch (e) { return 0; } };
    const push = function() {
        const snap = snapshot(st); snap.at = now();
        if (JSON.stringify(snap).length > MAX_BYTES) return Promise.resolve(false);
        try { st.setItem(LOCAL_AT_KEY, String(snap.at)); } catch (e) {}
        return Promise.resolve(o.data.save(snap)).catch(function() { return false; });
    };
    return {
        boot: function() {
            if (!o.data) return Promise.resolve('off');
            return Promise.resolve(o.data.load()).catch(function() { return null; }).then(function(remote) {
                const d = decide(localAt(), remote);
                if (d === 'pull') {
                    applySnapshot(remote, st);
                    try { st.setItem(LOCAL_AT_KEY, String(remote.at)); } catch (e) {}
                    if (o.onPulled) o.onPulled();
                } else if (d === 'push') push();
                return d;
            });
        },
        schedule: function() {
            if (!o.data || timer) return;
            timer = setTimeout(function() { timer = null; push(); }, o.delay != null ? o.delay : 3000);
        }
    };
}
