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

// =====================================================================
//  REINTENTO AUTOMÁTICO: si guardar en Firestore falla (mala conexión,
//  típico en fiestas con mucha gente en el mismo wifi), NO se pierde el
//  cambio. Se marca como "pendiente" en el propio localStorage del jugador
//  y se reintenta solo en segundo plano cada 15s hasta que se confirme.
// =====================================================================
function _markPendingSync(username, pending) {
  try {
    const users = UserStore.load();
    if (!users[username]) return;
    if (pending) {
      users[username].pendingSync = true;
    } else {
      delete users[username].pendingSync;
    }
    UserStore.save(users);
  } catch (e) {}
}

// Sube los datos completos del jugador a la colección 'users' de Firestore.
// Esto permite al admin ver y gestionar todos los jugadores desde cualquier dispositivo,
// y permite iniciar sesión con el mismo usuario desde otro móvil o el PC.
// Solo se sube el HASH de la contraseña (nunca la contraseña en texto plano).
// Devuelve true/false según si se guardó de verdad en Firestore.
async function pushUserData(username, data) {
  if (!firebaseReady || !db || !username || !data) return false;
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
    _markPendingSync(username, false);
    return true;
  } catch (e) {
    console.warn('No se pudo sincronizar datos de usuario (se reintentará solo):', e);
    _markPendingSync(username, true);
    return false;
  }
}

// Reintenta subir los datos de cualquier usuario local que se haya quedado
// marcado como "pendiente" por un fallo de conexión anterior.
async function flushPendingSync() {
  if (!firebaseReady || !db) return;
  try {
    const users = UserStore.load();
    const pendingUsernames = Object.keys(users).filter(function (u) { return users[u] && users[u].pendingSync; });
    for (const u of pendingUsernames) {
      await pushUserData(u, users[u]);
    }
  } catch (e) {}
}

// Reintento en segundo plano cada 15s, sin depender de que el jugador haga nada.
setInterval(flushPendingSync, 15000);

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
// IMPORTANTE — cómo se decide qué saldo de monedas gana:
// El admin usa una transacción atómica en Firestore para ajustar coins, así que en
// general Firestore es la fuente de verdad. PERO si este dispositivo tiene un cambio
// de monedas que TODAVÍA no se ha confirmado guardado en Firestore (pendingSync=true,
// por ejemplo porque el jugador ganó monedas con mala conexión y el guardado falló),
// NO pisamos ese valor local con el de Firestore, que estaría desactualizado. En su
// lugar, dejamos que el reintento automático (flushPendingSync) termine de subirlo.
async function pullUserData(username) {
  if (!firebaseReady || !db || !username) return;
  try {
    const doc = await db.collection('users').doc(username).get();
    if (!doc.exists) return;
    const remote = doc.data();
    const users = UserStore.load();
    if (!users[username]) return;

    const hasPendingLocalChange = !!users[username].pendingSync;

    // ── Skins: siempre fusionar (merge) ──────────────────────────────
    if (remote.ownedSkins) {
      users[username].ownedSkins = Object.assign({}, users[username].ownedSkins || {}, remote.ownedSkins);
    }

    // ── Hash de contraseña: siempre sincronizar si hay uno más nuevo ──
    if (remote.passwordHash && remote.passwordHash !== users[username].passwordHash) {
      users[username].passwordHash = remote.passwordHash;
      delete users[username].password;
    }

    // ── Monedas: tomar el valor de Firestore, SALVO que este dispositivo
    // tenga un cambio local todavía sin confirmar guardar (evita perder
    // monedas ganadas offline por culpa de mala conexión) ──────────────
    if (remote.coins !== undefined && !hasPendingLocalChange) {
      users[username].coins = remote.coins;
    }

    // ── Resto (inventory, email, banned): comparar fechas ─────────────
    const localUpdated = users[username].updatedAt || 0;
    const remoteUpdated = remote.updatedAt || 0;
    if (remoteUpdated > localUpdated && !hasPendingLocalChange) {
      if (remote.inventory) users[username].inventory = remote.inventory;
      if (remote.email) users[username].email = remote.email;
      if (remote.banned !== undefined) users[username].banned = remote.banned;
      users[username].updatedAt = remoteUpdated;
    }

    UserStore.save(users);

    // Si había un cambio pendiente, intentar subirlo ahora mismo (además
    // del reintento automático cada 15s) para ponerlo al día cuanto antes.
    if (hasPendingLocalChange) {
      pushUserData(username, users[username]);
    }
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
    const users = UserStore.load();
    if (!users[username]) return;
    if (users[username].pendingSync) return; // no pisar un cambio local aún sin confirmar

    const doc = await db.collection('users').doc(username).get();
    if (!doc.exists) return;
    const remoteCoins = doc.data().coins;
    if (remoteCoins === undefined) return;

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
