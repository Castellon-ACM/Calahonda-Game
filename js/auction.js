// =====================================================================
//  SUBASTA — Alcohol 96% (rareza Mítica, única en el juego)
//  - Cierra el domingo 24 ago 2026 a las 00:00 hora local
//  - Solo se muestra la puja del jugador actual, nunca la de los demás
//  - No se puede pujar más de lo que se tiene
//  - No se puede robar esta botella
//  - El ganador la recibe automáticamente al terminar el tiempo
// =====================================================================

const AUCTION_BOTTLE   = 'Alcohol 96%';
const AUCTION_RARITY   = 'mythic';
const AUCTION_END      = new Date('2026-08-24T00:00:00').getTime(); // domingo 00:00 local
const AUCTION_DOC      = 'auction_alcohol96_aug2026';
const AUCTION_MIN_BID  = 1;

// Estilo visual de la botella mítica
const AUCTION_BOTTLE_STYLE = {
  glass: '#e8f4ff', cap: '#00b4ff', label: '#00b4ff'
};

// ── SVG de la botella ─────────────────────────────────────────────────
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

// ── Tiempo restante ───────────────────────────────────────────────────
function auctionTimeLeft() {
  const diff = AUCTION_END - Date.now();
  if (diff <= 0) return null; // cerrada
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

// ── Render principal ─────────────────────────────────────────────────
let _auctionTimer = null;

async function renderAuctionScreen() {
  const screen = document.getElementById('auction-screen');
  if (!screen) return;

  const content = document.getElementById('auction-content');
  const closed  = Date.now() >= AUCTION_END;

  // Leer datos de Firestore
  let topBid = 0;
  let winner = null;
  let myBid  = 0;

  if (firebaseReady && db) {
    try {
      const doc = await db.collection('auctions').doc(AUCTION_DOC).get();
      if (doc.exists) {
        topBid = doc.data().topBid  || 0;
        winner = doc.data().winner  || null;
        // Puja personal del jugador actual (campo privado por usuario)
        const bids = doc.data().bids || {};
        myBid = bids[currentUser] || 0;
      }
    } catch (e) {
      console.warn('[Auction] No se pudo leer:', e);
    }
  }

  // Si cerró, entregar al ganador si aún no se hizo
  if (closed && winner && !_auctionDelivered) {
    _maybeDeliverAuction(winner, topBid);
  }

  const timeLeft = auctionTimeLeft();

  content.innerHTML =
    // Cabecera
    '<div style="text-align:center;margin-bottom:16px">' +
      '<div style="font-size:11px;letter-spacing:2px;color:#00b4ff;font-weight:800;text-transform:uppercase;margin-bottom:8px">✨ Subasta exclusiva</div>' +
      auctionBottleSVG(72) +
      '<div style="color:#fff;font-size:20px;font-weight:800;margin-top:10px">' + AUCTION_BOTTLE + '</div>' +
      '<div style="display:inline-block;background:linear-gradient(135deg,#00d4ff,#0040ff);color:#fff;font-size:10px;font-weight:800;border-radius:6px;padding:2px 10px;letter-spacing:1px;margin-top:4px">✨ MÍTICA</div>' +
      '<div style="color:#b8a679;font-size:12px;margin-top:8px;line-height:1.5">La botella más pura del juego.<br>Solo existirá <b style="color:#fff">1 copia</b> en toda la app.<br>No se puede robar.</div>' +
    '</div>' +

    // Contador
    (closed
      ? '<div id="auction-timer" style="text-align:center;background:#1a1505;border-radius:12px;padding:14px;margin-bottom:16px;border:1px solid #3a2c14">' +
          '<div style="color:#ff8f8f;font-size:13px;font-weight:700">🔒 Subasta cerrada</div>' +
          (winner ? '<div style="color:#b8a679;font-size:12px;margin-top:4px">Ganador: <b style="color:#f4d98a">' + winner + '</b> con <b>' + topBid + ' 🪙</b></div>' : '') +
        '</div>'
      : '<div id="auction-timer" style="text-align:center;background:linear-gradient(135deg,#0a1a2a,#0a2a3a);border-radius:12px;padding:14px;margin-bottom:16px;border:1px solid #00b4ff44">' +
          '<div style="color:#00b4ff;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:4px">⏳ CIERRA EN</div>' +
          '<div id="auction-countdown" style="color:#fff;font-size:26px;font-weight:800;font-variant-numeric:tabular-nums">' + (timeLeft || '—') + '</div>' +
          '<div style="color:#b8a679;font-size:11px;margin-top:4px">Domingo 24 ago · 00:00h</div>' +
        '</div>') +

    // Puja actual del jugador
    '<div style="background:#1a1505;border-radius:12px;padding:14px;margin-bottom:14px;border:1px solid #3a2c14">' +
      '<div style="color:#b8a679;font-size:12px;margin-bottom:6px">Tu puja actual</div>' +
      '<div style="color:#f4d98a;font-size:22px;font-weight:800">' + (myBid > 0 ? myBid + ' 🪙' : '—') + '</div>' +
      (myBid > 0 ? '<div style="color:#8fd17c;font-size:11px;margin-top:4px">✓ Puja registrada</div>' : '') +
    '</div>' +

    // Formulario de puja (solo si abierta)
    (!closed
      ? '<div style="background:#161116;border-radius:12px;padding:14px;border:1px solid #3a2c14;margin-bottom:6px">' +
          '<div style="color:#b8a679;font-size:12px;margin-bottom:8px">Nueva puja — debes superar la anterior' + (myBid > 0 ? ' (' + myBid + ' 🪙)' : '') + '</div>' +
          '<input type="number" id="auction-bid-input" min="' + (Math.max(myBid, topBid) + 1) + '" placeholder="Cantidad de monedas" class="bet-amount-input" style="margin-bottom:8px">' +
          '<button type="button" class="btn" id="auction-bid-btn" style="background:linear-gradient(135deg,#00d4ff,#0040ff);color:#fff">⚡ Pujar</button>' +
          '<div id="auction-bid-msg" style="margin-top:8px;font-size:13px;text-align:center;min-height:16px"></div>' +
        '</div>'
      : '') +

    // Reglas
    '<div style="color:#6b5f45;font-size:11px;line-height:1.7;margin-top:14px;text-align:center">' +
      '• Solo ves tu propia puja, no la del resto<br>' +
      '• No puedes pujar más monedas de las que tienes<br>' +
      '• Cada puja debe superar tu puja anterior<br>' +
      '• El ganador recibe la botella automáticamente<br>' +
      '• Esta botella no se puede robar' +
    '</div>';

  // Evento pujar
  if (!closed) {
    const bidBtn   = document.getElementById('auction-bid-btn');
    const bidInput = document.getElementById('auction-bid-input');
    const bidMsg   = document.getElementById('auction-bid-msg');

    bidBtn.addEventListener('click', async function () {
      const amount = parseInt(bidInput.value, 10);
      bidMsg.style.color = '#ff8f8f';

      if (isNaN(amount) || amount < 1) {
        bidMsg.textContent = 'Introduce una cantidad válida';
        return;
      }
      const data = getCurrentUserData();
      if (amount > data.coins) {
        bidMsg.textContent = 'No tienes suficientes monedas (tienes ' + data.coins + ' 🪙)';
        return;
      }
      if (amount <= myBid) {
        bidMsg.textContent = 'Tu nueva puja debe superar la anterior (' + myBid + ' 🪙)';
        return;
      }

      bidBtn.disabled = true;
      bidBtn.textContent = 'Enviando...';

      try {
        await db.runTransaction(async function (tx) {
          const ref = db.collection('auctions').doc(AUCTION_DOC);
          const doc = await tx.get(ref);
          const current = doc.exists ? (doc.data().topBid || 0) : 0;

          const update = {
            updatedAt: Date.now(),
            ['bids.' + currentUser]: amount
          };
          if (amount > current) {
            update.topBid = amount;
            update.winner = currentUser;
          }
          tx.set(ref, update, { merge: true });
        });

        bidMsg.style.color = '#8fd17c';
        bidMsg.textContent = '¡Puja de ' + amount + ' 🪙 registrada!';
        bidInput.value = '';
        // Refrescar pantalla con los nuevos datos
        setTimeout(renderAuctionScreen, 800);
      } catch (e) {
        bidMsg.textContent = 'Error al pujar, inténtalo de nuevo';
        console.warn('[Auction] Error pujar:', e);
      }

      bidBtn.disabled = false;
      bidBtn.textContent = '⚡ Pujar';
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
        setTimeout(renderAuctionScreen, 1000);
      } else {
        el.textContent = t;
      }
    }, 1000);
  }
}

