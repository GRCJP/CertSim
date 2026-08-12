import { useEffect, useMemo, useState, useRef } from 'react';
import { useTestMode } from '../contexts/TestModeContext';
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, Trophy, Star, Zap, AlertCircle, RefreshCw, Settings } from 'lucide-react';
import { isKindleDevice } from '../utils/deviceDetection';

// DEFAULT_DRILL_SIZE is now dynamic based on exam deadline - see getDynamicDrillLimits()

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = a[i];
    a[i] = a[j];
    a[j] = temp;
  }
  return a;
};

const pickRandomIds = (ids, count) => shuffle(ids).slice(0, count);

// Shuffle answer choices for better memorization
const shuffleChoices = (choices) => {
  if (!choices || !Array.isArray(choices)) return [];
  
  // Create array with choices and their original positions for consistent letter mapping
  const shuffled = shuffle(choices.map((choice, originalIndex) => ({ ...choice, originalIndex })));
  
  return shuffled;
};

const DailyDrills = ({ questions }) => {
  // Error boundary state
  const [hasError, setHasError] = useState(false);
  
  // Catch any errors during component initialization
  useEffect(() => {
    const handleError = (event) => {
      console.error('🚨 DailyDrills Error:', event.error);
      setHasError(true);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Show error fallback if something goes wrong
  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-xl p-8 max-w-md shadow-lg">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Something went wrong
          </h2>
          <p className="mb-6 text-gray-600">
            The app encountered an error. Please clear your browser cache and refresh the page.
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Clear Cache & Refresh
          </button>
        </div>
      </div>
    );
  }

  const {
    textSize,
    darkMode,
    dailyDrillIndex,
    setDailyDrillIndex,
    dailyDrillOrder,
    setDailyDrillOrder,
    dailyDrillAnswers,
    setDailyDrillAnswers,
    recordAttempt,
    getAccuracy,
    updateProgressStreaks,
    updateScoreStats,
    scoreStats,
    setMode,
    qualifiesForStreak,
    getQuestionStats,
    generateDailyPlan,
    updateDailyProgress,
    studyPlan,
    progressStreaks,
    getAdaptiveStudyPlan,
    getQuestionBankName,
    getQuestionBankTotal,
    getDomainMasteryLevel,
    getMasteryColor,
    getMasteryLabel,
    recordAnswerToSession,
    pausePracticeSession,
    endPracticeSession,
    loadActivePracticeSession,
    sessionAnsweredCount,
    updateQuestionSeen,
    questionBankId,
    practiceSession,
    missedQuestions,
  } = useTestMode();

  const sessionSeenRef = useRef(new Set());

  const [showCelebration, setShowCelebration] = useState(false);
  const [confettiPositions, setConfettiPositions] = useState([]);
  const [hasContinuedPractice, setHasContinuedPractice] = useState(false);
  
  // Milestone popup state
  const [showMilestonePopup, setShowMilestonePopup] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState(null);
  
  // Enhanced checkpoint system state
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [interruptedSession, setInterruptedSession] = useState(null);
  
  // Timer state for 10-minute daily goal
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  
  // Settings overlay state
  const [showSettings, setShowSettings] = useState(false);
  const [isKindle, setIsKindle] = useState(false);
  
  // Detect Kindle device for fallback behavior
  useEffect(() => {
    setIsKindle(isKindleDevice());
  }, []);
  
  // Daily goal: 10 minutes = 600 seconds
  const DAILY_GOAL_TIME = 600; // 10 minutes in seconds
  
  // Enhanced checkpoint system for progress saving
  const saveCheckpoint = (reason = 'auto') => {
    const sessionData = {
      dailyDrillOrder,
      dailyDrillIndex,
      dailyDrillAnswers,
      scoreStats,
      progressStreaks,
      missedQuestions,
      timestamp: Date.now(),
      version: '1.0'
    };
    localStorage.setItem('cmmcDrillCheckpoint', JSON.stringify(sessionData));
    console.log(`💾 Checkpoint saved (${reason}):`, {
      questionsCompleted: dailyDrillAnswers.length,
      currentIndex: dailyDrillIndex,
      totalQuestions: dailyDrillOrder.length
    });
  };

  // Create backup before major operations
  const createBackup = () => {
    const backup = {
      dailyDrillOrder,
      dailyDrillIndex,
      dailyDrillAnswers,
      scoreStats,
      progressStreaks,
      missedQuestions,
      timestamp: Date.now(),
      version: '1.0'
    };
    localStorage.setItem('cmmcProgressBackup', JSON.stringify(backup));
    console.log('🗂️ Progress backup created');
  };

  // Check for interrupted session on component mount
  const checkForInterruptedSession = () => {
    const checkpoint = localStorage.getItem('cmmcDrillCheckpoint');
    if (checkpoint) {
      try {
        const data = JSON.parse(checkpoint);
        const timeSinceLastSave = Date.now() - data.timestamp;
        
        // If less than 24 hours, offer to resume
        if (timeSinceLastSave < 24 * 60 * 60 * 1000) {
          const hoursAgo = Math.floor(timeSinceLastSave / (60 * 60 * 1000));
          const minutesAgo = Math.floor((timeSinceLastSave % (60 * 60 * 1000)) / (60 * 1000));
          
          return {
            canResume: true,
            message: `Resume session from ${hoursAgo > 0 ? `${hoursAgo}h ${minutesAgo}m` : `${minutesAgo}m`} ago?`,
            sessionData: data
          };
        }
      } catch (error) {
        console.error('Error reading checkpoint:', error);
      }
    }
    return { canResume: false };
  };

  // Resume interrupted session
  const resumeSession = (sessionData) => {
    console.log('🔄 Resuming interrupted session:', sessionData);
    
    if (sessionData.dailyDrillOrder) {
      setDailyDrillOrder(sessionData.dailyDrillOrder);
      setDailyDrillIndex(sessionData.dailyDrillIndex || 0);
      setDailyDrillAnswers(sessionData.dailyDrillAnswers || []);
    }
    
    // Clear checkpoint after successful resume
    localStorage.removeItem('cmmcDrillCheckpoint');
  };

  // Reset practice session
  const resetPractice = () => {
    setDailyDrillOrder([]);
    setDailyDrillIndex(0);
    setDailyDrillAnswers([]);
    setShowCelebration(false);
    setConfettiPositions([]);
    setHasContinuedPractice(false);
    sessionSeenRef.current = new Set(); // Reset session tracking
    // Clear saved session from localStorage
    localStorage.removeItem('cmmcDailyDrillSession');
    
    // Use coverage-guaranteed algorithm for fresh session
    console.log(`🎯 Resetting session with coverage guarantee: need ${MINIMUM_QUESTIONS} questions`);
    
    // Get all question statistics
    const allQuestionStats = questions.map(q => {
      const stats = getQuestionStats ? getQuestionStats(q.id) : null;
      const attempts = stats?.attempts || 0;
      const isSeen = attempts > 0;
      const correct = stats?.correct || 0;
      const isMissed = isSeen && attempts > 0 && (correct / attempts) < 1;
      const lastWrongAt = stats?.lastWrongAt || 0;
      
      return { ...q, isSeen, isMissed, lastWrongAt, attempts };
    });
    
    // Separate by status
    const unseenQuestions = allQuestionStats.filter(q => !q.isSeen);
    const seenMissedQuestions = allQuestionStats.filter(q => q.isMissed);
    const seenCorrectQuestions = allQuestionStats.filter(q => q.isSeen && !q.isMissed);
    
    console.log(`📊 Overall status: ${unseenQuestions.length} unseen, ${seenMissedQuestions.length} missed, ${seenCorrectQuestions.length} correct`);
    
    // Priority-based selection
    let selectedQuestions = [];
    let remainingSlots = MINIMUM_QUESTIONS;
    let unseenToTake = 0;
    let missedToTake = 0;
    let correctToTake = 0;
    
    // Priority 1: Unseen questions (ensure coverage)
    unseenToTake = Math.min(unseenQuestions.length, remainingSlots);
    if (unseenToTake > 0) {
      const shuffledUnseen = shuffle(unseenQuestions);
      selectedQuestions.push(...shuffledUnseen.slice(0, unseenToTake));
      remainingSlots -= unseenToTake;
      console.log(`📝 Reset: Selected ${unseenToTake} unseen questions for coverage`);
    }
    
    // Priority 2: Missed questions (improvement)
    if (remainingSlots > 0 && seenMissedQuestions.length > 0) {
      const sortedMissed = seenMissedQuestions.sort((a, b) => b.lastWrongAt - a.lastWrongAt);
      missedToTake = Math.min(seenMissedQuestions.length, remainingSlots);
      selectedQuestions.push(...sortedMissed.slice(0, missedToTake));
      remainingSlots -= missedToTake;
      console.log(`📝 Reset: Added ${missedToTake} missed questions for improvement`);
    }
    
    // Priority 3: Seen correct questions (fill remaining)
    if (remainingSlots > 0 && seenCorrectQuestions.length > 0) {
      const shuffledCorrect = shuffle(seenCorrectQuestions);
      correctToTake = Math.min(seenCorrectQuestions.length, remainingSlots);
      selectedQuestions.push(...shuffledCorrect.slice(0, correctToTake));
      remainingSlots -= correctToTake;
      console.log(`📝 Reset: Added ${correctToTake} correct questions to fill session`);
    }
    
    // Final shuffle and set
    const finalQuestions = shuffle(selectedQuestions);
    const initialOrder = finalQuestions.map((q) => q.id);
    
    console.log(`🎯 Reset complete: ${unseenToTake} unseen + ${missedToTake} missed + ${correctToTake} correct = ${finalQuestions.length} total`);
    
    // Overall coverage progress
    const totalSeen = questions.length - unseenQuestions.length;
    const coveragePercentage = Math.round((totalSeen / questions.length) * 100);
    console.log(`📈 Overall coverage: ${totalSeen}/${questions.length} questions seen (${coveragePercentage}%)`);
    
    setDailyDrillOrder(initialOrder);
  };

  // Continue practice with more questions
  const continuePractice = () => {
    setShowCelebration(false);
    setConfettiPositions([]);
    setHasContinuedPractice(true);
    
    // Get all available questions that haven't been used in this session
    const allQuestionIds = questions.map(q => q.id);
    const usedIds = new Set(dailyDrillOrder);
    const availableIds = allQuestionIds.filter(id => !usedIds.has(id));
    
    if (availableIds.length === 0) {
      console.log('📝 No more questions available');
      return;
    }
    
    // Get question statistics for smart selection
    const availableQuestions = availableIds.map(id => questions.find(q => q.id === id)).filter(Boolean);
    const availableQuestionStats = availableQuestions.map(q => {
      const stats = getQuestionStats ? (getQuestionStats(q.id) || null) : null;
      const attempts = stats?.attempts || 0;
      const isSeen = attempts > 0;
      const isMissed = (stats?.missed || 0) > 0;
      const lastWrongAt = stats?.lastWrongAt || 0;
      
      return { ...q, isSeen, isMissed, lastWrongAt, attempts };
    });
    
    // Separate by status
    const unseenQuestions = availableQuestionStats.filter(q => !q.isSeen);
    const seenMissedQuestions = availableQuestionStats.filter(q => q.isMissed);
    const seenCorrectQuestions = availableQuestionStats.filter(q => q.isSeen && !q.isMissed);
    
    console.log(`📊 Available status: ${unseenQuestions.length} unseen, ${seenMissedQuestions.length} missed, ${seenCorrectQuestions.length} correct`);
    
    // Priority-based selection
    let selectedQuestions = [];
    let remainingSlots = 5; // Add 5 more questions
    let unseenToTake = 0;
    let missedToTake = 0;
    let correctToTake = 0;
    
    // Priority 1: Unseen questions
    unseenToTake = Math.min(unseenQuestions.length, remainingSlots);
    if (unseenToTake > 0) {
      const shuffledUnseen = shuffle(unseenQuestions);
      selectedQuestions.push(...shuffledUnseen.slice(0, unseenToTake));
      remainingSlots -= unseenToTake;
      console.log(`📝 Added ${unseenToTake} unseen questions for coverage`);
    }
    
    // Priority 2: Missed questions
    if (remainingSlots > 0 && seenMissedQuestions.length > 0) {
      const sortedMissed = seenMissedQuestions.sort((a, b) => b.lastWrongAt - a.lastWrongAt);
      missedToTake = Math.min(seenMissedQuestions.length, remainingSlots);
      selectedQuestions.push(...sortedMissed.slice(0, missedToTake));
      remainingSlots -= missedToTake;
      console.log(`📝 Added ${missedToTake} missed questions for improvement`);
    }
    
    // Priority 3: Seen correct questions
    if (remainingSlots > 0 && seenCorrectQuestions.length > 0) {
      const shuffledCorrect = shuffle(seenCorrectQuestions);
      correctToTake = Math.min(seenCorrectQuestions.length, remainingSlots);
      selectedQuestions.push(...shuffledCorrect.slice(0, correctToTake));
      remainingSlots -= correctToTake;
      console.log(`📝 Added ${correctToTake} correct questions to fill session`);
    }
    
    // Add to session
    const newQuestionIds = selectedQuestions.map(q => q.id);
    
    console.log(`📝 Got ${selectedQuestions.length} additional questions (${unseenToTake} unseen, ${missedToTake} missed, ${correctToTake} correct)`);
    
    // Filter out any duplicates that might have slipped through
    const existing = new Set(dailyDrillOrder);
    const filteredNewIds = newQuestionIds.filter(id => !existing.has(id));
    
    // Combine existing and new questions
    const expandedOrder = [...dailyDrillOrder, ...filteredNewIds];
    setDailyDrillOrder(expandedOrder);
    
    console.log(`📈 Total questions after expansion: ${expandedOrder.length}`);
  };

  // Dynamic daily drill limits based on exam deadline and test size
  const getDynamicDrillLimits = () => {
    const totalQuestionsInTest = getQuestionBankTotal();
    const daysUntilExam = studyPlan?.testDate ? 
      Math.ceil((new Date(studyPlan.testDate) - new Date()) / (1000 * 60 * 60 * 24)) : 
      30; // Default to 30 days if no test date set
    
    // Calculate minimum questions needed per day to complete all questions before exam
    const minimumQuestionsPerDay = daysUntilExam > 0 ? 
      Math.ceil(totalQuestionsInTest / daysUntilExam) : 
      totalQuestionsInTest; // If exam is today or past, need all questions
    
    // Ensure minimum is at least 5 and not more than the total test
    const minQuestions = Math.max(5, Math.min(minimumQuestionsPerDay, totalQuestionsInTest));
    
    // Maximum should be the full test size
    const maxQuestions = totalQuestionsInTest;
    
    console.log(`📊 Dynamic drill limits: min=${minQuestions}, max=${maxQuestions}, daysUntil=${daysUntilExam}, testSize=${totalQuestionsInTest}`);
    
    return { minQuestions, maxQuestions };
  };
  
  const { minQuestions: MINIMUM_QUESTIONS, maxQuestions: MAXIMUM_QUESTIONS } = getDynamicDrillLimits();
  
  // Timer effect to track time spent
  useEffect(() => {
    let interval;
    if (isTimerActive && sessionStartTime) {
      interval = setInterval(() => {
        setTotalTimeSpent(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, sessionStartTime]);
  
  // Start timer when user begins practice
  useEffect(() => {
    if (!sessionStartTime && dailyDrillOrder.length > 0) {
      setSessionStartTime(Date.now());
      setIsTimerActive(true);
    }
  }, [dailyDrillOrder.length, sessionStartTime]);
  
  // Format time display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Save session state to localStorage
  useEffect(() => {
    const sessionData = {
      dailyDrillOrder,
      dailyDrillAnswers,
      dailyDrillIndex,
      hasContinuedPractice,
      sessionStartTime,
      totalTimeSpent,
    };
    localStorage.setItem('cmmcDailyDrillSession', JSON.stringify(sessionData));
  }, [dailyDrillOrder, dailyDrillAnswers, dailyDrillIndex, hasContinuedPractice]);

  const questionsById = useMemo(() => {
    const map = new Map();
    if (Array.isArray(questions)) {
      questions.forEach((q) => map.set(q.id, q));
    }
    return map;
  }, [questions]);

  const orderedQuestions = useMemo(() => {
    if (!Array.isArray(dailyDrillOrder) || dailyDrillOrder.length === 0) return [];
    return dailyDrillOrder.map((id) => questionsById.get(id)).filter(Boolean);
  }, [dailyDrillOrder, questionsById]);

  const totalQuestions = orderedQuestions.length;
  const safeIndex = Math.min(Math.max(dailyDrillIndex, 0), Math.max(totalQuestions - 1, 0));
  const currentQuestion = orderedQuestions[safeIndex];
  const currentAnswer = dailyDrillAnswers[safeIndex] ?? {
    selectedChoiceId: null,
    isCorrect: null,
  };
  
  // Memoize shuffled choices to prevent re-shuffling on every render
  const shuffledChoices = useMemo(() => {
    if (!currentQuestion?.choices) return [];
    return shuffleChoices(currentQuestion.choices);
  }, [currentQuestion?.id]); // Only re-shuffle when question changes

  const allQuestionIds = useMemo(() => {
    if (!Array.isArray(questions)) return [];
    return questions.map((q) => q.id);
  }, [questions]);

  const existingIds = useMemo(() => new Set(dailyDrillOrder || []), [dailyDrillOrder]);
  const remainingCount = Math.max(0, allQuestionIds.length - existingIds.size);

  useEffect(() => {
    if (!Array.isArray(questions) || questions.length === 0) return;

    const idsInBank = new Set(questions.map((q) => q.id));
    const hasOrder = Array.isArray(dailyDrillOrder) && dailyDrillOrder.length > 0;
    const orderValid = hasOrder && dailyDrillOrder.every((id) => idsInBank.has(id));

    if (!orderValid) {
      // Coverage-guaranteed algorithm: Unseen questions first, then missed questions
      console.log(`🎯 Starting new session: need ${MINIMUM_QUESTIONS} questions, available: ${questions.length}`);
      
      // Get all question statistics to identify unseen vs seen questions
      const allQuestionStats = questions.map(q => {
        const stats = getQuestionStats ? getQuestionStats(q.id) : null;
        const attempts = stats?.attempts || 0;
        const isSeen = attempts > 0;
        const correct = stats?.correct || 0;
        const isMissed = isSeen && attempts > 0 && (correct / attempts) < 1;
        const lastWrongAt = stats?.lastWrongAt || 0;
        return { ...q, isSeen, isMissed, lastWrongAt, attempts };
      });
      
      // Separate questions by status
      const unseenQuestions = allQuestionStats.filter(q => !q.isSeen);
      const seenMissedQuestions = allQuestionStats.filter(q => q.isMissed);
      const seenCorrectQuestions = allQuestionStats.filter(q => q.isSeen && !q.isMissed);
      
      console.log(`📊 Question status: ${unseenQuestions.length} unseen, ${seenMissedQuestions.length} missed, ${seenCorrectQuestions.length} correct`);
      
      // Priority-based selection
      let selectedQuestions = [];
      let remainingSlots = MINIMUM_QUESTIONS;
      let unseenToTake = 0;
      let missedToTake = 0;
      let correctToTake = 0;
      
      // First, take all unseen questions (or as many as needed)
      unseenToTake = Math.min(unseenQuestions.length, remainingSlots);
      if (unseenToTake > 0) {
        const shuffledUnseen = shuffle(unseenQuestions);
        selectedQuestions.push(...shuffledUnseen.slice(0, unseenToTake));
        remainingSlots -= unseenToTake;
        console.log(`📝 Selected ${unseenToTake} unseen questions for coverage`);
      }
      
      // Second, add missed questions if we still have slots
      if (remainingSlots > 0 && seenMissedQuestions.length > 0) {
        // Sort missed by most recent wrong answers
        const sortedMissed = seenMissedQuestions.sort((a, b) => b.lastWrongAt - a.lastWrongAt);
        missedToTake = Math.min(seenMissedQuestions.length, remainingSlots);
        selectedQuestions.push(...sortedMissed.slice(0, missedToTake));
        remainingSlots -= missedToTake;
        console.log(`📝 Added ${missedToTake} missed questions for improvement`);
      }
      
      // Third, fill remaining with random seen correct questions (if needed)
      if (remainingSlots > 0 && seenCorrectQuestions.length > 0) {
        const shuffledCorrect = shuffle(seenCorrectQuestions);
        correctToTake = Math.min(seenCorrectQuestions.length, remainingSlots);
        selectedQuestions.push(...shuffledCorrect.slice(0, correctToTake));
        remainingSlots -= correctToTake;
        console.log(`📝 Added ${correctToTake} correct questions to fill session`);
      }
      
      // Final shuffle to mix everything up
      const finalQuestions = shuffle(selectedQuestions);
      const initialOrder = finalQuestions.map((q) => q.id);
      
      console.log(`🎯 Final selection: ${unseenToTake} unseen + ${missedToTake} missed + ${correctToTake} correct = ${finalQuestions.length} total`);
      
      // Coverage progress tracking
      const totalSeen = questions.length - unseenQuestions.length;
      const coveragePercentage = Math.round((totalSeen / questions.length) * 100);
      console.log(`📈 Coverage progress: ${totalSeen}/${questions.length} questions seen (${coveragePercentage}%)`);
      
      setDailyDrillOrder(initialOrder);
      setDailyDrillIndex(0);
      setDailyDrillAnswers([]);
    }
  }, [dailyDrillOrder, questions, setDailyDrillAnswers, setDailyDrillIndex, setDailyDrillOrder]);

  // Track when questions are displayed for same-day retry logic
  useEffect(() => {
    const qid = currentQuestion?.id;
    if (!qid) return;

    if (!sessionSeenRef.current.has(qid)) {
      updateQuestionSeen(qid);
      sessionSeenRef.current.add(qid);
    }
  }, [currentQuestion?.id, updateQuestionSeen]);

  // Get adaptive study plan for recommendations
  const adaptiveStudyPlan = getAdaptiveStudyPlan();
  
  // Analyze domain performance in current session
  const sessionDomainPerformance = useMemo(() => {
    const domainStats = {};
    
    orderedQuestions.forEach((q, idx) => {
      const answer = dailyDrillAnswers[idx];
      if (!answer || !q.domain) return;
      
      if (!domainStats[q.domain]) {
        domainStats[q.domain] = { attempted: 0, correct: 0, incorrect: 0 };
      }
      
      domainStats[q.domain].attempted++;
      if (answer.isCorrect) {
        domainStats[q.domain].correct++;
      } else {
        domainStats[q.domain].incorrect++;
      }
    });
    
    return Object.entries(domainStats).map(([domain, stats]) => ({
      domain,
      ...stats,
      accuracy: stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0,
    })).sort((a, b) => a.accuracy - b.accuracy);
  }, [orderedQuestions, dailyDrillAnswers]);
  
  const summary = useMemo(() => {
    const attempted = dailyDrillAnswers.filter(Boolean).length;
    const correct = dailyDrillAnswers.filter((a) => a?.isCorrect).length;
    return { attempted, correct };
  }, [dailyDrillAnswers]);

  // Detect weak domains (< 70% accuracy with at least 3 attempts)
  const weakDomains = sessionDomainPerformance.filter(d => d.accuracy < 70 && d.attempted >= 3);
  const shouldRecommendFocusedSession = weakDomains.length > 0 && summary.attempted >= MINIMUM_QUESTIONS;

  // Get daily goal status (bank-specific) - now time-based
  const getDailyGoalStatus = () => {
    const today = new Date().toDateString();
    const bankKey = `cmmcDailyGoals_${questionBankId}`;
    const dailyGoals = JSON.parse(localStorage.getItem(bankKey) || '{}');
    return dailyGoals[today] || null;
  };

  const dailyGoalStatus = getDailyGoalStatus();
  
  // Time-based daily progress (shows time, but goal can be met by time OR questions)
  const dailyProgress = Math.min(100, Math.round((totalTimeSpent / DAILY_GOAL_TIME) * 100));
  
  // Calculate questions progress toward dynamic minimum
  const questionsProgress = Math.min(100, Math.round((summary.attempted / MINIMUM_QUESTIONS) * 100));
  
  // Get days until exam for display
  const daysUntilExam = studyPlan?.testDate ? 
    Math.ceil((new Date(studyPlan.testDate) - new Date()) / (1000 * 60 * 60 * 24)) : 
    null;

  // Milestone motivation system
  const getMilestoneMessage = (progress) => {
    const today = new Date().toDateString();
    const bankKey = `cmmcMilestones_${questionBankId}_${today}`;
    const shownMilestones = JSON.parse(localStorage.getItem(bankKey) || '{}');
    
    if (progress >= 30 && progress < 31 && !shownMilestones['30']) {
      return {
        show: true,
        message: "🔥 Great start! You're 30% there! Keep this momentum going!",
        color: "orange",
        milestone: '30',
        title: "30% Milestone Reached!"
      };
    } else if (progress >= 60 && progress < 61 && !shownMilestones['60']) {
      return {
        show: true,
        message: "💪 Excellent work! You're past the halfway point at 60%!",
        color: "blue",
        milestone: '60',
        title: "60% Milestone - Halfway There!"
      };
    } else if (progress >= 90 && progress < 91 && !shownMilestones['90']) {
      return {
        show: true,
        message: "🎯 Almost there! 90% complete - final push to victory!",
        color: "purple",
        milestone: '90',
        title: "90% Milestone - Almost Done!"
      };
    }
    return { show: false };
  };

  const milestone = getMilestoneMessage(questionsProgress);

  // Trigger milestone popup
  useEffect(() => {
    if (milestone.show && milestone.milestone && !showMilestonePopup) {
      setCurrentMilestone(milestone);
      setShowMilestonePopup(true);
      
      // Mark milestone as shown
      const today = new Date().toDateString();
      const bankKey = `cmmcMilestones_${questionBankId}_${today}`;
      const shownMilestones = JSON.parse(localStorage.getItem(bankKey) || '{}');
      shownMilestones[milestone.milestone] = true;
      localStorage.setItem(bankKey, JSON.stringify(shownMilestones));
    }
  }, [milestone.show, milestone.milestone, questionBankId, showMilestonePopup]);

  // Check daily goal completion when time spent changes OR minimum questions met
  useEffect(() => {
    const today = new Date().toDateString();
    const bankKey = `cmmcDailyGoals_${questionBankId}`;
    const dailyGoals = JSON.parse(localStorage.getItem(bankKey) || '{}');
    
    const meetsDailyGoal = totalTimeSpent >= DAILY_GOAL_TIME || summary.attempted >= MINIMUM_QUESTIONS;
    
    if (meetsDailyGoal && !dailyGoals[today]) {
      // Mark today's goal as completed
      dailyGoals[today] = {
        completed: true,
        timeSpent: totalTimeSpent,
        questionsAttempted: summary.attempted,
        questionsCorrect: summary.correct,
        accuracy: summary.attempted > 0 ? Math.round((summary.correct / summary.attempted) * 100) : 0,
        timestamp: new Date().toISOString(),
        dynamicMinimum: MINIMUM_QUESTIONS, // Track what the minimum was when completed
      };
      localStorage.setItem(bankKey, JSON.stringify(dailyGoals));
      
      // Update progress streaks
      const accuracy = summary.attempted > 0 ? Math.round((summary.correct / summary.attempted) * 100) : 0;
      updateProgressStreaks(summary.attempted, accuracy);
    }
  }, [totalTimeSpent, summary, updateProgressStreaks, MINIMUM_QUESTIONS]);

  // Check if minimum requirements are met for completion
  const canCompleteSession = (summary.attempted >= MINIMUM_QUESTIONS && summary.attempted <= MAXIMUM_QUESTIONS) || 
                            (totalTimeSpent >= DAILY_GOAL_TIME) ||
                            (summary.attempted >= MAXIMUM_QUESTIONS);

  // Check if all questions have been attempted
  const isCompleted = summary.attempted >= dailyDrillOrder.length && dailyDrillOrder.length > 0 && !hasContinuedPractice && canCompleteSession;

  // Check for interrupted session on component mount
  useEffect(() => {
    const resumeCheck = checkForInterruptedSession();
    if (resumeCheck.canResume) {
      setInterruptedSession(resumeCheck);
      setShowResumePrompt(true);
    }
  }, []);

  // Auto-save checkpoint every 5 questions or at milestones
  useEffect(() => {
    if (dailyDrillAnswers.length > 0 && dailyDrillAnswers.length % 5 === 0) {
      saveCheckpoint('auto-milestone');
    }
  }, [dailyDrillAnswers.length]);

  // Save checkpoint when answering a question
  useEffect(() => {
    if (currentAnswer.isCorrect !== null && currentQuestion) {
      saveCheckpoint('question-answered');
    }
  }, [currentAnswer.isCorrect, currentQuestion]);

  // Create backup before major operations
  const handleContinuePractice = () => {
    createBackup();
    continuePractice();
  };

  const handleResetPractice = () => {
    createBackup();
    resetPractice();
  };
  const completeSession = () => {
    // Show celebration for any completion
    setShowCelebration(true);
    
    // Update score stats when session is completed
    updateScoreStats(summary.correct, summary.attempted);
    updateDailyProgress(summary.attempted);
    
    // Update progress streaks
    const accuracy = summary.attempted > 0 ? Math.round((summary.correct / summary.attempted) * 100) : 0;
    updateProgressStreaks(summary.attempted, accuracy);
    
    // Clear any session checkpoint since we're completing
    localStorage.removeItem('cmmcDrillCheckpoint');
  };
  
  // Start focused session on specific domain
  const startFocusedSession = (targetDomain) => {
    const domainQuestions = questions && Array.isArray(questions) ? questions.filter(q => q.domain === targetDomain) : [];
    const usedQuestionIds = new Set(dailyDrillOrder);
    const availableDomainQuestions = domainQuestions.filter(q => !usedQuestionIds.has(q.id));
    
    if (availableDomainQuestions.length === 0) {
      // If no new questions, use all domain questions
      const focusedOrder = domainQuestions.slice(0, MINIMUM_QUESTIONS).map(q => q.id);
      setDailyDrillOrder(focusedOrder);
    } else {
      // Prioritize questions from this domain
      const focusedOrder = availableDomainQuestions.slice(0, MINIMUM_QUESTIONS).map(q => q.id);
      setDailyDrillOrder(focusedOrder);
    }
    
    setDailyDrillIndex(0);
    setDailyDrillAnswers([]);
    setShowCelebration(false);
    setHasContinuedPractice(false);
  };
  
  useEffect(() => {
    if (isCompleted && !showCelebration) {
      // Use setTimeout to avoid setState in effect warning
      setTimeout(() => {
        setShowCelebration(true);
        // Update score stats when drill is completed
        updateScoreStats(summary.correct, summary.attempted);
        updateDailyProgress(summary.attempted);
        
        // Update progress streaks
        const accuracy = summary.attempted > 0 ? Math.round((summary.correct / summary.attempted) * 100) : 0;
        updateProgressStreaks(summary.attempted, accuracy);
      }, 0);
    }
  }, [isCompleted, showCelebration, summary.correct, summary.attempted, updateScoreStats, updateDailyProgress, updateProgressStreaks]);

  const handleSelectChoice = (choiceId, isCorrect) => {
    setDailyDrillAnswers((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      // Prevent multi-submit - if already answered, don't overwrite
      if (next[safeIndex]) return prev;
      next[safeIndex] = {
        selectedChoiceId: choiceId,
        isCorrect,
      };
      return next;
    });

    if (!currentQuestion) return;

    // Use the single source of truth for recording attempts
    recordAttempt(currentQuestion, choiceId, isCorrect, 'dailyDrills');
    
    // Check if this was the last question and auto-complete if conditions are met
    const isLastQuestion = dailyDrillIndex >= totalQuestions - 1;
    const hasAnsweredAllQuestions = summary.attempted >= dailyDrillOrder.length;
    
    if (isLastQuestion && hasAnsweredAllQuestions && canCompleteSession && !showCelebration) {
      // Auto-complete the session when the last question is answered
      setTimeout(() => completeSession(), 500); // Small delay to show the answer
    }
  };

  const handlePrev = () => {
    setDailyDrillIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    // Check if we're at the last question and session can be completed
    if (dailyDrillIndex >= totalQuestions - 1 && canCompleteSession && !showCelebration) {
      // Auto-complete the session when reaching the end
      completeSession();
    } else if (dailyDrillIndex >= totalQuestions - 1 && !canCompleteSession && !showCelebration) {
      // If at last question but can't complete session, add more questions
      continuePractice();
    } else {
      setDailyDrillIndex((prev) => (prev < totalQuestions - 1 ? prev + 1 : prev));
    }
  };

  // Generate confetti effect
  const generateConfetti = () => {
    const positions = [];
    for (let i = 0; i < 50; i++) {
      positions.push({
        left: Math.random() * 100,
        animationDelay: Math.random() * 3,
        animationDuration: 3 + Math.random() * 2,
      });
    }
    setConfettiPositions(positions);
  };

  // Trigger celebration
  useEffect(() => {
    if (showCelebration && confettiPositions.length === 0) {
      generateConfetti();
    }
  }, [showCelebration, confettiPositions.length]);

  // Get streak message based on current streak
  const getStreakMessage = () => {
    if (scoreStats.currentStreak === 0) return "Continue to increase your streak! 🔥";
    if (scoreStats.currentStreak === 1) return "Great start! Keep going! 💪";
    if (scoreStats.currentStreak === 2) return "You're on a roll! 🌟";
    if (scoreStats.currentStreak === 3) return "Amazing consistency! ⭐";
    if (scoreStats.currentStreak === 4) return "You're crushing it! 🚀";
    if (scoreStats.currentStreak === 5) return "Perfect week! You're unstoppable! 🔥";
    if (scoreStats.currentStreak === 6) return "Incredible dedication! 💎";
    if (scoreStats.currentStreak === 7) return "Legendary streak! You're mastering this! 👑";
    return `Unbelievable! ${scoreStats.currentStreak} day streak! You're a champion! 🏆`;
  };

  if (!Array.isArray(questions) || questions.length === 0) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className={`text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold mb-2">No Questions Available</h2>
          <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
            Please check your question data and try again.
          </p>
        </div>
      </div>
    );
  }

  if (showCelebration) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-50'} flex items-center justify-center p-4`}>
        <div className={`text-center ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-3xl shadow-2xl p-10 max-w-2xl mx-auto relative overflow-hidden`}>
          {/* Modern gradient background effect */}
          <div className={`absolute inset-0 ${darkMode ? 'bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'} rounded-3xl`}></div>
          
          {/* Content */}
          <div className="relative z-10">
            {/* Modern achievement header */}
            <div className="mb-8">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${darkMode ? 'bg-gradient-to-br from-green-600 to-emerald-600' : 'bg-gradient-to-br from-green-500 to-emerald-500'} shadow-lg mb-6`}>
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h1 className={`text-4xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Great Work!
              </h1>
              <p className={`text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Daily drill completed
              </p>
            </div>
            
            {/* Combined performance metric */}
            <div className={`mb-8 p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30' : 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'}`}>
              <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {getAccuracy()}%
              </div>
              <div className={`text-lg font-medium ${darkMode ? 'text-green-200' : 'text-green-700'}`}>
                {summary.correct}/{summary.attempted} questions correct
              </div>
            </div>
            
            {/* Streak achievement */}
            <div className={`mb-8 p-4 rounded-xl ${darkMode ? 'bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-500/30' : 'bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200'}`}>
              <div className="flex items-center justify-center gap-2">
                <div className="text-2xl">🔥</div>
                <p className={`text-lg font-semibold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                  {getStreakMessage()}
                </p>
              </div>
            </div>
            
            {/* Clean action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* Continue Practicing */}
              <button
                onClick={handleContinuePractice}
                className={`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                  darkMode 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg'
                }`}
              >
                Keep Practicing
              </button>
              
              {/* Review Missed */}
              {missedQuestions.length > 0 && (
                <button
                  onClick={() => setMode('reviewMissed')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 relative ${
                    darkMode 
                      ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-700 hover:to-pink-700 shadow-lg' 
                      : 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 shadow-lg'
                  }`}
                >
                  Review Missed ({missedQuestions.length})
                </button>
              )}
              
              {/* Back to Dashboard */}
              <button
                onClick={() => setMode('dashboard')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Milestone Popup
  if (showMilestonePopup && currentMilestone) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-50'} flex items-center justify-center p-4`}>
        <div className={`text-center ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-3xl shadow-2xl p-10 max-w-2xl mx-auto relative overflow-hidden`}>
          {/* Modern gradient background effect */}
          <div className={`absolute inset-0 ${
            currentMilestone.color === 'orange' 
              ? darkMode ? 'bg-gradient-to-br from-orange-900/20 via-red-900/20 to-yellow-900/20' : 'bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50'
              : currentMilestone.color === 'blue'
              ? darkMode ? 'bg-gradient-to-br from-blue-900/20 via-indigo-900/20 to-purple-900/20' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
              : darkMode ? 'bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-indigo-900/20' : 'bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50'
          } rounded-3xl`}></div>
          
          {/* Content */}
          <div className="relative z-10">
            {/* Milestone achievement header */}
            <div className="mb-8">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
                currentMilestone.color === 'orange' 
                  ? darkMode ? 'bg-gradient-to-br from-orange-600 to-red-600' : 'bg-gradient-to-br from-orange-500 to-red-500'
                  : currentMilestone.color === 'blue'
                  ? darkMode ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                  : darkMode ? 'bg-gradient-to-br from-purple-600 to-pink-600' : 'bg-gradient-to-br from-purple-500 to-pink-500'
              } shadow-lg mb-6`}>
                <Star className="w-10 h-10 text-white" />
              </div>
              <h1 className={`text-4xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {currentMilestone.title}
              </h1>
              <p className={`text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {currentMilestone.message}
              </p>
            </div>
            
            {/* Progress stats */}
            <div className={`mb-8 p-6 rounded-2xl ${
              currentMilestone.color === 'orange' 
                ? darkMode ? 'bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-500/30' : 'bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200'
                : currentMilestone.color === 'blue'
                ? darkMode ? 'bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'
                : darkMode ? 'bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30' : 'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200'
            }`}>
              <div className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {summary.attempted}/{MINIMUM_QUESTIONS} questions
              </div>
              <div className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {questionsProgress}% of daily goal completed
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setShowMilestonePopup(false);
                  setCurrentMilestone(null);
                }}
                className={`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                  darkMode 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg'
                }`}
              >
                Continue Practicing
              </button>
              
              {/* Review Missed */}
              {missedQuestions.length > 0 && (
                <button
                  onClick={() => {
                    setShowMilestonePopup(false);
                    setCurrentMilestone(null);
                    setMode('reviewMissed');
                  }}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                    darkMode 
                      ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-700 hover:to-pink-700 shadow-lg' 
                      : 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 shadow-lg'
                  }`}
                >
                  Review Missed ({missedQuestions.length})
                </button>
              )}
              
              {/* Save and Exit */}
              <button
                onClick={() => {
                  // Save session state and exit
                  const sessionData = {
                    dailyDrillOrder,
                    dailyDrillAnswers,
                    dailyDrillIndex,
                    hasContinuedPractice,
                    sessionStartTime,
                    totalTimeSpent,
                  };
                  localStorage.setItem('cmmcDailyDrillSession', JSON.stringify(sessionData));
                  setShowMilestonePopup(false);
                  setCurrentMilestone(null);
                  setMode('dashboard');
                }}
                className={`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Save & Exit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show start screen if no active session
  if (!currentQuestion && totalQuestions === 0) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-50'} flex items-center justify-center p-4`}>
        <div className={`max-w-2xl w-full ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-xl p-8`}>
          <div className="text-center">
            <div className="text-6xl mb-6">📚</div>
            <h2 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Begin Daily Drills
            </h2>
            <p className={`text-lg mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Practice questions tailored to your exam deadline
              {daysUntilExam !== null && (
                <span className="block mt-2">
                  📅 {daysUntilExam} days until your exam
                </span>
              )}
            </p>
            <button
              onClick={handleResetPractice}
              className={`px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 ${
                darkMode 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' 
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg'
              }`}
            >
              Start Practice Session
            </button>
            <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                💡 <span className="font-medium">Tip:</span> Questions are dynamically selected based on your exam date to ensure you cover all material in time.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Main render - handle null currentQuestion in render logic instead of early return
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-50'} py-4`}>
      {/* Resume Session Prompt */}
      {showResumePrompt && interruptedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-xl p-6 shadow-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Resume Previous Session?
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {interruptedSession.message}
              </p>
              <div className={`mt-3 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Progress: {interruptedSession.sessionData.dailyDrillAnswers.length} / {interruptedSession.sessionData.dailyDrillOrder.length} questions completed
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  resumeSession(interruptedSession.sessionData);
                  setShowResumePrompt(false);
                  setInterruptedSession(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Resume Session
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('cmmcDrillCheckpoint');
                  setShowResumePrompt(false);
                  setInterruptedSession(null);
                  // Reset session state to start fresh
                  setDailyDrillAnswers([]);
                  setDailyDrillIndex(0);
                  setHasContinuedPractice(false);
                  // Reset other session state
                  setSessionStartTime(null);
                  setTotalTimeSpent(0);
                  setIsTimerActive(false);
                }}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-sm p-6 mb-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMode('dashboard')}
                className={`p-2 rounded-lg transition-all ${
                  darkMode 
                    ? 'hover:bg-slate-700 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                ← Back
              </button>
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Daily Practice
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                  Question {safeIndex + 1} of {totalQuestions}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                  Time: {formatTime(totalTimeSpent)}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                  Questions: {summary.attempted}/{MINIMUM_QUESTIONS} ({questionsProgress}%)
                </p>
                {daysUntilExam !== null && (
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'} font-medium`}>
                    {daysUntilExam <= 7 ? '🔥' : daysUntilExam <= 14 ? '⏰' : '📅'} {daysUntilExam} days to exam
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className={`p-2 rounded-lg transition-all ${
                  darkMode 
                    ? 'hover:bg-slate-700 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                title="Practice Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              {/* Session Management Buttons */}
              {practiceSession && practiceSession.status === 'active' && (
                <>
                  <button
                    type="button"
                    onClick={() => pausePracticeSession(practiceSession)}
                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm ${
                      darkMode ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                    }`}
                  >
                    Save and Exit
                  </button>
                  <button
                    type="button"
                    onClick={() => endPracticeSession(practiceSession)}
                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm ${
                      darkMode ? 'bg-gray-700 text-white hover:bg-gray-600 border-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    End Session
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className={`w-full ${darkMode ? 'bg-slate-700' : 'bg-gray-200'} rounded-full h-2`}>
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((safeIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className={`text-center ${darkMode ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-3`}>
              <p className={`text-2xl font-bold ${darkMode ? 'text-green-200' : 'text-green-600'}`}>
                {summary.correct}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>Correct</p>
            </div>
            <div className={`text-center ${darkMode ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-3`}>
              <p className={`text-2xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                {summary.attempted - summary.correct}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>Incorrect</p>
            </div>
            <div className={`text-center ${darkMode ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-3`}>
              <p className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {getAccuracy()}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>Accuracy</p>
            </div>
            <div className={`text-center ${darkMode ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-3`}>
              <p className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                {scoreStats.currentStreak}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>Day Streak 🔥</p>
            </div>
          </div>

          {/* Navigation - moved above question */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
            <button
              onClick={handlePrev}
              disabled={safeIndex === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                safeIndex === 0
                  ? darkMode ? 'bg-slate-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              ← Previous
            </button>
            
            <div className="flex space-x-2">
              {canCompleteSession && !showCelebration && (
                <button
                  type="button"
                  onClick={completeSession}
                  className={`inline-flex items-center rounded-lg border-2 px-4 py-2 text-sm font-bold shadow-lg transition-all transform hover:scale-105 ${
                    darkMode 
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 border-green-500' 
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 border-green-400'
                  }`}
                  title={`Complete drill early: ${summary.attempted} questions answered (minimum: ${MINIMUM_QUESTIONS})`}
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Complete Drill Early ({summary.attempted})
                </button>
              )}
              
              {/* Always available Complete Drill option - Added for users who want to finish without meeting streak requirements */}
              {!showCelebration && summary.attempted > 0 && (
                <button
                  type="button"
                  onClick={completeSession}
                  className={`inline-flex items-center rounded-lg border-2 px-4 py-2 text-sm font-bold shadow-lg transition-all transform hover:scale-105 ${
                    darkMode 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 border-blue-500' 
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 border-blue-400'
                  }`}
                  title="Complete drill now and save progress"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Drill ({summary.attempted})
                </button>
              )}
            </div>

            <button
              onClick={handleNext}
              disabled={showCelebration}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                showCelebration
                  ? darkMode ? 'bg-slate-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {dailyDrillIndex >= totalQuestions - 1 && !canCompleteSession ? 'Continue Practice →' : 'Next →'}
            </button>
          </div>
        </div>

        {/* Question Card */}
        {currentQuestion ? (
          <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-sm p-6 mb-6`}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  darkMode ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                }`}>
                  {currentQuestion.domain} {currentQuestion.important && '*'}
                </span>
              {currentAnswer.isCorrect !== null && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentAnswer.isCorrect
                    ? darkMode ? 'bg-green-600/20 text-green-200' : 'bg-green-100 text-green-800'
                    : darkMode ? 'bg-red-600/20 text-red-400' : 'bg-red-100 text-red-700'
                }`}>
                  {currentAnswer.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </span>
              )}
            </div>
            <div className="flex items-start gap-3">
              {currentQuestion.isTestQuestion && (
                <span className="text-yellow-500 text-lg mt-1" title="Test question">⭐</span>
              )}
              <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'} flex-1`}
                  style={{ fontSize: `${textSize === 'small' ? '1rem' : textSize === 'large' ? '1.5rem' : '1.25rem'}` }}>
                {currentQuestion.question}
              </h2>
            </div>
          </div>

          {/* Answer Choices */}
          <div className="space-y-3">
            {shuffledChoices.map((choice, index) => (
              <button
                key={choice.id}
                onClick={() => handleSelectChoice(choice.id, choice.correct)}
                disabled={currentAnswer.isCorrect !== null}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  currentAnswer.isCorrect !== null
                    ? currentAnswer.selectedChoiceId === choice.id
                      ? choice.correct
                        ? darkMode ? 'bg-green-600/20 border-green-500 text-green-200' : 'bg-green-50 border-green-500 text-green-900'
                        : darkMode ? 'bg-red-600/20 border-red-500 text-red-400' : 'bg-red-50 border-red-500 text-red-700'
                      : choice.correct
                        ? darkMode ? 'bg-green-600/20 border-green-500 text-green-200' : 'bg-green-50 border-green-500 text-green-900'
                        : darkMode ? 'bg-slate-700 border-slate-600 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-700'
                    : darkMode 
                      ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:border-slate-500' 
                      : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50 hover:border-gray-300'
                }`}
                style={{ fontSize: `${textSize === 'small' ? '0.875rem' : textSize === 'large' ? '1.125rem' : '1rem'}` }}
              >
                <div className="flex items-center">
                  <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-3 text-sm font-medium ${
                    currentAnswer.isCorrect !== null
                      ? currentAnswer.selectedChoiceId === choice.id
                        ? choice.correct
                          ? darkMode ? 'bg-green-600 border-green-500 text-white' : 'bg-green-600 border-green-500 text-white'
                          : darkMode ? 'bg-red-600 border-red-500 text-white' : 'bg-red-600 border-red-500 text-white'
                        : choice.correct
                          ? darkMode ? 'bg-green-600 border-green-500 text-white' : 'bg-green-600 border-green-500 text-white'
                          : darkMode ? 'bg-slate-600 border-slate-500 text-gray-400' : 'bg-gray-200 border-gray-300 text-gray-700'
                      : darkMode 
                        ? 'border-slate-500 text-gray-400' 
                        : 'border-gray-300 text-gray-700'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1">{choice.text}</span>
                  {currentAnswer.isCorrect !== null && currentAnswer.selectedChoiceId === choice.id && (
                    <span className="ml-2">
                      {choice.correct ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-300" /> : <XCircle className="w-5 h-5 text-red-500" />}
                    </span>
                  )}
                  {currentAnswer.isCorrect !== null && currentAnswer.selectedChoiceId !== choice.id && choice.correct && (
                    <span className="ml-2">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-300" />
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Explanation */}
          {currentAnswer.isCorrect !== null && currentQuestion.explanation && (
            <div className={`mt-4 p-4 rounded-lg ${
              currentAnswer.isCorrect 
                ? darkMode ? 'bg-green-600/10 border border-green-500/30' : 'bg-green-50 border border-green-200'
                : darkMode ? 'bg-blue-600/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
            }`}>
              <h3 className={`font-medium mb-2 ${
                currentAnswer.isCorrect 
                  ? darkMode ? 'text-green-200' : 'text-green-700'
                  : darkMode ? 'text-blue-400' : 'text-blue-700'
              }`}>
                💡 {currentAnswer.isCorrect ? 'Correct Answer Explanation:' : 'Explanation:'}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {currentQuestion.explanation}
              </p>
            </div>
          )}
        </div>
        ) : (
          <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-sm p-12 mb-6 text-center`}>
            <div className="text-6xl mb-4">🔄</div>
            <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Loading Questions...
            </h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Preparing your daily practice session...
            </p>
          </div>
        )}

        {/* Domain Performance */}
        {weakDomains.length > 0 && shouldRecommendFocusedSession && (
          <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-sm p-6 mt-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              🎯 Focus Areas for Improvement
            </h3>
            <div className="space-y-3">
              {weakDomains.slice(0, 3).map((domain) => (
                <div key={domain.domain} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getMasteryColor(domain.accuracy / 100)}`} />
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {domain.domain}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {domain.accuracy}% accuracy
                    </span>
                    <button
                      onClick={() => {
                        if (domain?.domain) {
                          startFocusedSession(domain.domain);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                        darkMode ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-500 text-white hover:bg-purple-600'
                      }`}
                    >
                      Focus Practice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal/Overlay - Kindle Safe */}
      {showSettings && !isKindle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-xl p-6 max-w-md w-full shadow-xl`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                Practice Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className={`text-2xl ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Practice Mode Info */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Current Session
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Questions: {summary.attempted}/{MINIMUM_QUESTIONS}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Time: {formatTime(totalTimeSpent)}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Progress: {questionsProgress}%
                </p>
              </div>

              {/* Study Plan Link */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Study Plan
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                  Configure your daily goals and study schedule
                </p>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    // Navigate to dashboard without losing daily drills state
                    setMode('dashboard');
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    darkMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  Open Study Plan
                </button>
              </div>

              {/* Kindle Detection Notice */}
              {isKindle && (
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <p className={`text-xs ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                    📖 Kindle device detected: Some overlay features may be limited
                  </p>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  darkMode
                    ? 'bg-gray-600 text-white hover:bg-gray-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kindle-safe Inline Settings Panel */}
      {showSettings && isKindle && (
        <div className={`${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-xl p-6 mb-6 shadow-lg`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400">
              Practice Settings
            </h2>
            <button
              onClick={() => setShowSettings(false)}
              className={`text-xl ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Practice Mode Info */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Current Session
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Questions: {summary.attempted}/{MINIMUM_QUESTIONS}
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Time: {formatTime(totalTimeSpent)}
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Progress: {questionsProgress}%
              </p>
            </div>

            {/* Study Plan Link */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Study Plan
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                Configure your daily goals and study schedule
              </p>
              <button
                onClick={() => {
                  setShowSettings(false);
                  // Navigate to dashboard without losing daily drills state
                  setMode('dashboard');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  darkMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Open Study Plan
              </button>
            </div>
          </div>

          {/* Kindle Notice */}
          <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
              📖 Kindle device detected: Using inline settings panel for better compatibility
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyDrills;
