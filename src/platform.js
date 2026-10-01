/**
 * Площадка, на которой запущена игра: обычный сайт ('web') или Яндекс Игры ('yandex', сборка npm run build:yandex).
 * Единый интерфейс для игры — реклама за награду, межэкранная реклама, покупки, разметка геймплея (LoadingAPI/GameplayAPI).
 * На сайте рекламы и покупок нет (rewardedAvailable() === false — кнопки «за рекламу» не показываются).
 * ?ads=mock — тестовая «реклама» (плашка на 1.5 с) и тестовые покупки: проверить кнопки без Яндекса.
 * Документация SDK: https://yandex.ru/dev/games/doc/ru/ ; что настроить в консоли — docs/YANDEX.md.
 */
export const PRODUCTS = [
    { id: 'vhs10', icon: '📼', title: '10 кассет', give: { vhs: 10 } },
    { id: 'vhs50', icon: '📼', title: '50 кассет', give: { vhs: 50 }, hot: true },
    { id: 'e30k', icon: 'Е', title: '30 000 «Е»', give: { chips: 30000 } },
    { id: 'noads', icon: '🚫', title: 'Без рекламы между заездами', give: { noads: true }, forever: true }
];
const INTERSTITIAL_GAP = 180000; // межэкранная — не чаще раза в 3 минуты (и площадка сама ограничивает)

/** Что выдать за покупку (чистая функция, с тестами): начисляет в profile и возвращает, что начислено */
export function grantProduct(profile, id) {
    const p = PRODUCTS.find(function(x) { return x.id === id; });
    if (!p || !profile) return null;
    const se = profile.season = profile.season || {};
    if (p.give.vhs) se.vhs = (se.vhs || 0) + p.give.vhs;
    if (p.give.chips) se.chips = (se.chips || 0) + p.give.chips;
    if (p.give.noads) profile.noAds = true;
    return p.give;
}

/** Можно ли показать межэкранную рекламу сейчас */
export function interstitialDue(lastAt, now, noAds) {
    return !noAds && now - (lastAt || 0) >= INTERSTITIAL_GAP;
}

function mockAd(text) {
    return new Promise(function(resolve) {
        const m = document.createElement('div');
        m.className = 'ad-mock';
        m.textContent = text;
        document.body.appendChild(m);
        setTimeout(function() { m.remove(); resolve(); }, 1500);
    });
}

/**
 * Создать площадку. o: { mode ('web' | 'yandex'), search (location.search), onPause(), onResume() — звук/игра на время рекламы }
 */
