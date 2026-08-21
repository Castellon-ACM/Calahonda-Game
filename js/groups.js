// =====================================================================
//  GRUPOS / MINI LIGAS — pertenencia a VARIOS grupos, cada uno con su
//  propia cuenta (monedas + colección), más un perfil "solo" para cuando
//  no se juega dentro de ningún grupo.
// =====================================================================

function generateGroupCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function groupMsg(text, ok, elId) {
  const el = document.getElementById(elId || 'group-msg');
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? '#8fd17c' : '#ff8f8f';
}

// Guarda en caché local el nombre de un grupo (para no tener que mostrar
// nunca el código en pantalla, solo como dato para invitar a gente).
function cacheGroupName(code, name) {
  if (!code || !name) return;
  const users = UserStore.load();
  const full = ensureUserDefaults(currentUser, users[currentUser]);
  if (!full.groupNames) full.groupNames = {};
  full.groupNames[code] = name;
  users[currentUser] = full;
  UserStore.save(users);
}

function groupDisplayName(code) {
  const users = UserStore.load();
  const full = ensureUserDefaults(currentUser, users[currentUser]);
  return (full.groupNames && full.groupNames[code]) || null;
}

// ── Gestión local de la lista de grupos + grupo activo ────────────────
async function addGroupMembership(code) {
  const users = UserStore.load();
  const full = ensureUserDefaults(currentUser, users[currentUser]);
  if (full.groups.indexOf(code) === -1) full.groups.push(code);
  users[currentUser] = full;
  UserStore.save(users);
  const key = full.activeGroup || 'solo';
  await pushUserData(currentUser, full.profiles[key]);
}

async function removeGroupMembership(code) {
  const users = UserStore.load();
  const full = ensureUserDefaults(currentUser, users[currentUser]);
  full.groups = full.groups.filter(function (g) { return g !== code; });
  if (full.activeGroup === code) full.activeGroup = null;
  users[currentUser] = full;
  UserStore.save(users);
  const key = full.activeGroup || 'solo';
  await pushUserData(currentUser, full.profiles[key]);
}

// Cambia el "perfil activo" (con qué monedas/colección se juega ahora
// mismo) y refresca toda la pantalla del juego para que se note al momento.
async function setActiveGroup(code) {
  const users = UserStore.load();
  const full = ensureUserDefaults(currentUser, users[currentUser]);
  full.activeGroup = code || null;
  users[currentUser] = ensureUserDefaults(currentUser, full);
  UserStore.save(users);
  const key = full.activeGroup || 'solo';
  await pushUserData(currentUser, users[currentUser].profiles[key]);
  if (typeof renderGame === 'function') renderGame();
  if (typeof updateAllBalances === 'function') updateAllBalances(getCurrentUserData().coins);
  updateActiveProfileBadge();
}

// ── Crear / unirse / salir ─────────────────────────────────────────────
async function createGroup(msgElId) {
  if (!firebaseReady || !db) { groupMsg('Sin conexión, inténtalo más tarde', false, msgElId); return; }

  const name = (window.prompt('Nombre del grupo:', 'Grupo de ' + currentUser) || '').trim();
  if (!name) return;

  try {
    let code = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = generateGroupCode();
      const doc = await db.collection('groups').doc(candidate).get();
      if (!doc.exists) { code = candidate; break; }
    }
    if (!code) { groupMsg('No se pudo generar un código, inténtalo de nuevo', false, msgElId); return; }

    await db.collection('groups').doc(code).set({
      code: code,
      name: name,
      ownerUsername: currentUser,
      members: [currentUser],
      createdAt: Date.now()
    });
    cacheGroupName(code, name);
    await addGroupMembership(code);
    await setActiveGroup(code);
    groupMsg('✅ "' + name + '" creado. ¡Comparte el código ' + code + ' con tus amigos!', true, msgElId);
    renderMyGroupsList();
    renderGroupPanel();
  } catch (e) {
    console.warn('Error creando grupo:', e);
    groupMsg('No se pudo crear el grupo, inténtalo de nuevo', false, msgElId);
  }
}

