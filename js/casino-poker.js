// Casino: póker multijugador (Texas Hold'em) en tiempo real vía Firestore
//  PÓKER — mesas multijugador en tiempo real
//  Varios jugadores conectados a la vez pueden sentarse en la misma mesa
//  y jugar unos contra otros. Todo se sincroniza mediante Firestore.
// =====================================================================
const POKER_MAX_SEATS = 6;
const POKER_BLIND_PRESETS = [
  { label: '5 / 10', small: 5, big: 10, buyIn: 1000 },
  { label: '10 / 20', small: 10, big: 20, buyIn: 2000 },
  { label: '25 / 50', small: 25, big: 50, buyIn: 5000 },
  { label: '50 / 100', small: 50, big: 100, buyIn: 10000 }
];

let pokerSelectedPreset = 0;
let pokerTablesUnsub = null;
let pokerTableUnsub = null;
let currentPokerTableId = null;
let pokerLastSnapshot = null;
let pokerAutoStartTimer = null;
let pokerActionBusy = false;

// ---------- Baraja y evaluación de manos ----------
const POKER_SUITS = ['♠', '♥', '♦', '♣'];

function pokerBuildShuffledDeck() {
  const deck = [];
  for (let r = 2; r <= 14; r++) {
    for (let i = 0; i < POKER_SUITS.length; i++) deck.push({ r: r, s: POKER_SUITS[i] });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
  }
  return deck;
}

function pokerRankLabel(r) {
  if (r === 14) return 'A';
  if (r === 13) return 'K';
  if (r === 12) return 'Q';
  if (r === 11) return 'J';
  return String(r);
}

function pokerCardHtml(card, faceDown) {
  if (faceDown) return '<div class="bj-card-back poker-card">🂠</div>';
  const color = (card.s === '♥' || card.s === '♦') ? 'red' : 'black';
  return '<div class="bj-card poker-card ' + color + '">' + pokerRankLabel(card.r) + card.s + '</div>';
}

const POKER_HAND_NAMES = ['Carta alta', 'Pareja', 'Doble pareja', 'Trío', 'Escalera', 'Color', 'Full', 'Póker', 'Escalera de color'];

function pokerEvaluate5(cards) {
  const ranks = cards.map(function (c) { return c.r; }).sort(function (a, b) { return b - a; });
  const suits = cards.map(function (c) { return c.s; });
  const isFlush = suits.every(function (s) { return s === suits[0]; });
  const uniqueRanks = Array.from(new Set(ranks)).sort(function (a, b) { return b - a; });
  let straightHigh = 0;
  if (uniqueRanks.length === 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) straightHigh = uniqueRanks[0];
    else if (uniqueRanks.join(',') === '14,5,4,3,2') straightHigh = 5;
  }
  const countMap = {};
  ranks.forEach(function (r) { countMap[r] = (countMap[r] || 0) + 1; });
  const groups = Object.keys(countMap).map(function (r) {
    return { rank: parseInt(r, 10), count: countMap[r] };
  }).sort(function (a, b) { return (b.count - a.count) || (b.rank - a.rank); });

  if (straightHigh && isFlush) return [8, straightHigh];
  if (groups[0].count === 4) return [7, groups[0].rank, groups[1].rank];
  if (groups[0].count === 3 && groups[1] && groups[1].count === 2) return [6, groups[0].rank, groups[1].rank];
  if (isFlush) return [5].concat(ranks);
  if (straightHigh) return [4, straightHigh];
  if (groups[0].count === 3) return [3, groups[0].rank].concat(groups.slice(1).map(function (g) { return g.rank; }));
  if (groups[0].count === 2 && groups[1] && groups[1].count === 2) {
    const pairRanks = [groups[0].rank, groups[1].rank].sort(function (a, b) { return b - a; });
    return [2].concat(pairRanks, [groups[2].rank]);
  }
  if (groups[0].count === 2) return [1, groups[0].rank].concat(groups.slice(1).map(function (g) { return g.rank; }));
  return [0].concat(ranks);
}

