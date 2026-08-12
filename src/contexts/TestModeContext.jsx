import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth0 } from '../lib/localAuth';
import { getQuestionsForBank, getQuestionCountForBank, getBankMeta, DEFAULT_BANK_ID } from '../lib/questionBanks';
import { supabase } from '../lib/supabase.js';
import { getUserData, updateUserData } from '../lib/userProgress.js';

const TestModeContext = createContext();

export const useTestMode = () => {
  const context = useContext(TestModeContext);
  if (!context) {
    throw new Error('useTestMode must be used within a TestModeProvider');
  }
  return context;
};

const useSupabaseUidFromAuth0 = () => {
  const { isAuthenticated, user, loginWithRedirect } = useAuth0();
  const [supabaseUserId, setSupabaseUserId] = useState(null);
  const [isSupabaseSessionReady, setIsSupabaseSessionReady] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.sub) {
      // Use Auth0 user.sub directly as the user identifier
      setSupabaseUserId(user.sub);
      setIsSupabaseSessionReady(true);
      console.log('Using Auth0 user ID for persistence:', user.sub);
    } else {
      setSupabaseUserId(null);
      setIsSupabaseSessionReady(false);
    }
  }, [isAuthenticated, user]);

  return { isAuthenticated, loginWithRedirect, supabaseUserId, isSupabaseSessionReady };
};

const keyForBank = (bankId, key) => `cmmc_${bankId}_${key}`;

// Simplified auto-backup system to prevent loading issues
class AutoBackup {
  constructor() {
    this.backupInterval = null;
    this.isEnabled = false;
    this.intervalMs = 10 * 60 * 1000; // 10 minutes default
    this.lastBackupTime = null;
    this.minBackupInterval = 60000; // Minimum 1 minute between backups
    this.lastBackupTimestamp = null;
    this.getBackupDataFn = null; // Function to get current backup data
  }

  start(intervalMs, getBackupDataFn) {
    // Validate intervalMs - use default if invalid
    const validInterval = (typeof intervalMs === 'number' && !isNaN(intervalMs) && intervalMs > 0) 
      ? intervalMs 
      : this.intervalMs;
    this.intervalMs = Math.max(validInterval, this.minBackupInterval);
    this.isEnabled = true;
    this.getBackupDataFn = getBackupDataFn;
    
    // Clear existing interval
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }
    
