import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  fetchCurrentUser,
  getToken,
  login as apiLogin,
  logout as apiLogout,
  setUnauthorizedHandler,
  signup as apiSignup,
} from "./api";

const AuthContext = createContext(null);

/**
 * Holds the signed-in account for the whole app.
 *
 * On boot, if a token is already in localStorage we call /api/auth/me to
 * confirm it is still valid and to get the *current* name — rather than
 * trusting a cached copy, which would go stale if the profile changed.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // "loading" until we know whether the stored token is usable. Route
  // guards wait on this so a refresh doesn't flash the login screen.
  const [status, setStatus] = useState(getToken() ? "loading" : "anonymous");

  useEffect(() => {
    let cancelled = false;

    // Initial state is already "anonymous" when there is no token.
    if (!getToken()) return undefined;

    fetchCurrentUser()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus("anonymous");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Any 401 from anywhere in the app drops us back to anonymous.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus("anonymous");
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const me = await apiLogin(credentials);
    setUser(me);
    setStatus("authenticated");
    return me;
  }, []);

  const signup = useCallback(async (details) => {
    const me = await apiSignup(details);
    setUser(me);
    setStatus("authenticated");
    return me;
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      isLoading: status === "loading",
      login,
      signup,
      logout,
    }),
    [user, status, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Display name for the signed-in account, with a neutral fallback. */
export function useDisplayName() {
  const { user } = useAuth();
  return user?.name?.trim() || "Your account";
}

function AuthSplash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="flex items-center gap-3 text-text-secondary text-sm">
        <span className="flex gap-1" aria-hidden="true">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-accent-mint animate-bounce" />
        </span>
        Restoring your session...
      </div>
    </div>
  );
}

/** Wraps routes that require a signed-in account. */
export function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthSplash />;
  if (!isAuthenticated) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

/** Keeps signed-in users away from /login and /signup. */
export function RedirectIfAuthed({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <AuthSplash />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}
