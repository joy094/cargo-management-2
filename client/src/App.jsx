// App.jsx - মডিফাইড উইথ RBAC (Role-Based Access Control)

import "./App.css";
import React, { useEffect, useState, useContext } from "react";
import { Routes, Route, Outlet, useNavigate, NavLink } from "react-router-dom";
import axios from "axios";

// মডিফাইড কম্পোনেন্ট ইম্পোর্ট
import Dashboard from "./components/Dashboard";
import ShipmentList from "./components/ShipmentList";
import ShipmentProfile from "./components/ShipmentProfile";
import PaymentAllocation from "./components/PaymentAllocation";
import AddBranch from "./components/AddBranch";
import AddShipment from "./components/AddShipment";
import NotificationSounds from "./components/NotificationSounds";
import Login from "./components/Login";
import BottomNav from "./components/BottomNav";
import BatchList from "./components/BatchList";
import BatchDetails from "./components/BatchDetails";
import BulkImport from "./components/UploadExcelModal";
import BoxDetails from "./components/BoxDetails";
import BranchProfile from "./components/BranchProfile";
import UnassignedShipments from "./components/UnassignedShipments";

import RoleManagement from "./components/RoleManagement";
import UserManagement from "./components/UserManagement";
import { AuthContext } from "./context/AuthContext"; // 🔥 AuthContext ইম্পোর্ট
import CanAccess from "./components/CanAccess";
import ProtectedRoute from "./ProtectedRoute"; // ⚠️ পাথ ঠিক আছে কি না চেক করে নেবেন

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

// ==========================================
// 2. Header Component (Menu Security)
// ==========================================
const Header = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useContext(AuthContext); // Context থেকে user ও logout ফাংশন

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <header className="main-header">
      <nav
        className="nav-container"
        style={{ maxWidth: "100%", margin: "0 auto" }}
      >
        {/* Logo Section */}
        <div className="logo" onClick={() => navigate("/")}>
          <span className="logo-icon"></span>
          <div className="logo-text">
            {/* <h1>SABA & RIHAN  </h1> */}
         
            

          </div>
        </div>

        {/* Hamburger Menu for Mobile */}
        <button className="menu-toggle" onClick={toggleMenu}>
          {isMobileMenuOpen ? "✖" : "☰"}
        </button>

        {/* Navigation Links */}
        <ul className={`nav-menu ${isMobileMenuOpen ? "active" : ""}`}>
          <li>
            <NavLink to="/" onClick={() => setIsMobileMenuOpen(false)}>
              ড্যাশবোর্ড
            </NavLink>
          </li>

          {/* 🔥 Branch Access */}
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

          {/* 🔥 Shipment Access */}
          <CanAccess module="shipment" action="view">
            <li>
              <NavLink
                to="/shipment-list"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                শিপমেন্টস
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/unassigned"
                className="nav-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                মিসিং শিপিং মার্ক
              </NavLink>
            </li>
          </CanAccess>

          {/* 🔥 Batch Access */}
          <CanAccess module="batch" action="view">
            <li>
              <NavLink
                to="/batches"
                className="nav-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                শিপমেন্ট ব্যাচ
              </NavLink>
            </li>
          </CanAccess>

          {/* 🔥 Billing & Payment Access */}
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

          {/* 🔥 শুধুমাত্র সুপার অ্যাডমিনের মেনু */}
          {user?.isSuperAdmin && (
            <>
              <li>
                <NavLink
                  to="/admin/roles"
                  className="nav-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  রোল & পারমিশন
                </NavLink>
              </li>
              {/* <li>
                <NavLink
                  to="/admin/users"
                  className="nav-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ইউজার ম্যানেজমেন্ট
                </NavLink>
              </li> */}
            </>
          )}

          {user && (
            <li className="mobile-only">
              <button onClick={logout} className="logout-btn">
                লগআউট
              </button>
            </li>
          )}
        </ul>

        {/* Desktop Logout */}
        {user && (
          <div className="desktop-only">
            <button onClick={logout} className="logout-btn-3d">
              লগআউট
            </button>
          </div>
        )}
      </nav>
    </header>
  );
};

