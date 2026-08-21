// =====================================================================
//  SUBASTA — Alcohol 96% (rareza Mítica, única en el juego)
//  - Cierra el domingo 24 ago 2026 a las 00:00 hora local
//  - Solo se muestra la puja del jugador actual, nunca la de los demás
//  - No se puede pujar más de lo que se tiene
//  - La puja se puede modificar (subir) en cualquier momento antes del cierre
//  - No se puede robar esta botella
//  - Al cerrar se busca al pujador solvente con mayor puja
// =====================================================================

const AUCTION_BOTTLE  = 'Alcohol 96%';
const AUCTION_RARITY  = 'mythic';
const AUCTION_END     = new Date('2026-08-24T00:00:00').getTime(); // domingo 00:00 local
const AUCTION_DOC     = 'auction_alcohol96_aug2026';

function auctionBottleSVG(size) {
  size = size || 60;
  return '<svg viewBox="0 0 60 100" width="' + size + '" height="' + (size * 100 / 60) + '">' +
    '<defs>' +
      '<linearGradient id="ag1" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="#00d4ff"/>' +
        '<stop offset="100%" stop-color="#0040ff"/>' +
      '</linearGradient>' +
      '<linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>' +
        '<stop offset="100%" stop-color="#00d4ff" stop-opacity="0.1"/>' +
      '</linearGradient>' +
    '</defs>' +
    '<rect x="24" y="2" width="12" height="10" rx="2" fill="#00b4ff"/>' +
    '<rect x="26" y="12" width="8" height="14" fill="#a0e4ff"/>' +
    '<path d="M18,26 C18,24 22,22 30,22 C38,22 42,24 42,26 L46,88 C46,94 39,98 30,98 C21,98 14,94 14,88 Z" fill="url(#ag1)"/>' +
    '<path d="M18,26 C18,24 22,22 30,22 C38,22 42,24 42,26 L46,88 C46,94 39,98 30,98 C21,98 14,94 14,88 Z" fill="url(#ag2)"/>' +
    '<rect x="17" y="52" width="26" height="20" fill="#ffffff" opacity="0.15" rx="2"/>' +
    '<text x="30" y="65" text-anchor="middle" font-size="7" fill="#fff" font-weight="800" font-family="sans-serif">96%</text>' +
    '</svg>';
}