function pokerCompareHands(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] || 0, bv = b[i] || 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function pokerCombinations5(cards7) {
  const result = [];
  const n = cards7.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++)
            result.push([cards7[a], cards7[b], cards7[c], cards7[d], cards7[e]]);
  return result;
}

function pokerBestHand(cards7) {
  const combos = pokerCombinations5(cards7);
  let best = null;
  combos.forEach(function (combo) {
    const val = pokerEvaluate5(combo);
    if (!best || pokerCompareHands(val, best) > 0) best = val;
  });
  return best;
}

// ---------- Utilidades de mesa ----------
function pokerOccupiedSeats(table) {
  const arr = [];
  for (let i = 0; i < table.maxSeats; i++) if (table.seats[i]) arr.push(i);
  return arr;
}

function pokerNextOccupied(table, fromSeat) {
  const n = table.maxSeats;
  for (let i = 1; i <= n; i++) {
    const idx = (fromSeat + i) % n;
    if (table.seats[idx]) return idx;
  }
  return fromSeat;
}

function pokerNextToAct(table, fromSeat) {
  const n = table.maxSeats;
  for (let i = 1; i <= n; i++) {
    const idx = (fromSeat + i) % n;
    const s = table.seats[idx];
    if (s && !s.folded && !s.allIn) return idx;
  }
  return -1;
}

function pokerPostBlind(table, seatIdx, amount) {
  const s = table.seats[seatIdx];
  if (!s) return;
  const pay = Math.min(amount, s.stack);
  s.stack -= pay;
  s.betThisRound = (s.betThisRound || 0) + pay;
  s.totalContributed = (s.totalContributed || 0) + pay;
  if (s.stack === 0) s.allIn = true;
}

function pokerActivePlayersCanAct(table) {
  return table.seats.filter(function (s) { return s && !s.folded && !s.allIn; });
}

function pokerComputeSidePots(seats) {
  const contributors = seats.filter(function (s) { return s && s.totalContributed > 0; });
  const levels = Array.from(new Set(contributors.map(function (s) { return s.totalContributed; }))).sort(function (a, b) { return a - b; });
  const pots = [];
  let prev = 0;
  levels.forEach(function (level) {
    const layerPlayers = contributors.filter(function (s) { return s.totalContributed >= level; });
    const amount = (level - prev) * layerPlayers.length;
    if (amount > 0) {
      const eligible = seats.map(function (s, i) { return { s: s, i: i }; })
        .filter(function (o) { return o.s && !o.s.folded && o.s.totalContributed >= level; })
        .map(function (o) { return o.i; });
      pots.push({ amount: amount, eligibleSeats: eligible });
    }
    prev = level;
  });
  return pots;
}

function pokerDealCommunity(table, n) {
  for (let i = 0; i < n; i++) table.communityCards.push(table.deck.pop());
}

function pokerShowdown(table) {
  const pots = pokerComputeSidePots(table.seats);
  const results = [];
  pots.forEach(function (potInfo) {
    const evals = potInfo.eligibleSeats.map(function (i) {
      const s = table.seats[i];
      return { seatIndex: i, best: pokerBestHand(s.holeCards.concat(table.communityCards)) };
    });
    if (evals.length === 0) return;
    let winners = [evals[0]];
    for (let k = 1; k < evals.length; k++) {
      const cmp = pokerCompareHands(evals[k].best, winners[0].best);
      if (cmp > 0) winners = [evals[k]];
      else if (cmp === 0) winners.push(evals[k]);
    }
    const share = Math.floor(potInfo.amount / winners.length);
    const remainder = potInfo.amount - share * winners.length;
    winners.forEach(function (w, idx) {
      const extra = idx < remainder ? 1 : 0;
      table.seats[w.seatIndex].stack += share + extra;
      results.push({
        seatIndex: w.seatIndex,
        username: table.seats[w.seatIndex].username,
        amount: share + extra,
        handName: POKER_HAND_NAMES[w.best[0]]
      });
    });
  });
  const revealed = table.seats.map(function (s, i) {
    return (s && !s.folded) ? { seatIndex: i, username: s.username, holeCards: s.holeCards } : null;
  }).filter(Boolean);
  table.pot = 0;
  table.lastResult = { results: results, revealedHands: revealed, singleWinner: false };
  pokerFinalizeHand(table);
}

