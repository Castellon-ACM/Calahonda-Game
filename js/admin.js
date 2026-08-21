// =====================================================================
//  PANEL DE ADMINISTRACIÓN — admincaste / papaplaya
//  NOTA: el admin gestiona monedas/inventario del perfil "solo" (cuenta
//  principal fuera de grupos) de cada jugador. Los perfiles de grupo
//  tienen su propia economía independiente y no se gestionan aquí todavía.
// =====================================================================

const ADMIN_USER = 'admincaste';
// La contraseña ya NO está en texto plano: se guarda su hash SHA-256.
// Sigue siendo la misma contraseña de siempre, solo que ahora no se puede
// leer directamente mirando el código fuente del repositorio.
const ADMIN_PASS_HASH = '1a61216fd581cef1c29877f675e7e2839ba0e91afe475b1b8038461f1f146679';

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

    <!-- Pestañas del admin -->
    <div style="display:flex;background:#161116;border-bottom:1px solid #3a2c14;overflow-x:auto">
      <button type="button" class="admin-tab-btn active" id="admin-tabbtn-users" style="flex:1;min-width:80px;background:none;border:none;color:#f5c518;padding:12px 4px;font-size:13px;font-weight:700;cursor:pointer;border-bottom:2px solid #f5c518;white-space:nowrap">👥 Usuarios</button>
      <button type="button" class="admin-tab-btn" id="admin-tabbtn-events" style="flex:1;min-width:80px;background:none;border:none;color:#8a7c5a;padding:12px 4px;font-size:13px;font-weight:700;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap">🎉 Eventos</button>
      <button type="button" class="admin-tab-btn" id="admin-tabbtn-announcements" style="flex:1;min-width:80px;background:none;border:none;color:#8a7c5a;padding:12px 4px;font-size:13px;font-weight:700;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap">📢 Anuncios</button>
    </div>

    <div class="screen-body">
      <div class="card">

        <!-- ============ PESTAÑA: USUARIOS ============ -->
        <div id="admin-tab-users">
          <h1>Usuarios</h1>

          <!-- Buscador -->
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
              <div style="color:#aaa;font-size:12px;margin-bottom:6px">Dar / quitar monedas <span style="color:#555">(cuenta principal, sin grupo)</span></div>
              <input type="number" id="admin-coins-input" placeholder="cantidad de monedas" style="width:100%;box-sizing:border-box;background:#0d0a05;border:1px solid #333;color:#fff;border-radius:8px;padding:10px;font-size:14px;margin-bottom:8px">
              <button type="button" class="btn" id="admin-give-coins-btn" style="width:100%;box-sizing:border-box;padding:12px;font-size:14px;margin-bottom:6px;white-space:nowrap;overflow:hidden;min-width:0">✅ Dar monedas</button>
              <button type="button" class="btn logout-btn" id="admin-take-coins-btn" style="width:100%;box-sizing:border-box;padding:12px;font-size:14px;white-space:nowrap;overflow:hidden;min-width:0">❌ Quitar monedas</button>
            </div>

            <!-- Cambiar contraseña -->
            <div style="margin-bottom:14px">
              <div style="color:#aaa;font-size:12px;margin-bottom:6px">Cambiar contraseña <span style="color:#555">(se sincroniza en todos los dispositivos)</span></div>
              <input type="password" id="admin-newpass-input" placeholder="nueva contraseña" style="width:100%;box-sizing:border-box;background:#0d0a05;border:1px solid #333;color:#fff;border-radius:8px;padding:10px;font-size:14px;margin-bottom:8px">
              <button type="button" class="btn" id="admin-change-pass-btn" style="width:100%;box-sizing:border-box;padding:12px;font-size:14px;white-space:nowrap;overflow:hidden;min-width:0">💾 Guardar contraseña</button>
            </div>

            <!-- Inventario -->
            <div style="color:#aaa;font-size:12px;margin-bottom:6px">Inventario (cuenta principal)</div>
            <div id="admin-modal-inventory" style="font-size:13px;color:#ccc;background:#0d0a05;border-radius:8px;padding:10px;max-height:140px;overflow-y:auto;margin-bottom:14px"></div>

            <!-- Acciones peligrosas -->
            <button type="button" class="btn" id="admin-ban-btn" style="background:#8b0000;width:100%;box-sizing:border-box;padding:12px;font-size:14px;margin-bottom:6px;white-space:nowrap;overflow:hidden;min-width:0">🚫 Banear usuario</button>
            <button type="button" class="btn logout-btn" id="admin-delete-btn" style="width:100%;box-sizing:border-box;padding:12px;font-size:14px;white-space:nowrap;overflow:hidden;min-width:0">🗑️ Eliminar cuenta</button>

            <div id="admin-modal-msg" style="margin-top:10px;font-size:13px;text-align:center"></div>
          </div>
        </div>

        <!-- ============ PESTAÑA: EVENTOS Y AVISOS ============ -->
        <div id="admin-tab-events" class="hidden">
          <h1>Eventos y avisos</h1>

          <!-- DAR MONEDAS A TODOS -->
          <div style="background:#1a1505;border-radius:12px;padding:14px;margin:12px 0;border:1px solid #f5c51833">
            <div style="color:#f5c518;font-weight:700;margin-bottom:8px">🎁 Dar monedas a TODOS</div>
            <div style="color:#aaa;font-size:12px;margin-bottom:8px">Al entrar al juego verán un popup de regalo.</div>
            <input type="number" id="admin-gift-all-input" placeholder="cantidad de monedas" style="width:100%;box-sizing:border-box;background:#0d0a05;border:1px solid #333;color:#fff;border-radius:8px;padding:10px;font-size:14px;margin-bottom:8px">
            <button type="button" class="btn" id="admin-gift-all-btn" style="width:100%;box-sizing:border-box;padding:11px;font-size:14px;white-space:nowrap;overflow:hidden;min-width:0">🎁 Enviar regalo a todos</button>
            <div id="admin-gift-all-msg" style="margin-top:8px;font-size:13px;text-align:center"></div>
          </div>
          <!-- Aquí se inyectan dinámicamente: evento 3 cartas, evento cronómetro, apoyo/donaciones -->
        </div>

        <!-- ============ PESTAÑA: ANUNCIOS ============ -->
        <div id="admin-tab-announcements" class="hidden">
          <h1>Anuncios</h1>
          <div style="color:#aaa;font-size:12px;margin-bottom:16px">
            Los anuncios aparecen en el buzón ✉️ de todos los jugadores. Se guardan en Firestore y son visibles en tiempo real.
          </div>

          <!-- Formulario nuevo anuncio -->
          <div style="background:#1a1505;border-radius:12px;padding:14px;margin-bottom:16px;border:1px solid #f5c51833">
            <div style="color:#f5c518;font-weight:700;margin-bottom:12px">➕ Nuevo anuncio</div>

            <div style="color:#aaa;font-size:12px;margin-bottom:4px">Título *</div>
            <input type="text" id="ann-title" placeholder="ej: Nuevo juego: Póker" style="width:100%;box-sizing:border-box;background:#0d0a05;border:1px solid #333;color:#fff;border-radius:8px;padding:10px;font-size:14px;margin-bottom:10px">

            <div style="color:#aaa;font-size:12px;margin-bottom:4px">Descripción *</div>
            <textarea id="ann-body" placeholder="Describe la novedad con detalle..." rows="3" style="width:100%;box-sizing:border-box;background:#0d0a05;border:1px solid #333;color:#fff;border-radius:8px;padding:10px;font-size:14px;margin-bottom:10px;resize:vertical;font-family:inherit"></textarea>

            <div style="color:#aaa;font-size:12px;margin-bottom:4px">Texto del botón CTA <span style="color:#555">(opcional)</span></div>
            <input type="text" id="ann-cta" placeholder="ej: Entrar al casino" style="width:100%;box-sizing:border-box;background:#0d0a05;border:1px solid #333;color:#fff;border-radius:8px;padding:10px;font-size:14px;margin-bottom:10px">

            <div style="color:#aaa;font-size:12px;margin-bottom:4px">Pestaña del CTA</div>
            <select id="ann-ctatab" style="width:100%;box-sizing:border-box;background:#0d0a05;border:1px solid #333;color:#fff;border-radius:8px;padding:10px;font-size:14px;margin-bottom:14px;appearance:auto">
              <option value="home">🏠 Inicio</option>
              <option value="casino">🎰 Casino</option>
              <option value="event">🃏 Evento</option>
              <option value="support">☕ Apoyo</option>
            </select>

            <button type="button" class="btn" id="ann-publish-btn" style="width:100%;box-sizing:border-box;padding:12px;font-size:14px">📢 Publicar anuncio</button>
            <div id="ann-publish-msg" style="margin-top:8px;font-size:13px;text-align:center"></div>
          </div>

          <!-- Lista de anuncios existentes -->
          <div style="color:#f5c518;font-weight:700;margin-bottom:8px">📋 Anuncios publicados</div>
          <div id="ann-list">Cargando...</div>
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

