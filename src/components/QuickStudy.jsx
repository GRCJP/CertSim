import React, { useMemo, useState } from 'react';
import { useTestMode } from '../contexts/TestModeContext';
import { splitScenario, groupByScenario, getCorrectChoice } from '../lib/scenarioUtils';

/**
 * Focused study mode: one question at a time, self-test then reveal.
 * Optimized for learning speed — large type, minimal chrome, scenario once.
 */
const QuickStudy = ({ questions = [] }) => {
  const {
    darkMode,
    textSize,
    recordAttempt,
    setMode,
    markedQuestions = [],
    markQuestion,
  } = useTestMode();

  const groups = useMemo(() => groupByScenario(questions), [questions]);
  const flat = useMemo(
    () => groups.flatMap((g) => g.questions.map((q) => ({ ...q, groupTitle: g.title, groupId: g.id }))),
    [groups]
  );

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('all'); // all | marked | scenario
  const [scenarioFilter, setScenarioFilter] = useState(groups[0]?.id || '');
  const [sessionStats, setSessionStats] = useState({ answered: 0, correct: 0 });

  const markedIds = useMemo(() => {
    if (!markedQuestions) return new Set();
    if (markedQuestions instanceof Map) return new Set(markedQuestions.keys());
    if (Array.isArray(markedQuestions)) {
      return new Set(markedQuestions.map((m) => m.id || m));
    }
    return new Set();
  }, [markedQuestions]);

  const deck = useMemo(() => {
    if (filter === 'marked') {
      return flat.filter((q) => markedIds.has(q.id));
    }
    if (filter === 'scenario') {
      return flat.filter((q) => q.groupId === scenarioFilter);
    }
    return flat;
  }, [flat, filter, markedIds, scenarioFilter]);

  const resetCard = () => {
    setIndex(0);
    setRevealed(false);
    setSelectedId(null);
  };

  const changeFilter = (next) => {
    setFilter(next);
    resetCard();
  };

  const changeScenarioFilter = (next) => {
    setScenarioFilter(next);
    resetCard();
  };

  const safeIndex = deck.length ? Math.min(index, deck.length - 1) : 0;
  const q = deck[safeIndex] || null;
  const correct = q ? getCorrectChoice(q) : null;
  const isMarked = Boolean(q && markedIds.has(q.id));
  const prevScenario = safeIndex > 0 ? deck[safeIndex - 1]?.scenario : '';
  const showScenario = Boolean(q?.scenario && q.scenario !== prevScenario);

  const selectChoice = (choice) => {
    if (revealed || !q) return;
    setSelectedId(choice.id);
    setRevealed(true);
    const isCorrect = Boolean(choice.correct);
    setSessionStats((s) => ({
      answered: s.answered + 1,
      correct: s.correct + (isCorrect ? 1 : 0),
    }));
    if (typeof recordAttempt === 'function') {
      recordAttempt(q, choice.id, isCorrect, 'quickStudy');
    }
  };

  const go = (delta) => {
    const next = Math.min(Math.max(safeIndex + delta, 0), Math.max(deck.length - 1, 0));
    setIndex(next);
    setRevealed(false);
    setSelectedId(null);
  };

  const sizeClass =
    textSize === 'large' ? 'text-lg' : textSize === 'small' ? 'text-sm' : 'text-base';

  if (!questions.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p>No questions loaded.</p>
      </div>
    );
  }

  return (
    <div className={`max-w-3xl mx-auto px-4 py-4 ${sizeClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Quick Study
          </h1>
          <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Self-test, then reveal. Built for fast exam drills.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMode('dashboard')}
          className={`px-3 py-2 text-sm rounded-lg border ${
            darkMode ? 'border-slate-600 text-slate-200' : 'border-slate-300 text-slate-700'
          }`}
        >
          ← Home
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { id: 'all', label: 'All questions' },
          { id: 'scenario', label: 'By scenario' },
          { id: 'marked', label: 'Marked only' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => changeFilter(f.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              filter === f.id
                ? 'bg-teal-700 text-white'
                : darkMode
                  ? 'bg-slate-800 text-slate-200'
                  : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter === 'scenario' && (
        <select
          value={scenarioFilter}
          onChange={(e) => changeScenarioFilter(e.target.value)}
          className={`w-full mb-4 px-3 py-2 rounded-lg border ${
            darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300'
          }`}
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title} ({g.questions.length})
            </option>
          ))}
        </select>
      )}

      <div
        className={`rounded-xl p-3 mb-4 flex flex-wrap gap-4 text-sm ${
          darkMode ? 'bg-slate-800' : 'bg-white border border-slate-200'
        }`}
      >
        <span>
          Card <strong>{deck.length ? safeIndex + 1 : 0}</strong> / {deck.length}
        </span>
        <span>
          Session: <strong>{sessionStats.correct}</strong>/{sessionStats.answered} correct
          {sessionStats.answered > 0
            ? ` (${Math.round((sessionStats.correct / sessionStats.answered) * 100)}%)`
            : ''}
        </span>
      </div>

      {!q ? (
        <div className={`rounded-xl p-6 ${darkMode ? 'bg-slate-800' : 'bg-white border'}`}>
          <p>No cards in this filter. Mark questions while studying, or switch to All.</p>
        </div>
      ) : (
        <div className={`rounded-xl p-5 sm:p-6 ${darkMode ? 'bg-slate-800' : 'bg-white border border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-start gap-3 mb-3">
            <p className={`text-xs font-semibold tracking-wide uppercase ${darkMode ? 'text-teal-300' : 'text-teal-800'}`}>
              {q.id} · {q.groupTitle}
            </p>
            <button
              type="button"
              onClick={() => markQuestion?.(q.id)}
              className={`text-xs px-2 py-1 rounded border ${
                isMarked
                  ? 'bg-amber-500 text-black border-amber-600'
                  : darkMode
                    ? 'border-slate-500 text-slate-300'
                    : 'border-slate-300 text-slate-600'
              }`}
            >
              {isMarked ? 'Marked' : 'Mark'}
            </button>
          </div>

          {showScenario && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm leading-relaxed ${
                darkMode ? 'bg-slate-900/60 border border-slate-600' : 'bg-stone-50 border border-stone-200'
              }`}
            >
              <p className="font-semibold mb-2">Scenario — read once</p>
              {q.scenario.split('\n\n').map((p, i) => (
                <p key={i} className="mb-2 last:mb-0">
                  {p}
                </p>
              ))}
            </div>
          )}

          {!showScenario && q.scenario && (
            <p className={`text-xs mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Continuing scenario: {q.groupTitle}
            </p>
          )}

          <div className={`leading-relaxed mb-5 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {(q.stem || splitScenario(q.question).stem).split('\n\n').map((p, i) => (
              <p key={i} className="mb-2 last:mb-0 font-medium">
                {p}
              </p>
            ))}
          </div>

          <div className="space-y-2 mb-5">
            {q.choices.map((choice) => {
              let style = darkMode
                ? 'border-slate-600 hover:bg-slate-700'
                : 'border-slate-300 hover:bg-stone-50';
              if (revealed) {
                if (choice.correct) style = 'border-emerald-600 bg-emerald-50 text-emerald-950';
                else if (selectedId === choice.id)
                  style = 'border-rose-600 bg-rose-50 text-rose-950';
                else style = darkMode ? 'border-slate-700 opacity-60' : 'border-slate-200 opacity-70';
              } else if (selectedId === choice.id) {
                style = 'border-teal-600 bg-teal-50';
              }
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => selectChoice(choice)}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${style}`}
                >
                  <span className="font-bold mr-2">{choice.id}.</span>
                  {choice.text}
                </button>
              );
            })}
          </div>

          {!revealed && (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="w-full py-3 rounded-lg bg-teal-800 text-white font-semibold mb-4"
            >
              Reveal answer without selecting
            </button>
          )}

          {revealed && (
            <div
              className={`rounded-lg p-4 mb-4 ${
                darkMode ? 'bg-slate-900 border border-slate-600' : 'bg-stone-50 border border-stone-200'
              }`}
            >
              <p className="font-semibold mb-2">
                Correct: {correct?.id}. {correct?.text}
              </p>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {q.explanation}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={safeIndex === 0}
              onClick={() => go(-1)}
              className={`flex-1 py-3 rounded-lg font-semibold disabled:opacity-40 ${
                darkMode ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-900'
              }`}
            >
              ← Previous
            </button>
            <button
              type="button"
              disabled={safeIndex >= deck.length - 1}
              onClick={() => go(1)}
              className="flex-1 py-3 rounded-lg font-semibold bg-teal-700 text-white disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickStudy;
