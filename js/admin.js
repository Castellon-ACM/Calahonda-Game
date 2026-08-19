// =====================================================================
//  PANEL DE ADMINISTRACIÓN — admincaste / papaplaya
// =====================================================================

const ADMIN_USER = 'admincaste';
const ADMIN_PASS = 'papaplaya';

// ── Inyectar HTML del panel en el DOM ────────────────────────────────
(function injectAdminHTML() {
  const html = `
  <!-- Pantalla ADMIN PANEL -->
  <div id="admin-screen" class="screen screen-with-topbar hidden">
    <div class="topbar with-back">
      <button class="back-btn" id="admin-logout-btn">← Salir</button>
      <span style="color:#f5c518;font-weight:700;font-size:15px">⚙️ Admin</span>
      <div style="width:38px"></div>
    </div>
    <div class="screen-body">
      <div class="card">
        <h1>Panel de administración</h1>

        <!-- Buscador: input 100% + botón debajo 100% -->
        <div class="field" style="margin-bottom:12px">
          <label style="display:block;margin-bottom:4px">Buscar usuario</label>
          <input type="text" id="admin-search" placeholder="nombre de usuario" style="width:100%;box-sizing:border-box;margin-bottom:6px">
          <button type="button" class="btn" id="admin-search-btn" style="width:100%;box-sizing:border-box;padding:10px;white-space:nowrap;overflow:hidden;min-width:0">🔍 Buscar</button>
        </div>

        <!-- Stats globales -->
        <div id="admin-global-stats" style="background:#1a1505;border-radius:12px;padding:14px;margin:12px 0">
          <div style="color:#f5c518;font-weight:700;margin-bottom:8px">📊 Stats globales</div>
          <div id="admin-stats-content" style="color:#ccc;font-size:13px">Cargando...</div>
        </div>

        <!-- Fuente de datos activa -->
        <div id="admin-source-badge" style="font-size:11px;color:#aaa;margin-bottom:8px;text-align:right"></div>

        <!-- DAR MONEDAS A TODOS -->
        <div style="background:#1a1505;border-radius:12px;padding:14px;margin:12px 0;border:1px solid #f5c51833">
          <div style="color:#f5c518;font-weight:700;margin-bottom:8px">🎁 Dar monedas a TODOS</div>
          <div style="color:#aaa;font-size:12px;margin-bottom:8px">Al entrar al juego verán un popup de regalo.</div>
          <input type="number" id="admin-gift-all-input" placeholder="cantidad de monedas" style="width:100%;box-sizing:border-box;background:#0d0a05;border:1px solid #333;color:#fff;border-radius:8px;padding:10px;font-size:14px;margin-bottom:8px">
          <button type="button" class="btn" id="admin-gift-all-btn" style="width:100%;box-sizing:border-box;padding:11px;font-size:14px;white-space:nowrap;overflow:hidden;min-width:0">🎁 Enviar regalo a todos</button>
          <div id="admin-gift-all-msg" style="margin-top:8px;font-size:13px;text-align:center"></div>
        </div>

        <!-- Lista de usuarios -->
        <div style="color:#f5c518;font-weight:700;margin:16px 0 8px">👥 Todos los usuarios</div>
        <div id="admin-user-list">Cargando...</div>

        <!-- Modal detalle usuario -->
        <div id="admin-user-modal" class="hidden" style="background:#1a1505;border-radius:16px;padding:18px;margin-top:16px;border:1px solid #f5c51855;box-sizing:border-box;width:100%;overflow:hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div style="color:#f5c518;font-weight:700;font-size:16px;word-break:break-word;flex:1;margin-right:8px" id="admin-modal-title">Usuario</div>
            <button type="button" id="admin-modal-close" style="background:none;border:none;color:#aaa;font-size:20px;cursor:pointer;flex-shrink:0">✕</button>
          </div>

          <div id="admin-modal-source" style="font-size:11px;color:#888;margin-bottom:6px"></div>
          <div id="admin-modal-coins" style="color:#ccc;font-size:13px;margin-bottom:4px"></div>
          <div id="admin-modal-email" style="color:#ccc;font-size:13px;margin-bottom:8px;word-break:break-all"></div>
          <div id="admin-modal-value" style="color:#ccc;font-size:13px;margin-bottom:14px"></div>

          <!-- Dar / quitar monedas -->
          <div style="margin-bottom:14px">
            <div style="color:#aaa;font-size:12px;margin-bottom:6px">Dar / quitar monedas</div>
            <input type="number" id="admin-coins-input" placeholder="cantidad de monedas" style="width:100%;box-sizing:border-box;background:#0d0a05;border:1px solid #333;color:#fff;border-radius:8px;padding:10px;font-size:14px;margin-bottom:8px">
            <button type="button" class="btn" id="admin-give-coins-btn" style="width:100%;box-sizing:border-box;padding:12px;font-size:14px;margin-bottom:6px;white-space:nowrap;overflow:hidden;min-width:0">✅ Dar monedas</button>
            <button type="button" class="btn logout-btn" id="admin-take-coins-btn" style="width:100%;box-sizing:border-box;padding:12px;font-size:14px;white-space:nowrap;overflow:hidden;min-width:0">❌ Quitar monedas</button>
          </div>

          <!-- Cambiar contraseña -->
          <div style="margin-bottom:14px">
            <div style="color:#aaa;font-size:12px;margin-bottom:6px">Cambiar contraseña <span style="color:#555">(solo si está en este dispositivo)</span></div>
            <input type="password" id="admin-newpass-input" placeholder="nueva contraseña" style="width:100%;box-sizing:border-box;background:#0d0a05;border:1px solid #333;color:#fff;border-radius:8px;padding:10px;font-size:14px;margin-bottom:8px">
            <button type="button" class="btn" id="admin-change-pass-btn" style="width:100%;box-sizing:border-box;padding:12px;font-size:14px;white-space:nowrap;overflow:hidden;min-width:0">💾 Guardar contraseña</button>
          </div>

          <!-- Inventario -->
          <div style="color:#aaa;font-size:12px;margin-bottom:6px">Inventario</div>
          <div id="admin-modal-inventory" style="font-size:13px;color:#ccc;background:#0d0a05;border-radius:8px;padding:10px;max-height:140px;overflow-y:auto;margin-bottom:14px"></div>

          <!-- Acciones peligrosas -->
          <button type="button" class="btn" id="admin-ban-btn" style="background:#8b0000;width:100%;box-sizing:border-box;padding:12px;font-size:14px;margin-bottom:6px;white-space:nowrap;overflow:hidden;min-width:0">🚫 Banear usuario</button>
          <button type="button" class="btn logout-btn" id="admin-delete-btn" style="width:100%;box-sizing:border-box;padding:12px;font-size:14px;white-space:nowrap;overflow:hidden;min-width:0">🗑️ Eliminar cuenta</button>

          <div id="admin-modal-msg" style="margin-top:10px;font-size:13px;text-align:center"></div>
        </div>

      </div>
    </div>
  </div>

  <!-- Popup regalo del admin -->
  <div id="admin-gift-popup" class="hidden" style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:none;align-items:center;justify-content:center;padding:24px;box-sizing:border-box">
    <div style="background:#1a1505;border-radius:20px;padding:28px 24px;text-align:center;max-width:320px;width:100%;border:2px solid #f5c518;box-sizing:border-box">
      <div style="font-size:48px;margin-bottom:12px">🎁</div>
      <div style="color:#f5c518;font-weight:700;font-size:18px;margin-bottom:8px">¡Regalo del administrador!</div>
      <div id="admin-gift-popup-text" style="color:#ccc;font-size:15px;margin-bottom:20px"></div>
      <button type="button" class="btn" id="admin-gift-popup-ok" style="width:100%;box-sizing:border-box;padding:13px;font-size:15px">🪙 ¡Recibir!</button>
    </div>
  </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
})();

// ── Variables de estado del admin ────────────────────────────────────
let adminSelectedUser = null;
let adminAllUsers = {};

// ── Utilidades ───────────────────────────────────────────────────────
function adminHideAll() {
  document.querySelectorAll('.screen').forEach(function (s) {
    s.classList.add('hidden');
  });
}

function adminShowMsg(text, ok) {
  const el = document.getElementById('admin-modal-msg');
  el.textContent = text;
  el.style.color = ok ? '#4caf50' : '#f44336';
  setTimeout(function () { el.textContent = ''; }, 3000);
}

function adminShowGiftAllMsg(text, ok) {
  const el = document.getElementById('admin-gift-all-msg');
  el.textContent = text;
  el.style.color = ok ? '#4caf50' : '#f44336';
  setTimeout(function () { el.textContent = ''; }, 4000);
}

// ── Cargar TODOS los usuarios (Firestore + localStorage) ─────────────
async function adminLoadAllUsers() {
  const localUsers = UserStore.load();
  const merged = {};

  Object.keys(localUsers).forEach(function (u) {
    const d = localUsers[u];
    merged[u] = {
      coins: d.coins || 0,
      inventory: d.inventory || {},
      email: d.email || '',
      banned: d.banned || false,
      password: d.password || '',
      source: 'local',
      value: computeCollectionValue(d.inventory || {})
    };
  });

  if (typeof db !== 'undefined' && db) {
    try {
      const snap = await db.collection('leaderboard').get();
      snap.docs.forEach(function (doc) {
        const d = doc.data();
        const u = d.username;
        if (!u) return;
        if (merged[u]) {
          merged[u].inventory = d.inventory || merged[u].inventory;
          merged[u].value = d.value || merged[u].value;
          merged[u].source = 'local+firestore';
          if (d.banned) merged[u].banned = true;
        } else {
          merged[u] = {
            coins: d.coins || 0,
            inventory: d.inventory || {},
            email: d.email || '',
            banned: d.banned || false,
            password: '',
            source: 'firestore',
            value: d.value || computeCollectionValue(d.inventory || {})
          };
        }
      });

      try {
        const usersSnap = await db.collection('users').get();
        usersSnap.docs.forEach(function (doc) {
          const d = doc.data();
          const u = doc.id;
          if (!u) return;
          if (merged[u]) {
            if (d.coins !== undefined) merged[u].coins = d.coins;
            if (d.email) merged[u].email = d.email;
            if (d.banned) merged[u].banned = d.banned;
            if (d.inventory) merged[u].inventory = d.inventory;
            merged[u].source = 'local+firestore';
          } else {
            merged[u] = {
              coins: d.coins || 0,
              inventory: d.inventory || {},
              email: d.email || '',
              banned: d.banned || false,
              password: '',
              source: 'firestore',
              value: computeCollectionValue(d.inventory || {})
            };
          }
        });
      } catch (e) {}

      document.getElementById('admin-source-badge').textContent = '🌐 Datos cargados desde Firestore + local';
    } catch (e) {
      console.warn('No se pudo cargar Firestore:', e);
      document.getElementById('admin-source-badge').textContent = '⚠️ Solo datos locales (sin conexión a Firestore)';
    }
  } else {
    document.getElementById('admin-source-badge').textContent = '⚠️ Solo datos locales (Firebase no disponible)';
  }

  adminAllUsers = merged;
  return merged;
}

// ── Cargar panel ──────────────────────────────────────────────────────
async function adminLoadPanel() {
  document.getElementById('admin-user-list').innerHTML = '<div style="color:#aaa;text-align:center;padding:16px">Cargando usuarios...</div>';
  document.getElementById('admin-stats-content').textContent = 'Cargando...';
  await adminLoadAllUsers();
  adminRenderGlobalStats();
  adminRenderUserList('');
}

function adminRenderGlobalStats() {
  const statsEl = document.getElementById('admin-stats-content');
  const users = adminAllUsers;
  const total = Object.keys(users).length;
  const localCount = Object.keys(users).filter(function (u) { return users[u].source !== 'firestore'; }).length;
  const fsOnly = Object.keys(users).filter(function (u) { return users[u].source === 'firestore'; }).length;
  const banned = Object.keys(users).filter(function (u) { return users[u].banned; }).length;
  let totalCoins = 0;
  let topUser = '—';
  let topValue = 0;

  Object.keys(users).forEach(function (u) {
    totalCoins += (users[u].coins || 0);
    if ((users[u].value || 0) > topValue) { topValue = users[u].value; topUser = u; }
  });

  statsEl.innerHTML =
    '<div>👥 Total usuarios: <b>' + total + '</b></div>' +
    '<div>💾 Solo en este dispositivo: <b>' + localCount + '</b></div>' +
    '<div>🌐 Solo en Firestore (otros dispositivos): <b>' + fsOnly + '</b></div>' +
    '<div>🚫 Baneados: <b>' + banned + '</b></div>' +
    '<div>🪙 Monedas registradas: <b>' + totalCoins.toLocaleString() + '</b></div>' +
    '<div>🏆 Líder del ranking: <b>' + topUser + '</b> (' + topValue + ' pts)</div>';
}

function adminRenderUserList(filter) {
  const listEl = document.getElementById('admin-user-list');
  let keys = Object.keys(adminAllUsers);
  if (filter) keys = keys.filter(function (k) { return k.toLowerCase().includes(filter.toLowerCase()); });

  if (keys.length === 0) {
    listEl.innerHTML = '<div style="color:#aaa;text-align:center;padding:16px">No se encontraron usuarios</div>';
    return;
  }

  keys.sort(function (a, b) {
    return (adminAllUsers[b].value || 0) - (adminAllUsers[a].value || 0);
  });

  listEl.innerHTML = '';
  keys.forEach(function (username) {
    const u = adminAllUsers[username];
    const coins = u.coins || 0;
    const invCount = Object.keys(u.inventory || {}).length;
    const banned = u.banned ? ' 🚫' : '';
    const sourceIcon = u.source === 'firestore' ? ' 🌐' : u.source === 'local+firestore' ? ' 🔗' : ' 💾';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;padding:10px 0;border-bottom:1px solid #222;cursor:pointer;gap:10px';
    row.innerHTML =
      '<div style="width:36px;height:36px;border-radius:50%;background:#f5c518;display:flex;align-items:center;justify-content:center;font-weight:700;color:#0d0a05;flex-shrink:0">' +
        username[0].toUpperCase() +
      '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-weight:600;color:#fff;word-break:break-word">' + username + banned + sourceIcon + '</div>' +
        '<div style="font-size:12px;color:#aaa">🪙 ' + coins.toLocaleString() + ' · ⭐ ' + (u.value || 0) + ' pts · 🎁 ' + invCount + ' items</div>' +
      '</div>' +
      '<div style="color:#555;font-size:18px;flex-shrink:0">›</div>';
    row.addEventListener('click', function () { adminOpenUserModal(username); });
    listEl.appendChild(row);
  });
}

function adminOpenUserModal(username) {
  adminSelectedUser = username;
  const u = adminAllUsers[username] || {};
  const inventory = u.inventory || {};
  const coins = u.coins || 0;
  const value = u.value !== undefined ? u.value : computeCollectionValue(inventory);

  const sourceLabels = {
    'local': '💾 Solo en este dispositivo',
    'firestore': '🌐 Solo en Firestore (otro dispositivo)',
    'local+firestore': '🔗 Local + Firestore (sincronizado)'
  };

  document.getElementById('admin-modal-title').textContent = '👤 ' + username + (u.banned ? ' 🚫 BANEADO' : '');
  document.getElementById('admin-modal-source').textContent = sourceLabels[u.source] || u.source || '';
  document.getElementById('admin-modal-coins').textContent = '🪙 Monedas: ' + coins.toLocaleString();
  document.getElementById('admin-modal-email').textContent = u.email ? '📧 ' + u.email : '';
  document.getElementById('admin-modal-value').textContent = '⭐ Valor colección: ' + value + ' pts';
  document.getElementById('admin-coins-input').value = '';
  document.getElementById('admin-newpass-input').value = '';

  const invEl = document.getElementById('admin-modal-inventory');
  const invKeys = Object.keys(inventory);
  invEl.innerHTML = invKeys.length === 0
    ? '(colección vacía)'
    : invKeys.map(function (item) { return '<div>' + item + ': <b>' + inventory[item] + '</b></div>'; }).join('');

  document.getElementById('admin-user-modal').classList.remove('hidden');
  document.getElementById('admin-modal-msg').textContent = '';
  document.getElementById('admin-user-modal').scrollIntoView({ behavior: 'smooth' });
}

// ── Persistir cambios: local + Firestore ─────────────────────────────
async function adminPersistUser(username) {
  const u = adminAllUsers[username];
  if (!u) return;

  const localUsers = UserStore.load();
  if (localUsers[username]) {
    localUsers[username].coins = u.coins;
    if (u.inventory) localUsers[username].inventory = u.inventory;
    if (u.banned !== undefined) localUsers[username].banned = u.banned;
    UserStore.save(localUsers);
  }

  if (typeof db !== 'undefined' && db) {
    try {
      await db.collection('leaderboard').doc(username).set({
        username: username,
        inventory: u.inventory || {},
        value: computeCollectionValue(u.inventory || {}),
        coins: u.coins || 0,
        banned: u.banned || false,
        updatedAt: Date.now()
      }, { merge: true });

      await db.collection('users').doc(username).set({
        coins: u.coins || 0,
        inventory: u.inventory || {},
        email: u.email || '',
        banned: u.banned || false,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.warn('No se pudo persistir en Firestore:', e);
    }
  }
}

async function adminDeleteUser(username) {
  delete adminAllUsers[username];
  const localUsers = UserStore.load();
  if (localUsers[username]) { delete localUsers[username]; UserStore.save(localUsers); }
  if (typeof db !== 'undefined' && db) {
    try {
      await db.collection('leaderboard').doc(username).delete();
      await db.collection('users').doc(username).delete();
      await db.collection('adminGifts').doc(username).delete();
    } catch (e) {}
  }
}

// ── Regalo individual ─────────────────────────────────────────────────
async function adminSendGift(username, amount) {
  if (typeof db === 'undefined' || !db) return;
  try {
    const ref = db.collection('adminGifts').doc(username);
    const doc = await ref.get();
    const existing = doc.exists ? (doc.data().amount || 0) : 0;
    await ref.set({ amount: existing + amount, updatedAt: Date.now() });
  } catch (e) {
    console.warn('No se pudo guardar regalo en Firestore:', e);
  }
}

// ── Regalo a TODOS ────────────────────────────────────────────────────
async function adminGiftAll(amount) {
  const btn = document.getElementById('admin-gift-all-btn');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const usernames = Object.keys(adminAllUsers);
  let ok = 0;

  if (typeof db !== 'undefined' && db) {
    for (const username of usernames) {
      try {
        const ref = db.collection('adminGifts').doc(username);
        const doc = await ref.get();
        const existing = doc.exists ? (doc.data().amount || 0) : 0;
        await ref.set({ amount: existing + amount, updatedAt: Date.now() });
        ok++;
      } catch (e) {}
    }
  } else {
    const localUsers = UserStore.load();
    usernames.forEach(function (u) {
      if (localUsers[u]) { localUsers[u].coins = (localUsers[u].coins || 0) + amount; ok++; }
    });
    UserStore.save(localUsers);
  }

  btn.disabled = false;
  btn.textContent = '🎁 Enviar regalo a todos';
  adminShowGiftAllMsg('✅ Regalo de ' + amount + ' 🪙 enviado a ' + ok + ' jugadores', true);

  await adminLoadAllUsers();
  adminRenderGlobalStats();
  adminRenderUserList(document.getElementById('admin-search').value.trim());
}

// ── Comprobar regalo pendiente del admin ──────────────────────────────
// Solo muestra el popup si el jugador está en la pantalla del juego (app-screen visible).
// Si Firestore responde tarde y el jugador ya salió o está en login, no mostramos nada.
async function checkAdminGift(username) {
  if (!username || typeof db === 'undefined' || !db) return;
  try {
    const ref = db.collection('adminGifts').doc(username);
    const doc = await ref.get();
    if (!doc.exists) return;
    const amount = doc.data().amount || 0;
    if (amount <= 0) { await ref.delete(); return; }

    // Aplicar monedas al jugador local
    const users = UserStore.load();
    if (users[username]) {
      users[username].coins = (users[username].coins || 0) + amount;
      UserStore.save(users);
    }

    // Borrar el regalo para que no se aplique dos veces
    await ref.delete();

    // Solo mostrar el popup si el jugador sigue en la pantalla de juego
    const appScreen = document.getElementById('app-screen');
    if (!appScreen || appScreen.classList.contains('hidden')) return;

    // Actualizar balance visible
    const balanceEl = document.getElementById('balance-amount');
    if (balanceEl && users[username]) balanceEl.textContent = users[username].coins;

    // Sincronizar con Firestore
    if (typeof pushUserData === 'function' && users[username]) {
      pushUserData(username, users[username]);
    }

    // Mostrar popup
    document.getElementById('admin-gift-popup-text').textContent =
      'El administrador te ha regalado ' + amount.toLocaleString() + ' monedas 🪙';
    const popup = document.getElementById('admin-gift-popup');
    popup.classList.remove('hidden');
    popup.style.display = 'flex';

  } catch (e) {
    console.warn('No se pudo comprobar regalo del admin:', e);
  }
}

// ── Eventos ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

  document.getElementById('admin-logout-btn').addEventListener('click', function () {
    adminHideAll();
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
  });

  document.getElementById('admin-search-btn').addEventListener('click', function () {
    adminRenderUserList(document.getElementById('admin-search').value.trim());
  });

  document.getElementById('admin-search').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('admin-search-btn').click();
  });

  document.getElementById('admin-modal-close').addEventListener('click', function () {
    document.getElementById('admin-user-modal').classList.add('hidden');
    adminSelectedUser = null;
  });

  // Dar monedas
  document.getElementById('admin-give-coins-btn').addEventListener('click', async function () {
    if (!adminSelectedUser) return;
    const amount = parseInt(document.getElementById('admin-coins-input').value, 10);
    if (isNaN(amount) || amount <= 0) { adminShowMsg('Cantidad inválida', false); return; }
    if (!adminAllUsers[adminSelectedUser]) { adminShowMsg('Usuario no encontrado', false); return; }
    adminAllUsers[adminSelectedUser].coins = (adminAllUsers[adminSelectedUser].coins || 0) + amount;
    await adminPersistUser(adminSelectedUser);
    await adminSendGift(adminSelectedUser, amount);
    document.getElementById('admin-modal-coins').textContent = '🪙 Monedas: ' + adminAllUsers[adminSelectedUser].coins.toLocaleString();
    adminShowMsg('+' + amount + ' monedas — recibirá popup al entrar', true);
    adminRenderGlobalStats();
  });

  // Quitar monedas
  document.getElementById('admin-take-coins-btn').addEventListener('click', async function () {
    if (!adminSelectedUser) return;
    const amount = parseInt(document.getElementById('admin-coins-input').value, 10);
    if (isNaN(amount) || amount <= 0) { adminShowMsg('Cantidad inválida', false); return; }
    if (!adminAllUsers[adminSelectedUser]) { adminShowMsg('Usuario no encontrado', false); return; }
    adminAllUsers[adminSelectedUser].coins = Math.max(0, (adminAllUsers[adminSelectedUser].coins || 0) - amount);
    await adminPersistUser(adminSelectedUser);
    document.getElementById('admin-modal-coins').textContent = '🪙 Monedas: ' + adminAllUsers[adminSelectedUser].coins.toLocaleString();
    adminShowMsg('-' + amount + ' monedas quitadas', true);
    adminRenderGlobalStats();
  });

  // Dar a todos
  document.getElementById('admin-gift-all-btn').addEventListener('click', async function () {
    const amount = parseInt(document.getElementById('admin-gift-all-input').value, 10);
    if (isNaN(amount) || amount <= 0) { adminShowGiftAllMsg('Introduce una cantidad válida', false); return; }
    if (!confirm('¿Enviar ' + amount + ' monedas a TODOS los jugadores (' + Object.keys(adminAllUsers).length + ')?')) return;
    await adminGiftAll(amount);
  });

  // Cambiar contraseña
  document.getElementById('admin-change-pass-btn').addEventListener('click', function () {
    if (!adminSelectedUser) return;
    const newPass = document.getElementById('admin-newpass-input').value.trim();
    if (!newPass) { adminShowMsg('Introduce una contraseña', false); return; }
    const localUsers = UserStore.load();
    if (!localUsers[adminSelectedUser]) { adminShowMsg('Usuario no tiene cuenta local en este dispositivo', false); return; }
    localUsers[adminSelectedUser].password = newPass;
    UserStore.save(localUsers);
    document.getElementById('admin-newpass-input').value = '';
    adminShowMsg('Contraseña cambiada (local)', true);
  });

  // Banear
  document.getElementById('admin-ban-btn').addEventListener('click', async function () {
    if (!adminSelectedUser) return;
    if (!confirm('¿Banear a ' + adminSelectedUser + '? Se le vaciará el inventario y monedas.')) return;
    if (!adminAllUsers[adminSelectedUser]) return;
    adminAllUsers[adminSelectedUser].coins = 0;
    adminAllUsers[adminSelectedUser].inventory = {};
    adminAllUsers[adminSelectedUser].value = 0;
    adminAllUsers[adminSelectedUser].banned = true;
    await adminPersistUser(adminSelectedUser);
    adminShowMsg(adminSelectedUser + ' baneado', true);
    document.getElementById('admin-modal-coins').textContent = '🪙 Monedas: 0';
    document.getElementById('admin-modal-inventory').textContent = '(vacío)';
    document.getElementById('admin-modal-title').textContent = '👤 ' + adminSelectedUser + ' 🚫 BANEADO';
    adminRenderUserList(document.getElementById('admin-search').value.trim());
    adminRenderGlobalStats();
  });

  // Eliminar cuenta
  document.getElementById('admin-delete-btn').addEventListener('click', async function () {
    if (!adminSelectedUser) return;
    if (!confirm('¿Eliminar la cuenta de ' + adminSelectedUser + '? Esta acción no se puede deshacer.')) return;
    await adminDeleteUser(adminSelectedUser);
    document.getElementById('admin-user-modal').classList.add('hidden');
    adminSelectedUser = null;
    adminRenderUserList(document.getElementById('admin-search').value.trim());
    adminRenderGlobalStats();
  });

  // Cerrar popup regalo
  document.getElementById('admin-gift-popup-ok').addEventListener('click', function () {
    const popup = document.getElementById('admin-gift-popup');
    popup.classList.add('hidden');
    popup.style.display = 'none';
  });

});
