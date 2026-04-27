import React, { createContext, useEffect, useState } from "react";

export const AuthContext = createContext();

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    // base64url -> base64
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    // decode bytes
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // UTF-8 decode
    const json = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const setUserFromToken = (token) => {
    const payload = decodeJwtPayload(token);
    setUser(payload || null);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setUserFromToken(token);
  }, []);

  const login = (token) => {
    localStorage.setItem("token", token);
    setUserFromToken(token);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}