async function joinGroup(inputElId, msgElId) {
  const input = document.getElementById(inputElId || 'group-join-input');
  const code = (input.value || '').trim().toUpperCase();
  if (!code) { groupMsg('Introduce un código', false, msgElId); return; }
  if (!firebaseReady || !db) { groupMsg('Sin conexión, inténtalo más tarde', false, msgElId); return; }

  const already = getCurrentUserData && ensureUserDefaults(currentUser, UserStore.load()[currentUser]).groups.indexOf(code) !== -1;
  if (already) { groupMsg('Ya perteneces a ese grupo', false, msgElId); return; }

  try {
    const ref = db.collection('groups').doc(code);
    const doc = await ref.get();
    if (!doc.exists) { groupMsg('Ese código no existe', false, msgElId); return; }

    const groupName = doc.data().name;
    await ref.set({ members: firebase.firestore.FieldValue.arrayUnion(currentUser) }, { merge: true });
    cacheGroupName(code, groupName);
    await addGroupMembership(code);
    await setActiveGroup(code);
    groupMsg('✅ Te has unido a "' + groupName + '"', true, msgElId);
    input.value = '';
    renderMyGroupsList();
    renderGroupPanel();
  } catch (e) {
    console.warn('Error uniéndose al grupo:', e);
    groupMsg('No se pudo unir al grupo, inténtalo de nuevo', false, msgElId);
  }
}

async function leaveGroupByCode(code, msgElId) {
  if (!window.confirm('¿Salir de este grupo? Tu cuenta y monedas de ese grupo se quedarán guardadas por si vuelves a entrar con el código.')) return;

  try {
    if (firebaseReady && db) {
      await db.collection('groups').doc(code).set({
        members: firebase.firestore.FieldValue.arrayRemove(currentUser)
      }, { merge: true });
    }
  } catch (e) {
    console.warn('Error saliendo del grupo:', e);
  }
  await removeGroupMembership(code);
  groupMsg('Has salido del grupo', true, msgElId);
  renderMyGroupsList();
  renderGroupPanel();
  updateActiveProfileBadge();
}

// ── Pantalla "Mis grupos" (desde el menú hamburguesa) ──────────────────
async function renderMyGroupsList() {
  const listEl = document.getElementById('mygroups-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="inventory-empty">Cargando...</div>';

  const users = UserStore.load();
  const full = ensureUserDefaults(currentUser, users[currentUser]);
  const activeGroup = full.activeGroup || null;
  const groups = full.groups || [];

  const rows = [];

  // Fila "modo solo"
  rows.push(
    '<div class="poker-table-row mygroups-row" data-code="">' +
      '<div class="poker-table-row-main">' +
        '<div class="poker-table-row-name">🏠 Modo solo (sin grupo)</div>' +
        '<div class="poker-table-row-meta">Tu cuenta principal</div>' +
      '</div>' +
      (activeGroup === null ? '<div class="poker-table-row-players">▶ Activo</div>' : '') +
    '</div>'
  );

  if (groups.length === 0) {
    listEl.innerHTML = rows.join('') +
      '<div class="inventory-empty">Aún no perteneces a ningún grupo</div>';
  } else {
    if (!firebaseReady || !db) {
      groups.forEach(function (code) {
        const cachedName = (full.groupNames && full.groupNames[code]) || code;
        rows.push(
          '<div class="poker-table-row mygroups-row" data-code="' + code + '">' +
            '<div class="poker-table-row-main">' +
              '<div class="poker-table-row-name">👥 ' + cachedName + '</div>' +
              '<div class="poker-table-row-meta">Sin conexión</div>' +
            '</div>' +
            (activeGroup === code ? '<div class="poker-table-row-players">▶ Activo</div>' : '') +
          '</div>'
        );
      });
      listEl.innerHTML = rows.join('');
    } else {
      try {
        const docs = await Promise.all(groups.map(function (code) { return db.collection('groups').doc(code).get(); }));
        docs.forEach(function (doc, i) {
          const code = groups[i];
          const name = doc.exists ? doc.data().name : '(grupo eliminado)';
          if (doc.exists) cacheGroupName(code, name);
          const memberCount = doc.exists ? (doc.data().members || []).length : 0;
          rows.push(
            '<div class="poker-table-row mygroups-row" data-code="' + code + '">' +
              '<div class="poker-table-row-main">' +
                '<div class="poker-table-row-name">👥 ' + name + '</div>' +
                '<div class="poker-table-row-meta">Código ' + code + ' · ' + memberCount + ' miembro' + (memberCount === 1 ? '' : 's') + '</div>' +
              '</div>' +
              (activeGroup === code ? '<div class="poker-table-row-players">▶ Activo</div>' : '<button type="button" class="mygroups-leave-btn" data-code="' + code + '" style="background:#8b0000;border:none;color:#fff;border-radius:8px;padding:6px 10px;font-size:11px;cursor:pointer;flex-shrink:0;">Salir</button>') +
            '</div>'
          );
        });
        listEl.innerHTML = rows.join('');
      } catch (e) {
        console.warn('Error cargando grupos:', e);
        listEl.innerHTML = rows.join('') + '<div class="inventory-empty">Error al cargar tus grupos</div>';
      }
    }
  }

  listEl.querySelectorAll('.mygroups-row').forEach(function (row) {
    row.addEventListener('click', async function (e) {
      if (e.target.classList.contains('mygroups-leave-btn')) return;
      const code = row.getAttribute('data-code');
      await setActiveGroup(code || null);
      groupMsg(code ? '✅ Jugando ahora en este grupo' : '✅ Has vuelto a tu modo solo', true, 'mygroups-msg');
      renderMyGroupsList();
    });
  });

  listEl.querySelectorAll('.mygroups-leave-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      leaveGroupByCode(btn.getAttribute('data-code'), 'mygroups-msg');
    });
  });
}

