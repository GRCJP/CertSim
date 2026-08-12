import React, { useState, useMemo, useEffect } from 'react';
import { useTestMode } from '../contexts/TestModeContext';

// Fisher-Yates shuffle algorithm for better randomization
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = a[i];
    a[i] = a[j];
    a[j] = temp;
  }
  return a;
};

// Shuffle answer choices for better memorization
const shuffleChoices = (choices) => {
  if (!choices || !Array.isArray(choices)) return [];
  
  // Create array with choices and their original positions for consistent letter mapping
  const shuffled = shuffle(choices.map((choice, originalIndex) => ({ ...choice, originalIndex })));
  
  return shuffled;
};

const ReviewMissed = () => {
  // Defensive: Ensure context values are properly destructured with defaults
  const { 
    darkMode = false, 
    textSize = 'base',
    missedQuestions = [], 
    markedQuestions = new Set(),
    recordAttempt = () => {},
    clearMissed = () => {},
    removeFromMissed = () => {},
    setMode = () => {},
  } = useTestMode() || {};
  
  // Pocket Prep-style features
  // Safe clear missed function with confirmation
  const handleClearMissed = () => {
    if (window.confirm('⚠️ Are you sure you want to clear all missed questions?\n\nThis will remove your entire missed question history and cannot be undone.')) {
      console.log('🧹 User confirmed - clearing missed questions');
      clearMissed();
    } else {
      console.log('🧹 User cancelled - keeping missed questions');
    }
  };
  const [selectedCount, setSelectedCount] = useState(10);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [showScoreSummary, setShowScoreSummary] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showExplanation, setShowExplanation] = useState(true); // Show explanations by default for memorization
  const [attemptsById, setAttemptsById] = useState(() => {
    // Load attempts from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reviewMissedAttempts');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  
  // Filter missed questions to only show test questions for memory section
  const testMissedQuestions = useMemo(() => {
    return missedQuestions.filter(q => q.isTestQuestion !== false);
  }, [missedQuestions]);

  // Calculate session score
  const sessionScore = useMemo(() => {
    if (!sessionStarted || sessionQuestions.length === 0) return null;
    const answered = sessionQuestions.filter(q => attemptsById[q.id]);
    const correct = answered.filter(q => attemptsById[q.id]?.isCorrect);
    return {
      total: sessionQuestions.length,
      answered: answered.length,
      correct: correct.length,
      percentage: answered.length > 0 ? Math.round((correct.length / answered.length) * 100) : 0
    };
  }, [sessionStarted, sessionQuestions, attemptsById]);
  
  // Start review session with selected number of questions
  const startSession = () => {
    const questionsToReview = testMissedQuestions.slice(0, selectedCount);
    setSessionQuestions(questionsToReview);
    setSessionStarted(true);
    setCurrentQuestion(0);
    setAttemptsById({}); // Reset attempts for new session
  };
  
  // Complete session and show score
  const completeSession = () => {
    setShowScoreSummary(true);
  };
  
  // Reset session
  const resetSession = () => {
    setSessionStarted(false);
    setSessionQuestions([]);
    setShowScoreSummary(false);
    setCurrentQuestion(0);
    setAttemptsById({});
  };

  // Save attempts to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('reviewMissedAttempts', JSON.stringify(attemptsById));
    }
  }, [attemptsById]);

  // Defensive: Use useMemo for safe access to current question with proper null checks
  const q = useMemo(() => {
    // Use sessionQuestions if session is active, otherwise use all missedQuestions
    const questionsToUse = sessionStarted ? sessionQuestions : missedQuestions;
    
    // Defensive: Ensure all variables are valid before accessing
    if (!questionsToUse || !Array.isArray(questionsToUse)) {
      return null;
    }
    
    if (questionsToUse.length === 0) {
      return null;
    }
    
    if (typeof currentQuestion !== 'number' || currentQuestion < 0) {
      return null;
    }
    
    if (currentQuestion >= questionsToUse.length) {
      return null;
    }
    
    const question = questionsToUse[currentQuestion];
    
    // Defensive: Ensure question has required properties
    if (!question || typeof question !== 'object') {
      console.log('🔍 ReviewMissed - Invalid question object:', question);
      return null;
    }
    
    // Check for required properties
    const requiredProps = ['id', 'question', 'choices'];
    const missingProps = requiredProps.filter(prop => !(prop in question));
    if (missingProps.length > 0) {
      console.log('🔍 ReviewMissed - Question missing required properties:', missingProps);
      console.log('🔍 ReviewMissed - Available properties:', Object.keys(question));
      return null;
    }
    
    return question;
  }, [sessionStarted, sessionQuestions, missedQuestions, currentQuestion]);

  // Memoize shuffled choices to prevent re-shuffling on every render
  const shuffledChoices = useMemo(() => {
    if (!q?.choices) return [];
    return shuffleChoices(q.choices);
  }, [q?.id]); // Only re-shuffle when question changes

  // Auto-advance if current question was answered correctly and removed
  React.useEffect(() => {
    if (q && !missedQuestions.some(mq => mq.id === q.id)) {
      if (currentQuestion >= missedQuestions.length && missedQuestions.length > 0) {
        setCurrentQuestion(Math.max(0, missedQuestions.length - 1));
      }
    }
  }, [missedQuestions, currentQuestion, q]);

  // Show question count selector if session hasn't started
  if (!sessionStarted && missedQuestions.length > 0) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-4`}>
        <div className="max-w-2xl mx-auto">
          <div className={`rounded-lg p-8 ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
            <h1 className="text-3xl font-bold mb-2">Review Missed Questions</h1>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-8`}>
              Memory Section: {testMissedQuestions.length} test question{testMissedQuestions.length !== 1 ? 's' : ''} to review ⭐
            </p>
            
            <div className="mb-8">
              <label className="block text-lg font-semibold mb-4">
                How many questions would you like to review?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[5, 10, 15, 20, testMissedQuestions.length].filter((val, idx, arr) => arr.indexOf(val) === idx && val <= testMissedQuestions.length).map(count => (
                  <button
                    key={count}
                    onClick={() => setSelectedCount(count)}
                    className={`p-4 rounded-lg font-semibold transition-all ${
                      selectedCount === count
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : darkMode 
                          ? 'bg-gray-700 hover:bg-gray-600' 
                          : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {count === missedQuestions.length ? 'All' : count}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={startSession}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Start Review ({selectedCount} question{selectedCount !== 1 ? 's' : ''})
              </button>
              <button
                  onClick={() => markedQuestions.size > 0 && setMode('reviewMarked')}
                  disabled={markedQuestions.size === 0}
                  className={`px-6 py-3 rounded-lg font-semibold ${
                    markedQuestions.size === 0
                      ? darkMode 
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : darkMode 
                        ? 'bg-amber-600 text-white hover:bg-amber-700' 
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                >
                  🎯 Review Marked ({markedQuestions.size})
                </button>
              <button
                onClick={() => window.location.reload()}
                className={`px-6 py-3 rounded-lg font-semibold ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (missedQuestions.length === 0) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className={`rounded-lg p-12 text-center ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
            <h1 className="text-2xl font-bold mb-4">No Missed Questions</h1>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-8`}>
              You haven't missed any questions yet. Keep practicing!
            </p>
            <button
              onClick={() => setMode('dailyDrills')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Daily Drills
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Show score summary after completing session
  if (showScoreSummary && sessionScore) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-4`}>
        <div className="max-w-2xl mx-auto">
          <div className={`rounded-lg p-8 text-center ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
            <div className="text-6xl mb-4">
              {sessionScore.percentage >= 80 ? '🎉' : sessionScore.percentage >= 60 ? '👍' : '📚'}
            </div>
            <h1 className="text-3xl font-bold mb-2">Session Complete!</h1>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-8`}>
              Here's how you did:
            </p>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="text-3xl font-bold text-blue-500">{sessionScore.answered}</div>
                <div className="text-sm mt-2">Answered</div>
              </div>
              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="text-3xl font-bold text-green-500">{sessionScore.correct}</div>
                <div className="text-sm mt-2">Correct</div>
              </div>
              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="text-3xl font-bold text-purple-500">{sessionScore.percentage}%</div>
                <div className="text-sm mt-2">Score</div>
              </div>
            </div>
            
            <div className={`p-4 rounded-lg mb-8 ${
              sessionScore.percentage >= 80 
                ? darkMode ? 'bg-green-900/30' : 'bg-green-100'
                : sessionScore.percentage >= 60
                  ? darkMode ? 'bg-yellow-900/30' : 'bg-yellow-100'
                  : darkMode ? 'bg-red-900/30' : 'bg-red-100'
            }`}>
              <p className="font-semibold">
                {sessionScore.percentage >= 80 
                  ? '🌟 Excellent work! You\'re mastering these questions!'
                  : sessionScore.percentage >= 60
                    ? '💪 Good progress! Keep reviewing to improve.'
                    : '📖 Keep practicing! Review the explanations carefully.'}
              </p>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={resetSession}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Review More Questions
              </button>
              <button
                onClick={() => setMode('dashboard')}
                className={`px-6 py-3 rounded-lg font-semibold ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const attempt = attemptsById[q?.id] || { selectedChoiceId: null, isCorrect: null };
  
  // Debug: Log attempt state
  console.log('🔍 ReviewMissed - Current attempt:', attempt);
  console.log('🔍 ReviewMissed - attemptsById:', attemptsById);
  console.log('🔍 ReviewMissed - q.id:', q?.id);

  // If no valid question, show loading/error state
  if (!q) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className={`rounded-lg p-12 text-center ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
            <h1 className="text-2xl font-bold mb-4">Question Not Available</h1>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-8`}>
              The question you're trying to access is not available. Please go back and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSelectChoice = (choiceId, isCorrect) => {
    // Defensive: Ensure q exists and has valid id before proceeding
    if (!q || !q.id) {
      console.error('Invalid question object in handleSelectChoice');
      return;
    }
    
    // Defensive: Validate choiceId and isCorrect parameters
    if (choiceId === undefined || choiceId === null || isCorrect === undefined) {
      console.error('Invalid parameters in handleSelectChoice');
      return;
    }

    try {
      // Update attempt state
      setAttemptsById(prev => ({
        ...prev,
        [q.id]: { selectedChoiceId: choiceId, isCorrect }
      }));

      // Use the single source of truth for recording attempts
      recordAttempt(q, choiceId, isCorrect, 'reviewMissed');
    } catch (error) {
      console.error('Error in handleSelectChoice:', error);
    }
  };

  const handleNext = () => {
    const questionsToUse = sessionStarted ? sessionQuestions : missedQuestions;
    
    // Check if this is the last question in the session
    if (currentQuestion >= questionsToUse.length - 1) {
      // If in a session and all questions answered, show score summary
      if (sessionStarted && sessionScore && sessionScore.answered === sessionQuestions.length) {
        completeSession();
      }
      return;
    }
    
    // Navigate to next question
    setCurrentQuestion(prev => prev + 1);
    // Keep explanation visible for memorization
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      // Keep explanation visible for memorization
    }
  };

  const handleJump = (index) => {
    // Defensive: Validate index parameter
    if (typeof index !== 'number' || index < 0) {
      return;
    }
    
    // Defensive: Ensure missedQuestions is valid and index is within bounds
    if (!missedQuestions || !Array.isArray(missedQuestions) || index >= missedQuestions.length) {
      return;
    }
    
    setCurrentQuestion(index);
    // Keep explanation visible for memorization
  };

  const handleTryAgain = () => {
    // Defensive: Ensure q exists and has valid id
    if (!q || !q.id) {
      return;
    }
    
    try {
      // Reset only the current question's attempt
      setAttemptsById(prev => {
        const newState = { ...prev };
        delete newState[q.id];
        return newState;
      });
      // Keep explanation visible for memorization
    } catch (error) {
      console.error('Error in handleTryAgain:', error);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-4`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className={`rounded-lg p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Retake Missed Questions</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => markedQuestions.size > 0 && setMode('reviewMarked')}
                disabled={markedQuestions.size === 0}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  markedQuestions.size === 0
                    ? darkMode 
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : darkMode 
                      ? 'bg-amber-600 text-white hover:bg-amber-700' 
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
                title={markedQuestions.size === 0 ? "No marked questions to review" : "Review marked questions"}
              >
                🎯 Marked ({markedQuestions.size})
              </button>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                {currentQuestion + 1} / {missedQuestions?.length || 0}
              </span>
              <button
                onClick={handleClearMissed}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                title="Clear all missed questions (requires confirmation)"
              >
                Clear All
              </button>
            </div>
          </div>
          <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
            Retake missed questions to improve your scores and remove them from this list. Explanations are shown by default to help you memorize.
          </p>
        </div>

        {/* Question Card - Only render if we have a valid question */}
        {q && (
          <div className={`rounded-lg p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
            <div className={`text-sm font-medium mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
              {q?.domain || 'Unknown Domain'} {q?.important && '*'}
            </div>
            
            <div className="flex items-start gap-3">
              {q?.isTestQuestion && (
                <span className="text-yellow-500 text-lg mt-1" title="Test question">⭐</span>
              )}
              <h2 className={`text-xl font-semibold mb-6 flex-1 ${textSize === 'sm' ? 'text-base' : textSize === 'lg' ? 'text-2xl' : textSize === 'xl' ? 'text-3xl' : ''}`}>
                {q?.question || 'Question not available'}
              </h2>
            </div>

            {/* Interactive Choices */}
            {(attempt.isCorrect === null || attempt.isCorrect === false) && q?.choices && (
            <div className="space-y-3 mb-6">
              {console.log('🔍 ReviewMissed - Rendering choices for question:', q?.id, 'choices:', q?.choices)}
              {shuffledChoices.map((choice, index) => {
                console.log('🔍 ReviewMissed - Rendering choice', index, ':', choice);
                return (
                  <button
                    key={choice?.id || index}
                    onClick={() => handleSelectChoice(choice?.id, choice?.correct)}
                    disabled={attempt.selectedChoiceId !== null}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      attempt.selectedChoiceId === choice?.id
                        ? choice?.correct
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : attempt.selectedChoiceId !== null
                          ? darkMode 
                            ? 'border-gray-800 bg-gray-900 text-gray-500 cursor-not-allowed'
                            : 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
                          : darkMode 
                            ? 'border-gray-700 bg-gray-800 hover:border-gray-600' 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="font-medium mr-3">{choice?.id || index + 1}.</span>
                      <span className={textSize === 'sm' ? 'text-sm' : textSize === 'lg' ? 'text-lg' : textSize === 'xl' ? 'text-xl' : ''}>
                        {choice?.text || 'Choice not available'}
                      </span>
                      {attempt.selectedChoiceId === choice?.id && (
                        <span className={`ml-auto font-medium ${
                          choice?.correct 
                            ? 'text-green-900 dark:text-green-200' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {choice?.correct ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Result Display */}
          {attempt.isCorrect !== null && (
            <div className={`mb-6 p-4 rounded-lg ${
              attempt.isCorrect
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-semibold ${
                  attempt.isCorrect
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {attempt.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </span>
                {!attempt.isCorrect && (
                  <button
                    onClick={handleTryAgain}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                )}
              </div>
              
              {!attempt.isCorrect && q?.choices && (
                <div className="mb-3">
                  <span className="font-medium">Correct answer: </span>
                  <span className="font-semibold">
                    {q.choices.find(c => c?.correct)?.id}. {q.choices.find(c => c?.correct)?.text}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Explanation Toggle */}
          {attempt.isCorrect !== null && (
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className={`w-full p-3 rounded-lg border-2 mb-4 transition-all ${
                showExplanation
                  ? darkMode ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
                  : darkMode ? 'border-gray-700 bg-gray-800 hover:border-gray-600' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="text-center font-medium">
                {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
              </div>
            </button>
          )}

          {showExplanation && q?.explanation && (
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="font-semibold mb-2">Explanation:</h3>
              <p className={`${textSize === 'sm' ? 'text-sm' : textSize === 'lg' ? 'text-lg' : textSize === 'xl' ? 'text-xl' : ''} whitespace-pre-line`}>
                {q.explanation}
              </p>
            </div>
          )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className={`px-4 py-2 rounded-lg ${
              currentQuestion === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            Previous
          </button>

          <div className="flex gap-2">
            {/* Session progress indicator */}
            {sessionStarted && sessionScore && (
              <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center gap-2`}>
                <span className="font-semibold">{sessionScore.answered}/{sessionScore.total}</span>
                <span className="text-sm">answered</span>
              </div>
            )}
            
            {/* Mark as Mastered button - only show if answered correctly and not in session mode */}
            {!sessionStarted && attempt?.isCorrect === true && q?.id && (
              <button
                onClick={() => {
                  if (window.confirm('Mark this question as mastered and remove from missed questions?')) {
                    removeFromMissed(q.id);
                    if (missedQuestions.length <= 1) {
                      window.location.reload();
                    } else if (currentQuestion >= missedQuestions.length - 1) {
                      setCurrentQuestion(Math.max(0, currentQuestion - 1));
                    }
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                title="Remove this question from missed questions"
              >
                ✓ Mark as Mastered
              </button>
            )}
            
            {/* Complete Session button - show when in session and all answered */}
            {sessionStarted && sessionScore && sessionScore.answered === sessionQuestions.length && (
              <button
                onClick={completeSession}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                Complete Session
              </button>
            )}
            
            <button
              onClick={resetSession}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {sessionStarted ? 'Exit Session' : 'Back to Daily Drills'}
            </button>
          </div>

          <button
            onClick={handleNext}
            disabled={currentQuestion >= ((sessionStarted ? sessionQuestions : missedQuestions)?.length - 1 || 0)}
            className={`px-4 py-2 rounded-lg ${
              currentQuestion >= ((sessionStarted ? sessionQuestions : missedQuestions)?.length - 1 || 0)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            Next
          </button>
        </div>

        {/* Quick Jump Grid */}
        {missedQuestions && missedQuestions.length > 0 && (
          <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
            <h3 className="font-semibold mb-4">Quick Jump</h3>
            <div className="grid grid-cols-10 gap-2">
              {missedQuestions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleJump(index)}
                  className={`p-2 rounded text-sm transition-colors ${
                    index === currentQuestion
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewMissed;