function adminShowAnnMsg(text, ok) {
  const el = document.getElementById('ann-publish-msg');
  el.textContent = text;
  el.style.color = ok ? '#4caf50' : '#f44336';
  setTimeout(function () { el.textContent = ''; }, 4000);
}

// ── Cargar TODOS los usuarios (Firestore + localStorage) ─────────────
// Se muestra siempre el perfil "solo" (cuenta principal fuera de grupos).
async function adminLoadAllUsers() {
  const localUsers = UserStore.load();
  const merged = {};

  Object.keys(localUsers).forEach(function (u) {
    const d = localUsers[u];
    const solo = (d.profiles && d.profiles.solo) || {};
    merged[u] = {
      coins: solo.coins || 0,
      inventory: solo.inventory || {},
      email: d.email || '',
      banned: d.banned || false,
      password: d.password || '',
      source: 'local',
      value: computeCollectionValue(solo.inventory || {})
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
            coins: 0,
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
          const solo = (d.profiles && d.profiles.solo) || {};
          if (merged[u]) {
            if (solo.coins !== undefined) merged[u].coins = solo.coins;
            if (d.email) merged[u].email = d.email;
            if (d.banned) merged[u].banned = d.banned;
            if (solo.inventory) merged[u].inventory = solo.inventory;
            merged[u].source = 'local+firestore';
          } else {
            merged[u] = {
              coins: solo.coins || 0,
              inventory: solo.inventory || {},
              email: d.email || '',
              banned: d.banned || false,
              password: '',
              source: 'firestore',
              value: computeCollectionValue(solo.inventory || {})
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

// ── Persistir cambios: local + Firestore (perfil "solo") ─────────────
async function adminPersistUser(username) {
  const u = adminAllUsers[username];
  if (!u) return;

  const localUsers = UserStore.load();
  if (localUsers[username]) {
    if (!localUsers[username].profiles) localUsers[username].profiles = {};
    if (!localUsers[username].profiles.solo) localUsers[username].profiles.solo = {};
    localUsers[username].profiles.solo.coins = u.coins;
    if (u.inventory) localUsers[username].profiles.solo.inventory = u.inventory;
    if (u.banned !== undefined) localUsers[username].banned = u.banned;
    UserStore.save(localUsers);
  }

  if (typeof db !== 'undefined' && db) {
    try {
      await db.collection('leaderboard').doc(username).set({
        username: username,
        inventory: u.inventory || {},
        value: computeCollectionValue(u.inventory || {}),
        banned: u.banned || false,
        updatedAt: Date.now()
      }, { merge: true });

      await db.collection('users').doc(username).set({
        email: u.email || '',
        banned: u.banned || false,
        updatedAt: Date.now(),
        profiles: {
          solo: {
            coins: u.coins || 0,
            inventory: u.inventory || {},
            value: computeCollectionValue(u.inventory || {}),
            updatedAt: Date.now()
          }
        }
      }, { merge: true });
    } catch (e) {
      console.warn('No se pudo persistir en Firestore:', e);
    }
  }
}

// Ajusta las monedas del perfil "solo" de un jugador de forma ATÓMICA y fiable:
// - Lee el saldo REAL desde Firestore justo en ese instante (no un valor
//   cacheado que pudiera estar desactualizado si el jugador jugó mientras tanto).
// - Solo confirma éxito si el guardado en Firestore se ha hecho de verdad.
// Devuelve { ok, coins, reason }.
async function adminAdjustCoins(username, delta) {
  if (typeof db === 'undefined' || !db) {
    return { ok: false, reason: 'Sin conexión a Firestore' };
  }
  try {
    const ref = db.collection('users').doc(username);
    let newCoins = null;
    await db.runTransaction(async function (tx) {
      const doc = await tx.get(ref);
      const d = doc.exists ? doc.data() : {};
      const current = (d.profiles && d.profiles.solo && d.profiles.solo.coins) || 0;
      newCoins = Math.max(0, current + delta);
      tx.set(ref, { profiles: { solo: { coins: newCoins, updatedAt: Date.now() } }, updatedAt: Date.now() }, { merge: true });
    });

    // Reflejar también en localStorage si el jugador está registrado en este dispositivo
    const localUsers = UserStore.load();
    if (localUsers[username]) {
      if (!localUsers[username].profiles) localUsers[username].profiles = {};
      if (!localUsers[username].profiles.solo) localUsers[username].profiles.solo = {};
      localUsers[username].profiles.solo.coins = newCoins;
      UserStore.save(localUsers);
    }
    if (adminAllUsers[username]) adminAllUsers[username].coins = newCoins;

    return { ok: true, coins: newCoins };
  } catch (e) {
    console.warn('No se pudo ajustar monedas:', e);
    return { ok: false, reason: e && e.message ? e.message : 'Error desconocido' };
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

// ── Ayuda: evita que una petición cuelgue el flujo indefinidamente ────
function adminWithTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error('timeout')); }, ms);
    })
  ]);
}

