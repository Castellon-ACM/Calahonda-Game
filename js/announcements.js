// =====================================================================
//  NOVEDADES: buzón de anuncios de la app
// =====================================================================

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
  },
  {
    id: 3,
    date: '21 ago',
    title: '⚡ Subasta exclusiva — Alcohol 96%',
    body: 'La botella más pura y exclusiva del juego sale a subasta por primera vez. Solo existirá 1 copia en toda la app. No se puede robar. Cierra el domingo 24 de agosto a las 00:00h. ¡No te quedes sin pujar!',
    cta: '⚡ Ver subasta',
    ctaTab: 'auction'
  }
];

let ANNOUNCEMENTS = ANNOUNCEMENTS_FALLBACK.slice();

async function loadAnnouncementsFromFirestore() {
  if (typeof db === 'undefined' || !db) return;
  try {
    const snap = await db.collection('announcements').orderBy('id', 'asc').get();
    if (snap.empty) return;
    ANNOUNCEMENTS = snap.docs.map(function (doc) { return doc.data(); });
    // Asegurarse de que el anuncio de la subasta esté siempre presente
    const hasAuction = ANNOUNCEMENTS.some(function (a) { return a.id === 3; });
    if (!hasAuction) ANNOUNCEMENTS = ANNOUNCEMENTS.concat([ANNOUNCEMENTS_FALLBACK[2]]);
  } catch (e) {
    console.warn('[Announcements] No se pudo cargar desde Firestore, usando fallback:', e);
  }
}

async function initAnnouncements() {
  await loadAnnouncementsFromFirestore();
  updateNewsBadge();
}

function latestAnnouncementId() {
  return ANNOUNCEMENTS.reduce(function (max, a) { return a.id > max ? a.id : max; }, 0);
}

function getLastSeen() {
  if (!currentUser) return 0;
  const users = UserStore.load();
  const u = users[currentUser] || {};
  return u.lastSeenAnnouncement || 0;
}

async function saveLastSeen(id) {
  if (!currentUser) return;
  const users = UserStore.load();
  if (!users[currentUser]) return;
  users[currentUser].lastSeenAnnouncement = id;
  UserStore.save(users);
  if (typeof db !== 'undefined' && db) {
    try {
      await db.collection('users').doc(currentUser).set(
        { lastSeenAnnouncement: id, updatedAt: Date.now() },
        { merge: true }
      );
    } catch (e) {
      console.warn('[Announcements] No se pudo guardar lastSeenAnnouncement:', e);
    }
  }
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
  const list   = document.getElementById('news-list');
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
        if (a.ctaTab === 'auction') {
          // Abrir pantalla de subasta directamente
          hideAll();
          document.getElementById('auction-screen').classList.remove('hidden');
          if (typeof renderAuctionScreen === 'function') renderAuctionScreen();
        } else {
          goToAppTab(a.ctaTab || 'home');
        }
      });
    }
    list.appendChild(el);
  });
}

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

  const latest = latestAnnouncementId();
  if (getLastSeen() < latest) saveLastSeen(latest);
  updateNewsBadge();
}

document.getElementById('news-btn').addEventListener('click', openNewsScreen);
document.getElementById('news-back').addEventListener('click', function () {
  hideAll();
  appScreen.classList.remove('hidden');
});
