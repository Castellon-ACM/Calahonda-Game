// Casino: carreras de tortugas
    //  CARRERAS DE TORTUGAS
    // =====================================================================
    const TURTLE_COLORS = ['#3ba55c', '#e0a52c', '#4d8fe0', '#c37bf0'];
    let selectedTurtle = null;
    let turtleRacing = false;

    function renderTurtlesGame() {
      document.getElementById('turtle-result').textContent = '';
      selectedTurtle = null;

      const trackWrap = document.getElementById('turtle-track-wrap');
      trackWrap.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const lane = document.createElement('div');
        lane.className = 'turtle-lane';
        lane.innerHTML = '<div class="turtle-runner" id="turtle-runner-' + i + '" style="color:' + TURTLE_COLORS[i] + '">🐢</div>';
        trackWrap.appendChild(lane);
      }

      const selectRow = document.getElementById('turtle-select-row');
      selectRow.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const btn = document.createElement('div');
        btn.className = 'turtle-select-btn';
        btn.textContent = '🐢 ' + (i + 1);
        btn.style.color = TURTLE_COLORS[i];
        btn.addEventListener('click', function () {
          selectedTurtle = i;
          document.querySelectorAll('.turtle-select-btn').forEach(function (b) { b.classList.remove('selected'); });
          btn.classList.add('selected');
        });
        selectRow.appendChild(btn);
      }
    }

    document.getElementById('turtle-race-btn').addEventListener('click', function () {
      const btn = this;
      const resultEl = document.getElementById('turtle-result');
      if (turtleRacing) return;
      if (selectedTurtle === null) {
        resultEl.textContent = 'Elige primero una tortuga';
        return;
      }
      const betAmount = parseInt(document.getElementById('turtle-bet-amount').value, 10);
      if (!betAmount || betAmount <= 0) {
        resultEl.textContent = 'Introduce una cantidad válida';
        return;
      }
      const data = getCurrentUserData();
      if (betAmount > data.coins) {
        resultEl.textContent = 'No tienes suficientes monedas';
        return;
      }

      data.coins -= betAmount;
      saveCurrentUserData(data);
      updateAllBalances(data.coins);
      resultEl.textContent = '';
      turtleRacing = true;
      btn.disabled = true;

      const durations = [0, 1, 2, 3].map(function () { return 2600 + Math.random() * 1800; });
      let winner = 0;
      for (let i = 1; i < 4; i++) { if (durations[i] < durations[winner]) winner = i; }

      for (let i = 0; i < 4; i++) {
        const runner = document.getElementById('turtle-runner-' + i);
        const lane = runner.parentElement;
        runner.style.transition = 'none';
        runner.style.left = '2px';
        void runner.offsetWidth;
        const distance = lane.clientWidth - 30;
        (function (r, d, dist) {
          requestAnimationFrame(function () {
            r.style.transition = 'left ' + (d / 1000) + 's linear';
            r.style.left = dist + 'px';
          });
        })(runner, durations[i], distance);
      }

      const maxDuration = Math.max.apply(null, durations);
      setTimeout(function () {
        const fresh = getCurrentUserData();
        let payout = 0;
        if (winner === selectedTurtle) {
          payout = Math.round(betAmount * 3);
          fresh.coins += payout;
        }
        saveCurrentUserData(fresh);
        updateAllBalances(fresh.coins);
        resultEl.textContent = 'Gana la tortuga ' + (winner + 1) + (winner === selectedTurtle ? ' — ¡Ganas ' + payout + ' monedas!' : ' — Pierdes la apuesta');
        turtleRacing = false;
        btn.disabled = false;
      }, maxDuration + 200);
    });

    // =====================================================================
