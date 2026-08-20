// Ranking + cuenta + login/registro
    //  Ranking de jugadores + visita de perfiles ajenos
    // =====================================================================
    const RARITY_VALUE = { common: 1, rare: 5, epic: 20, legendary: 100 };

    function rarityOf(name) {
      const r = REWARDS.find(function (r) { return r.name === name; });
      return r ? r.rarity : 'common';
    }

    function computeCollectionValue(inventory) {
      let total = 0;
      Object.keys(inventory || {}).forEach(function (name) {
        total += (RARITY_VALUE[rarityOf(name)] || 1) * inventory[name];
      });
      return total;
    }

    async function renderRanking() {
      document.getElementById('avatar-btn-ranking').textContent = initial(currentUser);
      const list = document.getElementById('ranking-list');
      const searchInput = document.getElementById('ranking-search');
      if (searchInput) searchInput.value = '';
      list.innerHTML = '<div class="inventory-empty">Cargando ranking...</div>';

      const globalRows = await fetchGlobalLeaderboard();
      let rows;
      if (globalRows) {
        rows = globalRows.map(function (r) {
          return { username: r.username, value: r.value, inventory: r.inventory };
        });
      } else {
        const users = UserStore.load();
        rows = Object.keys(users).map(function (u) {
          const d = ensureUserDefaults(u, users[u]);
          return { username: u, value: computeCollectionValue(d.inventory), inventory: d.inventory };
        }).sort(function (a, b) { return b.value - a.value; });
      }

      window._rankingRows = rows; // guardar para filtrado
      renderRankingRows(rows);

      if (searchInput) {
        searchInput.addEventListener('input', function () {
          const q = searchInput.value.trim().toLowerCase();
          const filtered = q
            ? (window._rankingRows || []).filter(function (r) { return r.username.toLowerCase().includes(q); })
            : (window._rankingRows || []);
          renderRankingRows(filtered);
        });
      }
    }

    function renderRankingRows(rows) {
      const list = document.getElementById('ranking-list');
      list.innerHTML = '';
      if (!rows || rows.length === 0) {
        list.innerHTML = '<div class="inventory-empty">No se encontraron jugadores</div>';
        return;
      }
      rows.forEach(function (r, idx) {
        const row = document.createElement('div');
        row.className = 'ranking-row';
        row.innerHTML =
          '<div class="ranking-rank">#' + (idx + 1) + '</div>' +
          '<div class="ranking-avatar">' + initial(r.username) + '</div>' +
          '<div class="ranking-name">' + r.username + '</div>' +
          '<div class="ranking-value">' + r.value + ' pts</div>';
        row.addEventListener('click', function () {
          showVisitorProfile(r.username, r.inventory);
        });
        list.appendChild(row);
      });
    }

    function showVisitorProfile(username, inventoryOverride) {
      let data;
      if (inventoryOverride) {
        data = { inventory: inventoryOverride };
      } else {
        const users = UserStore.load();
        data = ensureUserDefaults(username, users[username]);
      }
      document.getElementById('visitor-title').textContent = 'Colección de ' + username;
      document.getElementById('avatar-btn-visitor').textContent = initial(username);
      const stealResultEl = document.getElementById('steal-result');
      if (stealResultEl) stealResultEl.textContent = '';
      // Limpiar posible regalo anterior
      const prevGift = document.querySelector('#visitor-screen .gift-section');
      if (prevGift) prevGift.remove();
      renderVisitorInventoryWithSteal(username, data.inventory);
      hideAll();
      document.getElementById('visitor-screen').classList.remove('hidden');
    }

    // El botón "Ver ranking" de la pantalla de cuenta sigue funcionando
    document.getElementById('view-ranking-btn').addEventListener('click', function () {
      hideAll();
      renderRanking();
      document.getElementById('ranking-screen').classList.remove('hidden');
    });

    document.getElementById('ranking-back').addEventListener('click', function () {
      hideAll();
      appScreen.classList.remove('hidden');
      // Restaurar tab activo
      document.querySelectorAll('.tabbar-btn').forEach(function (b) { b.classList.remove('active'); });
      document.getElementById('tabbtn-home').classList.add('active');
      document.getElementById('tab-home').classList.remove('hidden');
    });

    document.getElementById('visitor-back').addEventListener('click', function () {
      hideAll();
      renderRanking();
      document.getElementById('ranking-screen').classList.remove('hidden');
    });

    document.getElementById('avatar-btn').addEventListener('click', showAccountScreen);

    document.getElementById('account-back').addEventListener('click', function () {
      hideAll();
      appScreen.classList.remove('hidden');
    });

    document.getElementById('account-logout').addEventListener('click', function () {
      currentUser = null;
      stopChat();
      document.getElementById('login-user').value = '';
      document.getElementById('login-pass').value = '';
      hideAll();
      loginScreen.classList.remove('hidden');
    });

    document.getElementById('account-save').addEventListener('click', function () {
      const newUser    = document.getElementById('account-user').value.trim();
      const newEmail   = document.getElementById('account-email').value.trim();
      const newPass    = document.getElementById('account-pass').value.trim();
      const errorMsg   = document.getElementById('account-error');
      const successMsg = document.getElementById('account-success');

      successMsg.style.display = 'none';

      if (!newUser || !newEmail) {
        errorMsg.textContent = 'Usuario y email no pueden quedar vacíos';
        errorMsg.style.display = 'block';
        return;
      }

      const users = UserStore.load();
      if (newUser !== currentUser && users[newUser]) {
        errorMsg.textContent = 'Ese nombre de usuario ya está en uso';
        errorMsg.style.display = 'block';
        return;
      }

      const existing = users[currentUser] || { password: '' };
      const updated = {
        email: newEmail,
        password: newPass ? newPass : existing.password,
        coins: existing.coins || 0,
        inventory: existing.inventory || {},
        lastClaim: existing.lastClaim || null,
        updatedAt: Date.now()
      };

      delete users[currentUser];
      users[newUser] = updated;
      UserStore.save(users);

      currentUser = newUser;
      pushUserData(newUser, updated);
      document.getElementById('avatar-btn').textContent = initial(newUser);
      document.getElementById('avatar-btn-account').textContent = initial(newUser);
      document.getElementById('account-pass').value = '';

      errorMsg.style.display = 'none';
      successMsg.style.display = 'block';
    });

    document.getElementById('go-register').addEventListener('click', function (e) {
      e.preventDefault();
      loginScreen.classList.add('hidden');
      registerScreen.classList.remove('hidden');
    });

    document.getElementById('go-login').addEventListener('click', function (e) {
      e.preventDefault();
      registerScreen.classList.add('hidden');
      loginScreen.classList.remove('hidden');
    });

    document.getElementById('login-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      const user     = document.getElementById('login-user').value.trim();
      const pass     = document.getElementById('login-pass').value.trim();
      const errorMsg = document.getElementById('login-error');

      if (!user || !pass) {
        errorMsg.textContent = 'Rellena usuario y contraseña';
        errorMsg.style.display = 'block';
        return;
      }

      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        errorMsg.style.display = 'none';
        hideAll();
        document.getElementById('admin-screen').classList.remove('hidden');
        adminLoadPanel();
        return;
      }

      const users = UserStore.load();
      if (!users[user]) {
        errorMsg.textContent = 'Ese usuario no está registrado';
        errorMsg.style.display = 'block';
        return;
      }
      if (users[user].password !== pass) {
        errorMsg.textContent = 'Contraseña incorrecta';
        errorMsg.style.display = 'block';
        return;
      }

      errorMsg.style.display = 'none';
      await pullUserData(user);
      showApp(user);
    });

    document.getElementById('register-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const user     = document.getElementById('reg-user').value.trim();
      const email    = document.getElementById('reg-email').value.trim();
      const pass     = document.getElementById('reg-pass').value.trim();
      const errorMsg = document.getElementById('register-error');

      if (!user || !email || !pass) {
        errorMsg.textContent = 'Rellena todos los campos';
        errorMsg.style.display = 'block';
        return;
      }

      const users = UserStore.load();
      if (users[user]) {
        errorMsg.textContent = 'Ese usuario ya existe, inicia sesión';
        errorMsg.style.display = 'block';
        return;
      }

      const newUserData = { email: email, password: pass, coins: 100, inventory: {}, updatedAt: Date.now() };
      users[user] = newUserData;
      UserStore.save(users);
      pushUserData(user, newUserData);

      errorMsg.style.display = 'none';
      showApp(user);
    });
