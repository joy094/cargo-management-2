// App.jsx - মডিফাইড উইথ RBAC (Role-Based Access Control)

import "./App.css";
import React, { useEffect, useState, useContext } from "react";
import { Routes, Route, Outlet, useNavigate, NavLink } from "react-router-dom";
import axios from "axios";

// মডিফাইড কম্পোনেন্ট ইম্পোর্ট
import Layout from "./components/Layout";
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
import ChinaWarehouse from "./components/ChinaWarehouse";
import TrackShipment from "./components/TrackShipment";

// ==========================================
// 4. Main App Routes (Route Security)
// ==========================================
const App = () => (
  <Routes>
    {/* Public Route */}
    <Route path="/login" element={<Login />} />
    {/* 🚀 কাস্টমারদের জন্য পাবলিক ট্র্যাকিং রাউট */}
    <Route path="/track" element={<TrackShipment />} />

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
          <ProtectedRoute module="branch" action="view">
            <UnassignedShipments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/box-details/:id"
        element={
          <ProtectedRoute>
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

      <Route
        path="/china-warehouse"
        element={
          <ProtectedRoute module="batch" action="view">
            <ChinaWarehouse />
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
