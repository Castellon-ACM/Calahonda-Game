// =====================================================================
//  APOYO: pestaña de donaciones + aviso al admin + regalo especial
//  Se integra con el panel de admin ya existente (admin.js) sin tocarlo.
// =====================================================================
const BIZUM_NUMBER = '682255281';

// --- Pestaña de Apoyo (usuario) ---
function renderSupportTab() {
  const content = document.getElementById('support-content');
  if (!content) return;
  content.innerHTML =
    '<div class="event-title">☕ Apoya el proyecto</div>' +
    '<div class="event-subtitle">Si quieres echar una mano con el desarrollo de Alcohol 365, puedes hacer una donación libre y voluntaria por Bizum, a este número:</div>' +
    '<div style="text-align:center;font-size:22px;font-weight:800;color:#f4d98a;margin:14px 0;letter-spacing:1px;">' + BIZUM_NUMBER + '</div>' +
    '<div class="event-subtitle">No da monedas de forma automática — es solo para apoyar, y como agradecimiento te doy un detalle especial en el juego.</div>' +
    '<div class="event-subtitle" style="margin-top:20px;">Cuando hayas donado, avísame aquí para que sepa a quién darle las gracias (y cuánto, para agradecértelo como toca):</div>' +
    '<input type="number" id="support-claim-amount" min="0" step="0.5" placeholder="¿Cuánto has donado? (€, opcional)" class="bet-amount-input" style="margin-top:10px;">' +
    '<button type="button" class="btn" id="support-claim-btn">✅ Ya he donado, avisar</button>' +
    '<div id="support-claim-msg" style="margin-top:10px;text-align:center;font-size:13px;min-height:18px;"></div>';

  const btn = document.getElementById('support-claim-btn');
  btn.addEventListener('click', submitDonationClaim);
}

async function submitDonationClaim() {
  const msgEl = document.getElementById('support-claim-msg');
  const btn = document.getElementById('support-claim-btn');
  const amountInput = document.getElementById('support-claim-amount');
  const amount = amountInput ? parseFloat(amountInput.value) : NaN;
  if (!firebaseReady || !db || !currentUser) {
    msgEl.textContent = 'No se pudo enviar el aviso ahora mismo';
    msgEl.style.color = '#ff8f8f';
    return;
  }
  btn.disabled = true;
  try {
    await db.collection('donationClaims').doc(currentUser).set({
      username: currentUser,
      amount: isNaN(amount) ? null : amount,
      claimedAt: Date.now(),
      fulfilled: false
    });
    msgEl.textContent = '¡Gracias! Te daré tu regalo pronto 🎁';
    msgEl.style.color = '#8fd17c';
  } catch (e) {
    msgEl.textContent = 'No se pudo enviar el aviso, inténtalo de nuevo';
    msgEl.style.color = '#ff8f8f';
  }
  btn.disabled = false;
}

// --- Panel de admin: inyectar sección de avisos pendientes ---
(function injectAdminSupportHTML() {
  const card = document.getElementById('admin-tab-events');
  if (!card) return;
  const html = `
    <div style="background:#1a1505;border-radius:12px;padding:14px;margin:16px 0;border:1px solid #f5c51833">
      <div style="color:#f5c518;font-weight:700;margin-bottom:8px">☕ Avisos de donación pendientes</div>
      <div id="support-admin-list" style="font-size:13px;color:#ccc">Cargando...</div>
    </div>
  `;
  card.insertAdjacentHTML('beforeend', html);
})();

async function renderSupportAdminList() {
  const listEl = document.getElementById('support-admin-list');
  if (!listEl) return;
  if (!firebaseReady || !db) {
    listEl.innerHTML = '<div style="color:#aaa">Firebase no disponible</div>';
    return;
  }
  listEl.innerHTML = 'Cargando...';
  try {
    const snap = await db.collection('donationClaims').where('fulfilled', '==', false).get();
    if (snap.empty) {
      listEl.innerHTML = '<div style="color:#aaa">No hay avisos pendientes</div>';
      return;
    }
    listEl.innerHTML = '';
    snap.docs.forEach(function (doc) {
      const d = doc.data();
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #222;gap:8px';
      const amountLabel = (d.amount !== undefined && d.amount !== null) ? (d.amount + '€') : '¿?';
      row.innerHTML =
        '<div style="color:#fff;flex:1;word-break:break-word">' + d.username + ' <span style="color:#f5c518;font-weight:700">· ' + amountLabel + '</span></div>' +
        '<button type="button" class="btn" style="width:auto;padding:8px 12px;font-size:12px;margin:0;white-space:nowrap">💛 Dar regalo</button>';
      row.querySelector('button').addEventListener('click', async function () {
        await grantDonorGift(d.username);
        renderSupportAdminList();
      });
      listEl.appendChild(row);
    });
  } catch (e) {
    listEl.innerHTML = '<div style="color:#f44336">Error al cargar los avisos</div>';
  }
}

async function grantDonorGift(username) {
  if (!firebaseReady || !db || !username) return;
  try {
    await db.collection('users').doc(username).set({
      ownedSkins: { supporter: true }
    }, { merge: true });
    await db.collection('donationClaims').doc(username).set({ fulfilled: true }, { merge: true });
  } catch (e) {
    console.warn('No se pudo dar el regalo de mecenas:', e);
  }
}

// Refrescar la lista de avisos cada vez que se abre el panel de admin
if (typeof adminLoadPanel === 'function') {
  const _origAdminLoadPanelSupport = adminLoadPanel;
  adminLoadPanel = async function () {
    await _origAdminLoadPanelSupport();
    renderSupportAdminList();
  };
}
