import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Calendar, Target, Award, Activity } from 'lucide-react';

const ProgressCharts = ({ 
  testHistory, 
  progressStreaks, 
  getWeeklyProgress, 
  getMonthlyProgress,
  domainMastery,
  darkMode 
}) => {
  
  // Calculate weekly performance data
  const getWeeklyPerformanceData = () => {
    const weeklyData = getWeeklyProgress();
    return weeklyData.map((day, index) => ({
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index],
      studied: day.studied,
      questions: day.questions,
      accuracy: day.accuracy || 0
    }));
  };
  
  // Calculate monthly performance data
  const getMonthlyPerformanceData = () => {
    const monthlyData = getMonthlyProgress();
    const last30Days = monthlyData.slice(-30);
    
    return last30Days.map((day, index) => ({
      day: index + 1,
      studied: day.studied,
      questions: day.questions,
      accuracy: day.accuracy || 0
    }));
  };
  
  // Calculate test score trends
  const getTestScoreTrends = () => {
    const recentTests = testHistory.slice(0, 10).reverse();
    return recentTests.map((test, index) => ({
      testNumber: index + 1,
      score: test.score,
      date: new Date(test.timestamp).toLocaleDateString(),
      domain: test.domain || 'Mixed'
    }));
  };
  
  // Calculate domain comparison data
  const getDomainComparisonData = () => {
    if (!domainMastery?.levels) return [];
    
    return Object.entries(domainMastery.levels).map(([domain, data]) => ({
      domain,
      mastery: Math.round(data.masteryLevel * 100),
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      attempts: data.attempts || 0
    })).sort((a, b) => b.mastery - a.mastery);
  };
  
  const weeklyData = getWeeklyPerformanceData();
  const monthlyData = getMonthlyPerformanceData();
  const testTrends = getTestScoreTrends();
  const domainData = getDomainComparisonData();
  
  // Simple bar chart component
  const SimpleBarChart = ({ data, title, dataKey, colorClass }) => {
    const maxValue = Math.max(...data.map(d => d[dataKey] || 0));
    
    return (
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <h4 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h4>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className={`w-12 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                {item.day || item.domain}
              </div>
              <div className="flex-1">
                <div className={`w-full h-4 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                  <div 
                    className={`h-4 rounded-full ${colorClass} transition-all duration-500`}
                    style={{ width: `${maxValue > 0 ? (item[dataKey] / maxValue) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className={`w-12 text-right text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {item[dataKey]}%
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Progress ring component
  const ProgressRing = ({ percentage, size = 120, strokeWidth = 8, color, label }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    
    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={darkMode ? '#374151' : '#E5E7EB'}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {percentage}%
            </span>
          </div>
        </div>
        <span className={`mt-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {label}
        </span>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Performance Overview Cards */}
      <section className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} rounded-xl p-6`}>
        <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <Activity size={20} />
          Performance Metrics
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current Streak */}
          <div className="flex flex-col items-center">
            <ProgressRing 
              percentage={Math.min((progressStreaks.currentStreak / 30) * 100, 100)}
              color="#10B981"
              label={`${progressStreaks.currentStreak} Day Streak`}
            />
          </div>
          
          {/* Monthly Goal Progress */}
          <div className="flex flex-col items-center">
            <ProgressRing 
              percentage={Math.min((getMonthlyProgress().filter(d => d.studied).length / 20) * 100, 100)}
              color="#3B82F6"
              label={`${getMonthlyProgress().filter(d => d.studied).length} Study Days`}
            />
          </div>
          
          {/* Average Test Score */}
          <div className="flex flex-col items-center">
            {testTrends.length > 0 ? (
              <ProgressRing 
                percentage={Math.round(testTrends.reduce((sum, t) => sum + t.score, 0) / testTrends.length)}
                color="#8B5CF6"
                label="Average Score"
              />
            ) : (
              <div className="flex flex-col items-center">
                <div className={`w-32 h-32 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center`}>
                  <span className={`text-lg font-medium ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                    No Data
                  </span>
                </div>
                <span className={`mt-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Average Score
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Weekly Activity Chart */}
      <section className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} rounded-xl p-6`}>
        <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <Calendar size={20} />
          Weekly Activity
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SimpleBarChart 
            data={weeklyData}
            title="Questions Answered"
            dataKey="questions"
            colorClass="bg-blue-500"
          />
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h4 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Study Days
            </h4>
            <div className="grid grid-cols-7 gap-1">
              {weeklyData.map((day, index) => (
                <div key={index} className="text-center">
                  <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                    {day.day.slice(0, 1)}
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    day.studied 
                      ? 'bg-green-500 text-white' 
                      : darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {day.studied ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Domain Performance Comparison */}
      {domainData.length > 0 && (
        <section className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} rounded-xl p-6`}>
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <BarChart3 size={20} />
            Domain Performance Comparison
          </h2>
          
          <SimpleBarChart 
            data={domainData}
            title="Mastery Levels"
            dataKey="mastery"
            colorClass="bg-purple-500"
          />
        </section>
      )}

      {/* Test Score Trends */}
      {testTrends.length > 0 && (
        <section className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} rounded-xl p-6`}>
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <TrendingUp size={20} />
            Recent Test Performance
          </h2>
          
          <div className="space-y-3">
            {testTrends.slice(-5).map((test, index) => (
              <div key={index} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Test #{test.testNumber}
                    </span>
                    <span className={`ml-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                      {test.date}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                      {test.domain}
                    </span>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      test.score >= 90 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      test.score >= 80 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      test.score >= 70 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {test.score}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProgressCharts;
