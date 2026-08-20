// =====================================================================
//  CHAT GLOBAL: mensajes en tiempo real via Firestore
// =====================================================================
const CHAT_MAX_MESSAGES = 60;
const CHAT_COOLDOWN_MS  = 3000;
let   chatUnsubscribe   = null;
let   lastChatSend      = 0;

function renderChatTab() {
  const content = document.getElementById('tab-chat');
  if (!content) return;
  content.innerHTML =
    '<div class="game">' +
    '  <div id="chat-messages" class="chat-messages"></div>' +
    '  <div class="chat-input-row">' +
    '    <input type="text" id="chat-input" class="bet-amount-input" placeholder="Escribe un mensaje..." maxlength="200" autocomplete="off">' +
    '    <button type="button" class="btn chat-send-btn" id="chat-send-btn">➤</button>' +
    '  </div>' +
    '</div>';

  document.getElementById('chat-send-btn').addEventListener('click', sendChatMessage);
  document.getElementById('chat-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sendChatMessage();
  });

  subscribeChat();
}

function subscribeChat() {
  if (!firebaseReady || !db) {
    renderChatOffline();
    return;
  }
  if (chatUnsubscribe) chatUnsubscribe();

  chatUnsubscribe = db.collection('globalChat')
    .orderBy('ts', 'asc')
    .limitToLast(CHAT_MAX_MESSAGES)
    .onSnapshot(function (snap) {
      const box = document.getElementById('chat-messages');
      if (!box) return;
      box.innerHTML = '';
      snap.forEach(function (doc) {
        const d = doc.data();
        appendChatBubble(box, d.user, d.text, d.ts, d.user === currentUser);
      });
      box.scrollTop = box.scrollHeight;
    }, function () {
      renderChatOffline();
    });
}

function appendChatBubble(box, user, text, ts, isMine) {
  const wrap = document.createElement('div');
  wrap.className = 'chat-bubble-wrap' + (isMine ? ' chat-bubble-mine' : '');

  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';
  avatar.textContent = (user || '?').trim().charAt(0).toUpperCase();

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';

  const name = document.createElement('div');
  name.className = 'chat-bubble-name';
  name.textContent = user || '?';

  const msg = document.createElement('div');
  msg.className = 'chat-bubble-text';
  msg.textContent = text;

  const time = document.createElement('div');
  time.className = 'chat-bubble-time';
  time.textContent = ts ? formatChatTime(ts) : '';

  bubble.appendChild(name);
  bubble.appendChild(msg);
  bubble.appendChild(time);

  if (isMine) {
    wrap.appendChild(bubble);
    wrap.appendChild(avatar);
  } else {
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
  }

  box.appendChild(wrap);
}

function formatChatTime(ts) {
  const d = ts && ts.toDate ? ts.toDate() : new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return h + ':' + m;
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  if (!firebaseReady || !db || !currentUser) return;

  const now = Date.now();
  if (now - lastChatSend < CHAT_COOLDOWN_MS) {
    input.placeholder = 'Espera un momento...';
    setTimeout(function () { input.placeholder = 'Escribe un mensaje...'; }, CHAT_COOLDOWN_MS);
    return;
  }

  lastChatSend = now;
  input.value = '';

  try {
    await db.collection('globalChat').add({
      user: currentUser,
      text: text,
      ts: firebase.firestore.FieldValue.serverTimestamp()
    });
    // Limpiar mensajes viejos (mantener solo los últimos N)
    pruneChat();
  } catch (e) {
    console.warn('Error al enviar mensaje:', e);
  }
}

async function pruneChat() {
  try {
    const snap = await db.collection('globalChat').orderBy('ts', 'asc').get();
    const excess = snap.docs.length - CHAT_MAX_MESSAGES;
    if (excess <= 0) return;
    const batch = db.batch();
    snap.docs.slice(0, excess).forEach(function (doc) { batch.delete(doc.ref); });
    await batch.commit();
  } catch (e) { /* silencioso */ }
}

function renderChatOffline() {
  const box = document.getElementById('chat-messages');
  if (!box) return;
  box.innerHTML = '<div class="inventory-empty">Sin conexión al chat</div>';
}

function stopChat() {
  if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
}
