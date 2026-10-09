// PostToolUse: после правки src/**/*.js гоняет только связанные юнит-тесты (vitest related).
import fs from 'fs';
import { spawnSync } from 'child_process';

const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
const file = String(input.tool_input?.file_path || '').replace(/\\/g, '/');
if (!/(^|\/)src\/.+\.(js|json)$/.test(file) || /(^|\/)src\/main\.js$/.test(file)) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const r = spawnSync(`npx vitest related "${file}" --run --passWithNoTests --reporter=dot`, {
    cwd: root, encoding: 'utf8', shell: true, timeout: 90_000
});
if (r.status !== 0 && !r.error) {
    const out = (r.stdout + r.stderr).split(/\r?\n/).filter(Boolean).slice(-40).join('\n');
    console.error(`Связанные юнит-тесты упали после правки ${file}:\n${out}`);
    process.exit(2);
}
