// src/components/Dashboard.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./Dashboard.css"; // 🔥 CSS ফাইল ইম্পোর্ট করা হলো

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDueList, setShowDueList] = useState(false);
  const [dueCustomers, setDueCustomers] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get("/api/dashboard/summary");
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowDueList = () => {
    if (stats && stats.dueCustomers) {
      setDueCustomers(stats.dueCustomers);
      setShowDueList(true);
    } else {
      alert("বকেয়া তালিকা এখনো লোড হয়নি বা খালি।");
    }
  };

  if (loading) {
    return <div className="loading-screen">ড্যাশবোর্ড লোড হচ্ছে...</div>;
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-titles">
          <h2>🚀 System Dashboard</h2>
          <p></p>
        </div>
        <div className="header-actions">
          <button className="due-list-btn" onClick={handleShowDueList}>
            📋 Due Customer List
          </button>
        </div>
      </div>

      {/* 🟢 Due Customer List Popup (Modal) */}
      {showDueList && (
        <div className="modal-overlay">
          <div className="due-modal-content">
            <div className="due-modal-header">
              <h3>🚨 Priority Due List</h3>
              <button className="close-x" onClick={() => setShowDueList(false)}>
                ✖
              </button>
            </div>

            <div className="due-list-scrollable">
              <table className="due-table">
                <thead>
                  <tr>
                    <th>SL</th>
                    <th>Customer Name</th>
                    <th>Mark</th>
                    <th className="text-right">Total Due</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {dueCustomers.length > 0 ? (
                    dueCustomers.map((cust, index) => (
                      <tr
                        key={cust._id}
                        className={index < 3 ? "high-priority-row" : ""}
                      >
                        <td>{index + 1}</td>
                        <td>
                          <strong>{cust.branchName}</strong>
                        </td>
                        <td>
                          <span className="mark-tag">{cust.shippingMark}</span>
                        </td>
                        <td className="text-right due-amount-cell">
                          ৳ {cust.currentDue.toLocaleString()}
                        </td>
                        <td>{cust.phone}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="no-data">
                        কোনো বকেয়া কাস্টমার পাওয়া যায়নি
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Top Value Cards (Financials) */}
      <div className="stats-grid top-grid">
        <div className="stat-card blue-gradient">
          <div className="icon">🧾</div>
          <div className="info">
            <span>Total Billed Amount</span>
            <h3>৳ {stats?.totalBilledAmount?.toLocaleString() || 0}</h3>
          </div>
        </div>
        <div className="stat-card green-gradient">
          <div className="icon">💵</div>
          <div className="info">
            <span>Total Collected</span>
            <h3>৳ {stats?.totalCollected?.toLocaleString() || 0}</h3>
          </div>
        </div>
        <div className="stat-card red-gradient">
          <div className="icon">⚠️</div>
          <div className="info">
            <span>Total Market Due</span>
            <h3>৳ {stats?.totalDue?.toLocaleString() || 0}</h3>
          </div>
        </div>
      </div>

      {/* Secondary Metrics (Operations) */}
      <div className="stats-grid secondary-grid">
        <div className="stat-box">
          <div className="stat-icon">📦</div>
          <div>
            <h4>Total Shipments</h4>
            <h2>{stats?.totalBoxes?.toLocaleString() || 0} PCS</h2>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon">🏭</div>
          <div>
            <h4>Total Batches</h4>
            <h2>{stats?.totalBatches?.toLocaleString() || 0}</h2>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon">⚖️</div>
          <div>
            <h4>Processed Weight</h4>
            <h2>{stats?.totalWeight?.toFixed(2) || 0} KG</h2>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon">🏢</div>
          <div>
            <h4>Active Customers</h4>
            <h2>{stats?.totalBranches || 0}</h2>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="recent-activity-section">
        <div className="section-title">
          <h3>⚡ Recent Financial Transactions</h3>
          <Link to="/payment-allocation" className="view-all-link">
            View All
          </Link>
        </div>

        <div className="table-card">
          <div className="table-responsive">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shipping Mark</th>
                  <th>Type</th>
                  <th>Method / Ref</th>
                  <th className="text-right">Amount (৳)</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentPayments?.length > 0 ? (
                  stats.recentPayments.map((txn) => (
                    <tr key={txn._id}>
                      <td>{new Date(txn.date).toLocaleDateString("en-GB")}</td>
                      <td>
                        <strong>{txn.shippingMark}</strong>
                      </td>
                      <td>
                        <span className={`badge ${txn.type.toLowerCase()}`}>
                          {txn.type}
                        </span>
                      </td>
                      <td>
                        {txn.paymentMethod}{" "}
                        {txn.transactionId ? `(${txn.transactionId})` : ""}
                      </td>
                      <td className="text-right amount-cell text-green">
                        + {txn.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-data">
                      কোনো ট্রানজেকশন পাওয়া যায়নি
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