// ── Regalo a TODOS ────────────────────────────────────────────────────
async function adminGiftAll(amount) {
  const btn = document.getElementById('admin-gift-all-btn');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const usernames = Object.keys(adminAllUsers);
  let ok = 0;

  if (typeof db !== 'undefined' && db) {
    const results = await Promise.allSettled(
      usernames.map(function (username) {
        return adminWithTimeout(
          db.collection('adminGifts').doc(username).set({
            amount: firebase.firestore.FieldValue.increment(amount),
            updatedAt: Date.now()
          }, { merge: true }),
          12000
        );
      })
    );
    ok = results.filter(function (r) { return r.status === 'fulfilled'; }).length;
  } else {
    const localUsers = UserStore.load();
    usernames.forEach(function (u) {
      if (localUsers[u] && localUsers[u].profiles && localUsers[u].profiles.solo) {
        localUsers[u].profiles.solo.coins = (localUsers[u].profiles.solo.coins || 0) + amount;
        ok++;
      }
    });
    UserStore.save(localUsers);
  }

  btn.disabled = false;
  btn.textContent = '🎁 Enviar regalo a todos';

  if (ok === usernames.length) {
    adminShowGiftAllMsg('✅ Regalo de ' + amount + ' 🪙 enviado a ' + ok + ' jugadores', true);
  } else {
    adminShowGiftAllMsg('⚠️ Enviado a ' + ok + ' de ' + usernames.length + ' jugadores (algunos fallaron, prueba de nuevo)', false);
  }

  await adminLoadAllUsers();
  adminRenderGlobalStats();
  adminRenderUserList(document.getElementById('admin-search').value.trim());
}

