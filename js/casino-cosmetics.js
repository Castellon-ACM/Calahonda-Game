// Ruleta de cosméticos + mesa/fichas/apuestas de la ruleta de casino
    //  RULETA DE COSMÉTICOS
    // =====================================================================
    const COSMETIC_SKINS = [
      { id: 'sunglasses', label: 'Gafas de sol', icon: '😎', rarity: 'common' },
      { id: 'party', label: 'Gorro de fiesta', icon: '🎉', rarity: 'common' },
      { id: 'scarf', label: 'Bufanda', icon: '🧣', rarity: 'common' },
      { id: 'bow', label: 'Lazo dorado', icon: '🎀', rarity: 'common' },
      { id: 'tie', label: 'Corbata', icon: '👔', rarity: 'rare' },
      { id: 'spain', label: 'Bandera España', icon: '🇪🇸', rarity: 'rare' },
      { id: 'cape', label: 'Capa de héroe', icon: '🦸', rarity: 'rare' },
      { id: 'santa', label: 'Gorro navideño', icon: '🎅', rarity: 'epic' },
      { id: 'tophat', label: 'Sombrero de copa', icon: '🎩', rarity: 'epic' },
      { id: 'crown', label: 'Corona real', icon: '👑', rarity: 'legendary' }
    ];
    const COSMETIC_SPIN_COST = 30;

    function pickWeightedCosmetic() {
      const roll = Math.random() * 100;
      let rarity;
      if (roll < RARITY_WEIGHT.legendary) rarity = 'legendary';
      else if (roll < RARITY_WEIGHT.legendary + RARITY_WEIGHT.epic) rarity = 'epic';
      else if (roll < RARITY_WEIGHT.legendary + RARITY_WEIGHT.epic + RARITY_WEIGHT.rare) rarity = 'rare';
      else rarity = 'common';
      const pool = COSMETIC_SKINS.filter(function (s) { return s.rarity === rarity; });
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function makeCosmeticReelItem(skin) {
      const el = document.createElement('div');
      el.className = 'roulette-item rarity-' + skin.rarity;
      el.innerHTML =
        '<div class="skin-icon">' + skin.icon + '</div>' +
        '<div class="bottle-name">' + skin.label + '</div>';
      return el;
    }

    function buildIdleCosmeticReel() {
      const track = document.getElementById('cosmetics-track');
      track.style.transition = 'none';
      track.style.transform = 'translateX(0px)';
      track.innerHTML = '';
      for (let i = 0; i < 12; i++) {
        track.appendChild(makeCosmeticReelItem(COSMETIC_SKINS[Math.floor(Math.random() * COSMETIC_SKINS.length)]));
      }
    }

    function renderCosmeticsGame() {
      document.getElementById('cosmetics-result').textContent = '';
      buildIdleCosmeticReel();
    }

    document.getElementById('cosmetics-spin-btn').addEventListener('click', function () {
      const spinBtn = this;
      const resultEl = document.getElementById('cosmetics-result');
      const data = getCurrentUserData();

      if (data.coins < COSMETIC_SPIN_COST) {
        resultEl.textContent = 'No tienes suficientes monedas';
        return;
      }

      data.coins -= COSMETIC_SPIN_COST;
      saveAndSync(data);
      updateAllBalances(data.coins);
      resultEl.textContent = '';
      spinBtn.disabled = true;

      const track = document.getElementById('cosmetics-track');
      const wrap = track.parentElement;
      const winner = pickWeightedCosmetic();
      const totalItems = 46, winnerIndex = 40;

      track.style.transition = 'none';
      track.style.transform = 'translateX(0px)';
      track.innerHTML = '';
      for (let i = 0; i < totalItems; i++) {
        const item = (i === winnerIndex) ? winner : COSMETIC_SKINS[Math.floor(Math.random() * COSMETIC_SKINS.length)];
        track.appendChild(makeCosmeticReelItem(item));
      }

      void track.offsetWidth;
      const wrapWidth = wrap.clientWidth;
      const targetX = -(winnerIndex * ITEM_FULL_WIDTH + ITEM_FULL_WIDTH / 2 - wrapWidth / 2);

      requestAnimationFrame(function () {
        track.style.transition = 'transform 4.2s cubic-bezier(0.1, 0.75, 0.1, 1)';
        track.style.transform = 'translateX(' + targetX + 'px)';
      });

      setTimeout(function () {
        const fresh = getCurrentUserData();
        if (!fresh.ownedSkins) fresh.ownedSkins = {};
        if (fresh.ownedSkins[winner.id]) {
          const refund = Math.round(COSMETIC_SPIN_COST * 0.5);
          fresh.coins += refund;
          resultEl.textContent = 'Ya tenías "' + winner.label + '" — recuperas ' + refund + ' monedas';
        } else {
          fresh.ownedSkins[winner.id] = true;
          resultEl.textContent = '¡Has desbloqueado "' + winner.label + '"!';
        }
        saveAndSync(fresh);
        updateAllBalances(fresh.coins);
        spinBtn.disabled = false;
      }, 4300);
    });

    // --- Fichas de casino (seleccionan la cantidad activa) ---
    document.querySelectorAll('.chip[data-amount]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        document.getElementById('bet-amount').value = this.getAttribute('data-amount');
        document.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('selected'); });
        this.classList.add('selected');
      });
    });

    document.getElementById('chip-max').addEventListener('click', function () {
      const data = getCurrentUserData();
      const wagered = betSlip.reduce(function (s, b) { return s + b.amount; }, 0);
      document.getElementById('bet-amount').value = Math.max(data.coins - wagered, 0);
      document.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('selected'); });
      this.classList.add('selected');
    });

    let eraserMode = false;
    document.getElementById('chip-eraser').addEventListener('click', function () {
      eraserMode = !eraserMode;
      this.classList.toggle('active', eraserMode);
      document.getElementById('roulette-table').classList.toggle('erasing', eraserMode);
    });

    // --- Mesa de ruleta: clicar directamente sobre números / apuestas exteriores ---
    function makeTableCell(type, value, label, extraClass, gridColumn, gridRow) {
      const el = document.createElement('div');
      el.className = 'rt-cell ' + (extraClass || '');
      el.style.gridColumn = gridColumn;
      el.style.gridRow = gridRow;
      el.dataset.type = type;
      el.dataset.value = String(value);
      el.innerHTML = '<span class="rt-label">' + label + '</span><span class="chip-badge"></span>';
      el.addEventListener('click', function () {
        if (eraserMode) { removeBetAt(type, value); } else { placeBet(type, value, label); }
      });
      return el;
    }

    function buildBettingTableIfNeeded() {
      const table = document.getElementById('roulette-table');
      if (table.dataset.built === '1') return;
      table.innerHTML = '';

      table.appendChild(makeTableCell('number', 0, '0', 'rt-zero', '1', '1 / 4'));

      for (let c = 1; c <= 12; c++) {
        const top = 3 * c, mid = 3 * c - 1, bottom = 3 * c - 2;
        table.appendChild(makeTableCell('number', top, top, colorOf(top) === 'red' ? 'rt-red' : 'rt-black', (c + 1) + '', '1'));
        table.appendChild(makeTableCell('number', mid, mid, colorOf(mid) === 'red' ? 'rt-red' : 'rt-black', (c + 1) + '', '2'));
        table.appendChild(makeTableCell('number', bottom, bottom, colorOf(bottom) === 'red' ? 'rt-red' : 'rt-black', (c + 1) + '', '3'));
      }

      table.appendChild(makeTableCell('dozen', 1, '1ª docena', 'rt-outside', '2 / 6', '4'));
      table.appendChild(makeTableCell('dozen', 2, '2ª docena', 'rt-outside', '6 / 10', '4'));
      table.appendChild(makeTableCell('dozen', 3, '3ª docena', 'rt-outside', '10 / 14', '4'));

      table.appendChild(makeTableCell('range', 'low', '1-18', 'rt-outside', '2 / 4', '5'));
      table.appendChild(makeTableCell('parity', 'even', 'PAR', 'rt-outside', '4 / 6', '5'));
      table.appendChild(makeTableCell('color', 'red', 'ROJO', 'rt-outside rt-red', '6 / 8', '5'));
      table.appendChild(makeTableCell('color', 'black', 'NEGRO', 'rt-outside rt-black', '8 / 10', '5'));
      table.appendChild(makeTableCell('parity', 'odd', 'IMPAR', 'rt-outside', '10 / 12', '5'));
      table.appendChild(makeTableCell('range', 'high', '19-36', 'rt-outside', '12 / 14', '5'));

      table.dataset.built = '1';
    }

    // --- Apuestas "a caballo" entre números (splits) ---
    function valuesEqual(a, b) {
      if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.slice().sort().join(',') === b.slice().sort().join(',');
      }
      return a === b;
    }

    function buildSplitZonesIfNeeded() {
      const table = document.getElementById('roulette-table');
      if (table.dataset.splitsBuilt === '1') return;

      const tableRect = table.getBoundingClientRect();
      const numberCells = {};
      table.querySelectorAll('.rt-cell[data-type="number"]').forEach(function (cell) {
        numberCells[cell.dataset.value] = cell;
      });

      function rectRelative(el) {
        const r = el.getBoundingClientRect();
        return { left: r.left - tableRect.left, top: r.top - tableRect.top, width: r.width, height: r.height };
      }

      const splitLayer = document.createElement('div');
      splitLayer.className = 'split-layer';
      table.appendChild(splitLayer);

      const splitW = 12;

      function addSplitZone(valuesArray, box, label) {
        const zone = document.createElement('div');
        zone.className = 'split-zone';
        zone.style.left = box.left + 'px';
        zone.style.top = box.top + 'px';
        zone.style.width = box.width + 'px';
        zone.style.height = box.height + 'px';
        zone.title = label;
        zone.innerHTML = '<span class="chip-badge"></span>';
        zone.addEventListener('click', function (e) {
          e.stopPropagation();
          if (eraserMode) { removeBetAt('split', valuesArray); } else { placeBet('split', valuesArray, label); }
        });
        zone.dataset.values = valuesArray.join(',');
        splitLayer.appendChild(zone);
      }

      // Horizontales: entre columnas adyacentes de la misma fila
      for (let row = 1; row <= 3; row++) {
        for (let c = 1; c <= 11; c++) {
          const valA = row === 1 ? 3 * c : (row === 2 ? 3 * c - 1 : 3 * c - 2);
          const valB = row === 1 ? 3 * (c + 1) : (row === 2 ? 3 * (c + 1) - 1 : 3 * (c + 1) - 2);
          const cellA = numberCells[valA], cellB = numberCells[valB];
          if (!cellA || !cellB) continue;
          const ra = rectRelative(cellA);
          const cx = ra.left + ra.width;
          addSplitZone([valA, valB], { left: cx - splitW / 2, top: ra.top, width: splitW, height: ra.height }, valA + '/' + valB);
        }
      }

      // Verticales: entre filas de la misma columna
      for (let c = 1; c <= 12; c++) {
        const topVal = 3 * c, midVal = 3 * c - 1, botVal = 3 * c - 2;
        const cellTop = numberCells[topVal], cellMid = numberCells[midVal], cellBot = numberCells[botVal];
        if (cellTop && cellMid) {
          const rt = rectRelative(cellTop);
          const cy = rt.top + rt.height;
          addSplitZone([topVal, midVal], { left: rt.left, top: cy - splitW / 2, width: rt.width, height: splitW }, topVal + '/' + midVal);
        }
        if (cellMid && cellBot) {
          const rm = rectRelative(cellMid);
          const cy = rm.top + rm.height;
          addSplitZone([midVal, botVal], { left: rm.left, top: cy - splitW / 2, width: rm.width, height: splitW }, midVal + '/' + botVal);
        }
      }

      // Splits con el 0
      const zeroCell = numberCells['0'];
      [1, 2, 3].forEach(function (v) {
        const cell = numberCells[v];
        if (!zeroCell || !cell) return;
        const rz = rectRelative(zeroCell), rc = rectRelative(cell);
        const cx = rz.left + rz.width;
        addSplitZone([0, v], { left: cx - splitW / 2, top: rc.top, width: splitW, height: rc.height }, '0/' + v);
      });

      table.dataset.splitsBuilt = '1';
    }

    function removeBetAt(type, value) {
      const idx = betSlip.findIndex(function (b) { return b.type === type && valuesEqual(b.value, value); });
      if (idx !== -1) {
        betSlip.splice(idx, 1);
        renderBetSlip();
      }
    }

    function placeBet(type, value, label) {
      const resultEl = document.getElementById('casino-result');
      const amount = parseInt(document.getElementById('bet-amount').value, 10);

      if (!amount || amount <= 0) {
        resultEl.textContent = 'Elige una cantidad primero (ficha o campo)';
        return;
      }
      const data = getCurrentUserData();
      const wagered = betSlip.reduce(function (s, b) { return s + b.amount; }, 0);
      if (wagered + amount > data.coins) {
        resultEl.textContent = 'No tienes suficientes monedas para esa apuesta';
        return;
      }

      const existing = betSlip.find(function (b) { return b.type === type && valuesEqual(b.value, value); });
      if (existing) {
        existing.amount += amount;
      } else {
        betSlip.push({ type: type, value: value, label: label, amount: amount });
      }

      resultEl.textContent = '';
      renderBetSlip();
    }

    function refreshTableBadges() {
      document.querySelectorAll('.rt-cell').forEach(function (cell) {
        const type = cell.dataset.type;
        const rawValue = cell.dataset.value;
        const value = (type === 'number' || type === 'dozen') ? parseInt(rawValue, 10) : rawValue;
        const match = betSlip.find(function (b) { return b.type === type && valuesEqual(b.value, value); });
        const badge = cell.querySelector('.chip-badge');
        badge.textContent = match ? match.amount : '';
      });
      document.querySelectorAll('.split-zone').forEach(function (zone) {
        const values = zone.dataset.values.split(',').map(function (v) { return parseInt(v, 10); });
        const match = betSlip.find(function (b) { return b.type === 'split' && valuesEqual(b.value, values); });
        const badge = zone.querySelector('.chip-badge');
        badge.textContent = match ? match.amount : '';
      });
    }

    function renderBetSlip() {
      const totalEl = document.getElementById('bet-slip-total');
      const total = betSlip.reduce(function (s, b) { return s + b.amount; }, 0);
      totalEl.textContent = total > 0 ? ('Total apostado: ' + total + ' 🪙') : '';
      refreshTableBadges();
    }

    function computePayout(bet, number, betAmount) {
      const color = colorOf(number);
      const isEven = number !== 0 && number % 2 === 0;
      const isLow = number >= 1 && number <= 18;
      const isHigh = number >= 19 && number <= 36;

      if (bet.type === 'number') return number === bet.value ? betAmount * 36 : 0;
      if (bet.type === 'color') return color === bet.value ? betAmount * 2 : 0;
      if (bet.type === 'parity') {
        if (number === 0) return 0;
        return (bet.value === 'even' ? isEven : !isEven) ? betAmount * 2 : 0;
      }
      if (bet.type === 'range') return (bet.value === 'low' ? isLow : isHigh) ? betAmount * 2 : 0;
      if (bet.type === 'dozen') {
        if (number === 0) return 0;
        const d = Math.ceil(number / 12);
        return d === bet.value ? betAmount * 3 : 0;
      }
      if (bet.type === 'split') {
        return bet.value.indexOf(number) !== -1 ? betAmount * 18 : 0;
      }
      return 0;
    }

    function spinWheelTo(resultNumber) {
      const wheel = document.getElementById('wheel');
      const ballTrack = document.getElementById('ball-track');
      const seg = 360 / WHEEL_ORDER.length;
      const idx = WHEEL_ORDER.indexOf(resultNumber);
      const centerAngle = idx * seg + seg / 2;

      const desiredWheelMod = normalizeMod(360 - centerAngle, 360);
      const deltaWheel = normalizeMod(desiredWheelMod - normalizeMod(wheelRotation, 360), 360);
      wheelRotation += 5 * 360 + deltaWheel;

      const deltaBall = normalizeMod(0 - normalizeMod(ballRotation, 360), 360);
      ballRotation += 9 * 360 + deltaBall;

      wheel.style.transition = 'transform 4.5s cubic-bezier(0.12, 0.72, 0.15, 1)';
      wheel.style.transform = 'rotate(' + wheelRotation + 'deg)';

      ballTrack.style.transition = 'transform 4.2s cubic-bezier(0.08, 0.85, 0.1, 1)';
      ballTrack.style.transform = 'rotate(-' + ballRotation + 'deg)';
    }

    document.getElementById('casino-spin-btn').addEventListener('click', function () {
      const spinBtn = this;
      const resultEl = document.getElementById('casino-result');

      if (betSlip.length === 0) {
        resultEl.textContent = 'Añade al menos una apuesta al boleto';
        return;
      }

      const data = getCurrentUserData();
      const totalWager = betSlip.reduce(function (s, b) { return s + b.amount; }, 0);
      if (totalWager > data.coins) {
        resultEl.textContent = 'No tienes suficientes monedas';
        return;
      }

      data.coins -= totalWager;
      saveAndSync(data);
      updateAllBalances(data.coins);
      resultEl.textContent = '';
      spinBtn.disabled = true;
      document.getElementById('roulette-table').style.pointerEvents = 'none';

      const resultNumber = WHEEL_ORDER[Math.floor(Math.random() * WHEEL_ORDER.length)];
      spinWheelTo(resultNumber);

      const activeBets = betSlip.slice();

      setTimeout(function () {
        let totalPayout = 0;
        const details = [];
        activeBets.forEach(function (b) {
          const payout = computePayout(b, resultNumber, b.amount);
          totalPayout += payout;
          details.push(b.label + ': ' + (payout > 0 ? '+' + payout : '-' + b.amount));
        });

        const fresh = getCurrentUserData();
        fresh.coins += totalPayout;
        saveAndSync(fresh);
        updateAllBalances(fresh.coins);

        // Guardar en el historial + refrescar hielo/fuego
        pushRouletteHistory(resultNumber);
        renderRouletteHistory();
        updateWheelHotCold();

        // Recordar esta apuesta para poder repetirla
        lastBetSlip = activeBets.slice();

        const label = colorLabelOf(colorOf(resultNumber));
        document.getElementById('wheel-result-number').textContent = 'Salió ' + resultNumber + ' (' + label + ')';

        const net = totalPayout - totalWager;
        resultEl.innerHTML = details.join(' · ') + '<br>' + (net >= 0 ? 'Ganancia neta: +' + net : 'Pérdida neta: ' + net);

        betSlip = [];
        renderBetSlip();
        spinBtn.disabled = false;
        document.getElementById('roulette-table').style.pointerEvents = 'auto';
      }, 4600);
    });

    // --- Repetir la última apuesta jugada ---
    document.getElementById('repeat-bet-btn').addEventListener('click', function () {
      const resultEl = document.getElementById('casino-result');
      if (lastBetSlip.length === 0) {
        resultEl.textContent = 'Todavía no hay ninguna apuesta anterior que repetir';
        return;
      }
      const data = getCurrentUserData();
      const total = lastBetSlip.reduce(function (s, b) { return s + b.amount; }, 0);
      if (total > data.coins) {
        resultEl.textContent = 'No tienes suficientes monedas para repetir esa apuesta';
        return;
      }
      betSlip = lastBetSlip.map(function (b) {
        return {
          type: b.type,
          value: Array.isArray(b.value) ? b.value.slice() : b.value,
          label: b.label,
          amount: b.amount
        };
      });
      resultEl.textContent = '';
      renderBetSlip();
    });

    // =====================================================================
