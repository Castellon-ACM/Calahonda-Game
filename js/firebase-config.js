// =====================================================================
//  FIREBASE: ranking global (Firestore)
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

// Sube (o actualiza) la colección pública de un jugador para el ranking global.
// No incluye monedas: eso se queda siempre en local, nunca es público.
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

// Descarga el ranking global completo. Devuelve null si Firebase no está
// configurado (o falla), para que el resto del código pueda usar un fallback local.
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
