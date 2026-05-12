// client/src/components/Login.jsx

import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext"; // 🔥 AuthContext ইম্পোর্ট করা হলো

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useContext(AuthContext); // 🔥 Context থেকে login ফাংশন বের করে আনা হলো

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // 🔥 Context এর মাধ্যমে ইউজার এবং টোকেন সেভ করা হচ্ছে
      login(data.user, data.token);

      // set axios auth header for subsequent requests
      try {
        const axios = (await import("axios")).default;
        axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
      } catch (e) {
        // ignore if axios not available
      }

      // redirect to dashboard
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setError("Server error");
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <h1>Login</h1>
          <p className="sub">Cargo Management System</p>{" "}
          {/* একটু পরিবর্তন করেছি */}
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            <span>Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter username"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <footer className="login-footer">
          <small>Contact system administrator for access.</small>
        </footer>
      </div>

      {/* Component-scoped professional styles */}
      <style>{`
        .login-page { display:flex; align-items:center; justify-content:center; min-height:100vh; background: radial-gradient(ellipse at top left, rgba(11,116,222,0.08), transparent), linear-gradient(180deg, #f6fbff 0%, #eef6ff 100%); padding:40px; }
        .login-card { width:420px; background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,250,255,0.98)); border-radius:14px; box-shadow: 0 20px 50px rgba(22,38,78,0.12); padding:28px 30px; border: 1px solid rgba(11,116,222,0.06); }
        .login-brand { text-align:center; margin-bottom: 18px; }
        .login-brand h1 { margin:0; font-size:22px; letter-spacing:0.6px; color: #07203b; }
        .login-brand .sub { margin-top:6px; color:#5b6b82; font-size:13px; }

        .login-form label { display:block; margin-top:12px; font-size:13px; color:#263246; }
        .login-form input { width:100%; padding:12px 14px; margin-top:8px; border-radius:10px; border:1px solid rgba(11,116,222,0.12); background:#fff; font-size:14px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.6); transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease; }
        .login-form input:focus { outline:none; transform: translateY(-2px); box-shadow: 0 12px 30px rgba(11,116,222,0.08); border-color:#0b74de; }

        .login-error { margin-top:10px; color:#b91c1c; background:rgba(185,28,28,0.06); padding:8px 10px; border-radius:8px; font-size:13px; }

        .btn { width:100%; padding:12px 14px; margin-top:18px; background: linear-gradient(90deg,#0b74de 0%, #146bd6 100%); color:#fff; border:none; border-radius:10px; font-weight:700; box-shadow: 0 12px 30px rgba(11,116,222,0.12); cursor:pointer; transition: transform 120ms ease, box-shadow 120ms ease; }
        .btn:disabled { opacity:0.6; cursor:not-allowed; transform:none; box-shadow:none; }
        .btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 18px 40px rgba(11,116,222,0.16); }

        .login-footer { margin-top:14px; text-align:center; color:#6b7280; font-size:12px; }

        /* small screens */
        @media (max-width:480px) {
          .login-card { width: 100%; padding:20px; border-radius:12px; }
          .login-brand h1 { font-size:18px; }
        }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) { .login-form input, .btn { transition:none !important; } }
      `}</style>
    </div>
  );
}