// ==========================================
// 3. Footer Component
// ==========================================
const Footer = () => (
  <footer className="main-footer">
    <div className="footer-content">
      <div className="footer-section">
        <h4>Saba & Rihan Enterprise</h4>
        <p>নির্ভরযোগ্য কারগো এবং লজিস্টিক সেবা</p>
      </div>
      <div className="footer-bottom">
        <p>© ২০২৬ সর্বস্বত্ব সংরক্ষিত | ডিজাইন ও ডেভেলপমেন্ট: এমডি জাকারিয়া</p>
      </div>
    </div>
  </footer>
);

export { Header, Footer };

// ==========================================
// 4. Main App Routes (Route Security)
// ==========================================
const App = () => (
  <Routes>
    {/* Public Route */}
    <Route path="/login" element={<Login />} />

    {/* Protected Routes Wrapper */}
    <Route path="/" element={<Layout />}>
      {/* 🏠 সবার জন্য ড্যাশবোর্ড (লগইন থাকলেই হবে) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* 🏢 Branch Routes (ব্রাঞ্চ পারমিশন) */}
      <Route
        path="/branch/new"
        element={
          <ProtectedRoute module="branch" action="view">
            <AddBranch />
          </ProtectedRoute>
        }
      />
      <Route
        path="/branch-profile"
        element={
          <ProtectedRoute module="branch" action="view">
            <BranchProfile />
          </ProtectedRoute>
        }
      />

      {/* 🚚 Shipment Routes (শিপমেন্ট পারমিশন) */}
      <Route
        path="/shipment-list"
        element={
          <ProtectedRoute module="shipment" action="view">
            <ShipmentList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shipment-profile/:id"
        element={
          <ProtectedRoute module="shipment" action="view">
            <ShipmentProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shipment/new"
        element={
          <ProtectedRoute module="shipment" action="create">
            <AddShipment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shipment/:id"
        element={
          <ProtectedRoute module="shipment" action="edit">
            <AddShipment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/unassigned"
        element={
          <ProtectedRoute module="shipment" action="view">
            <UnassignedShipments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/box-details/:id"
        element={
          <ProtectedRoute >
            <BoxDetails />
          </ProtectedRoute>
        }
      />

      {/* 📦 Batch Routes (ব্যাচ পারমিশন) */}
      <Route
        path="/batches"
        element={
          <ProtectedRoute module="batch" action="view">
            <BatchList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/batches/:id"
        element={
          <ProtectedRoute module="batch" action="view">
            <BatchDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bulk-import"
        element={
          <ProtectedRoute module="batch" action="create">
            <BulkImport />
          </ProtectedRoute>
        }
      />

      {/* 💵 Payment & Billing Routes (বিলিং পারমিশন) */}
      <Route
        path="/payment-allocation"
        element={
          <ProtectedRoute module="billing" action="view">
            <PaymentAllocation />
          </ProtectedRoute>
        }
      />

      {/* 🛡️ Super Admin Routes (শুধু সুপার অ্যাডমিন) */}
      <Route
        path="admin/roles"
        element={
          <ProtectedRoute requireSuperAdmin={true}>
            <RoleManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="admin/users"
        element={
          <ProtectedRoute requireSuperAdmin={true}>
            <UserManagement />
          </ProtectedRoute>
        }
      />

      {/* 🚫 404 Page */}
      <Route
        path="*"
        element={
          <div
            className="p-20 text-center"
            style={{ padding: "50px", textAlign: "center" }}
          >
            <h1>⚠️ 404 - Page Not Found</h1>
            <p>
              আপনি ভুল ঠিকানায় এসেছেন অথবা এই পেজটি দেখার পারমিশন আপনার নেই।
            </p>
          </div>
        }
      />
    </Route>
  </Routes>
);

export default App;