function pokerAwardUncontested(table, seatIdx) {
  const s = table.seats[seatIdx];
  s.stack += table.pot;
  table.lastResult = {
    results: [{ seatIndex: seatIdx, username: s.username, amount: table.pot, handName: null }],
    revealedHands: [],
    singleWinner: true
  };
  table.pot = 0;
  pokerFinalizeHand(table);
}

function pokerFinalizeHand(table) {
  table.status = 'waiting';
  table.round = 'complete';
  table.currentTurn = -1;
  // Quitar de la mesa a quien se haya quedado sin fichas
  const busted = [];
  table.seats = table.seats.map(function (s, i) {
    if (s && s.stack <= 0) { busted.push(s.username); return null; }
    return s;
  });
  table.lastResult.busted = busted;
}

function pokerAdvanceRound(table) {
  table.seats.forEach(function (s) { if (s) { s.betThisRound = 0; s.hasActed = false; } });
  table.currentBet = 0;
  table.minRaise = table.bigBlind;
  table.lastAggressorSeat = -1;

  if (table.round === 'preflop') { pokerDealCommunity(table, 3); table.round = 'flop'; }
  else if (table.round === 'flop') { pokerDealCommunity(table, 1); table.round = 'turn'; }
  else if (table.round === 'turn') { pokerDealCommunity(table, 1); table.round = 'river'; }
  else if (table.round === 'river') { pokerShowdown(table); return; }

  const canAct = pokerActivePlayersCanAct(table);
  if (canAct.length <= 1) { pokerAdvanceRound(table); return; }

  table.currentTurn = pokerNextToAct(table, table.dealerSeat);
}

// ---------- Acciones de Firestore ----------
function pokerTableRef(tableId) {
  return db.collection('poker_tables').doc(tableId);
}

async function pokerCreateTable(name) {
  if (!firebaseReady || !db) return;
  const preset = POKER_BLIND_PRESETS[pokerSelectedPreset];
  const data = getCurrentUserData();
  if (data.coins < preset.buyIn) {
    pokerLobbyError('No tienes suficientes monedas para el buy-in de esta mesa');
    return;
  }
  const seats = new Array(POKER_MAX_SEATS).fill(null);
  seats[0] = pokerNewSeat(currentUser, preset.buyIn);
  const ref = db.collection('poker_tables').doc();
  await ref.set({
    name: name || ('Mesa de ' + currentUser),
    smallBlind: preset.small,
    bigBlind: preset.big,
    buyIn: preset.buyIn,
    maxSeats: POKER_MAX_SEATS,
    createdBy: currentUser,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'waiting',
    seats: seats,
    dealerSeat: -1,
    currentTurn: -1,
    round: 'waiting',
    communityCards: [],
    deck: [],
    pot: 0,
    currentBet: 0,
    minRaise: preset.big,
    lastAggressorSeat: -1,
    handNumber: 0
  });

  data.coins -= preset.buyIn;
  saveAndSync(data);
  updateAllBalances(data.coins);
  pokerJoinExistingTable(ref.id);
}

function pokerNewSeat(username, stack) {
  return {
    username: username,
    stack: stack,
    holeCards: [],
    folded: false,
    allIn: false,
    betThisRound: 0,
    totalContributed: 0,
    hasActed: false
  };
}

async function pokerJoinExistingTable(tableId) {
  currentPokerTableId = tableId;
  pokerListenToTable(tableId);
  showPokerTableView();
}

