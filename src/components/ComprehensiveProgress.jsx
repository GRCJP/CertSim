import React, { useMemo, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Target, 
  Award, 
  Activity,
  Clock,
  BookOpen,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const ComprehensiveProgress = ({ 
  testHistory, 
  scoreStats, 
  progressStreaks, 
  studyPlan,
  domainMastery,
  questionStats,
  missedQuestions,
  darkMode,
  getReadinessScore,
  questions,
  questionBankId,
  getQuestionCount,
  initializeDomainMastery
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const totalQuestions = getQuestionCount(questionBankId);
    const answeredQuestions = scoreStats.totalQuestions;
    const correctAnswers = scoreStats.correctAnswers;
    const unansweredQuestions = totalQuestions - answeredQuestions;
    const overallPercentage = answeredQuestions > 0 ? Math.round((correctAnswers / answeredQuestions) * 100) : 0;
    
    // Calculate time spent (from study plan and streaks)
    const timeSpentMinutes = studyPlan?.questionsCompleted * 2 || 0; // Estimate 2 minutes per question
    const hours = Math.floor(timeSpentMinutes / 60);
    const minutes = timeSpentMinutes % 60;
    
    // Calculate days until exam
    const daysUntilExam = studyPlan?.testDate 
      ? Math.ceil((new Date(studyPlan.testDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      correctOfAnswered: `${correctAnswers} / ${answeredQuestions}`,
      unanswered: unansweredQuestions,
      overallPercentage,
      communityAverage: 77, // This could be calculated from actual data
      timeSpent: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
      daysUntilExam: daysUntilExam || 0
    };
  }, [scoreStats, studyPlan, questionBankId, getQuestionCount]);

  // Calculate subject-wise performance
  const subjectPerformance = useMemo(() => {
    console.log('🔍 Debugging domain data:', {
      domainMastery: domainMastery,
      hasLevels: !!domainMastery?.levels,
      levelsKeys: domainMastery?.levels ? Object.keys(domainMastery.levels) : [],
      questions: questions?.length || 0,
      questionDomains: questions ? [...new Set(questions.map(q => q.domain).filter(Boolean))] : []
    });
    
    // ALWAYS create domains from questions first, then enhance with mastery data
    if (!questions || !Array.isArray(questions)) {
      console.log('❌ No questions available');
      return [];
    }
    
    // Get all unique domains from questions
    const availableDomains = [...new Set(questions.map(q => q.domain).filter(Boolean))];
    console.log('📋 Available domains from questions:', availableDomains);
    
    if (availableDomains.length === 0) {
      console.log('⚠️ No domains found in questions');
      return [];
    }
    
    // Create domain data by combining question info with mastery data
    const domains = availableDomains.map(domain => {
      const domainQuestions = questions.filter(q => q.domain === domain);
      const masteryData = domainMastery?.levels?.[domain];
      
      const masteryPercentage = masteryData && attempts > 0 ? Math.round((masteryData.masteryLevel || 0.5) * 100) : 0;
      const attempts = masteryData?.attempts || 0;
      const correct = masteryData?.correct || 0;
      
      console.log(`📊 Processing domain: ${domain}`, {
        questionsInDomain: domainQuestions.length,
        masteryData,
        calculatedPercentage: masteryPercentage
      });
      
      return {
        name: domain,
        correct: correct,
        answered: attempts,
        score: masteryPercentage,
        total: domainQuestions.length,
        masteryLevel: masteryData?.masteryLevel || 0.5
      };
    });

    console.log('📈 Final domains array:', domains);
    return domains.sort((a, b) => b.score - a.score);
  }, [domainMastery, questions]);

  // Calculate quiz scores over time
  const quizScoresData = useMemo(() => {
    if (!testHistory || testHistory.length === 0) return [];
    
    return testHistory.slice(0, 45).reverse().map((test, index) => ({
      date: new Date(test.timestamp).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      score: test.score || 0,
      index: index + 1
    }));
  }, [testHistory]);

  // Generate study activity log
  const studyActivity = useMemo(() => {
    const activities = [];
    
    // Add recent test history
    testHistory.slice(0, 20).forEach((test) => {
      const date = new Date(test.timestamp);
      activities.push({
        id: `test-${test.timestamp}`,
        type: 'quiz',
        icon: BarChart3,
        description: test.mode === 'simulatedTest' ? 'Simulated Test' : 'Practice Quiz',
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: `${test.score || 0}%`,
        color: test.score >= 80 ? 'green' : test.score >= 60 ? 'yellow' : 'red'
      });
    });

    // Add missed question activities
    if (missedQuestions.length > 0) {
      activities.push({
        id: 'missed-questions',
        type: 'missed',
        icon: XCircle,
        description: 'Missed Questions',
        date: 'Today',
        score: 'X',
        color: 'red'
      });
    }

    // Add streak milestones
    if (progressStreaks.currentStreak >= 7) {
      activities.push({
        id: 'streak-milestone',
        type: 'milestone',
        icon: Award,
        description: `Level Up Level ${Math.floor(progressStreaks.currentStreak / 7)}`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: '100%',
        color: 'green'
      });
    }

    // Sort by date and paginate
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    return activities;
  }, [testHistory, missedQuestions, progressStreaks]);

  // Pagination
  const totalPages = Math.ceil(studyActivity.length / itemsPerPage);
  const paginatedActivities = studyActivity.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getScoreColor = (score) => {
    if (score >= 80) return darkMode ? 'text-green-400' : 'text-green-600';
    if (score >= 60) return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    return darkMode ? 'text-red-400' : 'text-red-600';
  };

  const getProgressBarColor = (score) => {
    if (score >= 80) return darkMode ? 'bg-green-500' : 'bg-green-500';
    if (score >= 60) return darkMode ? 'bg-yellow-500' : 'bg-yellow-500';
    return darkMode ? 'bg-red-500' : 'bg-red-500';
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'} p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">Progress Overview</h1>
            <button
              onClick={() => {
                console.log('🔧 Manual domain initialization triggered');
                initializeDomainMastery();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              🔧 Initialize Domains
            </button>
          </div>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Track your exam preparation progress
          </p>
        </div>

        {/* Overall Statistics */}
        <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
          <h2 className="text-xl font-semibold mb-6">Overall Statistics</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {/* Correct of Answered */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {overallStats.correctOfAnswered}
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Correct of Answered
              </div>
            </div>

            {/* Unanswered */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                {overallStats.unanswered}
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Unanswered
              </div>
            </div>

            {/* Overall Percentage with Circle */}
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke={darkMode ? '#475569' : '#e5e7eb'}
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke={overallStats.overallPercentage >= 80 ? '#10b981' : overallStats.overallPercentage >= 60 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(overallStats.overallPercentage / 100) * 176} 176`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className={`absolute text-lg font-bold ${getScoreColor(overallStats.overallPercentage)}`}>
                  {overallStats.overallPercentage}%
                </div>
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                Overall Percentage
              </div>
            </div>

            {/* Community Average */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                {overallStats.communityAverage}%
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Community Average
              </div>
            </div>

            {/* Time Spent */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                {overallStats.timeSpent}
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Time Spent Studying
              </div>
            </div>

            {/* Days Until Exam */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                {overallStats.daysUntilExam}
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Days Until Exam
              </div>
            </div>
          </div>
        </div>

        {/* Subject Insights */}
        <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
          <h2 className="text-xl font-semibold mb-6">Subject Insights</h2>
          
          <div className="space-y-4">
            {subjectPerformance.map((subject) => (
              <div key={subject.name} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                    {subject.name}
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {subject.correct} / {subject.answered}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* Progress Bar */}
                  <div className="w-32">
                    <div className={`h-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                      <div 
                        className={`h-full ${getProgressBarColor(subject.score)} transition-all duration-500`}
                        style={{ width: `${subject.score}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Score */}
                  <div className={`text-lg font-bold ${getScoreColor(subject.score)} w-16 text-right`}>
                    {subject.score}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quiz Scores and Study Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quiz Scores */}
          <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Quiz Scores</h2>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Quizzes: {testHistory?.length || 0}
              </div>
            </div>
            
            {/* Simple Bar Chart */}
            <div className="space-y-2">
              {quizScoresData.slice(-10).map((quiz) => (
                <div key={quiz.index} className="flex items-center space-x-3">
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} w-12`}>
                    {quiz.date}
                  </div>
                  <div className="flex-1">
                    <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                      <div 
                        className={`h-full ${getProgressBarColor(quiz.score)} transition-all duration-500`}
                        style={{ width: `${quiz.score}%` }}
                      />
                    </div>
                  </div>
                  <div className={`text-xs font-medium ${getScoreColor(quiz.score)} w-10 text-right`}>
                    {quiz.score}%
                  </div>
                </div>
              ))}
            </div>
            
            <div className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Days Studying: {progressStreaks?.studyCalendar ? Object.keys(progressStreaks.studyCalendar).length : 0}
            </div>
          </div>

          {/* Study Activity */}
          <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <h2 className="text-xl font-semibold mb-6">Study Activity</h2>
            
            <div className="space-y-3">
              {paginatedActivities.map((activity) => {
                const IconComponent = activity.icon;
                return (
                  <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-opacity-50 border border-opacity-30">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                        <IconComponent className={`w-4 h-4 ${activity.color === 'green' ? 'text-green-500' : activity.color === 'yellow' ? 'text-yellow-500' : 'text-red-500'}`} />
                      </div>
                      <div>
                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {activity.description}
                        </div>
                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {activity.date}
                        </div>
                      </div>
                    </div>
                    
                    <div className={`text-sm font-medium ${getScoreColor(parseInt(activity.score)) || (activity.score === 'X' ? 'text-red-500' : '')}`}>
                      {activity.score}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, studyActivity.length)} of {studyActivity.length} quizzes
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`p-1 rounded ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'} ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {currentPage} / {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`p-1 rounded ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'} ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveProgress;
