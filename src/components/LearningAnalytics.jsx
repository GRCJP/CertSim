import React from 'react';
import { BarChart3, TrendingUp, Clock, Target, Brain, Calendar, Award, AlertTriangle, CheckCircle } from 'lucide-react';

const LearningAnalytics = ({ 
  testHistory, 
  scoreStats, 
  progressStreaks, 
  getWeeklyProgress, 
  getMonthlyProgress,
  studyPlan,
  adaptiveDifficulty,
  spacedRepetition,
  domainMastery,
  questionStats,
  darkMode 
}) => {
  
  // Calculate learning insights
  const getLearningInsights = () => {
    const insights = [];
    
    // Study consistency insight
    const weeklyData = getWeeklyProgress();
    const studyDaysThisWeek = weeklyData.filter(d => d.studied).length;
    if (studyDaysThisWeek >= 5) {
      insights.push({
        type: 'success',
        icon: CheckCircle,
        title: 'Excellent Consistency',
        description: `You've studied ${studyDaysThisWeek} days this week. Keep up the great work!`
      });
    } else if (studyDaysThisWeek >= 3) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Good Progress',
        description: `You've studied ${studyDaysThisWeek} days this week. Try to reach 5 days for optimal retention.`
      });
    } else {
      insights.push({
        type: 'error',
        icon: AlertTriangle,
        title: 'Low Activity',
        description: `Only ${studyDaysThisWeek} study days this week. Consistency is key to long-term retention.`
      });
    }
    
    // Performance trend insight
    if (testHistory.length >= 2) {
      const recentTests = testHistory.slice(0, 3);
      const avgRecentScore = recentTests.reduce((sum, test) => sum + test.score, 0) / recentTests.length;
      const olderTests = testHistory.slice(3, 6);
      if (olderTests.length > 0) {
        const avgOlderScore = olderTests.reduce((sum, test) => sum + test.score, 0) / olderTests.length;
        if (avgRecentScore > avgOlderScore + 5) {
          insights.push({
            type: 'success',
            icon: TrendingUp,
            title: 'Improving Performance',
            description: `Your recent scores are ${Math.round(avgRecentScore - avgOlderScore)}% higher than before. Great progress!`
          });
        } else if (avgRecentScore < avgOlderScore - 5) {
          insights.push({
            type: 'error',
            icon: AlertTriangle,
            title: 'Performance Declining',
            description: `Recent scores are ${Math.round(avgOlderScore - avgRecentScore)}% lower. Consider reviewing weak areas.`
          });
        }
      }
    }
    
    // Spaced repetition insight
    const dueQuestions = spacedRepetition.queue.filter(q => new Date(q.nextReview) <= new Date());
    if (dueQuestions.length > 10) {
      insights.push({
        type: 'warning',
        icon: Clock,
        title: 'Review Needed',
        description: `${dueQuestions.length} questions are due for review. Spaced repetition boosts retention.`
      });
    }
    
    // Adaptive difficulty insight
    if (adaptiveDifficulty.currentLevel >= 4) {
      insights.push({
        type: 'success',
        icon: Brain,
        title: 'Advanced Level',
        description: `You're performing at difficulty level ${adaptiveDifficulty.currentLevel}. Challenging yourself!`
      });
    } else if (adaptiveDifficulty.currentLevel <= 2) {
      insights.push({
        type: 'info',
        icon: Target,
        title: 'Building Foundation',
        description: `Focus on mastering basics at level ${adaptiveDifficulty.currentLevel} before advancing.`
      });
    }
    
    return insights;
  };
  
  // Calculate study time patterns
  const getStudyTimePatterns = () => {
    const monthlyData = getMonthlyProgress();
    const totalQuestions = monthlyData.reduce((sum, day) => sum + day.questions, 0);
    const avgQuestionsPerDay = totalQuestions / 30;
    const peakDay = monthlyData.reduce((max, day) => day.questions > max.questions ? day : max, monthlyData[0]);
    
    return {
      totalQuestions,
      avgQuestionsPerDay: Math.round(avgQuestionsPerDay),
      peakDay,
      studyDays: monthlyData.filter(d => d.studied).length
    };
  };
  
  // Calculate domain performance insights from persistent stores
  const getDomainInsights = () => {
    if (!domainMastery?.levels) return [];

    return Object.entries(domainMastery.levels).map(([domain, data]) => ({
      domain,
      avgScore: Math.round(data.masteryLevel * 100),
      trend: 'stable', // Trend calculation would need historical data from domainMastery
      consistency: Math.round(data.masteryLevel * 100), // Use mastery level as consistency indicator
      attempts: data.attempts || 0,
      correct: data.correct || 0,
      total: data.total || 0
    })).sort((a, b) => a.avgScore - b.avgScore);
  };
  
  const insights = getLearningInsights();
  const timePatterns = getStudyTimePatterns();
  const domainInsights = getDomainInsights();
  
  const getInsightColor = (type) => {
    switch (type) {
      case 'success': return darkMode ? 'text-green-400' : 'text-green-600';
      case 'warning': return darkMode ? 'text-yellow-400' : 'text-yellow-600';
      case 'error': return darkMode ? 'text-red-400' : 'text-red-600';
      case 'info': return darkMode ? 'text-blue-400' : 'text-blue-600';
      default: return darkMode ? 'text-gray-400' : 'text-gray-700';
    }
  };
  
  const getInsightBg = (type) => {
    switch (type) {
      case 'success': return darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200';
      case 'warning': return darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200';
      case 'error': return darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200';
      case 'info': return darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200';
      default: return darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Learning Insights */}
      <section className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} rounded-xl p-6`}>
        <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <Brain size={20} />
          Learning Insights
        </h2>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div key={index} className={`p-4 rounded-lg border ${getInsightBg(insight.type)}`}>
              <div className="flex items-start gap-3">
                <insight.icon className={`mt-0.5 ${getInsightColor(insight.type)}`} size={18} />
                <div>
                  <h3 className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {insight.title}
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Study Time Patterns */}
      <section className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} rounded-xl p-6`}>
        <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <Clock size={20} />
          Study Time Patterns
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {timePatterns.totalQuestions}
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Questions this month
            </div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
              {timePatterns.avgQuestionsPerDay}
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Avg questions per day
            </div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
              {timePatterns.studyDays}
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Study days this month
            </div>
          </div>
        </div>
      </section>

      {/* Domain Performance Analysis */}
      {domainInsights.length > 0 && (
        <section className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} rounded-xl p-6`}>
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <BarChart3 size={20} />
            Domain Performance Analysis
          </h2>
          <div className="space-y-3">
            {domainInsights.slice(0, 5).map((domain, index) => (
              <div key={index} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {domain.domain}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {domain.avgScore}% avg
                    </span>
                    {domain.trend === 'improving' && (
                      <TrendingUp className="text-green-500" size={16} />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-700'}>
                    Consistency: {domain.consistency}%
                  </span>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-700'}>
                    {domain.trend === 'improving' ? '↗ Improving' : domain.trend === 'declining' ? '↘ Declining' : '→ Stable'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Learning Recommendations */}
      <section className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} rounded-xl p-6`}>
        <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <Target size={20} />
          Personalized Recommendations
        </h2>
        <div className="space-y-3">
          {adaptiveDifficulty.currentLevel <= 2 && (
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
              <h4 className={`font-medium mb-1 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                Focus on Foundation
              </h4>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                You're currently at difficulty level {adaptiveDifficulty.currentLevel}. Master the basics before advancing to ensure strong foundation.
              </p>
            </div>
          )}
          
          {spacedRepetition.queue.length > 5 && (
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'}`}>
              <h4 className={`font-medium mb-1 ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                Review Spaced Repetition
              </h4>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {spacedRepetition.queue.length} questions in your review queue. Regular review boosts long-term retention by up to 50%.
              </p>
            </div>
          )}
          
          {progressStreaks.currentStreak >= 7 && (
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
              <h4 className={`font-medium mb-1 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                Maintain Your Streak
              </h4>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Amazing {progressStreaks.currentStreak} day streak! Research shows consistent daily study improves retention significantly.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default LearningAnalytics;
