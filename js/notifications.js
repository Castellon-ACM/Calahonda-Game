// =====================================================================
//  NOTIFICACIONES: avisos genéricos a los usuarios (popup reutilizado)
//  Usa el mismo popup que ya existe para los regalos del admin.
// =====================================================================

// Encola un mensaje para un usuario. Se entrega la próxima vez que
// abra la app (funciona aunque esté en otro dispositivo o desconectado ahora).
async function queueUserNotification(username, text) {
  if (!firebaseReady || !db || !username || !text) return;
  try {
    await db.collection('userNotifications').doc(username).set({
      messages: firebase.firestore.FieldValue.arrayUnion(text)
    }, { merge: true });
  } catch (e) {
    console.warn('No se pudo encolar la notificación:', e);
  }
}

// Comprueba si hay notificaciones pendientes para el usuario actual y las muestra.
async function checkUserNotifications(username) {
  if (!username || !firebaseReady || !db) return;
  try {
    const ref = db.collection('userNotifications').doc(username);
    const doc = await ref.get();
    if (!doc.exists) return;
    const messages = doc.data().messages || [];
    if (messages.length === 0) return;

    // Limpiar antes de mostrar, para que no se repita si falla algo después
    await ref.set({ messages: [] }, { merge: true });

    // Sincronizar monedas/inventario reales desde Firestore ANTES de mostrar el aviso.
    // Así, si el mensaje es de un regalo de otro jugador (que ya se sumó en Firestore
    // al enviarse), el saldo en pantalla queda al día sin tener que cerrar sesión.
    if (typeof pullUserData === 'function') {
      await pullUserData(username);
      const fresh = getCurrentUserData();
      if (typeof updateAllBalances === 'function') updateAllBalances(fresh.coins);
      if (typeof renderInventory === 'function') renderInventory(fresh.inventory);
    }

    const appScreen = document.getElementById('app-screen');
    if (!appScreen || appScreen.classList.contains('hidden')) return;

    showNotificationPopup(messages.join('\n\n'));
  } catch (e) {
    console.warn('No se pudo comprobar notificaciones:', e);
  }
}

// Muestra el popup genérico (reutiliza el markup del popup de regalo del admin).
function showNotificationPopup(text) {
  const popup = document.getElementById('admin-gift-popup');
  const textEl = document.getElementById('admin-gift-popup-text');
  if (!popup || !textEl) return;
  textEl.textContent = text;
  popup.classList.remove('hidden');
  popup.style.display = 'flex';
}
