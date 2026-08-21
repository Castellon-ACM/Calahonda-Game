// Ranking + cuenta + login/registro
    //  Ranking de jugadores + visita de perfiles ajenos
    // =====================================================================
    // mythic: 500 puntos — solo la botella Alcohol 96% (subasta exclusiva)
    const RARITY_VALUE = { common: 1, rare: 5, epic: 20, legendary: 100, mythic: 500 };

    function rarityOf(name) {
      // La botella mítica no está en REWARDS (es exclusiva de subasta), la detectamos por nombre
      if (name === 'Alcohol 96%') return 'mythic';
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
          const solo = d.profiles.solo;
          return { username: u, value: computeCollectionValue(solo.inventory), inventory: solo.inventory };
        }).sort(function (a, b) { return b.value - a.value; });
      }

      window._rankingRows = rows;
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
        const full = ensureUserDefaults(username, users[username]);
        data = full.profiles.solo;
      }
      document.getElementById('visitor-title').textContent = 'Colección de ' + username;
      document.getElementById('avatar-btn-visitor').textContent = initial(username);
      const stealResultEl = document.getElementById('steal-result');
      if (stealResultEl) stealResultEl.textContent = '';
      const prevGift = document.querySelector('#visitor-screen .gift-section');
      if (prevGift) prevGift.remove();
      renderVisitorInventoryWithSteal(username, data.inventory);
      hideAll();
      document.getElementById('visitor-screen').classList.remove('hidden');
    }

    document.getElementById('view-ranking-btn').addEventListener('click', function () {
      hideAll();
      renderRanking();
      document.getElementById('ranking-screen').classList.remove('hidden');
    });

    document.getElementById('ranking-back').addEventListener('click', function () {
      hideAll();
      appScreen.classList.remove('hidden');
      document.querySelectorAll('.tabbar-btn').forEach(function (b) { b.classList.remove('active'); });
      document.getElementById('tabbtn-home').classList.add('active');
      document.getElementById('tab-home').classList.remove('hidden');
      spinMultiplier = 1;
      document.querySelectorAll('.spin-mult-btn').forEach(function (b) { b.classList.remove('selected'); });
      const multX1 = document.querySelector('.spin-mult-btn[data-mult="1"]');
      if (multX1) multX1.classList.add('selected');
      if (typeof updateSpinButtonLabel === 'function') updateSpinButtonLabel();
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
      spinMultiplier = 1;
      document.querySelectorAll('.spin-mult-btn').forEach(function (b) { b.classList.remove('selected'); });
      const multX1 = document.querySelector('.spin-mult-btn[data-mult="1"]');
      if (multX1) multX1.classList.add('selected');
      if (typeof updateSpinButtonLabel === 'function') updateSpinButtonLabel();
    });

    document.getElementById('account-logout').addEventListener('click', function () {
      currentUser = null;
      stopChat();
      document.getElementById('login-user').value = '';
      document.getElementById('login-pass').value = '';
      hideAll();
      loginScreen.classList.remove('hidden');
    });

    document.getElementById('account-save').addEventListener('click', async function () {
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

      const existing = ensureUserDefaults(currentUser, users[currentUser] || {});
      const newPasswordHash = newPass ? await sha256Hex(newPass) : existing.passwordHash;

      const updated = Object.assign({}, existing, {
        email: newEmail,
        passwordHash: newPasswordHash,
        updatedAt: Date.now()
      });

      delete users[currentUser];
      users[newUser] = updated;
      UserStore.save(users);

      currentUser = newUser;
      const key = updated.activeGroup || 'solo';
      pushUserData(newUser, updated.profiles[key]);
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

      if (user === ADMIN_USER) {
        const adminHash = await sha256Hex(pass);
        if (adminHash === ADMIN_PASS_HASH) {
          errorMsg.style.display = 'none';
          hideAll();
          document.getElementById('admin-screen').classList.remove('hidden');
          adminLoadPanel();
        } else {
          errorMsg.textContent = 'Contraseña incorrecta';
          errorMsg.style.display = 'block';
        }
        return;
      }

      const passwordHash = await sha256Hex(pass);
      const users = UserStore.load();
      let localUser = users[user];

      if (!localUser || !localUser.passwordHash) {
        const remote = await fetchRemoteUser(user);
        if (remote && remote.passwordHash) {
          if (remote.passwordHash !== passwordHash) {
            errorMsg.textContent = 'Contraseña incorrecta';
            errorMsg.style.display = 'block';
            return;
          }
          localUser = ensureUserDefaults(user, {
            email: remote.email || (localUser && localUser.email) || '',
            passwordHash: remote.passwordHash,
            banned: remote.banned || false,
            groups: remote.groups || [],
            activeGroup: remote.activeGroup || null,
            profiles: remote.profiles || {},
            updatedAt: remote.updatedAt || Date.now()
          });
          users[user] = localUser;
          UserStore.save(users);
        } else if (!localUser) {
          errorMsg.textContent = 'Ese usuario no está registrado';
          errorMsg.style.display = 'block';
          return;
        }
      }

      const validPassword = localUser.passwordHash
        ? localUser.passwordHash === passwordHash
        : localUser.password === pass;

      if (!validPassword) {
        errorMsg.textContent = 'Contraseña incorrecta';
        errorMsg.style.display = 'block';
        return;
      }

      if (!localUser.passwordHash) {
        localUser.passwordHash = passwordHash;
        delete localUser.password;
        users[user] = localUser;
        UserStore.save(users);
      }

      errorMsg.style.display = 'none';
      await pullUserData(user);
      const refreshedUsers = UserStore.load();
      const refreshedUser = ensureUserDefaults(user, refreshedUsers[user] || localUser);
      refreshedUsers[user] = refreshedUser;
      UserStore.save(refreshedUsers);
      const key = refreshedUser.activeGroup || 'solo';
      pushUserData(user, refreshedUser.profiles[key]);

      showApp(user);
    });

    document.getElementById('register-form').addEventListener('submit', async function (e) {
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

      const remoteExisting = await fetchRemoteUser(user);
      if (remoteExisting) {
        errorMsg.textContent = 'Ese usuario ya existe, inicia sesión';
        errorMsg.style.display = 'block';
        return;
      }

      const passwordHash = await sha256Hex(pass);
      const newUserData = ensureUserDefaults(user, {
        email: email,
        passwordHash: passwordHash,
        groups: [],
        activeGroup: null,
        profiles: { solo: { coins: 100, inventory: {} } },
        updatedAt: Date.now()
      });
      users[user] = newUserData;
      UserStore.save(users);
      pushUserData(user, newUserData.profiles.solo);

      errorMsg.style.display = 'none';
      showApp(user);
    });
