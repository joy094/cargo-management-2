import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
          <Link to="/branch/new" className="btn-primary">
            🏢 Manage Branches
          </Link>
          <Link to="/payment-allocation" className="btn-success">
            💰 Receive Payment
          </Link>
        </div>
      </div>

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
        <div className="stat-box">
          <h4>⚖️ Total Processed Weight</h4>
          <h2>{stats?.totalWeight?.toFixed(2) || 0} KG</h2>
        </div>
        <div className="stat-box">
          <h4>🏢 Active Branches/Agencies</h4>
          <h2>{stats?.totalBranches || 0}</h2>
        </div>
        <div className="stat-box">
          <h4>🎁 Total Discount Given</h4>
          <h2>৳ {stats?.totalDiscount?.toLocaleString() || 0}</h2>
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
        .dashboard-header h2 { margin: 0; color: #0f172a; font-size: 28px; font-weight: 800; }
        .dashboard-header p { margin: 5px 0 0; color: #64748b; font-size: 15px; }
        .header-actions { display: flex; gap: 15px; }
        .btn-primary { background: #0f172a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; transition: 0.2s; }
        .btn-primary:hover { background: #1e293b; }
        .btn-success { background: #10b981; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; transition: 0.2s; }
        .btn-success:hover { background: #059669; }

        .stats-grid { display: grid; gap: 20px; margin-bottom: 30px; }
        .top-grid { grid-template-columns: repeat(3, 1fr); }
        .secondary-grid { grid-template-columns: repeat(4, 1fr); }

        .stat-card { display: flex; align-items: center; padding: 25px; border-radius: 16px; color: white; box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
        .stat-card .icon { font-size: 40px; margin-right: 20px; background: rgba(255,255,255,0.2); width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
        .stat-card .info span { font-size: 14px; font-weight: 600; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-card .info h3 { margin: 5px 0 0; font-size: 32px; font-weight: 800; }
        
        .blue-gradient { background: linear-gradient(135deg, #2563eb, #3b82f6); }
        .green-gradient { background: linear-gradient(135deg, #059669, #10b981); }
        .red-gradient { background: linear-gradient(135deg, #dc2626, #ef4444); }

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
