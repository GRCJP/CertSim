#!/usr/bin/env node
/**
 * Generate a Kindle-friendly study pack from the question bank.
 *
 * Outputs:
 *   public/kindle/          — static HTML (works without React / modern JS)
 *   kindle-export/*.epub    — sideloadable EPUB for e-ink Kindles
 *
 * Design goals for e-ink / Experimental Browser:
 *   - No React, no build step required to read
 *   - Link-based navigation (works with JS disabled)
 *   - <details>/<summary> answer reveal (progressive enhancement)
 *   - High-contrast black/white CSS, large tap targets
 *   - Scenario shown once, then related questions
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'questions.json');
const OUT_HTML = path.join(ROOT, 'public', 'kindle');
const OUT_EPUB_DIR = path.join(ROOT, 'kindle-export');
const EPUB_NAME = 'CertSim-Memory.epub';

const STEM_PREFIX =
  /^(How|What|Which|Based|According|Why|When|Where|Who|In which|Refer|Identify|Select|Choose|Determine|Describe|Explain)/i;

function splitScenario(text = '') {
  const parts = String(text)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) return { scenario: '', stem: text || '' };
  const last = parts[parts.length - 1];
  if (!(last.endsWith('?') || STEM_PREFIX.test(last))) {
    return { scenario: '', stem: text || '' };
  }
  return { scenario: parts.slice(0, -1).join('\n\n'), stem: last };
}

function extractScenarioTitle(scenario = '') {
  const firstLine = String(scenario).split('\n')[0].trim();
  const match = firstLine.match(/^([A-Z][A-Za-z0-9 &.'-]{2,60})\b/);
  if (match) return match[1].trim();
  return firstLine.length > 48 ? `${firstLine.slice(0, 48)}…` : firstLine || 'Scenario';
}

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paragraphsHtml(text = '') {
  return String(text)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
}

function groupByScenario(questions) {
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
        id: `s${String(scenarioGroups.length + 1).padStart(2, '0')}`,
        title: extractScenarioTitle(scenario),
        scenario,
        questions: [],
      });
    }
    scenarioGroups[indexByScenario.get(scenario)].questions.push(enriched);
  });

  // Bundle standalones into digestible knowledge chapters (cleaner Kindle TOC)
  const CHUNK = 12;
  const knowledgeGroups = [];
  for (let i = 0; i < standalones.length; i += CHUNK) {
    const slice = standalones.slice(i, i + CHUNK);
    const part = knowledgeGroups.length + 1;
    knowledgeGroups.push({
      id: `k${String(part).padStart(2, '0')}`,
      title:
        standalones.length <= CHUNK
          ? 'Knowledge questions'
          : `Knowledge questions (${part})`,
      scenario: '',
      questions: slice,
    });
  }

  return [...scenarioGroups, ...knowledgeGroups];
}

function rimraf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, 'utf8');
}

const CSS = `/* CertSim Kindle Study Pack — e-ink optimized */
html { font-size: 100%; }
body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #000;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.15rem;
  line-height: 1.55;
}
a { color: #000; text-decoration: underline; }
.wrap { max-width: 40rem; margin: 0 auto; padding: 1rem 1.1rem 3rem; }
header.appbar {
  border-bottom: 2px solid #000;
  padding: 0.75rem 1.1rem;
  margin-bottom: 1rem;
  background: #fff;
}
header.appbar h1 {
  margin: 0;
  font-size: 1.15rem;
  font-family: "Helvetica Neue", Arial, sans-serif;
  letter-spacing: 0.02em;
}
header.appbar .sub {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  font-family: "Helvetica Neue", Arial, sans-serif;
}
.navrow {
  display: block;
  margin: 1rem 0 1.25rem;
  padding: 0;
  border-top: 1px solid #000;
  border-bottom: 1px solid #000;
}
.navrow a, .btn {
  display: inline-block;
  padding: 0.65rem 0.9rem;
  margin: 0.35rem 0.35rem 0.35rem 0;
  border: 2px solid #000;
  background: #f4f4f4;
  color: #000;
  text-decoration: none;
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
}
.btn-primary { background: #000; color: #fff; }
.meta {
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 0.85rem;
  margin: 0 0 0.75rem;
}
h2 {
  font-size: 1.35rem;
  margin: 0 0 0.75rem;
  font-family: "Helvetica Neue", Arial, sans-serif;
}
h3 {
  font-size: 1.1rem;
  margin: 1.25rem 0 0.5rem;
  font-family: "Helvetica Neue", Arial, sans-serif;
}
.scenario-box {
  border: 2px solid #000;
  padding: 0.85rem 1rem;
  margin: 0 0 1.25rem;
  background: #fafafa;
}
.choices { list-style: none; padding: 0; margin: 0 0 1rem; }
.choices li {
  border: 2px solid #000;
  padding: 0.75rem 0.9rem;
  margin: 0 0 0.55rem;
  background: #fff;
}
.choices li.is-correct {
  background: #e8e8e8;
  border-width: 3px;
  font-weight: 700;
}
.choices .letter {
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-weight: 700;
  margin-right: 0.4rem;
}
.choices .tag {
  display: inline-block;
  margin-left: 0.4rem;
  padding: 0.1rem 0.4rem;
  border: 1px solid #000;
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
}
.memory-card {
  border: 2px solid #000;
  padding: 1rem;
  margin: 0 0 1.5rem;
  page-break-inside: avoid;
  background: #fff;
}
.memory-card .answer-block {
  border-top: 2px solid #000;
  margin-top: 1rem;
  padding-top: 0.85rem;
}
.memory-card .explain {
  margin-top: 0.75rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid #000;
  background: #f7f7f7;
}
details.answer {
  border: 2px solid #000;
  padding: 0.5rem 0.85rem;
  margin: 1rem 0;
  background: #fff;
}
details.answer summary {
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-weight: 700;
  cursor: pointer;
  padding: 0.4rem 0;
}
.correct {
  font-weight: 700;
  border-left: 4px solid #000;
  padding-left: 0.6rem;
  margin: 0.5rem 0;
}
.toc a {
  display: block;
  padding: 0.55rem 0;
  border-bottom: 1px solid #ccc;
  text-decoration: none;
  font-family: "Helvetica Neue", Arial, sans-serif;
}
.toc a:hover { text-decoration: underline; }
.toc .count {
  float: right;
  font-size: 0.85rem;
}
.flash-q, .flash-a {
  min-height: 40vh;
}
.note {
  border: 1px solid #000;
  padding: 0.75rem 0.9rem;
  margin: 1rem 0;
  font-size: 0.95rem;
}
hr { border: 0; border-top: 1px solid #000; margin: 1.5rem 0; }
@media (max-width: 480px) {
  body { font-size: 1.05rem; }
  .btn, .navrow a { display: block; text-align: center; }
}
`;

function pageShell({ title, body, crumb = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <title>${escapeHtml(title)} — CertSim Kindle Study</title>
  <link rel="stylesheet" href="styles.css"/>
</head>
<body>
  <header class="appbar">
    <h1>CertSim</h1>
    <p class="sub">Memory Study Pack · Scenario + Answer + Explanation</p>
  </header>
  <div class="wrap">
    ${crumb}
    ${body}
  </div>
</body>
</html>`;
}

function buildHtmlPack(questions, groups) {
  rimraf(OUT_HTML);
  ensureDir(OUT_HTML);
  write(path.join(OUT_HTML, 'styles.css'), CSS);

  // Flat question list with prev/next across whole bank
  const flat = [];
  groups.forEach((g) => {
    g.questions.forEach((q) => {
      flat.push({ ...q, groupId: g.id, groupTitle: g.title });
    });
  });

  const tocLinks = groups
    .map(
      (g) =>
        `<a href="${g.id}.html"><span>${escapeHtml(g.title)}</span><span class="count">${g.questions.length} Q</span></a>`
    )
    .join('\n');

  // Full interactive app (Practice / Memory / Missed) — closest to the web app
  buildInteractiveApp(flat);

  const indexBody = `
    <h2>Study like the web app</h2>
    <p>The <strong>Kindle Interactive App</strong> lets you tap answers, get instant feedback, read explanations, track progress, and switch between Practice and Memory modes — without React.</p>
    <div class="note">
      <strong>Recommended:</strong> open the Interactive App on Kindle Fire / Silk / phone. On e-ink Experimental Browser, use Memory Drill if JS is limited.
    </div>
    <div class="note">
      <strong>Kindle Scribe short URL:</strong> type <code>grcjp.github.io/certsim/k</code>
      — each page has the full scenario with the question, answer, and explanation.
    </div>
    <p class="navrow">
      <a class="btn-primary" href="../k/">Scribe pages (/k) →</a>
      <a href="app.html">Interactive App</a>
      <a href="mem-001.html">Memory Drill</a>
      <a href="memory.html">Memory Scroll</a>
    </p>
    <p class="navrow">
      <a href="flashcards.html">Quiz flashcards</a>
      <a href="answer-key.html">Answer key</a>
      <a href="how-to.html">How to use</a>
    </p>
    <h3>Scenarios &amp; topics</h3>
    <div class="toc">
      ${tocLinks}
      <a href="all-questions.html"><span>All questions (1–${questions.length})</span><span class="count">${questions.length}</span></a>
    </div>
  `;
  write(
    path.join(OUT_HTML, 'index.html'),
    pageShell({ title: 'Home', body: indexBody })
  );

  write(
    path.join(OUT_HTML, 'how-to.html'),
    pageShell({
      title: 'How to use',
      crumb: `<p class="navrow"><a href="index.html">← Home</a></p>`,
      body: `
        <h2>How to study on Kindle</h2>
        <h3>Interactive App (closest to the web app)</h3>
        <ol>
          <li>Open <strong>Interactive App</strong> (<code>app.html</code>).</li>
          <li><strong>Practice Mode</strong> — tap A/B/C, see correct/incorrect, read explanation, tap Next.</li>
          <li><strong>Memory Drill</strong> — scenario + answer + explanation always visible.</li>
          <li><strong>Review Missed</strong> — only questions you got wrong.</li>
          <li>Progress is saved on the device (localStorage) when the browser allows it.</li>
        </ol>
        <h3>EPUB (best for e-ink reading)</h3>
        <ol>
          <li>Sideload <strong>${EPUB_NAME}</strong> via Send to Kindle or USB.</li>
          <li>Each chapter is one full memory card — scenario, choices, correct answer, and explanation together.</li>
        </ol>
        <h3>No-JS fallbacks</h3>
        <p>Use Memory Drill / Memory Scroll if the Interactive App will not run on your device.</p>
      `,
    })
  );

  // Helper: render one full memory card (scenario + Q + answers + explanation)
  function memoryCardHtml(q, i, { headingTag = 'h2' } = {}) {
    const correct = q.choices.find((c) => c.correct);
    const choices = q.choices
      .map((c) => {
        const cls = c.correct ? ' class="is-correct"' : '';
        const tag = c.correct ? ' <span class="tag">CORRECT</span>' : '';
        return `<li${cls}><span class="letter">${escapeHtml(c.id)}.</span> ${escapeHtml(c.text)}${tag}</li>`;
      })
      .join('\n');
    // Always include the full scenario on the same page as Q/A/explanation (Scribe-friendly)
    const scenarioBlock = q.scenario
      ? `<div class="scenario-box"><h3>Scenario</h3>${paragraphsHtml(q.scenario)}</div>`
      : '';

    return `
      <article class="memory-card" id="${escapeHtml(q.id)}">
        <p class="meta">${escapeHtml(q.id)} · Card ${i + 1} of ${flat.length} · ${escapeHtml(q.groupTitle)}</p>
        <${headingTag}>${escapeHtml(q.id)}</${headingTag}>
        ${scenarioBlock}
        <h3>Question</h3>
        ${paragraphsHtml(q.stem)}
        <h3>Choices</h3>
        <ul class="choices">${choices}</ul>
        <div class="answer-block">
          <p class="correct">Remember: ${escapeHtml(correct?.id || '?')}. ${escapeHtml(correct?.text || '')}</p>
          <div class="explain">
            <h3>Explanation</h3>
            ${paragraphsHtml(q.explanation || '')}
          </div>
        </div>
      </article>`;
  }

  // Memory Drill — one full card per page with prev/next
  flat.forEach((q, i) => {
    const n = String(i + 1).padStart(3, '0');
    const prev = i > 0 ? `mem-${String(i).padStart(3, '0')}.html` : '';
    const next = i + 1 < flat.length ? `mem-${String(i + 2).padStart(3, '0')}.html` : '';
    const nav = `
      <p class="navrow">
        <a href="index.html">Home</a>
        <a href="memory.html">Scroll</a>
        ${prev ? `<a href="${prev}">← Prev</a>` : ''}
        ${next ? `<a class="btn-primary" href="${next}">Next →</a>` : `<a class="btn-primary" href="index.html">Done ✓</a>`}
      </p>`;
    write(
      path.join(OUT_HTML, `mem-${n}.html`),
      pageShell({
        title: `Memory ${i + 1}`,
        crumb: nav,
        body: `${memoryCardHtml(q, i)}${nav}`,
      })
    );
  });

  // Memory Scroll — all cards on one page for rapid review
  const scrollCards = flat
    .map((q, i) => memoryCardHtml(q, i, { headingTag: 'h2' }))
    .join('\n<hr/>\n');
  write(
    path.join(OUT_HTML, 'memory.html'),
    pageShell({
      title: 'Memory Scroll',
      crumb: `<p class="navrow"><a href="index.html">← Home</a><a class="btn-primary" href="mem-001.html">Drill mode</a></p>`,
      body: `
        <h2>Memory Scroll</h2>
        <p class="meta">All ${flat.length} cards with scenario, answer, and explanation on each card. Scroll and absorb.</p>
        ${scrollCards}
      `,
    })
  );

  // Short URL pack for Kindle Scribe: /k/ and /k/1 ... /k/79
  buildShortUrlPack(flat, memoryCardHtml);

  // Interactive Memory — single-page viewer (tiny vanilla JS; degrades to drill links)
  const interactivePayload = flat.map((q) => ({
    id: q.id,
    groupTitle: q.groupTitle,
    scenario: q.scenario || '',
    stem: q.stem,
    choices: q.choices.map((c) => ({ id: c.id, text: c.text, correct: !!c.correct })),
    explanation: q.explanation || '',
  }));
  write(
    path.join(OUT_HTML, 'memory-interactive.html'),
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Interactive Memory — CertSim</title>
  <link rel="stylesheet" href="styles.css"/>
  <style>
    #card { min-height: 50vh; }
    .big-nav a, .big-nav button {
      display: inline-block; width: 46%; text-align: center;
      padding: 1rem; margin: 0.4rem 1%; font-size: 1.1rem;
      border: 2px solid #000; background: #f0f0f0; font-weight: 700;
      font-family: "Helvetica Neue", Arial, sans-serif; cursor: pointer;
    }
    .big-nav .next { background: #000; color: #fff; }
    noscript .fallback a { display: block; margin: 0.5rem 0; }
  </style>
</head>
<body>
  <header class="appbar">
    <h1>CertSim — Interactive Memory</h1>
    <p class="sub">Scenario + question + answer + explanation on every card</p>
  </header>
  <div class="wrap">
    <p class="navrow"><a href="index.html">← Home</a><a href="mem-001.html">No-JS drill</a><a href="memory.html">Scroll all</a></p>
    <p class="meta" id="progress">Loading…</p>
    <div id="card" class="memory-card"></div>
    <div class="big-nav">
      <button type="button" id="prevBtn">← Previous</button>
      <button type="button" id="nextBtn" class="next">Next →</button>
    </div>
    <noscript>
      <div class="fallback note">
        <p>JavaScript is off. Use the no-JS Memory Drill instead:</p>
        <a href="mem-001.html">Open Memory Drill →</a>
      </div>
    </noscript>
  </div>
  <script>
    var CARDS = ${JSON.stringify(interactivePayload)};
    var i = 0;
    function esc(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function paras(s) {
      return esc(s).split(/\\n\\n+/).filter(Boolean).map(function (p) {
        return '<p>' + p.replace(/\\n/g, '<br/>') + '</p>';
      }).join('');
    }
    function render() {
      var q = CARDS[i];
      if (!q) return;
      document.getElementById('progress').textContent = q.id + ' · Card ' + (i+1) + ' of ' + CARDS.length + ' · ' + q.groupTitle;
      var choices = q.choices.map(function (c) {
        var cls = c.correct ? ' class="is-correct"' : '';
        var tag = c.correct ? ' <span class="tag">CORRECT</span>' : '';
        return '<li' + cls + '><span class="letter">' + esc(c.id) + '.</span> ' + esc(c.text) + tag + '</li>';
      }).join('');
      var scenario = q.scenario
        ? '<div class="scenario-box"><h3>Scenario</h3>' + paras(q.scenario) + '</div>'
        : '';
      var correct = q.choices.filter(function (c) { return c.correct; })[0] || {};
      document.getElementById('card').innerHTML =
        '<h2>' + esc(q.id) + '</h2>' +
        scenario +
        '<h3>Question</h3>' + paras(q.stem) +
        '<h3>Choices</h3><ul class="choices">' + choices + '</ul>' +
        '<div class="answer-block"><p class="correct">Remember: ' + esc(correct.id) + '. ' + esc(correct.text) + '</p>' +
        '<div class="explain"><h3>Explanation</h3>' + paras(q.explanation) + '</div></div>';
      document.getElementById('prevBtn').disabled = i === 0;
      document.getElementById('nextBtn').textContent = i >= CARDS.length - 1 ? 'Done ✓' : 'Next →';
    }
    document.getElementById('prevBtn').onclick = function () { if (i > 0) { i--; render(); window.scrollTo(0,0); } };
    document.getElementById('nextBtn').onclick = function () {
      if (i < CARDS.length - 1) { i++; render(); window.scrollTo(0,0); }
      else { window.location.href = 'index.html'; }
    };
    render();
  </script>
</body>
</html>`
  );

  // Per-scenario pages
  groups.forEach((g, gi) => {
    const qLinks = g.questions
      .map(
        (q) =>
          `<a href="q-${q.id.toLowerCase()}.html">${escapeHtml(q.id)} — ${escapeHtml(q.stem.slice(0, 90))}${q.stem.length > 90 ? '…' : ''}</a>`
      )
      .join('\n');

    const prev = groups[gi - 1];
    const next = groups[gi + 1];
    const nav = `
      <p class="navrow">
        <a href="index.html">Home</a>
        ${prev ? `<a href="${prev.id}.html">← ${escapeHtml(prev.title)}</a>` : ''}
        ${next ? `<a href="${next.id}.html">${escapeHtml(next.title)} →</a>` : ''}
      </p>`;

    const scenarioBlock = g.scenario
      ? `<div class="scenario-box"><h3>Scenario</h3>${paragraphsHtml(g.scenario)}</div>`
      : `<p class="meta">Standalone knowledge questions (no shared scenario).</p>`;

    write(
      path.join(OUT_HTML, `${g.id}.html`),
      pageShell({
        title: g.title,
        crumb: nav,
        body: `
          <h2>${escapeHtml(g.title)}</h2>
          <p class="meta">${g.questions.length} question${g.questions.length === 1 ? '' : 's'}</p>
          ${scenarioBlock}
          <h3>Questions</h3>
          <div class="toc">${qLinks}</div>
        `,
      })
    );
  });

  // Individual question pages
  flat.forEach((q, i) => {
    const prev = flat[i - 1];
    const next = flat[i + 1];
    const correct = q.choices.find((c) => c.correct);
    const choices = q.choices
      .map(
        (c) =>
          `<li><span class="letter">${escapeHtml(c.id)}.</span> ${escapeHtml(c.text)}</li>`
      )
      .join('\n');

    const nav = `
      <p class="navrow">
        <a href="index.html">Home</a>
        <a href="${q.groupId}.html">${escapeHtml(q.groupTitle)}</a>
        ${prev ? `<a href="q-${prev.id.toLowerCase()}.html">← Prev</a>` : ''}
        ${next ? `<a href="q-${next.id.toLowerCase()}.html">Next →</a>` : ''}
      </p>`;

    const scenarioReminder = q.scenario
      ? `<p class="meta"><a href="${q.groupId}.html">Read full scenario: ${escapeHtml(q.groupTitle)}</a></p>`
      : '';

    write(
      path.join(OUT_HTML, `q-${q.id.toLowerCase()}.html`),
      pageShell({
        title: q.id,
        crumb: nav,
        body: `
          <p class="meta">${escapeHtml(q.id)} · ${i + 1} of ${flat.length} · ${escapeHtml(q.domain || 'General')}</p>
          <h2>${escapeHtml(q.id)}</h2>
          ${scenarioReminder}
          ${paragraphsHtml(q.stem)}
          <h3>Choices</h3>
          <ul class="choices">${choices}</ul>
          <details class="answer">
            <summary>Reveal answer &amp; explanation</summary>
            <p class="correct">Correct: ${escapeHtml(correct?.id || '?')}. ${escapeHtml(correct?.text || '')}</p>
            ${paragraphsHtml(q.explanation || 'No explanation provided.')}
            <p><a href="a-${q.id.toLowerCase()}.html">Open answer on its own page →</a></p>
          </details>
          ${nav}
        `,
      })
    );

    // Separate answer page for browsers that struggle with <details>
    write(
      path.join(OUT_HTML, `a-${q.id.toLowerCase()}.html`),
      pageShell({
        title: `${q.id} Answer`,
        crumb: `<p class="navrow"><a href="q-${q.id.toLowerCase()}.html">← Back to question</a>${next ? `<a href="q-${next.id.toLowerCase()}.html">Next question →</a>` : '<a href="index.html">Home</a>'}</p>`,
        body: `
          <h2>${escapeHtml(q.id)} — Answer</h2>
          <p class="correct">Correct: ${escapeHtml(correct?.id || '?')}. ${escapeHtml(correct?.text || '')}</p>
          <h3>Explanation</h3>
          ${paragraphsHtml(q.explanation || 'No explanation provided.')}
        `,
      })
    );
  });

  // All questions list
  const allLinks = flat
    .map(
      (q) =>
        `<a href="q-${q.id.toLowerCase()}.html">${escapeHtml(q.id)} — ${escapeHtml(q.stem.slice(0, 100))}${q.stem.length > 100 ? '…' : ''}</a>`
    )
    .join('\n');
  write(
    path.join(OUT_HTML, 'all-questions.html'),
    pageShell({
      title: 'All questions',
      crumb: `<p class="navrow"><a href="index.html">← Home</a></p>`,
      body: `<h2>All questions</h2><div class="toc">${allLinks}</div>`,
    })
  );

  // Flashcards: Q page → A page pairs
  const flashLinks = flat
    .map(
      (q, i) =>
        `<a href="fc-q-${String(i + 1).padStart(3, '0')}.html">Card ${i + 1}: ${escapeHtml(q.id)}</a>`
    )
    .join('\n');

  write(
    path.join(OUT_HTML, 'flashcards.html'),
    pageShell({
      title: 'Flashcards',
      crumb: `<p class="navrow"><a href="index.html">← Home</a><a class="btn-primary" href="fc-q-001.html">Start flashcards</a></p>`,
      body: `
        <h2>Quick flashcards</h2>
        <p>Question first. Decide your answer. Then go to the answer page. Ideal for rapid Kindle study sessions.</p>
        <div class="toc">${flashLinks}</div>
      `,
    })
  );

  flat.forEach((q, i) => {
    const n = String(i + 1).padStart(3, '0');
    const nextN = String(i + 2).padStart(3, '0');
    const correct = q.choices.find((c) => c.correct);
    const choices = q.choices
      .map(
        (c) =>
          `<li><span class="letter">${escapeHtml(c.id)}.</span> ${escapeHtml(c.text)}</li>`
      )
      .join('\n');

    write(
      path.join(OUT_HTML, `fc-q-${n}.html`),
      pageShell({
        title: `Flashcard ${i + 1}`,
        crumb: `<p class="navrow"><a href="flashcards.html">Deck</a>${i > 0 ? `<a href="fc-q-${String(i).padStart(3, '0')}.html">← Prev</a>` : ''}</p>`,
        body: `
          <div class="flash-q">
            <p class="meta">Flashcard ${i + 1} of ${flat.length} · ${escapeHtml(q.id)}</p>
            <h2>Question</h2>
            ${q.scenario ? `<p class="meta">Scenario: ${escapeHtml(q.groupTitle)} — recall it, then answer.</p>` : ''}
            ${paragraphsHtml(q.stem)}
            <ul class="choices">${choices}</ul>
            <p class="navrow"><a class="btn-primary" href="fc-a-${n}.html">Show answer →</a></p>
          </div>
        `,
      })
    );

    write(
      path.join(OUT_HTML, `fc-a-${n}.html`),
      pageShell({
        title: `Answer ${i + 1}`,
        crumb: `<p class="navrow"><a href="fc-q-${n}.html">← Question</a></p>`,
        body: `
          <div class="flash-a">
            <p class="meta">Flashcard ${i + 1} of ${flat.length} · ${escapeHtml(q.id)}</p>
            <h2>Answer</h2>
            <p class="correct">${escapeHtml(correct?.id || '?')}. ${escapeHtml(correct?.text || '')}</p>
            ${paragraphsHtml(q.explanation || '')}
            <p class="navrow">
              ${i + 1 < flat.length ? `<a class="btn-primary" href="fc-q-${nextN}.html">Next card →</a>` : `<a class="btn-primary" href="flashcards.html">Deck complete ✓</a>`}
            </p>
          </div>
        `,
      })
    );
  });

  // Answer key
  const keyRows = flat
    .map((q) => {
      const c = q.choices.find((x) => x.correct);
      return `<p><strong>${escapeHtml(q.id)}</strong> — ${escapeHtml(c?.id || '?')}. ${escapeHtml(c?.text || '')}</p>`;
    })
    .join('\n');
  write(
    path.join(OUT_HTML, 'answer-key.html'),
    pageShell({
      title: 'Answer key',
      crumb: `<p class="navrow"><a href="index.html">← Home</a></p>`,
      body: `<h2>Answer key</h2><p class="meta">${flat.length} questions</p>${keyRows}`,
    })
  );

  // Manifest for the web app
  write(
    path.join(OUT_HTML, 'manifest.json'),
    JSON.stringify(
      {
        version: '2.2.0',
        mode: 'interactive',
        generatedAt: new Date().toISOString(),
        questionCount: questions.length,
        scenarioGroups: groups.length,
        epub: `../kindle-export/${EPUB_NAME}`,
        entry: 'app.html',
        interactive: 'app.html',
        memoryDrill: 'mem-001.html',
        scroll: 'memory.html',
      },
      null,
      2
    )
  );

  return { flat, groups };
}

/**
 * Short-URL Scribe pack:
 *   /k/      → hub
 *   /k/1 …  → card pages with full scenario + Q + answer + explanation
 */
function buildShortUrlPack(flat, memoryCardHtml) {
  const out = path.join(ROOT, 'public', 'k');
  rimraf(out);
  ensureDir(out);

  // Reuse kindle stylesheet via relative link
  const shell = (title, body) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="../kindle/styles.css"/>
  <style>
    .scribe-help { border: 2px solid #000; padding: 0.8rem; margin: 0 0 1rem; }
    .big-start {
      display: block; text-align: center; font-size: 1.3rem; font-weight: 700;
      padding: 1.1rem; margin: 0.6rem 0; border: 3px solid #000;
      background: #000; color: #fff; text-decoration: none;
      font-family: "Helvetica Neue", Arial, sans-serif;
    }
    .urlbox {
      font-family: "Helvetica Neue", Arial, sans-serif; font-size: 1.05rem;
      border: 2px solid #000; padding: 0.7rem; margin: 0.7rem 0; word-break: break-all;
    }
  </style>
</head>
<body>
  <header class="appbar">
    <h1>CertSim · Scribe Study</h1>
    <p class="sub">Scenario + Question + Answer + Explanation on every page</p>
  </header>
  <div class="wrap">
    ${body}
  </div>
</body>
</html>`;

  write(
    path.join(out, 'index.html'),
    shell(
      'CertSim · /k',
      `
      <h2>Start here</h2>
      <div class="scribe-help">
        <p><strong>On Kindle Scribe:</strong> open Experimental Browser and type this short URL:</p>
        <div class="urlbox">grcjp.github.io/certsim/k</div>
        <p>Each page keeps the <strong>full scenario with the question, correct answer, and explanation</strong>.</p>
      </div>
      <a class="big-start" href="1.html">Start card 1 →</a>
      <p class="navrow">
        <a href="../kindle/app.html">Interactive app</a>
        <a href="../kindle/memory.html">Scroll all</a>
      </p>
      <h3>Jump to a card</h3>
      <div class="toc">
        ${flat
          .map(
            (q, i) =>
              `<a href="${i + 1}.html"><span>${i + 1}. ${escapeHtml(q.id)}</span><span class="count">${escapeHtml(q.groupTitle).slice(0, 24)}</span></a>`
          )
          .join('\n')}
      </div>
    `
    )
  );

  flat.forEach((q, i) => {
    const num = i + 1;
    const prev = num > 1 ? `${num - 1}.html` : '';
    const next = num < flat.length ? `${num + 1}.html` : '';
    const nav = `
      <p class="navrow">
        <a href="index.html">/k home</a>
        ${prev ? `<a href="${prev}">← ${num - 1}</a>` : ''}
        ${next ? `<a class="btn-primary" href="${next}">${num + 1} →</a>` : `<a class="btn-primary" href="index.html">Done ✓</a>`}
      </p>`;
    write(
      path.join(out, `${num}.html`),
      shell(
        `Card ${num}`,
        `${nav}${memoryCardHtml(q, i)}${nav}`
      )
    );
  });

  write(
    path.join(out, 'manifest.json'),
    JSON.stringify(
      {
        shortUrl: 'grcjp.github.io/certsim/k',
        entry: 'index.html',
        cards: flat.length,
        layout: 'full-scenario-per-page',
      },
      null,
      2
    )
  );
}

/**
 * Single-file interactive app that mirrors the web app's Practice / Memory / Missed flows.
 * Vanilla ES5 JS for Kindle Fire Silk + Experimental Browser compatibility.
 */
function buildInteractiveApp(flat) {
  const css = fs.readFileSync(path.join(ROOT, 'scripts', 'kindle-app.css.tpl'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'scripts', 'kindle-app.js.tpl'), 'utf8');
  const payload = flat.map((q) => ({
    id: q.id,
    groupTitle: q.groupTitle,
    scenario: q.scenario || '',
    stem: q.stem,
    choices: q.choices.map((c) => ({
      id: c.id,
      text: c.text,
      correct: !!c.correct,
    })),
    explanation: q.explanation || '',
  }));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <title>CertSim Interactive — Kindle App</title>
  <style>
${css}
  </style>
</head>
<body>
  <div id="app">
    <div class="brand">
      <h1>CertSim</h1>
      <p>Interactive Kindle App · Practice · Memory · Review</p>
    </div>
    <div id="screen">
      <div class="panel">
        <h2>Loading…</h2>
        <p>If this does not change, open <a href="mem-001.html">Memory Drill (no JS)</a>.</p>
      </div>
    </div>
  </div>
  <noscript>
    <div class="panel" style="margin:1rem">
      <h2>JavaScript required for the interactive app</h2>
      <p><a href="mem-001.html">Open Memory Drill instead →</a></p>
    </div>
  </noscript>
  <script>
    window.CERTSIM_CARDS = ${JSON.stringify(payload)};
  </script>
  <script>
${js}
  </script>
</body>
</html>`;

  write(path.join(OUT_HTML, 'app.html'), html);
  write(path.join(OUT_HTML, 'app.css'), css);
}

function buildEpub(questions, groups, flat) {
  ensureDir(OUT_EPUB_DIR);
  const work = path.join(OUT_EPUB_DIR, '_epub_build');
  rimraf(work);
  ensureDir(path.join(work, 'META-INF'));
  ensureDir(path.join(work, 'OEBPS'));

  write(path.join(work, 'mimetype'), 'application/epub+zip');
  write(
    path.join(work, 'META-INF', 'container.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  write(
    path.join(work, 'OEBPS', 'styles.css'),
    `body{font-family:serif;line-height:1.5;margin:1em;color:#000;background:#fff;}
h1,h2,h3{font-family:sans-serif;}
.correct{font-weight:bold;margin:0.8em 0;border-left:3px solid #000;padding-left:0.5em;}
.choices{list-style:none;padding:0;}
.choices li{margin:0.45em 0;padding:0.35em 0;border-bottom:1px solid #ccc;}
.choices li.ok{font-weight:bold;}
.tag{font-family:sans-serif;font-size:0.8em;border:1px solid #000;padding:0 0.3em;margin-left:0.3em;}
.meta{font-size:0.9em;color:#333;font-family:sans-serif;}
.scenario{border:1px solid #000;padding:0.8em;margin:0.8em 0;}
.explain{border:1px solid #000;padding:0.7em;margin:0.7em 0;background:#f7f7f7;}
.pagebreak{page-break-before:always;}`
  );

  const xhtml = (title, body) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
${body}
</body>
</html>`;

  const spine = [];
  const manifest = [];
  const navPoints = [];
  let playOrder = 1;

  function addChapter(id, title, body) {
    const href = `${id}.xhtml`;
    write(path.join(work, 'OEBPS', href), xhtml(title, body));
    manifest.push(
      `<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`
    );
    spine.push(`<itemref idref="${id}"/>`);
    navPoints.push(`<navPoint id="nav-${id}" playOrder="${playOrder++}">
  <navLabel><text>${escapeHtml(title)}</text></navLabel>
  <content src="${href}"/>
</navPoint>`);
  }

  addChapter(
    'title',
    'Title',
    `<h1>CertSim</h1>
     <h2>Memory Edition</h2>
     <p>${questions.length} memory cards. Each card shows scenario, question, correct answer, and explanation together — built for memorization.</p>
     <p class="meta">Version 2.1 · Generated ${new Date().toISOString().slice(0, 10)}</p>`
  );

  addChapter(
    'toc',
    'Contents',
    `<h1>Contents</h1>
     <ol>
       ${groups.map((g) => `<li><a href="${g.id}.xhtml">${escapeHtml(g.title)} (${g.questions.length})</a></li>`).join('\n')}
       <li><a href="answer-key.xhtml">Answer key</a></li>
     </ol>`
  );

  groups.forEach((g) => {
    const body = `
      <h1>${escapeHtml(g.title)}</h1>
      ${
        g.scenario
          ? `<div class="scenario"><h2>Scenario</h2>${paragraphsHtml(g.scenario)}</div>`
          : '<p class="meta">Standalone knowledge questions.</p>'
      }
      <p>Memory cards in this section:</p>
      <ol>
        ${g.questions.map((q) => `<li><a href="mem-${q.id.toLowerCase()}.xhtml">${escapeHtml(q.id)}</a> — ${escapeHtml(q.stem.slice(0, 80))}${q.stem.length > 80 ? '…' : ''}</li>`).join('\n')}
      </ol>`;
    addChapter(g.id, g.title, body);
  });

  flat.forEach((q, i) => {
    const correct = q.choices.find((c) => c.correct);
    const choices = q.choices
      .map((c) => {
        const cls = c.correct ? ' class="ok"' : '';
        const tag = c.correct ? ' <span class="tag">CORRECT</span>' : '';
        return `<li${cls}><strong>${escapeHtml(c.id)}.</strong> ${escapeHtml(c.text)}${tag}</li>`;
      })
      .join('\n');
    // Full scenario on every chapter so Scribe/EPUB never splits context away
    const scenarioBlock = q.scenario
      ? `<div class="scenario"><h2>Scenario</h2>${paragraphsHtml(q.scenario)}</div>`
      : '';

    addChapter(
      `mem-${q.id.toLowerCase()}`,
      q.id,
      `<p class="meta">${escapeHtml(q.id)} · Card ${i + 1} of ${flat.length} · ${escapeHtml(q.groupTitle)}</p>
       <h1>${escapeHtml(q.id)}</h1>
       ${scenarioBlock}
       <h2>Question</h2>
       ${paragraphsHtml(q.stem)}
       <h2>Choices</h2>
       <ul class="choices">${choices}</ul>
       <p class="correct">Remember: ${escapeHtml(correct?.id || '?')}. ${escapeHtml(correct?.text || '')}</p>
       <div class="explain"><h2>Explanation</h2>${paragraphsHtml(q.explanation || '')}</div>`
    );
  });

  const keyBody = flat
    .map((q) => {
      const c = q.choices.find((x) => x.correct);
      return `<p><strong>${escapeHtml(q.id)}</strong> — ${escapeHtml(c?.id || '?')}. ${escapeHtml(c?.text || '')}</p>`;
    })
    .join('\n');
  addChapter('answer-key', 'Answer key', `<h1>Answer key</h1>${keyBody}`);

  const bookId = `urn:uuid:${createHash('sha1').update('certsim-kindle-v1').digest('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12}).*/, '$1-$2-$3-$4-$5')}`;

  write(
    path.join(work, 'OEBPS', 'content.opf'),
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>CertSim — Memory Edition</dc:title>
    <dc:creator>CertSim</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:publisher>GRCJP</dc:publisher>
    <dc:description>Memory cards for CertSim — scenario, question, correct answer, and explanation together.</dc:description>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
    ${manifest.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spine.join('\n    ')}
  </spine>
</package>`
  );

  write(
    path.join(work, 'OEBPS', 'toc.ncx'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>CertSim — Memory Edition</text></docTitle>
  <navMap>
    ${navPoints.join('\n    ')}
  </navMap>
</ncx>`
  );

  // Zip into EPUB using Python (mimetype must be first and uncompressed)
  const epubPath = path.join(OUT_EPUB_DIR, EPUB_NAME);
  const py = `
import zipfile, os
work = r'''${work}'''
out = r'''${epubPath}'''
with zipfile.ZipFile(out, 'w') as z:
    # mimetype uncompressed first
    z.write(os.path.join(work, 'mimetype'), 'mimetype', compress_type=zipfile.ZIP_STORED)
    for root, dirs, files in os.walk(work):
        for f in files:
            if f == 'mimetype':
                continue
            full = os.path.join(root, f)
            rel = os.path.relpath(full, work).replace('\\\\', '/')
            z.write(full, rel, compress_type=zipfile.ZIP_DEFLATED)
print('Wrote', out, 'size', os.path.getsize(out))
`;
  execFileSync('python3', ['-c', py], { stdio: 'inherit' });
  rimraf(work);
  return epubPath;
}

function main() {
  const questions = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  if (!Array.isArray(questions) || questions.length === 0) {
    console.error('No questions found in', DATA);
    process.exit(1);
  }
  const groups = groupByScenario(questions);
  const { flat } = buildHtmlPack(questions, groups);
  const epubPath = buildEpub(questions, groups, flat);

  // Also copy EPUB into public for web download
  ensureDir(path.join(ROOT, 'public', 'kindle-export'));
  fs.copyFileSync(epubPath, path.join(ROOT, 'public', 'kindle-export', EPUB_NAME));

  console.log(`✓ Kindle HTML pack: ${OUT_HTML} (${flat.length} questions, ${groups.length} groups)`);
  console.log(`✓ EPUB: ${epubPath}`);
  console.log(`✓ Public copy: public/kindle-export/${EPUB_NAME}`);
}

main();
