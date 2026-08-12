import React, { useState, useMemo } from 'react';
import { CheckCircle, Target, BookOpen, AlertTriangle, TrendingUp } from 'lucide-react';

const DomainSelector = ({ 
  questions, 
  domainMastery, 
  darkMode, 
  onDomainSelect, 
  onStartPractice,
  missedQuestions 
}) => {
  console.log('🏠 DomainSelector: Component mounted!', {
    hasQuestions: !!questions,
    questionsLength: questions?.length || 0,
    hasDomainMastery: !!domainMastery,
    domainMasteryKeys: domainMastery?.levels ? Object.keys(domainMastery.levels) : []
  });
  
  const [selectedDomain, setSelectedDomain] = useState(null);

  // Calculate domain statistics
  const domainStats = useMemo(() => {
    console.log('🏠 DomainSelector: Starting calculation...', {
      questionsAvailable: !!questions,
      questionsCount: questions?.length || 0,
      questionsType: typeof questions,
      isArray: Array.isArray(questions),
      domainMasteryAvailable: !!domainMastery?.levels,
      domainMasteryKeys: domainMastery?.levels ? Object.keys(domainMastery.levels) : []
    });
    
    if (!questions || !Array.isArray(questions)) {
      console.log('❌ DomainSelector: No questions available', {
        questions,
        type: typeof questions,
        isArray: Array.isArray(questions)
      });
      return [];
    }

    // Get all unique domains from questions
    const availableDomains = [...new Set(questions.map(q => q.domain).filter(Boolean))];
    console.log('📋 DomainSelector: Available domains:', {
      domains: availableDomains,
      count: availableDomains.length,
      sampleQuestions: questions.slice(0, 3).map(q => ({ id: q.id, domain: q.domain }))
    });
    
    if (availableDomains.length === 0) {
      console.log('⚠️ DomainSelector: No domains found in questions', {
        questions: questions.slice(0, 5),
        allHaveDomain: questions.every(q => q.domain),
        domainValues: questions.map(q => q.domain),
        questionKeys: questions[0] ? Object.keys(questions[0]) : [],
        sampleQuestion: questions[0] || null
      });
      return [];
    }
    
    const domains = {};
    
    // Group questions by domain
    questions.forEach(question => {
      if (!question.domain) return;
      
      if (!domains[question.domain]) {
        domains[question.domain] = {
          name: question.domain,
          totalQuestions: 0,
          missedCount: 0,
          mastery: 0, // Default to 0% if no data
          questions: []
        };
      }
      
      domains[question.domain].totalQuestions++;
      domains[question.domain].questions.push(question);
    });

    console.log('📊 DomainSelector: Grouped domains:', Object.keys(domains));

    // Calculate mastery from domainMastery data
    Object.keys(domains).forEach(domainName => {
      const masteryData = domainMastery?.levels?.[domainName];
      if (masteryData) {
        domains[domainName].mastery = Math.round((masteryData.masteryLevel || 0) * 100);
        domains[domainName].attempts = masteryData.attempts || 0;
        domains[domainName].correct = masteryData.correct || 0;
      }
      
      // Count missed questions for this domain
      domains[domainName].missedCount = missedQuestions?.filter(q => q.domain === domainName).length || 0;
    });

    const result = Object.values(domains).sort((a, b) => {
      // Sort by priority: weak domains first, then by mastery
      const aPriority = (a.mastery < 70 ? 0 : 1) * 100 + (100 - a.mastery);
      const bPriority = (b.mastery < 70 ? 0 : 1) * 100 + (100 - b.mastery);
      return aPriority - bPriority;
    });
    
    console.log('📈 DomainSelector: Final domain stats:', result);
    return result;
  }, [questions, domainMastery, missedQuestions]);

  const handleDomainToggle = (domainName) => {
    setSelectedDomain(prev => (prev === domainName ? null : domainName));
  };

  const handleStartPractice = (filterType) => {
    if (!selectedDomain) return;

    const domainQuestions = (questions || []).filter(q => q.domain === selectedDomain);
    const missedForDomain = (missedQuestions || []).filter(q => q.domain === selectedDomain);

    const filteredQuestions = filterType === 'missed'
      ? missedForDomain
      : domainQuestions;

    // Validate that we have questions to practice
    if (!filteredQuestions || filteredQuestions.length === 0) {
      console.warn('🎯 DomainSelector: No questions available for practice', {
        selectedDomain,
        filterType,
        domainQuestionsCount: domainQuestions.length,
        missedForDomainCount: missedForDomain.length
      });
      
      // Show helpful message to user
      if (filterType === 'missed' && missedForDomain.length === 0 && domainQuestions.length > 0) {
        // If no missed questions but there are domain questions, automatically switch to all questions
        console.log('🎯 DomainSelector: Auto-switching to all questions since no missed questions found');
        const allFilteredQuestions = domainQuestions;
        
        if (allFilteredQuestions.length > 0) {
          console.log('🎯 DomainSelector: Starting practice with all questions:', {
            selectedDomain,
            filterType: 'all',
            filteredQuestionsCount: allFilteredQuestions.length
          });
          
          // Pass the filter type to the parent
          onDomainSelect([selectedDomain], allFilteredQuestions, 'all');
          return;
        }
      }
      
      alert(`No questions available for "${selectedDomain}" with the selected filter.\n\nTry selecting a different domain or filter type.`);
      return;
    }

    console.log('🎯 DomainSelector: Starting practice with:', {
      selectedDomain,
      filterType,
      filteredQuestionsCount: filteredQuestions.length,
      missedCount: missedForDomain.length,
      filteredQuestions: filteredQuestions.slice(0, 3)
    });

    // Pass the filter type to the parent
    onDomainSelect([selectedDomain], filteredQuestions, filterType);
  };

  const getMasteryColor = (mastery) => {
    if (mastery >= 80) return darkMode ? 'text-green-400' : 'text-green-600';
    if (mastery >= 60) return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    return darkMode ? 'text-red-400' : 'text-red-600';
  };

  const getMasteryBgColor = (mastery) => {
    if (mastery >= 80) return darkMode ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-200';
    if (mastery >= 60) return darkMode ? 'bg-yellow-900/20 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200';
    return darkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200';
  };

  const getProgressBarColor = (mastery) => {
    if (mastery >= 80) return 'bg-green-500';
    if (mastery >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const selectedDomainStats = selectedDomain
    ? domainStats.find(d => d.name === selectedDomain)
    : null;

  return (
    <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2 flex items-center">
          <Target className={`w-5 h-5 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          Domain-Specific Practice
        </h2>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Select domains to focus your practice on specific areas
        </p>
      </div>

      {/* No Domains Message */}
      {domainStats.length === 0 && (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-lg font-semibold mb-2">No Domains Available</h3>
          <p className="text-sm">
            {questions?.length > 0 
              ? "Questions don't have domain information assigned"
              : "No questions loaded yet"
            }
          </p>
        </div>
      )}

      {/* Domain List - Only show if domains exist */}
      {domainStats.length > 0 && (
        <>
          {/* Domain List */}
          <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
        {domainStats.map((domain) => {
          const isSelected = selectedDomain === domain.name;
          
          return (
            <div
              key={domain.name}
              onClick={() => handleDomainToggle(domain.name)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? darkMode ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
                  : darkMode ? 'border-slate-600 hover:border-slate-500' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Selection Indicator */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected
                      ? darkMode ? 'bg-blue-500 border-blue-500' : 'bg-blue-500 border-blue-500'
                      : darkMode ? 'border-slate-500' : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                  
                  {/* Domain Info */}
                  <div>
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {domain.name}
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {domain.totalQuestions} questions
                      {domain.missedCount > 0 && (
                        <span className={`ml-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                          • {domain.missedCount} missed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Mastery Score */}
                <div className="flex items-center space-x-3">
                  {/* Progress Bar */}
                  <div className="w-24">
                    <div className={`h-2 ${darkMode ? 'bg-slate-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                      <div
                        className={`h-full ${getProgressBarColor(domain.mastery)} transition-all duration-500`}
                        style={{ width: `${domain.mastery}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Score */}
                  <div className={`text-lg font-bold ${getMasteryColor(domain.mastery)} w-12 text-right`}>
                    {domain.mastery}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {selectedDomain ? (
            <span>
              Domain selected: {selectedDomain}
              {selectedDomainStats ? (
                <span className="ml-2">• {selectedDomainStats.totalQuestions} questions • {selectedDomainStats.missedCount || 0} missed</span>
              ) : null}
            </span>
          ) : (
            <span>Select a domain to start practice</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStartPractice('missed')}
            disabled={!selectedDomain}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center ${
              !selectedDomain
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : darkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            Practice Missed
          </button>
          <button
            onClick={() => handleStartPractice('all')}
            disabled={!selectedDomain}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center ${
              !selectedDomain
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Practice All
          </button>
        </div>
      </div>

      {/* Study Plan Integration Info */}
      {selectedDomain && (
        <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
          <div className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
            💡 <span className="font-medium">Study Plan Integration:</span> 
            Questions from these domains will be prioritized in your daily drills, and missed questions will be tracked for focused review.
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default DomainSelector;
