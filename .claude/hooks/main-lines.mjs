// PostToolUse: после правки src/main.js сверяет число строк с MAX_MAIN_LINES из architecture.test.js.
import fs from 'fs';
import path from 'path';

const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
const file = String(input.tool_input?.file_path || '').replace(/\\/g, '/');
if (!/(^|\/)src\/main\.js$/.test(file)) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const lines = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8').split(/\r?\n/).length;
const test = fs.readFileSync(path.join(root, 'tests/unit/architecture.test.js'), 'utf8');
const max = Number((test.match(/MAX_MAIN_LINES\s*=\s*(\d+)/) || [])[1]);
if (!max) process.exit(0);

const left = max - lines;
if (left < 0) {
    console.error(`main.js: ${lines} строк при лимите MAX_MAIN_LINES=${max} (превышение на ${-left}). ` +
        'Новую логику вынести в модуль (скилл extract-module), а не поднимать лимит.');
    process.exit(2);
}
if (left < 30) {
    console.log(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: `main.js: ${lines}/${max} строк, запас ${left}. Добавляя код, сразу выносить логику в модули (скилл extract-module).`
        }
    }));
}