// ── Panel de ranking de grupo, dentro de la pantalla de Ranking ───────
// Muestra el ranking del grupo ACTUALMENTE ACTIVO (con el que se está jugando).
async function renderGroupPanel() {
  const users = UserStore.load();
  const full = ensureUserDefaults(currentUser, users[currentUser]);
  const noGroupEl = document.getElementById('group-no-group');
  const hasGroupEl = document.getElementById('group-has-group');
  if (!noGroupEl || !hasGroupEl) return;

  if (!full.activeGroup) {
    noGroupEl.classList.remove('hidden');
    hasGroupEl.classList.add('hidden');
    return;
  }

  noGroupEl.classList.add('hidden');
  hasGroupEl.classList.remove('hidden');

  const listEl = document.getElementById('group-ranking-list');
  listEl.innerHTML = '<div class="inventory-empty">Cargando...</div>';

  if (!firebaseReady || !db) {
    document.getElementById('group-name').textContent = '👥 ' + (groupDisplayName(full.activeGroup) || 'Grupo');
    document.getElementById('group-code-display').textContent = full.activeGroup;
    listEl.innerHTML = '<div class="inventory-empty">Sin conexión</div>';
    return;
  }

  try {
    const groupDoc = await db.collection('groups').doc(full.activeGroup).get();
    if (!groupDoc.exists) {
      await removeGroupMembership(full.activeGroup);
      renderGroupPanel();
      return;
    }
    const group = groupDoc.data();
    cacheGroupName(group.code, group.name);
    document.getElementById('group-name').textContent = '👥 ' + group.name;
    document.getElementById('group-code-display').textContent = group.code;

    const members = group.members || [];
    const rows = [];
    for (const m of members) {
      const doc = await db.collection('users').doc(m).get();
      let value = 0, inventory = {};
      if (doc.exists) {
        const d = doc.data();
        const profile = d.profiles && d.profiles[full.activeGroup];
        if (profile) { value = profile.value || computeCollectionValue(profile.inventory || {}); inventory = profile.inventory || {}; }
      }
      rows.push({ username: m, value: value, inventory: inventory });
    }
    rows.sort(function (a, b) { return b.value - a.value; });

    if (rows.length === 0) {
      listEl.innerHTML = '<div class="inventory-empty">Nadie en este grupo todavía</div>';
    } else {
      listEl.innerHTML = '';
      rows.forEach(function (r, idx) {
        const row = document.createElement('div');
        row.className = 'ranking-row';
        row.innerHTML =
          '<div class="ranking-rank">#' + (idx + 1) + '</div>' +
          '<div class="ranking-avatar">' + initial(r.username) + '</div>' +
          '<div class="ranking-name">' + r.username + '</div>' +
          '<div class="ranking-value">' + r.value + ' pts</div>';
        row.addEventListener('click', function () { showVisitorProfile(r.username, r.inventory); });
        listEl.appendChild(row);
      });
    }
  } catch (e) {
    console.warn('Error cargando el grupo:', e);
    listEl.innerHTML = '<div class="inventory-empty">Error al cargar el grupo</div>';
  }
}

