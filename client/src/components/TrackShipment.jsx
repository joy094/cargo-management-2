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
        `/api/tracking/public/tracking/${trackingCode.trim()}`, // 🔥 URL ঠিক করে দেওয়া হয়েছে  `/api/tracking/public/tracking/${trackingCode}`,
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

  // 🔥 ইন্টারন্যাশনাল ডেট ফরম্যাটার
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
        <h1>Track Your Products 🌍</h1>
        <p>
          Enter your MAT-Code or China Tracking No (comma separated for
          multiple)
        </p>
        <form onSubmit={handleSearch} className="tracking-form">
          <input
            type="text"
            placeholder="e.g. MAT-123456, ZTO98765..."
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

      {/* 📦 Tracking Results Section */}
      {trackingData && trackingData.results && (
        <div className="all-results-container">
          {/* 📊 ১. Summary Box (নতুন যুক্ত করা হয়েছে) */}
          <div className="tracking-summary-card">
            <h2>📊 Tracking Summary</h2>
            <div className="summary-content">
              <p className="total-box">
                Total Parcels Found:{" "}
                <strong>{trackingData.summary?.totalBoxes || 0}</strong>
              </p>
              <div className="status-badges-container">
                {trackingData.summary?.statusBreakdown &&
                  Object.entries(trackingData.summary.statusBreakdown).map(
                    ([status, count]) => (
                      <span key={status} className="summary-status-badge">
                        {status}: <strong>{count}</strong>
                      </span>
                    ),
                  )}
              </div>
            </div>
          </div>

          {/* 📦 ২. Individual Box Cards (Loop) */}
          <div className="box-list">
            {trackingData.results.map((box, index) => (
              <div className="single-box-card" key={box.shipmentId}>
                <div className="box-header">
                  <h3>📦 Parcel {index + 1}</h3>
                  <span className="header-status">
                    {box.trackingInfo?.currentStatus}
                  </span>
                </div>

                <div className="tracking-result-wrapper">
                  {/* Left Side: Details */}
                  <div className="tracking-details">
                    <div className="detail-card">
                      <h3>🏷️ Overview</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <span>Tracking No:</span>
                          <strong>{box.trackingInfo?.trackingNumber}</strong>
                        </div>
                        <div className="info-item">
                          <span>China Tracking:</span>
                          <strong>{box.trackingInfo?.chinaTrackingNo}</strong>
                        </div>
                        <div className="info-item">
                          <span>Shipping Mark:</span>
                          <strong className="highlight-text">
                            {box.customerInfo?.shippingMark}
                          </strong>
                        </div>

                        {/* Shipment Type */}
                        <div
                          className="info-item"
                          style={{ gridColumn: "1 / -1", marginTop: "5px" }}
                        >
                          <span>Shipment Type:</span>
                          <span
                            className={`category-badge ${
                              box.productDetails?.category
                                ?.toLowerCase()
                                ?.includes("air")
                                ? "air"
                                : "sea"
                            }`}
                          >
                            {box.productDetails?.category
                              ?.toLowerCase()
                              ?.includes("air")
                              ? "✈️"
                              : "🚢"}{" "}
                            {box.productDetails?.category || "Standard Cargo"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="detail-card">
                      <h3>📦 Info</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <span>Product Name:</span>
                          <strong>
                            {box.productDetails?.productName || "N/A"}
                          </strong>
                        </div>
                        <div className="info-item">
                          <span>Carton No:</span>
                          <strong>
                            {box.productDetails?.cartonNo || "N/A"}
                          </strong>
                        </div>
                        <div className="info-item">
                          <span>Quantity:</span>
                          <strong>
                            {box.productDetails?.quantity || 1} PCS
                          </strong>
                        </div>
                        <div className="info-item">
                          <span>Total Weight:</span>
                          <strong>{box.productDetails?.totalWeight}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Master Box Alert */}
                    {box.masterBox && (
                      <div className="master-box-alert">
                        <strong>🛡️ Security Note:</strong> {box.masterBox.note}
                        <br />
                        <span>
                          Master Carton No:{" "}
                          <strong>
                            {box.masterBox.cartonNo ||
                              box.masterBox.trackingNumber}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Side: Timeline */}
                  <div className="tracking-timeline-section">
                    <h3>📍 History</h3>
                    <div className="timeline">
                      {box.timeline?.map((step, idx) => (
                        <div
                          className={`timeline-item ${
                            step.completed ? "completed" : "pending"
                          }`}
                          key={idx}
                        >
                          <div className="timeline-icon">
                            {step.completed ? "✓" : "⏳"}
                          </div>
                          <div className="timeline-content">
                            <h4>
                              {step.status}
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
              </div>
            ))}
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

      {/* 🎨 Internal CSS (Mobile First) */}
      <style>{`
        .tracking-page-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px 15px; /* Mobile padding */
          font-family: 'Inter', sans-serif;
        }

        .tracking-hero {
          text-align: center;
          background: #0f172a;
          color: white;
          padding: 40px 15px;
          border-radius: 16px;
          margin-bottom: 30px;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2);
        }

        .tracking-hero h1 { margin: 0 0 10px; font-size: 1.8rem; }
        .tracking-hero p { color: #94a3b8; margin-bottom: 25px; font-size: 14px; }

        .tracking-form {
          display: flex;
          flex-direction: column; /* Mobile first: Stacked */
          gap: 10px;
          max-width: 600px;
          margin: 0 auto;
        }

        .tracking-form input {
          padding: 15px;
          border-radius: 8px;
          border: none;
          font-size: 16px;
          outline: none;
          width: 100%;
          box-sizing: border-box;
        }

        .tracking-form button {
          background: #2563eb;
          color: white;
          border: none;
          padding: 15px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: 0.3s;
          width: 100%;
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
          font-size: 14px;
        }

        /* Summary Section */
        .tracking-summary-card {
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 30px;
          text-align: center;
        }
        .tracking-summary-card h2 { margin: 0 0 15px; font-size: 1.4rem; color: #0f172a; }
        .total-box { font-size: 1.1rem; color: #334155; margin-bottom: 15px; }
        .total-box strong { font-size: 1.3rem; color: #2563eb; }
        
        .status-badges-container {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
        }
        .summary-status-badge {
          background: #e2e8f0;
          color: #1e293b;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
        }

        /* Box Cards */
        .box-list {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .single-box-card {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          border: 1px solid #f1f5f9;
          overflow: hidden;
        }

        .box-header {
          background: #1e293b;
          color: white;
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .box-header h3 { margin: 0; font-size: 1.1rem; }
        .header-status { background: #10b981; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; }

        /* Grid for details and timeline */
        .tracking-result-wrapper {
          display: grid;
          grid-template-columns: 1fr; /* Mobile First: 1 Column */
          gap: 20px;
          padding: 20px;
        }

        .detail-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 15px;
        }
        .detail-card h3 { margin: 0 0 15px; font-size: 1rem; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;}

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr; /* Info grid stays 2 col mostly */
          gap: 10px;
        }

        .info-item span { display: block; font-size: 12px; color: #64748b; margin-bottom: 2px; }
        .info-item strong { color: #1e293b; font-size: 14px; word-break: break-all; }

        .highlight-text { color: #0284c7 !important; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; }

        .category-badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 12px; }
        .category-badge.sea { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
        .category-badge.air { background: #fef3c7; color: #d97706; border: 1px solid #fde68a; }

        .master-box-alert { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 6px; color: #b45309; font-size: 13px; margin-top: 10px;}

        .tracking-timeline-section h3 { margin: 0 0 20px; color: #0f172a; font-size: 1.1rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; }

        .timeline { position: relative; padding-left: 15px; }
        .timeline::before { content: ''; position: absolute; left: 24px; top: 0; bottom: 0; width: 2px; background: #e2e8f0; }

        .timeline-item { position: relative; display: flex; gap: 15px; margin-bottom: 25px; }
        .timeline-item:last-child { margin-bottom: 0; }

        .timeline-icon { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; z-index: 1; background: #cbd5e1; color: white; margin-top: 2px;}
        .timeline-item.completed .timeline-icon { background: #10b981; box-shadow: 0 0 0 3px #d1fae5; }
        .timeline-item.pending .timeline-content { opacity: 0.5; }

        .timeline-content h4 { margin: 0 0 3px; color: #0f172a; font-size: 14px; }
        .timeline-content p { margin: 0; color: #64748b; font-size: 12px; }

        .office-location-link { font-size: 11px; color: #2563eb; text-decoration: none; margin-left: 8px; background: #eff6ff; padding: 2px 6px; border-radius: 10px; font-weight: bold; display: inline-block;}
        .office-location-link:hover { background: #dbeafe; }

        .developer-footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 13px; }
        .developer-footer a { color: #0f172a; font-weight: 800; text-decoration: none; }

        /* 🔥 Tablet & Desktop View */
        @media screen and (min-width: 768px) {
          .tracking-page-container { padding: 40px 20px; }
          .tracking-hero h1 { font-size: 2.2rem; }
          .tracking-form { flex-direction: row; }
          .tracking-form input { flex: 1; width: auto; }
          .tracking-form button { width: auto; padding: 15px 30px; }
          
          /* Desktop: Two columns for details and timeline */
          .tracking-result-wrapper { grid-template-columns: 1fr 1fr; gap: 30px; padding: 30px; }
        }
      `}</style>
    </div>
  );
}
