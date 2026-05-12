import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx"; // আপনার AuthContext
import axios from "axios";

// 🔥 ম্যাজিক শুরু: Axios Interceptor
// এটি নিশ্চিত করবে যে পেজ রিলোড দিলেও প্রতিটি API কলের সাথে টোকেন যাবে
axios.interceptors.request.use(
  (config) => {
    // আপনার সিস্টেমে টোকেনের নাম "token" বা "cargo_token" যেটা আছে, সেটা দিন
    const token =
      localStorage.getItem("token") || localStorage.getItem("cargo_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// (ঐচ্ছিক) যদি সার্ভার থেকে 401 (Unauthorized) আসে, তবে লগআউট করে দেবে
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.clear();
      window.location.href = "/login"; // জোর করে লগইন পেজে পাঠিয়ে দেবে
    }
    return Promise.reject(error);
  },
);
// 🔥 ম্যাজিক শেষ

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
