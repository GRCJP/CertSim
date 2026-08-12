import React, { useState, useMemo, useCallback } from 'react';
import { useTestMode } from '../contexts/TestModeContext';

const ReviewMarked = ({ questions, onClose, examMode = false }) => {
  const { textSize, darkMode, markedQuestions, examSimMarkedQuestions, markQuestion, setSimulatedAnswers, simulatedAnswers, setSimulatedIndex } = useTestMode();
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Use examSimMarkedQuestions for global review marked, markedQuestions for exam mode
  const markedQuestionsToUse = examMode ? markedQuestions : examSimMarkedQuestions;
  
  // Get the actual marked questions from the full questions list
  const markedQuestionsList = useMemo(() => {
    return questions.filter(q => markedQuestionsToUse.has(q.id));
  }, [questions, markedQuestionsToUse]);

  const handleNext = useCallback(() => {
    if (currentQuestion < markedQuestionsList.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  }, [currentQuestion, markedQuestionsList.length]);

  const handlePrevious = useCallback(() => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  }, [currentQuestion]);

  // Handle answer selection in exam mode
  const handleAnswerSelect = useCallback((questionId, choiceId) => {
    if (examMode) {
      setSimulatedAnswers(prev => ({
        ...prev,
        [questionId]: choiceId
      }));
    }
  }, [examMode, setSimulatedAnswers]);

  // Handle returning to specific question in exam
  const handleReturnToQuestion = useCallback(() => {
    if (examMode && onClose) {
      const currentQ = markedQuestionsList[currentQuestion];
      if (currentQ) {
        // Find the index of this question in the simulated order
        const questionIndex = questions.findIndex(q => q.id === currentQ.id);
        if (questionIndex !== -1) {
          setSimulatedIndex(questionIndex);
        }
      }
      onClose();
    }
  }, [examMode, onClose, markedQuestionsList, currentQuestion, questions, setSimulatedIndex]);

  if (markedQuestionsList.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`max-w-md w-full mx-4 p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            No Marked Questions
          </h2>
          <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            You haven't marked any questions for review.
          </p>
          <button
            onClick={onClose}
            className={`w-full px-4 py-2 rounded-lg font-medium ${
              darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const q = markedQuestionsList[currentQuestion];
  const selectedAnswer = q ? simulatedAnswers[q.id] : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-4xl h-[90vh] mx-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} flex flex-col`}>
        {/* Header */}
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {examMode ? 'Review Marked Question' : 'Review Marked Questions'}
            </h1>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium ${
                darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {examMode ? 'Back to Exam' : 'Close'}
            </button>
          </div>
          
          {examMode ? (
            <div className="flex items-center justify-between">
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Review your answer and make changes if needed. Click "Return to Exam" when done.
              </p>
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                Question {currentQuestion + 1} of {markedQuestionsList.length}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                className={`px-3 py-1 rounded ${
                  currentQuestion === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Previous
              </button>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                {currentQuestion + 1} / {markedQuestionsList.length}
              </span>
              <button
                onClick={handleNext}
                disabled={currentQuestion === markedQuestionsList.length - 1}
                className={`px-3 py-1 rounded ${
                  currentQuestion === markedQuestionsList.length - 1
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Question Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className={`rounded-lg p-6 mb-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-sm font-medium mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
              {q.domain || 'General'} {q.important && '*'}
            </div>
            
            <h2 className={`text-xl font-semibold mb-6 ${textSize === 'sm' ? 'text-base' : textSize === 'lg' ? 'text-2xl' : textSize === 'xl' ? 'text-3xl' : ''} ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {q.question}
            </h2>

            {/* Answer Choices - Clickable in exam mode */}
            <div className="space-y-3">
              {q.choices.map(choice => {
                const isSelected = choice.id === selectedAnswer;
                
                return (
                  <button
                    key={choice.id}
                    onClick={() => examMode && handleAnswerSelect(q.id, choice.id)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      examMode
                        ? isSelected
                          ? darkMode ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
                          : darkMode ? 'border-gray-600 bg-gray-800 hover:border-blue-400' : 'border-gray-300 bg-white hover:border-blue-400'
                        : isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                    }`}
                    disabled={!examMode}
                  >
                    <div className="flex items-center">
                      <span className="font-medium mr-3">{choice.id}.</span>
                      <span className={textSize === 'sm' ? 'text-sm' : textSize === 'lg' ? 'text-lg' : textSize === 'xl' ? 'text-xl' : ''}>
                        {choice.text}
                      </span>
                      {examMode && isSelected && (
                        <span className="ml-auto text-blue-600 dark:text-blue-400 font-medium">
                          ✓ Selected
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              {examMode && (
                <>
                  <button
                    onClick={() => {
                      if (q?.id) {
                        markQuestion(q.id);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      markedQuestionsToUse.has(q?.id)
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {markedQuestionsToUse.has(q?.id) ? 'Unmark' : 'Mark'}
                  </button>
                </>
              )}
            </div>
            
            <div className="flex gap-3">
              {examMode ? (
                <>
                  {currentQuestion < markedQuestionsList.length - 1 && (
                    <button
                      onClick={handleNext}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Next Marked
                    </button>
                  )}
                  <button
                    onClick={handleReturnToQuestion}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    Return to Exam
                  </button>
                </>
              ) : (
                <button
                  onClick={onClose}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewMarked;
