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

        <!-- Buscador -->
        <div class="field" style="display:flex;gap:8px;align-items:flex-end">
          <div style="flex:1">
            <label>Buscar usuario</label>
            <input type="text" id="admin-search" placeholder="nombre de usuario">
          </div>
          <button type="button" class="btn" id="admin-search-btn" style="margin-bottom:0;padding:10px 16px">🔍</button>
        </div>

        <!-- Stats globales -->
        <div id="admin-global-stats" style="background:#1a1505;border-radius:12px;padding:14px;margin:12px 0">
          <div style="color:#f5c518;font-weight:700;margin-bottom:8px">📊 Stats globales</div>
          <div id="admin-stats-content" style="color:#ccc;font-size:13px">Cargando...</div>
        </div>

        <!-- Fuente de datos activa -->
        <div id="admin-source-badge" style="font-size:11px;color:#aaa;margin-bottom:8px;text-align:right"></div>

        <!-- Lista de usuarios -->
        <div style="color:#f5c518;font-weight:700;margin:16px 0 8px">👥 Todos los usuarios</div>
        <div id="admin-user-list">Cargando...</div>

        <!-- Modal detalle usuario -->
        <div id="admin-user-modal" class="hidden" style="background:#1a1505;border-radius:16px;padding:18px;margin-top:16px;border:1px solid #f5c51855">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div style="color:#f5c518;font-weight:700;font-size:16px" id="admin-modal-title">Usuario</div>
            <button type="button" id="admin-modal-close" style="background:none;border:none;color:#aaa;font-size:20px;cursor:pointer">✕</button>
          </div>

          <div id="admin-modal-source" style="font-size:11px;color:#888;margin-bottom:6px"></div>
          <div id="admin-modal-coins" style="color:#ccc;font-size:13px;margin-bottom:4px"></div>
          <div id="admin-modal-email" style="color:#ccc;font-size:13px;margin-bottom:8px"></div>
          <div id="admin-modal-value" style="color:#ccc;font-size:13px;margin-bottom:12px"></div>

          <!-- Dar monedas -->
          <div style="margin-bottom:12px">
            <div style="color:#aaa;font-size:12px;margin-bottom:4px">Dar / quitar monedas</div>
            <div style="display:flex;gap:8px">
              <input type="number" id="admin-coins-input" placeholder="cantidad" style="flex:1;background:#0d0a05;border:1px solid #333;color:#fff;border-radius:8px;padding:8px;font-size:14px">
              <button type="button" class="btn" id="admin-give-coins-btn" style="padding:8px 14px;font-size:13px">✅ Dar</button>
              <button type="button" class="btn logout-btn" id="admin-take-coins-btn" style="padding:8px 14px;font-size:13px">❌ Quitar</button>
            </div>
          </div>

          <!-- Cambiar contraseña (solo usuarios locales) -->
          <div style="margin-bottom:12px" id="admin-pass-section">
            <div style="color:#aaa;font-size:12px;margin-bottom:4px">Cambiar contraseña <span style="color:#666">(solo si el usuario está en este dispositivo)</span></div>
            <div style="display:flex;gap:8px">
              <input type="password" id="admin-newpass-input" placeholder="nueva contraseña" style="flex:1;background:#0d0a05;border:1px solid #333;color:#fff;border-radius:8px;padding:8px;font-size:14px">
              <button type="button" class="btn" id="admin-change-pass-btn" style="padding:8px 14px;font-size:13px">💾 Guardar</button>
            </div>
          </div>

          <!-- Inventario -->
          <div style="color:#aaa;font-size:12px;margin-bottom:6px">Inventario</div>
          <div id="admin-modal-inventory" style="font-size:13px;color:#ccc;background:#0d0a05;border-radius:8px;padding:10px;max-height:140px;overflow-y:auto"></div>

          <!-- Acciones peligrosas -->
          <div style="display:flex;gap:8px;margin-top:14px">
            <button type="button" class="btn" id="admin-ban-btn" style="background:#8b0000;flex:1">🚫 Banear usuario</button>
            <button type="button" class="btn logout-btn" id="admin-delete-btn" style="flex:1">🗑️ Eliminar cuenta</button>
          </div>
          <div id="admin-modal-msg" style="margin-top:8px;font-size:13px;text-align:center"></div>
        </div>

      </div>
    </div>
  </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
})();

// ── Variables de estado del admin ────────────────────────────────────
let adminSelectedUser = null;

// Cache de todos los usuarios cargados (mezcla Firestore + local)
// Estructura: { username: { coins, inventory, value, email, banned, source } }
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

