import React, { useState } from 'react';
import { useTestMode } from '../contexts/TestModeContext';
import { Calendar, Target, TrendingUp, Award, Clock, BookOpen, FileText, Brain, Settings, Bookmark } from 'lucide-react';
import ExamFocusedDashboard from './ExamFocusedDashboard';
import DomainSelector from './DomainSelector';

const Dashboard = ({ questions }) => {
  const {
    darkMode,
    mode,
    setMode,
    resetToDashboard,
    isFeatureEnabled,
    textSize,
    setTextSize,
    autoDarkMode,
    setAutoDarkMode,
    questionBankId,
    setQuestionBankId,
    getQuestionBankName,
    getQuestionBankTotal,
    studyPlan,
    setTestDate,
    updateDailyProgress,
    adjustDailyGoal,
    practiceSession,
    loadActivePracticeSession,
    scoreStats,
    progressStreaks,
    domainMastery,
    getWeakDomains,
    startSimulatedTest,
    testCompleted,
    dailyDrillOrder,
    dailyDrillAnswers,
    missedQuestions,
    markedQuestions,
    daysUntil,
    // Domain practice functions
    startDomainPractice,
    clearDomainPractice,
    // Sync functionality
    isSyncing,
    lastSyncTime,
    syncDataFromCloud,
    debugSync,
  } = useTestMode();

  // Fix for duplicate questions declaration - using prop from App.jsx

  const [showSettings, setShowSettings] = useState(false);
  const [testDate, setTestDateLocal] = useState(studyPlan.testDate || '');
  const [customDailyGoal, setCustomDailyGoal] = useState(studyPlan.dailyGoal || 15);
  const [activeTab, setActiveTab] = useState('practice'); // learn, test, track, plan

  // Calculate daily progress from progressStreaks
  const dailyProgress = {
    correctAnswers: progressStreaks?.todayCorrect || 0,
    totalQuestions: progressStreaks?.todayTotal || 0
  };

  // Helper functions for journey framing and improved messaging
  const getJourneyPhase = (totalQuestions) => {
    if (totalQuestions === 0) return 1;
    if (totalQuestions < 20) return 1;
    if (totalQuestions < 50) return 2;
    if (totalQuestions < 100) return 3;
    if (totalQuestions < 150) return 4;
    return 5;
  };

  const getJourneyPhaseName = (totalQuestions) => {
    const phase = getJourneyPhase(totalQuestions);
    const phases = {
      1: 'Getting Started',
      2: 'Building Foundation', 
      3: 'Gaining Momentum',
      4: 'Advanced Practice',
      5: 'Exam Ready'
    };
    return phases[phase] || 'Getting Started';
  };

  const getStreakMessage = (currentStreak) => {
    if (currentStreak === 0) {
      return 'Start your streak today! ';
    } else if (currentStreak === 1) {
      return '1 day - Great start! ';
    } else if (currentStreak < 7) {
      return `${currentStreak} days - Building momentum! `;
    } else if (currentStreak < 14) {
      return `${currentStreak} days - On fire! `;
    } else if (currentStreak < 30) {
      return `${currentStreak} days - Unstoppable! `;
    } else {
      return `${currentStreak} days - Mastery! `;
    }
  };

  const getNextMilestone = (totalQuestions) => {
    const milestones = [10, 25, 50, 75, 100, 125, 150];
    for (const milestone of milestones) {
      if (totalQuestions < milestone) {
        return milestone - totalQuestions;
      }
    }
    return 0;
  };

  // Conditional rendering helpers
  const shouldShowReviewMissed = missedQuestions && missedQuestions.length > 0;
  const shouldShowPerformance = scoreStats.totalQuestions >= 10;
  const shouldShowStreak = progressStreaks.currentStreak > 0 || scoreStats.totalQuestions > 0;
  const hasWeakDomains = getWeakDomains && getWeakDomains().length > 0;

  // Quick action tiles configuration
  const quickActions = [
    {
      id: 'dailyDrills',
      title: 'Daily Practice',
      description: 'Complete your daily 10-question drill',
      icon: BookOpen,
      color: 'purple',
      bgColor: darkMode ? 'bg-purple-600/20' : 'bg-purple-100',
      borderColor: darkMode ? 'border-purple-500/30' : 'border-purple-200',
      iconBg: darkMode ? 'bg-purple-600' : 'bg-purple-500',
      onClick: () => setMode('dailyDrills'),
      show: true
    },
    {
      id: 'reviewMissed',
      title: 'Review Missed',
      description: `Master ${missedQuestions?.length || 0} missed questions`,
      icon: Target,
      color: 'red',
      bgColor: darkMode ? 'bg-red-600/20' : 'bg-red-100',
      borderColor: darkMode ? 'border-red-500/30' : 'border-red-200',
      iconBg: darkMode ? 'bg-red-600' : 'bg-red-500',
      onClick: () => setMode('reviewMissed'),
      show: shouldShowReviewMissed
    },
    {
      id: 'reviewMarked',
      title: 'Review Marked',
      description: `Review ${markedQuestions?.size || 0} marked questions`,
      icon: Bookmark,
      color: 'amber',
      bgColor: darkMode ? 'bg-amber-600/20' : 'bg-amber-100',
      borderColor: darkMode ? 'border-amber-500/30' : 'border-amber-200',
      iconBg: darkMode ? 'bg-amber-600' : 'bg-amber-500',
      onClick: () => setMode('reviewMarked'),
      show: true
    },
    {
      id: 'practice',
      title: 'Practice Mode',
      description: 'Review all questions with immediate feedback',
      icon: BookOpen,
      color: 'blue',
      bgColor: darkMode ? 'bg-blue-600/20' : 'bg-blue-100',
      borderColor: darkMode ? 'border-blue-500/30' : 'border-blue-200',
      iconBg: darkMode ? 'bg-blue-600' : 'bg-blue-500',
      onClick: () => setMode('practice'),
      show: true
    },
    {
      id: 'improveDomains',
      title: 'Improve Weak Domains',
      description: `Focus on ${getWeakDomains()?.length || 0} areas needing improvement`,
      icon: TrendingUp,
      color: 'orange',
      bgColor: darkMode ? 'bg-orange-600/20' : 'bg-orange-100',
      borderColor: darkMode ? 'border-orange-500/30' : 'border-orange-200',
      iconBg: darkMode ? 'bg-orange-600' : 'bg-orange-500',
      onClick: () => setMode('practice'),
      show: hasWeakDomains
    }
  ].filter(action => action.show);

  const calculateRecommendedGoal = (targetDate) => {
    if (!targetDate) return 15;
    
    const today = new Date();
    const target = new Date(targetDate);
    const daysRemaining = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 0) return 15;
    
    const totalQuestions = getQuestionBankTotal();
    const questionsRemaining = totalQuestions - scoreStats.totalQuestions;
    const recommendedDaily = Math.ceil(questionsRemaining / daysRemaining);
    
    return Math.max(10, Math.min(50, recommendedDaily)); // Between 10-50 questions per day
  };

  const handleSaveSettings = () => {
    const recommendedGoal = calculateRecommendedGoal(testDate);
    setTestDate(testDate);
    adjustDailyGoal(customDailyGoal || recommendedGoal);
    setShowSettings(false);
  };

  const getDailyGoalStatus = () => {
    const today = new Date().toDateString();
    const bankKey = `cmmcDailyGoals_${questionBankId}`;
    try {
      const dailyGoals = JSON.parse(localStorage.getItem(bankKey) || '{}');
      return dailyGoals[today] || null;
    } catch (error) {
      console.error('Error parsing daily goals:', error);
      return null;
    }
  };

  const dailyGoalStatus = getDailyGoalStatus();
  const hasActiveSession = dailyDrillOrder.length > 0 && dailyDrillAnswers.length < dailyDrillOrder.length;
  const weakDomains = getWeakDomains(3);
  const overallAccuracy = scoreStats.totalQuestions > 0 
    ? Math.round((scoreStats.correctAnswers / scoreStats.totalQuestions) * 100) 
    : 0;

  const handleContinuePractice = () => {
    setMode('dailyDrills');
  };

  const handleResetAllData = () => {
    console.log('🚨 handleResetAllData called - user clicked reset all data');
    if (window.confirm('⚠️ Are you sure you want to reset ALL data? This will clear:\n\n• All progress and statistics\n• Study streaks and history\n• Question statistics and mastery\n• Daily goals and progress\n• Practice sessions\n\nThis action cannot be undone!')) {
      // Clear all localStorage data
      const keysToKeep = ['theme', 'textSize', 'autoDarkMode']; // Keep user preferences
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      // Reload the page to reset all state
      window.location.reload();
    }
  };

  const handleStartSimulated = () => {
    setMode('simulated');
  };

  // Feature flag: Show exam-focused dashboard when enabled
  console.log('🎯 Dashboard: Checking examFocusedDashboard feature flag...');
  const examDashboardEnabled = isFeatureEnabled('examFocusedDashboard');
  console.log('🎯 Dashboard: examFocusedDashboard enabled:', examDashboardEnabled);
  
  // TEMPORARILY FORCE NEW UI FOR DEVELOPMENT
  console.log('🎯 Dashboard: FORCING ExamFocusedDashboard for development');
  return <ExamFocusedDashboard questions={questions} />;
  
  if (examDashboardEnabled) {
    console.log('🎯 Dashboard: Rendering ExamFocusedDashboard');
    return <ExamFocusedDashboard questions={questions} />;
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-slate-900'} p-3 sm:p-4`}>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-xl p-6 max-w-md w-full shadow-xl`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  Study Plan Settings
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className={`text-2xl ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Test Date */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                    Test Date
                  </label>
                  <input
                    type="date"
                    value={testDate}
                    onChange={(e) => setTestDateLocal(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode 
                        ? 'bg-[#334155] border-[#475569] text-[#E5E7EB]' 
                        : 'bg-white border-[#E5E7EB] text-[#1F2937]'
                    }`}
                  />
                </div>

                {/* Modern Daily Goal Display */}
                {testDate && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Daily Goal
                      </span>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs text-indigo-500 font-medium">Recommended</span>
                      </div>
                    </div>
                    
                    {/* Circular Progress Indicators */}
                    <div className="flex justify-around items-center py-4">
                      {/* Recommended Goal */}
                      <div className="text-center">
                        <div className={`w-16 h-16 rounded-full border-2 ${
                          darkMode ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50'
                        } flex items-center justify-center mb-2`}>
                          <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                            {calculateRecommendedGoal(testDate)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Recommended</p>
                          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>questions/day</p>
                        </div>
                      </div>
                      
                      {/* VS indicator */}
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                      }`}>
                        VS
                      </div>
                      
                      {/* Custom Goal */}
                      <div className="text-center">
                        <div className={`w-16 h-16 rounded-full border-2 ${
                          darkMode ? 'border-purple-500/30 bg-purple-500/10' : 'border-purple-200 bg-purple-50'
                        } flex items-center justify-center mb-2`}>
                          <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                            {customDailyGoal || '—'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Your Goal</p>
                          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>questions/day</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Time remaining info */}
                    <div className={`text-center text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      {Math.ceil((new Date(testDate) - new Date()) / (1000 * 60 * 60 * 24))} days remaining
                    </div>
                    
                    {/* Custom Goal Input - More subtle */}
                    <div>
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={customDailyGoal}
                        onChange={(e) => setCustomDailyGoal(parseInt(e.target.value) || 0)}
                        placeholder={`Set custom goal (recommended: ${calculateRecommendedGoal(testDate)})`}
                        className={`w-full px-3 py-2 text-sm rounded-lg border ${
                          darkMode 
                            ? 'bg-gray-700/50 border-gray-600 text-gray-300 placeholder-gray-500' 
                            : 'bg-gray-50 border-gray-200 text-gray-700 placeholder-gray-400'
                        } focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                      />
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <button
                  onClick={handleSaveSettings}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    darkMode 
                      ? 'bg-[#14B8A6] text-white hover:bg-[#0D9488]' 
                      : 'bg-[#0D9488] text-white hover:bg-[#14B8A6]'
                  }`}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} rounded-2xl p-8 mb-8 shadow-lg`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="flex-shrink-0 flex justify-center sm:justify-start">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-teal-600 flex items-center justify-center text-white text-5xl font-bold">
                  CS
                </div>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                  Welcome back! {progressStreaks.currentStreak > 0 && "🔥"}
                </h1>
                <p className={`text-base sm:text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {progressStreaks.currentStreak > 0 
                    ? `Amazing! You're on a ${progressStreaks.currentStreak}-day streak! Keep that momentum going!`
                    : "Ready to start your learning adventure? Let's build your study streak today!"}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'} mt-1`}>
                  Studying: {getQuestionBankName()} ({getQuestionBankTotal()} Questions)
                </p>
                
                {/* Days to Test Reminder */}
                {studyPlan.testDate && (
                  <div className={`mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg ${
                    daysUntil(studyPlan.testDate) <= 7
                      ? darkMode ? 'bg-red-600/20 border border-red-500/30' : 'bg-red-50 border border-red-200'
                      : daysUntil(studyPlan.testDate) <= 30
                      ? darkMode ? 'bg-orange-600/20 border border-orange-500/30' : 'bg-orange-50 border border-orange-200'
                      : darkMode ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <span className="text-lg">
                      {daysUntil(studyPlan.testDate) <= 7 ? '🚨' : daysUntil(studyPlan.testDate) <= 30 ? '⏰' : '📅'}
                    </span>
                    <span className={`text-sm font-semibold ${
                      daysUntil(studyPlan.testDate) <= 7
                        ? darkMode ? 'text-red-400' : 'text-red-700'
                        : daysUntil(studyPlan.testDate) <= 30
                        ? darkMode ? 'text-orange-400' : 'text-orange-700'
                        : darkMode ? 'text-blue-400' : 'text-blue-700'
                    }`}>
                      {daysUntil(studyPlan.testDate) === 0 
                        ? 'Test is TODAY!' 
                        : daysUntil(studyPlan.testDate) === 1
                        ? 'Test is TOMORROW!'
                        : `${daysUntil(studyPlan.testDate)} days until test`}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:items-end">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowSettings(true)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium">Setup Study Plan</span>
                </button>
                <button
                  onClick={handleResetAllData}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    darkMode 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-red-500 text-white hover:bg-red-600 border border-red-600'
                  }`}
                >
                  <span className="text-sm font-medium">Reset All Data</span>
                </button>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-4xl sm:text-5xl font-bold">{progressStreaks.currentStreak}</div>
                <div className={`text-sm ${darkMode ? 'text-orange-400' : 'text-orange-600'} font-medium`}>🔥 Day Streak</div>
                
                {/* Sync Indicator */}
                <div className="mt-3 flex items-center justify-center sm:justify-end gap-2">
                  {isSyncing ? (
                    <div className="flex items-center gap-2 text-blue-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="text-xs">Syncing...</span>
                    </div>
                  ) : lastSyncTime ? (
                    <div className="flex items-center gap-2 text-green-500">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs">
                        Synced {new Date(lastSyncTime).toLocaleTimeString()}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                      <span className="text-xs">Not synced</span>
                    </div>
                  )}
                  <button
                    onClick={syncDataFromCloud}
                    disabled={isSyncing}
                    className={`p-1 rounded transition-colors ${
                      isSyncing 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : darkMode 
                          ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/20' 
                          : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                    }`}
                    title="Manual sync"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={debugSync}
                    disabled={isSyncing}
                    className={`p-1 rounded transition-colors ${
                      isSyncing
                        ? 'text-gray-400 cursor-not-allowed'
                        : darkMode
                          ? 'text-orange-400 hover:text-orange-300 hover:bg-orange-900/20'
                          : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                    }`}
                    title="Debug sync (check console)"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        
        {/* Quick Action Tiles - Circular Design like Progress Tab */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className={`group relative ${action.bgColor} border ${action.borderColor} rounded-2xl p-6 text-left transition-all duration-300 hover:scale-105 hover:shadow-lg`}
                >
                  {/* Circular Icon Container */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-16 h-16 ${action.iconBg} rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      darkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-600'
                    }`}>
                      {action.id === 'dailyDrills' && 'Daily'}
                      {action.id === 'reviewMissed' && 'Priority'}
                      {action.id === 'practice' && 'Practice'}
                      {action.id === 'improveDomains' && 'Focus'}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {action.title}
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                    {action.description}
                  </p>

                  {/* Progress Indicator for Daily Drills */}
                  {action.id === 'dailyDrills' && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Daily Progress
                        </span>
                        <span className={`text-xs font-medium ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                          {dailyProgress.correctAnswers}/{dailyProgress.totalQuestions}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                          style={{ width: `${dailyProgress.totalQuestions > 0 ? (dailyProgress.correctAnswers / dailyProgress.totalQuestions) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Domain Preview for Improvement */}
                  {action.id === 'improveDomains' && getWeakDomains() && (
                    <div className="mt-4 space-y-2">
                      {getWeakDomains().slice(0, 2).map((domain) => (
                        <div key={domain.name} className="flex items-center justify-between">
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {domain.name}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-orange-600/20 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>
                            {Math.round(domain.accuracy)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hover Effect */}
                  <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    darkMode ? 'bg-gradient-to-br from-white/5 to-white/10' : 'bg-gradient-to-br from-black/5 to-black/10'
                  }`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Single Contextual Progress Indicator */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 shadow-md border ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-8`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-green-600/20 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
                <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">{overallAccuracy}%</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {scoreStats.totalQuestions > 0 
                    ? `${scoreStats.correctAnswers} correct out of ${scoreStats.totalQuestions}`
                    : 'No questions attempted yet'
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>
                {getNextMilestone(scoreStats.totalQuestions) > 0 
                  ? `${getNextMilestone(scoreStats.totalQuestions)} questions to next milestone`
                  : 'All milestones completed! 🎉'
                }
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Phase {getJourneyPhase(scoreStats.totalQuestions)}: {getJourneyPhaseName(scoreStats.totalQuestions)}
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
              style={{ width: `${overallAccuracy}%` }}
            />
          </div>
        </div>

        {/* Study Plan Info */}
        {studyPlan.testDate && (
          <div className={`${darkMode ? 'bg-[#252526]' : 'bg-[#F2F4F8]'} rounded-xl p-6 shadow-sm`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#4C6EF5] dark:text-[#4F83FF]" />
                <h3 className="font-semibold">Study Plan</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className={`text-sm ${darkMode ? 'text-[#9AA0A6]' : 'text-[#5F6368]'} mb-1`}>
                  Test Date
                </div>
                <div className="font-semibold">
                  {new Date(studyPlan.testDate).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className={`text-sm ${darkMode ? 'text-[#9AA0A6]' : 'text-[#5F6368]'} mb-1`}>
                  Days Remaining
                </div>
                <div className="font-semibold">{studyPlan.studyDaysRemaining}</div>
              </div>
              <div>
                <div className={`text-sm ${darkMode ? 'text-[#9AA0A6]' : 'text-[#5F6368]'} mb-1`}>
                  Daily Goal
                </div>
                <div className="font-semibold">{studyPlan.dailyGoal} questions</div>
              </div>
              <div>
                <div className={`text-sm ${darkMode ? 'text-[#9AA0A6]' : 'text-[#5F6368]'} mb-1`}>
                  🎯 Completed Today
                </div>
                <div className="font-semibold">{studyPlan.completedToday}</div>
              </div>
            </div>
          </div>
        )}

        {/* Domain-Specific Practice */}
        {console.log('🏠 Dashboard rendering DomainSelector:', { 
          questionsCount: questions?.length || 0,
          domainMasteryLevels: domainMastery?.levels ? Object.keys(domainMastery.levels) : [],
          hasQuestions: !!questions
        })}
        <DomainSelector
          questions={questions}
          domainMastery={domainMastery}
          darkMode={darkMode}
          onDomainSelect={startDomainPractice}
          onStartPractice={() => setMode('domainPractice')}
          missedQuestions={missedQuestions}
        />

        {/* Additional Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <button
            onClick={() => setMode('reviewMissed')}
            className={`${darkMode ? 'bg-[#252526] text-[#9AA0A6] hover:bg-[#3C3C3C] border border-[#3C3C3C]' : 'bg-white text-[#5F6368] hover:bg-[#F8F9FA] border border-[#E0E0E0]'} rounded-lg p-4 text-center transition-all`}
          >
            <div className="text-2xl mb-2">📝</div>
            <div className="text-sm font-medium">Review Missed</div>
          </button>
          <button
            onClick={() => setMode('studyPlanner')}
            className={`${darkMode ? 'bg-[#252526] text-[#9AA0A6] hover:bg-[#3C3C3C] border border-[#3C3C3C]' : 'bg-white text-[#5F6368] hover:bg-[#F8F9FA] border border-[#E0E0E0]'} rounded-lg p-4 text-center transition-all`}
          >
            <div className="text-2xl mb-2">📅</div>
            <div className="text-sm font-medium">Study Planner</div>
          </button>
          <button
            onClick={() => setMode('performance')}
            className={`${darkMode ? 'bg-[#252526] text-[#9AA0A6] hover:bg-[#3C3C3C] border border-[#3C3C3C]' : 'bg-white text-[#5F6368] hover:bg-[#F8F9FA] border border-[#E0E0E0]'} rounded-lg p-4 text-center transition-all`}
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">Performance</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
