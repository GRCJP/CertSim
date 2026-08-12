import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTestMode } from '../contexts/TestModeContext';
import { getBankMeta } from '../lib/questionBanks';
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, GripHorizontal, AlertCircle, Bookmark } from 'lucide-react';

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

const PracticeMode = ({ questions, questionBankId }) => {
  const { 
    textSize, 
    darkMode, 
    addToMissed,
    practiceIndex,
    setPracticeIndex,
    practiceAnswers,
    setPracticeAnswers,
    missedQuestions,
    markedQuestions,
    setMode,
    recordAttempt,
  } = useTestMode();
  const [currentIndex, setCurrentIndex] = useState(practiceIndex);
  const [answers, setAnswers] = useState(practiceAnswers);
  const [completedQuestions, setCompletedQuestions] = useState(new Set());
  // const [quickJumpCollapsed, setQuickJumpCollapsed] = useState(false);
  // const [quickJumpHeight, setQuickJumpHeight] = useState(150);
  const [isDragging, setIsDragging] = useState(false);
  // const dragRef = useRef(null);
  // const startYRef = useRef(0);
  // const startHeightRef = useRef(0);

  // Filter out completed questions from the available questions
  const availableQuestions = useMemo(() => {
    if (!questions || !Array.isArray(questions)) {
      return [];
    }
    return questions.filter(q => !completedQuestions.has(q.id));
  }, [questions, completedQuestions]);

  // Adjust current index if needed after filtering
  const adjustedIndex = availableQuestions.length > 0 ? Math.min(currentIndex, Math.max(availableQuestions.length - 1, 0)) : 0;
  const currentQuestion = availableQuestions[adjustedIndex];
  const currentAnswer = answers[currentQuestion?.id] ?? {
    selectedChoiceId: null,
    isCorrect: null,
  };

  // Memoize shuffled choices to prevent re-shuffling on every render
  const shuffledChoicesRef = useRef([]);
  const lastQuestionIdRef = useRef(null);

  // Only shuffle when question ID actually changes
  if (currentQuestion?.id !== lastQuestionIdRef.current) {
    lastQuestionIdRef.current = currentQuestion?.id;
    shuffledChoicesRef.current = currentQuestion?.choices ? shuffleChoices(currentQuestion.choices) : [];
  }

  const shuffledChoices = shuffledChoicesRef.current;

  const handleSelectChoice = (choiceId, isCorrect) => {
    if (!currentQuestion) {
      console.error('Cannot select choice: no current question');
      return;
    }
    
    setAnswers((prev) => {
      const next = { ...prev };
      next[currentQuestion.id] = {
        selectedChoiceId: choiceId,
        isCorrect,
      };
      setPracticeAnswers(Object.values(next));
      return next;
    });

    // Record attempt for progress tracking and analytics
    recordAttempt(currentQuestion, choiceId, isCorrect, 'practice');
  };

  useEffect(() => {
    setPracticeIndex(currentIndex);
  }, [currentIndex, setPracticeIndex]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    // Mark current question as completed if it has been answered correctly
    if (currentQuestion && answers[currentQuestion.id]?.isCorrect === true) {
      setCompletedQuestions(prev => new Set([...prev, currentQuestion.id]));
    }
    
    // Move to next question
    setCurrentIndex((prev) => {
      const nextIndex = prev + 1;
      // Adjust if we're going beyond the available questions
      return nextIndex < availableQuestions.length ? nextIndex : prev;
    });
  };

  // const handleJump = (index) => {
//   setCurrentIndex(index);
// };

  const summary = useMemo(() => {
    const total = Object.keys(answers).length;
    const correct = Object.values(answers).filter((a) => a?.isCorrect).length;
    return { total, correct, attempted: total };
  }, [answers]);

  // // Drag handlers for resizing
  // const handleDragStart = (e) => {
  //   e.preventDefault();
  //   setIsDragging(true);
  //   startYRef.current = e.clientY || e.touches?.[0]?.clientY;
  //   startHeightRef.current = quickJumpHeight;
  // };

  useEffect(() => {
    const handleDragMove = (_e) => {
      if (!isDragging) return;
      // const clientY = e.clientY || e.touches?.[0]?.clientY;
      // const delta = startYRef.current - clientY;
      // const newHeight = Math.max(60, Math.min(400, startHeightRef.current + delta));
      // setQuickJumpHeight(newHeight);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchmove', handleDragMove);
      document.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  if (!currentQuestion) {
    const hasCompletedAll = completedQuestions.size > 0 && availableQuestions.length === 0;
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} rounded-xl p-6 text-center`}>
          <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'} mb-4`}>
            {hasCompletedAll ? "🎉 All Questions Completed!" : "No questions loaded"}
          </h1>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
            {hasCompletedAll 
              ? "Great job! You've completed all available questions. Try reviewing missed questions or switch to a different mode."
              : "Questions are not loading properly. Please try refreshing the page or switching question banks."
            }
          </p>
          <div className="flex gap-3 justify-center">
            {hasCompletedAll && (
              <button
                type="button"
                onClick={() => setMode('reviewMissed')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Review Missed Questions
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setCompletedQuestions(new Set());
                setCurrentIndex(0);
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                darkMode ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              Reset Progress
            </button>
            <button
              type="button"
              onClick={() => setMode('dashboard')}
              className={`px-4 py-2 rounded-lg font-medium ${
                darkMode ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('🔍 Debug Info:');
                console.log('- Total questions:', questions?.length);
                console.log('- Available questions:', availableQuestions?.length);
                console.log('- Completed questions:', completedQuestions.size);
                console.log('- Current index:', currentIndex);
                console.log('- Current question:', currentQuestion?.id);
                console.log('- Question bank ID:', questionBankId || 'not provided');
                alert(`Debug: Total=${questions?.length}, Available=${availableQuestions?.length}, Completed=${completedQuestions.size}`);
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                darkMode ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-500 text-white hover:bg-purple-600'
              }`}
            >
              🔍 Debug
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className={`text-2xl font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              {getBankMeta(questionBankId).label}
            </h1>
            <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Practice mode: choose an answer to see if it's correct, then click Next to remove correctly answered questions!
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className={`px-3 py-1.5 rounded-lg ${darkMode ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' : 'bg-purple-50 text-purple-700 border border-purple-200'} font-medium`}>
              Q {adjustedIndex + 1} of {availableQuestions.length}
            </div>
            <div className={`px-3 py-1.5 rounded-lg ${darkMode ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              Score: {summary.correct}/{summary.total}{' '}
              <span className={darkMode ? 'text-gray-400' : 'text-gray-700'}>(attempted {summary.attempted})</span>
            </div>
            {missedQuestions.length > 0 && (
              <button
                type="button"
                onClick={() => setMode('reviewMissed')}
                className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm ${
                  darkMode ? 'bg-red-600 text-white hover:bg-red-700 border-red-700' : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                }`}
              >
                Review Missed ({missedQuestions.length})
              </button>
            )}
            {markedQuestions.size > 0 && (
              <button
                type="button"
                onClick={() => setMode('reviewMarked')}
                className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm ${
                  darkMode ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                }`}
              >
                Review Marked ({markedQuestions.size})
              </button>
            )}
          </div>
        </header>

        <main className="grid gap-4 md:grid-cols-1">
          <section className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} rounded-xl p-6 flex flex-col gap-4`}>
            {/* Navigation at top of question window */}
            <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={adjustedIndex === 0}
                  className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                    adjustedIndex === 0
                      ? darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-400'
                      : darkMode ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30' : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={adjustedIndex === availableQuestions.length - 1}
                  className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                    adjustedIndex === availableQuestions.length - 1
                      ? darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-400'
                      : darkMode ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30' : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  Next
                </button>
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                Question {adjustedIndex + 1} / {availableQuestions.length}
              </div>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">
                  {currentQuestion.domain}
                </p>
                <h2 className={`mt-1 text-base font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  Question {adjustedIndex + 1} {currentQuestion.important && '*'}
                </h2>
              </div>
            </div>

            <p className={`mt-1 whitespace-pre-wrap ${textSize === 'sm' ? 'text-sm' : textSize === 'lg' ? 'text-lg' : textSize === 'xl' ? 'text-xl' : ''} ${darkMode ? 'text-gray-200' : 'text-slate-800'}`}>
              {currentQuestion.question}
            </p>

            <div className="space-y-3 mb-6">
              {shuffledChoices.map(choice => (
                <button
                  key={choice.id}
                  onClick={() => handleSelectChoice(choice.id, choice.correct)}
                  disabled={currentAnswer.isCorrect !== null}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    currentAnswer.isCorrect !== null
                      ? choice.correct
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : currentAnswer.selectedChoiceId === choice.id
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                      : currentAnswer.selectedChoiceId === choice.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : darkMode 
                      ? 'border-gray-700 bg-gray-800 hover:border-gray-600' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="font-medium mr-3">{choice.id}</span>
                    <span className={`leading-snug ${textSize === 'sm' ? 'text-sm' : textSize === 'lg' ? 'text-lg' : textSize === 'xl' ? 'text-xl' : ''}`}>
                      {choice.text}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {currentAnswer.isCorrect !== null && (
              <div className={`mt-4 p-4 rounded-lg ${
                currentAnswer.isCorrect
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center mb-2">
                  {currentAnswer.isCorrect ? (
                    <CheckCircle className="text-green-700 dark:text-green-400 mr-2" size={20} />
                  ) : (
                    <XCircle className="text-red-600 dark:text-red-400 mr-2" size={20} />
                  )}
                  <span className={`font-semibold ${
                    currentAnswer.isCorrect
                      ? 'text-green-900 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {currentAnswer.isCorrect ? 'Correct!' : 'Incorrect'}
                  </span>
                </div>
                
                {!currentAnswer.isCorrect && (
                  <div className="mb-3">
                    <span className="font-medium">Correct answer: </span>
                    <span className="font-semibold">
                      {currentQuestion.choices.find(c => c.correct).id}. {currentQuestion.choices.find(c => c.correct).text}
                    </span>
                  </div>
                )}
                
                <div className={`text-sm ${textSize === 'sm' ? 'text-xs' : textSize === 'lg' ? 'text-base' : textSize === 'xl' ? 'text-lg' : ''} whitespace-pre-line`}>
                  {currentQuestion.explanation}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default PracticeMode;