async function pokerSitDown(tableId, seatIdx) {
  const ref = pokerTableRef(tableId);
  const data = getCurrentUserData();
  let joinError = null;
  let buyInAmount = 0;

  await db.runTransaction(async function (tx) {
    const doc = await tx.get(ref);
    if (!doc.exists) { joinError = 'La mesa ya no existe'; return; }
    const table = doc.data();
    if (table.seats[seatIdx]) { joinError = 'Ese asiento ya está ocupado'; return; }
    if (table.seats.some(function (s) { return s && s.username === currentUser; })) { joinError = 'Ya estás sentado en esta mesa'; return; }
    buyInAmount = table.buyIn;
    if (data.coins < buyInAmount) { joinError = 'No tienes suficientes monedas para el buy-in'; return; }
    table.seats[seatIdx] = pokerNewSeat(currentUser, buyInAmount);
    table.updatedAt = Date.now();
    tx.set(ref, table);
  });

  if (joinError) { pokerLobbyError(joinError); return; }

  data.coins -= buyInAmount;
  saveAndSync(data);
  updateAllBalances(data.coins);
  pokerJoinExistingTable(tableId);
}

async function pokerLeaveTable() {
  if (!currentPokerTableId) return;
  const ref = pokerTableRef(currentPokerTableId);
  let cashOut = 0;

  await db.runTransaction(async function (tx) {
    const doc = await tx.get(ref);
    if (!doc.exists) return;
    const table = doc.data();
    const seatIdx = table.seats.findIndex(function (s) { return s && s.username === currentUser; });
    if (seatIdx === -1) return;
    if (table.status === 'hand_active') return; // no se puede salir a mitad de mano
    cashOut = table.seats[seatIdx].stack;
    table.seats[seatIdx] = null;
    table.updatedAt = Date.now();
    tx.set(ref, table);
  });

  if (cashOut > 0) {
    const data = getCurrentUserData();
    data.coins += cashOut;
    saveAndSync(data);
    updateAllBalances(data.coins);
  }

  pokerStopTableListener();
  currentPokerTableId = null;
  showPokerLobbyView();
}

async function pokerTryStartHand(tableId) {
  const ref = pokerTableRef(tableId);
  await db.runTransaction(async function (tx) {
    const doc = await tx.get(ref);
    if (!doc.exists) return;
    const table = doc.data();
    if (table.status !== 'waiting') return;
    const seated = table.seats.filter(function (s) { return s && s.stack > 0; });
    if (seated.length < 2) return;

    delete table.lastResult;
    table.seats = table.seats.map(function (s) {
      if (!s) return null;
      return Object.assign({}, s, {
        folded: false, allIn: false, betThisRound: 0, totalContributed: 0, hasActed: false, holeCards: []
      });
    });

    const deck = pokerBuildShuffledDeck();
    const occ = pokerOccupiedSeats(table);
    let dealer = (table.dealerSeat >= 0 && occ.indexOf(table.dealerSeat) !== -1) ? table.dealerSeat : occ[0];
    dealer = pokerNextOccupied(table, dealer === occ[0] && table.dealerSeat === -1 ? (occ[occ.length - 1]) : dealer);
    if (table.dealerSeat === -1) dealer = occ[0];

    occ.forEach(function (i) { table.seats[i].holeCards = [deck.pop(), deck.pop()]; });

    const sbSeat = occ.length === 2 ? dealer : pokerNextOccupied(table, dealer);
    const bbSeat = pokerNextOccupied(table, sbSeat);
    pokerPostBlind(table, sbSeat, table.smallBlind);
    pokerPostBlind(table, bbSeat, table.bigBlind);

    table.dealerSeat = dealer;
    table.deck = deck;
    table.communityCards = [];
    table.pot = table.seats.reduce(function (sum, s) { return s ? sum + s.totalContributed : sum; }, 0);
    table.currentBet = table.bigBlind;
    table.minRaise = table.bigBlind;
    table.round = 'preflop';
    table.status = 'hand_active';
    table.handNumber = (table.handNumber || 0) + 1;
    table.currentTurn = occ.length === 2 ? sbSeat : pokerNextOccupied(table, bbSeat);
    table.lastAggressorSeat = bbSeat;
    table.updatedAt = Date.now();
    tx.set(ref, table);
  });
}

