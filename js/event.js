// =====================================================================
//  EVENTO ESPECIAL: 3 cartas (as + 2 jokers)
//  Se integra con el panel de admin ya existente (admin.js) sin tocarlo.
// =====================================================================
const EVENT_REWARD = 500;
const EVENT_DURATION_MS = 24 * 60 * 60 * 1000; // 1 día

// ── Inyectar la sección de evento dentro del panel de admin ──────────
(function injectAdminEventHTML() {
  const card = document.querySelector('#admin-screen .card');
  if (!card) return;
  const html = `
    <div style="background:#1a1505;border-radius:12px;padding:14px;margin:16px 0;border:1px solid #f5c51833">
      <div style="color:#f5c518;font-weight:700;margin-bottom:8px">🃏 Evento: 3 cartas (as + 2 jokers)</div>
      <div id="event-admin-status" style="color:#ccc;font-size:13px;margin-bottom:10px">Cargando estado...</div>
      <div class="field" style="margin-bottom:10px">
        <label style="display:block;margin-bottom:4px">Objetivo</label>
        <select id="event-admin-target" style="width:100%;box-sizing:border-box;background:#0d0a05;border:1px solid #333;color:#fff;border-radius:8px;padding:10px;font-size:14px">
          <option value="all">Todos los jugadores</option>
          <option value="specific">Un jugador en concreto</option>
        </select>
      </div>
      <div id="event-admin-username-field" style="display:none;margin-bottom:10px">
        <input type="text" id="event-admin-username" placeholder="nombre de usuario exacto" style="width:100%;box-sizing:border-box;background:#0d0a05;border:1px solid #333;color:#fff;border-radius:8px;padding:10px;font-size:14px">
      </div>
      <button type="button" class="btn" id="event-admin-activate-btn" style="width:100%;box-sizing:border-box;padding:11px;font-size:14px;margin-bottom:6px;white-space:nowrap;overflow:hidden;min-width:0">🃏 Activar evento (dura 1 día)</button>
      <button type="button" class="btn logout-btn" id="event-admin-deactivate-btn" style="width:100%;box-sizing:border-box;padding:11px;font-size:14px;white-space:nowrap;overflow:hidden;min-width:0">Desactivar evento</button>
      <div id="event-admin-msg" style="margin-top:8px;font-size:13px;text-align:center"></div>
    </div>
  `;
  card.insertAdjacentHTML('beforeend', html);
})();

// ── Acceso a Firestore ────────────────────────────────────────────────
async function getEventDoc() {
  if (!firebaseReady || !db) return null;
  try {
    const snap = await db.collection('events').doc('current').get();
    return snap.exists ? snap.data() : null;
  } catch (e) {
    console.warn('No se pudo leer el evento:', e);
    return null;
  }
}

async function activateEvent(target, username) {
  if (!firebaseReady || !db) return false;
  const now = Date.now();
  const payload = {
    active: true,
    target: target === 'specific' ? username : 'all',
    startedAt: now,
    expiresAt: now + EVENT_DURATION_MS,
    reward: EVENT_REWARD,
    playedUsers: {}
  };
  try {
    await db.collection('events').doc('current').set(payload);
    return true;
  } catch (e) {
    console.warn('No se pudo activar el evento:', e);
    return false;
  }
}

async function deactivateEvent() {
  if (!firebaseReady || !db) return false;
  try {
    await db.collection('events').doc('current').set({ active: false }, { merge: true });
    return true;
  } catch (e) {
    console.warn('No se pudo desactivar el evento:', e);
    return false;
  }
}

async function markEventPlayed(username) {
  if (!firebaseReady || !db || !username) return;
  try {
    const update = {};
    update['playedUsers.' + username] = true;
    await db.collection('events').doc('current').update(update);
  } catch (e) {
    console.warn('No se pudo registrar la partida del evento:', e);
  }
}

function eventAppliesToUser(event, username) {
  if (!event || !event.active) return false;
  if (!event.expiresAt || Date.now() >= event.expiresAt) return false;
  return event.target === 'all' || event.target === username;
}

// --- Comprobación al entrar: muestra u oculta la pestaña Evento ---
async function checkEventTabVisibility() {
  const btn = document.getElementById('tabbtn-event');
  if (!btn) return;
  const event = await getEventDoc();
  const applies = eventAppliesToUser(event, currentUser);
  btn.classList.toggle('hidden', !applies);
}

// --- Pestaña de evento (usuario) ---
async function renderEventTab() {
  const content = document.getElementById('event-content');
  if (!content) return;
  content.innerHTML = '<div class="inventory-empty">Cargando evento...</div>';

  const event = await getEventDoc();
  if (!eventAppliesToUser(event, currentUser)) {
    content.innerHTML = '<div class="inventory-empty">No hay ningún evento activo ahora mismo</div>';
    return;
  }

  const already = event.playedUsers && event.playedUsers[currentUser];
  if (already) {
    content.innerHTML =
      '<div class="event-title">🃏 Encuentra el as</div>' +
      '<div class="inventory-empty">Ya has jugado este evento. ¡Vuelve para el próximo!</div>';
    return;
  }

  const msLeft = event.expiresAt - Date.now();
  const hoursLeft = Math.max(1, Math.round(msLeft / (60 * 60 * 1000)));

  content.innerHTML =
    '<div class="event-title">🃏 Encuentra el as</div>' +
    '<div class="event-subtitle">Un as y dos jokers se mueven muy rápido. Elige una carta — si aciertas, ' + EVENT_REWARD + ' monedas.</div>' +
    '<div class="event-card-row" id="event-card-row"></div>' +
    '<div class="event-result" id="event-result"></div>' +
    '<div class="event-timer">Termina en aproximadamente ' + hoursLeft + ' h</div>';

  startCardGame();
}

