/**
 * Explicit API definition for TestModeContext
 * This file defines all functions and state that should be available from the context
 * Use this as a reference when implementing or refactoring the context provider
 */

export const TestModeAPI = {
  // State variables
  questionBankId: null,
  mode: null,
  darkMode: null,
  autoDarkMode: null,
  textSize: null,
  missedQuestions: null,
  markedQuestions: null,
  practiceIndex: null,
  practiceAnswers: null,
  dailyDrillIndex: null,
  dailyDrillOrder: null,
  dailyDrillAnswers: null,
  rapidIndex: null,
  testHistory: null,
  simulatedIndex: null,
  simulatedOrder: null,
  simulatedAnswers: null,
  scoreStats: null,
  studyPlan: null,
  spacedRepetition: null,
  adaptiveDifficulty: null,
  domainMastery: null,
  questionStats: null,
  progressStreaks: null,
  practiceSession: null,
  sessionAnsweredCount: null,

  // State setters
  setQuestionBankId: null,
  setMode: null,
  setDarkMode: null,
  setAutoDarkMode: null,
  setTextSize: null,
  setMissedQuestions: null,
  setMarkedQuestions: null,
  setPracticeIndex: null,
  setPracticeAnswers: null,
  setDailyDrillIndex: null,
  setDailyDrillOrder: null,
  setDailyDrillAnswers: null,
  setRapidIndex: null,
  setTestHistory: null,
  setSimulatedIndex: null,
  setSimulatedOrder: null,
  setSimulatedAnswers: null,
  setScoreStats: null,
  setStudyPlan: null,
  setSpacedRepetition: null,
  setAdaptiveDifficulty: null,
  setDomainMastery: null,
  setQuestionStats: null,
  setProgressStreaks: null,
  setPracticeSession: null,

  // Core functions
  recordAttempt: null,
  removeFromMissed: null,
  addToMissed: null,
  clearMissed: null,
  markQuestion: null,
  updateQuestionStats: null,
  updateDomainMastery: null,
  updateAdaptiveDifficulty: null,
  updateProgressStreaks: null,
  updateQuestionSeen: null,
  addToSpacedRepetition: null,
  updateSpacedRepetition: null,

  // Test and session functions
  completeTest: null,
  startSimulatedTest: null,
  resetSimulatedTest: null,
  resetProgress: null,
  createPracticeSession: null,
  recordAnswerToSession: null,
  pausePracticeSession: null,
  endPracticeSession: null,
  loadActivePracticeSession: null,

  // Analytics and helper functions
  getAccuracy: null,
  getQuestionStats: null,
  getDomainMasteryLevel: null,
  getWeakDomains: null,
  getStrongDomains: null,
  getMasteryColor: null,
  getMasteryLabel: null,
  getStreakMessage: null,
  getPrioritizedQuestions: null,
  generateDailyPlan: null,
  getAdaptiveStudyPlan: null,
  updateDailyProgress: null,
  getWeeklyProgress: null,
  getMonthlyProgress: null,
  getStudyProgress: null,
  getDailyProgress: null,
  qualifiesForStreak: null,
  getQuestionBankName: null,
  getQuestionBankTotal: null,

  // Utility functions
  shuffleInPlace: null,
  keyForBank: null,
  getLocalDayKey: null,
  addDaysToKey: null,
  isCheckpointDay: null,
  generateCheckpointPlan: null,
  daysUntil: null,
  getDueReviewCount: null,
  selectAdaptiveQuestions: null,
  fisherYatesShuffle: null,
};

/**
 * Helper function to validate that all required API items are exported
 * Call this in your TestModeProvider to ensure consistency
 */
export const validateTestModeAPI = (contextValue) => {
  const missing = [];
  const undefined = [];

  Object.keys(TestModeAPI).forEach(key => {
    if (!(key in contextValue)) {
      missing.push(key);
    } else if (contextValue[key] === undefined) {
      undefined.push(key);
    }
  });

  if (missing.length > 0 || undefined.length > 0) {
    console.error('TestModeAPI validation failed:');
    if (missing.length > 0) console.error('Missing exports:', missing);
    if (undefined.length > 0) console.error('Undefined exports:', undefined);
    return false;
  }

  return true;
};

export default TestModeAPI;
