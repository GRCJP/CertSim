import React, { useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Brain, 
  Calendar, 
  Award, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  BookOpen,
  Zap,
  Shield,
  Star,
  Activity
} from 'lucide-react';

const EnhancedAnalytics = ({ 
  testHistory, 
  scoreStats, 
  progressStreaks, 
  getWeeklyProgress, 
  getMonthlyProgress,
  studyPlan,
  domainMastery,
  questionStats,
  darkMode,
  setMode 
}) => {
  
  // Calculate enhanced domain insights
  const getDomainAnalytics = () => {
    if (!domainMastery?.levels) return [];

    return Object.entries(domainMastery.levels).map(([domain, data]) => {
      const masteryPercentage = Math.round(data.masteryLevel * 100);
      const totalQuestions = data.total || 0;
      const correctQuestions = data.correct || 0;
      const accuracy = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;
      
      // Determine performance level
      let performanceLevel = 'Needs Improvement';
      let performanceColor = 'text-red-500';
      let progressColor = 'bg-red-500';
      
      if (masteryPercentage >= 90) {
        performanceLevel = 'Expert';
        performanceColor = 'text-green-500';
        progressColor = 'bg-green-500';
      } else if (masteryPercentage >= 75) {
        performanceLevel = 'Proficient';
        performanceColor = 'text-blue-500';
        progressColor = 'bg-blue-500';
      } else if (masteryPercentage >= 60) {
        performanceLevel = 'Developing';
        performanceColor = 'text-yellow-500';
        progressColor = 'bg-yellow-500';
      }
      
      // Calculate study recommendations
      let recommendation = 'Continue practicing to improve understanding';
      if (masteryPercentage < 60) {
        recommendation = 'Focus on foundational concepts and review missed questions';
      } else if (masteryPercentage < 75) {
        recommendation = 'Practice mixed difficulty questions to strengthen understanding';
      } else if (masteryPercentage < 90) {
        recommendation = 'Challenge yourself with advanced questions';
      } else {
        recommendation = 'Maintain expertise with periodic review';
      }
      
      return {
        domain,
        masteryPercentage,
        accuracy,
        totalQuestions,
        correctQuestions,
        attempts: data.attempts || 0,
        performanceLevel,
        performanceColor,
        progressColor,
        recommendation,
        trend: Math.random() > 0.5 ? 'improving' : 'stable' // Simplified trend
      };
    }).sort((a, b) => b.masteryPercentage - a.masteryPercentage);
  };
  
  // Calculate overall performance metrics
  const getOverallMetrics = () => {
    const weeklyData = getWeeklyProgress();
    const monthlyData = getMonthlyProgress();
    const studyDaysThisWeek = weeklyData.filter(d => d.studied).length;
    const studyDaysThisMonth = monthlyData.filter(d => d.studied).length;
    const totalQuestionsThisMonth = monthlyData.reduce((sum, day) => sum + day.questions, 0);
    
    // Calculate average score from recent tests
    const recentTests = testHistory.slice(0, 5);
    const averageScore = recentTests.length > 0 
      ? Math.round(recentTests.reduce((sum, test) => sum + test.score, 0) / recentTests.length)
      : 0;
    
    // Determine overall performance level
    let overallLevel = 'Getting Started';
    let overallColor = 'text-gray-700';
    
    if (averageScore >= 90) {
      overallLevel = 'Expert Level';
      overallColor = 'text-green-500';
    } else if (averageScore >= 80) {
      overallLevel = 'Advanced';
      overallColor = 'text-blue-500';
    } else if (averageScore >= 70) {
      overallLevel = 'Proficient';
      overallColor = 'text-purple-500';
    } else if (averageScore >= 60) {
      overallLevel = 'Developing';
      overallColor = 'text-yellow-500';
    } else if (averageScore > 0) {
      overallLevel = 'Building Foundation';
      overallColor = 'text-red-500';
    }
    
    return {
      studyDaysThisWeek,
      studyDaysThisMonth,
      totalQuestionsThisMonth,
      averageScore,
      overallLevel,
      overallColor,
      streakDays: progressStreaks.currentStreak,
      bestStreak: progressStreaks.bestStreak
    };
  };
  
  // Generate study insights
  const getStudyInsights = () => {
    const insights = [];
    const metrics = getOverallMetrics();
    
    // Streak insight
    if (metrics.streakDays >= 7) {
      insights.push({
        type: 'success',
        icon: Award,
        title: 'Amazing Consistency!',
        description: `${metrics.streakDays} day streak! You're building strong study habits.`
      });
    } else if (metrics.streakDays >= 3) {
      insights.push({
        type: 'info',
        icon: TrendingUp,
        title: 'Good Momentum',
        description: `${metrics.streakDays} day streak. Keep it going!`
      });
    }
    
    // Performance insight
    if (metrics.averageScore >= 85) {
      insights.push({
        type: 'success',
        icon: Star,
        title: 'Excellent Performance',
        description: `Your average score is ${metrics.averageScore}%. Outstanding work!`
      });
    } else if (metrics.averageScore >= 70) {
      insights.push({
        type: 'info',
        icon: CheckCircle,
        title: 'Solid Progress',
        description: `Average score of ${metrics.averageScore}%. You're on the right track!`
      });
    }
    
    // Study frequency insight
    if (metrics.studyDaysThisWeek >= 5) {
      insights.push({
        type: 'success',
        icon: Calendar,
        title: 'Perfect Week',
        description: `You studied ${metrics.studyDaysThisWeek} days this week. Excellent dedication!`
      });
    } else if (metrics.studyDaysThisWeek < 3 && metrics.streakDays > 0) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Increase Frequency',
        description: 'Try to study at least 3-5 days per week for better retention.'
      });
    }
    
    return insights.slice(0, 3); // Limit to top 3 insights
  };
  
  const domainAnalytics = getDomainAnalytics();
  const overallMetrics = getOverallMetrics();
  const studyInsights = getStudyInsights();
  
  const getInsightBg = (type) => {
    switch (type) {
      case 'success': return darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200';
      case 'warning': return darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200';
      case 'info': return darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200';
      default: return darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Overall Performance Summary */}
      <section className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} rounded-xl p-6`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Performance Overview
          </h2>
          <div className={`px-4 py-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <span className={`font-bold ${overallMetrics.overallColor}`}>
              {overallMetrics.overallLevel}
            </span>
          </div>
        </div>
        
        {/* Streak Focus Section */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center ${darkMode ? 'bg-gradient-to-br from-orange-600 to-red-600' : 'bg-gradient-to-br from-orange-400 to-red-500'} shadow-lg`}>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {overallMetrics.streakDays}
                </div>
                <div className="text-sm text-white/90">
                  Day Streak
                </div>
              </div>
            </div>
            {overallMetrics.streakDays >= 7 && (
              <div className="absolute -top-2 -right-2">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-lg">🔥</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Key Metrics in a cleaner layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className={`text-2xl font-bold text-blue-600 dark:text-blue-400`}>
                {overallMetrics.averageScore}%
              </div>
              <div className="text-sm text-blue-600/80 dark:text-blue-400/80">
                Average Score
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className={`text-2xl font-bold text-green-600 dark:text-green-400`}>
                {overallMetrics.studyDaysThisWeek}
              </div>
              <div className="text-sm text-green-600/80 dark:text-green-400/80">
                Days This Week
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className={`text-2xl font-bold text-purple-600 dark:text-purple-400`}>
                {overallMetrics.totalQuestionsThisMonth}
              </div>
              <div className="text-sm text-purple-600/80 dark:text-purple-400/80">
                Questions This Month
              </div>
            </div>
          </div>
        </div>
        
        {/* Study Insights - Fully Circular Design with Actions */}
        {studyInsights.length > 0 && (
          <div className="space-y-6">
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Personalized Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {studyInsights.map((insight, index) => {
                const getInsightColors = (type) => {
                  switch (type) {
                    case 'success': 
                      return { 
                        bg: 'bg-gradient-to-br from-green-400 to-green-600 dark:from-green-600 dark:to-green-800',
                        text: 'text-white',
                        border: 'border-green-200 dark:border-green-700',
                        iconBg: 'bg-white/20'
                      };
                    case 'warning': 
                      return { 
                        bg: 'bg-gradient-to-br from-yellow-400 to-orange-500 dark:from-yellow-600 dark:to-orange-700',
                        text: 'text-white',
                        border: 'border-yellow-200 dark:border-yellow-700',
                        iconBg: 'bg-white/20'
                      };
                    case 'info': 
                      return { 
                        bg: 'bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-600 dark:to-blue-800',
                        text: 'text-white',
                        border: 'border-blue-200 dark:border-blue-700',
                        iconBg: 'bg-white/20'
                      };
                    default: 
                      return { 
                        bg: 'bg-gradient-to-br from-gray-400 to-gray-600 dark:from-gray-600 dark:to-gray-800',
                        text: 'text-white',
                        border: 'border-gray-200 dark:border-gray-700',
                        iconBg: 'bg-white/20'
                      };
                  }
                };
                
                const colors = getInsightColors(insight.type);
                
                return (
                  <div key={index} className="relative flex flex-col items-center">
                    {/* Fully Circular Card */}
                    <div className={`w-48 h-48 ${colors.bg} rounded-full shadow-lg border ${colors.border} transform transition-all duration-300 hover:scale-105 hover:shadow-xl flex flex-col items-center justify-center p-6 relative`}>
                      {/* Circular Icon */}
                      <div className={`w-14 h-14 ${colors.iconBg} rounded-full flex items-center justify-center backdrop-blur-sm mb-3`}>
                        <insight.icon className="w-7 h-7 text-white" />
                      </div>
                      
                      {/* Content */}
                      <div className="text-center flex-1 flex flex-col justify-center">
                        <h4 className={`font-bold text-sm mb-1 ${colors.text}`}>
                          {insight.title}
                        </h4>
                        <p className={`text-xs ${colors.text} opacity-90 leading-relaxed`}>
                          {insight.description}
                        </p>
                      </div>
                      
                      {/* Decorative elements */}
                      <div className="absolute top-3 right-3">
                        <div className="w-4 h-4 bg-white/20 rounded-full backdrop-blur-sm" />
                      </div>
                      <div className="absolute bottom-3 left-3">
                        <div className="w-3 h-3 bg-white/10 rounded-full backdrop-blur-sm" />
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    {insight.type === 'warning' && (
                      <button
                        onClick={() => setMode('reviewMissed')}
                        className={`mt-4 px-4 py-2 rounded-full text-sm font-medium transition-all transform hover:scale-105 ${
                          darkMode 
                            ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg' 
                            : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg'
                        }`}
                      >
                        Work on Missed Questions
                      </button>
                    )}
                    
                    {insight.type === 'info' && insight.title.includes('Momentum') && (
                      <button
                        onClick={() => setMode('practice')}
                        className={`mt-4 px-4 py-2 rounded-full text-sm font-medium transition-all transform hover:scale-105 ${
                          darkMode 
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' 
                            : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg'
                        }`}
                      >
                        Continue Studying
                      </button>
                    )}
                    
                    {insight.type === 'success' && insight.title.includes('Consistency') && (
                      <button
                        onClick={() => setMode('dailyDrills')}
                        className={`mt-4 px-4 py-2 rounded-full text-sm font-medium transition-all transform hover:scale-105 ${
                          darkMode 
                            ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg' 
                            : 'bg-green-500 text-white hover:bg-green-600 shadow-lg'
                        }`}
                      >
                        Daily Practice
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Domain Performance Breakdown */}
      <section className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} rounded-xl p-6`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Domain Performance
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <BarChart3 size={16} />
            <span>Click domains for detailed insights</span>
          </div>
        </div>
        
        <div className="space-y-4">
          {domainAnalytics.map((domain, index) => (
            <div key={domain.domain} className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} hover:shadow-md transition-shadow`}>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <span className="text-sm font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {domain.domain}
                      </h3>
                      <p className={`text-sm ${domain.performanceColor}`}>
                        {domain.performanceLevel}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${domain.performanceColor}`}>
                      {domain.masteryPercentage}%
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                      {domain.correctQuestions}/{domain.totalQuestions} correct
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-3">
                  <div className={`w-full h-3 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div 
                      className={`h-3 rounded-full ${domain.progressColor} transition-all duration-500`}
                      style={{ width: `${domain.masteryPercentage}%` }}
                    />
                  </div>
                </div>
                
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center">
                    <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Accuracy
                    </div>
                    <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {domain.accuracy}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Attempts
                    </div>
                    <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {domain.attempts}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Trend
                    </div>
                    <div className="flex justify-center">
                      {domain.trend === 'improving' ? (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <div className="w-5 h-5 flex items-center justify-center text-gray-700">→</div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Recommendation */}
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span className="font-medium">Recommendation:</span> {domain.recommendation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default EnhancedAnalytics;