function startCardGame() {
  const row = document.getElementById('event-card-row');
  row.innerHTML = '';

  const cards = [0, 1, 2].map(function () {
    const el = document.createElement('div');
    el.className = 'event-card disabled';
    el.textContent = '🂠';
    row.appendChild(el);
    return el;
  });

  const winningIndex = Math.floor(Math.random() * 3);
  let shuffles = 0;
  const maxShuffles = 16;

  const shuffleTimer = setInterval(function () {
    cards.forEach(function (c) {
      const dx = (Math.random() * 34 - 17).toFixed(1);
      const dy = (Math.random() * 10 - 5).toFixed(1);
      c.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    });
    shuffles++;
    if (shuffles >= maxShuffles) {
      clearInterval(shuffleTimer);
      cards.forEach(function (c) { c.style.transform = 'translate(0px,0px)'; });
      cards.forEach(function (c, i) {
        c.classList.remove('disabled');
        c.addEventListener('click', function onPick() {
          cards.forEach(function (cc) { cc.removeEventListener('click', onPick); cc.classList.add('disabled'); });
          revealCards(cards, winningIndex, i);
        });
      });
    }
  }, 90);
}

function revealCards(cards, winningIndex, pickedIndex) {
  cards.forEach(function (c, i) {
    if (i === winningIndex) {
      c.textContent = '🂡';
      c.classList.add('win');
    } else {
      c.textContent = '🃏';
      c.classList.add('lose');
    }
  });

  const resultEl = document.getElementById('event-result');
  const won = pickedIndex === winningIndex;

  if (won) {
    const data = getCurrentUserData();
    data.coins += EVENT_REWARD;
    saveAndSync(data);
    updateAllBalances(data.coins);
    resultEl.textContent = '¡Era el as! +' + EVENT_REWARD + ' monedas';
    resultEl.style.color = '#8fd17c';
  } else {
    resultEl.textContent = 'Era un joker. ¡Suerte la próxima vez!';
    resultEl.style.color = '#ff8f8f';
  }

  markEventPlayed(currentUser);
}

// ── Panel de admin: estado + activar/desactivar (inyectado arriba) ───
async function renderEventAdminStatus() {
  const statusEl = document.getElementById('event-admin-status');
  if (!statusEl) return;
  statusEl.textContent = 'Cargando estado...';
  const event = await getEventDoc();
  if (!event || !event.active || !event.expiresAt || Date.now() >= event.expiresAt) {
    statusEl.innerHTML = 'No hay ningún evento activo';
    return;
  }
  const hoursLeft = Math.max(0, Math.round((event.expiresAt - Date.now()) / (60 * 60 * 1000)));
  const targetLabel = event.target === 'all' ? 'Todos los jugadores' : ('Solo: ' + event.target);
  const playedCount = event.playedUsers ? Object.keys(event.playedUsers).length : 0;
  statusEl.innerHTML =
    '🎯 Objetivo: <b>' + targetLabel + '</b><br>' +
    '⏳ Termina en: <b>' + hoursLeft + ' h</b><br>' +
    '✅ Han jugado: <b>' + playedCount + '</b>';
}

document.addEventListener('DOMContentLoaded', function () {
  const targetSelect = document.getElementById('event-admin-target');
  if (targetSelect) {
    targetSelect.addEventListener('change', function () {
      document.getElementById('event-admin-username-field').style.display = this.value === 'specific' ? 'block' : 'none';
    });
  }

  const activateBtn = document.getElementById('event-admin-activate-btn');
  if (activateBtn) {
    activateBtn.addEventListener('click', async function () {
      const target = document.getElementById('event-admin-target').value;
      const username = document.getElementById('event-admin-username').value.trim();
      const msgEl = document.getElementById('event-admin-msg');

      if (target === 'specific' && !username) {
        msgEl.textContent = 'Escribe el nombre de usuario exacto';
        msgEl.style.color = '#f44336';
        return;
      }

      const ok = await activateEvent(target, username);
      msgEl.textContent = ok ? '✅ Evento activado' : '❌ No se pudo activar (revisa Firebase)';
      msgEl.style.color = ok ? '#4caf50' : '#f44336';
      renderEventAdminStatus();
    });
  }

  const deactivateBtn = document.getElementById('event-admin-deactivate-btn');
  if (deactivateBtn) {
    deactivateBtn.addEventListener('click', async function () {
      await deactivateEvent();
      const msgEl = document.getElementById('event-admin-msg');
      msgEl.textContent = 'Evento desactivado';
      msgEl.style.color = '#4caf50';
      renderEventAdminStatus();
    });
  }
});

// Cuando se abre el panel de admin (login admin), refrescar también el estado del evento.
// Se engancha a la función adminLoadPanel ya existente en admin.js sin modificarlo.
if (typeof adminLoadPanel === 'function') {
  const _origAdminLoadPanel = adminLoadPanel;
  adminLoadPanel = async function () {
    await _origAdminLoadPanel();
    renderEventAdminStatus();
  };
}
