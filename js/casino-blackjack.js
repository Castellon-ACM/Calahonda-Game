// Casino: blackjack
    //  BLACKJACK
    // =====================================================================
    let bjPlayerHand = [], bjDealerHand = [], bjBet = 0, bjRoundActive = false;

    function bjDrawCard() {
      const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const suits = ['♠', '♥', '♦', '♣'];
      const rank = ranks[Math.floor(Math.random() * ranks.length)];
      const suit = suits[Math.floor(Math.random() * suits.length)];
      const value = rank === 'A' ? 11 : (['J', 'Q', 'K'].indexOf(rank) !== -1 ? 10 : parseInt(rank, 10));
      return { rank: rank, suit: suit, value: value };
    }

    function bjHandValue(hand) {
      let total = hand.reduce(function (s, c) { return s + c.value; }, 0);
      let aces = hand.filter(function (c) { return c.rank === 'A'; }).length;
      while (total > 21 && aces > 0) { total -= 10; aces--; }
      return total;
    }

    function bjCardHtml(card) {
      const color = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
      return '<div class="bj-card ' + color + '">' + card.rank + card.suit + '</div>';
    }

    function bjRenderHands(hideDealerSecond) {
      const dealerEl = document.getElementById('bj-dealer-hand');
      const playerEl = document.getElementById('bj-player-hand');
      dealerEl.innerHTML = bjDealerHand.map(function (c, i) {
        return (hideDealerSecond && i === 1) ? '<div class="bj-card-back">🂠</div>' : bjCardHtml(c);
      }).join('');
      playerEl.innerHTML = bjPlayerHand.map(bjCardHtml).join('');
      document.getElementById('bj-player-value').textContent = 'Valor: ' + bjHandValue(bjPlayerHand);
      document.getElementById('bj-dealer-value').textContent = hideDealerSecond ? 'Valor: ?' : ('Valor: ' + bjHandValue(bjDealerHand));
    }

    function renderBlackjackGame() {
      bjPlayerHand = []; bjDealerHand = []; bjRoundActive = false;
      document.getElementById('bj-dealer-hand').innerHTML = '';
      document.getElementById('bj-player-hand').innerHTML = '';
      document.getElementById('bj-dealer-value').textContent = '';
      document.getElementById('bj-player-value').textContent = '';
      document.getElementById('bj-result').textContent = '';
      document.getElementById('bj-bet-controls').classList.remove('hidden');
      document.getElementById('bj-actions').classList.add('hidden');
    }

    function bjEndRound(outcome) {
      bjRoundActive = false;
      const fresh = getCurrentUserData();
      let payout = 0, msg = '';
      if (outcome === 'blackjack') { payout = Math.round(bjBet * 2.5); msg = '¡Blackjack! Ganas ' + (payout - bjBet) + ' monedas'; }
      else if (outcome === 'win') { payout = bjBet * 2; msg = '¡Ganas ' + (payout - bjBet) + ' monedas!'; }
      else if (outcome === 'push') { payout = bjBet; msg = 'Empate: recuperas tu apuesta'; }
      else { payout = 0; msg = 'Pierdes la mano'; }
      fresh.coins += payout;
      saveCurrentUserData(fresh);
      updateAllBalances(fresh.coins);
      document.getElementById('bj-result').textContent = msg;
      document.getElementById('bj-actions').classList.add('hidden');
      document.getElementById('bj-bet-controls').classList.remove('hidden');
    }

    document.getElementById('bj-deal-btn').addEventListener('click', function () {
      const resultEl = document.getElementById('bj-result');
      const betAmount = parseInt(document.getElementById('bj-bet-amount').value, 10);

      if (!betAmount || betAmount <= 0) {
        resultEl.textContent = 'Introduce una cantidad válida';
        return;
      }
      const data = getCurrentUserData();
      if (betAmount > data.coins) {
        resultEl.textContent = 'No tienes suficientes monedas';
        return;
      }

      data.coins -= betAmount;
      saveCurrentUserData(data);
      updateAllBalances(data.coins);
      bjBet = betAmount;
      bjRoundActive = true;
      resultEl.textContent = '';

      bjPlayerHand = [bjDrawCard(), bjDrawCard()];
      bjDealerHand = [bjDrawCard(), bjDrawCard()];
      bjRenderHands(true);

      const playerBJ = bjHandValue(bjPlayerHand) === 21;
      if (playerBJ) {
        const dealerBJ = bjHandValue(bjDealerHand) === 21;
        bjRenderHands(false);
        bjEndRound(dealerBJ ? 'push' : 'blackjack');
        return;
      }

      document.getElementById('bj-bet-controls').classList.add('hidden');
      document.getElementById('bj-actions').classList.remove('hidden');
    });

    document.getElementById('bj-hit-btn').addEventListener('click', function () {
      if (!bjRoundActive) return;
      bjPlayerHand.push(bjDrawCard());
      bjRenderHands(true);
      if (bjHandValue(bjPlayerHand) > 21) {
        bjRenderHands(false);
        bjEndRound('lose');
      }
    });

    document.getElementById('bj-stand-btn').addEventListener('click', function () {
      if (!bjRoundActive) return;
      while (bjHandValue(bjDealerHand) < 17) {
        bjDealerHand.push(bjDrawCard());
      }
      bjRenderHands(false);
      const playerVal = bjHandValue(bjPlayerHand);
      const dealerVal = bjHandValue(bjDealerHand);
      let outcome;
      if (dealerVal > 21 || playerVal > dealerVal) outcome = 'win';
      else if (playerVal === dealerVal) outcome = 'push';
      else outcome = 'lose';
      bjEndRound(outcome);
    });

    // =====================================================================
