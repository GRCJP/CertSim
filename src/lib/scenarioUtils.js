/**
 * Shared helpers for splitting embedded scenario text from question stems
 * and grouping questions that share the same scenario.
 */

const STEM_PREFIX =
  /^(How|What|Which|Based|According|Why|When|Where|Who|In which|Refer|Identify|Select|Choose|Determine|Describe|Explain)/i;

/**
 * Split a question blob into { scenario, stem }.
 * Scenario questions store the case study in leading paragraphs and the
 * actual ask in the final paragraph.
 */
export function splitScenario(text = '') {
  const parts = String(text)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return { scenario: '', stem: text || '' };
  }

  const last = parts[parts.length - 1];
  const looksLikeStem = last.endsWith('?') || STEM_PREFIX.test(last);

  if (!looksLikeStem) {
    return { scenario: '', stem: text || '' };
  }

  return {
    scenario: parts.slice(0, -1).join('\n\n'),
    stem: last,
  };
}

/**
 * Group questions by shared scenario text.
 * Standalone items are bundled into "Knowledge questions" chapters.
 */
export function groupByScenario(questions = [], { knowledgeChunkSize = 12 } = {}) {
  const scenarioGroups = [];
  const standalones = [];
  const indexByScenario = new Map();

  questions.forEach((q, idx) => {
    const { scenario, stem } = splitScenario(q.question);
    const enriched = { ...q, stem, scenario, originalIndex: idx };

    if (!scenario) {
      standalones.push(enriched);
      return;
    }

    if (!indexByScenario.has(scenario)) {
      indexByScenario.set(scenario, scenarioGroups.length);
      scenarioGroups.push({
        id: `scenario-${scenarioGroups.length + 1}`,
        title: extractScenarioTitle(scenario),
        scenario,
        questions: [],
      });
    }

    scenarioGroups[indexByScenario.get(scenario)].questions.push(enriched);
  });

  const knowledgeGroups = [];
  for (let i = 0; i < standalones.length; i += knowledgeChunkSize) {
    const slice = standalones.slice(i, i + knowledgeChunkSize);
    const part = knowledgeGroups.length + 1;
    knowledgeGroups.push({
      id: `knowledge-${part}`,
      title:
        standalones.length <= knowledgeChunkSize
          ? 'Knowledge questions'
          : `Knowledge questions (${part})`,
      scenario: '',
      questions: slice,
    });
  }

  return [...scenarioGroups, ...knowledgeGroups];
}

/** First sentence / company name style title from a scenario block. */
export function extractScenarioTitle(scenario = '') {
  const firstLine = String(scenario).split('\n')[0].trim();
  const match = firstLine.match(/^([A-Z][A-Za-z0-9 &.'-]{2,60})\b/);
  if (match) return match[1].trim();
  return firstLine.length > 48 ? `${firstLine.slice(0, 48)}…` : firstLine || 'Scenario';
}

export function getCorrectChoice(question) {
  if (!question?.choices) return null;
  return question.choices.find((c) => c.correct) || null;
}