function auctionTimeLeft() {
  const diff = AUCTION_END - Date.now();
  if (diff <= 0) return null;
  const totalSec = Math.floor(diff / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return d + 'd ' + pad(h) + 'h ' + pad(m) + 'm';
  if (h > 0) return pad(h) + 'h ' + pad(m) + 'm ' + pad(s) + 's';
  return pad(m) + 'm ' + pad(s) + 's';
}
function pad(n) { return String(n).padStart(2, '0'); }

// ── Render principal ──────────────────────────────────────────────────
let _auctionTimer = null;

async function renderAuctionScreen() {
  const content = document.getElementById('auction-content');
  if (!content) return;

  const closed = Date.now() >= AUCTION_END;
  let bids = {};
  let myBid = 0;
  let winner = null;
  let topBid = 0;

  if (firebaseReady && db) {
    try {
      const doc = await db.collection('auctions').doc(AUCTION_DOC).get();
      if (doc.exists) {
        bids   = doc.data().bids   || {};
        winner = doc.data().winner || null;
        topBid = doc.data().topBid || 0;
        myBid  = bids[currentUser] || 0;
      }
    } catch (e) { console.warn('[Auction] No se pudo leer:', e); }
  }

  if (closed && !_auctionDelivered) {
    _resolveAndDeliver(bids);
  }

  const timeLeft = auctionTimeLeft();
  const myCoins  = getCurrentUserData().coins;

  content.innerHTML =
    '<div style="text-align:center;margin-bottom:16px">' +
      '<div style="font-size:11px;letter-spacing:2px;color:#00b4ff;font-weight:800;text-transform:uppercase;margin-bottom:8px">✨ Subasta exclusiva</div>' +
      auctionBottleSVG(72) +
      '<div style="color:#fff;font-size:20px;font-weight:800;margin-top:10px">' + AUCTION_BOTTLE + '</div>' +
      '<div style="display:inline-block;background:linear-gradient(135deg,#00d4ff,#0040ff);color:#fff;font-size:10px;font-weight:800;border-radius:6px;padding:2px 10px;letter-spacing:1px;margin-top:4px">✨ MÍTICA</div>' +
      '<div style="color:#b8a679;font-size:12px;margin-top:8px;line-height:1.5">La botella más pura del juego.<br>Solo existirá <b style="color:#fff">1 copia</b> en toda la app.<br>No se puede robar.</div>' +
    '</div>' +

    // Countdown o cerrada
    (closed
      ? '<div style="text-align:center;background:#1a1505;border-radius:12px;padding:14px;margin-bottom:16px;border:1px solid #3a2c14">' +
          '<div style="color:#ff8f8f;font-size:13px;font-weight:700">🔒 Subasta cerrada</div>' +
          (winner ? '<div style="color:#b8a679;font-size:12px;margin-top:4px">Ganador: <b style="color:#f4d98a">' + winner + '</b></div>' : '<div style="color:#6b5f45;font-size:12px;margin-top:4px">Calculando ganador...</div>') +
        '</div>'
      : '<div style="text-align:center;background:linear-gradient(135deg,#0a1a2a,#0a2a3a);border-radius:12px;padding:14px;margin-bottom:16px;border:1px solid #00b4ff44">' +
          '<div style="color:#00b4ff;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:4px">⏳ CIERRA EN</div>' +
          '<div id="auction-countdown" style="color:#fff;font-size:26px;font-weight:800;font-variant-numeric:tabular-nums">' + (timeLeft || '—') + '</div>' +
          '<div style="color:#b8a679;font-size:11px;margin-top:4px">Domingo 24 ago · 00:00h</div>' +
        '</div>') +

    // Tu puja + tus monedas actuales
    '<div style="background:#1a1505;border-radius:12px;padding:14px;margin-bottom:14px;border:1px solid #3a2c14">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
        '<div>' +
          '<div style="color:#b8a679;font-size:12px;margin-bottom:4px">Tu puja</div>' +
          '<div style="color:#f4d98a;font-size:22px;font-weight:800">' + (myBid > 0 ? myBid + ' 🪙' : '—') + '</div>' +
          (myBid > 0 ? '<div style="color:#8fd17c;font-size:11px;margin-top:2px">✓ Registrada</div>' : '') +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="color:#b8a679;font-size:12px;margin-bottom:4px">Tus monedas</div>' +
          '<div style="color:#fff;font-size:18px;font-weight:800">' + myCoins + ' 🪙</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Formulario — visible siempre que la subasta esté abierta
    // Permite subir o bajar la puja (solo limitado a que tengas las monedas)
    (!closed
      ? '<div style="background:#161116;border-radius:12px;padding:14px;border:1px solid #3a2c14;margin-bottom:6px">' +
          '<div style="color:#b8a679;font-size:12px;margin-bottom:4px">' +
            (myBid > 0 ? 'Modifica tu puja (actual: ' + myBid + ' 🪙)' : 'Introduce tu puja') +
          '</div>' +
          '<div style="color:#6b5f45;font-size:11px;margin-bottom:8px">Puedes cambiarla hasta el último segundo. No puedes pujar más de lo que tienes.</div>' +
          '<input type="number" id="auction-bid-input" min="1" max="' + myCoins + '" placeholder="Cantidad de monedas" class="bet-amount-input" style="margin-bottom:8px"' + (myBid > 0 ? ' value="' + myBid + '"' : '') + '>' +
          '<button type="button" class="btn" id="auction-bid-btn" style="background:linear-gradient(135deg,#00d4ff,#0040ff);color:#fff">⚡ ' + (myBid > 0 ? 'Actualizar puja' : 'Pujar') + '</button>' +
          '<div id="auction-bid-msg" style="margin-top:8px;font-size:13px;text-align:center;min-height:16px"></div>' +
        '</div>'
      : '') +

    // Reglas
    '<div style="color:#6b5f45;font-size:11px;line-height:1.7;margin-top:14px;text-align:center">' +
      '• Solo ves tu propia puja, no la del resto<br>' +
      '• Puedes modificar tu puja en cualquier momento<br>' +
      '• No puedes pujar más monedas de las que tienes<br>' +
      '• Al cerrar, gana el pujador con más monedas que sí las tenga<br>' +
      '• Si el primero no tiene saldo suficiente, pasa al siguiente<br>' +
      '• Esta botella no se puede robar' +
    '</div>';

  // Evento pujar / actualizar
  if (!closed) {
    const bidBtn   = document.getElementById('auction-bid-btn');
    const bidInput = document.getElementById('auction-bid-input');
    const bidMsg   = document.getElementById('auction-bid-msg');

    bidBtn.addEventListener('click', async function () {
      const amount = parseInt(bidInput.value, 10);
      bidMsg.style.color = '#ff8f8f';

      if (isNaN(amount) || amount < 1) { bidMsg.textContent = 'Introduce una cantidad válida'; return; }

      const fresh = getCurrentUserData();
      if (amount > fresh.coins) {
        bidMsg.textContent = 'No tienes suficientes monedas (tienes ' + fresh.coins + ' 🪙)';
        return;
      }

      bidBtn.disabled = true;
      bidBtn.textContent = 'Guardando...';

      try {
        // Guardar la puja del jugador (puede ser subida o bajada — no hay restricción de mínimo
        // respecto a la puja anterior, el jugador puede modificar libremente)
        // El topBid y winner se recalculan en _resolveAndDeliver al cerrar
        await db.collection('auctions').doc(AUCTION_DOC).set(
          { bids: { [currentUser]: amount }, updatedAt: Date.now() },
          { merge: true }
        );

        bidMsg.style.color = '#8fd17c';
        bidMsg.textContent = '✓ Puja de ' + amount + ' 🪙 guardada';
        setTimeout(renderAuctionScreen, 700);
      } catch (e) {
        bidMsg.textContent = 'Error al guardar, inténtalo de nuevo';
        console.warn('[Auction] Error pujar:', e);
        bidBtn.disabled = false;
        bidBtn.textContent = '⚡ ' + (myBid > 0 ? 'Actualizar puja' : 'Pujar');
      }
    });
  }

  // Countdown en tiempo real
  if (_auctionTimer) clearInterval(_auctionTimer);
  if (!closed) {
    _auctionTimer = setInterval(function () {
      const el = document.getElementById('auction-countdown');
      if (!el) { clearInterval(_auctionTimer); return; }
      const t = auctionTimeLeft();
      if (!t) {
        clearInterval(_auctionTimer);
        el.textContent = '¡Cerrada!';
        setTimeout(renderAuctionScreen, 1200);
      } else {
        el.textContent = t;
      }
    }, 1000);
  }
}

// ── Resolver ganador solvente y entregar ──────────────────────────────
// Al cerrar la subasta, itera las pujas de mayor a menor y comprueba en
// tiempo real si el pujador tiene saldo suficiente en Firestore.
// El primero que sí tenga gana. Así si Juan pujó 4000 pero los perdió
// antes del cierre, la botella pasa a Luis con 3000, etc.
let _auctionDelivered = false;

async function _resolveAndDeliver(bids) {
  if (_auctionDelivered || !firebaseReady || !db) return;
  _auctionDelivered = true; // evitar doble ejecución en el mismo dispositivo

  try {
    // ¿Ya se entregó antes (desde otro dispositivo)?
    const deliveredDoc = await db.collection('auctions').doc(AUCTION_DOC + '_delivered').get();
    if (deliveredDoc.exists) return;

    // Ordenar pujadores de mayor a menor puja
    const sorted = Object.keys(bids)
      .map(function (u) { return { user: u, bid: bids[u] || 0 }; })
      .filter(function (e) { return e.bid > 0; })
      .sort(function (a, b) { return b.bid - a.bid; });

    if (sorted.length === 0) return; // nadie pujó

    // Buscar el primero que tenga saldo real en Firestore
    let realWinner = null;
    let winnerBid  = 0;

    for (var i = 0; i < sorted.length; i++) {
      const candidate = sorted[i];
      try {
        const userDoc = await db.collection('users').doc(candidate.user).get();
        if (!userDoc.exists) continue;
        const d   = userDoc.data();
        const key = d.activeGroup || 'solo';
        const coins = (d.profiles && d.profiles[key] && d.profiles[key].coins) || 0;
        if (coins >= candidate.bid) {
          realWinner = candidate.user;
          winnerBid  = candidate.bid;
          break;
        }
      } catch (e) { continue; }
    }

    if (!realWinner) {
      // Nadie tiene saldo suficiente — guardar resultado vacío
      await db.collection('auctions').doc(AUCTION_DOC + '_delivered').set({
        deliveredAt: Date.now(), winner: null, topBid: 0, reason: 'no_solvent_bidder'
      });
      return;
    }

    // Marcar entregada antes de tocar el inventario (idempotente)
    await db.collection('auctions').doc(AUCTION_DOC + '_delivered').set({
      deliveredAt: Date.now(), winner: realWinner, topBid: winnerBid
    });

    // Actualizar winner visible en el documento de subasta
    await db.collection('auctions').doc(AUCTION_DOC).set(
      { winner: realWinner, topBid: winnerBid },
      { merge: true }
    );

    // Añadir botella al inventario del ganador con transacción atómica
    const userRef = db.collection('users').doc(realWinner);
    await db.runTransaction(async function (tx) {
      const doc = await tx.get(userRef);
      const d   = doc.exists ? doc.data() : {};
      const key = d.activeGroup || 'solo';
      const current = (d.profiles && d.profiles[key] && d.profiles[key].inventory && d.profiles[key].inventory[AUCTION_BOTTLE]) || 0;
      const update  = { updatedAt: Date.now() };
      update['profiles.' + key + '.inventory.' + AUCTION_BOTTLE] = current + 1;
      update['profiles.' + key + '.updatedAt'] = Date.now();
      tx.set(userRef, update, { merge: true });
    });

    await queueUserNotification(
      realWinner,
      '🏆 ¡Has ganado la subasta de "' + AUCTION_BOTTLE + '" ✨! Ya está en tu colección.'
    );

  } catch (e) {
    _auctionDelivered = false; // permitir reintento si algo falló
    console.warn('[Auction] Error resolviendo ganador:', e);
  }
}

function stopAuctionTimer() {
  if (_auctionTimer) { clearInterval(_auctionTimer); _auctionTimer = null; }
}
