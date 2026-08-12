import React, { useState, useEffect } from 'react';
import { useTestMode } from '../contexts/TestModeContext';
import { ArrowLeft, ArrowRight, Target, CheckCircle, XCircle } from 'lucide-react';

const DomainPractice = () => {
  const {
    darkMode,
    mode,
    setMode,
    domainFilteredQuestions,
    domainFilterType,
    selectedDomains,
    clearDomainPractice,
    recordAttempt,
    scoreStats,
    updateScoreStats,
    updateDailyProgress,
    updateProgressStreaks,
    getAccuracy
  } = useTestMode();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  const currentQuestion = domainFilteredQuestions[currentIndex];
  const currentAnswer = answers[currentQuestion?.id] || { selectedChoiceId: null, isCorrect: null };

  // Calculate session statistics
  const sessionStats = {
    attempted: Object.keys(answers).length,
    correct: Object.values(answers).filter(a => a.isCorrect).length,
    total: domainFilteredQuestions.length
  };

  const handleSelectChoice = (choiceId, isCorrect) => {
    if (!currentQuestion || currentAnswer.selectedChoiceId) return;

    // Record the answer
    const newAnswer = { selectedChoiceId: choiceId, isCorrect };
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: newAnswer }));

    // Record attempt for progress tracking
    recordAttempt(currentQuestion, choiceId, isCorrect, 'domainPractice');

    // Show explanation
    setShowExplanation(true);

    // Check if session is complete
    if (currentIndex === domainFilteredQuestions.length - 1) {
      setTimeout(() => {
        setSessionComplete(true);
        completeSession();
      }, 2000);
    }
  };

  const handleNext = () => {
    if (currentIndex < domainFilteredQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowExplanation(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowExplanation(false);
    }
  };

  const completeSession = () => {
    // Update score stats
    updateScoreStats(sessionStats.correct, sessionStats.attempted);
    updateDailyProgress(sessionStats.attempted);
    
    // Update progress streaks
    const accuracy = sessionStats.attempted > 0 ? Math.round((sessionStats.correct / sessionStats.attempted) * 100) : 0;
    updateProgressStreaks(sessionStats.attempted, accuracy);
  };

  const handleBackToDashboard = () => {
    // Don't clear domain practice state - just navigate back to dashboard
    // This allows users to return to domain selection
    setMode('dashboard');
  };

  const handleStartNewSession = () => {
    setCurrentIndex(0);
    setAnswers({});
    setShowExplanation(false);
    setSessionComplete(false);
  };

  if (domainFilteredQuestions.length === 0 && !sessionComplete) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-50'} flex items-center justify-center p-4`}>
        <div className={`text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold mb-2">No Domain Questions Available</h2>
          <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
            Please select domains from the dashboard to start domain-specific practice.
          </p>
          <button
            onClick={handleBackToDashboard}
            className={`mt-4 px-6 py-2 rounded-lg font-medium ${
              darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion && domainFilteredQuestions.length > 0 && !sessionComplete) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-50'} flex items-center justify-center p-4`}>
        <div className={`text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <div className="text-6xl mb-4">🔄</div>
          <h2 className="text-2xl font-bold mb-2">Loading Questions...</h2>
          <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
            Preparing domain practice questions...
          </p>
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-50'} flex items-center justify-center p-4`}>
        <div className={`max-w-2xl w-full ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-xl p-8`}>
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-4">Domain Practice Complete!</h2>
            
            {/* Domain Info */}
            <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <strong>Domains Practiced:</strong> {selectedDomains.join(', ')}
              </p>
            </div>

            {/* Session Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-green-900/30 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
                <div className="text-2xl font-bold text-green-600">
                  {sessionStats.correct}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Correct
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/30 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="text-2xl font-bold text-blue-600">
                  {sessionStats.attempted}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Attempted
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-purple-900/30 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'}`}>
                <div className="text-2xl font-bold text-purple-600">
                  {sessionStats.attempted > 0 ? Math.round((sessionStats.correct / sessionStats.attempted) * 100) : 0}%
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Accuracy
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleStartNewSession}
                className={`px-6 py-3 rounded-lg font-medium ${
                  darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Practice Again
              </button>
              
              <button
                onClick={handleBackToDashboard}
                className={`px-6 py-3 rounded-lg font-medium ${
                  darkMode ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
              >
                Back to Domain Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-50'} p-4`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBackToDashboard}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
                darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Domain Selection
            </button>
            
            <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {currentIndex + 1} / {domainFilteredQuestions.length}
              </span>
            </div>
          </div>
          
          {/* Domain Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedDomains.map(domain => (
              <span
                key={domain}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  darkMode ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-200'
                }`}
              >
                <Target className="w-3 h-3 inline mr-1" />
                {domain}
              </span>
            ))}
          </div>

          {/* Filter Type */}
          <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
            domainFilterType === 'missed' 
              ? darkMode ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-200'
              : darkMode ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-200'
          }`}>
            {domainFilterType === 'missed' ? '🔴 Practicing Missed Questions' : '🟢 Practicing All Questions'}
          </div>
        </div>

        {/* Question Card */}
        <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
          <div className="mb-6">
            <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Question {currentIndex + 1}
            </div>
            <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {currentQuestion.question}
            </h3>
            
            {currentQuestion.reference && (
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                Reference: {currentQuestion.reference}
              </div>
            )}
          </div>

          {/* Answer Choices */}
          <div className="space-y-3 mb-6">
            {currentQuestion.choices?.map((choice) => {
              const isSelected = currentAnswer.selectedChoiceId === choice.id;
              const isCorrect = choice.correct;
              
              let buttonClass = `w-full text-left p-4 rounded-lg border-2 transition-all ${
                darkMode ? 'border-slate-600' : 'border-gray-200'
              }`;
              
              if (showExplanation) {
                if (isSelected) {
                  buttonClass += isCorrect 
                    ? darkMode ? ' bg-green-900/20 border-green-500' : ' bg-green-50 border-green-500'
                    : darkMode ? ' bg-red-900/20 border-red-500' : ' bg-red-50 border-red-500';
                } else if (isCorrect) {
                  buttonClass += darkMode ? ' bg-green-900/20 border-green-500' : ' bg-green-50 border-green-500';
                }
              } else if (isSelected) {
                buttonClass += darkMode ? ' bg-blue-900/20 border-blue-500' : ' bg-blue-50 border-blue-500';
              }
              
              return (
                <button
                  key={choice.id}
                  onClick={() => !showExplanation && handleSelectChoice(choice.id, choice.correct)}
                  disabled={showExplanation}
                  className={buttonClass}
                >
                  <div className="flex items-center justify-between">
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                      {choice.text}
                    </span>
                    {showExplanation && (
                      <div>
                        {isSelected && (
                          isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )
                        )}
                        {!isSelected && isCorrect && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && currentQuestion.explanation && (
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                💡 Explanation:
              </h4>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {currentQuestion.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`px-6 py-3 rounded-lg font-medium ${
              currentIndex === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Previous
          </button>
          
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Session Progress: {sessionStats.attempted}/{sessionStats.total} questions
          </div>
          
          <button
            onClick={handleNext}
            disabled={!showExplanation}
            className={`px-6 py-3 rounded-lg font-medium ${
              !showExplanation
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Next
            <ArrowRight className="w-4 h-4 inline ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DomainPractice;