    // Only start interval if we have a function to get backup data
    if (typeof this.getBackupDataFn === 'function') {
      this.backupInterval = setInterval(async () => {
        try {
          const backupData = await this.getBackupDataFn();
          if (backupData) {
            await this.createBackup(backupData);
          }
        } catch (error) {
          console.error('Auto-backup interval error:', error);
        }
      }, this.intervalMs);
      
      console.log(`Auto-backup started with ${this.intervalMs / 1000}s interval`);
    } else {
      console.warn('Auto-backup not started: no backup data function provided');
    }
  }

  stop() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
    this.isEnabled = false;
    console.log('Auto-backup stopped');
  }

  async createBackup(backupData) {
    if (!backupData) {
      console.warn('No backup data provided');
      return { success: false, error: 'No backup data' };
    }

    // Rate limiting check
    if (this.lastBackupTimestamp && (Date.now() - this.lastBackupTimestamp) < this.minBackupInterval) {
      console.log('🕐 Backup rate limiting - skipping backup');
      return { success: false, error: 'Rate limited' };
    }

    try {
      const timestamp = new Date().toISOString();
      const backupKey = `cmmc_backup_${backupData.userId}_${timestamp}`;
      const latestKey = `cmmc_latest_backup_${backupData.userId}`;
      
      // Store backup
      localStorage.setItem(backupKey, JSON.stringify({
        ...backupData,
        backupTimestamp: timestamp
      }));
      
      // Update latest backup reference
      localStorage.setItem(latestKey, backupKey);
      
      // Clean old backups (keep only last 5)
      this.cleanOldBackups(backupData.userId, 5);
      
      this.lastBackupTime = timestamp;
      this.lastBackupTimestamp = Date.now();
      
      console.log(`✅ Backup created: ${backupKey}`);
      return { success: true, backupKey };
    } catch (error) {
      console.error('❌ Backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  cleanOldBackups(userId, keepCount = 5) {
    try {
      const prefix = `cmmc_backup_${userId}_`;
      const backupKeys = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          backupKeys.push(key);
        }
      }
      
      if (backupKeys.length > keepCount) {
        backupKeys.sort().reverse();
        const keysToDelete = backupKeys.slice(keepCount);
        keysToDelete.forEach(key => {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed old backup: ${key}`);
        });
      }
    } catch (error) {
      console.error('Error cleaning old backups:', error);
    }
  }

  // Get backup status
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      isRunning: !!this.backupInterval,
      interval: this.intervalMs,
      lastBackup: this.lastBackupTime
    };
  }
}

// Helper function to determine if it should be dark mode based on time
const shouldBeDarkModeByTime = () => {
  const hour = new Date().getHours();
  // Dark mode between 7 PM (19:00) and 7 AM (07:00)
  return hour >= 19 || hour < 7;
};

// Helper function to check system preference
const getSystemDarkModePreference = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
};

export const TestModeProvider = ({ children }) => {
  const { isAuthenticated, loginWithRedirect, supabaseUserId, isSupabaseSessionReady } = useSupabaseUidFromAuth0();
  const userId = supabaseUserId; // Auth0 user.sub value (TEXT)
  
  // Feature flags system for safe development
  const [featureFlags, setFeatureFlags] = useState(() => {
    // Force clear and reset feature flags for development
    console.log('🧹 Clearing feature flags cache and forcing new UI...');
    localStorage.removeItem('cmmcFeatureFlags');
    
    const defaultFlags = {
      // All new features default to OFF for safety
      dashboardPersistence: true, // Current production feature
      examFocusedDashboard: true, // New dashboard redesign
      enhancedNavigation: false,  // Example future feature
      // Add future flags here, defaulting to false
    };
    
    console.log('🚩 Using forced feature flags for new UI:', defaultFlags);
    
    return defaultFlags;
  });

  // Save feature flags to localStorage
  useEffect(() => {
    localStorage.setItem('cmmcFeatureFlags', JSON.stringify(featureFlags));
  }, [featureFlags]);

  // Helper to check if feature is enabled
  const isFeatureEnabled = useCallback((featureName) => {
    const enabled = featureFlags[featureName] === true;
    console.log(`🔍 Feature check: ${featureName} = ${enabled} (flags:`, featureFlags, ')');
    return enabled;
  }, [featureFlags]);

  // Helper to enable/disable features (for development)
  const setFeatureFlag = useCallback((featureName, enabled) => {
    setFeatureFlags(prev => ({
      ...prev,
      [featureName]: enabled
    }));
  }, []);
  const [mode, setMode] = useState(() => {
    // Initialize mode from localStorage or URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlMode = urlParams.get('mode');
      if (urlMode && ['practice', 'dailyDrills', 'simulated', 'rapidMemory', 'history', 'studyPlanner', 'performance', 'reviewMissed', 'reviewMarked', 'quickStudy', 'kindle', 'dashboard', 'domainPractice'].includes(urlMode)) {
        return urlMode;
      }
      return localStorage.getItem('mode') || 'dashboard';
    }
    return 'dashboard';
  });
  const [questionBankId, setQuestionBankId] = useState(() => {
    // Initialize question bank from localStorage immediately
    if (typeof window !== 'undefined') {
      return localStorage.getItem('questionBankId') || DEFAULT_BANK_ID;
    }
    return DEFAULT_BANK_ID;
  });
  const [textSize, setTextSize] = useState('base');
  const [hasHydratedMissed, setHasHydratedMissed] = useState(false);

  // Get current questions for the selected bank
  const questions = getQuestionsForBank(questionBankId);
  
  // Save question bank to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('questionBankId', questionBankId);
    }
  }, [questionBankId]);

  // Helper function for bank-scoped localStorage keys
  const keyForBank = (bankId, key) => `cmmc:${bankId}:${key}`;

  // Hydrate missedQuestions when questions are available
  useEffect(() => {
    if (questions.length > 0 && !hasHydratedMissed) {
      const missedKey = keyForBank(questionBankId, 'missedQuestions');
      const saved = localStorage.getItem(missedKey);
      
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data && data.ids && Array.isArray(data.ids)) {
            // Convert ids array back to Set of question objects
            const questionsById = {};
            const input = Array.isArray(questions) ? questions : [];
            const safe = input.filter(q => q && typeof q === 'object' && q.id && q.domain);
            safe.forEach(q => {
              if (q && q.id) {
                questionsById[q.id] = q;
              }
            });
            
            const missedQuestionObjects = data.ids
              .map(id => questionsById[id])
              .filter(q => q !== undefined);
            
            setMissedQuestions(missedQuestionObjects);
            setHasHydratedMissed(true);
            console.info(`[missedQuestions] hydrated`, { 
              bankId: questionBankId, 
              count: missedQuestionObjects.length, 
              source: 'local' 
            });
          } else {
            setMissedQuestions([]);
            setHasHydratedMissed(true);
            console.info(`[missedQuestions] hydrated`, { 
              bankId: questionBankId, 
              count: 0, 
              source: 'local-empty' 
            });
          }
        } catch (error) {
          console.error('Error loading missedQuestions from localStorage:', error);
          setMissedQuestions([]);
          setHasHydratedMissed(true);
        }
      } else {
        setMissedQuestions([]);
        setHasHydratedMissed(true);
        console.info(`[missedQuestions] hydrated`, { 
          bankId: questionBankId, 
          count: 0, 
          source: 'local-none' 
        });
      }
    }
  }, [questionBankId, questions, hasHydratedMissed]);

  // Reset hydration flag when bank changes
  useEffect(() => {
    setHasHydratedMissed(false);
  }, [questionBankId]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isBackupEnabled, setIsBackupEnabled] = useState(true);
  const [backupInterval, setBackupInterval] = useState(10 * 60 * 1000); // 10 minutes default (reduced from 5)
  const [lastBackupTime, setLastBackupTime] = useState(null);
  
  // Initialize auto-backup system
  const autoBackup = useRef(new AutoBackup());
  
  // Initialize darkMode based on: 1) localStorage preference, 2) system preference (if auto enabled), 3) default to light mode
  const [darkMode, setDarkMode] = useState(() => {
    const savedPreference = localStorage.getItem('darkMode');
    const autoModeEnabled = localStorage.getItem('autoDarkMode') === 'true'; // Default to false
    
    // If user has explicitly set a preference and auto mode is not enabled, use it
    if (savedPreference !== null && !autoModeEnabled) {
      return savedPreference === 'true';
    }
    
    // If auto mode is enabled, check system preference
    if (autoModeEnabled) {
      if (getSystemDarkModePreference()) {
        return true;
      }
      // Only use time-based if system preference is not dark
      return shouldBeDarkModeByTime();
    }
    
    // Default to light mode for better visibility
    return false;
  });
  
  const [autoDarkMode, setAutoDarkMode] = useState(() => {
    // Disable auto dark mode by default to prevent automatic theme switching
    localStorage.removeItem('autoDarkMode');
    return false;
  });

  // Get question count for current bank (reflects the actual loaded question count)
  const getQuestionCount = (bankId) => getQuestionCountForBank(bankId);

  // Question bank state
  const [missedQuestions, setMissedQuestions] = useState(() => {
    console.log('🔍 Initializing missedQuestions state');
    return [];
  });
  const [missedQueue, setMissedQueue] = useState(() => {
    console.log('🔍 Initializing missedQueue state');
    return [];
  });
  const [missedMeta, setMissedMeta] = useState(() => {
    console.log('🔍 Initializing missedMeta state');
    return {};
  });
  const [markedQuestions, setMarkedQuestions] = useState(new Map());
  const [examSimMarkedQuestions, setExamSimMarkedQuestions] = useState(new Map());
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState([]);
  const [dailyDrillIndex, setDailyDrillIndex] = useState(0);
  const [dailyDrillOrder, setDailyDrillOrder] = useState([]);
  const [dailyDrillAnswers, setDailyDrillAnswers] = useState([]);
  const [schemaVersion, setSchemaVersion] = useState(1);
  const [rapidIndex, setRapidIndex] = useState(0);
  const [testHistory, setTestHistory] = useState([]);
  const [simulatedIndex, setSimulatedIndex] = useState(0);
  const [simulatedOrder, setSimulatedOrder] = useState([]);
  const [simulatedAnswers, setSimulatedAnswers] = useState({});
  const [simulatedTimeRemaining, setSimulatedTimeRemaining] = useState(7200); // 120 minutes in seconds
  const [simulatedTimerActive, setSimulatedTimerActive] = useState(false);
  const [scoreStats, setScoreStats] = useState({
    totalQuestions: 0,
    correctAnswers: 0,
    currentStreak: 0,
    bestStreak: 0,
    dailyStreak: 0,
    lastStudyDate: null,
    weeklyAccuracy: [],
  });
  
  // Test history for tracking performance over time
  const [testCompleted, setTestCompleted] = useState(false);
  
  // Study planning state
  const [studyPlan, setStudyPlan] = useState({
    testDate: null,
    targetQuestionsPerDay: 15,
    dailyGoal: 15,
    completedToday: 0,
    totalQuestionsNeeded: getQuestionCount(DEFAULT_BANK_ID),
    questionsCompleted: 0,
    studyDaysRemaining: 0,
  });
  
  // Spaced repetition state for missed questions
  const [spacedRepetition, setSpacedRepetition] = useState({
    queue: [], // Questions scheduled for review
    mastered: [], // Questions that have been mastered
    lastReviewDate: null,
  });
  
  // Adaptive difficulty state
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState({
    currentLevel: 1, // 1-5 scale
    recentPerformance: [], // Last 10 answers
    domainPerformance: {}, // Performance by domain
    adjustmentFactor: 0.1, // How quickly to adjust difficulty
  });
  
  // Mastery tracking state per domain
  const [domainMastery, setDomainMastery] = useState({
    // Track mastery level (0-1) for each domain
    levels: {}, // {domain: {correct: number, total: number, masteryLevel: number, lastUpdated: timestamp}}
    overallMastery: 0, // Overall mastery across all domains
    weakDomains: [], // Domains below 0.7 mastery
    strongDomains: [], // Domains above 0.9 mastery
  });
  
  // Question-level statistics for better selection
  const [questionStats, setQuestionStats] = useState(() => {
    const saved = localStorage.getItem('questionStats');
    return saved ? JSON.parse(saved) : {};
  });
  
  // Practice session management
  const [practiceSession, setPracticeSession] = useState(() => {
    const saved = localStorage.getItem('cmmc_practice_session_active');
    return saved ? JSON.parse(saved) : null;
  });
  
  // Missed Coach session management
  const [missedCoachSession, setMissedCoachSession] = useState(() => {
    const saved = localStorage.getItem('cmmc_missed_coach_session_active');
    return saved ? JSON.parse(saved) : null;
  });
  
  // Progress streaks and consistency tracking
  const [progressStreaks, setProgressStreaks] = useState({
    currentStreak: 0, // Current consecutive days
    bestStreak: 0, // Best consecutive days
    lastStudyDate: null, // Last date studied
    studyCalendar: {}, // Calendar of study activity {date: {questions: number, accuracy: number}}
    weeklyGoal: 5, // Days per week goal
    monthlyGoal: 20, // Days per month goal
  });

  // Persist missedQuestions to localStorage whenever they change
  useEffect(() => {
    const missedKey = keyForBank(questionBankId, 'missedQuestions');
    const data = {
      ids: missedQuestions.map(q => q.id),
      updatedAt: Date.now()
    };
    
    localStorage.setItem(missedKey, JSON.stringify(data));
    console.info(`[missedQuestions] persisted`, { 
      bankId: questionBankId, 
      count: missedQuestions.length 
    });
  }, [missedQuestions, questionBankId]);

  // Backup functions
  const createBackup = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      console.log('Cannot create backup: not authenticated');
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Collect all relevant data for backup
      const backupData = {
        userId,
        questionBankId,
        timestamp: new Date().toISOString(),
        // Progress data
        progressStreaks,
        scoreStats,
        studyPlan,
        missedQuestions: Array.from(missedQuestions),
        markedQuestions: Array.from(markedQuestions.entries()),
        simulatedAnswers,
        testHistory,
        domainMastery,
        questionStats,
        spacedRepetition,
        adaptiveDifficulty,
        // localStorage data
        localStorage: {
          darkMode,
          autoDarkMode,
          textSize,
          mode,
          // Add other relevant localStorage keys
          dailyProgress: localStorage.getItem('dailyProgress'),
          lastStudyDate: localStorage.getItem('lastStudyDate'),
        }
      };

      // Use simplified backup system
      const result = await autoBackup.current.createBackup(backupData);
      if (result.success) {
        setLastBackupTime(result.backupTimestamp || new Date().toISOString());
      }
      
      return result;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated, userId, questionBankId, progressStreaks, scoreStats, studyPlan, missedQuestions, markedQuestions, simulatedAnswers, testHistory, domainMastery, questionStats, spacedRepetition, adaptiveDifficulty, darkMode, autoDarkMode, textSize, mode]);

  const restoreBackup = useCallback(async (backupKey = null) => {
    if (!userId) {
      console.log('Backup restore aborted: no user ID');
      return false;
    }

    try {
      const keyToRestore = backupKey || localStorage.getItem(`cmmc_latest_backup_${userId}`);
      if (!keyToRestore) {
        console.log('No backup found to restore');
        return false;
      }

      const backupData = JSON.parse(localStorage.getItem(keyToRestore) || 'null');
      if (!backupData) {
        console.log('Invalid backup data');
        return false;
      }

      console.log('Restoring backup from:', new Date(backupData.timestamp));

      // Restore state data
      if (backupData.progressStreaks) setProgressStreaks(backupData.progressStreaks);
      if (backupData.scoreStats) setScoreStats(backupData.scoreStats);
      if (backupData.studyPlan) setStudyPlan(backupData.studyPlan);
      if (backupData.missedQuestions) setMissedQuestions(backupData.missedQuestions);
      if (backupData.markedQuestions) setMarkedQuestions(backupData.markedQuestions);
      if (backupData.examSimMarkedQuestions) setExamSimMarkedQuestions(backupData.examSimMarkedQuestions);
      if (backupData.testHistory) setTestHistory(backupData.testHistory);
      if (backupData.domainMastery) setDomainMastery(backupData.domainMastery);
      if (backupData.questionStats) setQuestionStats(backupData.questionStats);
      if (backupData.spacedRepetition) setSpacedRepetition(backupData.spacedRepetition);
      if (backupData.adaptiveDifficulty) setAdaptiveDifficulty(backupData.adaptiveDifficulty);

      // Restore localStorage data
      if (backupData.localStorageData) {
        const { localStorageData } = backupData;
        if (localStorageData.darkMode !== null) localStorage.setItem('darkMode', localStorageData.darkMode);
        if (localStorageData.textSize) localStorage.setItem('textSize', localStorageData.textSize);
        if (localStorageData.mode) localStorage.setItem('mode', localStorageData.mode);
        
        // Restore bank-specific data
        Object.keys(localStorageData).forEach(key => {
          if (key !== 'darkMode' && key !== 'textSize' && key !== 'mode') {
            const localStorageKey = keyForBank(backupData.questionBankId, key.replace(keyForBank(questionBankId, ''), ''));
            if (localStorageData[key]) {
              localStorage.setItem(localStorageKey, localStorageData[key]);
            }
          }
        });
      }

      console.log('Backup restored successfully');
      return true;
    } catch (error) {
      console.error('Error restoring backup:', error);
      return false;
    }
  }, [userId, questionBankId]);

  // Function to get current backup data for auto-backup
  const getBackupData = useCallback(() => {
    if (!isAuthenticated || !userId) {
      return null;
    }
    return {
      userId,
      questionBankId,
      timestamp: new Date().toISOString(),
      progressStreaks,
      scoreStats,
      studyPlan,
      missedQuestions: Array.from(missedQuestions),
      markedQuestions: Array.from(markedQuestions.entries()),
      examSimMarkedQuestions: Array.from(examSimMarkedQuestions.entries()),
      simulatedAnswers,
      testHistory,
      domainMastery,
      questionStats,
      spacedRepetition,
      adaptiveDifficulty,
      localStorage: {
        darkMode,
        autoDarkMode,
        textSize,
        mode,
        dailyProgress: localStorage.getItem('dailyProgress'),
        lastStudyDate: localStorage.getItem('lastStudyDate'),
      }
    };
  }, [isAuthenticated, userId, questionBankId, progressStreaks, scoreStats, studyPlan, missedQuestions, markedQuestions, examSimMarkedQuestions, simulatedAnswers, testHistory, domainMastery, questionStats, spacedRepetition, adaptiveDifficulty, darkMode, autoDarkMode, textSize, mode]);

  const startAutoBackup = useCallback((intervalMs = backupInterval) => {
    if (autoBackup.current && isBackupEnabled) {
      autoBackup.current.start(intervalMs, getBackupData);
      setBackupInterval(intervalMs);
    }
  }, [getBackupData, isBackupEnabled, backupInterval]);

  const stopAutoBackup = useCallback(() => {
    if (autoBackup.current) {
      autoBackup.current.stop();
    }
  }, []);

  const updateBackupSettings = useCallback((enabled, intervalMs) => {
    setIsBackupEnabled(enabled);
    setBackupInterval(intervalMs);
    
    if (autoBackup.current) {
      autoBackup.current.setEnabled(enabled);
      if (enabled) {
        startAutoBackup(intervalMs);
      } else {
        stopAutoBackup();
      }
    }
  }, [startAutoBackup, stopAutoBackup]);
  const syncDataFromCloud = useCallback(async () => {
    // Hard guard: only attempt cloud sync when Auth0 is authenticated and we have a user id
    if (!isAuthenticated || !userId) {
      return;
    }

    setIsSyncing(true);
    try {
      const [
        progressStreaksRemote,
        scoreStatsRemote,
        studyPlanRemote,
        domainMasteryRemote,
        questionStatsRemote,
        missedQuestionsRemote,
        missedQueueRemote,
        missedMetaRemote,
        markedQuestionsRemote,
        examSimMarkedQuestionsRemote,
        simulatedAnswersRemote,
        testHistoryRemote,
        spacedRepetitionRemote,
        adaptiveDifficultyRemote,
        dailyDrillAnswersRemote,
        dailyDrillOrderRemote,
        dailyDrillIndexRemote,
      ] = await Promise.all([
        getUserData(supabaseUserId, questionBankId, 'progressStreaks'),
        getUserData(supabaseUserId, questionBankId, 'scoreStats'),
        getUserData(supabaseUserId, questionBankId, 'studyPlan'),
        getUserData(supabaseUserId, questionBankId, 'domainMastery'),
        getUserData(supabaseUserId, questionBankId, 'questionStats'),
        getUserData(supabaseUserId, questionBankId, 'missedQuestions'),
        getUserData(supabaseUserId, questionBankId, 'missedQueue'),
        getUserData(supabaseUserId, questionBankId, 'missedMeta'),
        getUserData(supabaseUserId, questionBankId, 'markedQuestions'),
        getUserData(supabaseUserId, questionBankId, 'examSimMarkedQuestions'),
        getUserData(supabaseUserId, questionBankId, 'simulatedAnswers'),
        getUserData(supabaseUserId, questionBankId, 'testHistory'),
        getUserData(supabaseUserId, questionBankId, 'spacedRepetition'),
        getUserData(supabaseUserId, questionBankId, 'adaptiveDifficulty'),
        getUserData(supabaseUserId, questionBankId, 'dailyDrillAnswers'),
        getUserData(supabaseUserId, questionBankId, 'dailyDrillOrder'),
        getUserData(supabaseUserId, questionBankId, 'dailyDrillIndex'),
      ]);

      // Helper to check if data is valid (not a fallback response object)
      const isValidData = (data) => {
        if (!data) return false;
        return true;
      };
      
      // Merge cloud data with local data, ALWAYS preferring cloud data for consistency
      let dataUpdated = false;
      
      if (isValidData(progressStreaksRemote)) {
        setProgressStreaks(normalizeRestoredData(progressStreaksRemote, 'progressStreaks'));
        dataUpdated = true;
      }
      if (isValidData(scoreStatsRemote)) {
        setScoreStats(normalizeRestoredData(scoreStatsRemote, 'scoreStats'));
        dataUpdated = true;
      }
      if (isValidData(studyPlanRemote)) {
        setStudyPlan(normalizeRestoredData(studyPlanRemote, 'studyPlan'));
        dataUpdated = true;
      }
      if (isValidData(domainMasteryRemote)) {
        setDomainMastery(normalizeRestoredData(domainMasteryRemote, 'domainMastery'));
        dataUpdated = true;
      }
      if (isValidData(questionStatsRemote)) {
        setQuestionStats(normalizeRestoredData(questionStatsRemote, 'questionStats'));
        dataUpdated = true;
      }
      
      // Handle missedQuestions with special logic to respect local data
      if (isValidData(missedQuestionsRemote)) {
        // If we've already hydrated locally, don't override with cloud data unless cloud is newer
        if (hasHydratedMissed) {
          const localMissedKey = keyForBank(questionBankId, 'missedQuestions');
          const localData = localStorage.getItem(localMissedKey);
          let localUpdatedAt = 0;
          let localCount = 0;
          
          if (localData) {
            try {
              const parsed = JSON.parse(localData);
              localUpdatedAt = parsed.updatedAt || 0;
              localCount = parsed.ids?.length || 0;
            } catch (e) {
              console.error('Error parsing local missedQuestions:', e);
            }
          }
          
          const cloudCount = Array.isArray(missedQuestionsRemote) ? missedQuestionsRemote.length : 0;
          const cloudUpdatedAt = 0;
          
          // Only apply cloud data if it has items AND is newer than local
          if ((cloudCount > 0) && (cloudUpdatedAt > localUpdatedAt)) {
            console.log('Updating missedQuestions from cloud (newer):', { 
              cloudCount, 
              localCount, 
              cloudUpdatedAt, 
              localUpdatedAt 
            });
            setMissedQuestions(normalizeRestoredData(missedQuestionsRemote, 'missedQuestions'));
            dataUpdated = true;
          } else {
          }
        } else {
          // Not hydrated yet, use cloud data
          setMissedQuestions(normalizeRestoredData(missedQuestionsRemote, 'missedQuestions'));
          dataUpdated = true;
        }
      }

      if (isValidData(missedQueueRemote)) {
        setMissedQueue(normalizeRestoredData(missedQueueRemote, 'missedQueue'));
        dataUpdated = true;
      }

      if (isValidData(missedMetaRemote)) {
        setMissedMeta(normalizeRestoredData(missedMetaRemote, 'missedMeta'));
        dataUpdated = true;
      }

      if (isValidData(markedQuestionsRemote)) {
        setMarkedQuestions(new Map(normalizeRestoredData(markedQuestionsRemote, 'markedQuestions')));
        dataUpdated = true;
      }

      if (isValidData(examSimMarkedQuestionsRemote)) {
        setExamSimMarkedQuestions(new Map(normalizeRestoredData(examSimMarkedQuestionsRemote, 'examSimMarkedQuestions')));
        dataUpdated = true;
      }

      if (isValidData(simulatedAnswersRemote)) {
        setSimulatedAnswers(normalizeRestoredData(simulatedAnswersRemote, 'simulatedAnswers'));
        dataUpdated = true;
      }

      if (isValidData(testHistoryRemote)) {
        setTestHistory(normalizeRestoredData(testHistoryRemote, 'testHistory'));
        dataUpdated = true;
      }

      if (isValidData(spacedRepetitionRemote)) {
        setSpacedRepetition(normalizeRestoredData(spacedRepetitionRemote, 'spacedRepetition'));
        dataUpdated = true;
      }

      if (isValidData(adaptiveDifficultyRemote)) {
        setAdaptiveDifficulty(normalizeRestoredData(adaptiveDifficultyRemote, 'adaptiveDifficulty'));
        dataUpdated = true;
      }

      if (isValidData(dailyDrillAnswersRemote)) {
        setDailyDrillAnswers(normalizeRestoredData(dailyDrillAnswersRemote, 'dailyDrillAnswers'));
        dataUpdated = true;
      }

      if (isValidData(dailyDrillOrderRemote)) {
        setDailyDrillOrder(normalizeRestoredData(dailyDrillOrderRemote, 'dailyDrillOrder'));
        dataUpdated = true;
      }

      if (isValidData(dailyDrillIndexRemote)) {
        setDailyDrillIndex(Number.isFinite(dailyDrillIndexRemote) ? dailyDrillIndexRemote : 0);
        dataUpdated = true;
      }
      
      if (dataUpdated) {
        console.log('✅ Cloud sync completed successfully - data updated');
      } else {
        console.log('⚠️ Cloud sync completed but no valid data found');
      }
      
      setLastSyncTime(new Date());
    } catch (error) {
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, userId, questionBankId, hasHydratedMissed]);

  const pendingWritesRef = useRef({});

  const syncDataToCloud = useCallback(async (dataType, data) => {
    // Guard: don't attempt sync without authentication
    if (!isAuthenticated || !userId) {
      console.log('Cannot sync to cloud: not authenticated or no user ID');
      return;
    }

    // Debounce per dataType
    if (pendingWritesRef.current[dataType]) {
      clearTimeout(pendingWritesRef.current[dataType]);
    }

    pendingWritesRef.current[dataType] = setTimeout(async () => {
      try {
        await updateUserData(userId, questionBankId, dataType, data);
      } catch (_e) {
        // no retry storm
      }
    }, 750);
  }, [isAuthenticated, userId, questionBankId]);

  // Debug function to test sync
  const debugSync = useCallback(async () => {
    console.log('=== DEBUG SYNC START ===');
    
    if (!isAuthenticated) {
      console.log('User is not authenticated');
      return;
    }

    console.log('Supabase user id:', userId);
    console.log('Current progressStreaks:', progressStreaks);
    
    // Test sync
    await syncDataFromCloud();
    console.log('=== DEBUG SYNC END ===');
  }, [isAuthenticated, userId, progressStreaks, syncDataFromCloud]);

  // Function to reset to dashboard (useful for navigation and redirects)
  const resetToDashboard = useCallback(() => {
    console.log('🏠 resetToDashboard called - current mode:', mode);
    console.log('🏠 Before reset - missedQuestions:', missedQuestions.length, 'missedQueue:', missedQueue.length);
    setMode('dashboard');
    localStorage.setItem('mode', 'dashboard');
    
    // Only update URL if feature flag is enabled
    if (isFeatureEnabled('dashboardPersistence')) {
      // Clean URL for dashboard
      const url = new URL(window.location);
      url.searchParams.delete('mode');
      window.history.replaceState({}, '', url);
    }
  }, [mode, isFeatureEnabled]);

  // Function to set mode with persistence and URL updates
  const setModeWithPersistence = useCallback((newMode) => {
    console.log('🔄 Setting mode:', { newMode, previousMode: mode });
    setMode(newMode);
    localStorage.setItem('mode', newMode);
    
    // Only update URL if feature flag is enabled
    if (isFeatureEnabled('dashboardPersistence')) {
      // Update URL to reflect current mode (without page reload)
      const url = new URL(window.location);
      if (newMode === 'dashboard') {
        // Remove mode parameter for dashboard (clean URL)
        url.searchParams.delete('mode');
      } else {
        url.searchParams.set('mode', newMode);
      }
      console.log('🌐 Updating URL to:', url.toString());
      window.history.replaceState({}, '', url);
    }
  }, [mode, isFeatureEnabled]);

  // Function to handle URL-based mode initialization
  const initializeFromURL = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlMode = urlParams.get('mode');
    
    console.log('🔍 Initializing from URL:', { urlMode, currentUrl: window.location.href });
    
    // Only use enhanced URL routing if feature flag is enabled
    if (isFeatureEnabled('dashboardPersistence')) {
      // If URL has a valid mode, use it; otherwise default to dashboard
      if (urlMode && ['practice', 'dailyDrills', 'simulated', 'rapidMemory', 'history', 'studyPlanner', 'performance', 'reviewMissed', 'reviewMarked', 'quickStudy', 'kindle', 'dashboard', 'domainPractice'].includes(urlMode)) {
        console.log('✅ Using URL mode:', urlMode);
        setModeWithPersistence(urlMode);
      } else {
        console.log('🏠 Defaulting to dashboard');
        resetToDashboard();
      }
    } else {
      // Original behavior - use saved mode or default to dashboard
      const savedMode = localStorage.getItem('mode') || 'dashboard';
      setMode(savedMode);
    }
  }, [isFeatureEnabled, setModeWithPersistence, resetToDashboard]);

  // Add global testing functions (development only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      window.cmmcSetFeatureFlag = setFeatureFlag;
      window.cmmcIsFeatureEnabled = isFeatureEnabled;
      window.cmmcFeatureFlags = featureFlags;
      console.log('🔧 Dev tools available:', {
        setFeatureFlag: 'window.cmmcSetFeatureFlag(name, enabled)',
        isFeatureEnabled: 'window.cmmcIsFeatureEnabled(name)',
        featureFlags: 'window.cmmcFeatureFlags'
      });
    }
  }, [setFeatureFlag, isFeatureEnabled, featureFlags]);

  // Load saved state from localStorage and initialize from URL
  useEffect(() => {
    const savedTextSize = localStorage.getItem('textSize') || 'base';
    
    setTextSize(savedTextSize);
    
    // Initialize mode from URL or default to dashboard
    initializeFromURL();
  }, [initializeFromURL]);

  // Monitor system health
  useEffect(() => {
    if (!isAuthenticated) return;

    const healthCheckInterval = setInterval(() => {
      // No-op: kept for parity with previous behavior, but no legacy sync layer remains.
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      clearInterval(healthCheckInterval);
    };
  }, [isAuthenticated]);

  // Migrate old question bank data and ensure proper sync for current bank
  const migrateOldData = useCallback(async () => {
    if (!isAuthenticated || !userId) return;
    
    console.log(`🔄 Checking for old question bank data to migrate... (current bank: ${questionBankId})`);
    
    try {
      // First, ensure current bank data is properly synced
      console.log(`🔄 Ensuring current bank (${questionBankId}) data is synced...`);
      
      // Force sync current bank data
      await syncDataFromCloud();
      
      // Only migrate old CCP banks if we're in CCP mode
      if (questionBankId === 'bankCCP') {
        const oldBanks = ['bank206', 'bank170'];
        let migratedData = {};
        let hasOldData = false;
        
        for (const oldBankId of oldBanks) {
          // Check cloud data for old banks
          const cloudData = await getUserData(userId, oldBankId, 'missedQuestions');
          if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
            console.log(`Found ${cloudData.length} missed questions in old bank ${oldBankId}`);
            
            // Filter and mark test questions
            const testQuestions = cloudData.filter(q => {
              // For bank206, these are all test questions
              if (oldBankId === 'bank206') return true;
              // For bank170, these are practice questions (don't migrate to memory section)
              return false;
            });
            
            if (testQuestions.length > 0) {
              migratedData = { ...migratedData, ...testQuestions };
              hasOldData = true;
            }
          }
        }
        
        if (hasOldData) {
          console.log(`Migrating ${Object.keys(migratedData).length} questions to new CCP bank...`);
          
          // Save migrated data to new CCP bank
          await updateUserData(userId, 'bankCCP', 'missedQuestions', migratedData);
          
          // Also update local state
          setMissedQuestions(Object.values(migratedData));
          
          console.log('✅ CCP Migration completed');
          
          // Show notification to user
          setTimeout(() => {
            alert('✅ Your old CCP progress has been migrated to the new question bank!');
          }, 1000);
        } else {
          console.log('No old CCP data found to migrate');
        }
      } else if (questionBankId === 'bankCCA') {
        console.log('CCA mode - ensuring proper sync without migration');
        
        // For CCA, just ensure data is properly synced
        const currentData = await getUserData(userId, 'bankCCA', 'missedQuestions');
        if (currentData && Array.isArray(currentData)) {
          console.log(`CCA sync: Found ${currentData.length} missed questions in cloud`);
          setMissedQuestions(currentData);
        }
      }
    } catch (error) {
      console.error('❌ Error during migration/sync:', error);
    }
  }, [isAuthenticated, userId, setMissedQuestions, questionBankId, syncDataFromCloud]);

  // Sync data from cloud on mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated && userId) {
      console.log('🔄 Triggering cloud data sync on auth change');
      syncDataFromCloud();
      
      // Run migration once when user logs in (bank-specific)
      const migrationKey = `cmmc_migration_completed_${questionBankId}`;
      if (!localStorage.getItem(migrationKey)) {
        migrateOldData().then(() => {
          localStorage.setItem(migrationKey, 'true');
        });
      }
    }
  }, [isAuthenticated, userId, questionBankId, syncDataFromCloud, migrateOldData]);

  // Sync data when user authenticates or bank changes
  useEffect(() => {
    if (isAuthenticated && userId) {
      console.log(`🔄 Bank changed to ${questionBankId} - forcing sync...`);
      syncDataFromCloud();
      
      // Also run bank-specific migration/sync when switching banks
      const migrationKey = `cmmc_migration_completed_${questionBankId}`;
      if (!localStorage.getItem(migrationKey)) {
        migrateOldData().then(() => {
          localStorage.setItem(migrationKey, 'true');
        });
      }
      
      // Ensure dashboard is the first thing users see after login
      resetToDashboard();
    }
  }, [isAuthenticated, userId, questionBankId, syncDataFromCloud, migrateOldData]);

  // IMPORTANT: For authenticated users, cloud sync takes priority
  // localStorage is only used for non-authenticated users or as fallback
  useEffect(() => {
    if (!isAuthenticated) {
      // Only load from localStorage if user is NOT authenticated
      // This prevents local data from overwriting cloud data
      console.log('Loading from localStorage (non-authenticated user)');
      // localStorage loading happens in the bank-scoped useEffect below
    }
  }, [isAuthenticated]);

  // Start auto-backup when user is authenticated and study plan is set
  useEffect(() => {
    if (isAuthenticated && userId && isBackupEnabled) {
      // Start auto-backup with current interval
      startAutoBackup(backupInterval);
      
      // Create immediate backup when study plan is set or changes
      if (studyPlan && studyPlan.testDate) {
        console.log('Study plan detected, creating immediate backup');
        createBackup();
      }
    }

    // Cleanup on unmount or when conditions change
    return () => {
      if (autoBackup.current) {
        autoBackup.current.stop();
      }
    };
  }, [isAuthenticated, userId, isBackupEnabled, backupInterval, studyPlan]);

  // Create backup when study plan is updated
  useEffect(() => {
    if (isAuthenticated && userId && studyPlan && studyPlan.testDate) {
      console.log('Study plan updated, creating backup');
      createBackup();
    }
  }, [studyPlan?.testDate, studyPlan?.dailyGoal, studyPlan?.targetQuestionsPerDay, isAuthenticated, userId]);

  // Normalization and migration layer for restored user state
  const normalizeRestoredData = useCallback((data, dataType) => {
    // Normalize arrays: replace null entries with safe defaults
    if (Array.isArray(data)) {
      return data.map((item, index) => {
        if (item == null) {
          // Return safe defaults based on data type
          switch (dataType) {
            case 'dailyDrillAnswers':
              return { attempts: 0, correct: 0, missed: 0, lastWrongAt: null };
            case 'practiceAnswers':
            case 'simulatedOrder':
            case 'dailyDrillOrder':
            case 'testHistory':
            case 'missedQuestions':
            case 'missedQueue':
              return null; // These can be null, will be filtered out later
            case 'progressStreaks':
              return { currentStreak: 0, bestStreak: 0, lastStudyDate: null, studyCalendar: {}, weeklyGoal: 5, monthlyGoal: 20 };
            case 'scoreStats':
              return { totalQuestions: 0, correctAnswers: 0, currentStreak: 0, bestStreak: 0, dailyStreak: 0, lastStudyDate: null, weeklyAccuracy: [] };
            case 'domainMastery':
              return { levels: {}, overallMastery: 0, weakDomains: [], strongDomains: [] };
            case 'spacedRepetition':
              return { queue: [], mastered: [], lastReviewDate: null };
            case 'adaptiveDifficulty':
              return { currentLevel: 1, recentPerformance: [], domainPerformance: {}, adjustmentFactor: 0.1 };
            default:
              return {};
          }
        }
        
        // Ensure required fields exist for objects
        if (typeof item === 'object' && item !== null) {
          switch (dataType) {
            case 'dailyDrillAnswers':
              return {
                attempts: item.attempts ?? 0,
                correct: item.correct ?? 0,
                missed: item.missed ?? 0,
                lastWrongAt: item.lastWrongAt ?? null
              };
            case 'scoreStats':
              return {
                totalQuestions: item.totalQuestions ?? 0,
                correctAnswers: item.correctAnswers ?? 0,
                currentStreak: item.currentStreak ?? 0,
                bestStreak: item.bestStreak ?? 0,
                dailyStreak: item.dailyStreak ?? 0,
                lastStudyDate: item.lastStudyDate ?? null,
                weeklyAccuracy: Array.isArray(item.weeklyAccuracy) ? item.weeklyAccuracy : []
              };
            case 'progressStreaks':
              return {
                currentStreak: item.currentStreak ?? 0,
                bestStreak: item.bestStreak ?? 0,
                lastStudyDate: item.lastStudyDate ?? null,
                studyCalendar: typeof item.studyCalendar === 'object' && item.studyCalendar !== null ? item.studyCalendar : {},
                weeklyGoal: item.weeklyGoal ?? 5,
                monthlyGoal: item.monthlyGoal ?? 20
              };
            case 'domainMastery':
              return {
                levels: typeof item.levels === 'object' && item.levels !== null ? item.levels : {},
                overallMastery: item.overallMastery ?? 0,
                weakDomains: Array.isArray(item.weakDomains) ? item.weakDomains : [],
                strongDomains: Array.isArray(item.strongDomains) ? item.strongDomains : []
              };
            case 'spacedRepetition':
              return {
                queue: Array.isArray(item.queue) ? item.queue : [],
                mastered: Array.isArray(item.mastered) ? item.mastered : [],
                lastReviewDate: item.lastReviewDate ?? null
              };
            case 'adaptiveDifficulty':
              return {
                currentLevel: item.currentLevel ?? 1,
                recentPerformance: Array.isArray(item.recentPerformance) ? item.recentPerformance : [],
                domainPerformance: typeof item.domainPerformance === 'object' && item.domainPerformance !== null ? item.domainPerformance : {},
                adjustmentFactor: item.adjustmentFactor ?? 0.1
              };
            default:
              return item;
          }
        }
        
        return item;
      }).filter(item => item !== null); // Filter out null entries that shouldn't exist
    }
    
    // Normalize objects
    if (typeof data === 'object' && data !== null) {
      switch (dataType) {
        case 'studyPlan':
          return {
            testDate: data.testDate ?? null,
            targetQuestionsPerDay: data.targetQuestionsPerDay ?? 15,
            dailyGoal: data.dailyGoal ?? 15,
            completedToday: data.completedToday ?? 0,
            totalQuestionsNeeded: data.totalQuestionsNeeded ?? getQuestionCount(DEFAULT_BANK_ID),
            questionsCompleted: data.questionsCompleted ?? 0,
            studyDaysRemaining: data.studyDaysRemaining ?? 0
          };
        case 'simulatedAnswers':
          return data; // Object with question IDs as keys
        default:
          return data;
      }
    }
    
    return data;
  }, []);

  // Load bank-scoped state whenever the bank changes (only if not authenticated)
  useEffect(() => {
    if (!isAuthenticated) {
      // Only load from localStorage if user is NOT authenticated
      // This prevents local data from overwriting cloud data
      // Note: missedQuestions are now handled separately for all users
      const savedMissedQueue = JSON.parse(localStorage.getItem(keyForBank(questionBankId, 'missedQueue')) || '[]');
      const savedMissedMeta = JSON.parse(localStorage.getItem(keyForBank(questionBankId, 'missedMeta')) || '{}');
      const savedMarked = new Map(JSON.parse(localStorage.getItem(keyForBank(questionBankId, 'markedQuestions')) || '[]'));
      const savedExamSimMarked = new Map(JSON.parse(localStorage.getItem(keyForBank(questionBankId, 'examSimMarkedQuestions')) || '[]'));
      const savedPracticeIndex = parseInt(localStorage.getItem(keyForBank(questionBankId, 'practiceIndex')) || '0');
      const savedPracticeAnswers = normalizeRestoredData(JSON.parse(localStorage.getItem(keyForBank(questionBankId, 'practiceAnswers')) || '[]'), 'practiceAnswers');
      const savedDailyDrillIndex = parseInt(localStorage.getItem(keyForBank(questionBankId, 'dailyDrillIndex')) || '0');
      const savedDailyDrillOrder = normalizeRestoredData(JSON.parse(localStorage.getItem(keyForBank(questionBankId, 'dailyDrillOrder')) || '[]'), 'dailyDrillOrder');
      const savedDailyDrillAnswers = normalizeRestoredData(JSON.parse(localStorage.getItem(keyForBank(questionBankId, 'dailyDrillAnswers')) || '[]'), 'dailyDrillAnswers');
      
      // Load schema version for future migrations
      const savedSchemaVersion = parseInt(localStorage.getItem(keyForBank(questionBankId, 'schemaVersion')) || '2');
      
      // Migration logic for older schemas
      let migratedDailyDrillAnswers = savedDailyDrillAnswers;
      if (savedSchemaVersion < 2) {
        // Migration to schema version 2: ensure all dailyDrillAnswers have required fields
        migratedDailyDrillAnswers = normalizeRestoredData(savedDailyDrillAnswers, 'dailyDrillAnswers');
      }
      
      const savedRapidIndex = parseInt(localStorage.getItem(keyForBank(questionBankId, 'rapidIndex')) || '0');
      const savedTestHistory = normalizeRestoredData(JSON.parse(localStorage.getItem(keyForBank(questionBankId, 'testHistory')) || '[]'), 'testHistory');
      const savedSimulatedIndex = parseInt(localStorage.getItem(keyForBank(questionBankId, 'simulatedIndex')) || '0');
      const savedSimulatedOrder = normalizeRestoredData(JSON.parse(localStorage.getItem(keyForBank(questionBankId, 'simulatedOrder')) || '[]'), 'simulatedOrder');
      const savedSimulatedAnswers = normalizeRestoredData(JSON.parse(localStorage.getItem(keyForBank(questionBankId, 'simulatedAnswers')) || '{}'), 'simulatedAnswers');
      const savedSimulatedTimeRemaining = parseInt(localStorage.getItem(keyForBank(questionBankId, 'simulatedTimeRemaining')) || '7200');
      const savedSimulatedTimerActive = localStorage.getItem(keyForBank(questionBankId, 'simulatedTimerActive')) === 'true';
      const savedScoreStats = normalizeRestoredData(JSON.parse(localStorage.getItem(keyForBank(questionBankId, 'scoreStats')) || '{"totalQuestions":0,"correctAnswers":0,"currentStreak":0,"bestStreak":0,"dailyStreak":0,"lastStudyDate":null,"weeklyAccuracy":[]}'), 'scoreStats');
      const savedStudyPlan = normalizeRestoredData(JSON.parse(localStorage.getItem(keyForBank(questionBankId, 'studyPlan')) || '{"testDate":null,"targetQuestionsPerDay":15,"dailyGoal":15,"completedToday":0,"totalQuestionsNeeded":' + getQuestionCount(questionBankId) + ',"questionsCompleted":0,"studyDaysRemaining":0}'), 'studyPlan');
      const savedSpacedRepetition = normalizeRestoredData(JSON.parse(localStorage.getItem(keyForBank(questionBankId, 'spacedRepetition')) || '{"queue":[],"mastered":[],"lastReviewDate":null}'), 'spacedRepetition');
      const savedAdaptiveDifficulty = normalizeRestoredData(JSON.parse(localStorage.getItem(keyForBank(questionBankId, 'adaptiveDifficulty')) || '{"currentLevel":1,"recentPerformance":[],"domainPerformance":{},"adjustmentFactor":0.1}'), 'adaptiveDifficulty');
      const savedProgressStreaks = normalizeRestoredData(JSON.parse(localStorage.getItem(keyForBank(questionBankId, 'progressStreaks')) || '{"currentStreak":0,"bestStreak":0,"lastStudyDate":null,"studyCalendar":{},"weeklyGoal":5,"monthlyGoal":20}'), 'progressStreaks');
      const savedDomainMastery = normalizeRestoredData(JSON.parse(localStorage.getItem(keyForBank(questionBankId, 'domainMastery')) || '{"levels":{},"overallMastery":0,"weakDomains":[],"strongDomains":[]}'), 'domainMastery');

      setMissedQueue(savedMissedQueue);
      setMissedMeta(savedMissedMeta);
      setMarkedQuestions(savedMarked);
      setExamSimMarkedQuestions(savedExamSimMarked);
      setPracticeIndex(savedPracticeIndex);
      setPracticeAnswers(savedPracticeAnswers);
      setDailyDrillIndex(Number.isFinite(savedDailyDrillIndex) ? savedDailyDrillIndex : 0);
      setDailyDrillOrder(Array.isArray(savedDailyDrillOrder) ? savedDailyDrillOrder : []);
      setDailyDrillAnswers(migratedDailyDrillAnswers);
      setSchemaVersion(savedSchemaVersion || 2);
      setRapidIndex(savedRapidIndex);
      setTestHistory(savedTestHistory);
      setSimulatedIndex(Number.isFinite(savedSimulatedIndex) ? savedSimulatedIndex : 0);
      setSimulatedOrder(Array.isArray(savedSimulatedOrder) ? savedSimulatedOrder : []);
      setSimulatedAnswers(savedSimulatedAnswers && typeof savedSimulatedAnswers === 'object' ? savedSimulatedAnswers : {});
      setSimulatedTimeRemaining(Number.isFinite(savedSimulatedTimeRemaining) ? savedSimulatedTimeRemaining : 7200);
      setSimulatedTimerActive(savedSimulatedTimerActive);
      setScoreStats(savedScoreStats);
      setStudyPlan(savedStudyPlan);
      setSpacedRepetition(savedSpacedRepetition);
      setAdaptiveDifficulty(savedAdaptiveDifficulty);
      setProgressStreaks(savedProgressStreaks);
      setDomainMastery(savedDomainMastery);

    // Note: localStorage loading is now handled by the conditional useEffect above
    // to prevent conflicts with cloud sync
    }
  }, [questionBankId, isAuthenticated]);

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Save autoDarkMode preference
  useEffect(() => {
    localStorage.setItem('autoDarkMode', autoDarkMode);
  }, [autoDarkMode]);

  // Auto-update dark mode based on time (checks every minute when autoDarkMode is enabled)
  useEffect(() => {
    if (!autoDarkMode) return;

    const checkAndUpdateDarkMode = () => {
      // Check system preference first
      const systemPrefersDark = getSystemDarkModePreference();
      const timeBasedDark = shouldBeDarkModeByTime();
      
      // System preference takes priority, then time-based
      const shouldBeDark = systemPrefersDark || timeBasedDark;
      
      setDarkMode(shouldBeDark);
    };

    // Check immediately
    checkAndUpdateDarkMode();

    // Check every minute for time-based changes
    const interval = setInterval(checkAndUpdateDarkMode, 60000);

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e) => {
      if (autoDarkMode) {
        setDarkMode(e.matches || shouldBeDarkModeByTime());
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
    } else {
      mediaQuery.addListener(handleSystemChange); // Fallback for older browsers
    }

    return () => {
      clearInterval(interval);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemChange);
      } else {
        mediaQuery.removeListener(handleSystemChange);
      }
    };
  }, [autoDarkMode]);

  useEffect(() => {
    localStorage.setItem('textSize', textSize);
  }, [textSize]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'missedQuestions'), JSON.stringify(missedQuestions));
    // Sync to cloud if authenticated
    syncDataToCloud('missedQuestions', missedQuestions);
  }, [missedQuestions, questionBankId, syncDataToCloud]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'missedQueue'), JSON.stringify(missedQueue));
    // Sync to cloud if authenticated
    syncDataToCloud('missedQueue', missedQueue);
  }, [missedQueue, questionBankId, syncDataToCloud]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'missedMeta'), JSON.stringify(missedMeta));
    // Sync to cloud if authenticated
    syncDataToCloud('missedMeta', missedMeta);
  }, [missedMeta, questionBankId, syncDataToCloud]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'markedQuestions'), JSON.stringify([...markedQuestions]));
    // Sync to cloud if authenticated
    syncDataToCloud('markedQuestions', [...markedQuestions]);
  }, [markedQuestions, questionBankId, syncDataToCloud]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'examSimMarkedQuestions'), JSON.stringify([...examSimMarkedQuestions]));
    // Sync to cloud if authenticated
    syncDataToCloud('examSimMarkedQuestions', [...examSimMarkedQuestions]);
  }, [examSimMarkedQuestions, questionBankId, syncDataToCloud]);

  useEffect(() => {
    localStorage.setItem('mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'practiceIndex'), practiceIndex.toString());
  }, [practiceIndex, questionBankId]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'practiceAnswers'), JSON.stringify(practiceAnswers));
  }, [practiceAnswers, questionBankId]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'dailyDrillIndex'), dailyDrillIndex.toString());
    // Sync to cloud if authenticated
    syncDataToCloud('dailyDrillIndex', dailyDrillIndex);
  }, [dailyDrillIndex, questionBankId, syncDataToCloud]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'dailyDrillOrder'), JSON.stringify(dailyDrillOrder));
    // Sync to cloud if authenticated
    syncDataToCloud('dailyDrillOrder', dailyDrillOrder);
  }, [dailyDrillOrder, questionBankId, syncDataToCloud]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'dailyDrillAnswers'), JSON.stringify(dailyDrillAnswers));
    // Sync to cloud if authenticated
    syncDataToCloud('dailyDrillAnswers', dailyDrillAnswers);
  }, [dailyDrillAnswers, questionBankId, syncDataToCloud]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'schemaVersion'), schemaVersion.toString());
  }, [schemaVersion, questionBankId]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'rapidIndex'), rapidIndex.toString());
  }, [rapidIndex, questionBankId]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'testHistory'), JSON.stringify(testHistory));
    // Sync to cloud if authenticated
    syncDataToCloud('testHistory', testHistory);
  }, [testHistory, questionBankId, syncDataToCloud]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'simulatedIndex'), simulatedIndex.toString());
  }, [simulatedIndex, questionBankId]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'simulatedOrder'), JSON.stringify(simulatedOrder));
  }, [simulatedOrder, questionBankId]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'simulatedAnswers'), JSON.stringify(simulatedAnswers));
  }, [simulatedAnswers, questionBankId]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'simulatedTimeRemaining'), simulatedTimeRemaining.toString());
  }, [simulatedTimeRemaining, questionBankId]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'simulatedTimerActive'), simulatedTimerActive.toString());
  }, [simulatedTimerActive, questionBankId]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'scoreStats'), JSON.stringify(scoreStats));
    // Sync to cloud if authenticated
    syncDataToCloud('scoreStats', scoreStats);
  }, [scoreStats, questionBankId, syncDataToCloud]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'studyPlan'), JSON.stringify(studyPlan));
    // Sync to cloud if authenticated
    syncDataToCloud('studyPlan', studyPlan);
  }, [studyPlan, questionBankId, syncDataToCloud]);

  // Save daily progress to localStorage whenever studyPlan changes
  useEffect(() => {
    const dailyProgress = {
      completedToday: studyPlan.completedToday,
      lastStudyDate: studyPlan.lastStudyDate,
      questionsCompleted: studyPlan.questionsCompleted,
      dailyGoal: studyPlan.dailyGoal,
      timestamp: Date.now()
    };
    localStorage.setItem('dailyProgress', JSON.stringify(dailyProgress));
    console.log('💾 Daily progress saved:', dailyProgress);
  }, [studyPlan.completedToday, studyPlan.lastStudyDate, studyPlan.questionsCompleted, studyPlan.dailyGoal]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'spacedRepetition'), JSON.stringify(spacedRepetition));
    // Sync to cloud if authenticated
    syncDataToCloud('spacedRepetition', spacedRepetition);
  }, [spacedRepetition, questionBankId, syncDataToCloud]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'adaptiveDifficulty'), JSON.stringify(adaptiveDifficulty));
    // Sync to cloud if authenticated
    syncDataToCloud('adaptiveDifficulty', adaptiveDifficulty);
  }, [adaptiveDifficulty, questionBankId, syncDataToCloud]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'progressStreaks'), JSON.stringify(progressStreaks));
    // Sync to cloud if authenticated
    syncDataToCloud('progressStreaks', progressStreaks);
  }, [progressStreaks, questionBankId, syncDataToCloud]);

  useEffect(() => {
    localStorage.setItem(keyForBank(questionBankId, 'domainMastery'), JSON.stringify(domainMastery));
    // Sync to cloud if authenticated
    syncDataToCloud('domainMastery', domainMastery);
  }, [domainMastery, questionBankId, syncDataToCloud]);

  const markQuestion = (questionId, selectedAnswer = null) => {
    setMarkedQuestions(prev => {
      const newMap = new Map(prev);
      if (newMap.has(questionId)) {
        newMap.delete(questionId);
      } else {
        newMap.set(questionId, selectedAnswer);
      }
      return newMap;
    });
  };

  const markExamSimQuestion = (questionId, selectedAnswer = null) => {
    setExamSimMarkedQuestions(prev => {
      const newMap = new Map(prev);
      if (newMap.has(questionId)) {
        newMap.delete(questionId);
      } else {
        newMap.set(questionId, selectedAnswer);
      }
      return newMap;
    });
    // Also update the general markedQuestions for backward compatibility
    markQuestion(questionId, selectedAnswer);
  };

  const addToMissed = (question) => {
    console.log('📍 Adding to missed:', question.id);
    setMissedQuestions(prev => {
      const exists = prev.some(q => q.id === question.id);
      if (!exists) {
        console.log('📍 Adding new question to missedQuestions:', question.id);
        return [...prev, question];
      }
      return prev;
    });
    
    // Add to missedQueue for Missed Questions Coach Mode
    setMissedQueue(prev => {
      if (!prev.includes(question.id)) {
        console.log('📍 Adding to missedQueue:', question.id);
        return [...prev, question.id];
      }
      return prev;
    });
    
    // Update missedMeta with wrongCount and lastWrongAt
    setMissedMeta(prev => {
      console.log('📍 Updating missedMeta for:', question.id);
      return {
        ...prev,
        [question.id]: {
          wrongCount: (prev[question.id]?.wrongCount || 0) + 1,
          lastWrongAt: new Date().toISOString(),
          correctRepCount: 0 // Reset correct repetition count when wrong
        }
      };
    });
  };

  const clearMissed = () => {
    console.log('🧹 clearMissed called - clearing all missed question data');
    console.log('🧹 Before clear - missedQuestions:', missedQuestions.length, 'missedQueue:', missedQueue.length);
    setMissedQuestions([]);
    setMissedQueue([]);
    setMissedMeta({});
  };

  const removeFromMissed = (questionId) => {
    setMissedQuestions(prev => prev.filter(q => q.id !== questionId));
    setMissedQueue(prev => prev.filter(id => id !== questionId));
    setMissedMeta(prev => {
      const newMeta = { ...prev };
      delete newMeta[questionId];
      return newMeta;
    });
  };

  const completeTest = () => {
    setTestCompleted(true);
  };

  const clearTestHistory = () => {
    setTestHistory([]);
  };

  const startSimulatedTest = (questions) => {
    // Handle case where questions is undefined or null
    const questionsToUse = questions || [];
    const shuffled = shuffleInPlace([...questionsToUse]);
    setSimulatedOrder(shuffled);
    setSimulatedIndex(0);
    setSimulatedAnswers({});
    setSimulatedTimeRemaining(7200); // Reset to 120 minutes
    setSimulatedTimerActive(true); // Start timer automatically
    setTestCompleted(false);
    setMode('simulated');
  };

  const resetSimulatedTest = () => {
    setSimulatedIndex(0);
    setSimulatedOrder([]);
    setSimulatedAnswers({});
    setTestCompleted(false);
  };

  const resetProgress = () => {
    console.log('🧹 resetProgress called - clearing all progress data');
    console.log('🧹 Before reset - missedQuestions:', missedQuestions.length, 'missedQueue:', missedQueue.length);
    
    setPracticeIndex(0);
    setPracticeAnswers([]);
    setDailyDrillIndex(0);
    setDailyDrillOrder([]);
    setDailyDrillAnswers([]);
    setRapidIndex(0);
    setMissedQuestions([]);
    setMissedQueue([]);
    setMissedMeta({});
    setMarkedQuestions(new Map());
    setTestHistory([]);
    // Clear daily drill session from localStorage
    localStorage.removeItem('cmmcDailyDrillSession');
    setScoreStats({
      totalQuestions: 0,
      correctAnswers: 0,
      currentStreak: 0,
      bestStreak: 0,
      dailyStreak: 0,
      lastStudyDate: null,
      weeklyAccuracy: [],
    });
    setStudyPlan({
      testDate: null,
      targetQuestionsPerDay: 15,
      dailyGoal: 15,
      completedToday: 0,
      totalQuestionsNeeded: getQuestionCount(questionBankId),
      questionsCompleted: 0,
      studyDaysRemaining: 0,
    });
    setSpacedRepetition({
      queue: [],
      mastered: [],
      lastReviewDate: null,
    });
    setAdaptiveDifficulty({
      currentLevel: 1,
      recentPerformance: [],
      domainPerformance: {},
      adjustmentFactor: 0.1,
    });
    setProgressStreaks({
      currentStreak: 0,
      bestStreak: 0,
      lastStudyDate: null,
      studyCalendar: {},
      weeklyGoal: 5,
      monthlyGoal: 20,
    });
    setDomainMastery({
      levels: {},
      overallMastery: 0,
      weakDomains: [],
      strongDomains: [],
    });
  };

  const saveTestResult = (testResult) => {
    setTestHistory(prev => [testResult, ...prev]);
  };

  const updateScoreStats = (correct, total, streak = 0) => {
    setScoreStats(prev => {
      const newStats = {
        ...prev,
        totalQuestions: prev.totalQuestions + total,
        correctAnswers: prev.correctAnswers + correct,
        currentStreak: streak,
        bestStreak: Math.max(prev.bestStreak, streak),
      };
      
      // Update weekly accuracy
      const today = new Date().toISOString().split('T')[0];
      const weeklyData = [...prev.weeklyAccuracy];
      const todayIndex = weeklyData.findIndex(d => d.date === today);
      
      if (todayIndex >= 0) {
        weeklyData[todayIndex] = {
          date: today,
          correct: weeklyData[todayIndex].correct + correct,
          total: weeklyData[todayIndex].total + total,
        };
      } else {
        weeklyData.push({
          date: today,
          correct,
          total,
        });
      }
      
      // Keep only last 7 days
      newStats.weeklyAccuracy = weeklyData.slice(-7);
      
      return newStats;
    });
  };

  const getAccuracy = () => {
    if (scoreStats.totalQuestions === 0) return 0;
    return Math.round((scoreStats.correctAnswers / scoreStats.totalQuestions) * 100);
  };

  const getWeeklyAccuracy = () => {
    const weekData = scoreStats.weeklyAccuracy;
    if (weekData.length === 0) return 0;
    
    const totalCorrect = weekData.reduce((sum, day) => sum + day.correct, 0);
    const totalQuestions = weekData.reduce((sum, day) => sum + day.total, 0);
    
    return totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  };

  // Comprehensive readiness scoring that considers all practice modes
  const getReadinessScore = () => {
    const accuracy = getAccuracy();
    const weeklyAccuracy = getWeeklyAccuracy();
    
    // Domain mastery score (average of all domains)
    const domainScores = Object.values(domainMastery.levels || {});
    const avgDomainMastery = domainScores.length > 0 
      ? domainScores.reduce((sum, score) => sum + score, 0) / domainScores.length 
      : 0;
    
    // Consistency score based on streaks and daily progress
    const consistencyScore = Math.min(100, (
      (progressStreaks.currentStreak * 5) + // 5 points per day streak
      (progressStreaks.bestStreak * 2) + // 2 points per best streak day
      (studyPlan.completedToday >= studyPlan.dailyGoal ? 20 : 0) + // 20 points for meeting daily goal
      (weeklyAccuracy > 0 ? weeklyAccuracy * 0.3 : 0) // 30% of weekly accuracy
    ));
    
    // Practice volume score (questions attempted vs total needed)
    const volumeScore = Math.min(100, (scoreStats.totalQuestions / getQuestionCount(questionBankId)) * 100);
    
    // Weak domain improvement (check if weak domains are improving)
    const weakDomains = domainMastery.weakDomains || [];
    const weakDomainImprovement = weakDomains.length === 0 ? 100 : 
      weakDomains.reduce((sum, domain) => {
        const domainScore = domainMastery.levels[domain] || 0;
        return sum + Math.min(100, domainScore * 2); // Double weight for weak domains
      }, 0) / Math.max(1, weakDomains.length);
    
    // Final weighted readiness score
    const readinessScore = Math.round(
      (accuracy * 0.25) + // 25% overall accuracy
      (avgDomainMastery * 0.25) + // 25% domain mastery
      (consistencyScore * 0.25) + // 25% consistency
      (volumeScore * 0.15) + // 15% practice volume
      (weakDomainImprovement * 0.10) // 10% weak domain improvement
    );
    
    return {
      overall: Math.min(100, readinessScore),
      breakdown: {
        accuracy,
        weeklyAccuracy,
        avgDomainMastery: Math.round(avgDomainMastery),
        consistencyScore: Math.round(consistencyScore),
        volumeScore: Math.round(volumeScore),
        weakDomainImprovement: Math.round(weakDomainImprovement)
      },
      recommendations: getReadinessRecommendations(readinessScore, accuracy, weakDomains, consistencyScore)
    };
  };

  const getReadinessRecommendations = (score, accuracy, weakDomains, consistency) => {
    const recommendations = [];
    
    if (accuracy < 70) {
      recommendations.push("Focus on improving overall accuracy through more practice questions");
    }
    
    if (weakDomains.length > 0) {
      recommendations.push(`Prioritize weak domains: ${weakDomains.join(', ')}`);
    }
    
    if (consistency < 50) {
      recommendations.push("Build better study habits - aim for consistent daily practice");
    }
    
    if (score >= 80) {
      recommendations.push("Excellent readiness! Consider taking a simulated test");
    } else if (score >= 60) {
      recommendations.push("Good progress - continue daily practice and focus on weak areas");
    } else {
      recommendations.push("Need more preparation - increase daily practice and review fundamentals");
    }
    
    return recommendations;
  };

  const setTestDate = (date) => {
    setStudyPlan(prev => {
      const today = new Date();
      const testDate = new Date(date);
      const daysRemaining = Math.ceil((testDate - today) / (1000 * 60 * 60 * 24));
      const totalQuestionsNeeded = getQuestionCount(questionBankId);
      const questionsPerDay = Math.ceil(totalQuestionsNeeded / Math.max(daysRemaining, 1));
      
      return {
        ...prev,
        testDate: date, // Store as string in yyyy-MM-dd format for HTML input
        testDateObj: testDate, // Store Date object for calculations
        daysRemaining,
        targetQuestionsPerDay: questionsPerDay,
        dailyGoal: questionsPerDay,
        totalQuestionsNeeded,
        recalculatedAt: Date.now()
      };
    });
  };

  const updateDailyProgress = (questionsCompleted) => {
    setStudyPlan(prev => {
      const today = new Date().toDateString();
      const lastStudy = prev.lastStudyDate;
      const isSameDay = lastStudy === today;
      
      let completedToday = questionsCompleted;
      if (!isSameDay) {
        completedToday = questionsCompleted; // Reset for new day
      } else {
        completedToday = prev.completedToday + questionsCompleted;
      }
      
      return {
        ...prev,
        completedToday,
        questionsCompleted: prev.questionsCompleted + questionsCompleted,
        lastStudyDate: today,
      };
    });
  };

  const adjustDailyGoal = (newGoal) => {
    setStudyPlan(prev => ({
      ...prev,
      dailyGoal: Math.min(newGoal, 50), // Cap at 50 questions per day
    }));
  };

  const setDailyGoal = (newGoal) => {
    setStudyPlan(prev => ({
      ...prev,
      dailyGoal: Math.max(1, Math.min(newGoal, 50)), // Ensure between 1 and 50
    }));
  };

  const setTargetQuestionsPerDay = (newTarget) => {
    setStudyPlan(prev => ({
      ...prev,
      targetQuestionsPerDay: Math.max(1, Math.min(newTarget, 50)), // Ensure between 1 and 50
    }));
  };

  // Spaced Repetition Functions
  const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

  const sm2Update = ({ interval, repetitions, easeFactor }, quality) => {
    // quality is 0..5
    let newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEF = clamp(newEF, 1.3, 2.8);

    if (quality < 3) {
      return { interval: 1, repetitions: 0, easeFactor: newEF };
    }

    const newReps = repetitions + 1;

    let newInterval;
    if (newReps === 1) newInterval = 1;
    else if (newReps === 2) newInterval = 6;
    else newInterval = Math.round(interval * newEF);

    return { interval: newInterval, repetitions: newReps, easeFactor: newEF };
  };

  const addToSpacedRepetition = (question) => {
    setSpacedRepetition(prev => {
      const now = new Date();
      const exists = prev.queue.some(item => item.questionId === question.id);

      // If already exists, do not add duplicate
      if (exists) return prev;

      const nextReview = new Date(now.getTime() + (24 * 60 * 60 * 1000));

      return {
        ...prev,
        queue: [
          ...prev.queue,
          {
            questionId: question.id,
            question,
            nextReview: nextReview.toISOString(),
            interval: 1,
            repetitions: 0,
            easeFactor: 2.5,
          }
        ],
        lastReviewDate: now.toISOString(),
      };
    });
  };

  const updateSpacedRepetition = (questionId, isCorrect) => {
    setSpacedRepetition(prev => {
      const now = new Date();

      const updatedQueue = prev.queue.map(item => {
        if (item.questionId !== questionId) return item;

        const quality = isCorrect ? 4 : 2; // simple mapping for now
        const { interval, repetitions, easeFactor } = sm2Update(item, quality);

        const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

        return {
          ...item,
          nextReview: nextReview.toISOString(),
          interval,
          repetitions,
          easeFactor,
        };
      });

      return {
        ...prev,
        queue: updatedQueue,
        lastReviewDate: now.toISOString(),
      };
    });
  };

  const getDueQuestions = () => {
    const now = new Date();
    return spacedRepetition.queue.filter(item => 
      new Date(item.nextReview) <= now
    );
  };

  // Practice Session Management Functions
  const ACTIVE_SESSION_KEY = "cmmc_practice_session_active";

  const loadActivePracticeSession = () => {
    try {
      const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const saveActivePracticeSession = (session) => {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    setPracticeSession(session);
  };

  const clearActivePracticeSession = () => {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    setPracticeSession(null);
  };

  const createPracticeSession = (mode, questionIds, options = {}) => {
    const now = new Date().toISOString();
    const session = {
      id: `ps_${Date.now()}`,
      mode,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      targetCount: questionIds.length,
      questionIds,
      currentIndex: 0,
      answered: {},
      markedForReview: [],
      domainMix: options.domainMix || [],
      difficultyTarget: options.difficultyTarget || 3,
    };
    saveActivePracticeSession(session);
    return session;
  };

  const recordAnswerToSession = (session, questionId, payload) => {
    const nowIso = new Date().toISOString();

    const updated = {
      ...session,
      updatedAt: nowIso,
      currentIndex: session.currentIndex + 1,
      answered: {
        ...(session.answered || {}),
        [questionId]: {
          ...(session.answered?.[questionId] || {}),
          ...payload,
          answeredAt: nowIso,
        },
      },
    };

    saveActivePracticeSession(updated);
    return updated;
  };

  const pausePracticeSession = (session) => {
    const updated = { 
      ...session, 
      status: 'paused', 
      updatedAt: new Date().toISOString() 
    };
    saveActivePracticeSession(updated);
    return updated;
  };

  const endPracticeSession = (session) => {
    const updated = { 
      ...session, 
      status: 'completed', 
      updatedAt: new Date().toISOString() 
    };
    clearActivePracticeSession();
    return updated;
  };

  const sessionAnsweredCount = (session) => Object.keys(session.answered || {}).length;

  const qualifiesForStreak = (session) => {
    const answered = sessionAnsweredCount(session);
    const minAnswered = 10;
    return answered >= minAnswered;
  };

  // Question Bank Helper Functions — data-driven from the bank registry so any
  // bank (with any question count) works without editing hardcoded values.
  const getQuestionBankName = () => getBankMeta(questionBankId).label;

  const getQuestionBankTotal = () => getQuestionCountForBank(questionBankId);

  // Adaptive Difficulty Functions
  // Single source of truth for recording all attempts
  const recordAttempt = (question, selectedChoiceId, isCorrect, mode) => {
    // Normalize domain key to prevent split domains
    const domainKey = String(question.domain || "Uncategorized").trim();
    
    console.log(`📝 Recording attempt: ${question.id}, domain: ${domainKey}, correct: ${isCorrect}, mode: ${mode}`);
    
    // Update all persistent stores
    updateQuestionStats(question.id, isCorrect);
    updateDomainMastery(domainKey, isCorrect);
    
    // Handle missed questions (only for practice modes, not reviews)
    if (!isCorrect && mode !== 'reviewMissed') {
      addToMissed(question);
      addToSpacedRepetition(question);
    }
    // Note: Removed automatic removal from missed in reviewMissed mode
    // Questions will only be removed when user explicitly clicks "Next"
    
    // Update adaptive difficulty (which also updates question stats and domain mastery internally)
    // Note: updateAdaptiveDifficulty already calls updateQuestionStats and updateDomainMastery,
    // so we need to avoid double-counting by calling it separately
    setAdaptiveDifficulty(prev => {
      const newRecentPerformance = [...prev.recentPerformance, isCorrect].slice(-10);
      const recentAccuracy = newRecentPerformance.filter(Boolean).length / newRecentPerformance.length;
      
      const newDomainPerformance = { ...prev.domainPerformance };
      if (!newDomainPerformance[domainKey]) {
        newDomainPerformance[domainKey] = [];
      }
      newDomainPerformance[domainKey] = [...newDomainPerformance[domainKey], isCorrect].slice(-5);
      
      let newLevel = prev.currentLevel;
      if (recentAccuracy > 0.8 && newRecentPerformance.length >= 5) {
        newLevel = Math.min(5, newLevel + prev.adjustmentFactor);
      } else if (recentAccuracy < 0.6 && newRecentPerformance.length >= 5) {
        newLevel = Math.max(1, newLevel - prev.adjustmentFactor);
      }
      
      return {
        ...prev,
        currentLevel: newLevel,
        recentPerformance: newRecentPerformance,
        domainPerformance: newDomainPerformance,
      };
    });
    
    // Update progress streaks for this attempt
    updateProgressStreaks(1, isCorrect);
    
    // Update daily progress for consistency tracking
    updateDailyProgress(1);
    
    // Update score stats for overall readiness scoring
    updateScoreStats(isCorrect ? 1 : 0, 1, isCorrect ? (scoreStats.currentStreak + 1) : 0);
  };

  const updateAdaptiveDifficulty = (questionId, isCorrect, domain) => {
    // Update question-level statistics
    updateQuestionStats(questionId, isCorrect);
    
    // Also update domain mastery
    updateDomainMastery(domain, isCorrect);
    
    setAdaptiveDifficulty(prev => {
      const newRecentPerformance = [...prev.recentPerformance, isCorrect].slice(-10); // Keep last 10
      const recentAccuracy = newRecentPerformance.filter(Boolean).length / newRecentPerformance.length;
      
      // Update domain performance
      const newDomainPerformance = { ...prev.domainPerformance };
      if (!newDomainPerformance[domain]) {
        newDomainPerformance[domain] = [];
      }
      newDomainPerformance[domain] = [...newDomainPerformance[domain], isCorrect].slice(-5); // Keep last 5 per domain
      
      // Calculate new difficulty level
      let newLevel = prev.currentLevel;
      if (recentAccuracy > 0.8 && newRecentPerformance.length >= 5) {
        // Increase difficulty if performing well
        newLevel = Math.min(5, newLevel + prev.adjustmentFactor);
      } else if (recentAccuracy < 0.6 && newRecentPerformance.length >= 5) {
        // Decrease difficulty if struggling
        newLevel = Math.max(1, newLevel - prev.adjustmentFactor);
      }
      
      return {
        ...prev,
        currentLevel: Math.round(newLevel * 10) / 10, // Round to 1 decimal
        recentPerformance: newRecentPerformance,
        domainPerformance: newDomainPerformance,
      };
    });
  };

  const getDifficultyForQuestion = (question) => {
    const domainPerformance = adaptiveDifficulty.domainPerformance[question.domain] || [];
    const domainAccuracy = domainPerformance.length > 0 
      ? domainPerformance.filter(Boolean).length / domainPerformance.length 
      : 0; // Default to 0% if no data
    
    // Map accuracy to difficulty (1-5 scale)
    if (domainAccuracy > 0.9) return 5; // Very hard
    if (domainAccuracy > 0.8) return 4; // Hard
    if (domainAccuracy > 0.6) return 3; // Medium
    if (domainAccuracy > 0.4) return 2; // Easy
    return 1; // Very easy
  };

  const getQuestionsForDifficulty = (allQuestions, targetDifficulty) => {
    return allQuestions.filter(question => {
      const questionDifficulty = getDifficultyForQuestion(question);
      return Math.abs(questionDifficulty - targetDifficulty) <= 0.5; // Within 0.5 of target
    });
  };

  // Initialize domain mastery for all available domains
  const initializeDomainMastery = () => {
    console.log('🚀 Initializing domain mastery...');
    if (!questions || !Array.isArray(questions)) {
      console.log('❌ No questions available for domain initialization');
      return;
    }
    
    const availableDomains = [...new Set(questions.map(q => q.domain).filter(Boolean))];
    console.log('📋 Available domains from questions:', availableDomains);
    
    setDomainMastery(prev => {
      const newLevels = { ...prev.levels };
      console.log('📝 Previous domain levels:', Object.keys(newLevels));
      
      // Initialize all available domains with default values if they don't exist
      availableDomains.forEach(domain => {
        if (!newLevels[domain]) {
          console.log(`➕ Adding new domain: ${domain}`);
          newLevels[domain] = {
            masteryLevel: 0,     // start at 0% instead of 50%
            attempts: 0,
            correct: 0,
            total: 0,
            lastUpdated: Date.now(),
          };
        } else {
          console.log(`✅ Domain already exists: ${domain}`);
        }
      });
      
      const allDomains = Object.keys(newLevels);
      const overallMastery = allDomains.length
        ? allDomains.reduce((sum, d) => sum + (newLevels[d].masteryLevel ?? 0), 0) / allDomains.length
        : 0;
      
      console.log('📊 Final domain mastery state:', {
        domains: allDomains,
        overallMastery,
        levels: newLevels
      });
      
      return {
        levels: newLevels,
        overallMastery,
        weakDomains: allDomains.filter(d => (newLevels[d].masteryLevel ?? 0) < 0.65),
        strongDomains: allDomains.filter(d => (newLevels[d].masteryLevel ?? 0) > 0.85),
      };
    });
  };

  // Initialize domains when questions are loaded
  useEffect(() => {
    console.log('🔄 Domain initialization useEffect triggered:', {
      hasQuestions: !!questions,
      questionsLength: questions?.length || 0,
      questionBankId
    });
    initializeDomainMastery();
  }, [questions, questionBankId]);

  // Mastery Tracking Functions
  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  const updateDomainMastery = (domain, isCorrect) => {
    setDomainMastery(prev => {
      const now = Date.now();
      const newLevels = { ...prev.levels };

      if (!newLevels[domain]) {
        newLevels[domain] = {
          masteryLevel: 0,     // start at 0% instead of 50%
          attempts: 0,
          correct: 0,
          total: 0,
          lastUpdated: now,
        };
      }

      const old = newLevels[domain];

      // EWMA: alpha controls responsiveness
      // 0.15 to 0.25 is a good range; higher = faster adaptation
      const alpha = 0.2;

      const newAttempts = (old.attempts ?? 0) + 1;
      const ewma = (old.masteryLevel * (1 - alpha)) + ((isCorrect ? 1 : 0) * alpha);

      // Confidence term: prevents tiny sample sizes from looking "certain"
      // k controls how quickly confidence rises with attempts
      const k = 12;
      const confidence = 1 - Math.exp(-newAttempts / k);

      // Blend EWMA toward the prior mastery when confidence is low.
      // This prevents domains with 0 attempts from appearing as ~50%.
      const priorMastery = old.masteryLevel ?? 0;
      const blendedMastery = clamp01((ewma * confidence) + (priorMastery * (1 - confidence)));

      newLevels[domain] = {
        ...old,
        masteryLevel: blendedMastery,
        attempts: newAttempts,
        correct: (old.correct ?? 0) + (isCorrect ? 1 : 0),
        total: (old.total ?? 0) + 1,
        lastUpdated: now,
      };

      const allDomains = Object.keys(newLevels);
      const overallMastery = allDomains.length
        ? allDomains.reduce((sum, d) => sum + (newLevels[d].masteryLevel ?? 0), 0) / allDomains.length
        : 0;

      return {
        levels: newLevels,
        overallMastery,
        weakDomains: allDomains.filter(d => (newLevels[d].masteryLevel ?? 0) < 0.65),
        strongDomains: allDomains.filter(d => (newLevels[d].masteryLevel ?? 0) > 0.85),
      };
    });
  };

  const getDomainMasteryLevel = (domain) => {
    return domainMastery.levels[domain]?.masteryLevel || 0;
  };

  const getWeakDomains = () => {
    return domainMastery?.weakDomains || [];
  };

  const getStrongDomains = () => {
    return domainMastery?.strongDomains || [];
  };

  // Question stats helpers
  const getQuestionStats = (questionId) => questionStats?.[questionId] ?? null;

  const updateQuestionStats = (questionId, isCorrect) => {
    setQuestionStats(prev => {
      const now = Date.now();
      const existing = prev[questionId] || {
        attempts: 0,
        correct: 0,
        lastSeenAt: 0,
        lastWrongAt: null,
      };

      const updated = {
        ...existing,
        attempts: existing.attempts + 1,
        correct: existing.correct + (isCorrect ? 1 : 0),
        lastSeenAt: now,
        lastWrongAt: isCorrect ? existing.lastWrongAt : now,
      };

      const newStats = { ...prev, [questionId]: updated };
      localStorage.setItem('questionStats', JSON.stringify(newStats));
      // Sync to cloud if authenticated
      syncDataToCloud('questionStats', newStats);
      return newStats;
    });
  };

  const getMasteryColor = (masteryLevel) => {
    if (masteryLevel >= 0.9) return 'text-green-600';
    if (masteryLevel >= 0.7) return 'text-blue-600';
    if (masteryLevel >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMasteryLabel = (masteryLevel) => {
    if (masteryLevel >= 0.9) return 'Mastered';
    if (masteryLevel >= 0.7) return 'Proficient';
    if (masteryLevel >= 0.5) return 'Developing';
    return 'Needs Work';
  };

  // Adaptive Question Prioritization Functions
  const shuffleInPlace = (arr) => {
    // Fisher-Yates, avoids Math.random sort bias
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const getPrioritizedQuestions = (allQuestions, count = 20, sessionSeenIds = null) => {
    if (!Array.isArray(allQuestions) || allQuestions.length === 0) return [];

    // MINIMAL FIX: Filter out invalid questions to prevent crash
    const validQuestions = allQuestions.filter(q => q && q.id && q.domain);
    if (validQuestions.length === 0) return [];

    const now = Date.now();

    // Helper functions
    const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
    const minutesBetween = (aMs, bMs) => (aMs - bMs) / (60 * 1000);
    const fisherYatesShuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const domainWeight = (domain) => {
      const mastery = getDomainMasteryLevel(domain) ?? 0.5;
      return Math.pow(1 - mastery, 1.5);
    };

    const questionScore = (q, now = Date.now(), sessionSeenIds = null) => {
      const stats = getQuestionStats(q.id);

      const attempts = stats?.attempts ?? 0;
      const correct = stats?.correct ?? 0;
      const accuracy = attempts > 0 ? correct / attempts : 0;

      const lastSeenAt = stats?.lastSeenAt ?? 0;
      const lastWrongAt = stats?.lastWrongAt ?? null;

      const minsSinceSeen = lastSeenAt ? minutesBetween(now, lastSeenAt) : 1e9;
      const minsSinceWrong = lastWrongAt ? minutesBetween(now, lastWrongAt) : 1e9;

      // 1) Novelty boost: unseen questions should appear
      const novelty = attempts === 0 ? 1.15 : 0.0;

      // 2) Missiness: wrong more often => higher
      const missiness = attempts > 0 ? (1 - accuracy) : 0.35;

      // 3) Spacing: reward not-seen-recently up to 6 hours
      const spacingBoost = clamp(minsSinceSeen / 360, 0, 1.0);

      // 4) Hard anti-repeat (same-session)
      const inSession = sessionSeenIds?.has(q.id) ?? false;

      // 5) Recently seen penalty: block within 20 min, soften until 60 min
      const repeatPenalty =
        minsSinceSeen < 20 ? 0.03 :
        minsSinceSeen < 60 ? 0.35 :
        1.0;

      // 6) Same-day wrong boost: make misses reappear today
      const wrongBoost = (() => {
        if (!lastWrongAt) return 0.0;

        // Do not punish the user immediately after a miss
        if (minsSinceWrong < 20) return 0.0;

        // Shape: increase up to ~2h, then decay after
        const hours = minsSinceWrong / 60;

        // Rise until 2h
        const rise = clamp(hours / 2, 0, 1);

        // Decay from 2h to 12h
        const decay = hours <= 2 ? 1 : Math.exp(-(hours - 2) / 4);

        return 1.2 * rise * decay;
      })();

      // 7) Attempts dampener: avoid getting stuck on one problem forever
      const attemptsDampener = 1 / Math.sqrt(attempts + 1);

      // 8) Domain influence
      const dw = domainWeight(q.domain);

      // Base score
      let score =
        (2.0 * dw) +
        (1.5 * missiness) +
        (1.0 * novelty) +
        (0.8 * spacingBoost) +
        (1.4 * wrongBoost);

      // If already seen this session, only allow it to surface if it was missed and enough time passed
      if (inSession) {
        const allowRevisit = (minsSinceWrong >= 45) && (minsSinceSeen >= 45) && (lastWrongAt != null);
        score *= allowRevisit ? 0.55 : 0.05;
      }

      return score * repeatPenalty * (0.75 + 0.25 * attemptsDampener);
    };

    // Score all questions
    const scored = validQuestions.map(q => ({ q, s: questionScore(q, now, sessionSeenIds) }));
    scored.sort((a, b) => b.s - a.s);

    // Pool -> shuffle -> pick
    const poolSize = Math.min(validQuestions.length, Math.max(count * 4, 50));
    const pool = scored.slice(0, poolSize).map(x => x.q);

    return fisherYatesShuffle(pool).slice(0, count);
  };

  const getAdaptiveStudyPlan = () => {
    const weakDomains = getWeakDomains();
    const strongDomains = getStrongDomains();
    const overallMastery = domainMastery?.overallMastery || 0;
    
    if (weakDomains.length === 0) {
      return {
        focus: 'maintenance',
        recommendation: 'Review all domains to maintain mastery',
        priorityDomains: strongDomains.slice(0, 2),
        timeAllocation: 'Balanced review across all domains',
        nextSteps: ['Practice mixed questions', 'Take simulated test', 'Review explanations']
      };
    }
    
    if (overallMastery < 0.5) {
      return {
        focus: 'foundational',
        recommendation: 'Focus on building basic understanding across all domains',
        priorityDomains: weakDomains.slice(0, 3),
        timeAllocation: '80% weak domains, 20% moderate domains',
        nextSteps: ['Study weak domains intensively', 'Review fundamentals', 'Practice with explanations']
      };
    }
    
    if (overallMastery < 0.7) {
      return {
        focus: 'targeted_improvement',
        recommendation: 'Strengthen weak areas while maintaining progress',
        priorityDomains: weakDomains.slice(0, 2),
        timeAllocation: '60% weak domains, 30% moderate, 10% strong',
        nextSteps: ['Focus on weak domains', 'Practice mixed questions', 'Take progress assessments']
      };
    }
    
    return {
      focus: 'mastery_refinement',
      recommendation: 'Refine understanding and prepare for exam',
      priorityDomains: weakDomains.length > 0 ? weakDomains.slice(0, 1) : strongDomains.slice(0, 2),
      timeAllocation: '30% weak domains, 40% moderate, 30% strong',
      nextSteps: ['Full simulated tests', 'Timed practice', 'Review complex scenarios']
    };
  };

  // Intelligent Daily Study Plan Generator
  const daysUntil = (examDateIso) => {
    const now = new Date();
    const exam = new Date(examDateIso);
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((exam.getTime() - now.getTime()) / msPerDay));
  };

  const getStudyPhase = (D) => {
    if (D <= 7) return "exam_readiness";
    if (D <= 21) return "pressure";
    return "coverage";
  };

  const phaseMix = (phase) => {
    // returns fractions that sum to 1
    if (phase === "exam_readiness") return { weak: 0.35, mixed: 0.45, review: 0.20 };
    if (phase === "pressure") return { weak: 0.45, mixed: 0.35, review: 0.20 };
    return { weak: 0.50, mixed: 0.30, review: 0.20 };
  };

  const allocateWeakDomains = ({ domainMasteryLevels, weakCount, totalDaily }) => {
    // domainMasteryLevels: { [domain]: mastery 0..1 }
    const domains = Object.keys(domainMasteryLevels);

    // weights based on weakness curve
    const weights = domains.map(d => {
      const mastery = domainMasteryLevels[d] ?? 0.5;
      const w = Math.pow(1 - mastery, 1.6);
      return { domain: d, w };
    });

    const sumW = weights.reduce((s, x) => s + x.w, 0) || 1;

    // raw allocation
    let alloc = weights.map(x => ({
      domain: x.domain,
      count: Math.floor((x.w / sumW) * weakCount),
      mastery: domainMasteryLevels[x.domain] ?? 0.5
    }));

    // ensure minimum 1 for very weak domains, if we have capacity
    const veryWeak = alloc
      .filter(a => a.mastery < 0.65)
      .sort((a, b) => a.mastery - b.mastery);

    for (const a of veryWeak) {
      if (alloc.reduce((s, x) => s + x.count, 0) >= weakCount) break;
      if (a.count === 0) a.count = 1;
    }

    // distribute remaining counts by highest weights
    let current = alloc.reduce((s, x) => s + x.count, 0);
    const byNeed = weights.sort((a, b) => b.w - a.w).map(x => x.domain);

    while (current < weakCount) {
      for (const d of byNeed) {
        if (current >= weakCount) break;
        const item = alloc.find(x => x.domain === d);
        item.count += 1;
        current += 1;
      }
    }

    // cap any single domain at 50% of daily total to avoid burnout
    const cap = Math.max(1, Math.floor(totalDaily * 0.5));
    for (const a of alloc) a.count = Math.min(a.count, cap);

    // if capping reduced total, re-add elsewhere
    current = alloc.reduce((s, x) => s + x.count, 0);
    while (current < weakCount) {
      const pick = alloc
        .slice()
        .sort((a, b) => (a.mastery - b.mastery)) // weakest first
        .find(a => a.count < cap);
      if (!pick) break;
      pick.count += 1;
      current += 1;
    }

    return alloc.filter(a => a.count > 0);
  };

  const generateDailyPlan = ({
    examDateIso,
    minutesPerDay = 20,
    paceSecPerQuestion = 120,
    domainMasteryLevels = {},
    dueReviewCount = 0
  }) => {
    const D = daysUntil(examDateIso);
    const phase = getStudyPhase(D);
    const mix = phaseMix(phase);

    const totalDaily = Math.max(5, Math.floor((minutesPerDay * 60) / paceSecPerQuestion)); // minimum viable session
    let targetReview = Math.floor(totalDaily * mix.review);
    let targetWeak = Math.floor(totalDaily * mix.weak);
    let targetMixed = totalDaily - targetReview - targetWeak;

    // do not exceed due items, but allow filling the difference into weak/mixed
    const reviewCount = Math.min(dueReviewCount, targetReview);
    const freed = targetReview - reviewCount;

    // allocate freed slots: favor weak domains in coverage and pressure, favor mixed in exam readiness
    if (freed > 0) {
      if (phase === "exam_readiness") targetMixed += freed;
      else targetWeak += freed;
    }

    const weakDomainAllocation = allocateWeakDomains({
      domainMasteryLevels,
      weakCount: targetWeak,
      totalDaily
    });

    return {
      daysUntilExam: D,
      phase,
      minutesPerDay,
      totalQuestionsToday: totalDaily,
      reviewCount,
      weakCount: targetWeak,
      mixedCount: targetMixed,
      weakDomainAllocation,
      recommendedAlgo: {
        order: [
          { type: "review", count: reviewCount },
          { type: "weak_domains", count: targetWeak },
          { type: "mixed", count: targetMixed }
        ]
      }
    };
  };

  const generateQuickStudyPlan = () => {
    // 10 minutes = 5 questions at 2 min pace
    const totalQuestions = 5;
    const dueReviewCount = getDueQuestions().length;
    
    return {
      type: "quick_study",
      totalQuestions,
      recommendedAlgo: {
        order: [
          { type: "review", count: Math.min(2, dueReviewCount) },
          { type: "weak_domains", count: 2 },
          { type: "mixed", count: 1 }
        ]
      }
    };
  };

  const isCheckpointDay = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    return dayOfWeek === 6; // Saturday checkpoint
  };

  const generateCheckpointPlan = ({ minutesAvailable = 20 }) => {
    const paceSecPerQuestion = 120;
    const totalQuestions = Math.floor((minutesAvailable * 60) / paceSecPerQuestion);
    
    return {
      type: "checkpoint",
      minutesAvailable,
      totalQuestions,
      fullyMixed: true,
      timed: minutesAvailable >= 40,
      recommendedAlgo: {
        order: [
          { type: "mixed", count: totalQuestions }
        ]
      }
    };
  };

  // Question tracking functions
  const updateQuestionSeen = (questionId) => {
    setQuestionStats(prev => {
      const now = Date.now();
      const existing = prev[questionId] || {
        attempts: 0,
        correct: 0,
        lastSeenAt: 0,
        lastWrongAt: null,
      };

      const updated = {
        ...existing,
        lastSeenAt: now,
      };

      const next = { ...prev, [questionId]: updated };
      localStorage.setItem("questionStats", JSON.stringify(next));
      return next;
    });
  };

  // Progress Streaks Functions
  const getLocalDayKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`; // stable local day key
  };

  const addDaysToKey = (dayKey, deltaDays) => {
    const [y, m, d] = dayKey.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + deltaDays);
    return getLocalDayKey(dt);
  };

  const updateProgressStreaks = (questionsAnswered, accuracy) => {
    const todayKey = getLocalDayKey();

    console.log('📊 updateProgressStreaks called:', { questionsAnswered, accuracy, todayKey });

    setProgressStreaks(prev => {
      const lastStudyKey = prev.lastStudyDate; // read from prev, not outer state

      // Update calendar for today
      const newCalendar = { ...(prev.studyCalendar || {}) };
      const prevToday = newCalendar[todayKey] || { questions: 0, correct: 0, accuracy: null };

      // Calculate new total questions and correct answers for today
      const newTotalQuestions = (prevToday.questions || 0) + (questionsAnswered || 0);
      const newCorrectAnswers = (prevToday.correct || 0) + (accuracy ? 1 : 0);
      const newDailyAccuracy = newTotalQuestions > 0 ? (newCorrectAnswers / newTotalQuestions) * 100 : null;

      newCalendar[todayKey] = {
        questions: newTotalQuestions,
        correct: newCorrectAnswers,
        accuracy: newDailyAccuracy,
      };

      console.log('📈 Updated study calendar for today:', {
        before: prevToday,
        after: newCalendar[todayKey],
        newTotalQuestions,
        newCorrectAnswers,
        newDailyAccuracy
      });

      let newCurrentStreak = prev.currentStreak || 0;
      let newBestStreak = prev.bestStreak || 0;

      // Minimum questions required to count as a "study day" for streak
      const MINIMUM_QUESTIONS_FOR_STREAK = 10;
      const todayQualifies = newTotalQuestions >= MINIMUM_QUESTIONS_FOR_STREAK;

      console.log('🔥 Streak calculation:', {
        todayQualifies,
        newTotalQuestions,
        minimumRequired: MINIMUM_QUESTIONS_FOR_STREAK,
        lastStudyKey,
        todayKey,
        previousStreak: newCurrentStreak
      });

      // Only change streak when we are on a new calendar day OR first time qualifying today
      if (!lastStudyKey) {
        // First ever study day
        newCurrentStreak = todayQualifies ? 1 : 0;
      } else if (lastStudyKey === todayKey) {
        // Same day - only set streak if this is the first time qualifying today
        const previouslyQualified = (prevToday.questions || 0) >= MINIMUM_QUESTIONS_FOR_STREAK;
        if (!previouslyQualified && todayQualifies) {
          // Just qualified for streak today
          const yesterdayKey = addDaysToKey(todayKey, -1);
          if (prev.lastStudyDate === yesterdayKey) {
            newCurrentStreak = (prev.currentStreak || 0) + 1;
          } else {
            newCurrentStreak = 1;
          }
        } else if (!todayQualifies) {
          // Lost qualification for today
          newCurrentStreak = 0;
        }
        // If already qualified and still qualified, keep existing streak
      } else {
        // New day - check if yesterday was studied and today qualifies
        const yesterdayKey = addDaysToKey(todayKey, -1);
        if (lastStudyKey === yesterdayKey && todayQualifies) {
          // Consecutive day with qualification
          newCurrentStreak = (prev.currentStreak || 0) + 1;
        } else if (todayQualifies) {
          // Non-consecutive but today qualifies - start new streak
          newCurrentStreak = 1;
        } else {
          // Today doesn't qualify - no streak
          newCurrentStreak = 0;
        }
      }

      newBestStreak = Math.max(newBestStreak, newCurrentStreak);

      console.log('🎯 Final streak result:', {
        newCurrentStreak,
        newBestStreak,
        todayQualifies
      });

      return {
        ...prev,
        currentStreak: newCurrentStreak,
        bestStreak: newBestStreak,
        lastStudyDate: todayKey, // store stable key
        studyCalendar: newCalendar,
      };
    });
  };

  const getWeeklyProgress = () => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
    const studyDays = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekAgo);
      date.setDate(date.getDate() + i);
      const dateKey = getLocalDayKey(date);
      const oldDateStr = date.toDateString(); // backwards compat
      const calendarEntry = progressStreaks.studyCalendar[dateKey] || progressStreaks.studyCalendar[oldDateStr];
      studyDays.push({
        date: dateKey,
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        studied: !!calendarEntry,
        questions: calendarEntry?.questions || 0,
        accuracy: calendarEntry?.accuracy || 0,
      });
    }
    
    return studyDays;
  };

  const getMonthlyProgress = () => {
    const today = new Date();
    const monthAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const studyDays = [];
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(monthAgo);
      date.setDate(date.getDate() + i);
      const dateKey = getLocalDayKey(date);
      const oldDateStr = date.toDateString(); // backwards compat
      const calendarEntry = progressStreaks.studyCalendar[dateKey] || progressStreaks.studyCalendar[oldDateStr];
      studyDays.push({
        date: dateKey,
        studied: !!calendarEntry,
        questions: calendarEntry?.questions || 0,
        accuracy: calendarEntry?.accuracy || 0,
      });
    }
    
    return studyDays;
  };

  const getStreakMessage = () => {
    const { currentStreak, studyCalendar } = progressStreaks;
    const todayKey = getLocalDayKey();
    const todayProgress = studyCalendar?.[todayKey] || { questions: 0, accuracy: null };
    const DAILY_THRESHOLD = 10; // Questions needed to maintain streak
    
    if (currentStreak === 0) {
      if (todayProgress.questions < DAILY_THRESHOLD) {
        const remaining = DAILY_THRESHOLD - todayProgress.questions;
        return `Answer ${remaining} more question${remaining !== 1 ? 's' : ''} to start your streak!`;
      } else {
        return "Streak started! Keep it going!";
      }
    } else if (todayProgress.questions < DAILY_THRESHOLD) {
      const remaining = DAILY_THRESHOLD - todayProgress.questions;
      return `Answer ${remaining} more question${remaining !== 1 ? 's' : ''} to keep your ${currentStreak} day streak!`;
    } else if (currentStreak === 1) {
      return "Great start! Keep the momentum going!";
    } else if (currentStreak < 7) {
      return `${currentStreak} day streak! You're building a great habit!`;
    } else if (currentStreak < 30) {
      return `${currentStreak} day streak! Amazing consistency!`;
    } else {
      return `${currentStreak} day streak! You're a learning machine! 🎉`;
    }
  };

  // Domain-specific practice functions
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [domainFilteredQuestions, setDomainFilteredQuestions] = useState([]);
  const [domainFilterType, setDomainFilterType] = useState('all');

  const startDomainPractice = (domains, filteredQuestions, filterType = 'all') => {
    console.log('🎯 Starting domain-specific practice:', { domains, filterType, questionCount: filteredQuestions.length });
    
    setSelectedDomains(domains);
    setDomainFilteredQuestions(filteredQuestions);
    setDomainFilterType(filterType);
    
    // Save domain practice state to localStorage for persistence
    localStorage.setItem('cmmc_selected_domains', JSON.stringify(domains));
    localStorage.setItem('cmmc_domain_filtered_questions', JSON.stringify(filteredQuestions.map(q => q.id)));
    localStorage.setItem('cmmc_domain_filter_type', filterType);
    
    // Set mode to practice with domain filtering
    setMode('domainPractice');
  };

  const clearDomainPractice = () => {
    setSelectedDomains([]);
    setDomainFilteredQuestions([]);
    setDomainFilterType('all');
    localStorage.removeItem('cmmc_selected_domains');
    localStorage.removeItem('cmmc_domain_filtered_questions');
    localStorage.removeItem('cmmc_domain_filter_type');
  };

  // Load domain practice state on mount
  useEffect(() => {
    const savedDomains = localStorage.getItem('cmmc_selected_domains');
    const savedQuestions = localStorage.getItem('cmmc_domain_filtered_questions');
    const savedFilterType = localStorage.getItem('cmmc_domain_filter_type');
    
    if (savedDomains && savedQuestions) {
      try {
        const domains = JSON.parse(savedDomains);
        const questionIds = JSON.parse(savedQuestions);
        const filterType = savedFilterType || 'all';
        const filteredQuestions = questions?.filter(q => questionIds.includes(q.id)) || [];
        
        setSelectedDomains(domains);
        setDomainFilteredQuestions(filteredQuestions);
        setDomainFilterType(filterType);
      } catch (error) {
        console.error('Error loading domain practice state:', error);
        clearDomainPractice();
      }
    }
  }, [questions]);

  // Enhanced domain-specific missed questions tracking
  const addToMissedByDomain = (question, domain) => {
    addToMissed(question);
    
    // Track domain-specific missed questions
    const domainMissedKey = `cmmc_${questionBankId}_missed_by_domain_${domain}`;
    const existingDomainMissed = JSON.parse(localStorage.getItem(domainMissedKey) || '[]');
    
    if (!existingDomainMissed.includes(question.id)) {
      existingDomainMissed.push(question.id);
      localStorage.setItem(domainMissedKey, JSON.stringify(existingDomainMissed));
    }
  };

  const getDomainMissedQuestions = (domain) => {
    const domainMissedKey = `cmmc_${questionBankId}_missed_by_domain_${domain}`;
    return JSON.parse(localStorage.getItem(domainMissedKey) || '[]');
  };

  const clearDomainMissedQuestions = (domain) => {
    const domainMissedKey = `cmmc_${questionBankId}_missed_by_domain_${domain}`;
    localStorage.removeItem(domainMissedKey);
  };

  const getStudyProgress = () => {
    const progress = studyPlan.questionsCompleted / studyPlan.totalQuestionsNeeded;
    return Math.min(100, Math.round(progress * 100));
  };

  const getDailyProgress = () => {
    const progress = studyPlan.completedToday / studyPlan.dailyGoal;
    return Math.min(100, Math.round(progress * 100));
  };

  const value = {
    questionBankId,
    setQuestionBankId,
    mode,
    setMode: setModeWithPersistence,
    resetToDashboard,
    initializeFromURL,
    darkMode,
    setDarkMode,
    autoDarkMode,
    setAutoDarkMode,
    textSize,
    setTextSize,
    missedQuestions,
    missedQueue,
    missedMeta,
    setMissedQueue,
    setMissedMeta,
    addToMissed,
    clearMissed,
    removeFromMissed,
    markedQuestions,
    markQuestion,
    markExamSimQuestion,
    examSimMarkedQuestions,
    simulatedAnswers,
    setSimulatedAnswers,
    simulatedTimeRemaining,
    setSimulatedTimeRemaining,
    simulatedTimerActive,
    setSimulatedTimerActive,
    testCompleted,
    completeTest,
    startSimulatedTest,
    resetSimulatedTest,
    resetProgress,
    simulatedIndex,
    setSimulatedIndex,
    simulatedOrder,
    setSimulatedOrder,
    practiceIndex,
    setPracticeIndex,
    practiceAnswers,
    setPracticeAnswers,
    dailyDrillIndex,
    setDailyDrillIndex,
    dailyDrillOrder,
    setDailyDrillOrder,
    dailyDrillAnswers,
    setDailyDrillAnswers,
    rapidIndex,
    setRapidIndex,
    testHistory,
    saveTestResult,
    clearTestHistory,
    scoreStats,
    updateScoreStats,
    getAccuracy,
    getWeeklyAccuracy,
    getReadinessScore,
    studyPlan,
    setTestDate,
    updateDailyProgress,
    adjustDailyGoal,
    setDailyGoal,
    setTargetQuestionsPerDay,
    getStudyProgress,
    getDailyProgress,
    spacedRepetition,
    addToSpacedRepetition,
    updateSpacedRepetition,
    getDueQuestions,
    adaptiveDifficulty,
    updateAdaptiveDifficulty,
    getDifficultyForQuestion,
    getQuestionsForDifficulty,
    progressStreaks,
    updateProgressStreaks,
    getWeeklyProgress,
    getMonthlyProgress,
    getStreakMessage,
    // Domain-specific practice functions
    selectedDomains,
    domainFilteredQuestions,
    domainFilterType,
    startDomainPractice,
    clearDomainPractice,
    addToMissedByDomain,
    getDomainMissedQuestions,
    clearDomainMissedQuestions,
    initializeDomainMastery,
    domainMastery,
    updateDomainMastery,
    getDomainMasteryLevel,
    getWeakDomains,
    getStrongDomains,
    getMasteryColor,
    getMasteryLabel,
    getQuestionStats,
    updateQuestionStats,
    updateQuestionSeen,
    recordAttempt,
    getQuestionBankName,
    getQuestionBankTotal,
    practiceSession,
    createPracticeSession,
    recordAnswerToSession,
    pausePracticeSession,
    endPracticeSession,
    loadActivePracticeSession,
    sessionAnsweredCount,
    qualifiesForStreak,
    getPrioritizedQuestions,
    getAdaptiveStudyPlan,
    generateDailyPlan,
    generateQuickStudyPlan,
    isCheckpointDay,
    generateCheckpointPlan,
    daysUntil,
    getStudyPhase,
    // Sync functionality
    isSyncing,
    lastSyncTime,
    syncDataFromCloud,
    syncDataToCloud,
    debugSync,
    // Backup functionality
    isBackupEnabled,
    backupInterval,
    lastBackupTime,
    createBackup,
    restoreBackup,
    startAutoBackup,
    stopAutoBackup,
    updateBackupSettings,
    // Auth functionality for error handling
    loginWithRedirect,
    // Feature flags system
    featureFlags,
    isFeatureEnabled,
    setFeatureFlag,
  };

  return (
    <TestModeContext.Provider value={value}>
      {children}
    </TestModeContext.Provider>
  );
};
