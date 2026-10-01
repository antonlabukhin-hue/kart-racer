// Архив для Яндекс Игр: index.html в корне архива (консоль разработчика → «Загрузить архив»)
import { readdirSync, rmSync, statSync } from 'fs';
import { execFileSync } from 'child_process';
const dir = 'dist-yandex', out = 'game-yandex.zip';
rmSync(out, { force: true });
execFileSync('tar', ['-a', '-c', '-f', '../' + out, ...readdirSync(dir)], { cwd: dir, stdio: 'inherit' });
console.log('✔ ' + out + ' — ' + (statSync(out).size / 1048576).toFixed(1) + ' МБ');
