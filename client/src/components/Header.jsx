// src/components/Header.jsx

import React, { useState, useEffect, useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import CanAccess from "./CanAccess";
import "./Header.css"; // 🔥 CSS ফাইলটি ইম্পোর্ট করা হলো

const Header = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // মেনু ওপেন থাকলে ব্যাকগ্রাউন্ড স্ক্রল বন্ধ করার জন্য (ঐচ্ছিক কিন্তু ভালো প্র্যাকটিস)
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobileMenuOpen]);

  // গ্লোবালি স্ক্রল করে নাম্বার চেঞ্জ হওয়া বন্ধ করার ম্যাজিক কোড
  useEffect(() => {
    const disableNumberScroll = (event) => {
      if (document.activeElement.type === "number") {
        document.activeElement.blur();
      }
    };
    window.addEventListener("wheel", disableNumberScroll);
    return () => {
      window.removeEventListener("wheel", disableNumberScroll);
    };
  }, []);

  return (
    <>
      <header className="main-header">
        <nav className="nav-container">
          {/* Logo Section */}
          <div className="logo" onClick={() => navigate("/")}>
            <div className="logo-icon">📦</div> {/* একটি আইকন দেওয়া হলো */}
            <div className="logo-text">LOGO</div>
          </div>

          {/* Hamburger Menu for Mobile & Tablet */}
          <button
            className={`menu-toggle ${isMobileMenuOpen ? "open" : ""}`}
            onClick={toggleMenu}
            aria-label="Toggle Menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {/* Navigation Links */}
          <ul className={`nav-menu ${isMobileMenuOpen ? "active" : ""}`}>
            <li>
              <NavLink to="/" onClick={() => setIsMobileMenuOpen(false)}>
                ড্যাশবোর্ড
              </NavLink>
            </li>

            <CanAccess module="branch" action="view">
              <li>
                <NavLink
                  to="/branch/new"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ব্রাঞ্চ/কাস্টমার
                </NavLink>
              </li>
            </CanAccess>

            <CanAccess module="shipment" action="view">
              <li>
                <NavLink
                  to="/unassigned"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  মিসিং শিপিং মার্ক
                </NavLink>
              </li>
            </CanAccess>

            <CanAccess module="batch" action="view">
              <li>
                <NavLink
                  to="/batches"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  শিপমেন্ট ব্যাচ
                </NavLink>
              </li>
            </CanAccess>

            <CanAccess module="batch" action="view">
              <li>
                <NavLink
                  to="/china-warehouse"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  CN ওয়ারহাউজ
                </NavLink>
              </li>
            </CanAccess>

            <CanAccess module="billing" action="view">
              <li>
                <NavLink
                  to="/payment-allocation"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  পেমেন্ট
                </NavLink>
              </li>
            </CanAccess>

            {user?.isSuperAdmin && (
              <li>
                <NavLink
                  to="/admin/roles"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  রোল & পারমিশন
                </NavLink>
              </li>
            )}

            {/* Mobile Logout (Shows only inside mobile menu) */}
            {user && (
              <li className="mobile-only">
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="logout-btn-mobile"
                >
                  লগআউট
                </button>
              </li>
            )}
          </ul>

          {/* Desktop Logout (Hidden on mobile) */}
          {user && (
            <div className="desktop-only">
              <button onClick={logout} className="logout-btn-desktop">
                লগআউট
              </button>
            </div>
          )}
        </nav>
      </header>

      {/* Mobile Menu Overlay - বাইরে ক্লিক করলে মেনু বন্ধ হওয়ার জন্য */}
      {isMobileMenuOpen && (
        <div
          className="menu-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}
    </>
  );
};

export default Header;
