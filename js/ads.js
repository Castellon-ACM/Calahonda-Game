// Recompensa de monedas (SIN publicidad)
// =====================================================================
// Se ha quitado toda la parte de red de anuncios (Adsterra Popunder,
// Social Bar y el meta tag de verificación de Monetag). Se mantiene la
// mecánica de "espera unos segundos y consigue monedas", solo que ya no
// dispara ningún anuncio real ni carga ningún script externo.
// =====================================================================
const AD_REWARD_AMOUNT = 20;
const AD_WATCH_SECONDS = 10;
const AD_REWARD_COOLDOWN_MS = 0; // sin espera entre usos

let _adOverlayTimer = null;

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

// ── Overlay de pantalla completa con la cuenta atrás ──
function ensureAdOverlay() {
  if (document.getElementById('ad-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'ad-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(5,3,1,0.96);z-index:99999;display:none;' +
    'flex-direction:column;align-items:center;justify-content:center;padding:24px;' +
    'box-sizing:border-box;text-align:center;';
  overlay.innerHTML =
    '<div style="font-size:48px;margin-bottom:16px">🪙</div>' +
    '<div style="color:#f5c518;font-weight:700;font-size:18px;margin-bottom:10px">Preparando tu recompensa...</div>' +
    '<div id="ad-overlay-countdown" style="color:#fff;font-size:40px;font-weight:700;margin-bottom:10px">' + AD_WATCH_SECONDS + '</div>' +
    '<div style="color:#888;font-size:12px">Recibirás tus monedas al terminar</div>';
  document.body.appendChild(overlay);
}

function showAdOverlay(onComplete) {
  ensureAdOverlay();
  const overlay = document.getElementById('ad-overlay');
  const countdownEl = document.getElementById('ad-overlay-countdown');
  let remaining = AD_WATCH_SECONDS;
  countdownEl.textContent = remaining;
  overlay.style.display = 'flex';

  if (_adOverlayTimer) clearInterval(_adOverlayTimer);
  _adOverlayTimer = setInterval(function () {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(_adOverlayTimer);
      _adOverlayTimer = null;
      overlay.style.display = 'none';
      onComplete();
    } else {
      countdownEl.textContent = remaining;
    }
  }, 1000);
}

// Refresca el botón cada segundo
setInterval(function () {
  const btn = document.getElementById('watch-ad-btn');
  if (!btn || typeof currentUser === 'undefined' || !currentUser) return;
  if (_adOverlayTimer) return;
  const data = getCurrentUserData();
  if (canWatchAd(data.lastAdWatch)) {
    btn.disabled = false;
    btn.textContent = '🎬 Reclamar ' + AD_REWARD_AMOUNT + ' monedas';
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
