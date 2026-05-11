//src/components/UnassignedShipments.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function UnassignedShipments() {
  const [unassigned, setUnassigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnassigned();
  }, []);

  const fetchUnassigned = async () => {
    try {
      const res = await axios.get("/api/branches/unassigned-shipments"); // ব্যাকএন্ডের সাথে লিংক ঠিক আছে কিনা খেয়াল রাখবেন
      setUnassigned(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching unassigned shipments:", err);
      setLoading(false);
    }
  };

  return (
    <div className="batch-page">
      <div className="batch-header">
        <div className="title-area">
          <h1>⚠️ পেন্ডিং শিপিং মার্ক (Unassigned)</h1>
          <p>এই মালগুলো দেশে পৌঁছেছে কিন্তু এখনও কোনো ব্রাঞ্চ খোলা হয়নি</p>
        </div>
      </div>

      <div className="modern-table-container">
        {loading ? (
          <p
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#64748b",
              fontSize: "16px",
            }}
          >
            ডেটা লোড হচ্ছে, দয়া করে অপেক্ষা করুন...
          </p>
        ) : unassigned.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center" }}>
            <h2 style={{ color: "#15803d", marginBottom: "10px" }}>
              🎉 অসাধারণ!
            </h2>
            <p style={{ color: "#475569", fontSize: "16px" }}>
              কোনো পেন্ডিং মাল নেই! সব এরাইভড মালের ব্রাঞ্চ যুক্ত করা হয়েছে।
            </p>
          </div>
        ) : (
          <table className="beautiful-table">
            <thead>
              <tr>
                <th>শিপিং মার্ক</th>
                <th>ট্র্যাকিং নম্বর (China)</th>
                <th>প্রোডাক্ট</th>
                <th>কার্টন নং</th>
                <th>ওজন (KG)</th>
                <th>স্ট্যাটাস</th>
                <th className="action-col">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {unassigned.map((s) => (
                <tr key={s._id} className="table-row">
                  <td>
                    <span className="batch-name-highlight">
                      📦 {s.shippingMark}
                    </span>
                  </td>
                  <td>{s.chinaTrackingNo || "-"}</td>
                  <td>{s.productName || "-"}</td>
                  <td>{s.cartonNo || "-"}</td>
                  <td>
                    <strong>{s.actualWeight || s.grossWeight || 0}</strong> KG
                  </td>
                  <td>
                    {/* স্ট্যাটাস অনুযায়ী ডাইনামিক ব্যাজ */}
                    <span
                      className={`status-badge ${s.status === "Delivered" ? "delivered" : "arrived"}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="action-col">
                    <button
                      className="save-btn"
                      onClick={() => {
                        // 🔥 স্মার্ট ট্রিক: শিপিং মার্ক সাথে নিয়ে ব্রাঞ্চ খোলার পেজে পাঠানো হচ্ছে
                        navigate(`/branch/new`, {
                          state: { prefillShippingMark: s.shippingMark },
                        });
                      }}
                    >
                      ➕ নতুন ব্রাঞ্চ খুলুন
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 🔥 Modern Dashboard CSS */}
      <style>{`
        .batch-page { padding: 20px; max-width: 1200px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        
        .batch-header { margin-bottom: 25px; }
        .title-area h1 { color: #0f172a; font-size: 26px; margin: 0 0 8px 0; }
        .title-area p { color: #64748b; font-size: 15px; margin: 0; }
        
        .modern-table-container { background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #eee; min-height: 200px; }
        
        .beautiful-table { width: 100%; border-collapse: collapse; white-space: nowrap; text-align: left; }
        .beautiful-table th { background: #003580; color: white; padding: 16px; font-size: 14px; font-weight: 600; }
        .beautiful-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; vertical-align: middle; }
        
        .table-row:hover { background-color: #f8fbff; transition: background-color 0.2s ease; }
        
        .batch-name-highlight { font-weight: 700; color: #0284c7; font-size: 15px; display: inline-flex; align-items: center; gap: 5px; }
        
        /* Status Badges */
        .status-badge { padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .status-badge.arrived { background: #dcfce7; color: #15803d; }
        .status-badge.delivered { background: #e0e7ff; color: #4f46e5; }
        
        .action-col { text-align: center; }
        
        /* Action Button */
        .save-btn { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(37,99,235,0.2); }
        .save-btn:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 4px 8px rgba(37,99,235,0.3); }
      `}</style>
    </div>
  );
}
