import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function BoxDetails() {
  const { id } = useParams();
  const [boxData, setBoxData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBoxDetails = async () => {
      try {
        const res = await axios.get(`/api/shipments/qr-details/${id}`);
        if (res.data.success) {
          setBoxData(res.data);
        } else {
          setError("ডেটা খুঁজে পাওয়া যায়নি!");
        }
      } catch (err) {
        console.error(err);
        setError("সার্ভার সমস্যা বা বক্সটি ডিলিট হয়ে গেছে!");
      } finally {
        setLoading(false);
      }
    };

    fetchBoxDetails();
  }, [id]);

  if (loading)
    return (
      <div className="loading-screen">অপেক্ষা করুন, ডেটা লোড হচ্ছে...</div>
    );
  if (error) return <div className="error-screen">⚠️ {error}</div>;

  const { mainBox, subBoxes } = boxData;
  const isMaster = mainBox.isMasterCarton;

  return (
    <div className="mobile-box-container">
      {/* Header Section */}
      <div className="box-header">
        <span className="badge">
          {isMaster ? "📦 MASTER BOX" : "📦 GENERAL BOX"}
        </span>
        <h2>{mainBox.shippingMark}</h2>
        <p className="tracking-text">
          Tracking: {mainBox.chinaTrackingNo || "N/A"}
        </p>
      </div>

      {/* Main Info Card */}
      <div className="info-card">
        <div className="info-row">
          <span className="label">Carton No:</span>
          <span className="value strong">{mainBox.cartonNo || "-"}</span>
        </div>
        <div className="info-row">
          <span className="label">Product:</span>
          <span className="value">{mainBox.productName || "-"}</span>
        </div>
        <div className="info-row">
          <span className="label">Weight (China):</span>
          <span className="value">{mainBox.grossWeight || 0} KG</span>
        </div>
        <div className="info-row">
          <span className="label">Total Quantity:</span>
          <span className="value highlight">
            {isMaster
              ? subBoxes.reduce(
                  (acc, curr) => acc + (Number(curr.quantity) || 1),
                  0,
                )
              : mainBox.quantity || 1}{" "}
            PCS
          </span>
        </div>
      </div>

      {/* Sub-boxes List (Only for Master Carton) */}
      {isMaster && subBoxes.length > 0 && (
        <div className="sub-box-section">
          <h3>Sub-boxes Inside ({subBoxes.length})</h3>
          <div className="sub-box-list">
            {subBoxes.map((sub, idx) => (
              <div key={sub._id} className="sub-box-item">
                <div className="sub-sl">{idx + 1}</div>
                <div className="sub-details">
                  <div className="sub-mark">{sub.shippingMark}</div>
                  <div className="sub-track">
                    {sub.chinaTrackingNo || "No Tracking"}
                  </div>
                </div>
                <div className="sub-qty">{sub.quantity || 1} Pcs</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSS for Mobile View */}
      <style>{`
        .loading-screen, .error-screen { display: flex; justify-content: center; align-items: center; height: 100vh; font-size: 18px; font-weight: bold; color: #475569; background: #f8fafc; }
        .error-screen { color: #ef4444; }
        
        .mobile-box-container { max-width: 600px; margin: 0 auto; background: #f4f7fa; min-height: 100vh; padding: 15px; font-family: 'Inter', sans-serif; }
        
        .box-header { background: #0f172a; color: white; padding: 25px 20px; border-radius: 16px; text-align: center; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .badge { background: #38bdf8; color: #0f172a; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; display: inline-block; margin-bottom: 10px; }
        .box-header h2 { margin: 0 0 5px; font-size: 26px; font-weight: 800; color: #bae6fd; }
        .tracking-text { margin: 0; font-size: 13px; opacity: 0.8; font-family: monospace; }
        
        .info-card { background: white; padding: 20px; border-radius: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.03); margin-bottom: 20px; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .info-row:last-child { border-bottom: none; }
        .info-row .label { color: #64748b; font-weight: 600; }
        .info-row .value { color: #0f172a; font-weight: 500; }
        .info-row .strong { font-weight: 800; color: #0284c7; }
        .info-row .highlight { font-weight: 800; color: #d97706; background: #fef3c7; padding: 2px 8px; border-radius: 4px; }
        
        .sub-box-section h3 { font-size: 16px; color: #334155; margin-bottom: 15px; padding-left: 5px; border-left: 4px solid #0ea5e9; }
        .sub-box-list { display: flex; flex-direction: column; gap: 10px; }
        .sub-box-item { display: flex; align-items: center; background: white; padding: 15px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border-left: 3px solid #cbd5e1; }
        .sub-sl { background: #f1f5f9; color: #64748b; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; border-radius: 50%; font-size: 12px; font-weight: bold; margin-right: 15px; }
        .sub-details { flex: 1; }
        .sub-mark { font-weight: 700; color: #0f172a; font-size: 15px; }
        .sub-track { font-size: 11px; color: #64748b; font-family: monospace; margin-top: 3px; }
        .sub-qty { font-weight: 800; color: #16a34a; font-size: 14px; background: #dcfce7; padding: 4px 8px; border-radius: 6px; }
      `}</style>
    </div>
  );
}
