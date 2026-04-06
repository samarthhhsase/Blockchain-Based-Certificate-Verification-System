import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

const USER_STORAGE_KEY = "user";
const TOKEN_STORAGE_KEY = "token";

function removeCorruptedAuthStorage() {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function isValidUserObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return typeof value.role === "string" && value.role.length > 0;
}

function parseStoredUser() {
  const storedValue = localStorage.getItem(USER_STORAGE_KEY);
  if (!storedValue || storedValue === "undefined" || storedValue === "null") {
    return null;
  }

  try {
    const parsedUser = JSON.parse(storedValue);
    if (!isValidUserObject(parsedUser)) {
      removeCorruptedAuthStorage();
      return null;
    }
    return parsedUser;
  } catch (error) {
    removeCorruptedAuthStorage();
    return null;
  }
}

function parseStoredToken() {
  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!storedToken || storedToken === "undefined" || storedToken === "null") {
    return null;
  }
  return storedToken;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => parseStoredUser());
  const [token, setToken] = useState(() => parseStoredToken());
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsAuthChecking(false);
    }, 300);

    return () => window.clearTimeout(timer);
  }, []);

  const login = (userData, authToken = null) => {
    if (!isValidUserObject(userData)) {
      removeCorruptedAuthStorage();
      setUser(null);
      setToken(null);
      return false;
    }

    const tokenToStore =
      typeof authToken === "string" && authToken.trim()
        ? authToken
        : typeof userData.token === "string" && userData.token.trim()
          ? userData.token
          : null;

    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      if (tokenToStore) {
        localStorage.setItem(TOKEN_STORAGE_KEY, tokenToStore);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
      setUser(userData);
      setToken(tokenToStore);
      return true;
    } catch (error) {
      removeCorruptedAuthStorage();
      setUser(null);
      setToken(null);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    removeCorruptedAuthStorage();
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthChecking,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user, token, isAuthChecking]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
