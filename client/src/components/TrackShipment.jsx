//src/components/TrackShipment.jsx

import React, { useState } from "react";
import axios from "axios";

export default function TrackShipment() {
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!trackingCode.trim()) return;

    setLoading(true);
    setError("");
    setTrackingData(null);

    try {
      // API কল
      const res = await axios.get(
        `/api/tracking/public/tracking/${trackingCode}`,
      );
      if (res.data.success) {
        setTrackingData(res.data);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Tracking details not found. Please check your tracking number.",
      );
    } finally {
      setLoading(false);
    }
  };

  // 🔥 ইন্টারন্যাশনাল ডেট ফরম্যাটার (e.g., 13 Jun 2026, 10:30 PM)
  const formatInternationalTime = (dateString) => {
    if (!dateString) return "";
    const options = {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    return new Date(dateString).toLocaleString("en-US", options);
  };
  return (
    <div className="tracking-page-container">
      {/* 🚀 Hero Search Section */}
      <div className="tracking-hero">
        <h1>Track Your Products🌍</h1>
        <p>Enter your MAT-Code or China Tracking No</p> {/* 🔥 আপডেট করা হলো */}
        <form onSubmit={handleSearch} className="tracking-form">
          <input
            type="text"
            placeholder="e.g. MAT-123456 or 73248..." /* 🔥 আপডেট করা হলো */
            value={trackingCode}
            onChange={(e) => setTrackingCode(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Searching..." : "🔍 Track Now"}
          </button>
        </form>
        {error && <div className="tracking-error">⚠️ {error}</div>}
      </div>

      {/* 📦 Tracking Result Section */}
      {trackingData && (
        <div className="tracking-result-wrapper">
          {/* Left Side: Details Cards */}
          <div className="tracking-details">
            {/* 🏷️ Shipment Overview */}
            <div className="detail-card">
              <h3>🏷️ Shipment Overview</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span>Tracking No:</span>
                  <strong>{trackingData?.trackingInfo?.trackingNumber}</strong>
                </div>
                <div className="info-item">
                  <span>China Tracking:</span>
                  <strong>{trackingData?.trackingInfo?.chinaTrackingNo}</strong>
                </div>
                <div className="info-item">
                  <span>Shipping Mark:</span>
                  <strong className="highlight-text">
                    {trackingData?.customerInfo?.shippingMark}
                  </strong>
                </div>
                <div className="info-item">
                  <span>Status:</span>
                  <strong className="status-badge">
                    {trackingData?.trackingInfo?.currentStatus}
                  </strong>
                </div>
              </div>
            </div>

            {/* 📦 Product Information */}
            <div className="detail-card">
              <h3>📦 Product Information</h3>
              <div className="info-grid">
                {/* 🔥 Category (By Sea / By Air) Safe Render */}
                <div
                  className="info-item"
                  style={{ gridColumn: "1 / -1", marginBottom: "10px" }}
                >
                  <span>Shipment Type:</span>
                  <span
                    className={`category-badge ${trackingData?.productDetails?.category?.toLowerCase()?.includes("air") ? "air" : "sea"}`}
                  >
                    {trackingData?.productDetails?.category
                      ?.toLowerCase()
                      ?.includes("air")
                      ? "✈️"
                      : "🚢"}{" "}
                    {trackingData?.productDetails?.category || "Standard Cargo"}
                  </span>
                </div>

                <div className="info-item">
                  <span>Product Name:</span>
                  <strong>{trackingData?.productDetails?.productName}</strong>
                </div>
                <div className="info-item">
                  <span>Carton No:</span>
                  <strong>
                    {trackingData?.productDetails?.cartonNo || "N/A"}
                  </strong>
                </div>
                <div className="info-item">
                  <span>Quantity:</span>
                  <strong>{trackingData?.productDetails?.quantity} PCS</strong>
                </div>
                <div className="info-item">
                  <span>Total Weight:</span>
                  <strong>{trackingData?.productDetails?.totalWeight}</strong>
                </div>
                <div className="info-item">
                  <span>Total CBM:</span>
                  <strong>{trackingData?.productDetails?.totalCBM}</strong>
                </div>
              </div>
            </div>

            {/* Master Box Alert (যদি থাকে) */}
            {trackingData?.masterBox && (
              <div className="master-box-alert">
                <strong>🛡️ Security Note:</strong> {trackingData.masterBox.note}
                <br />
                <span>
                  Master Carton No:{" "}
                  <strong>
                    {trackingData.masterBox.cartonNo ||
                      trackingData.masterBox.trackingNumber}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Right Side: Timeline Progress */}
          <div className="tracking-timeline-section">
            <h3>📍 Tracking History</h3>
            <div className="timeline">
              {trackingData?.timeline?.map((step, index) => (
                <div
                  className={`timeline-item ${step.completed ? "completed" : "pending"}`}
                  key={index}
                >
                  <div className="timeline-icon">
                    {step.completed ? "✓" : "⏳"}
                  </div>
                  <div className="timeline-content">
                    <h4>
                      {step.status}
                      {/* 🔥 Arrived স্টেজের পাশে Uttara Office ম্যাপ লিংক */}
                      {step.status === "Arrived" && (
                        <a
                          href="https://goo.gl/maps/rJD1EoQT44DyEouo6?g_st=ac"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="office-location-link"
                          title="View on Google Maps"
                        >
                          📍 Uttara Office
                        </a>
                      )}
                    </h4>
                    {step.date && (
                      <p className="timeline-date">
                        🕒 {formatInternationalTime(step.date)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* 👨‍💻 Developer Footer */}
      <div className="developer-footer">
        <p>
          Developed by{" "}
          <a
            href="https://github.com/joy094"
            target="_blank"
            rel="noopener noreferrer"
          >
            MD JAKARIA
          </a>
        </p>
      </div>
      {/* 🎨 Internal CSS */}
      <style>{`
        .tracking-page-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 40px 20px;
          font-family: 'Inter', sans-serif;
        }

        .tracking-hero {
          text-align: center;
          background: #0f172a;
          color: white;
          padding: 50px 20px;
          border-radius: 16px;
          margin-bottom: 40px;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2);
        }

        .tracking-hero h1 { margin: 0 0 10px; font-size: 2.2rem; }
        .tracking-hero p { color: #94a3b8; margin-bottom: 25px; }

        .tracking-form {
          display: flex;
          justify-content: center;
          gap: 10px;
          max-width: 600px;
          margin: 0 auto;
        }

        .tracking-form input {
          flex: 1;
          padding: 15px 20px;
          border-radius: 8px;
          border: none;
          font-size: 16px;
          outline: none;
        }

        .tracking-form button {
          background: #2563eb;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: 0.3s;
        }
        .tracking-form button:hover { background: #1d4ed8; }

        .tracking-error {
          margin-top: 15px;
          background: #fee2e2;
          color: #dc2626;
          padding: 10px;
          border-radius: 8px;
          display: inline-block;
          font-weight: 600;
        }

        .tracking-result-wrapper {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }

        .detail-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          padding: 25px;
          border-radius: 12px;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        }

        .detail-card h3 {
          margin: 0 0 20px;
          color: #0f172a;
          border-bottom: 2px solid #f1f5f9;
          padding-bottom: 10px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .info-item span {
          display: block;
          font-size: 13px;
          color: #64748b;
          margin-bottom: 4px;
        }

        .info-item strong {
          color: #1e293b;
          font-size: 15px;
        }

        .highlight-text {
          color: #0284c7 !important;
          background: #e0f2fe;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .status-badge {
          background: #dcfce7;
          color: #16a34a !important;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px !important;
          text-transform: uppercase;
        }

        .category-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          margin-top: 5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .category-badge.sea {
          background: #e0f2fe;
          color: #0369a1;
          border: 1px solid #bae6fd;
        }
        .category-badge.air {
          background: #fef3c7;
          color: #d97706;
          border: 1px solid #fde68a;
        }

        .master-box-alert {
          background: #fffbeb;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          border-radius: 8px;
          color: #b45309;
        }

        .tracking-timeline-section {
          background: #fff;
          border: 1px solid #e2e8f0;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        }

        .tracking-timeline-section h3 {
          margin: 0 0 25px;
          color: #0f172a;
          border-bottom: 2px solid #f1f5f9;
          padding-bottom: 10px;
        }

        .timeline {
          position: relative;
          padding-left: 20px;
        }

        .timeline::before {
          content: '';
          position: absolute;
          left: 31px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #e2e8f0;
        }

        .timeline-item {
          position: relative;
          display: flex;
          gap: 20px;
          margin-bottom: 30px;
        }

        .timeline-item:last-child { margin-bottom: 0; }

        .timeline-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          z-index: 1;
          background: #cbd5e1;
          color: white;
        }

        .timeline-item.completed .timeline-icon {
          background: #10b981;
          box-shadow: 0 0 0 4px #d1fae5;
        }

        .timeline-item.pending .timeline-content {
          opacity: 0.5;
        }

        .timeline-content h4 {
          margin: 0 0 5px;
          color: #0f172a;
          font-size: 15px;
        }

        .timeline-content p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }


        /* Office Location Map Link */
        .office-location-link {
          font-size: 12px;
          color: #2563eb;
          text-decoration: none;
          margin-left: 10px;
          background: #eff6ff;
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 700;
          transition: all 0.2s ease;
          display: inline-block;
          vertical-align: middle;
        }
        .office-location-link:hover {
          background: #dbeafe;
          color: #1d4ed8;
          transform: translateY(-1px);
        }

        /* Developer Footer */
        .developer-footer {
          text-align: center;
          margin-top: 60px;
          padding-top: 25px;
          border-top: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 14px;
        }
        .developer-footer a {
          color: #0f172a;
          font-weight: 800;
          text-decoration: none;
          transition: color 0.2s;
          padding-left: 4px;
        }
        .developer-footer a:hover {
          color: #2563eb;
        }

        @media screen and (max-width: 768px) {
          .tracking-result-wrapper {
            grid-template-columns: 1fr;
          }
          .tracking-form {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
