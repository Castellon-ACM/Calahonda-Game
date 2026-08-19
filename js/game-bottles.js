// Juego: monedas diarias + ruleta de botellas
    //  JUEGO: monedas diarias + ruleta de botellas
    // =====================================================================
    const REWARDS = [
      { name: "Jägermeister", rarity: "common" },
      { name: "Smirnoff", rarity: "common" },
      { name: "Baileys", rarity: "common" },
      { name: "Absolut", rarity: "common" },
      { name: "Heineken", rarity: "common" },
      { name: "Ballantine's", rarity: "rare" },
      { name: "Bacardí", rarity: "rare" },
      { name: "Jack Daniel's", rarity: "rare" },
      { name: "Johnnie Walker", rarity: "rare" },
      { name: "Hennessy", rarity: "epic" },
      { name: "Moët & Chandon", rarity: "epic" },
      { name: "Grey Goose", rarity: "epic" },
      { name: "Black Label", rarity: "epic" },
      { name: "Dom Pérignon", rarity: "legendary" },
      { name: "Macallan 18", rarity: "legendary" },
      { name: "Louis XIII", rarity: "legendary" }
    ];
    const RARITY_WEIGHT = { legendary: 3, epic: 12, rare: 25, common: 60 };
    const ITEM_FULL_WIDTH = 102; // 90px + 6px*2 de margen
    const SPIN_COST = 10;
    const CLAIM_AMOUNT = 100;
    const CLAIM_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 horas en milisegundos

    // --- Iconos originales por botella (SVG propio, no fotos reales) ---
    const BOTTLE_STYLE = {
      "Jägermeister": { glass: "#0b3d1f", cap: "#111111", label: "#d9622b" },
      "Smirnoff": { glass: "#cfd8dc", cap: "#b71c1c", label: "#ffffff" },
      "Baileys": { glass: "#5b3a1a", cap: "#3a2410", label: "#f0e4c8" },
      "Absolut": { glass: "#e8eef2", cap: "#123a6b", label: "#123a6b" },
      "Ballantine's": { glass: "#8a5a1e", cap: "#123a24", label: "#dfe6c8" },
      "Bacardí": { glass: "#eef2f5", cap: "#a4161a", label: "#a4161a" },
      "Jack Daniel's": { glass: "#3a2a12", cap: "#111111", label: "#0d0d0d" },
      "Johnnie Walker": { glass: "#8a5a1e", cap: "#d4af37", label: "#1a1a1a" },
      "Hennessy": { glass: "#4a2c10", cap: "#caa24a", label: "#caa24a" },
      "Moët & Chandon": { glass: "#123a24", cap: "#d4af37", label: "#f4f0e0" },
      "Grey Goose": { glass: "#a9c7d8", cap: "#c0c8cc", label: "#3a5a70" },
      "Dom Pérignon": { glass: "#caa24a", cap: "#d4af37", label: "#f4f0e0" },
      "Macallan 18": { glass: "#6b3a10", cap: "#2a1a0a", label: "#caa24a" },
      "Louis XIII": { glass: "#e0c060", cap: "#caa24a", label: "#7c5a10", round: true },
      "Heineken": { glass: "#0a7a3e", cap: "#0a7a3e", label: "#ffffff" },
      "Black Label": { glass: "#1a1a1a", cap: "#d4af37", label: "#1a1a1a" }
    };

    function bottleIconMarkup(name) {
      const s = BOTTLE_STYLE[name] || { glass: "#7c5a10", cap: "#3a2a10", label: "#f4d98a" };
      if (s.round) {
        return '<svg viewBox="0 0 60 100" width="100%" height="100%">' +
          '<rect x="24" y="4" width="12" height="14" rx="2" fill="' + s.cap + '"/>' +
          '<rect x="26" y="16" width="8" height="10" fill="' + s.glass + '"/>' +
          '<path d="M14,30 C14,26 20,24 30,24 C40,24 46,26 46,30 L48,80 C48,90 40,96 30,96 C20,96 12,90 12,80 Z" fill="' + s.glass + '"/>' +
          '<rect x="14" y="55" width="32" height="16" fill="' + s.label + '" opacity="0.85"/>' +
          '</svg>';
      }
      return '<svg viewBox="0 0 60 100" width="100%" height="100%">' +
        '<rect x="24" y="2" width="12" height="10" rx="2" fill="' + s.cap + '"/>' +
        '<rect x="26" y="12" width="8" height="14" fill="' + s.glass + '"/>' +
        '<path d="M18,26 C18,24 22,22 30,22 C38,22 42,24 42,26 L46,88 C46,94 39,98 30,98 C21,98 14,94 14,88 Z" fill="' + s.glass + '"/>' +
        '<rect x="17" y="52" width="26" height="20" fill="' + s.label + '" opacity="0.9"/>' +
        '</svg>';
    }

    // --- Niveles ---
    function levelForCount(count) {
      if (!count || count <= 0) return 0;
      return Math.floor(Math.log2(count)) + 1;
    }

    function levelProgress(count) {
      const level = levelForCount(count);
      const prevThreshold = level > 0 ? Math.pow(2, level - 1) : 0;
      const nextThreshold = Math.pow(2, level);
      const span = nextThreshold - prevThreshold;
      const pct = span > 0 ? Math.round(((count - prevThreshold) / span) * 100) : 100;
      return { level: level, nextThreshold: nextThreshold, pct: pct };
    }

    function ensureUserDefaults(username, data) {
      data = data || {};
      if (typeof data.coins !== 'number') data.coins = 0;
      if (!data.inventory) data.inventory = {};
      if (!data.skins) data.skins = {};
      if (!data.ownedSkins) data.ownedSkins = {};
      if (data.lastClaim === undefined) data.lastClaim = null;
      return data;
    }

    function getCurrentUserData() {
      const users = UserStore.load();
      const data = ensureUserDefaults(currentUser, users[currentUser]);
      users[currentUser] = data;
      UserStore.save(users);
      return data;
    }

    function saveCurrentUserData(data) {
      const users = UserStore.load();
      users[currentUser] = data;
      users[currentUser].updatedAt = Date.now();
      UserStore.save(users);
    }

    // Guarda localmente Y sube a Firestore para que el admin lo vea
    function saveAndSync(data) {
      saveCurrentUserData(data);
      pushUserData(currentUser, data);
    }

    // Devuelve true si el jugador puede reclamar (han pasado ≥4h desde el último claim)
    function canClaim(lastClaim) {
      if (!lastClaim) return true;
      return (Date.now() - lastClaim) >= CLAIM_COOLDOWN_MS;
    }

    // Devuelve una string legible con el tiempo restante hasta poder reclamar
    function timeUntilClaim(lastClaim) {
      if (!lastClaim) return '';
      const remaining = CLAIM_COOLDOWN_MS - (Date.now() - lastClaim);
      if (remaining <= 0) return '';
      const totalSec = Math.ceil(remaining / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'm';
      if (m > 0) return m + 'm ' + String(s).padStart(2, '0') + 's';
      return s + 's';
    }

    function randomReward() {
      return REWARDS[Math.floor(Math.random() * REWARDS.length)];
    }

    function pickWeightedReward() {
      const roll = Math.random() * 100;
      let rarity;
      if (roll < RARITY_WEIGHT.legendary) rarity = 'legendary';
      else if (roll < RARITY_WEIGHT.legendary + RARITY_WEIGHT.epic) rarity = 'epic';
      else if (roll < RARITY_WEIGHT.legendary + RARITY_WEIGHT.epic + RARITY_WEIGHT.rare) rarity = 'rare';
      else rarity = 'common';
      const pool = REWARDS.filter(function (r) { return r.rarity === rarity; });
      return pool[Math.floor(Math.random() * pool.length)];
    }

    const INVENTORY_RETURN_MAP = {
      'inventory-grid': 'app',
      'account-inventory-grid': 'account',
      'visitor-inventory-grid': 'visitor'
    };

    function renderInventory(inventory, gridId) {
      const grid = document.getElementById(gridId || 'inventory-grid');
      const returnTo = INVENTORY_RETURN_MAP[gridId || 'inventory-grid'] || 'app';
      const names = Object.keys(inventory || {});
      if (names.length === 0) {
        grid.innerHTML = '<div class="inventory-empty">Aún no tienes botellas. ¡Gira la ruleta!</div>';
        return;
      }
      grid.innerHTML = '';
      names.forEach(function (name) {
        const rarity = (REWARDS.find(function (r) { return r.name === name; }) || {}).rarity || 'common';
        const count = inventory[name];
        const prog = levelProgress(count);
        const el = document.createElement('div');
        el.className = 'inventory-item rarity-' + rarity;
        el.innerHTML =
          '<div class="bottle-icon">' + bottleIconMarkup(name) + '</div>' +
          '<div class="bottle-level">Nivel ' + prog.level + '</div>' +
          '<div class="bottle-name">' + name + '</div>' +
          '<div class="bottle-progress-wrap"><div class="bottle-progress-fill" style="width:' + prog.pct + '%"></div></div>' +
          '<div class="bottle-progress-label">' + count + ' de ' + prog.nextThreshold + '</div>';
        el.addEventListener('click', function () { showBottleDetail(name, returnTo); });
        grid.appendChild(el);
      });
    }

    // Actualiza el botón de claim y arranca el contador regresivo si toca esperar
    let _claimTimer = null;
    function updateClaimButton() {
      const data = getCurrentUserData();
      const claimBtn = document.getElementById('claim-btn');
      if (canClaim(data.lastClaim)) {
        claimBtn.disabled = false;
        claimBtn.textContent = 'Reclamar 100 monedas 🪙';
        if (_claimTimer) { clearInterval(_claimTimer); _claimTimer = null; }
      } else {
        claimBtn.disabled = true;
        claimBtn.textContent = 'Vuelve en ' + timeUntilClaim(data.lastClaim);
        if (!_claimTimer) {
          _claimTimer = setInterval(function () {
            const fresh = getCurrentUserData();
            if (canClaim(fresh.lastClaim)) {
              clearInterval(_claimTimer);
              _claimTimer = null;
              claimBtn.disabled = false;
              claimBtn.textContent = 'Reclamar 100 monedas 🪙';
            } else {
              claimBtn.textContent = 'Vuelve en ' + timeUntilClaim(fresh.lastClaim);
            }
          }, 1000);
        }
      }
    }

    function renderGame() {
      const data = getCurrentUserData();
      document.getElementById('balance-amount').textContent = data.coins;
      renderInventory(data.inventory);
      // Subir datos completos a Firestore (inventario público + monedas para el admin)
      pushToLeaderboard(currentUser, data.inventory);
      pushUserData(currentUser, data);
      updateClaimButton();
      document.getElementById('spin-btn').disabled = false;
      document.getElementById('spin-result').textContent = '';
      buildIdleReel();
      renderCosmeticsGame();
    }

    function buildIdleReel() {
      const track = document.getElementById('roulette-track');
      track.style.transition = 'none';
      track.style.transform = 'translateX(0px)';
      track.innerHTML = '';
      for (let i = 0; i < 12; i++) {
        track.appendChild(makeReelItem(randomReward()));
      }
    }

    function makeReelItem(reward) {
      const el = document.createElement('div');
      el.className = 'roulette-item rarity-' + reward.rarity;
      el.innerHTML =
        '<div class="bottle-icon bottle-icon-sm">' + bottleIconMarkup(reward.name) + '</div>' +
        '<div class="bottle-name">' + reward.name + '</div>';
      return el;
    }

    document.getElementById('claim-btn').addEventListener('click', function () {
      const data = getCurrentUserData();
      if (!canClaim(data.lastClaim)) return;
      data.coins += CLAIM_AMOUNT;
      data.lastClaim = Date.now();
      saveAndSync(data); // guarda local + Firestore
      document.getElementById('balance-amount').textContent = data.coins;
      updateClaimButton();
    });

    document.getElementById('spin-btn').addEventListener('click', function () {
      const spinBtn = this;
      const data = getCurrentUserData();

      if (data.coins < SPIN_COST) {
        document.getElementById('spin-result').textContent = 'No tienes suficientes monedas';
        return;
      }

      data.coins -= SPIN_COST;
      saveCurrentUserData(data); // guardado rápido local antes de la animación
      document.getElementById('balance-amount').textContent = data.coins;
      document.getElementById('spin-result').textContent = '';
      spinBtn.disabled = true;

      const track = document.getElementById('roulette-track');
      const wrap = track.parentElement;
      const winner = pickWeightedReward();
      const totalItems = 46;
      const winnerIndex = 40;

      track.style.transition = 'none';
      track.style.transform = 'translateX(0px)';
      track.innerHTML = '';
      for (let i = 0; i < totalItems; i++) {
        const reward = (i === winnerIndex) ? winner : randomReward();
        track.appendChild(makeReelItem(reward));
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
        fresh.inventory[winner.name] = (fresh.inventory[winner.name] || 0) + 1;
        saveAndSync(fresh); // guarda local + Firestore con inventario y monedas actualizados
        renderInventory(fresh.inventory);
        pushToLeaderboard(currentUser, fresh.inventory);
        document.getElementById('spin-result').textContent = '¡Has ganado ' + winner.name + '!';
        spinBtn.disabled = false;
      }, 4300);
    });

    function showAccountScreen() {
      const data = getCurrentUserData();
      document.getElementById('account-user').value = currentUser;
      document.getElementById('account-email').value = data.email;
      document.getElementById('account-pass').value = '';
      document.getElementById('account-error').style.display = 'none';
      document.getElementById('account-success').style.display = 'none';
      document.getElementById('account-coins-display').textContent = data.coins;
      renderInventory(data.inventory, 'account-inventory-grid');
      hideAll();
      accountScreen.classList.remove('hidden');
    }

    // =====================================================================
