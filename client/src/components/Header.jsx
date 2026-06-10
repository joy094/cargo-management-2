// src/components/Header.jsx

import React, { useState, useEffect, useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import CanAccess from "./CanAccess";
import "./Header.css";

const Header = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobileMenuOpen]);

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
            <div className="logo-icon">
              <i
                className="fa-solid fa-boxes-packing"
                style={{ color: "#2563eb" }}
              ></i>
            </div>
            <div className="logo-text">LOGO</div>
          </div>

          {/* Hamburger Menu Toggle */}
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
                <i className="fa-solid fa-house nav-icon"></i> Dashboard
              </NavLink>
            </li>

            <CanAccess module="branch" action="view">
              <li>
                <NavLink
                  to="/branch/new"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <i className="fa-solid fa-users nav-icon"></i>{" "}
                  Customers
                </NavLink>
              </li>
            </CanAccess>

            {/* <CanAccess module="shipment" action="view">
              <li>
                <NavLink
                  to="/unassigned"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <i className="fa-solid fa-circle-exclamation nav-icon"></i>{" "}
                  মিসিং শিপিং মার্ক
                </NavLink>
              </li>
            </CanAccess> */}

            <CanAccess module="batch" action="view">
              <li>
                <NavLink
                  to="/batches"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <i className="fa-solid fa-layer-group nav-icon"></i> Shipment Batches
                  
                </NavLink>
              </li>
            </CanAccess>

            <CanAccess module="batch" action="view">
              <li>
                <NavLink
                  to="/china-warehouse"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <i className="fa-solid fa-warehouse nav-icon"></i> CN
                  Warehouse
                </NavLink>
              </li>
            </CanAccess>

            <CanAccess module="billing" action="view">
              <li>
                <NavLink
                  to="/payment-allocation"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <i className="fa-solid fa-file-invoice-dollar nav-icon"></i>{" "}
                  Payment
                </NavLink>
              </li>
            </CanAccess>

            {user?.isSuperAdmin && (
              <li>
                <NavLink
                  to="/admin/roles"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <i className="fa-solid fa-user-shield nav-icon"></i> Roll &
                  Permissions
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
                  <i className="fa-solid fa-arrow-right-from-bracket logout-icon"></i>{" "}
                 Logout
                </button>
              </li>
            )}
          </ul>

          {/* Desktop Logout (Hidden on mobile) */}
          {user && (
            <div className="desktop-only">
              <button onClick={logout} className="logout-btn-3d">
                <i className="fa-solid fa-arrow-right-from-bracket"></i> Logout
              </button>
            </div>
          )}
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
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
