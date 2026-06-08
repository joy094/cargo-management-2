// src/components/BottomNav.jsx

import React from "react";
import { NavLink } from "react-router-dom";
import "./BottomNav.css";

const BottomNav = () => {
  return (
    <div className="mobile-bottom-nav">
      <NavLink to="/" className="nav-item">
        <i className="fa-solid fa-house nav-icon"></i>
        <span className="label">ড্যাশবোর্ড</span>
      </NavLink>

      {/* <NavLink to="/shipment-list" className="nav-item">
        <i className="fa-solid fa-box-open nav-icon"></i>
        <span className="label">শিপমেন্ট</span>
      </NavLink> */}

      <NavLink to="/payment-allocation" className="nav-item">
        <i className="fa-solid fa-file-invoice-dollar nav-icon"></i>
        <span className="label">পেমেন্ট</span>
      </NavLink>

      <NavLink to="/agency-list" className="nav-item">
        <i className="fa-solid fa-building-user nav-icon"></i>
        <span className="label">ব্রাঞ্চ</span>
      </NavLink>
    </div>
  );
};

export default BottomNav;
