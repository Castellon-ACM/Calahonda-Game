// Recompensa por ver anuncios (Adsterra Popunder)
// =====================================================================
// Adsterra Popunder no tiene un aviso de "anuncio visto hasta el final" como
// los vídeos con recompensa de otras redes: se dispara al hacer clic y abre
// una pestaña nueva en segundo plano. Para que el jugador no pueda seguir
// usando la app mientras tanto, bloqueamos la pantalla con una cuenta atrás
// fija (no depende del anuncio en sí, es un tiempo de espera que nosotros
// imponemos) y solo damos la recompensa cuando esa cuenta atrás termina.
//
// Importante: esto NO cambia cuánto se gana con Adsterra. El pago real pasa
// (o no) en el instante en que se dispara el script de abajo, según haya o
// no demanda de anuncios en ese momento — el bloqueo es solo para que el
// jugador tenga que esperar antes de poder seguir jugando.
//
// El overlay de abajo es nuestra propia pantalla (no el anuncio en sí), así
// que sí podemos hacer que capture cualquier clic mientras está visible,
// para que ningún toque accidental del jugador llegue al juego de detrás
// ni pueda volver a disparar nada por error.
//
// Sin cooldown entre anuncios: el jugador puede darle al botón todas las
// veces que quiera seguidas (solo tiene que esperar la cuenta atrás de cada
// uno). Ojo: Adsterra igualmente aplica sus propios límites de frecuencia
// por su cuenta, así que no todos los intentos generarán una impresión real.
// =====================================================================
const AD_REWARD_AMOUNT = 20;
const AD_WATCH_SECONDS = 10;
const AD_REWARD_COOLDOWN_MS = 0; // sin espera entre anuncios

let _adOverlayTimer = null;

// Cargamos el script del anuncio DENTRO de un iframe aislado ("sandbox").
// El sandbox le permite ejecutar su JS y abrir su ventana/pestaña nueva
// (allow-scripts, allow-popups), y ahora también le damos permiso para
// navegar la pestaña principal PERO SOLO si hay un gesto real del usuario
// de por medio (allow-top-navigation-by-user-activation) — que es
// justo el caso, ya que esto solo se dispara al pulsar el botón. Sin este
// permiso, muchos scripts de anuncios detectan que no tienen posibilidad
// de navegación y directamente no cargan ningún anuncio (por eso dejaron
// de contar impresiones). Con este permiso más fino, el anuncio puede
// volver a funcionar con normalidad, pero sigue sin poder redirigir la
// web por su cuenta sin que el jugador haya hecho clic en algo primero.
function loadPopunderAd() {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;opacity:0;pointer-events:none;';
    iframe.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-top-navigation-by-user-activation allow-forms allow-modals');
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write('<script src="https://pl30937576.effectivecpmnetwork.com/66/af/1e/66af1e28663304edf3869ffa80dc448b.js"><\/script>');
    doc.close();
  } catch (e) {
    console.warn('No se pudo cargar el anuncio:', e);
  }
}

function canWatchAd(lastAdWatch) {
  if (!lastAdWatch) return true;
  const elapsed = Date.now() - lastAdWatch;
  if (isNaN(elapsed)) return true;
  return elapsed >= AD_REWARD_COOLDOWN_MS;
}

