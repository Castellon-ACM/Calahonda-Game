// Navegación entre pantallas
    //  Navegación entre pantallas
    // =====================================================================
    const loginScreen = document.getElementById('login-screen');
    const registerScreen = document.getElementById('register-screen');
    const appScreen = document.getElementById('app-screen');
    const accountScreen = document.getElementById('account-screen');

    let currentUser = null;

    function initial(name) {
      return (name || '?').trim().charAt(0).toUpperCase();
    }

    function hideAll() {
      loginScreen.classList.add('hidden');
      registerScreen.classList.add('hidden');
      appScreen.classList.add('hidden');
      accountScreen.classList.add('hidden');
      document.getElementById('ranking-screen').classList.add('hidden');
      document.getElementById('visitor-screen').classList.add('hidden');
      document.getElementById('bottle-detail-screen').classList.add('hidden');
      document.getElementById('news-screen').classList.add('hidden');
    }

    function showApp(username) {
      currentUser = username;
      document.getElementById('avatar-btn').textContent = initial(username);
      document.getElementById('avatar-btn-account').textContent = initial(username);
      hideAll();
      appScreen.classList.remove('hidden');

      // Volver siempre a la pestaña "Inicio" al entrar
      document.querySelectorAll('.tabbar-btn').forEach(function (b) { b.classList.remove('active'); });
      document.getElementById('tabbtn-home').classList.add('active');
      document.getElementById('tab-home').classList.remove('hidden');
      document.getElementById('tab-casino').classList.add('hidden');
      document.getElementById('tab-event').classList.add('hidden');
      document.getElementById('tab-support').classList.add('hidden');

      renderGame();
      startLivePolling();
    }

    // Comprueba cada 20s (mientras la app está abierta) si hay regalos del admin,
    // eventos nuevos o notificaciones pendientes — sin tener que cerrar la app.
    let _livePollTimer = null;
    function startLivePolling() {
      if (_livePollTimer) clearInterval(_livePollTimer);
      _livePollTimer = setInterval(function () {
        if (!currentUser) return;
        if (appScreen.classList.contains('hidden')) return;
        checkAdminGift(currentUser);
        checkEventTabVisibility();
        checkUserNotifications(currentUser);
      }, 20000);
    }

    document.querySelectorAll('.tabbar-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.tabbar-btn').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        const tab = this.getAttribute('data-tab');
        document.getElementById('tab-home').classList.toggle('hidden', tab !== 'home');
        document.getElementById('tab-casino').classList.toggle('hidden', tab !== 'casino');
        document.getElementById('tab-event').classList.toggle('hidden', tab !== 'event');
        document.getElementById('tab-support').classList.toggle('hidden', tab !== 'support');
        if (tab === 'casino') renderCasino();
        if (tab === 'event') renderEventTab();
        if (tab === 'support') renderSupportTab();
      });
    });

    function updateAllBalances(coins) {
      document.getElementById('balance-amount').textContent = coins;
      const casinoBal = document.getElementById('casino-balance-amount');
      if (casinoBal) casinoBal.textContent = coins;
    }

    // =====================================================================
