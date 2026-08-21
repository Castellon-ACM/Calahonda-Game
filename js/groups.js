// =====================================================================
//  GRUPOS / MINI LIGAS — crear grupo, unirse con código, ranking de grupo
//  Reutiliza los datos ya descargados del ranking global (fetchGlobalLeaderboard)
//  y simplemente los filtra por los miembros del grupo, para no duplicar
//  consultas a Firestore.
// =====================================================================

// Genera un código de 6 caracteres sin letras/números ambiguos (0/O, 1/I)
function generateGroupCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function groupShowMsg(text, ok) {
  const el = document.getElementById('group-msg');
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? '#8fd17c' : '#ff8f8f';
}

async function setMyGroupCode(code) {
  const users = UserStore.load();
  if (!users[currentUser]) return;
  users[currentUser].groupCode = code;
  UserStore.save(users);
  await pushUserData(currentUser, users[currentUser]);
}

async function createGroup() {
  if (!firebaseReady || !db) { groupShowMsg('Sin conexión, inténtalo más tarde', false); return; }

  const existing = getCurrentUserData().groupCode;
  if (existing) { groupShowMsg('Ya perteneces a un grupo. Sal de él primero.', false); return; }

  const name = (window.prompt('Nombre del grupo:', 'Grupo de ' + currentUser) || '').trim();
  if (!name) return;

  let code = null;
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = generateGroupCode();
      const doc = await db.collection('groups').doc(candidate).get();
      if (!doc.exists) { code = candidate; break; }
    }
    if (!code) { groupShowMsg('No se pudo generar un código, inténtalo de nuevo', false); return; }

    await db.collection('groups').doc(code).set({
      code: code,
      name: name,
      ownerUsername: currentUser,
      members: [currentUser],
      createdAt: Date.now()
    });
    await setMyGroupCode(code);
    groupShowMsg('✅ Grupo creado. ¡Comparte el código ' + code + ' con tus amigos!', true);
    renderGroupPanel();
  } catch (e) {
    console.warn('Error creando grupo:', e);
    groupShowMsg('No se pudo crear el grupo, inténtalo de nuevo', false);
  }
}

async function joinGroup() {
  const input = document.getElementById('group-join-input');
  const code = (input.value || '').trim().toUpperCase();
  if (!code) { groupShowMsg('Introduce un código', false); return; }
  if (!firebaseReady || !db) { groupShowMsg('Sin conexión, inténtalo más tarde', false); return; }

  const existing = getCurrentUserData().groupCode;
  if (existing) { groupShowMsg('Ya perteneces a un grupo. Sal de él primero.', false); return; }

  try {
    const ref = db.collection('groups').doc(code);
    const doc = await ref.get();
    if (!doc.exists) { groupShowMsg('Ese código no existe', false); return; }

    await ref.set({ members: firebase.firestore.FieldValue.arrayUnion(currentUser) }, { merge: true });
    await setMyGroupCode(code);
    groupShowMsg('✅ Te has unido a "' + doc.data().name + '"', true);
    input.value = '';
    renderGroupPanel();
  } catch (e) {
    console.warn('Error uniéndose al grupo:', e);
    groupShowMsg('No se pudo unir al grupo, inténtalo de nuevo', false);
  }
}

async function leaveGroup() {
  const data = getCurrentUserData();
  const code = data.groupCode;
  if (!code) return;
  if (!window.confirm('¿Salir del grupo?')) return;

  try {
    if (firebaseReady && db) {
      await db.collection('groups').doc(code).set({
        members: firebase.firestore.FieldValue.arrayRemove(currentUser)
      }, { merge: true });
    }
  } catch (e) {
    console.warn('Error saliendo del grupo:', e);
  }
  await setMyGroupCode(null);
  renderGroupPanel();
}

async function renderGroupPanel() {
  const data = getCurrentUserData();
  const noGroupEl = document.getElementById('group-no-group');
  const hasGroupEl = document.getElementById('group-has-group');
  if (!noGroupEl || !hasGroupEl) return;

  if (!data.groupCode) {
    noGroupEl.classList.remove('hidden');
    hasGroupEl.classList.add('hidden');
    return;
  }

  noGroupEl.classList.add('hidden');
  hasGroupEl.classList.remove('hidden');

  const listEl = document.getElementById('group-ranking-list');
  listEl.innerHTML = '<div class="inventory-empty">Cargando...</div>';

  if (!firebaseReady || !db) {
    document.getElementById('group-name').textContent = '👥 Grupo';
    document.getElementById('group-code-display').textContent = data.groupCode;
    listEl.innerHTML = '<div class="inventory-empty">Sin conexión</div>';
    return;
  }

  try {
    const groupDoc = await db.collection('groups').doc(data.groupCode).get();
    if (!groupDoc.exists) {
      // El grupo ya no existe (se pudo haber borrado); limpiamos la referencia
      await setMyGroupCode(null);
      renderGroupPanel();
      return;
    }
    const group = groupDoc.data();
    document.getElementById('group-name').textContent = '👥 ' + group.name;
    document.getElementById('group-code-display').textContent = group.code;

    const members = group.members || [];
    const globalRows = await fetchGlobalLeaderboard();
    let rows;
    if (globalRows) {
      rows = globalRows.filter(function (r) { return members.indexOf(r.username) !== -1; });
      const known = rows.map(function (r) { return r.username; });
      members.forEach(function (m) {
        if (known.indexOf(m) === -1) rows.push({ username: m, value: 0, inventory: {} });
      });
    } else {
      rows = members.map(function (m) { return { username: m, value: 0, inventory: {} }; });
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

// ── Toggle Global / Grupo dentro de la pantalla de ranking, y botones ──
document.addEventListener('DOMContentLoaded', function () {
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
      groupShowMsg('', true);
      renderGroupPanel();
    });
  }

  const createBtn = document.getElementById('group-create-btn');
  if (createBtn) createBtn.addEventListener('click', createGroup);
  const joinBtn = document.getElementById('group-join-btn');
  if (joinBtn) joinBtn.addEventListener('click', joinGroup);
  const leaveBtn = document.getElementById('group-leave-btn');
  if (leaveBtn) leaveBtn.addEventListener('click', leaveGroup);

  const codeDisplay = document.getElementById('group-code-display');
  if (codeDisplay) {
    codeDisplay.style.cursor = 'pointer';
    codeDisplay.title = 'Toca para copiar';
    codeDisplay.addEventListener('click', function () {
      const code = codeDisplay.textContent.trim();
      if (!code) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function () {
          groupShowMsg('📋 Código copiado', true);
        }).catch(function () {});
      }
    });
  }
});