async function pokerSubmitAction(action, amount) {
  if (!currentPokerTableId || pokerActionBusy) return;
  pokerActionBusy = true;
  const ref = pokerTableRef(currentPokerTableId);
  let errorMsg = null;

  try {
    await db.runTransaction(async function (tx) {
      const doc = await tx.get(ref);
      if (!doc.exists) { errorMsg = 'La mesa ya no existe'; return; }
      const table = doc.data();
      if (table.status !== 'hand_active') { errorMsg = 'No hay ninguna mano en curso'; return; }
      const seatIdx = table.seats.findIndex(function (s) { return s && s.username === currentUser; });
      if (seatIdx === -1 || table.currentTurn !== seatIdx) { errorMsg = 'No es tu turno'; return; }
      const seat = table.seats[seatIdx];

      if (action === 'fold') {
        seat.folded = true;
      } else if (action === 'check') {
        if (seat.betThisRound !== table.currentBet) { errorMsg = 'No puedes pasar, hay una apuesta que igualar'; return; }
      } else if (action === 'call') {
        const need = table.currentBet - seat.betThisRound;
        const pay = Math.min(need, seat.stack);
        seat.stack -= pay; seat.betThisRound += pay; seat.totalContributed += pay; table.pot += pay;
        if (seat.stack === 0) seat.allIn = true;
      } else if (action === 'bet' || action === 'raise') {
        const targetTotal = Math.min(amount, seat.betThisRound + seat.stack);
        if (targetTotal <= table.currentBet && targetTotal < seat.betThisRound + seat.stack) {
          errorMsg = 'La subida debe ser mayor que la apuesta actual';
          return;
        }
        const need = targetTotal - seat.betThisRound;
        const pay = Math.min(need, seat.stack);
        seat.stack -= pay; seat.betThisRound += pay; seat.totalContributed += pay; table.pot += pay;
        if (seat.stack === 0) seat.allIn = true;
        const raiseSize = seat.betThisRound - table.currentBet;
        table.currentBet = seat.betThisRound;
        if (raiseSize > 0) table.minRaise = raiseSize;
        table.lastAggressorSeat = seatIdx;
        table.seats.forEach(function (s, i) {
          if (s && i !== seatIdx && !s.folded && !s.allIn) s.hasActed = false;
        });
      }
      seat.hasActed = true;
      table.seats[seatIdx] = seat;

      const remaining = table.seats.filter(function (s) { return s && !s.folded; });
      if (remaining.length === 1) {
        const winnerIdx = table.seats.findIndex(function (s) { return s && !s.folded; });
        pokerAwardUncontested(table, winnerIdx);
      } else {
        const unmatched = table.seats.filter(function (s) {
          return s && !s.folded && !s.allIn && (s.betThisRound !== table.currentBet || !s.hasActed);
        });
        if (unmatched.length === 0) {
          pokerAdvanceRound(table);
        } else {
          table.currentTurn = pokerNextToAct(table, seatIdx);
        }
      }
      table.updatedAt = Date.now();
      tx.set(ref, table);
    });
  } catch (e) {
    console.warn('Error en acción de póker:', e);
    errorMsg = 'No se pudo realizar la acción, inténtalo de nuevo';
  }

  pokerActionBusy = false;
  if (errorMsg) pokerShowActionError(errorMsg);
}

// ---------- Render: lobby ----------
function renderPokerGame() {
  ensurePokerMarkup();
  showPokerLobbyView();
}

