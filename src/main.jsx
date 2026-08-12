// Main application entry point
// Updated: 2025-01-10 - Fixed redirect URI trim
// Build trigger: Using Supabase publishable key (sb_publishable_*)
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LocalAuthProvider } from './lib/localAuth'
import { TestModeProvider } from './contexts/TestModeContext'
import './index.css'
import App from './App.jsx'

function showFatalError(err) {
  const rootEl = document.getElementById('root');
  if (!rootEl) return;
  const message = err && err.message ? err.message : String(err);
  rootEl.innerHTML = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 16px;">
      <h1 style="font-size: 18px; margin: 0 0 8px;">App Error</h1>
      <pre style="white-space: pre-wrap; word-break: break-word; font-size: 12px;">${message}</pre>
    </div>
  `;
}

window.addEventListener('error', (e) => {
  if (e && e.error) showFatalError(e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  showFatalError(e && e.reason ? e.reason : e);
});

try {
  // Verify Supabase environment variables in production
  if (import.meta.env.PROD) {
    console.log('=== Production Environment Check ===');
    console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('VITE_SUPABASE_ANON_KEY present:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
    console.log('=== End Environment Check ===');
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <LocalAuthProvider>
        <TestModeProvider>
          <App />
        </TestModeProvider>
      </LocalAuthProvider>
    </StrictMode>,
  );
} catch (err) {
  console.error('Error in main.jsx:', err);
  showFatalError(err);
}
