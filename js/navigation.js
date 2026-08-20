// Navegación entre pantallas
    //  Navegación entre pantallas
    // =====================================================================
    const loginScreen    = document.getElementById('login-screen');
    const registerScreen = document.getElementById('register-screen');
    const appScreen      = document.getElementById('app-screen');
    const accountScreen  = document.getElementById('account-screen');

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

      // Volver siempre a la pestaña “Inicio” al entrar
      document.querySelectorAll('.tabbar-btn').forEach(function (b) { b.classList.remove('active'); });
      document.getElementById('tabbtn-home').classList.add('active');
      ['tab-video','tab-home','tab-casino','tab-event','tab-support','tab-chat'].forEach(function (id) {
        document.getElementById(id).classList.add('hidden');
      });
      document.getElementById('tab-home').classList.remove('hidden');

      renderGame();
      startLivePolling();

      if (typeof initAnnouncements === 'function') initAnnouncements();
    }

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

    // --- Tabbar ---
    document.querySelectorAll('.tabbar-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const tab = this.getAttribute('data-tab');

        // El ranking no es un tab inline: abre su pantalla
        if (tab === 'ranking') {
          hideAll();
          renderRanking();
          document.getElementById('ranking-screen').classList.remove('hidden');
          return;
        }

        document.querySelectorAll('.tabbar-btn').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');

        ['tab-video','tab-home','tab-casino','tab-event','tab-support','tab-chat'].forEach(function (id) {
          document.getElementById(id).classList.add('hidden');
        });
        document.getElementById('tab-' + tab).classList.remove('hidden');

        if (tab === 'casino')  renderCasino();
        if (tab === 'event')   renderEventTab();
        if (tab === 'support') renderSupportTab();
        if (tab === 'chat')    renderChatTab();
      });
    });

    function updateAllBalances(coins) {
      document.getElementById('balance-amount').textContent = coins;
      const casinoBal = document.getElementById('casino-balance-amount');
      if (casinoBal) casinoBal.textContent = coins;
    }

    // =====================================================================
