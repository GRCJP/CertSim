import React, { useState } from 'react';
import { useTestMode } from '../contexts/TestModeContext';
import { Bookmark, CheckCircle, Circle, Clock, X, Grid3X3 } from 'lucide-react';

const QuestionBank = ({ 
  questions, 
  currentIndex, 
  setCurrentIndex, 
  onClose, 
  simulatedAnswers,
  markedQuestions,
  timeRemaining 
}) => {
  const { darkMode } = useTestMode();
  const [filter, setFilter] = useState('all'); // all, marked, unanswered, answered

  // Calculate question statuses
  const questionStatus = questions.map((question, index) => {
    const isAnswered = simulatedAnswers[question.id] !== undefined;
    const isMarked = markedQuestions.has(question.id);
    const isCurrent = index === currentIndex;
    
    return {
      question,
      index,
      isAnswered,
      isMarked,
      isCurrent,
      status: isCurrent ? 'current' : isMarked ? 'marked' : isAnswered ? 'answered' : 'unanswered'
    };
  });

  // Filter questions based on selected filter
  const filteredQuestions = questionStatus.filter(q => {
    switch (filter) {
      case 'marked': return q.isMarked;
      case 'unanswered': return !q.isAnswered;
      case 'answered': return q.isAnswered;
      default: return true;
    }
  });

  const handleQuestionClick = (index) => {
    setCurrentIndex(index);
    onClose(); // Close the question bank after selecting a question
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'current':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'marked':
        return <Bookmark className="w-4 h-4 text-amber-500" fill="currentColor" />;
      case 'answered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'current':
        return darkMode ? 'bg-blue-600/20 border-blue-500' : 'bg-blue-50 border-blue-500';
      case 'marked':
        return darkMode ? 'bg-amber-600/20 border-amber-500' : 'bg-amber-50 border-amber-500';
      case 'answered':
        return darkMode ? 'bg-green-600/20 border-green-500' : 'bg-green-50 border-green-500';
      default:
        return darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-300';
    }
  };

  const getFilterCount = (filterType) => {
    switch (filterType) {
      case 'marked': return questionStatus.filter(q => q.isMarked).length;
      case 'unanswered': return questionStatus.filter(q => !q.isAnswered).length;
      case 'answered': return questionStatus.filter(q => q.isAnswered).length;
      default: return questionStatus.length;
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${darkMode ? 'bg-black/80' : 'bg-black/50'} flex items-center justify-center p-4`}>
      <div className={`w-full max-w-4xl max-h-[90vh] ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className={`${darkMode ? 'bg-slate-700' : 'bg-gray-50'} px-6 py-4 border-b ${darkMode ? 'border-slate-600' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Grid3X3 className={`w-5 h-5 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`} />
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Question Bank
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-600 text-slate-300' : 'hover:bg-gray-200 text-gray-600'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-6 mt-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className={darkMode ? 'text-slate-300' : 'text-gray-600'}>Current</span>
            </div>
            <div className="flex items-center gap-2">
              <Bookmark className="w-3 h-3 text-amber-500" fill="currentColor" />
              <span className={darkMode ? 'text-slate-300' : 'text-gray-600'}>
                Marked ({getFilterCount('marked')})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className={darkMode ? 'text-slate-300' : 'text-gray-600'}>
                Answered ({getFilterCount('answered')})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 text-gray-400" />
              <span className={darkMode ? 'text-slate-300' : 'text-gray-600'}>
                Unanswered ({getFilterCount('unanswered')})
              </span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className={`${darkMode ? 'bg-slate-700' : 'bg-gray-50'} px-6 py-3 border-b ${darkMode ? 'border-slate-600' : 'border-gray-200'}`}>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All Questions' },
              { key: 'marked', label: 'Marked' },
              { key: 'unanswered', label: 'Unanswered' },
              { key: 'answered', label: 'Answered' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === key
                    ? darkMode 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-blue-500 text-white'
                    : darkMode
                      ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {label} ({getFilterCount(key)})
              </button>
            ))}
          </div>
        </div>

        {/* Question Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {filteredQuestions.map(({ question, index, status, isMarked }) => (
              <button
                key={question.id}
                onClick={() => handleQuestionClick(index)}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-lg border-2 transition-all hover:scale-105 ${getStatusColor(status)}`}
                title={`Question ${index + 1}${isMarked ? ' (marked for review)' : ''}`}
              >
                <span className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {index + 1}
                </span>
                {isMarked && (
                  <Bookmark className="w-3 h-3 text-amber-500 mt-1" fill="currentColor" />
                )}
              </button>
            ))}
          </div>

          {filteredQuestions.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📋</div>
              <p className={`text-lg ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                No questions found for this filter
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`${darkMode ? 'bg-slate-700' : 'bg-gray-50'} px-6 py-4 border-t ${darkMode ? 'border-slate-600' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
              Progress: {getFilterCount('answered')}/{questionStatus.length} questions answered
            </div>
            {timeRemaining && (
              <div className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                Time: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionBank;