function ensurePokerMarkup() {
  if (document.getElementById('poker-lobby-view')) return;
  const container = document.getElementById('casino-game-poker');

  const presetButtons = POKER_BLIND_PRESETS.map(function (p, i) {
    return '<button type="button" class="poker-preset-btn' + (i === 0 ? ' selected' : '') + '" data-preset="' + i + '">' +
      p.label + '<br><span class="poker-preset-buyin">Buy-in ' + p.buyIn + '</span></button>';
  }).join('');

  container.innerHTML =
    '<button type="button" class="back-to-menu-btn" data-back>← Volver</button>' +
    '<div id="poker-lobby-view">' +
      '<div class="poker-create-box">' +
        '<div class="poker-section-title">Crear mesa</div>' +
        '<input type="text" id="poker-table-name" placeholder="Nombre de la mesa" class="bet-amount-input">' +
        '<div class="poker-preset-row">' + presetButtons + '</div>' +
        '<button type="button" class="btn" id="poker-create-btn">Crear mesa</button>' +
      '</div>' +
      '<div class="poker-section-title">Mesas abiertas</div>' +
      '<div id="poker-table-list"></div>' +
      '<div class="spin-result" id="poker-lobby-error"></div>' +
    '</div>' +
    '<div id="poker-table-view" class="hidden">' +
      '<div class="poker-table-header">' +
        '<div id="poker-table-title"></div>' +
        '<button type="button" class="btn poker-leave-btn" id="poker-leave-btn">Salir de la mesa</button>' +
      '</div>' +
      '<div class="poker-community-row" id="poker-community-row"></div>' +
      '<div class="poker-pot-label" id="poker-pot-label"></div>' +
      '<div class="poker-seats" id="poker-seats"></div>' +
      '<div class="spin-result" id="poker-action-error"></div>' +
      '<div class="poker-action-bar hidden" id="poker-action-bar">' +
        '<button type="button" class="btn poker-fold-btn" id="poker-fold-btn">Retirarse</button>' +
        '<button type="button" class="btn poker-checkcall-btn" id="poker-checkcall-btn">Pasar</button>' +
        '<div class="poker-raise-row">' +
          '<input type="number" id="poker-raise-amount" class="bet-amount-input poker-raise-input" placeholder="Cantidad">' +
          '<button type="button" class="btn poker-raise-btn" id="poker-raise-btn">Subir</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  container.querySelector('[data-back]').addEventListener('click', function () {
    pokerStopLobbyListener();
    showCasinoMenu();
  });

  container.querySelectorAll('.poker-preset-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      container.querySelectorAll('.poker-preset-btn').forEach(function (b) { b.classList.remove('selected'); });
      this.classList.add('selected');
      pokerSelectedPreset = parseInt(this.getAttribute('data-preset'), 10);
    });
  });

  document.getElementById('poker-create-btn').addEventListener('click', function () {
    const name = document.getElementById('poker-table-name').value.trim();
    pokerCreateTable(name);
  });

  document.getElementById('poker-leave-btn').addEventListener('click', pokerLeaveTable);
  document.getElementById('poker-fold-btn').addEventListener('click', function () { pokerSubmitAction('fold'); });
  document.getElementById('poker-checkcall-btn').addEventListener('click', function () {
    const table = pokerLastSnapshot;
    if (!table) return;
    const seat = table.seats.find(function (s) { return s && s.username === currentUser; });
    if (seat && seat.betThisRound === table.currentBet) pokerSubmitAction('check');
    else pokerSubmitAction('call');
  });
  document.getElementById('poker-raise-btn').addEventListener('click', function () {
    const val = parseInt(document.getElementById('poker-raise-amount').value, 10);
    if (!val || val <= 0) { pokerShowActionError('Introduce una cantidad válida'); return; }
    const table = pokerLastSnapshot;
    const seat = table && table.seats.find(function (s) { return s && s.username === currentUser; });
    const action = (seat && table.currentBet > 0) ? 'raise' : 'bet';
    pokerSubmitAction(action, val);
  });
}

function pokerLobbyError(msg) {
  const el = document.getElementById('poker-lobby-error');
  if (el) { el.textContent = msg; el.style.color = '#ff8f8f'; }
}

