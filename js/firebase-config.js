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
// Esto permite al admin ver y gestionar todos los jugadores desde cualquier dispositivo.
// NO sube la contraseña.
async function pushUserData(username, data) {
  if (!firebaseReady || !db || !username || !data) return;
  try {
    await db.collection('users').doc(username).set({
      username: username,
      coins: data.coins || 0,
      inventory: data.inventory || {},
      email: data.email || '',
      banned: data.banned || false,
      value: computeCollectionValue(data.inventory || {}),
      updatedAt: Date.now()
    }, { merge: true });
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

    // Los regalos de skins del admin se fusionan siempre (no se pisan entre sí,
    // ni dependen de qué dispositivo tenga los datos más recientes).
    if (remote.ownedSkins) {
      users[username].ownedSkins = Object.assign({}, users[username].ownedSkins || {}, remote.ownedSkins);
      UserStore.save(users);
    }

    // Aplicar el resto solo si los datos remotos son más recientes
    const localUpdated = users[username].updatedAt || 0;
    const remoteUpdated = remote.updatedAt || 0;
    if (remoteUpdated > localUpdated) {
      users[username].coins = remote.coins || users[username].coins;
      users[username].inventory = remote.inventory || users[username].inventory;
      users[username].email = remote.email || users[username].email;
      users[username].banned = remote.banned || users[username].banned;
      users[username].updatedAt = remoteUpdated;
      UserStore.save(users);
    }
  } catch (e) {
    console.warn('No se pudo cargar datos remotos del usuario:', e);
  }
}
