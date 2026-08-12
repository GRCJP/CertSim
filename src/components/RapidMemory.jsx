import React, { useState, useEffect } from 'react';
import { useTestMode } from '../contexts/TestModeContext';

// Questions embed their (often lengthy) scenario as the leading paragraph(s),
// with the actual question as the final paragraph. Split them so the scenario
// can be shown once per group and collapsed on the follow-up questions.
const splitScenario = (text) => {
  const parts = (text || '').split('\n\n');
  if (parts.length <= 1) return { scenario: '', stem: text || '' };
  return { scenario: parts.slice(0, -1).join('\n\n'), stem: parts[parts.length - 1] };
};

const RapidMemory = ({ questions }) => {
  const { textSize, darkMode, markQuestion, markedQuestions, rapidIndex, setRapidIndex } = useTestMode();
  const [currentQuestion, setCurrentQuestion] = useState(rapidIndex);
  const [scenarioOpen, setScenarioOpen] = useState(true);

  // Save current index when it changes
  useEffect(() => {
    setRapidIndex(currentQuestion);
  }, [currentQuestion, setRapidIndex]);

  // Auto-expand the scenario for a new scenario group; auto-collapse when the
  // current question repeats the previous question's scenario.
  useEffect(() => {
    const cur = questions?.[currentQuestion];
    const prev = currentQuestion > 0 ? questions?.[currentQuestion - 1] : null;
    const curScenario = splitScenario(cur?.question).scenario;
    const prevScenario = prev ? splitScenario(prev.question).scenario : '';
    setScenarioOpen(!(curScenario && curScenario === prevScenario));
  }, [currentQuestion, questions]);

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  // const handleJump = (index) => {
//   setCurrentQuestion(index);
// };

  // Safe access to current question
  const q = questions && questions.length > 0 && currentQuestion >= 0 && currentQuestion < questions.length 
    ? questions[currentQuestion] 
    : null;
  const correctChoice = q ? q.choices.find(c => c.correct) : null;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-4`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className={`rounded-lg p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Memory Drill</h1>
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
              {currentQuestion + 1} / {questions.length}
            </span>
          </div>
          <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
            Memorize in one view: scenario, question, correct answer (highlighted), and explanation — no flipping.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className={`px-4 py-2 rounded-lg ${
              currentQuestion === 0
                ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                : darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            Previous
          </button>

          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Practice
          </button>

          <button
            onClick={handleNext}
            disabled={currentQuestion === questions.length - 1}
            className={`px-4 py-2 rounded-lg ${
              currentQuestion === questions.length - 1
                ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                : darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            Next
          </button>
        </div>

        {/* Question Card */}
        <div className={`rounded-lg p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
              {q.domain || 'General'} {q.important && '*'}
            </div>
            <button
              onClick={() => markQuestion(q.id)}
              className={`px-3 py-1 rounded text-sm ${
                markedQuestions.has(q.id)
                  ? 'bg-yellow-500 text-white'
                  : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {markedQuestions.has(q.id) ? 'Marked' : 'Mark for Review'}
            </button>
          </div>
          
          {(() => {
            const { scenario, stem } = splitScenario(q.question);
            const prev = currentQuestion > 0 ? questions[currentQuestion - 1] : null;
            const sameScenarioAsPrev = Boolean(scenario) && scenario === splitScenario(prev?.question).scenario;
            const sizeCls = textSize === 'sm' ? 'text-sm' : textSize === 'lg' ? 'text-lg' : textSize === 'xl' ? 'text-xl' : '';
            return (
              <>
                {scenario && (
                  <div className={`mb-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-gray-50'}`}>
                    <button
                      type="button"
                      onClick={() => setScenarioOpen(o => !o)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}
                    >
                      <span>📄 Scenario{sameScenarioAsPrev ? ' — same as previous question' : ''}</span>
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{scenarioOpen ? 'Hide ▲' : 'Show ▼'}</span>
                    </button>
                    {scenarioOpen && (
                      <p className={`px-4 pb-4 whitespace-pre-line ${sizeCls} ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {scenario}
                      </p>
                    )}
                  </div>
                )}
                <h2 className={`font-semibold mb-6 ${textSize === 'sm' ? 'text-base' : textSize === 'lg' ? 'text-2xl' : textSize === 'xl' ? 'text-3xl' : 'text-xl'}`}>
                  {stem}
                </h2>
              </>
            );
          })()}

          <div className="border-t pt-6">
            <div className="space-y-3">
              {q.choices.map((choice, index) => (
                <div 
                  key={choice.id}
                  className={`p-4 rounded-lg border-2 ${
                    choice.correct
                      ? darkMode 
                        ? 'border-green-400 bg-green-900/30' 
                        : 'border-green-500 bg-green-50'
                      : darkMode 
                        ? 'border-gray-600 bg-gray-700/50' 
                        : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className={`font-medium ${textSize === 'sm' ? 'text-sm' : textSize === 'lg' ? 'text-lg' : textSize === 'xl' ? 'text-xl' : ''} ${
                    choice.correct
                      ? darkMode ? 'text-white' : 'text-gray-900'
                      : darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {choice.id}. {choice.text}
                    {choice.correct && (
                      <span className="ml-2 inline-block rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white align-middle">
                        ✓ Correct
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Explanation — always shown */}
          {q.explanation && (
            <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="font-semibold mb-2">Explanation:</h3>
              <p className={`${textSize === 'sm' ? 'text-sm' : textSize === 'lg' ? 'text-lg' : textSize === 'xl' ? 'text-xl' : ''} whitespace-pre-line`}>
                {q.explanation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RapidMemory;
