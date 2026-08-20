// =====================================================================
//  REGALO DE MONEDAS: enviar monedas a otro jugador desde su perfil
// =====================================================================
const GIFT_AMOUNTS = [50, 100, 250, 500];

function renderGiftSection(targetUsername) {
  if (targetUsername === currentUser) return '';

  const buttons = GIFT_AMOUNTS.map(function (a) {
    return '<button type="button" class="btn gift-amount-btn" data-amount="' + a + '">' + a + ' 🪙</button>';
  }).join('');

  return (
    '<div class="gift-section">' +
    '  <div class="inventory-title">💝 Regalar monedas</div>' +
    '  <div class="gift-btn-row">' + buttons + '</div>' +
    '  <div id="gift-result" class="spin-result"></div>' +
    '</div>'
  );
}

function attachGiftListeners(targetUsername) {
  if (targetUsername === currentUser) return;
  document.querySelectorAll('.gift-amount-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const amount = parseInt(btn.getAttribute('data-amount'), 10);
      sendGift(targetUsername, amount);
    });
  });
}

async function sendGift(targetUsername, amount) {
  const resultEl = document.getElementById('gift-result');
  if (!resultEl) return;

  if (!firebaseReady || !db) {
    resultEl.textContent = 'Sin conexión, inténtalo más tarde';
    resultEl.style.color = '#ff8f8f';
    return;
  }

  const data = getCurrentUserData();
  if (data.coins < amount) {
    resultEl.textContent = 'No tienes suficientes monedas';
    resultEl.style.color = '#ff8f8f';
    return;
  }

  // Descontar al remitente
  data.coins -= amount;
  saveAndSync(data);
  updateAllBalances(data.coins);

  try {
    // Sumar al destinatario en Firestore
    await db.collection('users').doc(targetUsername).set({
      coins: firebase.firestore.FieldValue.increment(amount),
      updatedAt: Date.now()
    }, { merge: true });

    // Notificar al destinatario
    await queueUserNotification(
      targetUsername,
      currentUser + ' te ha regalado ' + amount + ' monedas 💝'
    );

    resultEl.textContent = '¡Le has regalado ' + amount + ' 🪙 a ' + targetUsername + '!';
    resultEl.style.color = '#8fd17c';
  } catch (e) {
    // Devolver monedas si falla
    data.coins += amount;
    saveAndSync(data);
    updateAllBalances(data.coins);
    resultEl.textContent = 'No se pudo enviar el regalo, inténtalo de nuevo';
    resultEl.style.color = '#ff8f8f';
  }
}