// ── Cargar TODOS los usuarios (Firestore + localStorage) ─────────────
async function adminLoadAllUsers() {
  // 1. Empezamos con los usuarios locales de este dispositivo
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

  // 2. Añadimos / sobreescribimos con los datos de Firestore (ranking global)
  //    Firestore tiene inventory y value de TODOS los jugadores que han jugado alguna vez
  if (typeof db !== 'undefined' && db) {
    try {
      const snap = await db.collection('leaderboard').get();
      snap.docs.forEach(function (doc) {
        const d = doc.data();
        const u = d.username;
        if (!u) return;
        if (merged[u]) {
          // Ya existe en local → actualizar inventory y value desde Firestore,
          // pero conservar coins, email, password y banned del local
          merged[u].inventory = d.inventory || merged[u].inventory;
          merged[u].value = d.value || merged[u].value;
          merged[u].source = 'local+firestore';
          if (d.banned) merged[u].banned = true;
        } else {
          // Solo existe en Firestore (otro dispositivo)
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

      // 3. También miramos la colección 'users' si existe (persistencia global de cuentas)
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
      } catch (e) {
        // La colección 'users' puede no existir todavía, es normal
      }

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

  // Ordenar: primero los que tienen más valor de colección
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
      '<div style="flex:1">' +
        '<div style="font-weight:600;color:#fff">' + username + banned + sourceIcon + '</div>' +
        '<div style="font-size:12px;color:#aaa">🪙 ' + coins.toLocaleString() + ' · ⭐ ' + (u.value || 0) + ' pts · 🎁 ' + invCount + ' items</div>' +
      '</div>' +
      '<div style="color:#555;font-size:18px">›</div>';
    row.addEventListener('click', function () {
      adminOpenUserModal(username);
    });
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
  if (invKeys.length === 0) {
    invEl.textContent = '(colección vacía)';
  } else {
    invEl.innerHTML = invKeys.map(function (item) {
      return '<div>' + item + ': <b>' + inventory[item] + '</b></div>';
    }).join('');
  }

  document.getElementById('admin-user-modal').classList.remove('hidden');
  document.getElementById('admin-modal-msg').textContent = '';
  document.getElementById('admin-user-modal').scrollIntoView({ behavior: 'smooth' });
}

// ── Persistir cambios: local + Firestore ─────────────────────────────
async function adminPersistUser(username) {
  const u = adminAllUsers[username];
  if (!u) return;

  // Siempre actualizar local si el usuario existe ahí
  const localUsers = UserStore.load();
  if (localUsers[username]) {
    localUsers[username].coins = u.coins;
    if (u.inventory) localUsers[username].inventory = u.inventory;
    if (u.banned !== undefined) localUsers[username].banned = u.banned;
    UserStore.save(localUsers);
  }

  // Siempre actualizar Firestore (para que el cambio sea global)
  if (typeof db !== 'undefined' && db) {
    try {
      // Actualizar leaderboard (público)
      await db.collection('leaderboard').doc(username).set({
        username: username,
        inventory: u.inventory || {},
        value: computeCollectionValue(u.inventory || {}),
        coins: u.coins || 0,
        banned: u.banned || false,
        updatedAt: Date.now()
      }, { merge: true });

      // Actualizar colección users (datos completos del admin)
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

  // Borrar del local
  const localUsers = UserStore.load();
  if (localUsers[username]) {
    delete localUsers[username];
    UserStore.save(localUsers);
  }

  // Borrar de Firestore
  if (typeof db !== 'undefined' && db) {
    try {
      await db.collection('leaderboard').doc(username).delete();
      await db.collection('users').doc(username).delete();
    } catch (e) {
      console.warn('No se pudo eliminar de Firestore:', e);
    }
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
    const q = document.getElementById('admin-search').value.trim();
    adminRenderUserList(q);
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
    document.getElementById('admin-modal-coins').textContent = '🪙 Monedas: ' + adminAllUsers[adminSelectedUser].coins.toLocaleString();
    adminShowMsg('+' + amount + ' monedas añadidas', true);
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

  // Cambiar contraseña (solo funciona para usuarios locales)
  document.getElementById('admin-change-pass-btn').addEventListener('click', function () {
    if (!adminSelectedUser) return;
    const newPass = document.getElementById('admin-newpass-input').value.trim();
    if (!newPass) { adminShowMsg('Introduce una contraseña', false); return; }
    const localUsers = UserStore.load();
    if (!localUsers[adminSelectedUser]) {
      adminShowMsg('Este usuario no tiene cuenta local en este dispositivo', false);
      return;
    }
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

});
