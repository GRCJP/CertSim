import React, { useEffect, useState } from 'react';
import { useTestMode } from '../contexts/TestModeContext';

/**
 * Hub for the Kindle interactive app + offline memory exports.
 */
const KindleHub = () => {
  const { darkMode, setMode } = useTestMode();
  const [manifest, setManifest] = useState(null);
  const [error, setError] = useState('');

  const base = import.meta.env.BASE_URL || '/';
  const kindleBase = `${base}kindle/`;
  const appHref = `${kindleBase}app.html`;
  const epubHref = `${base}kindle-export/CertSim-Memory.epub`;

  useEffect(() => {
    let cancelled = false;
    fetch(`${kindleBase}manifest.json`)
      .then((r) => {
        if (!r.ok) throw new Error('Kindle pack not generated yet');
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setManifest(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load Kindle pack');
      });
    return () => {
      cancelled = true;
    };
  }, [kindleBase]);

  const card = darkMode
    ? 'bg-slate-800 border border-slate-600'
    : 'bg-white border border-slate-200 shadow-sm';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Kindle Interactive App
          </h1>
          <p className={`mt-1 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Same study flow as the web app — tap answers, get feedback, read explanations, track
            progress — without needing React.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMode('dashboard')}
          className={`px-3 py-2 text-sm rounded-lg border ${
            darkMode ? 'border-slate-600 text-slate-200' : 'border-slate-300'
          }`}
        >
          ← Home
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-amber-500 bg-amber-50 text-amber-950 text-sm">
          {error}. Run <code className="font-mono">npm run kindle</code> to generate the pack.
        </div>
      )}

      {manifest && (
        <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Pack v{manifest.version} · {manifest.questionCount} questions · entry{' '}
          {manifest.entry || 'app.html'}
        </p>
      )}

      <div className={`rounded-xl p-5 mb-4 ${card} border-2 border-teal-600`}>
        <h2 className="font-bold text-lg mb-2">Kindle Scribe — type this URL</h2>
        <p
          className={`font-mono text-base sm:text-lg my-3 break-all ${
            darkMode ? 'text-teal-200' : 'text-teal-900'
          }`}
        >
          grcjp.github.io/certsim/k
        </p>
        <p className={`text-sm mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          Opens simple webpages in Experimental Browser. Every page has the full scenario with the
          question, correct answer, and explanation — then tap Next.
        </p>
        <a
          href={`${base}k/`}
          target="_blank"
          rel="noreferrer"
          className="inline-block px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold"
        >
          Open /k pages →
        </a>
      </div>

      <a
        href={appHref}
        target="_blank"
        rel="noreferrer"
        className={`block rounded-xl p-5 mb-4 ${card}`}
      >
        <h2 className="font-bold text-lg mb-2">Interactive App (Fire / phone)</h2>
        <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          Practice Mode (tap to answer), Memory Drill, Review Missed, on-device progress.
        </p>
      </a>

      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <a
          href={`${kindleBase}mem-001.html`}
          target="_blank"
          rel="noreferrer"
          className={`block rounded-xl p-5 ${card}`}
        >
          <h2 className="font-bold mb-2">No-JS Memory Drill</h2>
          <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Fallback for e-ink Experimental Browser if the app will not run.
          </p>
        </a>
        <a
          href={epubHref}
          download
          className={`block rounded-xl p-5 ${card}`}
        >
          <h2 className="font-bold mb-2">Memory EPUB</h2>
          <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Sideload for Paperwhite / Oasis / Scribe reading.
          </p>
        </a>
      </div>

      <div className={`rounded-xl p-5 ${card}`}>
        <h2 className="font-bold text-lg mb-2">What the Kindle app can do</h2>
        <ul className={`list-disc pl-5 text-sm space-y-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          <li>Tap A / B / C and see correct vs incorrect immediately</li>
          <li>Read the explanation on the same screen</li>
          <li>Switch to Memory Drill (answer always shown)</li>
          <li>Review only missed questions</li>
          <li>Save progress on the device between sessions</li>
        </ul>
        <button
          type="button"
          onClick={() => setMode('rapidMemory')}
          className="mt-4 px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold"
        >
          Or use Memory in the web app
        </button>
      </div>
    </div>
  );
};

export default KindleHub;
