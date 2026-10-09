// PreToolUse: не даёт пушить в main, пока на main идёт прогон Deploy (новый пуш его отменит).
import fs from 'fs';

const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
const cmd = String(input.tool_input?.command || '');
if (!/\bgit\b[^;&|]*\bpush\b[^;&|]*\bmain\b/.test(cmd)) process.exit(0);

const url = 'https://api.github.com/repos/antonlabukhin-hue/kart-racer/actions/runs?branch=main&per_page=1';
try {
    const res = await fetch(url, { headers: { 'User-Agent': 'kart-racer-push-guard' }, signal: AbortSignal.timeout(10_000) });
    const run = (await res.json()).workflow_runs?.[0];
    if (run && run.status !== 'completed') {
        console.log(JSON.stringify({
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: `На main идёт прогон ${run.name} (${run.head_sha.slice(0, 7)}, ${run.status}): ${run.html_url}. ` +
                    'Новый пуш отменит деплой — дождаться completed (см. скилл release, шаг 2).'
            }
        }));
    }
} catch (e) {
    console.error('push-guard: не удалось проверить Actions (' + e.message + '), проверь статус вручную.');
}
