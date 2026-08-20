// =====================================================================
//  FIREBASE: ranking global + sincronización de datos de usuario
// =====================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAD6yWhpCvO_onEeJHMdDHcYyHhtzrwEKE",
  authDomain: "alcohol-365.firebaseapp.com",
  projectId: "alcohol-365",
  storageBucket: "alcohol-365.firebasestorage.app",
  messagingSenderId: "210841175618",
  appId: "1:210841175618:web:fa662ecbd854f34a800fdb"
};

let firebaseReady = false;
let db = null;

try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseReady = true;
  }
} catch (e) {
  console.warn('Firebase no se pudo inicializar:', e);
}

// Convierte un texto (la contraseña) en un hash SHA-256 en hexadecimal.
// Así la contraseña real nunca viaja ni se guarda en Firestore, solo su huella.
async function sha256Hex(text) {
  try {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  } catch (e) {
    console.warn('No se pudo calcular el hash de la contraseña:', e);
    return null;
  }
}

// Sube el inventario público al ranking (sin datos privados como contraseña).
async function pushToLeaderboard(username, inventory) {
  if (!firebaseReady || !db || !username) return;
  try {
    const value = computeCollectionValue(inventory);
    await db.collection('leaderboard').doc(username).set({
      username: username,
      inventory: inventory || {},
      value: value,
      updatedAt: Date.now()
    });
  } catch (e) {
    console.warn('No se pudo sincronizar el ranking global:', e);
  }
}

// Sube los datos completos del jugador a la colección 'users' de Firestore.
// Esto permite al admin ver y gestionar todos los jugadores desde cualquier dispositivo,
// y permite iniciar sesión con el mismo usuario desde otro móvil o el PC.
// Solo se sube el HASH de la contraseña (nunca la contraseña en texto plano).
async function pushUserData(username, data) {
  if (!firebaseReady || !db || !username || !data) return;
  try {
    const payload = {
      username: username,
      coins: data.coins || 0,
      inventory: data.inventory || {},
      email: data.email || '',
      banned: data.banned || false,
      value: computeCollectionValue(data.inventory || {}),
      updatedAt: Date.now()
    };
    if (data.passwordHash) payload.passwordHash = data.passwordHash;
    if (data.ownedSkins) payload.ownedSkins = data.ownedSkins;
    await db.collection('users').doc(username).set(payload, { merge: true });
  } catch (e) {
    console.warn('No se pudo sincronizar datos de usuario:', e);
  }
}

// Descarga el ranking global completo.
async function fetchGlobalLeaderboard() {
  if (!firebaseReady || !db) return null;
  try {
    const snap = await db.collection('leaderboard').orderBy('value', 'desc').limit(200).get();
    return snap.docs.map(function (d) { return d.data(); });
  } catch (e) {
    console.warn('No se pudo cargar el ranking global:', e);
    return null;
  }
}

// Descarga los datos completos de UN usuario desde Firestore por su nombre de usuario.
// Se usa para poder iniciar sesión desde un dispositivo donde ese usuario nunca se registró.
async function fetchRemoteUser(username) {
  if (!firebaseReady || !db || !username) return null;
  try {
    const doc = await db.collection('users').doc(username).get();
    if (!doc.exists) return null;
    return doc.data();
  } catch (e) {
    console.warn('No se pudo consultar el usuario remoto:', e);
    return null;
  }
}

// Carga los datos de un usuario desde Firestore y los aplica al localStorage.
// Se llama al hacer login para sincronizar monedas/inventario que el admin haya modificado.
//
// IMPORTANTE — por qué NO comparamos updatedAt para las monedas:
// El admin usa una transacción atómica en Firestore para ajustar coins. Esa transacción
// actualiza updatedAt en Firestore. Pero si el jugador estuvo activo después de que el
// admin hiciera el cambio, su localStorage tendrá un updatedAt más reciente, con lo que
// la comparación "remoteUpdated > localUpdated" fallaría y se ignorarían las monedas dadas.
// Solución: coins SIEMPRE se toma de Firestore (es la fuente de verdad para monedas).
// El resto (inventory, email, banned) sigue usando la comparación de fecha para no pisar
// cambios legítimos que el jugador haya hecho en este dispositivo.
async function pullUserData(username) {
  if (!firebaseReady || !db || !username) return;
  try {
    const doc = await db.collection('users').doc(username).get();
    if (!doc.exists) return;
    const remote = doc.data();
    const users = UserStore.load();
    if (!users[username]) return;

    // ── Skins: siempre fusionar (merge) ──────────────────────────────
    if (remote.ownedSkins) {
      users[username].ownedSkins = Object.assign({}, users[username].ownedSkins || {}, remote.ownedSkins);
    }

    // ── Hash de contraseña: siempre sincronizar si hay uno más nuevo ──
    if (remote.passwordHash && remote.passwordHash !== users[username].passwordHash) {
      users[username].passwordHash = remote.passwordHash;
      delete users[username].password;
    }

    // ── Monedas: SIEMPRE tomar el valor de Firestore ──────────────────
    // Firestore es la fuente de verdad para coins. El admin escribe ahí de
    // forma atómica; si el jugador tiene un updatedAt más nuevo en local no
    // significa que sus monedas sean las correctas, solo que jugó más tarde.
    if (remote.coins !== undefined) {
      users[username].coins = remote.coins;
    }

    // ── Resto (inventory, email, banned): comparar fechas ─────────────
    const localUpdated = users[username].updatedAt || 0;
    const remoteUpdated = remote.updatedAt || 0;
    if (remoteUpdated > localUpdated) {
      if (remote.inventory) users[username].inventory = remote.inventory;
      if (remote.email) users[username].email = remote.email;
      if (remote.banned !== undefined) users[username].banned = remote.banned;
      users[username].updatedAt = remoteUpdated;
    }

    UserStore.save(users);
  } catch (e) {
    console.warn('No se pudo cargar datos remotos del usuario:', e);
  }
}

// Sincroniza las monedas desde Firestore mientras el jugador está en sesión.
// Se llama periódicamente (cada 60 s) o al volver al foco para que los cambios
// del admin (dar/quitar monedas) lleguen sin necesidad de cerrar sesión.
async function syncCoinsFromFirestore(username) {
  if (!firebaseReady || !db || !username) return;
  try {
    const doc = await db.collection('users').doc(username).get();
    if (!doc.exists) return;
    const remoteCoins = doc.data().coins;
    if (remoteCoins === undefined) return;

    const users = UserStore.load();
    if (!users[username]) return;
    if (users[username].coins === remoteCoins) return; // nada que actualizar

    users[username].coins = remoteCoins;
    UserStore.save(users);

    // Refrescar el balance visible si la app está en pantalla
    const balanceEl = document.getElementById('balance-amount');
    if (balanceEl) balanceEl.textContent = remoteCoins;
  } catch (e) {
    console.warn('No se pudo sincronizar monedas:', e);
  }
}
