import { useMemo } from 'react';
import { useTestMode } from '../contexts/TestModeContext';
import { Trash2 } from 'lucide-react';
import EnhancedAnalytics from './EnhancedAnalytics';

const History = ({ questions }) => {
  const { darkMode, testHistory, clearTestHistory, setMode, progressStreaks, getWeeklyProgress, getMonthlyProgress, scoreStats, studyPlan, domainMastery, questionStats } = useTestMode();

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Performance Analysis
        </h1>
        <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-slate-600'}`}>
          Track your progress and get personalized recommendations for improvement.
        </p>
      </header>

      {/* Learning Analytics Dashboard */}
      <section className="mb-6">
        <EnhancedAnalytics 
          testHistory={testHistory}
          scoreStats={scoreStats}
          progressStreaks={progressStreaks}
          getWeeklyProgress={getWeeklyProgress}
          getMonthlyProgress={getMonthlyProgress}
          studyPlan={studyPlan}
          domainMastery={domainMastery}
          questionStats={questionStats}
          darkMode={darkMode}
          setMode={setMode}
        />
      </section>

      {/* Test History */}
      <section className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} rounded-xl p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Test History
          </h2>
          {testHistory.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all test history?')) {
                  clearTestHistory();
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              Clear History
            </button>
          )}
        </div>

        {testHistory.length === 0 ? (
          <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
            <p>No test history yet.</p>
            <p className="text-sm mt-1">Complete a simulated test to see your results here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {testHistory.map((test) => (
              <div
                key={test.id}
                className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      {test.testType === 'simulated' ? 'Simulated Test' : 'Practice Session'}
                    </span>
                    <span className={`ml-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-700'}`}>
                      {new Date(test.date).toLocaleDateString()} at {new Date(test.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={`px-3 py-1 rounded-lg font-semibold ${
                    test.percentage >= 70
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : test.percentage >= 50
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>
                    {test.percentage}% ({test.totalCorrect}/{test.totalQuestions})
                  </div>
                </div>

                {/* Domain breakdown for this test */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {test.domainScores.map(({ domain, correct, total, percentage }) => (
                    <div
                      key={domain}
                      className={`p-2 rounded text-xs ${darkMode ? 'bg-gray-600' : 'bg-white'}`}
                    >
                      <div className={`font-medium truncate ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {domain.replace(/\s*\([^)]*\)/g, '')}
                      </div>
                      <div className={`flex items-center justify-between mt-1 ${
                        percentage >= 70
                          ? 'text-green-600 dark:text-green-400'
                          : percentage >= 50
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        <span>{percentage}%</span>
                        <span className="opacity-75">{correct}/{total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default History;