function pokerShowActionError(msg) {
  const el = document.getElementById('poker-action-error');
  if (el) {
    el.textContent = msg;
    el.style.color = '#ff8f8f';
    setTimeout(function () { if (el.textContent === msg) el.textContent = ''; }, 3000);
  }
}

function showPokerLobbyView() {
  document.getElementById('poker-lobby-view').classList.remove('hidden');
  document.getElementById('poker-table-view').classList.add('hidden');
  pokerListenToLobby();
}

function showPokerTableView() {
  pokerStopLobbyListener();
  document.getElementById('poker-lobby-view').classList.add('hidden');
  document.getElementById('poker-table-view').classList.remove('hidden');
}

function pokerListenToLobby() {
  if (!firebaseReady || !db) return;
  pokerStopLobbyListener();
  pokerTablesUnsub = db.collection('poker_tables')
    .where('status', 'in', ['waiting', 'hand_active'])
    .onSnapshot(function (snap) {
      const list = document.getElementById('poker-table-list');
      if (!list) return;
      if (snap.empty) {
        list.innerHTML = '<div class="inventory-empty">No hay mesas abiertas. ¡Crea una!</div>';
        return;
      }
      const rows = [];
      snap.forEach(function (doc) {
        const t = doc.data();
        const seatedCount = t.seats.filter(Boolean).length;
        rows.push(
          '<div class="poker-table-row" data-id="' + doc.id + '">' +
            '<div class="poker-table-row-main">' +
              '<div class="poker-table-row-name">' + t.name + '</div>' +
              '<div class="poker-table-row-meta">Ciegas ' + t.smallBlind + '/' + t.bigBlind + ' · Buy-in ' + t.buyIn + '</div>' +
            '</div>' +
            '<div class="poker-table-row-players">' + seatedCount + '/' + t.maxSeats + '</div>' +
          '</div>'
        );
      });
      list.innerHTML = rows.join('');
      list.querySelectorAll('.poker-table-row').forEach(function (row) {
        row.addEventListener('click', function () { pokerOpenTable(this.getAttribute('data-id')); });
      });
    }, function (e) {
      console.warn('Error escuchando mesas de póker:', e);
    });
}

function pokerStopLobbyListener() {
  if (pokerTablesUnsub) { pokerTablesUnsub(); pokerTablesUnsub = null; }
}

async function pokerOpenTable(tableId) {
  const doc = await pokerTableRef(tableId).get();
  if (!doc.exists) { pokerLobbyError('Esa mesa ya no existe'); return; }
  const table = doc.data();
  const mySeat = table.seats.findIndex(function (s) { return s && s.username === currentUser; });
  if (mySeat !== -1) { pokerJoinExistingTable(tableId); return; }
  const freeSeat = table.seats.findIndex(function (s) { return !s; });
  if (freeSeat === -1) { pokerLobbyError('Esa mesa está completa'); return; }
  pokerSitDown(tableId, freeSeat);
}

// ---------- Render: mesa ----------
function pokerListenToTable(tableId) {
  pokerStopTableListener();
  pokerTableUnsub = pokerTableRef(tableId).onSnapshot(function (doc) {
    if (!doc.exists) {
      pokerStopTableListener();
      currentPokerTableId = null;
      showPokerLobbyView();
      return;
    }
    const table = doc.data();
    pokerLastSnapshot = table;
    renderPokerTable(tableId, table);
  }, function (e) {
    console.warn('Error escuchando la mesa de póker:', e);
  });
}

function pokerStopTableListener() {
  if (pokerTableUnsub) { pokerTableUnsub(); pokerTableUnsub = null; }
  if (pokerAutoStartTimer) { clearTimeout(pokerAutoStartTimer); pokerAutoStartTimer = null; }
}

