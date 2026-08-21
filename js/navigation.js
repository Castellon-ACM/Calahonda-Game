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
      const groupsScreen = document.getElementById('groups-screen');
      if (groupsScreen) groupsScreen.classList.add('hidden');
      closeSideMenu();
    }

    function showApp(username) {
      currentUser = username;
      document.getElementById('avatar-btn').textContent = initial(username);
      document.getElementById('avatar-btn-account').textContent = initial(username);
      const sideMenuUsername = document.getElementById('side-menu-username');
      if (sideMenuUsername) sideMenuUsername.textContent = username;
      hideAll();
      appScreen.classList.remove('hidden');

      // Volver siempre a la pestaña "Inicio" al entrar
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
        // Sincronizar monedas desde Firestore para que los cambios del admin
        // (dar/quitar monedas) lleguen sin necesidad de cerrar sesión.
        if (typeof syncCoinsFromFirestore === 'function') {
          syncCoinsFromFirestore(currentUser);
        }
      }, 20000);
    }

    // Sincronizar monedas también cuando el usuario vuelve a la pestaña del navegador
    // (por ejemplo, tras haber estado en otra app o pestaña mientras el admin actuaba).
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && currentUser) {
        if (typeof syncCoinsFromFirestore === 'function') {
          syncCoinsFromFirestore(currentUser);
        }
      }
    });

    // --- Tabbar (incluye los elementos del menú hamburguesa con la misma clase) ---
    document.querySelectorAll('.tabbar-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const tab = this.getAttribute('data-tab');
        if (!tab) return; // botones del menú sin data-tab (Mis grupos, Novedades...) los gestiona otro archivo

        closeSideMenu();

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

    // --- Menú hamburguesa (lateral) ---
    function openSideMenu() {
      const overlay = document.getElementById('side-menu-overlay');
      const menu = document.getElementById('side-menu');
      if (!overlay || !menu) return;
      overlay.classList.remove('hidden');
      menu.classList.add('open');
    }

    function closeSideMenu() {
      const overlay = document.getElementById('side-menu-overlay');
      const menu = document.getElementById('side-menu');
      if (!overlay || !menu) return;
      overlay.classList.add('hidden');
      menu.classList.remove('open');
    }

    document.addEventListener('DOMContentLoaded', function () {
      const hamburgerBtn = document.getElementById('hamburger-btn');
      const overlay = document.getElementById('side-menu-overlay');
      if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSideMenu);
      if (overlay) overlay.addEventListener('click', closeSideMenu);

      // Cualquier botón del menú (incluido el avatar) cierra el menú al pulsarlo
      document.querySelectorAll('#side-menu button, #side-menu .avatar-btn').forEach(function (el) {
        el.addEventListener('click', closeSideMenu);
      });

      const sidemenuMyGroups = document.getElementById('sidemenu-mygroups');
      if (sidemenuMyGroups) {
        sidemenuMyGroups.addEventListener('click', function () {
          hideAll();
          document.getElementById('groups-screen').classList.remove('hidden');
          if (typeof renderMyGroupsList === 'function') renderMyGroupsList();
        });
      }

      const sidemenuLogout = document.getElementById('sidemenu-logout');
      if (sidemenuLogout) {
        sidemenuLogout.addEventListener('click', function () {
          currentUser = null;
          if (typeof stopChat === 'function') stopChat();
          document.getElementById('login-user').value = '';
          document.getElementById('login-pass').value = '';
          hideAll();
          loginScreen.classList.remove('hidden');
        });
      }
    });

    // =====================================================================
