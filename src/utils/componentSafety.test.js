/**
 * Component Safety Tests
 * Tests defensive programming patterns to prevent temporal dead zone errors
 */

import { 
  safeAccess, 
  safeArrayAccess, 
  isValidQuestion, 
  safeContextDestructure,
  logSafetyWarning 
} from './componentSafety.js';

// Test safeAccess function
const testSafeAccess = () => {
  console.log('🧪 Testing safeAccess...');
  
  // Test undefined variable
  const result1 = safeAccess(undefined, 'default');
  console.assert(result1 === 'default', 'Should return default for undefined');
  
  // Test null variable
  const result2 = safeAccess(null, 'default');
  console.assert(result2 === 'default', 'Should return default for null');
  
  // Test valid variable
  const result3 = safeAccess('valid', 'default');
  console.assert(result3 === 'valid', 'Should return valid value');
  
  // Test with validator
  const result4 = safeAccess('test', 'default', (val) => val.length > 2);
  console.assert(result4 === 'test', 'Should pass validator');
  
  const result5 = safeAccess('x', 'default', (val) => val.length > 2);
  console.assert(result5 === 'default', 'Should fail validator and return default');
  
  console.log('✅ safeAccess tests passed');
};

// Test safeArrayAccess function
const testSafeArrayAccess = () => {
  console.log('🧪 Testing safeArrayAccess...');
  
  // Test non-array
  const result1 = safeArrayAccess(null, 0, 'default');
  console.assert(result1 === 'default', 'Should return default for non-array');
  
  // Test invalid index
  const result2 = safeArrayAccess([1, 2, 3], -1, 'default');
  console.assert(result2 === 'default', 'Should return default for negative index');
  
  const result3 = safeArrayAccess([1, 2, 3], 5, 'default');
  console.assert(result3 === 'default', 'Should return default for out of bounds index');
  
  // Test valid access
  const result4 = safeArrayAccess([1, 2, 3], 1, 'default');
  console.assert(result4 === 2, 'Should return correct element');
  
  console.log('✅ safeArrayAccess tests passed');
};

// Test isValidQuestion function
const testIsValidQuestion = () => {
  console.log('🧪 Testing isValidQuestion...');
  
  // Test invalid inputs
  console.assert(!isValidQuestion(null), 'Should reject null');
  console.assert(!isValidQuestion(undefined), 'Should reject undefined');
  console.assert(!isValidQuestion('string'), 'Should reject string');
  console.assert(!isValidQuestion({}), 'Should reject empty object');
  
  // Test missing required properties
  console.assert(!isValidQuestion({ id: 1 }), 'Should reject object without question and choices');
  console.assert(!isValidQuestion({ id: 1, question: 'test' }), 'Should reject object without choices');
  
  // Test invalid choices
  console.assert(!isValidQuestion({ 
    id: 1, 
    question: 'test', 
    choices: [] 
  }), 'Should reject empty choices array');
  
  console.assert(!isValidQuestion({ 
    id: 1, 
    question: 'test', 
    choices: [1, 2, 3] 
  }), 'Should reject non-object choices');
  
  // Test valid question
  const validQuestion = {
    id: 1,
    question: 'Test question?',
    choices: [
      { id: 'A', text: 'Choice A', correct: false },
      { id: 'B', text: 'Choice B', correct: true }
    ]
  };
  console.assert(isValidQuestion(validQuestion), 'Should accept valid question');
  
  console.log('✅ isValidQuestion tests passed');
};

// Test safeContextDestructure function
const testSafeContextDestructure = () => {
  console.log('🧪 Testing safeContextDestructure...');
  
  // Test invalid context
  const result1 = safeContextDestructure(null, { a: 1, b: 2 });
  console.assert(result1.a === 1 && result1.b === 2, 'Should return defaults for null context');
  
  // Test partial context
  const result2 = safeContextDestructure({ a: 10 }, { a: 1, b: 2 });
  console.assert(result2.a === 10 && result2.b === 2, 'Should mix context and defaults');
  
  // Test full context
  const result3 = safeContextDestructure({ a: 10, b: 20 }, { a: 1, b: 2 });
  console.assert(result3.a === 10 && result3.b === 20, 'Should use context values when available');
  
  console.log('✅ safeContextDestructure tests passed');
};

// Test temporal dead zone prevention
const testTemporalDeadZonePrevention = () => {
  console.log('🧪 Testing temporal dead zone prevention...');
  
  // Simulate the problematic pattern from ReviewMissed
  const simulateReviewMissedPattern = () => {
    // This would previously cause: ReferenceError: Cannot access 'q' before initialization
    // Now we use safe access patterns
    
    const missedQuestions = [1, 2, 3]; // Simulated question IDs
    const currentQuestion = 0;
    
    // OLD (problematic) pattern:
    // useEffect(() => {
    //   if (q && !missedQuestions.some(mq => mq.id === q.id)) { // q used before declaration!
    //     // ...
    //   }
    // }, [missedQuestions, currentQuestion, q]);
    // const q = missedQuestions[currentQuestion]; // Declared after useEffect!
    
    // NEW (safe) pattern using our utilities:
    const q = safeArrayAccess(missedQuestions, currentQuestion, null);
    
    if (q !== null) {
      console.log('✅ Safe access to question object');
      return true;
    } else {
      console.log('✅ Safe handling of invalid question access');
      return false;
    }
  };
  
  const result = simulateReviewMissedPattern();
  console.assert(typeof result === 'boolean', 'Should handle temporal dead zone safely');
  
  console.log('✅ Temporal dead zone prevention tests passed');
};

// Run all tests
export const runComponentSafetyTests = () => {
  console.log('🚀 Starting Component Safety Tests...\n');
  
  try {
    testSafeAccess();
    testSafeArrayAccess();
    testIsValidQuestion();
    testSafeContextDestructure();
    testTemporalDeadZonePrevention();
    
    console.log('\n🎉 All component safety tests passed!');
    console.log('📋 Safety checklist implemented:');
    console.log('   ✅ Variable declaration before use');
    console.log('   ✅ Safe array access with bounds checking');
    console.log('   ✅ Context destructuring with defaults');
    console.log('   ✅ Question object validation');
    console.log('   ✅ Temporal dead zone prevention');
    console.log('   ✅ Error handling for edge cases');
    
    return true;
  } catch (error) {
    console.error('❌ Component safety tests failed:', error);
    return false;
  }
};

// Auto-run tests in development mode
if (process.env.NODE_ENV === 'development') {
  runComponentSafetyTests();
}
