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
    const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3 };
    const ITEM_FULL_WIDTH = 102; // 90px + 6px*2 de margen
    const SPIN_COST = 10;
    const CLAIM_AMOUNT = 200;
    const CLAIM_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 horas en milisegundos

    let spinMultiplier = 1;

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

    // =====================================================================
    //  CUENTAS SEPARADAS POR GRUPO
    //  Cada jugador tiene un "perfil" independiente (monedas + colección
    //  propias) por cada grupo al que pertenece, más un perfil "solo" para
    //  cuando juega sin ningún grupo activo. Solo un perfil está "activo" a
    //  la vez (data.activeGroup), y es el que se lee/guarda en cada momento.
    // =====================================================================
    function ensureProfileDefaults(profile) {
      profile = profile || {};
      if (typeof profile.coins !== 'number') profile.coins = 0;
      if (!profile.inventory) profile.inventory = {};
      if (!profile.skins) profile.skins = {};
      if (!profile.ownedSkins) profile.ownedSkins = {};
      if (profile.lastClaim === undefined) profile.lastClaim = null;
      if (!profile.rouletteHistory) profile.rouletteHistory = [];
      return profile;
    }

    function ensureUserDefaults(username, data) {
      data = data || {};
      if (typeof data.lastSeenAnnouncement !== 'number') data.lastSeenAnnouncement = 0;
      if (!data.groups) data.groups = [];
      if (data.activeGroup === undefined) data.activeGroup = null;
      if (!data.profiles) data.profiles = {};

      // Migración: cuentas de antes de que existieran los grupos guardaban
      // las monedas/inventario "sueltos" en el propio usuario. Los movemos
      // a su perfil "solo" para no perder nada.
      if (data.coins !== undefined || data.inventory !== undefined) {
        if (!data.profiles.solo) {
          data.profiles.solo = ensureProfileDefaults({
            coins: data.coins,
            inventory: data.inventory,
            skins: data.skins,
            ownedSkins: data.ownedSkins,
            lastClaim: data.lastClaim,
            rouletteHistory: data.rouletteHistory
          });
        }
        delete data.coins;
        delete data.inventory;
        delete data.skins;
        delete data.ownedSkins;
        delete data.lastClaim;
        delete data.rouletteHistory;
      }

      if (!data.profiles.solo) data.profiles.solo = ensureProfileDefaults({});

      // Si el grupo activo ya no está en la lista de grupos (p.ej. saliste
      // desde otro dispositivo), volvemos al perfil "solo".
      if (data.activeGroup && data.groups.indexOf(data.activeGroup) === -1) {
        data.activeGroup = null;
      }

      const key = data.activeGroup || 'solo';
      data.profiles[key] = ensureProfileDefaults(data.profiles[key]);

      return data;
    }

    // Clave del perfil actualmente activo ('solo' o el código de un grupo)
    function activeProfileKey() {
      const users = UserStore.load();
      const u = users[currentUser];
      return (u && u.activeGroup) || 'solo';
    }

    // Devuelve el PERFIL activo (monedas + inventario de ese grupo/solo).
    // Es lo que usan todos los juegos (casino, ruleta, blackjack, etc.).
    function getCurrentUserData() {
      const users = UserStore.load();
      const userData = ensureUserDefaults(currentUser, users[currentUser]);
      users[currentUser] = userData;
      UserStore.save(users);
      const key = userData.activeGroup || 'solo';
      return userData.profiles[key];
    }

    function saveCurrentUserData(profileData) {
      const users = UserStore.load();
      if (!users[currentUser]) return;
      const key = users[currentUser].activeGroup || 'solo';
      profileData.updatedAt = Date.now();
      users[currentUser].profiles[key] = profileData;
      users[currentUser].updatedAt = Date.now();
      UserStore.save(users);
    }

    function saveAndSync(profileData) {
      saveCurrentUserData(profileData);
      pushUserData(currentUser, profileData);
    }

    // Devuelve true si el jugador puede reclamar.
    // Acepta formato antiguo (string de fecha) y nuevo (timestamp ms).
    function canClaim(lastClaim) {
      if (!lastClaim) return true;
      if (typeof lastClaim === 'string') return true;
      const elapsed = Date.now() - lastClaim;
      if (isNaN(elapsed)) return true;
      return elapsed >= CLAIM_COOLDOWN_MS;
    }

    function timeUntilClaim(lastClaim) {
      if (!lastClaim || typeof lastClaim === 'string' || isNaN(lastClaim)) return '';
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

      // Ordenar de menor a mayor rareza (común -> rara -> épica -> legendaria)
      names.sort(function (a, b) {
        const ra = RARITY_ORDER[(REWARDS.find(function (r) { return r.name === a; }) || {}).rarity || 'common'];
        const rb = RARITY_ORDER[(REWARDS.find(function (r) { return r.name === b; }) || {}).rarity || 'common'];
        if (ra !== rb) return ra - rb;
        return a.localeCompare(b);
      });

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

    let _claimTimer = null;
    function updateClaimButton() {
      const data = getCurrentUserData();
      const claimBtn = document.getElementById('claim-btn');
      if (canClaim(data.lastClaim)) {
        claimBtn.disabled = false;
        claimBtn.textContent = 'Reclamar 200 monedas 🪙';
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
              claimBtn.textContent = 'Reclamar 200 monedas 🪙';
            } else {
              claimBtn.textContent = 'Vuelve en ' + timeUntilClaim(fresh.lastClaim);
            }
          }, 1000);
        }
      }
    }

    function updateSpinButtonLabel() {
      const btn = document.getElementById('spin-btn');
      if (btn) btn.textContent = 'Girar ruleta (' + (SPIN_COST * spinMultiplier) + ' 🪙)';
    }

    document.querySelectorAll('.spin-mult-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.spin-mult-btn').forEach(function (b) { b.classList.remove('selected'); });
        this.classList.add('selected');
        spinMultiplier = parseInt(this.getAttribute('data-mult'), 10);
        updateSpinButtonLabel();
      });
    });

    function renderGame() {
      const data = getCurrentUserData();
      document.getElementById('balance-amount').textContent = data.coins;
      renderInventory(data.inventory);
      // El ranking GLOBAL siempre refleja el perfil "solo" (fuera de grupos),
      // nunca el de un grupo concreto — para eso está el ranking de grupo.
      if (activeProfileKey() === 'solo') {
        pushToLeaderboard(currentUser, data.inventory);
      }
      pushUserData(currentUser, data);
      updateClaimButton();
      updateSpinButtonLabel();
      document.getElementById('spin-btn').disabled = false;
      document.getElementById('spin-result').textContent = '';
      buildIdleReel();
      renderCosmeticsGame();
      // Comprobar si el admin ha enviado monedas mientras el jugador estaba fuera
      checkAdminGift(currentUser);
      // Comprobar si hay un evento especial activo para este jugador
      checkEventTabVisibility();
      // Comprobar avisos pendientes (monedas dadas/quitadas, notificaciones del admin...)
      checkUserNotifications(currentUser);
      // Actualizar el contador de novedades sin leer
      updateNewsBadge();
      if (typeof updateActiveProfileBadge === 'function') updateActiveProfileBadge();
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
      saveAndSync(data);
      document.getElementById('balance-amount').textContent = data.coins;
      updateClaimButton();
    });

    document.getElementById('spin-btn').addEventListener('click', function () {
      const spinBtn = this;
      const data = getCurrentUserData();
      const cost = SPIN_COST * spinMultiplier;

      if (data.coins < cost) {
        document.getElementById('spin-result').textContent = 'No tienes suficientes monedas';
        return;
      }

      data.coins -= cost;
      saveCurrentUserData(data);
      document.getElementById('balance-amount').textContent = data.coins;
      document.getElementById('spin-result').textContent = '';
      spinBtn.disabled = true;

      // Generar todos los premios de esta tirada (x1, x3, x5 o x10)
      const rewards = [];
      for (let i = 0; i < spinMultiplier; i++) rewards.push(pickWeightedReward());

      // El de mayor rareza es el que se anima/destaca como resultado principal
      let best = rewards[0];
      rewards.forEach(function (r) {
        if (RARITY_ORDER[r.rarity] > RARITY_ORDER[best.rarity]) best = r;
      });

      const track = document.getElementById('roulette-track');
      const wrap = track.parentElement;
      const totalItems = 46;
      const winnerIndex = 40;

      track.style.transition = 'none';
      track.style.transform = 'translateX(0px)';
      track.innerHTML = '';
      for (let i = 0; i < totalItems; i++) {
        const reward = (i === winnerIndex) ? best : randomReward();
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
        rewards.forEach(function (r) {
          fresh.inventory[r.name] = (fresh.inventory[r.name] || 0) + 1;
        });
        saveAndSync(fresh);
        renderInventory(fresh.inventory);
        if (activeProfileKey() === 'solo') {
          pushToLeaderboard(currentUser, fresh.inventory);
        }

        // Resultado principal: la de mayor rareza. Debajo: el resto de lo que ha salido.
        const others = rewards.slice();
        const bestIdx = others.indexOf(best);
        if (bestIdx !== -1) others.splice(bestIdx, 1);

        let html = '<div>¡Has ganado <b>' + best.name + '</b>!</div>';
        if (others.length > 0) {
          const counts = {};
          others.forEach(function (r) { counts[r.name] = (counts[r.name] || 0) + 1; });
          const otherList = Object.keys(counts).map(function (n) {
            return (counts[n] > 1 ? counts[n] + 'x ' : '') + n;
          }).join(', ');
          html += '<div style="margin-top:6px;font-size:12px;color:#b8a679;">También: ' + otherList + '</div>';
        }
        document.getElementById('spin-result').innerHTML = html;
        spinBtn.disabled = false;
      }, 4300);
    });

    function showAccountScreen() {
      const users = UserStore.load();
      const full = users[currentUser] || {};
      const data = getCurrentUserData();
      document.getElementById('account-user').value = currentUser;
      document.getElementById('account-email').value = full.email || '';
      document.getElementById('account-pass').value = '';
      document.getElementById('account-error').style.display = 'none';
      document.getElementById('account-success').style.display = 'none';
      document.getElementById('account-coins-display').textContent = data.coins;
      renderInventory(data.inventory, 'account-inventory-grid');
      hideAll();
      accountScreen.classList.remove('hidden');
    }

    // =====================================================================
