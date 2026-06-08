import React, { useContext, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "./Header";
import Footer from "./Footer";
import { AuthContext } from "../context/AuthContext"; // 🔥 AuthContext ইম্পোর্ট
import { exp } from "three/tsl";
import NotificationSounds from "./NotificationSounds";
import BottomNav from "./BottomNav";

// ==========================================
// 1. Layout Component
// ==========================================
export const Layout = () => {
  const navigate = useNavigate();
  const { user, loading } = useContext(AuthContext); // Context থেকে ডাটা নিচ্ছি

  useEffect(() => {
    const token =
      localStorage.getItem("cargo_token") || localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, [navigate]);

  if (loading) return <div className="loading-screen">Loading System...</div>;

  return (
    <div className="app-wrapper">
      <NotificationSounds />
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <BottomNav />
      <Footer />
    </div>
  );
};


export default Layout;