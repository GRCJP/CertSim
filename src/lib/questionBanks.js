// Central registry of selectable question banks.
//
// This app ships with a single sample bank, but the registry keeps bank
// resolution in one place so adding another bank later is a one-entry change
// instead of editing scattered ternaries across the app.

import sampleQuestions from '../../data/questions.json';

export const DEFAULT_BANK_ID = 'bankDefault';

export const QUESTION_BANKS = {
  bankDefault: {
    id: 'bankDefault',
    label: 'Practice Exam Bank',
    short: 'Practice',
    description: 'Sample practice exam question bank',
    color: 'purple',
    questions: Array.isArray(sampleQuestions) ? sampleQuestions : [],
  },
};

// Shape consumed by the exam-switcher dropdown in App.jsx.
export const TEST_BANKS = Object.values(QUESTION_BANKS).map(
  ({ id, label, description, color }) => ({ id, label, description, color })
);

export const getBankMeta = (bankId) =>
  QUESTION_BANKS[bankId] ?? QUESTION_BANKS[DEFAULT_BANK_ID];

export const getQuestionsForBank = (bankId) => getBankMeta(bankId).questions;

// Count reflects the actual number of loaded questions, so Exam mode never
// requests more questions than exist (the bank grows from 27 toward 79).
export const getQuestionCountForBank = (bankId) =>
  getQuestionsForBank(bankId).length;