// ── Comprobar regalo pendiente del admin ──────────────────────────────
// El regalo del admin siempre se suma al perfil ACTIVO del jugador en ese
// momento (con el que esté jugando cuando lo recibe).
async function checkAdminGift(username) {
  if (!username || typeof db === 'undefined' || !db) return;
  try {
    const ref = db.collection('adminGifts').doc(username);
    const doc = await ref.get();
    if (!doc.exists) return;
    const amount = doc.data().amount || 0;
    if (amount <= 0) { await ref.delete(); return; }

    const users = UserStore.load();
    if (users[username]) {
      const full = ensureUserDefaults(username, users[username]);
      const key = full.activeGroup || 'solo';
      full.profiles[key].coins = (full.profiles[key].coins || 0) + amount;
      users[username] = full;
      UserStore.save(users);
    }

    await ref.delete();

    const appScreen = document.getElementById('app-screen');
    if (!appScreen || appScreen.classList.contains('hidden')) return;

    const key = (users[username].activeGroup || 'solo');
    const profile = users[username].profiles[key];
    const balanceEl = document.getElementById('balance-amount');
    if (balanceEl && profile) balanceEl.textContent = profile.coins;

    if (typeof pushUserData === 'function' && profile) {
      pushUserData(username, profile);
    }

    document.getElementById('admin-gift-popup-text').textContent =
      'El administrador te ha regalado ' + amount.toLocaleString() + ' monedas 🪙';
    const popup = document.getElementById('admin-gift-popup');
    popup.classList.remove('hidden');
    popup.style.display = 'flex';

  } catch (e) {
    console.warn('No se pudo comprobar regalo del admin:', e);
  }
}

