/**
 * Lightweight Node-runnable checks for scenario helpers.
 * Run: node src/utils/scenarioUtils.test.js
 */
import { splitScenario, groupByScenario, extractScenarioTitle } from '../lib/scenarioUtils.js';
import questions from '../../data/questions.json' with { type: 'json' };

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    failed += 1;
  } else {
    console.log('OK  ', msg);
  }
}

const q1 = questions[0];
const split = splitScenario(q1.question);
assert(split.stem.trim().length > 0, 'Q1 splits into a non-empty stem');

const withScenario = questions.filter((q) => splitScenario(q.question).scenario.length > 0);
assert(withScenario.length >= 1, 'at least one question has a scenario');

const groups = groupByScenario(questions);
assert(groups.length >= 1, `grouped into scenarios + standalones (got ${groups.length})`);

const flatCount = groups.reduce((n, g) => n + g.questions.length, 0);
assert(flatCount === questions.length, 'grouping preserves all questions');

const scenarioQ = withScenario[0];
const title = extractScenarioTitle(splitScenario(scenarioQ.question).scenario);
assert(typeof title === 'string' && title.length > 0, 'scenario title extracts a non-empty label');

if (failed) {
  process.exit(1);
}
console.log('\nscenarioUtils checks passed');
