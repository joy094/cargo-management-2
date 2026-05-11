import "./App.css";
import React, { useEffect, useState } from "react";
import { Routes, Route, Outlet, useNavigate, NavLink } from "react-router-dom";
import axios from "axios";

// মডিফাইড কম্পোনেন্ট ইম্পোর্ট
import Dashboard from "./components/Dashboard";
import ShipmentList from "./components/ShipmentList"; // HajjiList -> ShipmentList
import ShipmentProfile from "./components/ShipmentProfile"; // HajjiProfile -> ShipmentProfile
import PaymentAllocation from "./components/PaymentAllocation"; // Typo fixed
import AgencyProfile from "./components/BranchProfile";
import AddBranch from "./components/AddBranch";
import AddShipment from "./components/AddShipment"; // AddHajji -> AddShipment
import NotificationSounds from "./components/NotificationSounds";
import Login from "./components/Login";
import BottomNav from "./components/BottomNav";
// import CustomerList from "./components/CustomerList";
// import CustomerProfile from "./components/CustomerProfile";
import BatchList from "./components/BatchList";

import BatchDetails from "./components/BatchDetails";
import BulkImport from "./components/BulkImport";
import BoxDetails from "./components/BoxDetails"; // ফোল্ডার পাথ আপনার অনুযায়ী ঠিক করে নেবেন
import BranchDashboard from "./components/BranchProfile";
import BranchProfile from "./components/BranchProfile";
import UnassignedShipments from "./components/UnassignedShipments";

// Layout Component
export const Layout = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
    setLoading(false);
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

// Header Component (মডিফাইড ফর কারগো)

const Header = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const token = localStorage.getItem("token");

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <header className="main-header">
      <nav className="nav-container">
        {/* Logo Section */}
        <div className="logo" onClick={() => navigate("/")}>
          <span className="logo-icon">📦</span>
          <div className="logo-text">
            <h1>SABA & RIHAN </h1>
            <span className="sub-logo">কারগো ম্যানেজমেন্ট সিস্টেম</span>
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
          <li>
            <NavLink
              to="/branch/new"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              ব্রাঞ্চসমূহ
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/shipment-list"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              শিপমেন্টস 
            </NavLink>
          </li>

          {/* <li>
            <NavLink to="/customers" className="nav-link">
              কাস্টমারস
            </NavLink>
          </li> */}
          <li>
            <NavLink to="/unassigned" className="nav-link">
              মিসিং শিপিং মার্ক
            </NavLink>
          </li>
          
          <li>
            <NavLink to="/batches" className="nav-link">
              শিপমেন্ট  ব্যাচেস
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/payment-allocation"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              পেমেন্ট
            </NavLink>
          </li>
          {token && (
            <li className="mobile-only">
              <button onClick={logout} className="logout-btn">
                লগআউট
              </button>
            </li>
          )}
        </ul>

        {/* Desktop Logout */}
        {token && (
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

const Footer = () => (
  <footer className="main-footer">
    <div className="footer-content">
      <div className="footer-section">
        <h4>Masum Air Travels & Cargo</h4>
        <p>নির্ভরযোগ্য কারগো এবং লজিস্টিক সেবা</p>
      </div>
      <div className="footer-bottom">
        <p>© ২০২৬ সর্বস্বত্ব সংরক্ষিত | ডিজাইন ও ডেভেলপমেন্ট: এমডি জাকারিয়া</p>
      </div>
    </div>
  </footer>
);

export { Header, Footer };

// Main App Component with Routes
const App = () => (
  <Routes>
    {/* Public Route */}
    <Route path="/login" element={<Login />} />

    {/* Protected Routes */}
    <Route path="/" element={<Layout />}>
      {/* Dashboard */}
      <Route path="/" element={<Dashboard />} />

      {/* Agency/Branch Management */}

     
      <Route path="/branch/new" element={<AddBranch />} />
      <Route path="/branch-profile" element={<BranchProfile/>} />

      {/* Shipment Management */}
      <Route path="/shipment-list" element={<ShipmentList />} />
      <Route path="/shipment-profile/:id" element={<ShipmentProfile />} />
      <Route path="/shipment/new" element={<AddShipment />} />
      <Route path="/shipment/:id" element={<AddShipment />} />
      {/* customers mamnagement */}
      {/* <Route path="/customers" element={<CustomerList />} /> */}
      {/* <Route path="/customer-profile/:id" element={<CustomerProfile />} /> */}
      {/* নতুন ব্যাচ রাউট */}
      <Route path="/batches" element={<BatchList />} />
      <Route path="/batches/:id" element={<BatchDetails />} />
      <Route path="/bulk-import" element={<BulkImport />} />
      //unassigned shipments-branch
      <Route path="/unassigned" element={<UnassignedShipments />} />

      {/* Payment System */}
      <Route path="/payment-allocation" element={<PaymentAllocation />} />
      <Route path="/box-details/:id" element={<BoxDetails />} />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="p-20 text-center">
            <h1>404 - Page Not Found</h1>
          </div>
        }
      />
    </Route>
  </Routes>
);

export default App;
