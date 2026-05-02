import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        // ব্যাকএন্ড থেকে কাস্টমার এবং তার সব শিপমেন্টের ডাটা আনা
        const res = await axios.get(`/api/customers/${id}`); // আমরা আগের তৈরি করা রাউটটিই ব্যবহার করতে পারি যদি সেটি কাস্টমার ডাটা দেয়
        // অথবা নতুন রাউট: `/api/customers/${id}`
        setData(res.data);
      } catch (err) {
        console.error("Error fetching customer profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomerData();
  }, [id]);

  if (loading) return <div className="loading">লোডিং হচ্ছে...</div>;
  if (!data) return <div className="error">কাস্টমার পাওয়া যায়নি!</div>;

  const { customer, shipments } = data;

  // ক্যালকুলেশন
  const totalBill = shipments.reduce((sum, s) => sum + s.totalCharge, 0);
  const totalPaid = shipments.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalDue = totalBill - totalPaid;

  return (
    <div className="profile-container">
      {/* Header Section */}
      <div className="profile-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ⬅ ফিরে যান
        </button>
        <div className="customer-info">
          <h1>{customer.fullName}</h1>
          <p>
            📞 {customer.phoneNumber} | 🏢 ব্রাঞ্চ:{" "}
            {customer.agency?.name || "N/A"}
          </p>
        </div>
        <button className="print-btn" onClick={() => window.print()}>
          🖨 লেজার প্রিন্ট
        </button>
      </div>

      {/* 3D Summary Cards */}
      <div className="summary-grid">
        <div className="stat-card bill">
          <h3>মোট বিল</h3>
          <p>৳ {totalBill.toLocaleString()}</p>
        </div>
        <div className="stat-card paid">
          <h3>মোট জমা</h3>
          <p>৳ {totalPaid.toLocaleString()}</p>
        </div>
        <div className="stat-card due">
          <h3>মোট বকেয়া</h3>
          <p>৳ {totalDue.toLocaleString()}</p>
        </div>
        <div className="stat-card count">
          <h3>মোট শিপমেন্ট</h3>
          <p>{shipments.length} টি</p>
        </div>
      </div>

      {/* Shipment Ledger Table */}
      <div className="ledger-section">
        <h2>📦 শিপমেন্ট লেজার (Shipment Ledger)</h2>
        <div className="table-responsive">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>তারিখ</th>
                <th>ট্র্যাকিং নং</th>
                <th>শিপমেন্ট লেবেল</th>
                <th>আইটেম</th>
                <th>ওজন (KG)</th>
                <th>শিপিং মার্ক</th>
                <th>বক্স সংখ্যা</th>
                <th>বিল</th>
                <th>জমা</th>
                <th>বকেয়া</th>
                <th>অবস্থা</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s._id}>
                  <td>{new Date(s.createdAt).toLocaleDateString("bn-BD")}</td>
                  <td className="trk">{s.trackingNumber}</td>
                  <td>{s.shipmentLabel || s.customer?.fullName || "N/A"}</td>
                  <td>{s.itemName}</td>
                  <td>{s.weight}</td>
                  <td>{s.shippingMark || "-"}</td>
                  <td>{s.boxCount || "-"}</td>
                  <td>৳ {s.totalCharge}</td>
                  <td className="paid-text">৳ {s.paidAmount}</td>
                  <td className="due-text">৳ {s.totalCharge - s.paidAmount}</td>
                  <td>
                    <span className={`status-tag ${s.status.toLowerCase()}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tiro+Bangla&display=swap');

        .profile-container {
          max-width: 1350px;
          margin: 20px auto;
          padding: 20px;
          font-family: 'Tiro Bangla', serif;
          background: #f8f9fa;
          border-radius: 15px;
        }

        .profile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fff;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          margin-bottom: 25px;
        }

        .customer-info h1 { margin: 0; color: #003580; font-size: 28px; }
        .customer-info p { margin: 5px 0 0; color: #64748b; }

        .back-btn, .print-btn {
          padding: 10px 18px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          transition: 0.3s;
        }

        .back-btn { background: #e2e8f0; color: #475569; }
        .print-btn { background: #003580; color: #fff; box-shadow: 0 4px #002152; }
        .print-btn:active { box-shadow: 0 0; transform: translateY(4px); }

        /* Summary Cards */
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          padding: 25px;
          border-radius: 15px;
          text-align: center;
          color: #fff;
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          transition: transform 0.3s;
        }
        .stat-card:hover { transform: translateY(-5px); }

        .bill { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .paid { background: linear-gradient(135deg, #0ba360 0%, #3cba92 100%); }
        .due { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
        .count { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }

        .stat-card h3 { margin: 0; font-size: 16px; opacity: 0.9; }
        .stat-card p { margin: 10px 0 0; font-size: 24px; font-weight: bold; }

        /* Table Styling */
        .ledger-section {
          background: #fff;
          padding: 25px;
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }

        .ledger-section h2 { font-size: 20px; margin-bottom: 20px; color: #2d3748; border-bottom: 2px solid #edf2f7; padding-bottom: 10px; }

        .ledger-table { width: 100%; border-collapse: collapse; }
        .ledger-table th { background: #f7fafc; padding: 15px; text-align: left; color: #718096; font-size: 14px; }
        .ledger-table td { padding: 15px; border-bottom: 1px solid #edf2f7; font-size: 15px; }

        .trk { font-weight: bold; color: #003580; }
        .paid-text { color: #2f855a; font-weight: 600; }
        .due-text { color: #c53030; font-weight: bold; }

        .status-tag {
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .booked { background: #feebc8; color: #9c4221; }
        .delivered { background: #c6f6d5; color: #22543d; }
        .transit { background: #bee3f8; color: #2a4365; }

        @media print {
          .back-btn, .print-btn, .main-header, .mobile-bottom-nav { display: none !important; }
          .profile-container { margin: 0; padding: 0; width: 100%; }
        }

        @media (max-width: 768px) {
          .summary-grid { grid-template-columns: 1fr 1fr; }
          .profile-header { flex-direction: column; text-align: center; gap: 15px; }
        }
      `}</style>
    </div>
  );
}
