//src/components/ProtectedRoute.jsx

import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

export default function ProtectedRoute({
  children,
  module,
  action,
  requireSuperAdmin = false,
}) {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <p>Loading...</p>; // ডাটা আসার জন্য অপেক্ষা

  // ১. লগইন করা না থাকলে লগইন পেজে পাঠাবে
  if (!user) return <Navigate to="/login" />;

  // ২. সুপার অ্যাডমিন হলে সোজা ভেতরে ঢুকতে দেবে
  if (user.isSuperAdmin) return children;

  // ৩. যদি পেজটি শুধু সুপার অ্যাডমিনের জন্য হয় (যেমন Role Management)
  if (requireSuperAdmin && !user.isSuperAdmin) {
    return <Navigate to="/" />; // ড্যাশবোর্ডে ফেরত পাঠাবে
  }

  // ৪. সাধারণ পারমিশন চেক করা
  if (module && action) {
    if (user.permissions?.[module]?.[action]) {
      return children;
    } else {
      return <Navigate to="/" />; // পারমিশন না থাকলে ড্যাশবোর্ডে পাঠিয়ে দেবে
    }
  }

  return children;
}
