// src/components/CanAccess.jsx
import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const CanAccess = ({ module, action, children }) => {
  const { user } = useContext(AuthContext);

  // ১. ইউজার না থাকলে কিছুই দেখাবে না
  if (!user) return null;

  // ২. সুপার অ্যাডমিন হলে সব দেখার ক্ষমতা আছে
  if (user.isSuperAdmin) return <>{children}</>;

  // ৩. ইউজারের পারমিশন চেক করা হচ্ছে
  if (
    user.permissions &&
    user.permissions[module] &&
    user.permissions[module][action] === true
  ) {
    return <>{children}</>;
  }

  // ৪. পারমিশন না থাকলে বাটন গায়েব!
  return null;
};

export default CanAccess;
