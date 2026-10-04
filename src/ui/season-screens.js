/**
 * Экраны сезона: «Награды сезона» и «Смена и события» (контракт дня).
 * Зависимости от игры — явно, через d (без глобальных window.*):
 *   player(), ensureFields(p), hideMenu(), save(), notify, rewards, xpToNext(level), claimAll(),
 *   contract(), escape(str), startContract().
 */

/** Экран «Подарки»: вкладка «🎁 Подарки» (прогресс и новости) или «🏆 Сезон» (награды) — один экран, разное содержимое */
export function setSeasonMode(sc, mode) {
    if (!sc) return;
    sc.querySelectorAll('.season-tab[data-stab]').forEach(function(t) { const on = t.dataset.stab === mode; t.classList.toggle('active', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
    const g = sc.querySelector('#gifts-body'), pr = sc.querySelector('#rewards-progress'), l = sc.querySelector('#rewards-list');
    if (g) g.hidden = mode !== 'gifts';
    sc.classList.toggle('gifts-mode', mode === 'gifts');
    if (pr) pr.hidden = mode === 'gifts';
    if (l) l.hidden = mode === 'gifts';
}

export function openRewardsScreen(d) {
    const currentPlayer = d.player();
    if (!currentPlayer) return;
    d.ensureFields(currentPlayer);
    d.hideMenu();
    const sc = document.getElementById('rewards-screen');
    sc.classList.add('active'); sc.style.display = 'flex';
    setSeasonMode(sc, 'rewards');
    const se = currentPlayer.season;
    const claimableCount = d.rewards.filter(r => se.level >= r.level && !currentPlayer.claimedRewards[r.level]).length;
    document.getElementById('rewards-progress').textContent =
        'Уровень ' + se.level + '/30 · XP ' + se.xp + '/' + d.xpToNext(se.level) +
        ' · Е ' + se.chips + ' · 📼 ' + (se.vhs || 0) +
        (claimableCount ? (' · можно забрать: ' + claimableCount) : '');
    const list = document.getElementById('rewards-list');
    // Отдельный div-обёртка вместо прямых appendChild — один reflow
    // (DocumentFragment был создан, но не использовался; удалён).
    const wrap = document.createElement('div');
    if (claimableCount > 0) {
        const allBtn = document.createElement('button');
        allBtn.className = 'garage-btn';
        allBtn.textContent = '🎁 Забрать всё доступное (' + claimableCount + ')';
        allBtn.style.marginBottom = '10px';
        allBtn.addEventListener('click', () => {
            const got = d.claimAll();
            if (got.levels.length && d.notify) {
                d.notify.success('🎁 Награды получены', 'Е +' + got.chips + ' · ур. ' + got.levels.join(', '));
            } else if (got.levels.length) {
                alert('Получено: Е ' + got.chips);
            }
            openRewardsScreen(d);
        });
        wrap.appendChild(allBtn);
    }
    d.rewards.forEach(r => {
        const claimed = !!currentPlayer.claimedRewards[r.level];
        const unlocked = se.level >= r.level;
        const row = document.createElement('div');
        row.className = 'reward-row' + (!unlocked ? ' locked' : claimed ? ' claimed' : ' claimable');
        const left = document.createElement('div');
        left.innerHTML = '<b>Ур.' + r.level + '</b> — ' + r.text +
            '<div style="color:#888;font-size:11px;">Е ' + r.chips + '</div>';
        row.appendChild(left);
        if (unlocked && !claimed) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = 'Забрать';
            btn.addEventListener('click', () => {
                if (currentPlayer.claimedRewards[r.level]) return;
                currentPlayer.claimedRewards[r.level] = Date.now();
                currentPlayer.season.chips += r.chips;
                d.save();
                openRewardsScreen(d);
            });
            row.appendChild(btn);
        } else {
            const sp = document.createElement('span');
            sp.style.cssText = 'margin-left:auto;font-size:12px;color:' + (claimed ? '#6d6' : '#666');
            sp.textContent = claimed ? '✓' : ('ур.' + r.level);
            row.appendChild(sp);
        }
        wrap.appendChild(row);
    });
    list.innerHTML = '';
    list.appendChild(wrap);
}

export function openEventsScreen(d) {
    const currentPlayer = d.player();
    if (!currentPlayer) return;
    d.hideMenu();
    const sc = document.getElementById('events-screen');
    sc.classList.add('active'); sc.style.display = 'flex';
    const c = d.contract();
    const done = currentPlayer.daily && currentPlayer.daily.done;
    document.getElementById('events-body').innerHTML = `
        <div class="event-card">
            <h3>📅 Смена дня${done ? ' ✓' : ''}</h3>
            <p><b>${d.escape(c.title)}</b><br>${d.escape(c.desc)}</p>
            <p>Награда: <b>+${c.xp} XP</b> сезона · Е ${c.chips}</p>
            <p style="color:#888;">Один контракт в сутки. Сброс в полночь.</p>
        </div>
        <div class="event-card">
            <h3>🌙 Сезон 1 «Кассета ЗвероСуда»</h3>
            <p>Качай уровень заездами, забирай награды в разделе «Награды». Без донатов — только км и нервы.</p>
        </div>
        <div class="event-card">
            <h3>🚗 Автопарк</h3>
            <p>«Ушастик» — служебный таз, бесплатно. Остальные — в разделе «Машины»: за «Е» от 3 000 до 100 000, а «Зубило» и «Мечта» — только за видеокассеты 📼. У каждой своя способность, а в гараже — прокачка: двигатель, коробка, шины, броня и нитро.</p>
        </div>`;
    const startBtn = document.getElementById('events-start-contract');
    if (startBtn) {
        startBtn.style.display = done ? 'none' : 'block';
        startBtn.onclick = () => {
            sc.classList.remove('active'); sc.style.display = 'none';
            d.startContract();
        };
    }
}
