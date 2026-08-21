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

// Sube el inventario público al ranking GLOBAL (siempre el perfil "solo",
// nunca el de un grupo — para eso está el ranking de cada grupo).
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

// Sube los datos del jugador a Firestore ('users/{username}').
// - Los datos de IDENTIDAD (email, contraseña, grupos a los que pertenece,
//   grupo activo) se leen siempre del registro completo en este dispositivo.
// - Los datos de JUEGO (monedas, inventario...) que se pasan en `profileData`
//   se guardan SOLO dentro del perfil activo (profiles.solo o profiles.<código>),
//   sin tocar los datos de los demás grupos a los que pertenezca el jugador.
// Solo se sube el HASH de la contraseña (nunca la contraseña en texto plano).
// Devuelve true/false según si se guardó de verdad en Firestore.
async function pushUserData(username, profileData) {
  if (!firebaseReady || !db || !username || !profileData) return false;
  try {
    const users = UserStore.load();
    const full = users[username] || {};
    const key = full.activeGroup || 'solo';

    const payload = {
      username: username,
      email: full.email || '',
      banned: full.banned || false,
      groups: full.groups || [],
      activeGroup: full.activeGroup || null,
      updatedAt: Date.now()
    };
    if (full.passwordHash) payload.passwordHash = full.passwordHash;
    // Subir también lastSeenAnnouncement para que persista entre sesiones
    if (full.lastSeenAnnouncement !== undefined) {
      payload.lastSeenAnnouncement = full.lastSeenAnnouncement;
    }

    payload.profiles = {};
    payload.profiles[key] = {
      coins: profileData.coins || 0,
      inventory: profileData.inventory || {},
      ownedSkins: profileData.ownedSkins || {},
      lastClaim: profileData.lastClaim || null,
      rouletteHistory: profileData.rouletteHistory || [],
      value: computeCollectionValue(profileData.inventory || {}),
      updatedAt: Date.now()
    };

    // merge:true hace un merge profundo de objetos anidados, así que esto
    // solo toca profiles.<key> y no borra los demás perfiles del jugador.
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
      const full = ensureUserDefaults(u, users[u]);
      const key = full.activeGroup || 'solo';
      await pushUserData(u, full.profiles[key]);
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
async function pullUserData(username) {
  if (!firebaseReady || !db || !username) return;
  try {
    const doc = await db.collection('users').doc(username).get();
    if (!doc.exists) return;
    const remote = doc.data();
    const users = UserStore.load();
    if (!users[username]) return;

    const hasPendingLocalChange = !!users[username].pendingSync;

    // ── Hash de contraseña: siempre sincronizar si hay uno más nuevo ──
    if (remote.passwordHash && remote.passwordHash !== users[username].passwordHash) {
      users[username].passwordHash = remote.passwordHash;
      delete users[username].password;
    }

    // ── Grupos: sincronizar siempre desde el servidor (si te uniste o
    // saliste de un grupo desde otro dispositivo, aquí se refleja) ────
    if (remote.groups !== undefined) users[username].groups = remote.groups;
    if (remote.activeGroup !== undefined) users[username].activeGroup = remote.activeGroup;

    // ── lastSeenAnnouncement: tomar siempre el mayor entre local y remoto ──
    // Así si el usuario leyó las noticias en otro dispositivo, no le vuelven
    // a aparecer como nuevas en este. Y si cerró sesión y vuelve a entrar,
    // sabe que ya las vio.
    if (remote.lastSeenAnnouncement !== undefined) {
      const localSeen = users[username].lastSeenAnnouncement || 0;
      if (remote.lastSeenAnnouncement > localSeen) {
        users[username].lastSeenAnnouncement = remote.lastSeenAnnouncement;
      }
    }

    // ── Perfiles: fusionar cada perfil (monedas/inventario) que venga del
    // servidor con los que ya tengamos localmente, perfil por perfil ──────
    if (remote.profiles) {
      if (!users[username].profiles) users[username].profiles = {};
      Object.keys(remote.profiles).forEach(function (key) {
        const remoteProfile = remote.profiles[key];
        const localProfile = users[username].profiles[key];

        // Si es el perfil ACTIVO ahora mismo y hay un cambio local sin
        // confirmar todavía, no lo pisamos (evita perder monedas ganadas
        // offline por mala conexión).
        const isActiveProfile = key === (users[username].activeGroup || 'solo');
        if (isActiveProfile && hasPendingLocalChange) return;

        if (!localProfile) {
          users[username].profiles[key] = remoteProfile;
          return;
        }
        const localUpdated = localProfile.updatedAt || 0;
        const remoteUpdated = remoteProfile.updatedAt || 0;
        if (remoteUpdated > localUpdated) {
          users[username].profiles[key] = remoteProfile;
        } else if (remoteProfile.ownedSkins) {
          // Los cosméticos siempre se fusionan (nunca se pisan entre sí)
          localProfile.ownedSkins = Object.assign({}, localProfile.ownedSkins || {}, remoteProfile.ownedSkins);
        }
      });
    }

    UserStore.save(users);

    // Si había un cambio pendiente, intentar subirlo ahora mismo (además
    // del reintento automático cada 15s) para ponerlo al día cuanto antes.
    if (hasPendingLocalChange) {
      const key = users[username].activeGroup || 'solo';
      if (users[username].profiles[key]) pushUserData(username, users[username].profiles[key]);
    }
  } catch (e) {
    console.warn('No se pudo cargar datos remotos del usuario:', e);
  }
}

// Sincroniza las monedas del perfil ACTIVO desde Firestore mientras el
// jugador está en sesión. Se llama periódicamente para que los cambios del
// admin (dar/quitar monedas) lleguen sin necesidad de cerrar sesión.
async function syncCoinsFromFirestore(username) {
  if (!firebaseReady || !db || !username) return;
  try {
    const users = UserStore.load();
    if (!users[username]) return;
    if (users[username].pendingSync) return; // no pisar un cambio local aún sin confirmar

    const doc = await db.collection('users').doc(username).get();
    if (!doc.exists) return;
    const key = users[username].activeGroup || 'solo';
    const remoteProfile = doc.data().profiles && doc.data().profiles[key];
    if (!remoteProfile || remoteProfile.coins === undefined) return;

    if (!users[username].profiles) users[username].profiles = {};
    if (!users[username].profiles[key]) users[username].profiles[key] = {};
    if (users[username].profiles[key].coins === remoteProfile.coins) return;

    users[username].profiles[key].coins = remoteProfile.coins;
    UserStore.save(users);

    // Refrescar el balance visible si la app está en pantalla
    const balanceEl = document.getElementById('balance-amount');
    if (balanceEl) balanceEl.textContent = remoteProfile.coins;
  } catch (e) {
    console.warn('No se pudo sincronizar monedas:', e);
  }
}
