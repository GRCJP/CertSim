import React, { useState, useMemo, useEffect } from 'react';
import { useTestMode } from '../contexts/TestModeContext';

const MissedCoach = () => {
  // Defensive: Ensure context values are properly destructured with defaults
  const { 
    darkMode = false, 
    textSize = 'base',
    missedQueue = [],
    missedMeta = {},
    questions = [],
    recordAttempt = () => {},
    setMode = () => {},
    resetToDashboard = () => {},
    setMissedQueue = () => {},
    setMissedMeta = () => {},
    clearMissed = () => {},
    resetProgress = () => {},
  } = useTestMode() || {};
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [fixedToday, setFixedToday] = useState(0);
  const [attempts, setAttempts] = useState({});

  // Build session list from missedQueue
  useEffect(() => {
    if (!missedQueue || missedQueue.length === 0) {
      setSessionQuestions([]);
      return;
    }

    // Create questionsById lookup for safe access
    const questionsById = {};
    if (questions && Array.isArray(questions)) {
      questions.forEach(q => {
        if (q && q.id) {
          questionsById[q.id] = q;
        }
      });
    }

    // Map missedQueue ids to questions, filtering out missing ones
    const validQuestions = [];
    const missingIds = [];
    
    missedQueue.forEach(id => {
      if (questionsById[id]) {
        validQuestions.push(questionsById[id]);
      } else {
        missingIds.push(id);
      }
    });

    // Remove missing ids from missedQueue and log once
    if (missingIds.length > 0) {
      console.log(`⚠️ Removing ${missingIds.length} missing question(s) from missedQueue:`, missingIds);
      setMissedQueue(prev => prev.filter(queueId => !missingIds.includes(queueId)));
    }

    // Take first 10 questions for session
    const sessionList = validQuestions.slice(0, 10);
    setSessionQuestions(sessionList);
    setCurrentQuestion(0);
    setShowExplanation(false);
    setSessionComplete(false);
    setFixedToday(0);
    setAttempts({});
  }, [missedQueue, questions, setMissedQueue]);

  // Defensive: Use useMemo for safe access to current question with proper null checks
  const q = useMemo(() => {
    if (!sessionQuestions || !Array.isArray(sessionQuestions)) {
      return null;
    }
    
    if (sessionQuestions.length === 0) {
      return null;
    }
    
    if (typeof currentQuestion !== 'number' || currentQuestion < 0) {
      return null;
    }
    
    if (currentQuestion >= sessionQuestions.length) {
      return null;
    }
    
    const question = sessionQuestions[currentQuestion];
    
    if (!question || typeof question !== 'object') {
      return null;
    }
    
    return question;
  }, [sessionQuestions, currentQuestion]);

  const handleAnswer = (selectedChoice) => {
    if (!q || !q.id) return;

    const isCorrect = selectedChoice === q.correct;
    
    // Record attempt
    setAttempts(prev => ({
      ...prev,
      [q.id]: {
        ...prev[q.id],
        selectedChoice,
        isCorrect,
        answeredAt: new Date().toISOString()
      }
    }));

    if (isCorrect) {
      // Increment correctRepCount for this session run
      setMissedMeta(prev => ({
        ...prev,
        [q.id]: {
          ...prev[q.id],
          correctRepCount: (prev[q.id]?.correctRepCount || 0) + 1
        }
      }));

      // Check if question should graduate (2 correct answers)
      const currentRepCount = (missedMeta[q.id]?.correctRepCount || 0) + 1;
      if (currentRepCount >= 2) {
        // Remove from missedQueue (graduation)
        setMissedQueue(prev => prev.filter(id => id !== q.id));
        setMissedMeta(prev => {
          const newMeta = { ...prev };
          delete newMeta[q.id];
          return newMeta;
        });
        setFixedToday(prev => prev + 1);
      }

      // Move to next question after delay
      setTimeout(() => {
        if (currentQuestion < sessionQuestions.length - 1) {
          setCurrentQuestion(prev => prev + 1);
          setShowExplanation(false);
        } else {
          // Session complete
          setSessionComplete(true);
        }
      }, 1000);
    } else {
      // Show correct answer and reinsert same question 3 positions later
      setShowExplanation(true);
      
      // Reinsert question 3 positions later in session list
      if (currentQuestion < sessionQuestions.length - 3) {
        setSessionQuestions(prev => {
          const newList = [...prev];
          newList.splice(currentQuestion + 3, 0, q);
          return newList;
        });
      }
    }

    // Record to overall stats
    recordAttempt(q, q.id, isCorrect, 'missedCoach');
  };

  const handleNext = () => {
    if (currentQuestion < sessionQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setShowExplanation(false);
    } else {
      setSessionComplete(true);
    }
  };

  const handleBackToDashboard = () => {
    resetToDashboard();
  };

  const handleBackToDrills = () => {
    console.log('🔙 Going back to Daily Drills from MissedCoach');
    setMode('dailyDrills');
  };

  const handleReset = () => {
    if (window.confirm('⚠️ COMPLETE RESET - Are you sure? This will clear:\n\n• All missed questions and queue\n• All progress and statistics\n• Study streaks and history\n• Question mastery and domain stats\n• Study plan and readiness data\n• Daily goals and progress\n• All practice sessions\n\n⚠️ This action cannot be undone!')) {
      console.log('🧹 Performing complete reset of all study data');
      
      // Clear all missed questions data
      clearMissed();
      
      // Reset all progress and study data
      resetProgress();
      
      // Clear session state
      setSessionQuestions([]);
      setCurrentQuestion(0);
      setShowExplanation(false);
      setSessionComplete(false);
      setFixedToday(0);
      setAttempts({});
      
      // Clear localStorage study data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cmmc_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('🧹 Cleared localStorage keys:', keysToRemove);
      
      // Go back to dashboard with fresh state
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  if (sessionQuestions.length === 0) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-slate-900'} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-8 text-center`}>
            <h2 className="text-2xl font-bold mb-4">🎯 No Missed Questions</h2>
            <p className={`mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Great job! You don't have any missed questions to practice.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleBackToDrills}
                className={`px-6 py-3 rounded-lg font-medium ${
                  darkMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Back to Drills
              </button>
              <button
                onClick={handleReset}
                className={`px-6 py-3 rounded-lg font-medium ${
                  darkMode 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                title="Complete reset - clear ALL study data and start over"
              >
                🗑️ Reset All Data
              </button>
              <button
                onClick={handleBackToDashboard}
                className={`px-6 py-3 rounded-lg font-medium ${
                  darkMode 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-slate-900'} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-8 text-center`}>
            <h2 className="text-2xl font-bold mb-4">🎉 Session Complete!</h2>
            <div className="space-y-4 mb-6">
              <p className={`text-lg ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Fixed Today: <span className="font-bold text-green-500">{fixedToday}</span>
              </p>
              <p className={`text-lg ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Remaining in Queue: <span className="font-bold text-orange-500">{missedQueue.length}</span>
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className={`px-6 py-3 rounded-lg font-medium ${
                  darkMode 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                Start New Session
              </button>
              <button
                onClick={handleBackToDrills}
                className={`px-6 py-3 rounded-lg font-medium ${
                  darkMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Back to Drills
              </button>
              <button
                onClick={handleReset}
                className={`px-6 py-3 rounded-lg font-medium ${
                  darkMode 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                title="Complete reset - clear ALL study data and start over"
              >
                🗑️ Reset All Data
              </button>
              <button
                onClick={handleBackToDashboard}
                className={`px-6 py-3 rounded-lg font-medium ${
                  darkMode 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-slate-900'} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-8 text-center`}>
            <h2 className="text-2xl font-bold mb-4">Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  const currentAttempt = attempts[q.id];
  const hasAnswered = currentAttempt !== undefined;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-slate-900'} p-4`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-6 mb-6`}>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">🎯 Missed Questions Coach</h1>
            <div className="flex gap-2">
              <button
                onClick={handleBackToDrills}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  darkMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                ← Back to Drills
              </button>
              <button
                onClick={handleReset}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  darkMode 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                title="Complete reset - clear ALL study data and start over"
              >
                🗑️ Reset All
              </button>
              <button
                onClick={handleBackToDashboard}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  darkMode 
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Exit
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
              Question {currentQuestion + 1} of {sessionQuestions.length}
            </span>
            <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
              Queue: {missedQueue.length}
            </span>
          </div>
        </div>

        {/* Question */}
        <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-6 mb-6`}>
          <div className="mb-4">
            <span className={`text-sm font-medium px-3 py-1 rounded-lg ${
              darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
            }`}>
              {q.domain || 'General'} {q.important && '*'}
            </span>
          </div>
          
          <div className={`text-lg mb-6 leading-relaxed ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {q.question}
          </div>

          {/* Choices */}
          <div className="space-y-3">
            {q.choices.map((choice, index) => {
              const isSelected = currentAttempt?.selectedChoice === choice.id;
              const isCorrect = choice.correct;
              const showResult = hasAnswered;
              
              let buttonClass = `w-full text-left p-4 rounded-lg border transition-all ${
                darkMode ? 'border-slate-600' : 'border-gray-200'
              }`;
              
              if (showResult) {
                if (isCorrect) {
                  buttonClass += ` ${darkMode ? 'bg-green-900/30 border-green-500 text-green-200' : 'bg-green-50 border-green-200 text-green-700'}`;
                } else if (isSelected && !isCorrect) {
                  buttonClass += ` ${darkMode ? 'bg-red-900/30 border-red-500 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`;
                }
              } else {
                buttonClass += ` ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`;
              }
              
              return (
                <button
                  key={choice.id}
                  onClick={() => !hasAnswered && handleAnswer(choice.id)}
                  disabled={hasAnswered}
                  className={buttonClass}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{choice.id}. {choice.text}</span>
                    {showResult && isCorrect && (
                      <span className="text-sm font-medium">✓</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && q.explanation && (
            <div className={`mt-6 p-4 rounded-lg ${
              darkMode ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
            }`}>
              <h4 className="font-medium mb-2 text-blue-600 dark:text-blue-400">Explanation:</h4>
              <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {q.explanation}
              </p>
            </div>
          )}

          {/* Next Button */}
          {hasAnswered && !showExplanation && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleNext}
                className={`px-6 py-3 rounded-lg font-medium ${
                  darkMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MissedCoach;
