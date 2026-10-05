// Иконки приложения (PWA и магазины) — из иконки каталога docs/store/icon-1024.png (рендер из движка, вариант «В»:
// ночной прыжок «Ушастика», «Шестисотый» в погоне). Сначала: ART_ONLY=store npm run art
// Запуск: node tools/make-icons.mjs → public/icons/*.png  (локально без скачанного Chromium: PW_CHANNEL=msedge)
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const out = path.resolve('public/icons');
fs.mkdirSync(out, { recursive: true });
const src = 'data:image/png;base64,' + fs.readFileSync('docs/store/icon-1024.png').toString('base64');

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');
// round — скруглённые углы (иконка вкладки и «на экран»); maskable — во весь квадрат: система сама обрежет до круга/капли
const draw = (size, round) => page.evaluate(async ({ size, round, src }) => {
    const c = document.getElementById('c'); c.width = c.height = size;
    const x = c.getContext('2d');
    x.clearRect(0, 0, size, size);
    if (round) { x.beginPath(); x.roundRect(0, 0, size, size, size * 0.22); x.clip(); }
    const img = new Image(); img.src = src; await img.decode();
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, size, size);
    return c.toDataURL('image/png');
}, { size, round, src });
const save = async (name, size, round) => fs.writeFileSync(path.join(out, name), Buffer.from((await draw(size, round)).split(',')[1], 'base64'));
await save('icon-192.png', 192, true);
await save('icon-512.png', 512, true);
await save('maskable-512.png', 512, false);
await save('apple-touch-icon.png', 180, false);
await save('favicon-64.png', 64, true);
await browser.close();
console.log('icons →', out);
