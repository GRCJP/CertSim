import React, { useState } from 'react';
import { useTestMode } from '../contexts/TestModeContext';
import { Calendar, Play } from 'lucide-react';
import DomainSelector from './DomainSelector';
import { getBankMeta } from '../lib/questionBanks';

const ExamFocusedDashboard = ({ questions: questionsProp }) => {
  const {
    darkMode,
    setMode,
    getQuestionBankTotal,
    studyPlan,
    setTestDate,
    setDailyGoal,
    setTargetQuestionsPerDay,
    daysUntil,
    progressStreaks,
    domainMastery,
    missedQuestions,
    scoreStats,
    startSimulatedTest,
    resetProgress,
    questions,
    startDomainPractice,
    questionBankId
  } = useTestMode();

  const [showSettings, setShowSettings] = useState(false);
  const [studyDays, setStudyDays] = useState(15);
  const [useCustomGoals, setUseCustomGoals] = useState(false);
  const [customTargetQuestions, setCustomTargetQuestions] = useState(15);

  // Helper functions
  const computeAutoGoals = (days) => {
    const totalQuestions = getQuestionBankTotal() || 500;
    const dailyGoal = Math.ceil(totalQuestions / days);
    const targetQuestions = dailyGoal;
    return { dailyGoal, targetQuestions };
  };

  const handleStudyDaysChange = (days) => {
    setStudyDays(days);
    if (!useCustomGoals) {
      const { dailyGoal, targetQuestions } = computeAutoGoals(days);
      setDailyGoal(dailyGoal);
      setTargetQuestionsPerDay(targetQuestions);
    }
  };

  const handleCustomToggle = (enabled) => {
    setUseCustomGoals(enabled);
    if (!enabled) {
      // Switch to auto-computed goals
      const { dailyGoal, targetQuestions } = computeAutoGoals(studyDays);
      setDailyGoal(dailyGoal);
      setTargetQuestionsPerDay(targetQuestions);
    }
  };

  const handleCustomTargetQuestionsChange = (value) => {
    const validValue = Math.max(1, parseInt(value) || 1);
    setCustomTargetQuestions(validValue);
    setTargetQuestionsPerDay(validValue);
  };

  // Debug: Check if questions are available in ExamFocusedDashboard
  console.log('🏠 ExamFocusedDashboard: Questions check:', {
    questionsAvailable: !!questionsProp,
    questionsLength: questionsProp?.length || 0,
    questionsType: typeof questionsProp,
    isArray: Array.isArray(questionsProp),
    sampleQuestion: questionsProp?.[0] || null
  });
  
  // Color theme based on exam bank
  const isCCA = questionBankId === 'bankCCA';
  const primaryGradient = isCCA
    ? darkMode 
      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
      : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
    : darkMode
      ? 'bg-gradient-to-r from-green-600 to-yellow-600 hover:from-green-700 hover:to-yellow-700'
      : 'bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600';
  
  const secondaryGradient = isCCA
    ? darkMode 
      ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700' 
      : 'bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600'
    : darkMode
      ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700'
      : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600';

  const handleCompleteReset = () => {
    if (window.confirm('⚠️ COMPLETE RESET - Are you sure? This will clear:\n\n• All progress and statistics\n• Study streaks and history\n• Question mastery and domain stats\n• Study plan and readiness data\n• Daily goals and progress\n• All practice sessions\n• All missed questions\n\n⚠️ This action cannot be undone!')) {
      console.log('🧹 Performing complete reset of all study data');
      
      // Reset all progress and study data
      resetProgress();
      
      // Clear localStorage study data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cmmc_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('🧹 Cleared localStorage keys:', keysToRemove);
      
      // Close settings and reload
      setShowSettings(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const overallAccuracy = scoreStats.totalQuestions > 0 
    ? Math.round((scoreStats.correctAnswers / scoreStats.totalQuestions) * 100) 
    : 0;

  const handlePrimaryAction = () => {
    setMode('dailyDrills');
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-slate-900'} p-3 sm:p-4`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="text-center mb-6">
            <p className={`text-sm font-semibold tracking-wide uppercase mb-2 ${darkMode ? 'text-teal-300' : 'text-teal-800'}`}>
              CertSim · v2
            </p>
            <h1 className="text-3xl font-bold mb-2">
              {getBankMeta(questionBankId).label}
            </h1>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {getQuestionBankTotal()} practice questions · Learn → Drill → Exam → Review
            </p>
            {studyPlan.testDate && (
              <p className={`text-lg font-medium text-teal-700 dark:text-teal-300 mt-2`}>
                {daysUntil(studyPlan.testDate)} days until exam
              </p>
            )}
          </div>

          <div className={`${darkMode ? 'bg-gray-700' : 'bg-stone-100'} rounded-xl p-6 mb-6`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <span className="text-4xl font-bold text-orange-500">{progressStreaks.currentStreak}</span>
                <div className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Day streak</div>
              </div>
              <div>
                <span className="text-4xl font-bold text-teal-600">
                  {studyPlan.testDate ? daysUntil(studyPlan.testDate) : '--'}
                </span>
                <div className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Days until exam</div>
              </div>
              <div>
                <span className="text-4xl font-bold text-emerald-600">{overallAccuracy}%</span>
                <div className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Exam readiness</div>
              </div>
            </div>
          </div>

          {/* Learning path — one clear job per step */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-3 text-center">Today&apos;s study path</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setMode('rapidMemory')}
                className={`text-left rounded-xl p-4 border transition-colors ${
                  darkMode
                    ? 'bg-slate-900/40 border-teal-500/40 hover:border-teal-400'
                    : 'bg-teal-50 border-teal-200 hover:border-teal-400'
                }`}
              >
                <div className="font-bold mb-1">1. Memory Drill</div>
                <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Scenario + question + answer + explanation in one view
                </p>
              </button>
              <button
                type="button"
                onClick={handlePrimaryAction}
                className={`text-left rounded-xl p-4 border transition-colors ${
                  darkMode
                    ? 'bg-slate-900/40 border-slate-600 hover:border-slate-400'
                    : 'bg-white border-slate-200 hover:border-slate-400'
                }`}
              >
                <div className="font-bold mb-1">2. Daily Drills</div>
                <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Short scored set to keep your streak
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof startSimulatedTest === 'function') {
                    startSimulatedTest(questionsProp || questions || []);
                  }
                  setMode('simulated');
                }}
                className={`text-left rounded-xl p-4 border transition-colors ${
                  darkMode
                    ? 'bg-slate-900/40 border-slate-600 hover:border-slate-400'
                    : 'bg-white border-slate-200 hover:border-slate-400'
                }`}
              >
                <div className="font-bold mb-1">3. Timed Exam</div>
                <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Full simulated test under exam pressure
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode('kindle')}
                className={`text-left rounded-xl p-4 border transition-colors ${
                  darkMode
                    ? 'bg-slate-900/40 border-amber-500/40 hover:border-amber-400'
                    : 'bg-amber-50 border-amber-200 hover:border-amber-400'
                }`}
              >
                <div className="font-bold mb-1">4. Kindle / Offline</div>
                <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  EPUB + static HTML for studying away from a computer
                </p>
              </button>
            </div>
          </div>

          <div className="text-center mb-6">
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
              <button
                onClick={handlePrimaryAction}
                className={`w-full md:w-auto px-8 py-4 text-lg font-bold rounded-xl transition-all ${primaryGradient} text-white shadow-lg`}
              >
                <div className="flex items-center justify-center gap-3">
                  <Play className="w-6 h-6" />
                  <span>Begin daily drills</span>
                </div>
              </button>
              
              <button
                onClick={() => setShowSettings(true)}
                className={`w-full md:w-auto px-6 py-4 text-lg font-bold rounded-xl transition-all ${secondaryGradient} text-white shadow-lg`}
              >
                <div className="flex items-center justify-center gap-3">
                  <Calendar className="w-6 h-6" />
                  <span>{studyPlan.testDate ? 'Modify study plan' : 'Set study plan'}</span>
                </div>
              </button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              <button
                onClick={() => setMode('rapidMemory')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  darkMode
                    ? 'bg-teal-600/15 text-teal-300 hover:bg-teal-600/25 border border-teal-500/30'
                    : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
                }`}
              >
                Memory Drill
              </button>
              <button
                onClick={() => setMode('quickStudy')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  darkMode
                    ? 'bg-violet-600/10 text-violet-300 hover:bg-violet-600/20 border border-violet-500/30'
                    : 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200'
                }`}
              >
                Quick Study (quiz)
              </button>
              <button
                onClick={() => setMode('reviewMissed')}
                disabled={missedQuestions.length === 0}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  missedQuestions.length === 0
                    ? darkMode 
                      ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : darkMode
                      ? 'bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-500/30'
                      : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                }`}
              >
                Review Missed ({missedQuestions.length})
              </button>
              
              <button
                onClick={() => setMode('practice')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  darkMode
                    ? 'bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/30'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                Full Practice
              </button>
              <button
                onClick={() => setMode('kindle')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  darkMode
                    ? 'bg-amber-600/10 text-amber-300 hover:bg-amber-600/20 border border-amber-500/30'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Kindle pack
              </button>
            </div>
          </div>
        </div>

        {/* Domain-Specific Practice */}
        <DomainSelector
          questions={questionsProp}
          domainMastery={domainMastery}
          darkMode={darkMode}
          onDomainSelect={startDomainPractice}
          onStartPractice={() => setMode('domainPractice')}
          missedQuestions={missedQuestions}
        />
      </div>

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
                  value={studyPlan.testDate || ''}
                  onChange={(e) => setTestDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
              </div>

              {/* Study Days */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                  Study Days
                </label>
                <select
                  value={studyDays}
                  onChange={(e) => handleStudyDaysChange(parseInt(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                >
                  <option value={7}>7 days</option>
                  <option value={10}>10 days</option>
                  <option value={15}>15 days</option>
                  <option value={20}>20 days</option>
                  <option value={30}>30 days</option>
                  <option value={45}>45 days</option>
                  <option value={60}>60 days</option>
                </select>
              </div>

              {/* Custom Goals Checkbox */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="customGoals"
                  checked={useCustomGoals}
                  onChange={(e) => handleCustomToggle(e.target.checked)}
                  className={`w-4 h-4 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-purple-500' : 'bg-white border-gray-300 text-purple-600'} focus:ring-purple-500`}
                />
                <label htmlFor="customGoals" className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Use custom daily goals
                </label>
              </div>

              {/* Auto-computed goals display */}
              {!useCustomGoals && (
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Auto-computed goals:
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Daily goal: {computeAutoGoals(studyDays).dailyGoal} questions
                  </p>
                </div>
              )}

              {/* Custom Goals Inputs */}
              {useCustomGoals && (
                <>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                      Target Questions Per Day
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={customTargetQuestions}
                      onChange={(e) => handleCustomTargetQuestionsChange(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    />
                  </div>
                </>
              )}

              {/* Progress Summary */}
              {studyPlan.testDate && (
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    📅 {daysUntil(studyPlan.testDate)} days until exam
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    📊 Daily goal: {studyPlan.dailyGoal || 15} questions
                  </p>
                </div>
              )}
              
              {/* Save Button */}
              <div className="flex justify-between pt-4 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}">
                <button
                  onClick={handleCompleteReset}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    darkMode
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  🗑️ Reset All Data
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    darkMode
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-purple-500 text-white hover:bg-purple-600'
                  }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamFocusedDashboard;
