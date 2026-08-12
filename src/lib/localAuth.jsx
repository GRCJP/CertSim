import { createContext, useContext, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Temporary local credentials (replaces Auth0 for short-term personal use).
//
// NOTE: This is a lightweight client-side gate. The values below are compiled
// into the public JS bundle, so this is NOT real security — it only keeps
// casual visitors out. Fine for a personal study tool used for a week or two.
// Change the username/password here and rebuild to rotate.
// ---------------------------------------------------------------------------
const CREDENTIALS = {
  demo: 'certsim-2026',
};

const STORAGE_KEY = 'certsim_local_user';
const AuthContext = createContext(null);

export function LocalAuthProvider({ children }) {
  const [username, setUsername] = useState(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  // Mirrors Auth0's loginWithRedirect signature; prompts for local creds.
  const loginWithRedirect = useCallback(() => {
    const u = (window.prompt('Username:') || '').trim();
    if (!u) return;
    const p = window.prompt('Password:') || '';
    if (CREDENTIALS[u] && CREDENTIALS[u] === p) {
      localStorage.setItem(STORAGE_KEY, u);
      setUsername(u);
    } else {
      window.alert('Invalid username or password.');
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUsername(null);
  }, []);

  const isAuthenticated = Boolean(username);
  const user = isAuthenticated
    ? { sub: `local|${username}`, email: `${username}@local`, name: username }
    : undefined;

  const value = {
    isLoading: false,
    isAuthenticated,
    user,
    error: undefined,
    loginWithRedirect,
    logout,
    getAccessTokenSilently: async () => '',
    getIdTokenClaims: async () => ({}),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Drop-in replacement for @auth0/auth0-react's useAuth0().
export function useAuth0() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      isLoading: false,
      isAuthenticated: false,
      user: undefined,
      error: undefined,
      loginWithRedirect: () => {},
      logout: () => {},
      getAccessTokenSilently: async () => '',
      getIdTokenClaims: async () => ({}),
    };
  }
  return ctx;
}
