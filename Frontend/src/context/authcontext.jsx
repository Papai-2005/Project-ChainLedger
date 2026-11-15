import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../api/axios.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    () => localStorage.getItem("chainledger_token")
  );
  const [loading, setLoading] = useState(true);

  // Restore the session when the application loads
  useEffect(() => {
    const restoreSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        setUser(response.data.user);
      } catch (error) {
        localStorage.removeItem("chainledger_token");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [token]);

  // Register
  const register = async (displayName, email, password) => {
    const response = await api.post("/auth/register", {
      displayName,
      email,
      password,
    });

    const { token: newToken, user: newUser } = response.data;

    localStorage.setItem("chainledger_token", newToken);
    setToken(newToken);
    setUser(newUser);

    return newUser;
  };

  // Login
  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    const { token: newToken, user: newUser } = response.data;

    localStorage.setItem("chainledger_token", newToken);
    setToken(newToken);
    setUser(newUser);

    return newUser;
  };

  // Logout
  const logout = async () => {
    try {
      if (token) {
        await api.post("/auth/logout");
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem("chainledger_token");
      setToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user && token),
    register,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
