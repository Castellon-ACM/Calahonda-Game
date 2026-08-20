// Casino: menú + ruleta circular con bola
    //  CASINO: ruleta europea (0-36) con rueda circular + bola + boleto de apuestas
    // =====================================================================
    const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const ROULETTE_HISTORY_MAX = 30;
    const ROULETTE_HISTORY_SHOWN = 12;

    let betSlip = []; // [{ type, value, label, amount }, ...] — apuestas ya añadidas
    let lastBetSlip = []; // última apuesta jugada, para "repetir apuesta"
    let wheelRotation = 0;
    let ballRotation = 0;

    function colorOf(n) {
      if (n === 0) return 'green';
      return RED_NUMBERS.indexOf(n) !== -1 ? 'red' : 'black';
    }

    function colorLabelOf(c) {
      return c === 'red' ? 'Rojo' : (c === 'black' ? 'Negro' : 'Verde');
    }

    function normalizeMod(a, n) {
      return ((a % n) + n) % n;
    }

    function buildWheelIfNeeded() {
      const wheel = document.getElementById('wheel');
      if (wheel.dataset.built === '1') return;

      const segPct = 100 / WHEEL_ORDER.length;
      const stops = WHEEL_ORDER.map(function (num, i) {
        const c = colorOf(num) === 'red' ? '#b32020' : (colorOf(num) === 'black' ? '#181818' : '#0f5c2e');
        return c + ' ' + (i * segPct).toFixed(4) + '% ' + ((i + 1) * segPct).toFixed(4) + '%';
      }).join(',');
      wheel.style.background = 'conic-gradient(from 0deg,' + stops + ')';

      const size = wheel.clientWidth, center = size / 2, radius = size * 0.38;
      const labelW = 26, labelH = 18;
      const seg = 360 / WHEEL_ORDER.length;
      WHEEL_ORDER.forEach(function (num, i) {
        const angle = i * seg + seg / 2;
        const rad = angle * Math.PI / 180;
        const x = center + radius * Math.sin(rad);
        const y = center - radius * Math.cos(rad);
        const label = document.createElement('div');
        label.className = 'wheel-num';
        label.dataset.num = num;
        label.textContent = num;
        label.style.left = (x - labelW / 2) + 'px';
        label.style.top = (y - labelH / 2) + 'px';
        label.style.transform = 'rotate(' + angle + 'deg)';
        wheel.appendChild(label);
      });
      wheel.dataset.built = '1';
    }

    // --- Historial de números salidos + números fríos/calientes ---
    function pushRouletteHistory(number) {
      const data = getCurrentUserData();
      if (!data.rouletteHistory) data.rouletteHistory = [];
      data.rouletteHistory.push(number);
      if (data.rouletteHistory.length > ROULETTE_HISTORY_MAX) {
        data.rouletteHistory = data.rouletteHistory.slice(-ROULETTE_HISTORY_MAX);
      }
      saveCurrentUserData(data);
    }

    function renderRouletteHistory() {
      const el = document.getElementById('roulette-history');
      if (!el) return;
      const data = getCurrentUserData();
      const history = (data.rouletteHistory || []).slice(-ROULETTE_HISTORY_SHOWN).reverse();
      if (history.length === 0) {
        el.innerHTML = '<div class="roulette-history-empty">Aún no hay tiradas en esta ruleta</div>';
        return;
      }
      el.innerHTML = history.map(function (n) {
        const c = colorOf(n);
        const cls = c === 'red' ? 'rh-red' : (c === 'black' ? 'rh-black' : 'rh-green');
        return '<span class="roulette-history-chip ' + cls + '">' + n + '</span>';
      }).join('');
    }

    function updateWheelHotCold() {
      const data = getCurrentUserData();
      const history = data.rouletteHistory || [];
      const counts = {};
      for (let n = 0; n <= 36; n++) counts[n] = 0;
      history.forEach(function (n) { counts[n] = (counts[n] || 0) + 1; });

      const sorted = Object.keys(counts).map(Number).sort(function (a, b) { return counts[b] - counts[a]; });
      const hotSet = {}, coldSet = {};

      if (history.length >= 8) {
        sorted.slice(0, 3).forEach(function (n) { if (counts[n] > 0) hotSet[n] = true; });
        sorted.slice(-3).forEach(function (n) { if (!hotSet[n]) coldSet[n] = true; });
      }

      document.querySelectorAll('.wheel-num').forEach(function (label) {
        const n = parseInt(label.dataset.num, 10);
        let suffix = '';
        if (hotSet[n]) suffix = ' 🔥';
        else if (coldSet[n]) suffix = ' ❄️';
        label.textContent = n + suffix;
      });
    }

    function renderCasino() {
      const data = getCurrentUserData();
      updateAllBalances(data.coins);
      showCasinoMenu();
    }

    function showCasinoMenu() {
      document.getElementById('casino-menu').classList.remove('hidden');
      document.querySelectorAll('.casino-subgame').forEach(function (el) { el.classList.add('hidden'); });
      pokerLeavingMenuCleanup();
    }

    function showCasinoGame(name) {
      document.getElementById('casino-menu').classList.add('hidden');
      document.querySelectorAll('.casino-subgame').forEach(function (el) { el.classList.add('hidden'); });
      document.getElementById('casino-game-' + name).classList.remove('hidden');
      if (name === 'roulette') renderRouletteGame();
      if (name === 'slots') renderSlotsGame();
      if (name === 'blackjack') renderBlackjackGame();
      if (name === 'turtles') renderTurtlesGame();
      if (name === 'poker') renderPokerGame();
    }

    // Al salir del subjuego de póker (botón "Volver"), dejamos de escuchar Firestore
    // para no gastar lecturas/listeners de más mientras el jugador está en otro sitio.
    function pokerLeavingMenuCleanup() {
      if (typeof pokerStopLobbyListener === 'function') pokerStopLobbyListener();
      if (typeof pokerStopTableListener === 'function' && !currentPokerTableId) pokerStopTableListener();
    }

    document.querySelectorAll('.casino-game-card').forEach(function (card) {
      card.addEventListener('click', function () { showCasinoGame(this.getAttribute('data-game')); });
    });
    document.querySelectorAll('[data-back]').forEach(function (btn) {
      btn.addEventListener('click', showCasinoMenu);
    });

    function renderRouletteGame() {
      document.getElementById('casino-result').textContent = '';
      document.getElementById('wheel-result-number').textContent = '';
      buildWheelIfNeeded();
      buildBettingTableIfNeeded();
      requestAnimationFrame(buildSplitZonesIfNeeded);
      betSlip = [];
      eraserMode = false;
      document.getElementById('chip-eraser').classList.remove('active');
      document.getElementById('roulette-table').classList.remove('erasing');
      renderBetSlip();
      renderRouletteHistory();
      updateWheelHotCold();
    }

    function setupChipGroup(className, inputId) {
      const chips = document.querySelectorAll('.' + className);
      chips.forEach(function (chip) {
        chip.addEventListener('click', function () {
          document.getElementById(inputId).value = this.getAttribute('data-amount');
          chips.forEach(function (c) { c.classList.remove('selected'); });
          this.classList.add('selected');
        });
      });
    }
    setupChipGroup('slots-chip', 'slots-bet-amount');
    setupChipGroup('bj-chip', 'bj-bet-amount');
    setupChipGroup('turtle-chip', 'turtle-bet-amount');

    // =====================================================================
