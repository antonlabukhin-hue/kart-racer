/**
 * Профили, кампания, localStorage
 *
 * currentPlayer — глобальное состояние сессии (пока window/текущий модуль game).
 * При полном выносе menu.js: export let currentPlayer = null.
 */
import { CAMPAIGN_TRACKS } from './data.js';

export const PROFILES_KEY = 'road_racing_profiles_v1';
export const SESSION_KEY = 'road_racing_session_player';

/** @type {object|null} */
export let currentPlayer = null;

export function setCurrentPlayer(p) {
  currentPlayer = p;
  try { window.currentPlayer = p; } catch (e) {}
}


export function ensureProfileFields(p) {
    if (!p.unlockedCars) p.unlockedCars = ['cheburashka'];
    if (p.hasSeenShop == null) p.hasSeenShop = false;
    if (!p.claimedRewards) p.claimedRewards = {};
    if (!p.daily) p.daily = { date: null, done: false, contractId: null };
    if (!p.season) p.season = defaultSeason();
    if (!p.campaign) p.campaign = { unlocked: 1, completed: [] };
    if (p.campaign.unlocked == null) p.campaign.unlocked = 1;
    if (!Array.isArray(p.campaign.completed)) p.campaign.completed = [];
    if (p.season.chips == null) p.season.chips = 0;
    if (p.season.gum == null) p.season.gum = 0;
    if (!p.carLoadout) p.carLoadout = { parts: [], paint: 'stock', paintByCar: {} };
    if (!p.carLoadout.parts) p.carLoadout.parts = [];
    if (!p.carLoadout.paintByCar || typeof p.carLoadout.paintByCar !== 'object') p.carLoadout.paintByCar = {};
    // миграция: общий paint → текущей машине
    if (p.carLoadout.paint && p.preferredCar && !p.carLoadout.paintByCar[p.preferredCar]) {
        p.carLoadout.paintByCar[p.preferredCar] = p.carLoadout.paint;
    }
    if (!p.trophies) p.trophies = {};
    return p;
}

export function loadAllProfiles() {
    try {
        const raw = localStorage.getItem(PROFILES_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
}

export function saveAllProfiles(list) {
    try { localStorage.setItem(PROFILES_KEY, JSON.stringify(list)); } catch (e) {}
}

export function saveCurrentPlayer() {
    if (!currentPlayer) return;
    const list = loadAllProfiles();
    const i = list.findIndex(p => p.id === currentPlayer.id);
    if (i >= 0) list[i] = currentPlayer;
    else list.push(currentPlayer);
    saveAllProfiles(list);
    try { localStorage.setItem(SESSION_KEY, currentPlayer.id); } catch (e) {}
    updatePlayerBar();
}

export function createProfile(name) {
    const id = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    return {
        id,
        name: String(name).trim().slice(0, 16),
        createdAt: Date.now(),
        preferredCar: 'cheburashka',
        unlockedCars: ['cheburashka'],
        hasSeenShop: false,
        season: defaultSeason(),
        stats: defaultStats(),
        bestTimes: { easy: null, medium: null, hard: null },
        achievements: {},
        history: [],
        unlockedMaps: ['arsenev'],
        campaign: { unlocked: 1, completed: [] },
        claimedRewards: {},
        daily: { date: null, done: false, contractId: null }
    };
}

export function getCampaignProgress() {
    if (!currentPlayer) return { unlocked: 1, completed: [] };
    ensureProfileFields(currentPlayer);
    let cp = currentPlayer.campaign || { unlocked: 1, completed: [] };
    if (cp.unlocked == null || cp.unlocked < 1) cp.unlocked = 1;
    if (!Array.isArray(cp.completed)) cp.completed = [];
    // бэкап на случай старых профилей
    try {
        const raw = localStorage.getItem('road_racing_campaign_' + currentPlayer.id);
        if (raw) {
            const bak = JSON.parse(raw);
            if (bak && bak.unlocked > cp.unlocked) cp.unlocked = bak.unlocked;
            if (bak && Array.isArray(bak.completed)) {
                bak.completed.forEach(function(id) {
                    if (cp.completed.indexOf(id) < 0) cp.completed.push(id);
                });
            }
        }
    } catch (e) {}
    currentPlayer.campaign = cp;
    return cp;
}

export function onCampaignRaceWon(trackId) {
    if (!currentPlayer || !trackId) return;
    ensureProfileFields(currentPlayer);
    const prog = getCampaignProgress();
    const idx = CAMPAIGN_TRACKS.findIndex(function(t){ return t.id === trackId; });
    if (idx < 0) return;
    if (prog.completed.indexOf(trackId) < 0) prog.completed.push(trackId);
    const need = idx + 2;
    const wasUnlocked = prog.unlocked;
    if (prog.unlocked < need) prog.unlocked = Math.min(CAMPAIGN_TRACKS.length, need);
    if (prog.unlocked > wasUnlocked) {
        try { if (window.soundEngine) window.soundEngine.playSfx('fanfare', 1.1); } catch (e) {}
        try {
            const next = CAMPAIGN_TRACKS[Math.min(CAMPAIGN_TRACKS.length - 1, prog.unlocked - 1)];
            const el = document.createElement('div');
            el.className = 'unlock-plaque';
            el.innerHTML = '<div style="font-size:13px;opacity:.85">Новая трасса</div><div style="font-size:20px;font-weight:800">' + (next && next.name ? next.name : ('Глава ' + prog.unlocked)) + '</div>';
            el.style.cssText = 'position:fixed;left:50%;top:22%;transform:translate(-50%,-20px);z-index:220;padding:14px 22px;border-radius:14px;background:rgba(10,20,10,.92);border:2px solid #44ff88;color:#c8ffd8;text-align:center;box-shadow:0 8px 28px rgba(0,255,100,.25);pointer-events:none;opacity:0;transition:opacity .3s,transform .3s';
            document.body.appendChild(el);
            requestAnimationFrame(function(){ el.style.opacity='1'; el.style.transform='translate(-50%,0)'; });
            setTimeout(function(){ el.style.opacity='0'; setTimeout(function(){ try{el.remove();}catch(e){} }, 400); }, 2800);
        } catch (e) {}
    }
    // текущая (следующая открытая) всегда доступна
    if (prog.unlocked < 1) prog.unlocked = 1;
    currentPlayer.campaign = {
        unlocked: prog.unlocked,
        completed: prog.completed.slice()
    };
    try { saveCurrentPlayer(); } catch (e) {}
    try {
        localStorage.setItem('road_racing_campaign_' + (currentPlayer.id || currentPlayer.name || 'p'), JSON.stringify(currentPlayer.campaign));
    } catch (e) {}
    window.__pendingCampaignLore = idx;
    console.log('📖 Кампания сохранена', currentPlayer.campaign);
}


/** recordRaceResult / loginAs / logoutPlayer — пока в game.js (много зависимостей UI) */
