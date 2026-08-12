import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTestMode } from '../contexts/TestModeContext';
import { Bookmark, Clock } from 'lucide-react';
import ReviewMarked from './ReviewMarked';

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

const SimulatedTest = ({ questions }) => {
  const { 
    darkMode, 
    textSize, 
    simulatedOrder, 
    simulatedAnswers, 
    setSimulatedAnswers, 
    simulatedIndex, 
    setSimulatedIndex, 
    simulatedTimeRemaining, 
    setSimulatedTimeRemaining, 
    simulatedTimerActive, 
    setSimulatedTimerActive, 
    testCompleted, 
    completeTest, 
    startSimulatedTest, 
    resetSimulatedTest, 
    recordAttempt, 
    missedQuestions, 
    markExamSimQuestion, 
    examSimMarkedQuestions, 
    markedQuestions,
    setMode,
    questionBankId 
  } = useTestMode();
  
  // Use persistent timer state from context
  const timeRemaining = simulatedTimeRemaining;
  const setTimeRemaining = setSimulatedTimeRemaining;
  const isTimerActive = simulatedTimerActive;
  const setIsTimerActive = setSimulatedTimerActive;
  
  // Test completion state
  const [showResults, setShowResults] = useState(false);
  const [testScore, setTestScore] = useState({ correct: 0, total: 0, percentage: 0 });
  const [showMissedReview, setShowMissedReview] = useState(false);
  const [showMarkedReview, setShowMarkedReview] = useState(false);
  
  // Check if simulated test data matches current question bank
  const [isInitialized, setIsInitialized] = useState(false);

  // Handle review marked questions
  const handleReviewMarked = () => {
    setShowMarkedReview(true);
  };
  
  // Safe access to current question
  const currentQuestion = useMemo(() => {
    return simulatedOrder && simulatedOrder.length > 0 ? simulatedOrder[simulatedIndex] : null;
  }, [simulatedOrder, simulatedIndex]);
  const hasQuestions = simulatedOrder && simulatedOrder.length > 0;
  const selectedAnswer = currentQuestion ? simulatedAnswers[currentQuestion?.id] : null;
  const isMarked = currentQuestion ? examSimMarkedQuestions.has(currentQuestion?.id) : false;

  // Use ref to store shuffled choices and prevent re-shuffling
  const shuffledChoicesRef = useRef([]);
  const lastQuestionIdRef = useRef(null);

  // Only shuffle when question ID actually changes
  if (currentQuestion?.id !== lastQuestionIdRef.current) {
    lastQuestionIdRef.current = currentQuestion?.id;
    shuffledChoicesRef.current = currentQuestion?.choices ? shuffleChoices(currentQuestion.choices) : [];
  }

  const shuffledChoices = shuffledChoicesRef.current;
  
  useEffect(() => {
    if (questions && questions.length > 0) {
      // Check if current simulated order contains questions from this bank
      const currentQuestionIds = new Set(questions.map(q => q.id));
      const simulatedOrderIds = new Set(simulatedOrder.map(q => q.id));
      
      // If simulated order is empty or doesn't match current bank, reinitialize
      if (simulatedOrder.length === 0 || 
          !Array.from(simulatedOrderIds).every(id => currentQuestionIds.has(id))) {
        console.log('🔄 Reinitializing simulated test for question bank:', questionBankId);
        startSimulatedTest(questions);
      }
      setIsInitialized(true);
    }
  }, [questions, simulatedOrder, questionBankId, startSimulatedTest]);
  
  // Timer effect
  useEffect(() => {
    if (isTimerActive && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0) {
      // Auto-submit when time runs out
      completeTest();
    }
  }, [timeRemaining, isTimerActive, completeTest]);
  
  // Start timer
  const startTimer = () => {
    setIsTimerActive(true);
  };
  
  // Stop timer
  const stopTimer = () => {
    setIsTimerActive(false);
  };
  
  // Format time display
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle answer selection
  const handleAnswerSelect = (choiceId) => {
    if (!currentQuestion?.id) {
      console.error('Cannot select answer: no current question');
      return;
    }
    setSimulatedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: choiceId
    }));
  };
  
  // Handle next question
  const handleNext = () => {
    if (simulatedIndex < simulatedOrder.length - 1) {
      setSimulatedIndex(simulatedIndex + 1);
    } else {
      handleFinish();
    }
  };
  
  // Handle previous question
  const handlePrevious = () => {
    if (simulatedIndex > 0) {
      setSimulatedIndex(simulatedIndex - 1);
    }
  };
  
  // Handle mark for review
  const handleMarkReview = () => {
    markExamSimQuestion(currentQuestion.id, selectedAnswer);
  };
  
  // Quick jump to question
  const handleQuickJump = (index) => {
    setSimulatedIndex(index);
  };
  
  // Calculate test results
  const calculateResults = () => {
    let correct = 0;
    let total = 0;
    
    simulatedOrder.forEach(question => {
      const userAnswer = simulatedAnswers[question.id];
      if (userAnswer !== undefined) {
        total++;
        // Find the selected choice and check if it's correct
        const selectedChoice = question.choices.find(c => c.id === userAnswer);
        if (selectedChoice && selectedChoice.correct) {
          correct++;
        }
      }
    });
    
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    setTestScore({ correct, total, percentage });
    setShowResults(true);
  };

  // Calculate domain performance
  const calculateDomainScores = () => {
    const domainScores = {};
    
    simulatedOrder.forEach(question => {
      const userAnswer = simulatedAnswers[question.id];
      if (userAnswer !== undefined && question.domain) {
        if (!domainScores[question.domain]) {
          domainScores[question.domain] = { correct: 0, total: 0 };
        }
        
        domainScores[question.domain].total++;
        const selectedChoice = question.choices.find(c => c.id === userAnswer);
        if (selectedChoice && selectedChoice.correct) {
          domainScores[question.domain].correct++;
        }
      }
    });
    
    // Convert to array and add percentages
    return Object.entries(domainScores).map(([domain, scores]) => ({
      domain,
      ...scores,
      percentage: scores.total > 0 ? Math.round((scores.correct / scores.total) * 100) : 0
    })).sort((a, b) => b.percentage - a.percentage);
  };

  // Handle reviewing missed questions
  const handleReviewMissed = () => {
    setShowMissedReview(true);
  };

  // Handle retaking the exam
  const handleRetakeExam = () => {
    // Reset all exam state
    setShowResults(false);
    setShowMissedReview(false);
    setShowMarkedReview(false);
    setTestScore({ correct: 0, total: 0, percentage: 0 });
    
    // Start a fresh exam
    startSimulatedTest(questions);
  };
  
  // Handle test completion
  const handleFinish = () => {
    // Show confirmation dialog before submitting
    const unansweredCount = simulatedOrder.filter(q => !simulatedAnswers[q.id]).length;
    const answeredCount = simulatedOrder.length - unansweredCount;
    
    let confirmationMessage = 'Are you sure you want to end the test?';
    
    if (unansweredCount > 0) {
      confirmationMessage = `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''} out of ${simulatedOrder.length}. Are you sure you want to end the test?`;
    } else {
      confirmationMessage = `You have answered all ${answeredCount} questions. Are you sure you want to submit the test?`;
    }
    
    if (window.confirm(confirmationMessage)) {
      // Record all attempts before calculating results
      simulatedOrder.forEach(question => {
        const userAnswer = simulatedAnswers[question.id];
        if (userAnswer) {
          const selectedChoice = question.choices.find(c => c.id === userAnswer);
          const isCorrect = selectedChoice ? selectedChoice.correct : false;
          recordAttempt(question, userAnswer, isCorrect, 'simulatedTest');
        } else {
          // Unanswered questions are also considered missed - record as incorrect
          recordAttempt(question, null, false, 'simulatedTest');
        }
      });
      
      calculateResults();
      completeTest();
    }
  };
  
  // Calculate progress
  const answeredCount = Object.keys(simulatedAnswers).length;
  const progressPercentage = (answeredCount / simulatedOrder.length) * 100;

  // Show loading state while initializing
  if (!isInitialized || !hasQuestions) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-[#1E1E1E] text-[#E6E6E6]' : 'bg-[#FAFAF7] text-[#1E1E1E]'} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className={`${darkMode ? 'bg-[#252526]' : 'bg-[#F2F4F8] shadow-sm'} rounded-lg p-6`}>
            <h1 className="text-2xl font-bold mb-4 text-blue-500">
              {!isInitialized ? '🔄 Initializing...' : '📋 Loading Questions...'}
            </h1>
            <p>
              {!isInitialized 
                ? 'Preparing simulated test for your question bank...' 
                : 'No questions available for simulated test.'}
            </p>
            <button 
              onClick={() => setMode('practice')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode 
                  ? 'bg-[#14B8A6] text-white hover:bg-[#0D9488]' 
                  : 'bg-[#0D9488] text-white hover:bg-[#14B8A6]'
              }`}
            >
                🏠 Back to Practice
              </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Show results screen
  if (showResults) {
    const markedQuestionsList = Array.from(markedQuestions.keys()).map(id => 
      simulatedOrder.find(q => q.id === id)
    ).filter(Boolean);
    
    const domainScores = calculateDomainScores();
    
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-[#1E1E1E] text-[#E6E6E6]' : 'bg-[#FAFAF7] text-[#1E1E1E]'} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className={`${darkMode ? 'bg-[#252526]' : 'bg-[#F2F4F8]'} rounded-lg p-8 shadow-lg`}>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4">Test Complete! 🎉</h1>
              <div className="flex justify-center items-center gap-8 mb-6">
                <div>
                  <div className="text-5xl font-bold text-[#0D9488] dark:text-[#14B8A6]">
                    {testScore.percentage}%
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>Score</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#22C55E] dark:text-[#4ADE80]">
                    {testScore.correct}/{testScore.total}
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>Correct</div>
                </div>
              </div>
            </div>
            
            {/* Domain Performance Section */}
            {domainScores.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  📊 Performance by Domain
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {domainScores.map((domainScore) => (
                    <div 
                      key={domainScore.domain}
                      className={`p-4 rounded-lg border ${
                        darkMode 
                          ? 'bg-[#2D2D2E] border-[#3C3C3C]' 
                          : 'bg-white border-[#E0E0E0]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-medium ${darkMode ? 'text-[#E6E6E6]' : 'text-[#1E1E1E]'}`}>
                          {domainScore.domain}
                        </span>
                        <span className={`text-lg font-bold ${
                          domainScore.percentage >= 80 
                            ? 'text-[#22C55E] dark:text-[#4ADE80]'
                            : domainScore.percentage >= 60
                            ? 'text-[#F59E0B] dark:text-[#FBBF24]'
                            : 'text-[#EF4444] dark:text-[#F87171]'
                        }`}>
                          {domainScore.percentage}%
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {domainScore.correct}/{domainScore.total} correct
                      </div>
                      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            domainScore.percentage >= 80 
                              ? 'bg-green-500'
                              : domainScore.percentage >= 60
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${domainScore.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Marked Questions Section */}
            {markedQuestionsList.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-[#F59E0B]" />
                  Marked for Review ({markedQuestionsList.length})
                </h2>
                <div className="space-y-3">
                  {markedQuestionsList.map((question, index) => {
                    const userAnswer = simulatedAnswers[question.id];
                    const selectedChoice = question.choices?.find(c => c.id === userAnswer);
                    const isCorrect = selectedChoice ? selectedChoice.correct : false;
                    
                    return (
                      <div 
                        key={question.id}
                        className={`p-4 rounded-lg border ${
                          darkMode 
                            ? 'bg-[#2D2D2E] border-[#3C3C3C]' 
                            : 'bg-white border-[#E0E0E0]'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className={`text-sm font-medium ${
                            isCorrect 
                              ? 'text-[#22C55E] dark:text-[#4ADE80]' 
                              : 'text-[#EF4444] dark:text-[#F87171]'
                          }`}>
                            Question {simulatedOrder.indexOf(question) + 1} • {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>
                        <p className="mb-2">{question.question}</p>
                        <div className="text-sm">
                          <span className={darkMode ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}>Your answer: </span>
                          <span className={isCorrect ? 'text-[#22C55E] dark:text-[#4ADE80]' : 'text-[#EF4444] dark:text-[#F87171]'}>
                            {question.choices?.find(c => c.id === userAnswer)?.text || 'Not answered'}
                          </span>
                          {!isCorrect && (
                            <div>
                              <span className={darkMode ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}>Correct answer: </span>
                              <span className="text-[#22C55E] dark:text-[#4ADE80]">
                                {question.choices?.find(c => c.correct)?.text}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={handleReviewMarked}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  markedQuestionsList.length > 0
                    ? darkMode 
                      ? 'bg-[#F59E0B] text-white hover:bg-[#F59E0B]/80' 
                      : 'bg-[#F59E0B] text-white hover:bg-[#F59E0B]/80'
                    : darkMode 
                      ? 'bg-[#2D2D2E] text-[#6F7378] cursor-not-allowed' 
                      : 'bg-[#F2F4F8] text-[#9AA0A6] cursor-not-allowed border border-[#E0E0E0]'
                }`}
                disabled={markedQuestionsList.length === 0}
              >
                🎯 Review Marked Questions {markedQuestionsList.length > 0 && `(${markedQuestionsList.length})`}
              </button>
              <button
                onClick={handleReviewMissed}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  missedQuestions.length > 0
                    ? darkMode 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-red-500 text-white hover:bg-red-600'
                    : darkMode 
                      ? 'bg-[#2D2D2E] text-[#6F7378] cursor-not-allowed' 
                      : 'bg-[#F2F4F8] text-[#9AA0A6] cursor-not-allowed border border-[#E0E0E0]'
                }`}
                disabled={missedQuestions.length === 0}
              >
                ❌ Review Missed ({missedQuestions.length})
              </button>
              <button
                onClick={handleRetakeExam}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  darkMode 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                🔄 Retake Exam
              </button>
              <button
                onClick={() => setMode('dashboard')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  darkMode 
                    ? 'bg-[#14B8A6] text-white hover:bg-[#0D9488]' 
                    : 'bg-[#0D9488] text-white hover:bg-[#14B8A6]'
                }`}
              >
                🏠 Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show missed questions review screen
  if (showMissedReview) {
    const missedQuestionsList = missedQuestions.map(id => 
      simulatedOrder.find(q => q.id === id)
    ).filter(Boolean);

    return (
      <div className={`min-h-screen ${darkMode ? 'bg-[#1E1E1E] text-[#E6E6E6]' : 'bg-[#FAFAF7] text-[#1E1E1E]'} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className={`${darkMode ? 'bg-[#252526]' : 'bg-[#F2F4F8]'} rounded-lg p-8 shadow-lg`}>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4">Review Missed Questions ❌</h1>
              <p className={`text-lg ${darkMode ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>
                Review the questions you missed to improve your understanding
              </p>
            </div>

            <div className="space-y-6 mb-8">
              {missedQuestionsList.map((question, index) => {
                const userAnswer = simulatedAnswers[question.id];
                const selectedChoice = question.choices?.find(c => c.id === userAnswer);
                const isCorrect = selectedChoice ? selectedChoice.correct : false;
                
                return (
                  <div 
                    key={question.id}
                    className={`p-6 rounded-lg border ${
                      darkMode 
                        ? 'bg-[#2D2D2E] border-[#3C3C3C]' 
                        : 'bg-white border-[#E0E0E0]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold flex-1 pr-4">
                        {index + 1}. {question.question}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ${
                        question.difficulty === 'easy' 
                          ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'
                          : question.difficulty === 'medium'
                          ? darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-700'
                          : darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700'
                      }`}>
                        {question.difficulty}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      {shuffleChoices(question.choices).map((choice) => {
                        const isSelected = choice.id === userAnswer;
                        const isCorrectAnswer = choice.correct;
                        
                        return (
                          <div
                            key={choice.id}
                            className={`p-3 rounded-lg border ${
                              isCorrectAnswer
                                ? darkMode 
                                  ? 'bg-green-900/20 border-green-700 text-green-400' 
                                  : 'bg-green-50 border-green-300 text-green-700'
                                : isSelected
                                ? darkMode 
                                  ? 'bg-red-900/20 border-red-700 text-red-400' 
                                  : 'bg-red-50 border-red-300 text-red-700'
                                : darkMode 
                                  ? 'bg-[#2D2D2E] border-[#3C3C3C] text-[#9AA0A6]' 
                                  : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{choice.text}</span>
                              {isCorrectAnswer && (
                                <span className="text-sm font-medium">✓ Correct</span>
                              )}
                              {isSelected && !isCorrectAnswer && (
                                <span className="text-sm font-medium">✗ Your Answer</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {question.explanation && (
                      <div className={`p-4 rounded-lg ${
                        darkMode ? 'bg-[#1E1E1E] text-[#9AA0A6]' : 'bg-gray-50 text-gray-600'
                      }`}>
                        <strong>Explanation:</strong> {question.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleRetakeExam}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  darkMode 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                🔄 Retake Exam
              </button>
              <button
                onClick={() => {
                  setShowMissedReview(false);
                  setShowResults(true);
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  darkMode 
                    ? 'bg-[#14B8A6] text-white hover:bg-[#0D9488]' 
                    : 'bg-[#0D9488] text-white hover:bg-[#14B8A6]'
                }`}
              >
                📊 Back to Results
              </button>
              <button
                onClick={() => setMode('dashboard')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  darkMode 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
              >
                🏠 Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show marked questions review screen
  if (showMarkedReview) {
    const markedQuestionsList = Array.from(markedQuestions.keys()).map(id => 
      simulatedOrder.find(q => q.id === id)
    ).filter(Boolean);

    return (
      <div className={`min-h-screen ${darkMode ? 'bg-[#1E1E1E] text-[#E6E6E6]' : 'bg-[#FAFAF7] text-[#1E1E1E]'} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className={`${darkMode ? 'bg-[#252526]' : 'bg-[#F2F4F8]'} rounded-lg p-8 shadow-lg`}>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4">Review Marked Questions 🎯</h1>
              <p className={`text-lg ${darkMode ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>
                Review the questions you marked for additional study
              </p>
            </div>

            <div className="space-y-6 mb-8">
              {markedQuestionsList.map((question, index) => {
                const userAnswer = simulatedAnswers[question.id];
                const selectedChoice = question.choices?.find(c => c.id === userAnswer);
                const isCorrect = selectedChoice ? selectedChoice.correct : false;
                
                return (
                  <div 
                    key={question.id}
                    className={`p-6 rounded-lg border ${
                      darkMode 
                        ? 'bg-[#2D2D2E] border-[#3C3C3C]' 
                        : 'bg-white border-[#E0E0E0]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${darkMode ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>
                          Question {index + 1}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          darkMode ? 'bg-amber-600/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {question.domain} {question.important && '*'}
                        </span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isCorrect
                          ? darkMode ? 'bg-green-600/20 text-green-400' : 'bg-green-100 text-green-700'
                          : darkMode ? 'bg-red-600/20 text-red-400' : 'bg-red-100 text-red-700'
                      }`}>
                        {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                      </span>
                    </div>
                    
                    <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-[#E6E6E6]' : 'text-[#1E1E1E]'}`}>
                      {question.question}
                    </h3>
                    
                    <div className="space-y-2 mb-4">
                      {question.choices?.map((choice) => {
                        const isSelected = choice.id === userAnswer;
                        const isCorrectAnswer = choice.correct;
                        
                        return (
                          <div
                            key={choice.id}
                            className={`p-3 rounded-lg border ${
                              isCorrectAnswer
                                ? darkMode 
                                  ? 'bg-green-600/20 border-green-500 text-green-200' 
                                  : 'bg-green-50 border-green-500 text-green-900'
                                : isSelected
                                ? darkMode 
                                  ? 'bg-red-600/20 border-red-500 text-red-400' 
                                  : 'bg-red-50 border-red-500 text-red-700'
                                : darkMode 
                                  ? 'bg-[#2D2D2E] border-[#3C3C3C] text-[#9AA0A6]' 
                                  : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{choice.id}. {choice.text}</span>
                              {isCorrectAnswer && <span className="text-sm font-medium">✓ Correct</span>}
                              {isSelected && !isCorrectAnswer && <span className="text-sm font-medium">✗ Your answer</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {question.explanation && (
                      <div className={`p-4 rounded-lg ${
                        darkMode ? 'bg-[#2D2D2E] border-[#3C3C3C]' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <h4 className={`font-semibold mb-2 ${darkMode ? 'text-[#E6E6E6]' : 'text-[#1E1E1E]'}`}>
                          Explanation:
                        </h4>
                        <p className={`text-sm whitespace-pre-line ${darkMode ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>
                          {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setShowMarkedReview(false);
                  setShowResults(true);
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  darkMode 
                    ? 'bg-[#14B8A6] text-white hover:bg-[#0D9488]' 
                    : 'bg-[#0D9488] text-white hover:bg-[#14B8A6]'
                }`}
              >
                📊 Back to Results
              </button>
              <button
                onClick={() => setMode('dashboard')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  darkMode 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
              >
                🏠 Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#1E1E1E] text-[#E6E6E6]' : 'bg-[#FAFAF7] text-[#1E1E1E]'} p-4`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-sm p-6 mb-6`}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3 mb-2">
                <span className="text-3xl">🎯</span>
                <span className={darkMode ? 'text-white' : 'text-gray-900'}>Simulated Exam Challenge</span>
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Complete all {simulatedOrder.length} questions to finish the exam
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {simulatedIndex + 1} / {simulatedOrder.length}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Question Progress
                </div>
              </div>
              <button
                onClick={() => {
                  if (simulatedOrder[simulatedIndex]?.id) {
                    markExamSimQuestion(simulatedOrder[simulatedIndex].id);
                  }
                }}
                className={`p-3 rounded-xl transition-all ${
                  isMarked
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-2 border-amber-300 dark:border-amber-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'
                }`}
                title={isMarked ? 'Unmark question' : 'Mark for review'}
              >
                <Bookmark size={20} fill={isMarked ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${((simulatedIndex + 1) / simulatedOrder.length) * 100}%` }}
            />
          </div>

          {/* Timer and Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevious}
                disabled={simulatedIndex <= 0}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  simulatedIndex <= 0
                    ? darkMode 
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : darkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ← Previous
              </button>
              <button
                onClick={handleNext}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  darkMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {simulatedIndex >= simulatedOrder.length - 1 ? 'Finish Exam' : 'Next →'}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(timeRemaining)}</span>
              </div>
              {!isTimerActive && (
                <button
                  onClick={startTimer}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    darkMode 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  Start Timer
                </button>
              )}
              <button
                type="button"
                onClick={handleReviewMarked}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border-2 ${
                  darkMode
                    ? 'bg-purple-600 text-white hover:bg-purple-700 border-purple-500'
                    : 'bg-purple-500 text-white hover:bg-purple-600 border-purple-400'
                }`}
                title="Review questions you have marked for review"
              >
                <Bookmark className="w-4 h-4 inline mr-1" />
                Review marked only
              </button>
              <button
                onClick={handleFinish}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border-2 ${
                  darkMode
                    ? 'bg-orange-600 text-white hover:bg-orange-700 border-orange-500'
                    : 'bg-orange-500 text-white hover:bg-orange-600 border-orange-400'
                }`}
                title="Submit test for scoring at any time"
              >
                📊 Submit Test
              </button>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-sm p-6 mb-6`}>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                darkMode ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-100 text-purple-700'
              }`}>
                {currentQuestion?.domain}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentQuestion?.difficulty === 'easy' 
                  ? darkMode ? 'bg-green-600/20 text-green-400' : 'bg-green-100 text-green-700'
                  : currentQuestion?.difficulty === 'medium'
                  ? darkMode ? 'bg-yellow-600/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                  : darkMode ? 'bg-red-600/20 text-red-400' : 'bg-red-100 text-red-700'
              }`}>
                {currentQuestion?.difficulty}
              </span>
            </div>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}
                style={{ fontSize: `${textSize === 'small' ? '1rem' : textSize === 'large' ? '1.5rem' : '1.25rem'}` }}>
              {currentQuestion?.question}
            </h2>
          </div>

        {/* Answer Choices */}
        <div className="space-y-3">
          {shuffledChoices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => handleAnswerSelect(choice.id)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedAnswer === choice.id
                  ? darkMode 
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                    : 'bg-blue-50 border-blue-500 text-blue-700'
                  : darkMode
                  ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:border-slate-500' 
                  : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50 hover:border-gray-300'
              }`}
              style={{ fontSize: `${textSize === 'small' ? '0.875rem' : textSize === 'large' ? '1.125rem' : '1rem'}` }}
            >
              <div className="flex items-center">
                <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-3 text-sm font-medium ${
                  selectedAnswer === choice.id
                    ? darkMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-blue-600 border-blue-500 text-white'
                    : darkMode ? 'bg-slate-600 border-slate-500 text-gray-400' : 'bg-gray-200 border-gray-300 text-gray-700'
                }`}>
                  {choice.id}
                </span>
                <span className="leading-snug">{choice.text}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Review Marked Modal */}
      {showMarkedReview && (
        <ReviewMarked
          questions={simulatedOrder}
          onClose={() => setShowMarkedReview(false)}
          examMode={true}
        />
      )}
      </div>
    </div>
  );
}

export default SimulatedTest;