function timeUntilAd(lastAdWatch) {
  if (!lastAdWatch) return '';
  const remaining = AD_REWARD_COOLDOWN_MS - (Date.now() - lastAdWatch);
  if (remaining <= 0) return '';
  const totalSec = Math.ceil(remaining / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m + 'm ' + String(s).padStart(2, '0') + 's';
}

// Traga cualquier clic para que no llegue a nada de detrás (ni al juego,
// ni a un posible listener global del script de anuncios).
function _swallowClick(e) {
  e.preventDefault();
  e.stopPropagation();
  if (e.stopImmediatePropagation) e.stopImmediatePropagation();
}

// ── Overlay de pantalla completa que bloquea la app mientras "dura" el anuncio ──
function ensureAdOverlay() {
  if (document.getElementById('ad-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'ad-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(5,3,1,0.96);z-index:99999;display:none;' +
    'flex-direction:column;align-items:center;justify-content:center;padding:24px;' +
    'box-sizing:border-box;text-align:center;';
  overlay.innerHTML =
    '<div style="font-size:48px;margin-bottom:16px">📺</div>' +
    '<div style="color:#f5c518;font-weight:700;font-size:18px;margin-bottom:10px">Anuncio en curso...</div>' +
    '<div style="color:#ccc;font-size:14px;margin-bottom:22px">No cierres ni cambies de pestaña hasta que termine</div>' +
    '<div id="ad-overlay-countdown" style="color:#fff;font-size:40px;font-weight:700;margin-bottom:10px">' + AD_WATCH_SECONDS + '</div>' +
    '<div style="color:#888;font-size:12px">Recibirás tus monedas al terminar</div>';

  // El propio overlay traga sus clics (por si alguien toca la pantalla mientras espera)
  overlay.addEventListener('click', _swallowClick, true);
  overlay.addEventListener('touchend', _swallowClick, true);

  document.body.appendChild(overlay);
}

function showAdOverlay(onComplete) {
  ensureAdOverlay();
  const overlay = document.getElementById('ad-overlay');
  const countdownEl = document.getElementById('ad-overlay-countdown');
  let remaining = AD_WATCH_SECONDS;
  countdownEl.textContent = remaining;
  overlay.style.display = 'flex';

  // Además del propio overlay, capturamos cualquier clic en TODA la página
  // mientras dure la cuenta atrás, para que nada pueda "colarse" por detrás.
  document.addEventListener('click', _swallowClick, true);
  document.addEventListener('touchend', _swallowClick, true);

  if (_adOverlayTimer) clearInterval(_adOverlayTimer);
  _adOverlayTimer = setInterval(function () {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(_adOverlayTimer);
      _adOverlayTimer = null;
      overlay.style.display = 'none';
      document.removeEventListener('click', _swallowClick, true);
      document.removeEventListener('touchend', _swallowClick, true);
      onComplete();
    } else {
      countdownEl.textContent = remaining;
    }
  }, 1000);
}

// Refresca el botón cada segundo (barato, y evita tener que enganchar
// este archivo a los otros puntos de la app donde se cambia de pantalla)
setInterval(function () {
  const btn = document.getElementById('watch-ad-btn');
  if (!btn || typeof currentUser === 'undefined' || !currentUser) return;
  if (_adOverlayTimer) return; // no tocar el botón mientras el anuncio está en curso
  const data = getCurrentUserData();
  if (canWatchAd(data.lastAdWatch)) {
    btn.disabled = false;
    btn.textContent = '🎬 Ver anuncio y ganar ' + AD_REWARD_AMOUNT + ' monedas';
  } else {
    btn.disabled = true;
    btn.textContent = 'Vuelve en ' + timeUntilAd(data.lastAdWatch);
  }
}, 1000);

document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('watch-ad-btn');
  if (!btn) return;

  btn.addEventListener('click', function () {
    const dataBefore = getCurrentUserData();
    if (!canWatchAd(dataBefore.lastAdWatch)) return;

    btn.disabled = true;
    loadPopunderAd();

    showAdOverlay(function () {
      const data = getCurrentUserData();
      data.coins += AD_REWARD_AMOUNT;
      data.lastAdWatch = Date.now();
      saveAndSync(data);
      updateAllBalances(data.coins);

      const resultEl = document.getElementById('ad-result');
      if (resultEl) {
        resultEl.textContent = '¡Has ganado ' + AD_REWARD_AMOUNT + ' monedas! 🪙';
        setTimeout(function () { if (resultEl.textContent.indexOf('ganado') !== -1) resultEl.textContent = ''; }, 3000);
      }
    });
  });
});
