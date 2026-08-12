#!/usr/bin/env node
/**
 * Smoke tests for the generated Kindle study pack.
 * Validates structure, link integrity, and EPUB zip layout.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const KINDLE = path.join(ROOT, 'public', 'kindle');
const EPUB = path.join(ROOT, 'kindle-export', 'CertSim-Memory.epub');

// Derive expectations from the actual bank so the pack tests are bank-agnostic.
const COUNT = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'questions.json'), 'utf8')).length;
const pad3 = (n) => String(n).padStart(3, '0');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK  ', msg);
  }
}

function main() {
  assert(fs.existsSync(path.join(KINDLE, 'index.html')), 'index.html exists');
  assert(fs.existsSync(path.join(KINDLE, 'styles.css')), 'styles.css exists');
  assert(fs.existsSync(path.join(KINDLE, 'app.html')), 'interactive app exists');
  assert(fs.existsSync(path.join(KINDLE, 'memory.html')), 'memory scroll exists');
  assert(fs.existsSync(path.join(KINDLE, 'mem-001.html')), 'memory drill card 1 exists');
  assert(fs.existsSync(path.join(KINDLE, 'answer-key.html')), 'answer-key.html exists');
  assert(fs.existsSync(path.join(KINDLE, 'manifest.json')), 'manifest.json exists');
  assert(fs.existsSync(EPUB), 'EPUB exists');

  const manifest = JSON.parse(fs.readFileSync(path.join(KINDLE, 'manifest.json'), 'utf8'));
  assert(manifest.questionCount === COUNT, `manifest questionCount is ${COUNT} (got ${manifest.questionCount})`);
  assert(manifest.scenarioGroups >= 1, `scenario groups >= 1 (got ${manifest.scenarioGroups})`);
  assert(manifest.entry === 'app.html', 'manifest entry is app.html');

  const index = fs.readFileSync(path.join(KINDLE, 'index.html'), 'utf8');
  assert(!/react\.|createRoot|type="module"/.test(index), 'index.html has no React/module dependency');
  assert(index.includes('styles.css'), 'index.html links stylesheet');
  assert(/<!DOCTYPE html>/i.test(index), 'index.html has doctype');
  assert(index.includes('app.html'), 'index promotes Interactive App');

  const app = fs.readFileSync(path.join(KINDLE, 'app.html'), 'utf8');
  assert(app.includes('CERTSIM_CARDS'), 'app embeds question data');
  assert(app.includes('Practice Mode'), 'app has Practice Mode');
  assert(app.includes('Memory Drill') || app.includes("memory"), 'app has Memory mode');
  assert(app.includes('localStorage'), 'app persists progress');
  assert(app.includes('data-choice') || app.includes('selectChoice'), 'app supports answer selection');
  assert(!/react-dom|createRoot|from 'react'/.test(app), 'app is not React');
  assert((app.match(/"id":"Q\d+"/g) || []).length >= COUNT, 'app embeds all question ids');
  // Memory card shows scenario + answer + explanation together
  const mem1 = fs.readFileSync(path.join(KINDLE, 'mem-001.html'), 'utf8');
  assert(mem1.includes('Scenario') || mem1.includes('scenario'), 'memory card includes scenario');
  assert(mem1.includes('CORRECT') || mem1.includes('Remember:'), 'memory card shows correct answer');
  assert(mem1.includes('Explanation'), 'memory card shows explanation');
  assert(mem1.includes('is-correct') || mem1.includes('Remember:'), 'correct choice is highlighted');
  assert(mem1.includes('mem-002.html'), 'memory card links to next');

  const scroll = fs.readFileSync(path.join(KINDLE, 'memory.html'), 'utf8');
  assert((scroll.match(/memory-card/g) || []).length >= COUNT, 'scroll page has all memory cards');

  // No modern JS module files in kindle pack
  const files = fs.readdirSync(KINDLE);
  const jsModules = files.filter((f) => f.endsWith('.js') || f.endsWith('.jsx'));
  assert(jsModules.length === 0, 'Kindle pack contains zero JS modules');

  assert(fs.existsSync(path.join(KINDLE, `mem-${pad3(COUNT)}.html`)), 'last memory card exists');

  // Short URL Scribe pack: /k/
  const K = path.join(ROOT, 'public', 'k');
  assert(fs.existsSync(path.join(K, 'index.html')), '/k/index.html exists');
  assert(fs.existsSync(path.join(K, '1.html')), '/k/1.html exists');
  assert(fs.existsSync(path.join(K, `${COUNT}.html`)), `/k/${COUNT}.html exists`);
  const k2 = fs.readFileSync(path.join(K, '2.html'), 'utf8');
  // Card 2 must still include the full scenario text (not "continuing")
  assert(k2.includes('Scenario'), '/k/2 includes Scenario heading');
  assert(!k2.includes('continuing'), '/k/2 does not omit scenario as continuing');
  assert(k2.includes('Remember:') || k2.includes('CORRECT'), '/k/2 shows answer');
  assert(k2.includes('Explanation'), '/k/2 shows explanation');
  // mem-002 also keeps full scenario now
  const mem2 = fs.readFileSync(path.join(KINDLE, 'mem-002.html'), 'utf8');
  assert(mem2.includes('Scenario'), 'mem-002 keeps full scenario');
  assert(!mem2.includes('same as previous'), 'mem-002 does not defer scenario');

  // Link integrity: collect hrefs from index and ensure targets exist
  const hrefs = [...index.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of hrefs) {
    if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) continue;
    const target = path.join(KINDLE, href);
    assert(fs.existsSync(target), `index link target exists: ${href}`);
  }

  // EPUB: mimetype first + uncompressed
  const py = `
import zipfile
z=zipfile.ZipFile(r'''${EPUB}''')
names=z.namelist()
assert names[0]=='mimetype', names[0]
info=z.getinfo('mimetype')
assert info.compress_type==0, info.compress_type
assert 'OEBPS/content.opf' in names
assert 'META-INF/container.xml' in names
print('epub entries', len(names))
`;
  try {
    const out = execFileSync('python3', ['-c', py], { encoding: 'utf8' });
    assert(true, `EPUB structure valid (${out.trim()})`);
  } catch (e) {
    assert(false, `EPUB structure invalid: ${e.message}`);
  }

  // Public copy
  assert(
    fs.existsSync(path.join(ROOT, 'public', 'kindle-export', 'CertSim-Memory.epub')),
    'public EPUB copy exists'
  );

  if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll Kindle pack checks passed.');
}

main();
