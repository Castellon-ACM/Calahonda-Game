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

        <!-- Lista de usuarios -->
        <div style="color:#f5c518;font-weight:700;margin:16px 0 8px">👥 Todos los usuarios</div>
        <div id="admin-user-list">Cargando...</div>

        <!-- Modal detalle usuario -->
        <div id="admin-user-modal" class="hidden" style="background:#1a1505;border-radius:16px;padding:18px;margin-top:16px;border:1px solid #f5c51855">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div style="color:#f5c518;font-weight:700;font-size:16px" id="admin-modal-title">Usuario</div>
            <button type="button" id="admin-modal-close" style="background:none;border:none;color:#aaa;font-size:20px;cursor:pointer">✕</button>
          </div>

          <div id="admin-modal-coins" style="color:#ccc;font-size:13px;margin-bottom:8px"></div>
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

          <!-- Cambiar contraseña -->
          <div style="margin-bottom:12px">
            <div style="color:#aaa;font-size:12px;margin-bottom:4px">Cambiar contraseña</div>
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

// ── Eventos ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

  document.getElementById('admin-logout-btn').addEventListener('click', function () {
    adminHideAll();
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
  });

  document.getElementById('admin-search-btn').addEventListener('click', function () {
    const q = document.getElementById('admin-search').value.trim().toLowerCase();
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
  document.getElementById('admin-give-coins-btn').addEventListener('click', function () {
    if (!adminSelectedUser) return;
    const amount = parseInt(document.getElementById('admin-coins-input').value, 10);
    if (isNaN(amount) || amount <= 0) { adminShowMsg('Cantidad inválida', false); return; }
    const users = UserStore.load();
    if (!users[adminSelectedUser]) { adminShowMsg('Usuario no encontrado', false); return; }
    users[adminSelectedUser].coins = (users[adminSelectedUser].coins || 0) + amount;
    UserStore.save(users);
    document.getElementById('admin-modal-coins').textContent = '🪙 Monedas: ' + users[adminSelectedUser].coins;
    adminShowMsg('+' + amount + ' monedas añadidas', true);
  });

  // Quitar monedas
  document.getElementById('admin-take-coins-btn').addEventListener('click', function () {
    if (!adminSelectedUser) return;
    const amount = parseInt(document.getElementById('admin-coins-input').value, 10);
    if (isNaN(amount) || amount <= 0) { adminShowMsg('Cantidad inválida', false); return; }
    const users = UserStore.load();
    if (!users[adminSelectedUser]) { adminShowMsg('Usuario no encontrado', false); return; }
    users[adminSelectedUser].coins = Math.max(0, (users[adminSelectedUser].coins || 0) - amount);
    UserStore.save(users);
    document.getElementById('admin-modal-coins').textContent = '🪙 Monedas: ' + users[adminSelectedUser].coins;
    adminShowMsg('-' + amount + ' monedas quitadas', true);
  });

  // Cambiar contraseña
  document.getElementById('admin-change-pass-btn').addEventListener('click', function () {
    if (!adminSelectedUser) return;
    const newPass = document.getElementById('admin-newpass-input').value.trim();
    if (!newPass) { adminShowMsg('Introduce una contraseña', false); return; }
    const users = UserStore.load();
    if (!users[adminSelectedUser]) { adminShowMsg('Usuario no encontrado', false); return; }
    users[adminSelectedUser].password = newPass;
    UserStore.save(users);
    document.getElementById('admin-newpass-input').value = '';
    adminShowMsg('Contraseña cambiada', true);
  });

  // Banear
  document.getElementById('admin-ban-btn').addEventListener('click', function () {
    if (!adminSelectedUser) return;
    if (!confirm('¿Banear a ' + adminSelectedUser + '? Se le vaciará el inventario y monedas.')) return;
    const users = UserStore.load();
    if (!users[adminSelectedUser]) return;
    users[adminSelectedUser].coins = 0;
    users[adminSelectedUser].inventory = {};
    users[adminSelectedUser].banned = true;
    UserStore.save(users);
    if (typeof db !== 'undefined' && db) {
      db.collection('leaderboard').doc(adminSelectedUser).delete().catch(function () {});
    }
    adminShowMsg(adminSelectedUser + ' baneado', true);
    document.getElementById('admin-modal-coins').textContent = '🪙 Monedas: 0';
    document.getElementById('admin-modal-inventory').textContent = '(vacío)';
  });

  // Eliminar cuenta
  document.getElementById('admin-delete-btn').addEventListener('click', function () {
    if (!adminSelectedUser) return;
    if (!confirm('¿Eliminar la cuenta de ' + adminSelectedUser + '? Esta acción no se puede deshacer.')) return;
    const users = UserStore.load();
    delete users[adminSelectedUser];
    UserStore.save(users);
    if (typeof db !== 'undefined' && db) {
      db.collection('leaderboard').doc(adminSelectedUser).delete().catch(function () {});
    }
    document.getElementById('admin-user-modal').classList.add('hidden');
    adminSelectedUser = null;
    adminLoadPanel();
  });

});

