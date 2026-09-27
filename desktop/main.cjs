// Настольная сборка (Steam / Windows / macOS / Linux): Electron-оболочка вокруг dist/.
// Запуск: см. docs/RELEASE.md. Игра грузится по app://game/ — ES-модули и fetch работают как на сайте.
const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// в собранном приложении dist/ лежит рядом (electron-builder копирует), при разработке — в корне проекта
const DIST = fs.existsSync(path.join(__dirname, 'dist', 'index.html'))
    ? path.join(__dirname, 'dist')
    : path.join(__dirname, '..', 'dist');

protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
]);

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 960,
        minHeight: 540,
        backgroundColor: '#000000',
        autoHideMenuBar: true,
        title: 'Дорожный прорыв',
        webPreferences: {
            backgroundThrottling: false, // игра не «засыпает», когда окно не в фокусе на втором мониторе
            contextIsolation: true,
            sandbox: true
        }
    });
    win.setMenuBarVisibility(false);
    // F11 — полный экран; звук без клика по окну
    win.webContents.on('before-input-event', function(ev, input) {
        if (input.type === 'keyDown' && input.key === 'F11') {
            win.setFullScreen(!win.isFullScreen());
            ev.preventDefault();
        }
    });
    // внешние ссылки — в браузер, не в окно игры
    win.webContents.setWindowOpenHandler(function() { return { action: 'deny' }; });
    win.loadURL('app://game/index.html');

    // RB_SMOKE=1 — проверка сборки: загрузиться, отчитаться в консоль и выйти
    if (process.env.RB_SMOKE) {
        const errors = [];
        win.webContents.on('console-message', function(ev) {
            if (ev.level === 'error') errors.push(ev.message);
        });
        win.webContents.on('did-finish-load', function() {
            setTimeout(async function() {
                const r = await win.webContents.executeJavaScript(
                    '({ title: document.title, cards: document.querySelectorAll(".menu-card").length, three: !!document.querySelector("canvas") || typeof window.soundEngine })');
                console.log('RB_SMOKE ' + JSON.stringify(Object.assign(r, { errors: errors })));
                app.quit();
            }, 3000);
        });
    }
}

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

app.whenReady().then(function() {
    protocol.handle('app', function(req) {
        const { pathname } = new URL(req.url);
        const file = path.normalize(path.join(DIST, decodeURIComponent(pathname)));
        // только файлы внутри dist/
        if (!file.startsWith(DIST)) return new Response('Forbidden', { status: 403 });
        return net.fetch(pathToFileURL(file).toString());
    });
    createWindow();
    app.on('activate', function() {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') app.quit();
});