export function createPlatform(o) {
    const opts = o || {};
    const mock = /[?&]ads=mock\b/.test(opts.search || '');
    const name = opts.mode === 'yandex' ? 'yandex' : 'web';
    let ysdk = null, ready = null, playing = false, lastInter = 0, busy = false;
    const pause = function() { try { if (opts.onPause) opts.onPause(); } catch (e) {} };
    const resume = function() { try { if (opts.onResume) opts.onResume(); } catch (e) {} };

    const api = {
        name: name, mock: mock,
        /** Подключить SDK (только Яндекс). Возвращает Promise — дальше можно не ждать: методы сами дождутся */
        init: function() {
            if (ready) return ready;
            if (name !== 'yandex') return (ready = Promise.resolve(null));
            ready = new Promise(function(resolve) {
                const s = document.createElement('script');
                s.src = '/sdk.js'; s.async = true;
                s.onload = function() {
                    window.YaGames.init().then(function(sdk) {
                        ysdk = sdk;
                        try { sdk.on('game_api_pause', pause); sdk.on('game_api_resume', resume); } catch (e) {}
                        // вкладку свернули — геймплей остановлен (кадры не идут); вернулись — следующий кадр снова скажет start
                        document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'hidden') api.gameplay(false); });
                        resolve(sdk);
                    }).catch(function() { resolve(null); });
                };
                s.onerror = function() { resolve(null); };
                document.head.appendChild(s);
            });
            return ready;
        },
        /** Язык площадки ('ru', 'en'…) или null */
        lang: function() { try { return ysdk ? ysdk.environment.i18n.lang : null; } catch (e) { return null; } },
        /** Игра загрузилась и готова (Яндекс: LoadingAPI.ready — обязательно) */
        loaded: function() { api.init().then(function(s) { try { if (s) s.features.LoadingAPI.ready(); } catch (e) {} }); },
        /** Разметка геймплея: true — идёт заезд, false — меню/пауза/итоги. Можно звать каждый кадр — шлёт только смену */
        gameplay: function(on) {
            on = !!on && !(typeof window !== 'undefined' && window.__racePaused); // пауза в заезде — тоже «стоп»
            if (on === playing) return;
            playing = on;
            try { if (ysdk && ysdk.features.GameplayAPI) ysdk.features.GameplayAPI[on ? 'start' : 'stop'](); } catch (e) {}
        },
        rewardedAvailable: function() { return mock || name === 'yandex'; },
        /** Реклама за награду → Promise<boolean> (true — досмотрел, выдавай награду) */
        rewarded: function() {
            if (busy) return Promise.resolve(false);
            if (mock) { busy = true; pause(); return mockAd('🎬 Тестовая реклама за награду').then(function() { busy = false; resume(); return true; }); }
            return api.init().then(function(s) {
                if (!s) return false;
                busy = true;
                return new Promise(function(resolve) {
                    let got = false;
                    const done = function() { busy = false; resume(); resolve(got); };
                    s.adv.showRewardedVideo({ callbacks: {
                        onOpen: pause,
                        onRewarded: function() { got = true; },
                        onClose: done,
                        onError: done
                    } });
                });
            });
        },
        /** Межэкранная реклама между заездами (сама решает, пора ли) → Promise (по закрытии) */
        interstitial: function(noAds) {
            const now = Date.now();
            if (busy || !interstitialDue(lastInter, now, noAds)) return Promise.resolve(false);
            lastInter = now;
            if (mock) { busy = true; pause(); return mockAd('📺 Тестовая реклама между заездами').then(function() { busy = false; resume(); return true; }); }
            if (name !== 'yandex') return Promise.resolve(false);
            return api.init().then(function(s) {
                if (!s) return false;
                busy = true;
                return new Promise(function(resolve) {
                    const done = function(shown) { busy = false; resume(); resolve(!!shown); };
                    s.adv.showFullscreenAdv({ callbacks: { onOpen: pause, onClose: done, onError: function() { done(false); } } });
                });
            });
        },
        paymentsAvailable: function() { return mock || name === 'yandex'; },
        /** Каталог: PRODUCTS + цена с площадки ({ ...p, price, priceValue, currencyIcon }) */
        catalog: function() {
            if (mock) return Promise.resolve(PRODUCTS.map(function(p, i) { return Object.assign({}, p, { price: [29, 99, 49, 149][i] + ' ЯН', priceValue: [29, 99, 49, 149][i], currencyIcon: null }); }));
            return api.init().then(function(s) {
                if (!s || !s.payments) return [];
                return s.payments.getCatalog().then(function(list) {
                    return PRODUCTS.map(function(p) {
                        const c = (list || []).find(function(x) { return x.id === p.id; });
                        if (!c) return null;
                        let icon = null;
                        try { icon = c.getPriceCurrencyImage('svg'); } catch (e) {}
                        return Object.assign({}, p, { title: c.title || p.title, price: c.price, priceValue: c.priceValue, currencyIcon: icon });
                    }).filter(Boolean);
                }).catch(function() { return []; });
            });
        },
        /**
         * Купить → Promise<boolean>. grant(id) — начислить и сохранить профиль; ТОЛЬКО ПОСЛЕ этого покупка «гасится»
         * (consumePurchase), чтобы при обрыве сети не пропала. Навсегда (без рекламы) — не гасится.
         */
        buy: function(id, grant) {
            if (mock) { grant(id); return Promise.resolve(true); }
            return api.init().then(function(s) {
                if (!s || !s.payments) return false;
                return s.payments.purchase({ id: id }).then(function(pur) {
                    grant(pur.productID);
                    const p = PRODUCTS.find(function(x) { return x.id === pur.productID; });
                    if (!p || !p.forever) return s.payments.consumePurchase(pur.purchaseToken).then(function() { return true; }, function() { return true; });
                    return true;
                }).catch(function() { return false; });
            });
        },
        /**
         * При запуске: выдать покупки, которые не успели начислить (игра закрылась во время оплаты),
         * и вернуть «навсегда» (без рекламы) на новом устройстве. grant(id, forever)
         */
        restore: function(grant) {
            if (mock || name !== 'yandex') return Promise.resolve(0);
            return api.init().then(function(s) {
                if (!s || !s.payments) return 0;
                return s.payments.getPurchases().then(function(list) {
                    let n = 0;
                    (list || []).forEach(function(pur) {
                        const p = PRODUCTS.find(function(x) { return x.id === pur.productID; });
                        if (!p) return;
                        grant(p.id, !!p.forever);
                        n++;
                        if (!p.forever) s.payments.consumePurchase(pur.purchaseToken).catch(function() {});
                    });
                    return n;
                }).catch(function() { return 0; });
            });
        }
    };
    return api;
}
