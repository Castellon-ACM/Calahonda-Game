// Almacén de usuarios (UserStore)
    //  Almacén de usuarios registrados (persistente)
    // =====================================================================
    const UserStore = (function () {
      let memory = {};
      let useLocal = true;
      try {
        localStorage.setItem('__test__', '1');
        localStorage.removeItem('__test__');
      } catch (e) {
        useLocal = false;
      }

      function load() {
        if (useLocal) {
          try {
            return JSON.parse(localStorage.getItem('alcohol365_users_v2') || '{}');
          } catch (e) {
            return {};
          }
        }
        return memory;
      }

      function save(data) {
        if (useLocal) {
          try {
            localStorage.setItem('alcohol365_users_v2', JSON.stringify(data));
            return;
          } catch (e) { /* cae al modo memoria */ }
        }
        memory = data;
      }

      return { load: load, save: save };
    })();

    // =====================================================================
