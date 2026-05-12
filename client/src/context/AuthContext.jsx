// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // পেজ রিফ্রেশ করলেও যেন লগইন ডাটা থেকে যায়
  useEffect(() => {
    const storedUser = localStorage.getItem("cargo_user");
    const token = localStorage.getItem("cargo_token");

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem("cargo_user", JSON.stringify(userData));
    localStorage.setItem("cargo_token", token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("cargo_user");
    localStorage.removeItem("cargo_token");
    window.location.href = "/login"; // লগআউট হলে লগইন পেজে পাঠাবে
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
