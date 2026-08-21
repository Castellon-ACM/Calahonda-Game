// =====================================================================
//  NOVEDADES: buzón de anuncios de la app (icono de correo junto al avatar)
//
//  Los anuncios se cargan dinámicamente desde Firestore (colección
//  "announcements"). Si no hay conexión se usa el array ANNOUNCEMENTS_FALLBACK
//  como respaldo. El admin puede crear/borrar anuncios desde el panel.
//
//  Cada anuncio tiene: { id, date, title, body, cta?, ctaTab? }
//  El id más alto visto por el jugador se guarda en lastSeenAnnouncement
//  en la RAÍZ del documento de usuario en Firestore, así persiste entre
//  sesiones y dispositivos.
// =====================================================================

// Fallback estático (se usa solo si Firestore no responde)
const ANNOUNCEMENTS_FALLBACK = [
  {
    id: 1,
    date: '19 ago',
    title: 'Multiplicador de tiradas en la ruleta',
    body: 'Ahora puedes girar la ruleta de botellas x1, x3, x5 o x10 de una vez. Se destaca la botella más rara que consigas y debajo ves el resto del botín.',
    cta: 'Ir a la ruleta',
    ctaTab: 'home'
  },
  {
    id: 2,
    date: '20 ago',
    title: 'Nuevo juego añadido: Póker',
    body: 'Entra al Casino y juega al Póker Texas Hold\'em contra los demás jugadores que estén conectados en ese momento. Crea una mesa o únete a una abierta.',
    cta: 'Entrar al casino',
    ctaTab: 'casino'
  }
];

// Array activo (se rellena al cargar desde Firestore)
let ANNOUNCEMENTS = ANNOUNCEMENTS_FALLBACK.slice();

// ── Carga desde Firestore ─────────────────────────────────────────────
async function loadAnnouncementsFromFirestore() {
  if (typeof db === 'undefined' || !db) return;
  try {
    const snap = await db.collection('announcements').orderBy('id', 'asc').get();
    if (snap.empty) return;
    ANNOUNCEMENTS = snap.docs.map(function (doc) { return doc.data(); });
  } catch (e) {
    console.warn('[Announcements] No se pudo cargar desde Firestore, usando fallback:', e);
  }
}

// Llama a esta función justo después de que el usuario haga login
async function initAnnouncements() {
  await loadAnnouncementsFromFirestore();
  updateNewsBadge();
}

// ── Leer y guardar lastSeenAnnouncement ───────────────────────────────
// Se guarda en la RAÍZ del usuario (localStorage + Firestore) para que
// persista entre sesiones y dispositivos, independientemente del perfil
// de grupo activo.

function getLastSeen() {
  if (!currentUser) return 0;
  const users = UserStore.load();
  const u = users[currentUser] || {};
  return u.lastSeenAnnouncement || 0;
}

async function saveLastSeen(id) {
  if (!currentUser) return;
  // Guardar en localStorage
  const users = UserStore.load();
  if (!users[currentUser]) return;
  users[currentUser].lastSeenAnnouncement = id;
  UserStore.save(users);
  // Guardar en Firestore para que persista al cerrar sesión y en otros dispositivos
  if (typeof db !== 'undefined' && db) {
    try {
      await db.collection('users').doc(currentUser).set(
        { lastSeenAnnouncement: id, updatedAt: Date.now() },
        { merge: true }
      );
    } catch (e) {
      console.warn('[Announcements] No se pudo guardar lastSeenAnnouncement en Firestore:', e);
    }
  }
}

// ── Utilidades ────────────────────────────────────────────────────────
function latestAnnouncementId() {
  return ANNOUNCEMENTS.reduce(function (max, a) { return a.id > max ? a.id : max; }, 0);
}

function updateNewsBadge() {
  const badge = document.getElementById('news-badge');
  if (!badge) return;
  const unseen = latestAnnouncementId() - getLastSeen();
  if (unseen > 0) {
    badge.textContent = unseen > 9 ? '9+' : String(unseen);
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function renderNewsScreen() {
  document.getElementById('avatar-btn-news').textContent = initial(currentUser);
  const list = document.getElementById('news-list');
  const sorted = ANNOUNCEMENTS.slice().sort(function (a, b) { return b.id - a.id; });

  if (sorted.length === 0) {
    list.innerHTML = '<div class="inventory-empty">Todavía no hay novedades</div>';
    return;
  }

  list.innerHTML = '';
  sorted.forEach(function (a) {
    const el = document.createElement('div');
    el.className = 'news-card';
    el.innerHTML =
      '<div class="news-card-date">' + a.date + '</div>' +
      '<div class="news-card-title">' + a.title + '</div>' +
      '<div class="news-card-body">' + a.body + '</div>' +
      (a.cta ? '<button type="button" class="btn news-cta-btn">' + a.cta + '</button>' : '');
    if (a.cta) {
      el.querySelector('.news-cta-btn').addEventListener('click', function () {
        goToAppTab(a.ctaTab || 'home');
      });
    }
    list.appendChild(el);
  });
}

// Cierra la pantalla de novedades y abre la app en la pestaña indicada.
function goToAppTab(tab) {
  hideAll();
  appScreen.classList.remove('hidden');
  const btn = document.getElementById('tabbtn-' + tab);
  if (btn) btn.click();
}

function openNewsScreen() {
  hideAll();
  renderNewsScreen();
  document.getElementById('news-screen').classList.remove('hidden');

  // Marcar todo como visto: guardar en localStorage Y Firestore
  const latest = latestAnnouncementId();
  if (getLastSeen() < latest) {
    saveLastSeen(latest);
  }
  updateNewsBadge();
}

document.getElementById('news-btn').addEventListener('click', openNewsScreen);

document.getElementById('news-back').addEventListener('click', function () {
  hideAll();
  appScreen.classList.remove('hidden');
});