// ── Insignia con el NOMBRE (nunca el código) del perfil activo ────────
function updateActiveProfileBadge() {
  const badge = document.getElementById('active-profile-badge');
  if (!badge) return;
  const users = UserStore.load();
  const full = ensureUserDefaults(currentUser, users[currentUser]);

  if (!full.activeGroup) {
    badge.textContent = '🏠 Solo';
    return;
  }

  const cached = groupDisplayName(full.activeGroup);
  if (cached) {
    badge.textContent = '👥 ' + cached;
    return;
  }

  // Todavía no tenemos el nombre en caché (p.ej. primera vez en otro
  // dispositivo): mostramos algo neutro y lo buscamos en segundo plano.
  badge.textContent = '👥 Grupo';
  if (firebaseReady && db) {
    db.collection('groups').doc(full.activeGroup).get().then(function (doc) {
      if (doc.exists) {
        cacheGroupName(full.activeGroup, doc.data().name);
        badge.textContent = '👥 ' + doc.data().name;
      }
    }).catch(function () {});
  }
}

// ── Eventos ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  // Toggle Global / Grupo dentro del ranking
  const globalBtn = document.getElementById('ranking-toggle-global');
  const groupBtn = document.getElementById('ranking-toggle-group');
  const globalView = document.getElementById('ranking-global-view');
  const groupView = document.getElementById('ranking-group-view');

  if (globalBtn && groupBtn && globalView && groupView) {
    globalBtn.addEventListener('click', function () {
      globalBtn.classList.add('selected');
      groupBtn.classList.remove('selected');
      globalView.classList.remove('hidden');
      groupView.classList.add('hidden');
    });
    groupBtn.addEventListener('click', function () {
      groupBtn.classList.add('selected');
      globalBtn.classList.remove('selected');
      groupView.classList.remove('hidden');
      globalView.classList.add('hidden');
      groupMsg('', true);
      renderGroupPanel();
    });
  }

  const createBtn = document.getElementById('group-create-btn');
  if (createBtn) createBtn.addEventListener('click', function () { createGroup('group-msg'); });
  const joinBtn = document.getElementById('group-join-btn');
  if (joinBtn) joinBtn.addEventListener('click', function () { joinGroup('group-join-input', 'group-msg'); });
  const leaveBtn = document.getElementById('group-leave-btn');
  if (leaveBtn) leaveBtn.addEventListener('click', function () {
    const users = UserStore.load();
    const full = ensureUserDefaults(currentUser, users[currentUser]);
    if (full.activeGroup) leaveGroupByCode(full.activeGroup, 'group-msg');
  });

  const codeDisplay = document.getElementById('group-code-display');
  if (codeDisplay) {
    codeDisplay.style.cursor = 'pointer';
    codeDisplay.title = 'Toca para copiar';
    codeDisplay.addEventListener('click', function () {
      const code = codeDisplay.textContent.trim();
      if (!code) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function () {
          groupMsg('📋 Código copiado', true);
        }).catch(function () {});
      }
    });
  }

  // Pantalla "Mis grupos"
  const myGroupsCreateBtn = document.getElementById('mygroups-create-btn');
  if (myGroupsCreateBtn) myGroupsCreateBtn.addEventListener('click', function () { createGroup('mygroups-msg'); });
  const myGroupsJoinBtn = document.getElementById('mygroups-join-btn');
  if (myGroupsJoinBtn) myGroupsJoinBtn.addEventListener('click', function () { joinGroup('mygroups-join-input', 'mygroups-msg'); });
  const myGroupsBack = document.getElementById('mygroups-back');
  if (myGroupsBack) myGroupsBack.addEventListener('click', function () {
    hideAll();
    appScreen.classList.remove('hidden');
  });
});