// ── Entregar botella al ganador ───────────────────────────────────────
let _auctionDelivered = false;
async function _maybeDeliverAuction(winner, topBid) {
  if (_auctionDelivered || !firebaseReady || !db) return;
  try {
    const deliveredDoc = await db.collection('auctions').doc(AUCTION_DOC + '_delivered').get();
    if (deliveredDoc.exists) { _auctionDelivered = true; return; }

    // Marcar como entregada (idempotente)
    await db.collection('auctions').doc(AUCTION_DOC + '_delivered').set({ deliveredAt: Date.now(), winner: winner, topBid: topBid });

    // Añadir la botella mítica al inventario del ganador en Firestore
    const userRef = db.collection('users').doc(winner);
    await db.runTransaction(async function (tx) {
      const doc = await tx.get(userRef);
      const d   = doc.exists ? doc.data() : {};
      const key = d.activeGroup || 'solo';
      const current = (d.profiles && d.profiles[key] && d.profiles[key].inventory && d.profiles[key].inventory[AUCTION_BOTTLE]) || 0;
      const update  = {};
      update['profiles.' + key + '.inventory.' + AUCTION_BOTTLE] = current + 1;
      update['profiles.' + key + '.updatedAt'] = Date.now();
      update.updatedAt = Date.now();
      tx.set(userRef, update, { merge: true });
    });

    // Notificar al ganador
    await queueUserNotification(winner, '🏆 ¡Has ganado la subasta! La botella "' + AUCTION_BOTTLE + '" ✨ ya está en tu colección.');
    _auctionDelivered = true;
  } catch (e) {
    console.warn('[Auction] Error entregando botella:', e);
  }
}

// Parar el timer cuando se sale de la pantalla
function stopAuctionTimer() {
  if (_auctionTimer) { clearInterval(_auctionTimer); _auctionTimer = null; }
}
