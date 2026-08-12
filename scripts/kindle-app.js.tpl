/* CertSim Kindle Interactive App — ES5-safe for Experimental Browser / Silk */
(function () {
  'use strict';

  var STORAGE_KEY = 'certsim_kindle_v1';
  var CARDS = window.CERTSIM_CARDS || [];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function paras(s) {
    var parts = String(s || '').split(/\n\n+/);
    var out = [];
    var i;
    for (i = 0; i < parts.length; i++) {
      if (parts[i].replace(/\s/g, '')) {
        out.push('<p>' + esc(parts[i]).replace(/\n/g, '<br/>') + '</p>');
      }
    }
    return out.join('');
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      return {
        mode: parsed.mode || 'home',
        index: parsed.index || 0,
        answers: parsed.answers || {},
        marked: parsed.marked || {},
        sessionCorrect: parsed.sessionCorrect || 0,
        sessionTotal: parsed.sessionTotal || 0
      };
    } catch (e) {
      return defaultState();
    }
  }

  function defaultState() {
    return {
      mode: 'home',
      index: 0,
      answers: {},
      marked: {},
      sessionCorrect: 0,
      sessionTotal: 0
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  var state = loadState();

  function correctChoice(q) {
    var i;
    for (i = 0; i < q.choices.length; i++) {
      if (q.choices[i].correct) return q.choices[i];
    }
    return null;
  }

  function missedList() {
    var out = [];
    var id;
    for (id in state.answers) {
      if (state.answers.hasOwnProperty(id) && state.answers[id].isCorrect === false) {
        out.push(id);
      }
    }
    return out;
  }

  function deckForMode() {
    if (state.mode === 'missed') {
      var missed = missedList();
      var out = [];
      var i, j;
      for (i = 0; i < CARDS.length; i++) {
        for (j = 0; j < missed.length; j++) {
          if (CARDS[i].id === missed[j]) out.push(CARDS[i]);
        }
      }
      return out;
    }
    return CARDS;
  }

  function setMode(mode) {
    state.mode = mode;
    state.index = 0;
    if (mode === 'practice' || mode === 'memory' || mode === 'missed') {
      state.sessionCorrect = 0;
      state.sessionTotal = 0;
    }
    saveState();
    render();
    window.scrollTo(0, 0);
  }

  function go(delta) {
    var deck = deckForMode();
    var next = state.index + delta;
    if (next < 0) next = 0;
    if (next > deck.length - 1) next = deck.length - 1;
    state.index = next;
    saveState();
    render();
    window.scrollTo(0, 0);
  }

  function selectChoice(choiceId) {
    var deck = deckForMode();
    var q = deck[state.index];
    if (!q) return;
    if (state.mode === 'memory') return;
    if (state.answers[q.id] && state.answers[q.id].selectedChoiceId) return;

    var choice = null;
    var i;
    for (i = 0; i < q.choices.length; i++) {
      if (q.choices[i].id === choiceId) choice = q.choices[i];
    }
    if (!choice) return;

    var isCorrect = !!choice.correct;
    state.answers[q.id] = {
      selectedChoiceId: choiceId,
      isCorrect: isCorrect
    };
    state.sessionTotal += 1;
    if (isCorrect) state.sessionCorrect += 1;
    saveState();
    render();
  }

  function toggleMark() {
    var deck = deckForMode();
    var q = deck[state.index];
    if (!q) return;
    if (state.marked[q.id]) delete state.marked[q.id];
    else state.marked[q.id] = true;
    saveState();
    render();
  }

  function resetProgress() {
    if (!window.confirm('Clear saved answers and marks on this device?')) return;
    state = defaultState();
    saveState();
    render();
  }

  function renderHome() {
    var answered = 0;
    var correct = 0;
    var id;
    for (id in state.answers) {
      if (state.answers.hasOwnProperty(id)) {
        answered += 1;
        if (state.answers[id].isCorrect) correct += 1;
      }
    }
    var missed = missedList().length;
    var pct = answered ? Math.round((correct / answered) * 100) : 0;
    var markedCount = 0;
    for (id in state.marked) {
      if (state.marked.hasOwnProperty(id)) markedCount += 1;
    }

    $('screen').innerHTML =
      '<div class="panel">' +
        '<h2>CertSim Memory App</h2>' +
        '<p class="lead">Interactive study on Kindle — same flow as the web app: practice, memory drill, review missed.</p>' +
        '<div class="stats">' +
          '<div><strong>' + answered + '</strong><span>answered</span></div>' +
          '<div><strong>' + pct + '%</strong><span>accuracy</span></div>' +
          '<div><strong>' + missed + '</strong><span>missed</span></div>' +
          '<div><strong>' + markedCount + '</strong><span>marked</span></div>' +
        '</div>' +
        '<button type="button" class="btn primary block" data-go="practice">Practice Mode</button>' +
        '<p class="hint">Tap an answer, see if you are right, read the explanation, then Next.</p>' +
        '<button type="button" class="btn block" data-go="memory">Memory Drill</button>' +
        '<p class="hint">Scenario + correct answer + explanation always visible — for memorizing.</p>' +
        '<button type="button" class="btn block" data-go="missed"' + (missed ? '' : ' disabled') + '>Review Missed (' + missed + ')</button>' +
        '<button type="button" class="btn block ghost" data-go="progress">Progress</button>' +
        '<button type="button" class="btn block ghost" id="resetBtn">Reset device progress</button>' +
        '<p class="meta"><a href="index.html">Static pack home</a> · ' + CARDS.length + ' questions loaded</p>' +
      '</div>';

    bindHome();
  }

  function bindHome() {
    var buttons = $('screen').querySelectorAll('[data-go]');
    var i;
    for (i = 0; i < buttons.length; i++) {
      (function (btn) {
        btn.onclick = function () { setMode(btn.getAttribute('data-go')); };
      })(buttons[i]);
    }
    var reset = $('resetBtn');
    if (reset) reset.onclick = resetProgress;
  }

  function renderProgress() {
    var answered = 0;
    var correct = 0;
    var id;
    for (id in state.answers) {
      if (state.answers.hasOwnProperty(id)) {
        answered += 1;
        if (state.answers[id].isCorrect) correct += 1;
      }
    }
    var rows = '';
    var i, q, a, mark;
    for (i = 0; i < CARDS.length; i++) {
      q = CARDS[i];
      a = state.answers[q.id];
      mark = state.marked[q.id] ? ' ★' : '';
      if (a) {
        rows += '<li><strong>' + esc(q.id) + mark + '</strong> — ' +
          (a.isCorrect ? 'Correct' : 'Missed') +
          ' <button type="button" class="linkish" data-jump="' + i + '">Open</button></li>';
      }
    }
    $('screen').innerHTML =
      '<div class="panel">' +
        '<button type="button" class="btn ghost" data-go="home">← Home</button>' +
        '<h2>Progress</h2>' +
        '<p>' + correct + ' / ' + answered + ' correct' +
          (answered ? ' (' + Math.round((correct / answered) * 100) + '%)' : '') +
          ' · ' + CARDS.length + ' total</p>' +
        '<ul class="toc">' + (rows || '<li>No answers yet — start Practice Mode.</li>') + '</ul>' +
      '</div>';
    bindHome();
    var jumps = $('screen').querySelectorAll('[data-jump]');
    for (i = 0; i < jumps.length; i++) {
      (function (btn) {
        btn.onclick = function () {
          state.mode = 'practice';
          state.index = parseInt(btn.getAttribute('data-jump'), 10) || 0;
          saveState();
          render();
        };
      })(jumps[i]);
    }
  }

  function renderCard() {
    var deck = deckForMode();
    if (!deck.length) {
      $('screen').innerHTML =
        '<div class="panel">' +
          '<button type="button" class="btn ghost" data-go="home">← Home</button>' +
          '<h2>No cards</h2>' +
          '<p>Nothing in this list yet. Practice first, then review missed.</p>' +
        '</div>';
      bindHome();
      return;
    }
    if (state.index > deck.length - 1) state.index = deck.length - 1;

    var q = deck[state.index];
    var ans = state.answers[q.id] || null;
    var isMemory = state.mode === 'memory';
    var revealed = isMemory || !!(ans && ans.selectedChoiceId);
    var correct = correctChoice(q);
    var marked = !!state.marked[q.id];
    var modeLabel = state.mode === 'practice' ? 'Practice' : state.mode === 'missed' ? 'Review Missed' : 'Memory';

    var choicesHtml = '';
    var i, c, cls, tag, canTap;
    for (i = 0; i < q.choices.length; i++) {
      c = q.choices[i];
      cls = 'choice';
      tag = '';
      if (revealed) {
        if (c.correct) {
          cls += ' correct';
          tag = ' <span class="tag">CORRECT</span>';
        } else if (ans && ans.selectedChoiceId === c.id) {
          cls += ' wrong';
          tag = ' <span class="tag">YOURS</span>';
        }
      } else if (ans && ans.selectedChoiceId === c.id) {
        cls += ' selected';
      }
      canTap = !revealed && !isMemory;
      choicesHtml +=
        '<button type="button" class="' + cls + '"' +
        (canTap ? ' data-choice="' + esc(c.id) + '"' : ' disabled') +
        '><span class="letter">' + esc(c.id) + '.</span> ' + esc(c.text) + tag + '</button>';
    }

    var feedback = '';
    if (revealed && !isMemory && ans) {
      feedback =
        '<div class="feedback ' + (ans.isCorrect ? 'ok' : 'bad') + '">' +
          (ans.isCorrect ? 'Correct' : 'Not quite') +
          ' — remember <strong>' + esc(correct.id) + '. ' + esc(correct.text) + '</strong>' +
        '</div>';
    } else if (isMemory && correct) {
      feedback =
        '<div class="feedback ok">Remember: <strong>' + esc(correct.id) + '. ' + esc(correct.text) + '</strong></div>';
    }

    var explain = '';
    if (revealed) {
      explain =
        '<div class="explain"><h3>Explanation</h3>' + paras(q.explanation) + '</div>';
    } else {
      explain = '<p class="hint">Tap a choice to check your answer.</p>';
    }

    // Always show full scenario on the same screen as the question/answer
    var scenario =
      q.scenario
        ? '<div class="scenario"><strong>Scenario — ' + esc(q.groupTitle) + '</strong>' +
            paras(q.scenario) +
          '</div>'
        : '';

    $('screen').innerHTML =
      '<div class="topbar">' +
        '<button type="button" class="btn ghost small" data-go="home">Home</button>' +
        '<span class="mode">' + esc(modeLabel) + '</span>' +
        '<button type="button" class="btn ghost small" id="markBtn">' + (marked ? 'Marked ★' : 'Mark') + '</button>' +
      '</div>' +
      '<div class="progressline">' +
        'Card <strong>' + (state.index + 1) + '</strong> / ' + deck.length +
        ' · Session <strong>' + state.sessionCorrect + '</strong>/' + state.sessionTotal +
        (state.sessionTotal ? ' (' + Math.round((state.sessionCorrect / state.sessionTotal) * 100) + '%)' : '') +
        ' · ' + esc(q.id) +
      '</div>' +
      '<div class="panel card">' +
        scenario +
        '<h2 class="stem">Question</h2>' +
        paras(q.stem) +
        '<div class="choices">' + choicesHtml + '</div>' +
        feedback +
        explain +
      '</div>' +
      '<div class="nav">' +
        '<button type="button" class="btn" id="prevBtn"' + (state.index === 0 ? ' disabled' : '') + '>← Prev</button>' +
        '<button type="button" class="btn primary" id="nextBtn">' +
          (state.index >= deck.length - 1 ? 'Done ✓' : 'Next →') +
        '</button>' +
      '</div>';

    bindHome();
    $('prevBtn').onclick = function () { go(-1); };
    $('nextBtn').onclick = function () {
      if (state.index >= deck.length - 1) setMode('home');
      else go(1);
    };
    $('markBtn').onclick = toggleMark;

    var choiceBtns = $('screen').querySelectorAll('[data-choice]');
    for (i = 0; i < choiceBtns.length; i++) {
      (function (btn) {
        btn.onclick = function () { selectChoice(btn.getAttribute('data-choice')); };
      })(choiceBtns[i]);
    }
  }

  function render() {
    if (!CARDS.length) {
      $('screen').innerHTML = '<div class="panel"><h2>No questions loaded</h2></div>';
      return;
    }
    if (state.mode === 'home') renderHome();
    else if (state.mode === 'progress') renderProgress();
    else renderCard();
  }

  document.addEventListener('DOMContentLoaded', render);
  if (document.readyState !== 'loading') render();
})();