// =====================================================================
//  GESTIÓN DE ANUNCIOS (pestaña admin)
// =====================================================================

// Genera un id único basado en timestamp
function annNextId(existing) {
  if (!existing || existing.length === 0) return 1;
  return existing.reduce(function (max, a) { return a.id > max ? a.id : max; }, 0) + 1;
}

// Formatea la fecha actual como "20 ago", "3 sep", etc.
function annTodayLabel() {
  const now = new Date();
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return now.getDate() + ' ' + months[now.getMonth()];
}

// Carga anuncios desde Firestore y los renderiza en la lista del admin
async function adminLoadAnnouncements() {
  const listEl = document.getElementById('ann-list');
  if (!listEl) return;
  listEl.innerHTML = '<div style="color:#aaa;text-align:center;padding:12px">Cargando...</div>';

  if (typeof db === 'undefined' || !db) {
    listEl.innerHTML = '<div style="color:#f44336;font-size:13px">⚠️ Firestore no disponible. Los anuncios no se pueden gestionar sin conexión.</div>';
    return;
  }

  try {
    const snap = await db.collection('announcements').orderBy('id', 'desc').get();
    if (snap.empty) {
      listEl.innerHTML = '<div style="color:#aaa;font-size:13px;text-align:center;padding:12px">No hay anuncios publicados aún.</div>';
      return;
    }

    listEl.innerHTML = '';
    snap.docs.forEach(function (doc) {
      const a = doc.data();
      const card = document.createElement('div');
      card.style.cssText = 'background:#1a1505;border-radius:12px;padding:14px;margin-bottom:10px;border:1px solid #f5c51822';
      card.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="color:#888;font-size:11px;margin-bottom:2px">' + (a.date || '') + ' · id #' + a.id + '</div>' +
            '<div style="color:#f5c518;font-weight:700;font-size:14px;margin-bottom:4px;word-break:break-word">' + (a.title || '') + '</div>' +
            '<div style="color:#ccc;font-size:13px;word-break:break-word">' + (a.body || '') + '</div>' +
            (a.cta ? '<div style="color:#888;font-size:11px;margin-top:6px">CTA: ' + a.cta + ' → ' + (a.ctaTab || 'home') + '</div>' : '') +
          '</div>' +
          '<button type="button" data-annid="' + a.id + '" class="ann-delete-btn" style="background:#8b0000;border:none;color:#fff;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;flex-shrink:0">🗑️</button>' +
        '</div>';
      listEl.appendChild(card);
    });

    // Eventos de borrado
    listEl.querySelectorAll('.ann-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const annId = parseInt(btn.getAttribute('data-annid'), 10);
        if (!confirm('¿Eliminar el anuncio #' + annId + '?')) return;
        await adminDeleteAnnouncement(annId);
      });
    });

  } catch (e) {
    listEl.innerHTML = '<div style="color:#f44336;font-size:13px">Error al cargar anuncios: ' + e.message + '</div>';
  }
}