// ── Cargar panel ──────────────────────────────────────────────────────
function adminLoadPanel() {
  adminRenderGlobalStats();
  adminRenderUserList('');
}

async function adminRenderGlobalStats() {
  const statsEl = document.getElementById('admin-stats-content');
  const users = UserStore.load();
  const localCount = Object.keys(users).length;
  let firestoreCount = '?';
  let topUser = '?';
  let totalCoins = 0;

  Object.keys(users).forEach(function (u) {
    totalCoins += (users[u].coins || 0);
  });

  if (typeof db !== 'undefined' && db) {
    try {
      const snap = await db.collection('leaderboard').orderBy('value', 'desc').limit(1).get();
      firestoreCount = (await db.collection('leaderboard').get()).size;
      if (!snap.empty) topUser = snap.docs[0].data().username;
    } catch (e) {}
  }

  statsEl.innerHTML =
    '<div>👤 Usuarios registrados (local): <b>' + localCount + '</b></div>' +
    '<div>🌐 Usuarios en ranking global: <b>' + firestoreCount + '</b></div>' +
    '<div>🪙 Monedas totales en circulación: <b>' + totalCoins.toLocaleString() + '</b></div>' +
    '<div>🏆 Líder del ranking: <b>' + topUser + '</b></div>';
}

function adminRenderUserList(filter) {
  const listEl = document.getElementById('admin-user-list');
  const users = UserStore.load();
  let keys = Object.keys(users);
  if (filter) keys = keys.filter(function (k) { return k.toLowerCase().includes(filter); });

  if (keys.length === 0) {
    listEl.innerHTML = '<div style="color:#aaa;text-align:center;padding:16px">No se encontraron usuarios</div>';
    return;
  }

  listEl.innerHTML = '';
  keys.sort().forEach(function (username) {
    const u = users[username];
    const coins = u.coins || 0;
    const invCount = Object.keys(u.inventory || {}).length;
    const banned = u.banned ? ' 🚫' : '';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;padding:10px 0;border-bottom:1px solid #222;cursor:pointer;gap:10px';
    row.innerHTML =
      '<div style="width:36px;height:36px;border-radius:50%;background:#f5c518;display:flex;align-items:center;justify-content:center;font-weight:700;color:#0d0a05;flex-shrink:0">' +
        username[0].toUpperCase() +
      '</div>' +
      '<div style="flex:1">' +
        '<div style="font-weight:600;color:#fff">' + username + banned + '</div>' +
        '<div style="font-size:12px;color:#aaa">🪙 ' + coins.toLocaleString() + ' · 🎁 ' + invCount + ' items</div>' +
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
  const users = UserStore.load();
  const u = users[username] || {};
  const inventory = u.inventory || {};
  const coins = u.coins || 0;
  const value = typeof computeCollectionValue === 'function' ? computeCollectionValue(inventory) : '?';

  document.getElementById('admin-modal-title').textContent = '👤 ' + username + (u.banned ? ' 🚫 BANEADO' : '');
  document.getElementById('admin-modal-coins').textContent = '🪙 Monedas: ' + coins.toLocaleString();
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
