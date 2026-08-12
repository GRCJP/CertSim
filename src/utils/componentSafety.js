/**
 * Component Safety Utilities
 * Prevents temporal dead zone errors and provides defensive programming patterns
 */

/**
 * Safe variable access helper - prevents accessing variables before initialization
 * @param {*} variable - The variable to check
 * @param {*} defaultValue - Default value if variable is undefined/null
 * @param {Function} validator - Optional validator function
 * @returns {*} Safe value or default
 */
export const safeAccess = (variable, defaultValue = null, validator = null) => {
  if (variable === undefined || variable === null) {
    return defaultValue;
  }
  
  if (validator && typeof validator === 'function') {
    try {
      return validator(variable) ? variable : defaultValue;
    } catch (error) {
      console.error('Validator function error:', error);
      return defaultValue;
    }
  }
  
  return variable;
};

/**
 * Safe array access with bounds checking
 * @param {Array} array - The array to access
 * @param {number} index - Index to access
 * @param {*} defaultValue - Default value if out of bounds
 * @returns {*} Array element or default value
 */
export const safeArrayAccess = (array, index, defaultValue = null) => {
  if (!Array.isArray(array)) {
    return defaultValue;
  }
  
  if (typeof index !== 'number' || index < 0 || index >= array.length) {
    return defaultValue;
  }
  
  return array[index];
};

/**
 * Safe question object validator
 * @param {*} question - Question object to validate
 * @returns {boolean} True if valid question object
 */
export const isValidQuestion = (question) => {
  if (!question || typeof question !== 'object') {
    return false;
  }
  
  // Check required properties
  const requiredProps = ['id', 'question', 'choices'];
  for (const prop of requiredProps) {
    if (!(prop in question)) {
      return false;
    }
  }
  
  // Validate choices array
  if (!Array.isArray(question.choices) || question.choices.length === 0) {
    return false;
  }
  
  // Check if choices have required properties
  for (const choice of question.choices) {
    if (!choice || typeof choice !== 'object' || 
        !('id' in choice) || !('text' in choice) || !('correct' in choice)) {
      return false;
    }
  }
  
  return true;
};

/**
 * Safe context destructuring with defaults
 * @param {Object} context - Context object
 * @param {Object} defaults - Default values
 * @returns {Object} Safe context values
 */
export const safeContextDestructure = (context, defaults = {}) => {
  if (!context || typeof context !== 'object') {
    console.warn('Invalid context object provided, using defaults');
    return defaults;
  }
  
  const result = {};
  for (const [key, defaultValue] of Object.entries(defaults)) {
    result[key] = context[key] !== undefined ? context[key] : defaultValue;
  }
  
  return result;
};

/**
 * Component safety checklist for development
 */
export const COMPONENT_SAFETY_CHECKLIST = {
  VARIABLE_DECLARATION: 'Declare variables before using them in useEffect',
  CONTEXT_DESTRUCTURING: 'Use safeContextDestructure for context values',
  ARRAY_ACCESS: 'Use safeArrayAccess for array indexing',
  QUESTION_VALIDATION: 'Use isValidQuestion before accessing question properties',
  ERROR_HANDLING: 'Wrap risky operations in try-catch blocks',
  NULL_CHECKS: 'Always check for null/undefined before property access',
};

/**
 * Development mode safety warnings
 */
export const logSafetyWarning = (componentName, issue, suggestion) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`⚠️ [${componentName}] Safety Issue: ${issue}`);
    console.log(`💡 Suggestion: ${suggestion}`);
  }
};