function renderPokerTable(tableId, table) {
  document.getElementById('poker-table-title').textContent =
    table.name + ' · Ciegas ' + table.smallBlind + '/' + table.bigBlind;

  document.getElementById('poker-community-row').innerHTML =
    table.communityCards.map(function (c) { return pokerCardHtml(c, false); }).join('') || '<span class="poker-no-cards">Esperando reparto...</span>';

  document.getElementById('poker-pot-label').textContent = 'Bote: ' + table.pot + ' 🪙';

  const mySeatIdx = table.seats.findIndex(function (s) { return s && s.username === currentUser; });

  const seatsHtml = [];
  for (let i = 0; i < table.maxSeats; i++) {
    const s = table.seats[i];
    if (!s) { seatsHtml.push('<div class="poker-seat poker-seat-empty">Asiento libre</div>'); continue; }
    const isMe = i === mySeatIdx;
    const isTurn = table.currentTurn === i;
    const isDealer = table.dealerSeat === i;
    let holeHtml = '';
    if (isMe) {
      holeHtml = s.holeCards.map(function (c) { return pokerCardHtml(c, false); }).join('');
    } else if (table.round === 'complete' && table.lastResult && table.lastResult.revealedHands) {
      const rev = table.lastResult.revealedHands.find(function (r) { return r.seatIndex === i; });
      holeHtml = rev ? rev.holeCards.map(function (c) { return pokerCardHtml(c, false); }).join('')
        : (s.holeCards.length ? pokerCardHtml(null, true) + pokerCardHtml(null, true) : '');
    } else {
      holeHtml = s.holeCards.length ? (pokerCardHtml(null, true) + pokerCardHtml(null, true)) : '';
    }

    let resultTag = '';
    if (table.round === 'complete' && table.lastResult) {
      const win = table.lastResult.results.find(function (r) { return r.seatIndex === i; });
      if (win) resultTag = '<div class="poker-win-tag">+' + win.amount + (win.handName ? ' (' + win.handName + ')' : '') + '</div>';
    }

    seatsHtml.push(
      '<div class="poker-seat' + (isTurn ? ' poker-seat-turn' : '') + (s.folded ? ' poker-seat-folded' : '') + '">' +
        '<div class="poker-seat-top">' +
          (isDealer ? '<span class="poker-dealer-chip">D</span>' : '') +
          '<span class="poker-seat-name">' + s.username + (isMe ? ' (tú)' : '') + '</span>' +
        '</div>' +
        '<div class="poker-seat-cards">' + holeHtml + '</div>' +
        '<div class="poker-seat-stack">' + s.stack + ' 🪙' + (s.allIn ? ' · ALL-IN' : '') + (s.folded ? ' · retirado' : '') + '</div>' +
        (s.betThisRound > 0 ? '<div class="poker-seat-bet">Apuesta: ' + s.betThisRound + '</div>' : '') +
        resultTag +
      '</div>'
    );
  }
  document.getElementById('poker-seats').innerHTML = seatsHtml.join('');

  const actionBar = document.getElementById('poker-action-bar');
  const isMyTurn = table.status === 'hand_active' && mySeatIdx !== -1 && table.currentTurn === mySeatIdx;
  actionBar.classList.toggle('hidden', !isMyTurn);
  document.getElementById('poker-leave-btn').disabled = (table.status === 'hand_active');

  if (isMyTurn) {
    const seat = table.seats[mySeatIdx];
    const toCall = table.currentBet - seat.betThisRound;
    document.getElementById('poker-checkcall-btn').textContent = toCall > 0 ? ('Igualar (' + toCall + ')') : 'Pasar';
    document.getElementById('poker-raise-amount').placeholder = 'Mín. ' + (table.currentBet + table.minRaise);
  }

  // Autoarranque de la siguiente mano si hay al menos 2 jugadores sentados con fichas
  if (table.status === 'waiting') {
    if (pokerAutoStartTimer) clearTimeout(pokerAutoStartTimer);
    const seated = table.seats.filter(function (s) { return s && s.stack > 0; });
    if (seated.length >= 2) {
      pokerAutoStartTimer = setTimeout(function () { pokerTryStartHand(tableId); }, table.lastResult ? 4500 : 1500);
    }
  }
}
