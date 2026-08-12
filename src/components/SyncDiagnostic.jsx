import React, { useState, useEffect } from 'react';
import { useTestMode } from '../contexts/TestModeContext';

const SyncDiagnostic = () => {
  const { user, isAuthenticated, syncDataFromCloud, syncDataToCloud, progressStreaks } = useTestMode();
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (test, success, message, data = null) => {
    setTestResults(prev => [...prev, { test, success, message, data, timestamp: new Date() }]);
  };

  const runDiagnostic = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    // Test 1: Authentication
    addResult('Authentication', isAuthenticated, 
      isAuthenticated ? '✅ User is authenticated' : '❌ User not authenticated',
      { email: user?.email, sub: user?.sub }
    );

    if (!isAuthenticated) {
      setIsRunning(false);
      return;
    }

    // Test 2: Environment Variables
    const envVars = {
      SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing',
    };
    addResult('Environment', true, '✅ Environment variables loaded', envVars);

    // Test 3: Sync From Cloud
    try {
      await syncDataFromCloud();
      addResult('Cloud Download', true, '✅ Data synced from cloud successfully');
    } catch (error) {
      addResult('Cloud Download', false, `❌ Cloud sync failed: ${error.message}`, { error: error.toString() });
      if (String(error?.message || '').toLowerCase().includes('auth')) {
        addResult('Re-Auth', false, '⚠️ Auth may be required. Try signing in again.');
      }
    }

    // Test 4: Sync To Cloud
    try {
      const testData = { 
        diagnosticTest: true, 
        timestamp: Date.now(),
        userAgent: navigator.userAgent.substring(0, 50)
      };
      await syncDataToCloud('diagnostic', testData);
      addResult('Cloud Upload', true, '✅ Data uploaded to cloud successfully', testData);
    } catch (error) {
      addResult('Cloud Upload', false, `❌ Cloud upload failed: ${error.message}`, { error: error.toString() });
    }

    // Test 5: Local Storage
    try {
      const localData = localStorage.getItem('cmmc_progressStreaks');
      addResult('Local Storage', true, '✅ Local storage accessible', { hasData: !!localData });
    } catch (error) {
      addResult('Local Storage', false, `❌ Local storage failed: ${error.message}`);
    }

    setIsRunning(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-sm max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Sync Diagnostic</h3>
        <div className="flex gap-2">
          <button
            onClick={clearResults}
            className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded"
          >
            Clear
          </button>
          <button
            onClick={runDiagnostic}
            disabled={isRunning}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {isRunning ? 'Running...' : 'Test Sync'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {testResults.map((result, index) => (
          <div key={index} className="text-xs border-b pb-2">
            <div className="flex items-center gap-2">
              <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                {result.success ? '✅' : '❌'}
              </span>
              <span className="font-medium">{result.test}</span>
            </div>
            <div className="text-gray-600 dark:text-gray-400 mt-1">
              {result.message}
            </div>
            {result.data && (
              <details className="mt-1">
                <summary className="cursor-pointer text-blue-600 dark:text-blue-400">
                  Details
                </summary>
                <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {testResults.length === 0 && (
        <div className="text-xs text-gray-500 text-center py-4">
          Click "Test Sync" to diagnose cross-device synchronization
        </div>
      )}
    </div>
  );
};

export default SyncDiagnostic;
