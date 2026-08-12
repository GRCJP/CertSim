import React, { useState } from 'react';
import { useTestMode } from '../contexts/TestModeContext';
import { getBankMeta } from '../lib/questionBanks';
import { 
  Menu, 
  X, 
  TrendingUp, 
  Target, 
  Calendar, 
  Award, 
  BookOpen, 
  Clock,
  BarChart3,
  Brain,
  Zap,
  ChevronDown,
  ChevronUp,
  Activity,
  Star
} from 'lucide-react';
import StudyPlanner from './StudyPlanner';

const Sidebar = () => {
  const { 
    darkMode, 
    questionBankId, 
    scoreStats, 
    studyPlan, 
    progressStreaks, 
    spacedRepetition,
    adaptiveDifficulty,
    missedQuestions,
    testHistory
  } = useTestMode();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState({
    performance: true,
    progress: true,
    study: false,
    focus: true
  });

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'study', label: 'Study', icon: BookOpen }
  ];

  // Get question count for current bank
  const getQuestionCount = (bankId) => {
    const counts = {
      'bankCCP': 376,
      'bankCCA': 150,
    };
    return counts[bankId] || 200;
  };

  // Calculate accuracy
  const getAccuracy = () => {
    if (scoreStats.totalQuestions === 0) return 0;
    return Math.round((scoreStats.correctAnswers / scoreStats.totalQuestions) * 100);
  };

  // Get weak domains from test history
  const getWeakDomainsFromHistory = () => {
    if (!testHistory || testHistory.length === 0) return [];
    
    const domainPerformance = {};
    testHistory.forEach(test => {
      if (test && test.domainScores) {
        Object.entries(test.domainScores).forEach(([domain, score]) => {
          if (!domainPerformance[domain]) {
            domainPerformance[domain] = { correct: 0, total: 0 };
          }
          domainPerformance[domain].correct += score.correct || 0;
          domainPerformance[domain].total += score.total || 0;
        });
      }
    });

    return Object.entries(domainPerformance)
      .filter(([_, performance]) => {
        const accuracy = (performance.correct / performance.total) * 100;
        return accuracy < 70 && performance.total >= 5;
      })
      .map(([domain, _]) => domain)
      .slice(0, 3);
  };

  // Calculate study time (mock for now - could be enhanced with real tracking)
  const getStudyTime = () => {
    const totalQuestions = scoreStats.totalQuestions;
    const estimatedMinutes = Math.round(totalQuestions * 1.5); // ~1.5 min per question
    const hours = Math.floor(estimatedMinutes / 60);
    const minutes = estimatedMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // Calculate weekly progress
  const getWeeklyProgress = () => {
    if (!testHistory || testHistory.length === 0) return 0;
    
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const thisWeekSessions = testHistory.filter(test => 
      test && test.date && new Date(test.date) >= weekStart
    );
    
    return thisWeekSessions.length;
  };

  const MINIMUM_DAILY_DRILL = 10;
  const todayKey = new Date().toDateString();
  let dailyGoalStatus = null;
  try {
    const bankKey = `cmmcDailyGoals_${questionBankId}`;
    const raw = localStorage.getItem(bankKey);
    const parsed = raw ? JSON.parse(raw) : {};
    dailyGoalStatus = parsed && typeof parsed === 'object' ? parsed[todayKey] : null;
  } catch (e) {
    dailyGoalStatus = null;
  }

  const stats = {
    accuracy: getAccuracy(),
    currentStreak: progressStreaks.currentStreak,
    bestStreak: progressStreaks.bestStreak,
    dailyStreak: progressStreaks.dailyStreak,
    questionsCompleted: scoreStats.totalQuestions,
    totalQuestions: getQuestionCount(questionBankId),
    studyTime: getStudyTime(),
    weeklyGoal: progressStreaks.weeklyGoal,
    weeklyProgress: getWeeklyProgress(),
    weakDomains: getWeakDomainsFromHistory(),
    nextReview: spacedRepetition.queue.length,
    masteredTopics: spacedRepetition.mastered.length,
    difficultyLevel: adaptiveDifficulty.currentLevel
  };


  return (
    <>
      {/* Menu Button */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-4 left-4 z-50 p-2 rounded-lg transition-colors ${
          darkMode 
            ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm'
        }`}
        title="Toggle sidebar"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-80 transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className={`h-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} shadow-xl overflow-y-auto`}>
          {/* Header */}
          <div className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Your Progress</h2>
              <button
                onClick={toggleSidebar}
                className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800`}
              >
                <X size={18} />
              </button>
            </div>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
              {getBankMeta(questionBankId).label}
            </p>
          </div>

          {/* Study Planner */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <StudyPlanner />
          </div>

          {/* Navigation Tabs */}
          <div className={`flex border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? darkMode 
                        ? 'bg-blue-600 text-white border-b-2 border-blue-600' 
                        : 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : darkMode
                        ? 'text-gray-700 hover:text-gray-200 hover:bg-gray-800'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-4 space-y-4">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Key Metrics - Simplified */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={14} className="text-blue-500" />
                      <span className="text-xs text-gray-700">Accuracy</span>
                    </div>
                    <div className="text-xl font-bold">{stats.accuracy}%</div>
                  </div>
                  
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp size={14} className="text-green-500" />
                      <span className="text-xs text-gray-700">Streak</span>
                    </div>
                    <div className="text-xl font-bold">{stats.currentStreak}</div>
                  </div>
                </div>

                {/* Progress Overview */}
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <h4 className="text-sm font-medium mb-3">Overall Progress</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Questions</span>
                        <span>{stats.questionsCompleted}/{stats.totalQuestions}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${(stats.questionsCompleted / stats.totalQuestions) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Weekly Goal</span>
                        <span>{stats.weeklyProgress}/{stats.weeklyGoal} days</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${(stats.weeklyProgress / stats.weeklyGoal) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-blue-500" />
                      <span className="text-sm">Study Time</span>
                    </div>
                    <span className="text-sm font-medium">{stats.studyTime}</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="text-green-500" />
                      <span className="text-sm">Mastered</span>
                    </div>
                    <span className="text-sm font-medium">{stats.masteredTopics}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === 'performance' && (
              <div className="space-y-4">
                {/* Performance Metrics */}
                <CollapsibleSection 
                  title="Performance Metrics"
                  isExpanded={expandedSections.performance}
                  onToggle={() => toggleSection('performance')}
                  darkMode={darkMode}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Award size={14} className="text-yellow-500" />
                        <span className="text-sm">Best Streak</span>
                      </div>
                      <span className="text-sm font-medium">{stats.bestStreak}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-purple-500" />
                        <span className="text-sm">Daily Streak</span>
                      </div>
                      <span className="text-sm font-medium">{stats.dailyStreak}</span>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Focus Areas */}
                {stats.weakDomains.length > 0 && (
                  <CollapsibleSection 
                    title="Focus Areas"
                    isExpanded={expandedSections.focus}
                    onToggle={() => toggleSection('focus')}
                    darkMode={darkMode}
                  >
                    <div className="space-y-2">
                      {stats.weakDomains.map((domain, index) => (
                        <div key={index} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2">
                            <BarChart3 size={14} className="text-red-500" />
                            <span className="text-sm">{domain}</span>
                          </div>
                          <span className="text-xs text-gray-700">Needs improvement</span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}
              </div>
            )}

            {/* Study Tab */}
            {activeTab === 'study' && (
              <div className="space-y-4">
                {/* Study Details */}
                <CollapsibleSection 
                  title="Study Details"
                  isExpanded={expandedSections.study}
                  onToggle={() => toggleSection('study')}
                  darkMode={darkMode}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Brain size={14} className="text-purple-500" />
                        <span className="text-sm">Difficulty Level</span>
                      </div>
                      <span className="text-sm font-medium">{stats.difficultyLevel}/5</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-yellow-500" />
                        <span className="text-sm">Next Review</span>
                      </div>
                      <span className="text-sm font-medium">{stats.nextReview} questions</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Star size={14} className="text-orange-500" />
                        <span className="text-sm">Total Sessions</span>
                      </div>
                      <span className="text-sm font-medium">{testHistory?.length || 0}</span>
                    </div>
                  </div>
                </CollapsibleSection>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Collapsible Section Component
const CollapsibleSection = ({ title, isExpanded, onToggle, children, darkMode }) => {
  return (
    <div className={`rounded-lg border ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-t-lg`}
      >
        <span className="text-sm font-medium">{title}</span>
        {isExpanded ? (
          <ChevronUp size={16} className={darkMode ? 'text-gray-400' : 'text-gray-700'} />
        ) : (
          <ChevronDown size={16} className={darkMode ? 'text-gray-400' : 'text-gray-700'} />
        )}
      </button>
      {isExpanded && (
        <div className="p-3 pt-0">
          {children}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
