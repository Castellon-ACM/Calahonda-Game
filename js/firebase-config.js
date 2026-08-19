// =====================================================================
//  FIREBASE: ranking global (Firestore)
// =====================================================================
// ⚠️ IMPORTANTE: sustituye estos valores por los de TU proyecto de Firebase.
// Los sacas en: Firebase Console → ⚙️ Configuración del proyecto → tus apps → SDK
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

let firebaseReady = false;
let db = null;

try {
  if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== 'TU_API_KEY') {
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
