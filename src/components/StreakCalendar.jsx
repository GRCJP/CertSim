import React from 'react';
import { Calendar, Flame, TrendingUp, Award } from 'lucide-react';

const StreakCalendar = ({ progressStreaks, getWeeklyProgress, getMonthlyProgress, getStreakMessage, darkMode }) => {
  const weeklyData = getWeeklyProgress();
  const monthlyData = getMonthlyProgress();
  
  const getStreakColor = (streak) => {
    if (streak >= 30) return 'text-purple-500';
    if (streak >= 14) return 'text-orange-500';
    if (streak >= 7) return 'text-red-500';
    if (streak >= 3) return 'text-yellow-500';
    return 'text-gray-700';
  };

  const getDayColor = (studied, questions, accuracy) => {
    if (!studied) return darkMode ? 'bg-gray-700' : 'bg-gray-100';
    if (accuracy >= 90) return darkMode ? 'bg-green-600' : 'bg-green-500';
    if (accuracy >= 75) return darkMode ? 'bg-green-700' : 'bg-green-400';
    if (accuracy >= 60) return darkMode ? 'bg-yellow-700' : 'bg-yellow-400';
    return darkMode ? 'bg-red-700' : 'bg-red-400';
  };

  const getDayTooltip = (day) => {
    if (!day.studied) return 'No study activity';
    return `${day.questions} questions • ${day.accuracy}% accuracy`;
  };

  return (
    <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
      {/* Streak Overview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <Flame className={getStreakColor(progressStreaks.currentStreak)} size={24} />
            Study Streaks
          </h3>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
            Best: {progressStreaks.bestStreak} days
          </div>
        </div>
        
        <div className={`text-center py-3 px-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} mb-3`}>
          <div className={`text-3xl font-bold ${getStreakColor(progressStreaks.currentStreak)}`}>
            {progressStreaks.currentStreak}
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Current Day Streak
          </div>
        </div>
        
        <div className={`text-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {getStreakMessage()}
        </div>
      </div>

      {/* Weekly View */}
      <div className="mb-6">
        <h4 className={`text-sm font-medium mb-3 flex items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          <Calendar size={16} />
          This Week
        </h4>
        <div className="grid grid-cols-7 gap-2">
          {weeklyData.map((day, index) => (
            <div key={index} className="text-center">
              <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                {day.day}
              </div>
              <div
                className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium transition-all hover:scale-110 ${getDayColor(day.studied, day.questions, day.accuracy)} ${
                  day.studied ? (darkMode ? 'text-white' : 'text-white') : (darkMode ? 'text-gray-400' : 'text-gray-700')
                }`}
                title={getDayTooltip(day)}
              >
                {day.studied && day.questions > 0 ? day.questions : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Heatmap */}
      <div className="mb-6">
        <h4 className={`text-sm font-medium mb-3 flex items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          <TrendingUp size={16} />
          Last 30 Days
        </h4>
        <div className="grid grid-cols-6 gap-1">
          {monthlyData.map((day, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-sm transition-all hover:scale-150 ${getDayColor(day.studied, day.questions, day.accuracy)}`}
              title={getDayTooltip(day)}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`} />
            <span className={darkMode ? 'text-gray-400' : 'text-gray-700'}>No study</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${darkMode ? 'bg-red-700' : 'bg-red-400'}`} />
            <span className={darkMode ? 'text-gray-400' : 'text-gray-700'}>60-75%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${darkMode ? 'bg-yellow-700' : 'bg-yellow-400'}`} />
            <span className={darkMode ? 'text-gray-400' : 'text-gray-700'}>75-90%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${darkMode ? 'bg-green-700' : 'bg-green-400'}`} />
            <span className={darkMode ? 'text-gray-400' : 'text-gray-700'}>90%+</span>
          </div>
        </div>
      </div>

      {/* Goals Progress */}
      <div>
        <h4 className={`text-sm font-medium mb-3 flex items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          <Award size={16} />
          Weekly Goals
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Study days this week
            </span>
            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {weeklyData.filter(d => d.studied).length} / {progressStreaks.weeklyGoal}
            </span>
          </div>
          <div className={`w-full bg-gray-200 rounded-full h-2 ${darkMode ? 'bg-gray-700' : ''}`}>
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (weeklyData.filter(d => d.studied).length / progressStreaks.weeklyGoal) * 100)}%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreakCalendar;
