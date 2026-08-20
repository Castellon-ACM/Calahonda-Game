// =====================================================================
//  NOVEDADES: buzón de anuncios de la app (icono de correo junto al avatar)
//  Cada vez que se lanza algo nuevo, se añade una entrada aquí con un id
//  correlativo. El id más alto que el jugador ha visto se guarda en su
//  perfil (lastSeenAnnouncement), así que el contador solo cuenta lo nuevo.
// =====================================================================
const ANNOUNCEMENTS = [
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

function latestAnnouncementId() {
  return ANNOUNCEMENTS.reduce(function (max, a) { return a.id > max ? a.id : max; }, 0);
}

function updateNewsBadge() {
  const badge = document.getElementById('news-badge');
  if (!badge) return;
  const data = getCurrentUserData();
  const unseen = latestAnnouncementId() - (data.lastSeenAnnouncement || 0);
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

  // Marcar todo como visto al abrir el buzón
  const data = getCurrentUserData();
  const latest = latestAnnouncementId();
  if (data.lastSeenAnnouncement < latest) {
    data.lastSeenAnnouncement = latest;
    saveAndSync(data);
  }
  updateNewsBadge();
}

document.getElementById('news-btn').addEventListener('click', openNewsScreen);

document.getElementById('news-back').addEventListener('click', function () {
  hideAll();
  appScreen.classList.remove('hidden');
});
