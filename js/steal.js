// =====================================================================
//  ROBAR BOTELLAS: intenta robar una botella a otro jugador
//  50% de probabilidad. El coste depende de la rareza de la botella.
// =====================================================================
const STEAL_COSTS = { legendary: 300, epic: 150, rare: 75, common: 30 };

function stealCostFor(rarity) {
  return STEAL_COSTS[rarity] || STEAL_COSTS.common;
}

// Renderiza el inventario de otro jugador con un botón de "Robar" en cada botella.
// Si el perfil visitado es el tuyo propio, se muestra sin botones (no puedes robarte a ti mismo).
function renderVisitorInventoryWithSteal(targetUsername, inventory) {
  if (targetUsername === currentUser) {
    renderInventory(inventory, 'visitor-inventory-grid');
    return;
  }

  const grid = document.getElementById('visitor-inventory-grid');
  const names = Object.keys(inventory || {});
  if (names.length === 0) {
    grid.innerHTML = '<div class="inventory-empty">Esta persona aún no tiene botellas</div>';
    return;
  }

  names.sort(function (a, b) {
    const ra = RARITY_ORDER[(REWARDS.find(function (r) { return r.name === a; }) || {}).rarity || 'common'];
    const rb = RARITY_ORDER[(REWARDS.find(function (r) { return r.name === b; }) || {}).rarity || 'common'];
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });

  grid.innerHTML = '';
  names.forEach(function (name) {
    const rarity = (REWARDS.find(function (r) { return r.name === name; }) || {}).rarity || 'common';
    const count = inventory[name];
    const prog = levelProgress(count);
    const cost = stealCostFor(rarity);
    const el = document.createElement('div');
    el.className = 'inventory-item rarity-' + rarity;
    el.innerHTML =
      '<div class="bottle-icon">' + bottleIconMarkup(name) + '</div>' +
      '<div class="bottle-level">Nivel ' + prog.level + '</div>' +
      '<div class="bottle-name">' + name + '</div>' +
      '<div class="bottle-progress-label">' + count + ' unidades</div>' +
      '<button type="button" class="btn steal-btn" data-name="' + name + '" data-cost="' + cost + '">🏴‍☠️ Robar (' + cost + '🪙)</button>';
    el.querySelector('.steal-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      attemptSteal(targetUsername, name, cost);
    });
    grid.appendChild(el);
  });
}

function ensureStealResultEl() {
  let el = document.getElementById('steal-result');
  if (!el) {
    el = document.createElement('div');
    el.id = 'steal-result';
    el.className = 'spin-result';
    const card = document.querySelector('#visitor-screen .card');
    if (card) card.insertBefore(el, document.getElementById('visitor-inventory-grid'));
  }
  return el;
}

async function attemptSteal(targetUsername, bottleName, cost) {
  const resultEl = ensureStealResultEl();

  if (targetUsername === currentUser) return;

  const data = getCurrentUserData();
  if (data.coins < cost) {
    resultEl.textContent = 'No tienes suficientes monedas para intentar el robo';
    resultEl.style.color = '#ff8f8f';
    return;
  }
  if (!firebaseReady || !db) {
    resultEl.textContent = 'No hay conexión, inténtalo más tarde';
    resultEl.style.color = '#ff8f8f';
    return;
  }

  resultEl.textContent = 'Intentando robar...';
  resultEl.style.color = '#f4d98a';

  // El coste se paga siempre, haya éxito o no.
  data.coins -= cost;
  saveAndSync(data);
  updateAllBalances(data.coins);

  const won = Math.random() < 0.5;

  if (!won) {
    resultEl.textContent = '❌ No lo has conseguido. ¡Suerte la próxima vez!';
    resultEl.style.color = '#ff8f8f';
    return;
  }

  try {
    // Leer el inventario más reciente del objetivo desde Firestore
    const targetRef = db.collection('users').doc(targetUsername);
    const targetDoc = await targetRef.get();
    if (!targetDoc.exists) {
      resultEl.textContent = 'No se pudo robar (jugador no encontrado en la nube)';
      resultEl.style.color = '#ff8f8f';
      return;
    }
    const targetData = targetDoc.data();
    const targetInventory = targetData.inventory || {};
    const targetCount = targetInventory[bottleName] || 0;
    if (targetCount <= 0) {
      resultEl.textContent = 'Ya no tiene esa botella';
      resultEl.style.color = '#ff8f8f';
      return;
    }

    // Quitarle 1 unidad (el nivel se recalcula solo, al depender del recuento)
    if (targetCount - 1 <= 0) {
      delete targetInventory[bottleName];
    } else {
      targetInventory[bottleName] = targetCount - 1;
    }

    await targetRef.set({ inventory: targetInventory, updatedAt: Date.now() }, { merge: true });
    await db.collection('leaderboard').doc(targetUsername).set({
      inventory: targetInventory,
      value: computeCollectionValue(targetInventory),
      updatedAt: Date.now()
    }, { merge: true });

    // Añadírsela al ladrón
    const fresh = getCurrentUserData();
    fresh.inventory[bottleName] = (fresh.inventory[bottleName] || 0) + 1;
    saveAndSync(fresh);
    renderInventory(fresh.inventory);
    pushToLeaderboard(currentUser, fresh.inventory);

    resultEl.textContent = '🎉 ¡Le has robado ' + bottleName + '!';
    resultEl.style.color = '#8fd17c';

    // Avisar a la víctima la próxima vez que entre
    queueUserNotification(targetUsername, 'Te han robado una botella: ' + bottleName + ' 🏴‍☠️');

    // Refrescar el perfil visitado con los datos ya actualizados
    renderVisitorInventoryWithSteal(targetUsername, targetInventory);
  } catch (e) {
    console.warn('Error al robar:', e);
    resultEl.textContent = 'Algo ha fallado al robar, inténtalo de nuevo';
    resultEl.style.color = '#ff8f8f';
  }
}
