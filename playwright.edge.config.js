// Временный локальный конфиг: те же тесты, но в установленном Microsoft Edge (Chromium не скачивается)
import base from './playwright.config.js';
export default { ...base, use: { ...base.use, channel: 'msedge' } };