// Publica un nuevo anuncio en Firestore
async function adminPublishAnnouncement() {
  const title = document.getElementById('ann-title').value.trim();
  const body = document.getElementById('ann-body').value.trim();
  const cta = document.getElementById('ann-cta').value.trim();
  const ctaTab = document.getElementById('ann-ctatab').value;

  if (!title || !body) { adminShowAnnMsg('El título y la descripción son obligatorios.', false); return; }

  if (typeof db === 'undefined' || !db) {
    adminShowAnnMsg('⚠️ Sin conexión a Firestore. No se puede publicar.', false);
    return;
  }

  const btn = document.getElementById('ann-publish-btn');
  btn.disabled = true;
  btn.textContent = 'Publicando...';

  try {
    // Obtener el id máximo actual para asignar el siguiente
    const snap = await db.collection('announcements').get();
    const existing = snap.docs.map(function (d) { return d.data(); });
    const newId = annNextId(existing);
    const newAnn = {
      id: newId,
      date: annTodayLabel(),
      title: title,
      body: body,
      createdAt: Date.now()
    };
    if (cta) { newAnn.cta = cta; newAnn.ctaTab = ctaTab; }

    await db.collection('announcements').doc(String(newId)).set(newAnn);

    // Limpiar formulario
    document.getElementById('ann-title').value = '';
    document.getElementById('ann-body').value = '';
    document.getElementById('ann-cta').value = '';
    document.getElementById('ann-ctatab').value = 'home';

    adminShowAnnMsg('✅ Anuncio #' + newId + ' publicado. Los jugadores lo verán al abrir el buzón.', true);

    // Recargar lista
    await adminLoadAnnouncements();

  } catch (e) {
    adminShowAnnMsg('Error al publicar: ' + e.message, false);
  }

  btn.disabled = false;
  btn.textContent = '📢 Publicar anuncio';
}

// Elimina un anuncio de Firestore por id
async function adminDeleteAnnouncement(annId) {
  if (typeof db === 'undefined' || !db) return;
  try {
    await db.collection('announcements').doc(String(annId)).delete();
    await adminLoadAnnouncements();
  } catch (e) {
    alert('Error al eliminar: ' + e.message);
  }
}

// ── Cambio de pestañas del admin ──────────────────────────────────────
function adminShowTab(tab) {
  const tabs = ['users', 'events', 'announcements'];
  tabs.forEach(function (t) {
    const el = document.getElementById('admin-tab-' + t);
    const btn = document.getElementById('admin-tabbtn-' + t);
    if (!el || !btn) return;
    const active = t === tab;
    el.classList.toggle('hidden', !active);
    btn.style.color = active ? '#f5c518' : '#8a7c5a';
    btn.style.borderBottomColor = active ? '#f5c518' : 'transparent';
  });

  // Cargar datos al activar la pestaña de anuncios
  if (tab === 'announcements') {
    adminLoadAnnouncements();
  }
}

