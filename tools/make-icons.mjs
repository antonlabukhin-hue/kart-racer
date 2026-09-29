// Иконки приложения (PWA и магазины): машина игры на закатном фоне с дорогой.
// Запуск: node tools/make-icons.mjs → public/icons/*.png
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const out = path.resolve('public/icons');
fs.mkdirSync(out, { recursive: true });
const car = 'data:image/png;base64,' + fs.readFileSync('public/images/car_cheburashka.png').toString('base64');

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); // локально без скачанного Chromium: PW_CHANNEL=msedge
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');
// size — сторона, pad — доля поля (maskable: система обрезает до круга/капли, всё важное — в центральных 80%)
const draw = (size, pad, round) => page.evaluate(async ({ size, pad, round, car }) => {
    const c = document.getElementById('c'); c.width = c.height = size;
    const x = c.getContext('2d');
    x.clearRect(0, 0, size, size);
    if (round) { const r = size * 0.22; x.beginPath(); x.roundRect(0, 0, size, size, r); x.clip(); }
    const sky = x.createLinearGradient(0, 0, 0, size);
    sky.addColorStop(0, '#2a0f24'); sky.addColorStop(0.45, '#c2361c'); sky.addColorStop(0.62, '#ffb347'); sky.addColorStop(0.62, '#3a2a22'); sky.addColorStop(1, '#1a1210');
    x.fillStyle = sky; x.fillRect(0, 0, size, size);
    // солнце
    x.fillStyle = 'rgba(255,220,120,0.9)'; x.beginPath(); x.arc(size * 0.5, size * 0.6, size * 0.16, Math.PI, 0); x.fill();
    // дорога в перспективе
    x.fillStyle = '#2b2b33'; x.beginPath(); x.moveTo(size * 0.46, size * 0.62); x.lineTo(size * 0.54, size * 0.62); x.lineTo(size * 0.95, size); x.lineTo(size * 0.05, size); x.closePath(); x.fill();
    x.strokeStyle = '#ffd23c'; x.lineWidth = size * 0.012; x.setLineDash([size * 0.05, size * 0.04]);
    x.beginPath(); x.moveTo(size * 0.5, size * 0.63); x.lineTo(size * 0.5, size); x.stroke(); x.setLineDash([]);
    const img = new Image(); img.src = car; await img.decode();
    const s = size * (1 - pad * 2) * 1.05;
    x.drawImage(img, (size - s) / 2, size * 0.98 - s * 0.9, s, s);
    return c.toDataURL('image/png');
}, { size, pad, round, car });
const save = async (name, size, pad, round) => fs.writeFileSync(path.join(out, name), Buffer.from((await draw(size, pad, round)).split(',')[1], 'base64'));
await save('icon-192.png', 192, 0.06, true);
await save('icon-512.png', 512, 0.06, true);
await save('maskable-512.png', 512, 0.14, false);
await save('apple-touch-icon.png', 180, 0.06, false);
await save('favicon-64.png', 64, 0.02, true);
await browser.close();
console.log('icons →', out);
