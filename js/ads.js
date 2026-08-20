// Recompensa por ver anuncios (Adsterra Popunder)
// =====================================================================
// Adsterra Popunder no tiene un aviso de "anuncio visto hasta el final" como
// los vídeos con recompensa de otras redes: se dispara al hacer clic y abre
// una pestaña nueva. Por eso damos la recompensa justo al pulsar el botón,
// y limitamos el uso con un pequeño tiempo de espera entre usos para evitar
// que alguien se saque monedas infinitas dándole al botón sin parar.
// =====================================================================
const AD_REWARD_AMOUNT = 20;
const AD_REWARD_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutos

function loadPopunderAd() {
  try {
    const script = document.createElement('script');
    script.src = 'https://pl30937576.effectivecpmnetwork.com/66/af/1e/66af1e28663304edf3869ffa80dc448b.js';
    script.async = true;
    document.body.appendChild(script);
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

// Refresca el botón cada segundo (barato, y evita tener que enganchar
// este archivo a los otros puntos de la app donde se cambia de pantalla)
setInterval(function () {
  const btn = document.getElementById('watch-ad-btn');
  if (!btn || typeof currentUser === 'undefined' || !currentUser) return;
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
    const data = getCurrentUserData();
    if (!canWatchAd(data.lastAdWatch)) return;

    loadPopunderAd();

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
