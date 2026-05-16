//src/components/Dashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

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

  // Dashboard.jsx এর ভেতরে ফাংশনটি এভাবে লিখুন
  const handleShowDueList = () => {
    if (stats && stats.dueCustomers) {
      setDueCustomers(stats.dueCustomers);
      setShowDueList(true);
    } else {
      alert("বকেয়া তালিকা এখনো লোড হয়নি বা খালি।");
    }
  };

  if (loading) {
    return <div className="loading-screen">ড্যাশবোর্ড লোড হচ্ছে...</div>;
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h2>🚀 System Dashboard</h2>
          <p>কার্গো এবং এজেন্সি ম্যানেজমেন্ট ওভারভিউ</p>
        </div>
        <div className="header-actions">
          {/* ✅ আগের বাটন সরিয়ে নতুন Due Customer List বাটন */}
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
              <h3>🚨 Priority Due List (High to Low)</h3>
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
                        কোনো বকেয়া কাস্টমার পাওয়া যায়নি
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
          <h4>📦 Total Shipments (Boxes)</h4>
          <h2>{stats?.totalBoxes?.toLocaleString() || 0} PCS</h2>
        </div>

        {/* 🔥 নতুন যুক্ত করা হলো: Total Batches */}
        <div className="stat-box">
          <h4>🏭 Total Batches</h4>
          <h2>{stats?.totalBatches?.toLocaleString() || 0} Batches</h2>
        </div>

        <div className="stat-box">
          <h4>⚖️ Total Processed Weight</h4>
          <h2>{stats?.totalWeight?.toFixed(2) || 0} KG</h2>
        </div>

        <div className="stat-box">
          <h4>🏢 Active ustomers/Branches</h4>
          <h2>{stats?.totalBranches || 0}</h2>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="recent-activity-section">
        <div className="section-title">
          <h3>⚡ Recent Financial Transactions</h3>
          <Link to="/payment-allocation">View All</Link>
        </div>

        <div className="table-card">
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

      {/* CSS Styles */}
      <style>{`
        .dashboard-container { padding: 30px; background: #f4f7fa; min-height: 100vh; font-family: 'Inter', sans-serif; }
        
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .dashboard-header h2 { margin: 0; color: #99cc0e; font-size: 28px; font-weight: 800; }
        .dashboard-header p { margin: 5px 0 0; color: #64748b; font-size: 15px; }
        .header-actions { display: flex; gap: 15px; }

        /* ✅ Due List Button Style */
        .due-list-btn { 
            background: #1e293b; color: white; padding: 12px 24px; border-radius: 8px; 
            border: none; cursor: pointer; font-weight: bold; font-size: 15px; 
            box-shadow: 0 4px 10px rgba(0,0,0,0.1); transition: 0.3s;
        }
        .due-list-btn:hover { background: #0f172a; transform: translateY(-2px); }

        /* 🟢 Modal / Popup Styles */
        .modal-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1000;
        }
        .due-modal-content {
            background: white; width: 850px; max-height: 85vh; border-radius: 20px;
            padding: 30px; display: flex; flex-direction: column; position: relative;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .due-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; }
        .due-modal-header h3 { margin: 0; font-size: 22px; color: #1e293b; }
        .close-x { background: #f1f5f9; border: none; font-size: 18px; cursor: pointer; width: 35px; height: 35px; border-radius: 50%; color: #64748b; transition: 0.2s; }
        .close-x:hover { background: #fee2e2; color: #ef4444; }

        .due-list-scrollable { overflow-y: auto; flex-grow: 1; margin-right: -10px; padding-right: 10px; }
        .due-list-scrollable::-webkit-scrollbar { width: 6px; }
        .due-list-scrollable::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

        /* Due Table Styles */
        .due-table { width: 100%; border-collapse: collapse; }
        .due-table th { position: sticky; top: 0; background: #f8fafc; padding: 15px; text-align: left; border-bottom: 2px solid #e2e8f0; font-size: 13px; color: #64748b; z-index: 10; }
        .due-table td { padding: 15px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        
        .due-amount-cell { color: #dc2626; font-weight: 800; font-size: 16px; }
        .mark-tag { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 12px; }
        
        /* টপ ৩ জনের জন্য হাইলাইট */
        .high-priority-row { background: #fff1f2; }
        .high-priority-row strong { color: #9f1239; }

        .stats-grid { display: grid; gap: 20px; margin-bottom: 30px; }
        .top-grid { grid-template-columns: repeat(3, 1fr); }
        .secondary-grid { grid-template-columns: repeat(4, 1fr); }

        .stat-card { display: flex; align-items: center; padding: 25px; border-radius: 16px; color: white; box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
        .stat-card .icon { font-size: 40px; margin-right: 20px; background: rgba(255,255,255,0.2); width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
        .stat-card .info span { font-size: 14px; font-weight: 600; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-card .info h3 { margin: 5px 0 0; font-size: 32px; font-weight: 800; }
        
        .blue-gradient { background: linear-gradient(135deg, #c6d1e9, #779dda); }
        .green-gradient { background: linear-gradient(135deg, #3ee6b0, #10b981); }
        .red-gradient { background: linear-gradient(135deg, #e26161, #ee5858); }

        .stat-box { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #e2e8f0; }
        .stat-box h4 { margin: 0 0 10px; color: #64748b; font-size: 14px; font-weight: 600; }
        .stat-box h2 { margin: 0; color: #0f172a; font-size: 24px; font-weight: 800; }

        .recent-activity-section { margin-top: 40px; }
        .section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .section-title h3 { margin: 0; color: #0f172a; }
        .section-title a { color: #3b82f6; text-decoration: none; font-weight: bold; }

        .table-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); overflow-x: auto; }
        .pro-table { width: 100%; border-collapse: collapse; }
        .pro-table th { background: #f8fafc; padding: 15px; text-align: left; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; }
        .pro-table td { padding: 15px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; }
        
        .badge { font-size: 11px; font-weight: bold; padding: 5px 10px; border-radius: 20px; }
        .badge.payment { background: #dcfce7; color: #166534; }
        .badge.discount { background: #fef3c7; color: #d97706; }
        .badge.adjustment { background: #e0f2fe; color: #0369a1; }
        
        .text-right { text-align: right; }
        .amount-cell { font-weight: 800; font-size: 15px; }
        .text-green { color: #10b981; }
        .no-data { text-align: center; color: #94a3b8; padding: 30px !important; }
        .loading-screen { display: flex; justify-content: center; align-items: center; height: 100vh; font-size: 20px; font-weight: bold; color: #3b82f6; }
      `}</style>
    </div>
  );
}
