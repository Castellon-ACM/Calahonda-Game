// Juego: monedas diarias + ruleta de botellas
    // =====================================================================
    const REWARDS = [
      // ── COMUNES (30) ─────────────────────────────────────────────────
      { name: "Jägermeister",    rarity: "common" },
      { name: "Smirnoff",        rarity: "common" },
      { name: "Baileys",         rarity: "common" },
      { name: "Absolut",         rarity: "common" },
      { name: "Heineken",        rarity: "common" },
      { name: "Bacardí",         rarity: "common" },
      { name: "Larios",          rarity: "common" },
      { name: "Gordon's",        rarity: "common" },
      { name: "Beefeater",       rarity: "common" },
      { name: "Estrella Damm",   rarity: "common" },
      { name: "Cruzcampo",       rarity: "common" },
      { name: "Mahou",           rarity: "common" },
      { name: "San Miguel",      rarity: "common" },
      { name: "Ron Barceló",     rarity: "common" },
      { name: "Brugal",          rarity: "common" },
      { name: "Cacique",         rarity: "common" },
      { name: "Malibu",          rarity: "common" },
      { name: "Disaronno",       rarity: "common" },
      { name: "Sambuca",         rarity: "common" },
      { name: "Aperol",          rarity: "common" },
      { name: "Martini Rosso",   rarity: "common" },
      { name: "Prosecco",        rarity: "common" },
      { name: "Freixenet",       rarity: "common" },
      { name: "Schweppes",       rarity: "common" },
      { name: "Red Bull",        rarity: "common" },
      { name: "Coca-Cola",       rarity: "common" },
      { name: "Fanta Limón",     rarity: "common" },
      { name: "Sprite",          rarity: "common" },
      { name: "Campari",         rarity: "common" },
      { name: "Midori",          rarity: "common" },

      // ── RARAS (22) ───────────────────────────────────────────────────
      { name: "Ballantine's",    rarity: "rare" },
      { name: "Jack Daniel's",   rarity: "rare" },
      { name: "Johnnie Walker",  rarity: "rare" },
      { name: "Jim Beam",        rarity: "rare" },
      { name: "Maker's Mark",    rarity: "rare" },
      { name: "Havana Club 7",   rarity: "rare" },
      { name: "Diplomático",     rarity: "rare" },
      { name: "Grey Goose",      rarity: "rare" },
      { name: "Belvedere",       rarity: "rare" },
      { name: "Ketel One",       rarity: "rare" },
      { name: "Tanqueray",       rarity: "rare" },
      { name: "Monkey 47",       rarity: "rare" },
      { name: "Roku Gin",        rarity: "rare" },
      { name: "Don Julio",       rarity: "rare" },
      { name: "Patrón",          rarity: "rare" },
      { name: "Olmeca",          rarity: "rare" },
      { name: "Tequila Herradura", rarity: "rare" },
      { name: "Veuve Clicquot",  rarity: "rare" },
      { name: "Ruinart Blanc",   rarity: "rare" },
      { name: "Glenfiddich 12",  rarity: "rare" },
      { name: "Jameson",         rarity: "rare" },
      { name: "Bulleit Bourbon", rarity: "rare" },

      // ── ÉPICAS (17) ──────────────────────────────────────────────────
      { name: "Hennessy",        rarity: "epic" },
      { name: "Moët & Chandon",  rarity: "epic" },
      { name: "Black Label",     rarity: "epic" },
      { name: "Glenfiddich 18",  rarity: "epic" },
      { name: "Glenfiddich 21",  rarity: "epic" },
      { name: "Lagavulin 16",    rarity: "epic" },
      { name: "Oban 14",         rarity: "epic" },
      { name: "Clase Azul",      rarity: "epic" },
      { name: "Casamigos",       rarity: "epic" },
      { name: "Don Julio 1942",  rarity: "epic" },
      { name: "Hibiki Harmony",  rarity: "epic" },
      { name: "Nikka From The Barrel", rarity: "epic" },
      { name: "Rémy Martin XO",  rarity: "epic" },
      { name: "Courvoisier XO",  rarity: "epic" },
      { name: "Glenlivet 18",    rarity: "epic" },
      { name: "Ardbeg 10",       rarity: "epic" },
      { name: "Laphroaig 10",    rarity: "epic" },

      // ── LEGENDARIAS (11) ─────────────────────────────────────────────
      { name: "Dom Pérignon",    rarity: "legendary" },
      { name: "Macallan 18",     rarity: "legendary" },
      { name: "Louis XIII",      rarity: "legendary" },
      { name: "Cristal Roederer", rarity: "legendary" },
      { name: "Pappy Van Winkle", rarity: "legendary" },
      { name: "The Dalmore 25",  rarity: "legendary" },
      { name: "Hennessy Paradis", rarity: "legendary" },
      { name: "Macallan 25",     rarity: "legendary" },
      { name: "Armand de Brignac", rarity: "legendary" },
      { name: "Hibiki 21",       rarity: "legendary" },
      { name: "Yamazaki 18",     rarity: "legendary" }
    ];

    const RARITY_WEIGHT = { legendary: 3, epic: 10, rare: 22, common: 65 };
    const RARITY_ORDER  = { common: 0, rare: 1, epic: 2, legendary: 3 };
    const ITEM_FULL_WIDTH = 102;
    const SPIN_COST = 10;
    const CLAIM_AMOUNT = 200;
    const CLAIM_COOLDOWN_MS = 4 * 60 * 60 * 1000;

    let spinMultiplier = 1;

    // ── Paleta de colores por botella ─────────────────────────────────
    const BOTTLE_STYLE = {
      // Comunes
      "Jägermeister":    { glass: "#0b3d1f", cap: "#111111", label: "#d9622b" },
      "Smirnoff":        { glass: "#cfd8dc", cap: "#b71c1c", label: "#ffffff" },
      "Baileys":         { glass: "#5b3a1a", cap: "#3a2410", label: "#f0e4c8" },
      "Absolut":         { glass: "#e8eef2", cap: "#123a6b", label: "#123a6b" },
      "Heineken":        { glass: "#0a7a3e", cap: "#0a7a3e", label: "#ffffff" },
      "Bacardí":         { glass: "#eef2f5", cap: "#a4161a", label: "#a4161a" },
      "Larios":          { glass: "#d4eaf0", cap: "#2a6080", label: "#2a6080" },
      "Gordon's":        { glass: "#1a3a1a", cap: "#c0a030", label: "#c0a030" },
      "Beefeater":       { glass: "#c8102e", cap: "#8b0000", label: "#f4f0e0" },
      "Estrella Damm":   { glass: "#e8c84a", cap: "#c8a010", label: "#8b0000" },
      "Cruzcampo":       { glass: "#f0c030", cap: "#c8a010", label: "#8b0000" },
      "Mahou":           { glass: "#e8c84a", cap: "#8b0000", label: "#8b0000" },
      "San Miguel":      { glass: "#e8c84a", cap: "#c8a010", label: "#1a3a6a" },
      "Ron Barceló":     { glass: "#2a1a0a", cap: "#111111", label: "#c8a010" },
      "Brugal":          { glass: "#3a2a10", cap: "#111111", label: "#c8a010" },
      "Cacique":         { glass: "#4a3010", cap: "#111111", label: "#e8c84a" },
      "Malibu":          { glass: "#f0f0f0", cap: "#111111", label: "#1a6ab0" },
      "Disaronno":       { glass: "#8b0000", cap: "#111111", label: "#f4d98a" },
      "Sambuca":         { glass: "#111111", cap: "#111111", label: "#ffffff" },
      "Aperol":          { glass: "#e8601a", cap: "#111111", label: "#ffffff" },
      "Martini Rosso":   { glass: "#8b0000", cap: "#c8a010", label: "#f4f0e0" },
      "Prosecco":        { glass: "#d4eaa0", cap: "#c8a010", label: "#2a5010" },
      "Freixenet":       { glass: "#111111", cap: "#c8a010", label: "#c8a010" },
      "Schweppes":       { glass: "#e8f4f0", cap: "#006040", label: "#006040" },
      "Red Bull":        { glass: "#c8c8c8", cap: "#1a4a8a", label: "#1a4a8a" },
      "Coca-Cola":       { glass: "#8b0000", cap: "#8b0000", label: "#ffffff" },
      "Fanta Limón":     { glass: "#f0d020", cap: "#e88010", label: "#e88010" },
      "Sprite":          { glass: "#d0f0c0", cap: "#006030", label: "#006030" },
      "Campari":         { glass: "#c8102e", cap: "#111111", label: "#ffffff" },
      "Midori":          { glass: "#2a7a10", cap: "#111111", label: "#f4f0e0" },
      // Raras
      "Ballantine's":    { glass: "#8a5a1e", cap: "#123a24", label: "#dfe6c8" },
      "Jack Daniel's":   { glass: "#3a2a12", cap: "#111111", label: "#0d0d0d" },
      "Johnnie Walker":  { glass: "#8a5a1e", cap: "#d4af37", label: "#1a1a1a" },
      "Jim Beam":        { glass: "#3a2a12", cap: "#111111", label: "#f4f0e0" },
      "Maker's Mark":    { glass: "#8b0000", cap: "#d4102e", label: "#f4f0e0" },
      "Havana Club 7":   { glass: "#6b3a10", cap: "#111111", label: "#c8a010" },
      "Diplomático":     { glass: "#3a2a10", cap: "#c8a010", label: "#c8a010" },
      "Grey Goose":      { glass: "#a9c7d8", cap: "#c0c8cc", label: "#3a5a70" },
      "Belvedere":       { glass: "#e8eef2", cap: "#c8a010", label: "#c8a010" },
      "Ketel One":       { glass: "#d4e8f4", cap: "#1a4a7a", label: "#1a4a7a" },
      "Tanqueray":       { glass: "#0a5a10", cap: "#c8a010", label: "#f4f0e0" },
      "Monkey 47":       { glass: "#2a3a2a", cap: "#111111", label: "#c8a010" },
      "Roku Gin":        { glass: "#d4e8d4", cap: "#2a5a2a", label: "#2a5a2a" },
      "Don Julio":       { glass: "#e8f4e8", cap: "#c8a010", label: "#1a4a1a" },
      "Patrón":          { glass: "#e8f4e8", cap: "#c8a010", label: "#8b4513" },
      "Olmeca":          { glass: "#e8f0e8", cap: "#c8a010", label: "#6b3a10" },
      "Tequila Herradura": { glass: "#e8c84a", cap: "#8b4513", label: "#8b4513" },
      "Veuve Clicquot":  { glass: "#e8a010", cap: "#c8a010", label: "#1a1a1a" },
      "Ruinart Blanc":   { glass: "#f4f0e0", cap: "#c8a010", label: "#2a4a6a" },
      "Glenfiddich 12":  { glass: "#3a6a3a", cap: "#c8a010", label: "#f4f0e0" },
      "Jameson":         { glass: "#2a4a1a", cap: "#c8a010", label: "#f4f0e0" },
      "Bulleit Bourbon": { glass: "#8b4513", cap: "#111111", label: "#f4f0e0" },
      // Épicas
      "Hennessy":        { glass: "#4a2c10", cap: "#caa24a", label: "#caa24a" },
      "Moët & Chandon":  { glass: "#123a24", cap: "#d4af37", label: "#f4f0e0" },
      "Black Label":     { glass: "#1a1a1a", cap: "#d4af37", label: "#1a1a1a" },
      "Glenfiddich 18":  { glass: "#2a5a2a", cap: "#c8a010", label: "#f4d98a" },
      "Glenfiddich 21":  { glass: "#1a4a1a", cap: "#c8a010", label: "#f4d98a" },
      "Lagavulin 16":    { glass: "#2a1a0a", cap: "#111111", label: "#c8a010" },
      "Oban 14":         { glass: "#3a2a0a", cap: "#8b4513", label: "#c8a010" },
      "Clase Azul":      { glass: "#f0f0f0", cap: "#c8a010", label: "#1a6ab0" },
      "Casamigos":       { glass: "#e8f4e8", cap: "#111111", label: "#111111" },
      "Don Julio 1942":  { glass: "#e8c84a", cap: "#c8a010", label: "#1a1a1a" },
      "Hibiki Harmony":  { glass: "#c8a0c8", cap: "#c8a010", label: "#f4f0e0" },
      "Nikka From The Barrel": { glass: "#3a2a0a", cap: "#111111", label: "#c8a010" },
      "Rémy Martin XO":  { glass: "#8b4513", cap: "#c8a010", label: "#c8a010" },
      "Courvoisier XO":  { glass: "#6b3a10", cap: "#c8a010", label: "#c8a010" },
      "Glenlivet 18":    { glass: "#2a4a6a", cap: "#c8a010", label: "#f4d98a" },
      "Ardbeg 10":       { glass: "#1a2a1a", cap: "#111111", label: "#c8a010" },
      "Laphroaig 10":    { glass: "#1a1a2a", cap: "#111111", label: "#c8a010" },
      // Legendarias
      "Dom Pérignon":    { glass: "#caa24a", cap: "#d4af37", label: "#f4f0e0" },
      "Macallan 18":     { glass: "#6b3a10", cap: "#2a1a0a", label: "#caa24a" },
      "Louis XIII":      { glass: "#e0c060", cap: "#caa24a", label: "#7c5a10", round: true },
      "Cristal Roederer": { glass: "#f4f0e0", cap: "#c8a010", label: "#111111" },
      "Pappy Van Winkle": { glass: "#4a2c10", cap: "#111111", label: "#f4d98a" },
      "The Dalmore 25":  { glass: "#4a2c10", cap: "#c8a010", label: "#c8a010" },
      "Hennessy Paradis": { glass: "#4a2c10", cap: "#d4af37", label: "#d4af37" },
      "Macallan 25":     { glass: "#3a1a0a", cap: "#111111", label: "#d4af37" },
      "Armand de Brignac": { glass: "#c8a010", cap: "#c8a010", label: "#111111" },
      "Hibiki 21":       { glass: "#8a60a8", cap: "#d4af37", label: "#f4f0e0" },
      "Yamazaki 18":     { glass: "#3a2a10", cap: "#c8a010", label: "#f4d98a" }
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

    // ── Niveles ───────────────────────────────────────────────────────
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

      if (data.coins !== undefined || data.inventory !== undefined) {
        if (!data.profiles.solo) {
          data.profiles.solo = ensureProfileDefaults({
            coins: data.coins, inventory: data.inventory,
            skins: data.skins, ownedSkins: data.ownedSkins,
            lastClaim: data.lastClaim, rouletteHistory: data.rouletteHistory
          });
        }
        delete data.coins; delete data.inventory; delete data.skins;
        delete data.ownedSkins; delete data.lastClaim; delete data.rouletteHistory;
      }

      if (!data.profiles.solo) data.profiles.solo = ensureProfileDefaults({});
      if (data.activeGroup && data.groups.indexOf(data.activeGroup) === -1) data.activeGroup = null;
      const key = data.activeGroup || 'solo';
      data.profiles[key] = ensureProfileDefaults(data.profiles[key]);
      return data;
    }

    function activeProfileKey() {
      const users = UserStore.load();
      const u = users[currentUser];
      return (u && u.activeGroup) || 'solo';
    }

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

    // =====================================================================
    //  ÁLBUM DE COLECCIÓN
    // =====================================================================
    const RARITY_SECTIONS = [
      { key: 'legendary', label: '⭐ Legendarias' },
      { key: 'epic',      label: '💜 Épicas'      },
      { key: 'rare',      label: '🔵 Raras'        },
      { key: 'common',    label: '⚪ Comunes'      }
    ];

    const INVENTORY_RETURN_MAP = {
      'inventory-grid':         'app',
      'account-inventory-grid': 'account',
      'visitor-inventory-grid': 'visitor'
    };

    function renderInventory(inventory, gridId) {
      const container = document.getElementById(gridId || 'inventory-grid');
      if (!container) return;
      const returnTo = INVENTORY_RETURN_MAP[gridId || 'inventory-grid'] || 'app';

      if (gridId === 'visitor-inventory-grid' || gridId === 'account-inventory-grid') {
        renderInventorySimple(inventory, container, returnTo);
        return;
      }

      container.innerHTML = '';

      const total    = REWARDS.length;
      const unlocked = REWARDS.filter(function (r) { return (inventory[r.name] || 0) > 0; }).length;
      const pct      = Math.round((unlocked / total) * 100);

      const progressWrap = document.createElement('div');
      progressWrap.innerHTML =
        '<div class="album-progress-bar-wrap">' +
          '<div class="album-progress-bar-fill" style="width:' + pct + '%"></div>' +
        '</div>' +
        '<div class="album-progress-label">' + unlocked + ' / ' + total + ' botellas (' + pct + '%)</div>';
      container.appendChild(progressWrap);

      RARITY_SECTIONS.forEach(function (section) {
        const bottles          = REWARDS.filter(function (r) { return r.rarity === section.key; });
        const unlockedInSection = bottles.filter(function (r) { return (inventory[r.name] || 0) > 0; }).length;

        const header = document.createElement('div');
        header.className = 'album-rarity-header rh-' + section.key;
        header.innerHTML =
          '<span class="album-rarity-label">' + section.label + '</span>' +
          '<div class="album-rarity-line"></div>' +
          '<span class="album-rarity-count">' + unlockedInSection + '/' + bottles.length + '</span>';
        container.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'album-grid';

        bottles.forEach(function (reward) {
          const count = inventory[reward.name] || 0;
          const hasIt = count > 0;
          const prog  = hasIt ? levelProgress(count) : null;

          const card = document.createElement('div');
          card.className = 'album-card' + (hasIt ? ' rarity-' + reward.rarity : ' album-locked');

          const bottleHtml =
            '<div class="album-bottle">' + bottleIconMarkup(reward.name) + '</div>' +
            '<div class="album-name">' + reward.name + '</div>';

          if (hasIt) {
            card.innerHTML =
              bottleHtml +
              '<div class="album-level-badge">Nv.' + prog.level + '</div>' +
              '<div class="album-bar-wrap"><div class="album-bar-fill" style="width:' + prog.pct + '%"></div></div>' +
              '<div class="album-count">x' + count + '</div>';
            card.addEventListener('click', function () { showBottleDetail(reward.name, returnTo); });
          } else {
            card.innerHTML = bottleHtml + '<div class="album-count" style="color:#333">?</div>';
          }

          grid.appendChild(card);
        });

        container.appendChild(grid);
      });
    }

    function renderInventorySimple(inventory, grid, returnTo) {
      const names = Object.keys(inventory || {});
      if (names.length === 0) {
        grid.innerHTML = '<div class="inventory-empty">Colección vacía</div>';
        return;
      }
      names.sort(function (a, b) {
        const ra = RARITY_ORDER[(REWARDS.find(function (r) { return r.name === a; }) || {}).rarity || 'common'];
        const rb = RARITY_ORDER[(REWARDS.find(function (r) { return r.name === b; }) || {}).rarity || 'common'];
        if (ra !== rb) return rb - ra;
        return a.localeCompare(b);
      });
      grid.innerHTML = '';
      names.forEach(function (name) {
        const rarity = (REWARDS.find(function (r) { return r.name === name; }) || {}).rarity || 'common';
        const count  = inventory[name];
        const prog   = levelProgress(count);
        const el     = document.createElement('div');
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
      const data     = getCurrentUserData();
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
              clearInterval(_claimTimer); _claimTimer = null;
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
      if (activeProfileKey() === 'solo') pushToLeaderboard(currentUser, data.inventory);
      pushUserData(currentUser, data);
      updateClaimButton();
      updateSpinButtonLabel();
      document.getElementById('spin-btn').disabled = false;
      document.getElementById('spin-result').textContent = '';
      buildIdleReel();
      renderCosmeticsGame();
      checkAdminGift(currentUser);
      checkEventTabVisibility();
      checkUserNotifications(currentUser);
      updateNewsBadge();
      if (typeof updateActiveProfileBadge === 'function') updateActiveProfileBadge();
    }

    function buildIdleReel() {
      const track = document.getElementById('roulette-track');
      track.style.transition = 'none';
      track.style.transform  = 'translateX(0px)';
      track.innerHTML = '';
      for (let i = 0; i < 12; i++) track.appendChild(makeReelItem(randomReward()));
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
      const data    = getCurrentUserData();
      const cost    = SPIN_COST * spinMultiplier;

      if (data.coins < cost) {
        document.getElementById('spin-result').textContent = 'No tienes suficientes monedas';
        return;
      }

      data.coins -= cost;
      saveCurrentUserData(data);
      document.getElementById('balance-amount').textContent = data.coins;
      document.getElementById('spin-result').textContent = '';
      spinBtn.disabled = true;

      const rewards = [];
      for (let i = 0; i < spinMultiplier; i++) rewards.push(pickWeightedReward());

      let best = rewards[0];
      rewards.forEach(function (r) {
        if (RARITY_ORDER[r.rarity] > RARITY_ORDER[best.rarity]) best = r;
      });

      const track      = document.getElementById('roulette-track');
      const wrap       = track.parentElement;
      const totalItems = 46;
      const winnerIndex = 40;

      track.style.transition = 'none';
      track.style.transform  = 'translateX(0px)';
      track.innerHTML = '';
      for (let i = 0; i < totalItems; i++) {
        track.appendChild(makeReelItem(i === winnerIndex ? best : randomReward()));
      }
      void track.offsetWidth;

      const targetX = -(winnerIndex * ITEM_FULL_WIDTH + ITEM_FULL_WIDTH / 2 - wrap.clientWidth / 2);
      requestAnimationFrame(function () {
        track.style.transition = 'transform 4.2s cubic-bezier(0.1, 0.75, 0.1, 1)';
        track.style.transform  = 'translateX(' + targetX + 'px)';
      });

      setTimeout(function () {
        const fresh = getCurrentUserData();
        rewards.forEach(function (r) { fresh.inventory[r.name] = (fresh.inventory[r.name] || 0) + 1; });
        saveAndSync(fresh);
        renderInventory(fresh.inventory);
        if (activeProfileKey() === 'solo') pushToLeaderboard(currentUser, fresh.inventory);

        const others = rewards.slice();
        const bestIdx = others.indexOf(best);
        if (bestIdx !== -1) others.splice(bestIdx, 1);

        let html = '<div>¡Has ganado <b>' + best.name + '</b>!</div>';
        if (others.length > 0) {
          const counts = {};
          others.forEach(function (r) { counts[r.name] = (counts[r.name] || 0) + 1; });
          html += '<div style="margin-top:6px;font-size:12px;color:#b8a679;">También: ' +
            Object.keys(counts).map(function (n) { return (counts[n] > 1 ? counts[n] + 'x ' : '') + n; }).join(', ') +
            '</div>';
        }
        document.getElementById('spin-result').innerHTML = html;
        spinBtn.disabled = false;
      }, 4300);
    });

    function showAccountScreen() {
      const users = UserStore.load();
      const full  = users[currentUser] || {};
      const data  = getCurrentUserData();
      document.getElementById('account-user').value  = currentUser;
      document.getElementById('account-email').value = full.email || '';
      document.getElementById('account-pass').value  = '';
      document.getElementById('account-error').style.display   = 'none';
      document.getElementById('account-success').style.display = 'none';
      document.getElementById('account-coins-display').textContent = data.coins;
      hideAll();
      accountScreen.classList.remove('hidden');
    }
