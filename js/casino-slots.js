// Casino: tragaperras
    //  TRAGAPERRAS
    // =====================================================================
    const SLOT_SYMBOLS = [
      { sym: '🍒', weight: 35, payout: 4 },
      { sym: '🍋', weight: 25, payout: 6 },
      { sym: '🔔', weight: 18, payout: 10 },
      { sym: '⭐', weight: 12, payout: 16 },
      { sym: '💎', weight: 7, payout: 40 },
      { sym: '7️⃣', weight: 3, payout: 100 }
    ];

    function weightedSlotSymbol() {
      const total = SLOT_SYMBOLS.reduce(function (s, x) { return s + x.weight; }, 0);
      let roll = Math.random() * total;
      for (let i = 0; i < SLOT_SYMBOLS.length; i++) {
        if (roll < SLOT_SYMBOLS[i].weight) return SLOT_SYMBOLS[i];
        roll -= SLOT_SYMBOLS[i].weight;
      }
      return SLOT_SYMBOLS[0];
    }

    function renderSlotsGame() {
      document.getElementById('slots-result').textContent = '';
      const banner = document.getElementById('slots-win-banner');
      banner.classList.remove('show');
      banner.textContent = '';
    }

    let slotsSpinning = false;
    document.getElementById('slots-spin-btn').addEventListener('click', function () {
      if (slotsSpinning) return;
      const btn = this;
      const resultEl = document.getElementById('slots-result');
      const betAmount = parseInt(document.getElementById('slots-bet-amount').value, 10);

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
      const banner = document.getElementById('slots-win-banner');
      banner.classList.remove('show');
      slotsSpinning = true;
      btn.disabled = true;

      const outcome = [weightedSlotSymbol(), weightedSlotSymbol(), weightedSlotSymbol()];
      const reels = [document.getElementById('slot-reel-0'), document.getElementById('slot-reel-1'), document.getElementById('slot-reel-2')];
      const allSyms = SLOT_SYMBOLS.map(function (s) { return s.sym; });
      const durations = [700, 1000, 1300];

      reels.forEach(function (el, i) {
        const start = Date.now();
        const timer = setInterval(function () {
          el.textContent = allSyms[Math.floor(Math.random() * allSyms.length)];
          if (Date.now() - start >= durations[i]) {
            clearInterval(timer);
            el.textContent = outcome[i].sym;
          }
        }, 60);
      });

      setTimeout(function () {
        let payout = 0;
        if (outcome[0].sym === outcome[1].sym && outcome[1].sym === outcome[2].sym) {
          payout = betAmount * outcome[0].payout;
        } else if (outcome[0].sym === outcome[1].sym || outcome[1].sym === outcome[2].sym || outcome[0].sym === outcome[2].sym) {
          payout = betAmount;
        }
        const fresh = getCurrentUserData();
        fresh.coins += payout;
        saveCurrentUserData(fresh);
        updateAllBalances(fresh.coins);

        if (payout > betAmount) {
          resultEl.textContent = '¡Premio! +' + (payout - betAmount) + ' monedas';
          banner.textContent = '🎉 +' + (payout - betAmount) + ' monedas 🎉';
          banner.classList.add('show');
        } else if (payout === betAmount) {
          resultEl.textContent = 'Empate: recuperas tu apuesta';
        } else {
          resultEl.textContent = 'Sigue intentándolo...';
        }

        slotsSpinning = false;
        btn.disabled = false;
      }, Math.max.apply(null, durations) + 150);
    });

    // =====================================================================