// ── Eventos ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

  document.getElementById('admin-tabbtn-users').addEventListener('click', function () { adminShowTab('users'); });
  document.getElementById('admin-tabbtn-events').addEventListener('click', function () { adminShowTab('events'); });
  document.getElementById('admin-tabbtn-announcements').addEventListener('click', function () { adminShowTab('announcements'); });

  document.getElementById('ann-publish-btn').addEventListener('click', adminPublishAnnouncement);

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

  // Dar monedas (ahora lee/escribe el saldo REAL en Firestore, con confirmación real,
  // y refresca al momento la lista de abajo con el nuevo saldo)
  document.getElementById('admin-give-coins-btn').addEventListener('click', async function () {
    if (!adminSelectedUser) return;
    const amount = parseInt(document.getElementById('admin-coins-input').value, 10);
    if (isNaN(amount) || amount <= 0) { adminShowMsg('Cantidad inválida', false); return; }
    const btn = this;
    btn.disabled = true;
    const result = await adminAdjustCoins(adminSelectedUser, amount);
    btn.disabled = false;
    if (!result.ok) {
      adminShowMsg('❌ No se guardó: ' + result.reason, false);
      return;
    }
    document.getElementById('admin-modal-coins').textContent = '🪙 Monedas: ' + result.coins.toLocaleString();
    adminShowMsg('✅ +' + amount + ' monedas añadidas (confirmado en Firestore)', true);
    adminRenderGlobalStats();
    adminRenderUserList(document.getElementById('admin-search').value.trim());
  });

  // Quitar monedas (mismo mecanismo fiable + refresco automático de la lista)
  document.getElementById('admin-take-coins-btn').addEventListener('click', async function () {
    if (!adminSelectedUser) return;
    const amount = parseInt(document.getElementById('admin-coins-input').value, 10);
    if (isNaN(amount) || amount <= 0) { adminShowMsg('Cantidad inválida', false); return; }
    const btn = this;
    btn.disabled = true;
    const result = await adminAdjustCoins(adminSelectedUser, -amount);
    btn.disabled = false;
    if (!result.ok) {
      adminShowMsg('❌ No se guardó: ' + result.reason, false);
      return;
    }
    document.getElementById('admin-modal-coins').textContent = '🪙 Monedas: ' + result.coins.toLocaleString();
    adminShowMsg('✅ -' + amount + ' monedas quitadas (confirmado en Firestore)', true);
    adminRenderGlobalStats();
    adminRenderUserList(document.getElementById('admin-search').value.trim());
  });

  // Dar a todos
  document.getElementById('admin-gift-all-btn').addEventListener('click', async function () {
    const amount = parseInt(document.getElementById('admin-gift-all-input').value, 10);
    if (isNaN(amount) || amount <= 0) { adminShowGiftAllMsg('Introduce una cantidad válida', false); return; }
    if (!confirm('¿Enviar ' + amount + ' monedas a TODOS los jugadores (' + Object.keys(adminAllUsers).length + ')?')) return;
    await adminGiftAll(amount);
  });

  // Cambiar contraseña (ahora se sincroniza en Firestore, no solo local)
  document.getElementById('admin-change-pass-btn').addEventListener('click', async function () {
    if (!adminSelectedUser) return;
    const newPass = document.getElementById('admin-newpass-input').value.trim();
    if (!newPass) { adminShowMsg('Introduce una contraseña', false); return; }

    const passwordHash = await sha256Hex(newPass);
    if (!passwordHash) { adminShowMsg('No se pudo generar la contraseña', false); return; }

    const localUsers = UserStore.load();
    if (localUsers[adminSelectedUser]) {
      localUsers[adminSelectedUser].passwordHash = passwordHash;
      delete localUsers[adminSelectedUser].password;
      UserStore.save(localUsers);
    }

    if (typeof db !== 'undefined' && db) {
      try {
        await db.collection('users').doc(adminSelectedUser).set({ passwordHash: passwordHash, updatedAt: Date.now() }, { merge: true });
      } catch (e) {
        console.warn('No se pudo subir la nueva contraseña a Firestore:', e);
      }
    }

    document.getElementById('admin-newpass-input').value = '';
    adminShowMsg('Contraseña cambiada (todos los dispositivos)', true);
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
    popup.classList.remove('hidden');
    popup.style.display = 'none';
    popup.classList.add('hidden');
  });

});
