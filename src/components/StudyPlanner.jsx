import { useState } from 'react';
import { useTestMode } from '../contexts/TestModeContext';
import { Calendar, Target, TrendingUp, Clock, CheckCircle, Settings } from 'lucide-react';

const StudyPlanner = () => {
  const {
    darkMode,
    studyPlan,
    setTestDate,
    adjustDailyGoal,
    getStudyProgress,
    getDailyProgress,
  } = useTestMode();

  const [showSettings, setShowSettings] = useState(false);
  const [tempDate, setTempDate] = useState(studyPlan.testDate || '');
  const [tempGoal, setTempGoal] = useState(studyPlan.dailyGoal);

  const handleSetTestDate = () => {
    if (tempDate) {
      setTestDate(tempDate);
      setShowSettings(false);
    }
  };

  const handleAdjustGoal = () => {
    adjustDailyGoal(tempGoal);
    setShowSettings(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDaysRemaining = () => {
    if (!studyPlan.testDate) return 0;
    const today = new Date();
    const testDate = new Date(studyPlan.testDate);
    return Math.ceil((testDate - today) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Calendar className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Study Planner
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
        >
          <Settings className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`} />
        </button>
      </div>

      {showSettings && (
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Test Date
              </label>
              <input
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-600 border-gray-500 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Daily Goal (questions)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={tempGoal}
                onChange={(e) => setTempGoal(parseInt(e.target.value) || 1)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-600 border-gray-500 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleSetTestDate}
                className={`px-4 py-2 rounded-lg font-medium ${
                  darkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                Set Date
              </button>
              <button
                type="button"
                onClick={handleAdjustGoal}
                className={`px-4 py-2 rounded-lg font-medium ${
                  darkMode 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                Set Goal
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Test Date */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Test Date
            </span>
          </div>
          <div className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {formatDate(studyPlan.testDate)}
          </div>
        </div>

        {/* Days Remaining */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex items-center space-x-2 mb-2">
            <Clock className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Days Remaining
            </span>
          </div>
          <div className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {getDaysRemaining()}
          </div>
        </div>

        {/* Daily Goal */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex items-center space-x-2 mb-2">
            <Target className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Daily Goal
            </span>
          </div>
          <div className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {studyPlan.dailyGoal} questions
          </div>
        </div>

        {/* Daily Progress */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className={`w-4 h-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Today's Progress
            </span>
          </div>
          <div className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {studyPlan.completedToday}/{studyPlan.dailyGoal}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getDailyProgress()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <TrendingUp className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Overall Study Progress
            </span>
          </div>
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {getStudyProgress()}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${getStudyProgress()}%` }}
          />
        </div>
        <div className={`mt-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
          {studyPlan.questionsCompleted} of {studyPlan.totalQuestionsNeeded} questions completed
        </div>
      </div>

      {/* Recommendations */}
      {studyPlan.testDate && (
        <div className={`mt-6 p-4 rounded-lg ${
          getDaysRemaining() <= 7 
            ? darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
            : darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <span className="font-medium">Recommendation: </span>
            {getDaysRemaining() <= 7 
              ? `Only ${getDaysRemaining()} days left! Consider increasing your daily goal to ${Math.ceil((studyPlan.totalQuestionsNeeded - studyPlan.questionsCompleted) / getDaysRemaining())} questions per day.`
              : `You're on track! Keep up with ${studyPlan.dailyGoal} questions per day to reach your goal.`
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyPlanner;
