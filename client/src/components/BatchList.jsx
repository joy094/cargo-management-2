//src/components/BatchList.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./BatchList.css";

export default function BatchList() {
  const [batches, setBatches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  // ✅ পোর্টের অপশনসমূহ
  const portOptions = {
    Air: ["Guangzhou (CAN)", "Hong Kong (HKG)", "Shenzhen (SZX)"],
    Sea: ["Guangzhou Port", "Ningbo Port", "Shanghai Port"],
    "Hand Carry": ["Special Hand Carry", "Airport Collection"],
  };

  const [newBatch, setNewBatch] = useState({
    batchName: "",
    flightNumber: "",
    flightDate: "",
    shipmentType: "Air", // ডিফল্ট রুট
    originPort: "Guangzhou (CAN)", // ডিফল্ট পোর্ট
  });

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await axios.get("/api/batches");
      const sortedData = res.data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
      setBatches(sortedData);
    } catch (err) {
      console.error("Error fetching batches:", err);
    }
  };

  // ✅ রুট পরিবর্তন হলে পোর্ট অটোমেটিক আপডেট করার লজিক
  const handleRouteSelect = (e) => {
    const selectedRoute = e.target.value;
    setNewBatch({
      ...newBatch,
      shipmentType: selectedRoute,
      originPort: portOptions[selectedRoute][0], // ওই রুটের প্রথম পোর্ট সিলেক্ট হবে
    });
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/batches", newBatch);
      setShowModal(false);
      setNewBatch({
        batchName: "",
        flightNumber: "",
        flightDate: "",
        shipmentType: "Air",
        originPort: "Guangzhou (CAN)",
      });
      fetchBatches();
    } catch (err) {
      alert("ব্যাচ তৈরি করতে সমস্যা হয়েছে।");
    }
  };

  const deleteBatch = async (id) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই ব্যাচটি ডিলিট করতে চান?"))
      return;
    try {
      await axios.delete(`/api/batches/${id}`);
      fetchBatches();
    } catch (err) {
      alert("ডিলিট করা সম্ভব হয়নি।");
    }
  };

  return (
    <div className="batch-page">
      <div className="batch-header">
        <div className="title-area">
          <h1>✈️ ব্যাচ ও ফ্লাইট ম্যানেজমেন্ট</h1>
          <p>নতুন ফ্লাইট গ্রুপ করুন এবং ব্যাচ ভিত্তিক কস্টিং চেক করুন</p>
        </div>
        <button className="add-batch-btn" onClick={() => setShowModal(true)}>
          + নতুন ব্যাচ তৈরি করুন
        </button>
      </div>

      <div className="modern-table-container">
        <table className="beautiful-table">
          <thead>
            <tr>
              <th>ব্যাচ / ফ্লাইটের নাম</th>
              <th>রুট ও পোর্ট</th>
              <th>ফ্লাইট নম্বর</th>
              <th>ফ্লাইট তারিখ</th>
              <th>শিপমেন্ট সংখ্যা</th>
              <th>স্ট্যাটাস</th>
              <th className="action-col">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b._id} className="table-row">
                <td>
                  <span className="batch-name-highlight">📦 {b.batchName}</span>
                </td>
                <td>
                  <div className="route-info">
                    <strong>{b.shipmentType || "Air"}</strong>
                    <br />
                    <span className="port-text">{b.originPort || "-"}</span>
                  </div>
                </td>
                <td className="flight-no">{b.flightNumber || "N/A"}</td>
                <td className="date-text">
                  {b.flightDate
                    ? new Date(b.flightDate).toLocaleDateString("bn-BD")
                    : "-"}
                </td>
                <td>
                  <span className="count-badge">{b.shipmentCount || 0} টি</span>
                </td>
                <td>
                  {/* ✅ স্ট্যাটাসের স্পেস হাইফেনে কনভার্ট করা হয়েছে যাতে CSS কাজ করে */}
                  <span
                    className={`status-badge ${
                      b.status
                        ? b.status.toLowerCase().replace(/ /g, "-")
                        : "warehouse-received"
                    }`}
                  >
                    {b.status || "Warehouse Received"}
                  </span>
                </td>
                <td className="action-col">
                  <div className="action-buttons">
                    <button
                      className="btn-view"
                      onClick={() => navigate(`/batches/${b._id}`)}
                    >
                      📂 বিস্তারিত
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => deleteBatch(b._id)}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>নতুন চালান গ্রুপ করুন</h2>
            <form onSubmit={handleCreateBatch}>
              <div className="input-group">
                <label>ব্যাচের নাম *</label>
                <input
                  required
                  placeholder="যেমন: MAY-20-DXB"
                  value={newBatch.batchName}
                  onChange={(e) =>
                    setNewBatch({ ...newBatch, batchName: e.target.value })
                  }
                />
              </div>

              {/* ✅ রুট এবং পোর্টের জন্য ড্রপডাউন */}
              <div className="grid-2">
                <div className="input-group">
                  <label>Route (রুট) *</label>
                  <select
                    value={newBatch.shipmentType}
                    onChange={handleRouteSelect}
                    required
                  >
                    <option value="Air">🚀 Air Cargo</option>
                    <option value="Sea">🚢 Sea Cargo</option>
                    <option value="Hand Carry">💼 Hand Carry</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Origin Port (পোর্ট) *</label>
                  <select
                    value={newBatch.originPort}
                    onChange={(e) =>
                      setNewBatch({ ...newBatch, originPort: e.target.value })
                    }
                    required
                  >
                    {portOptions[newBatch.shipmentType].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>ফ্লাইট নম্বর</label>
                  <input
                    placeholder="যেমন: EK582"
                    value={newBatch.flightNumber}
                    onChange={(e) =>
                      setNewBatch({ ...newBatch, flightNumber: e.target.value })
                    }
                  />
                </div>
                <div className="input-group">
                  <label>ফ্লাইট তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={newBatch.flightDate}
                    onChange={(e) =>
                      setNewBatch({ ...newBatch, flightDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  বাতিল
                </button>
                <button type="submit" className="save-btn">
                  সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .modern-table-container { background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; margin-top: 20px; border: 1px solid #eee; }
        .beautiful-table { width: 100%; border-collapse: collapse; white-space: nowrap; }
        .beautiful-table th { background: #003580; color: white; padding: 16px; text-align: left; font-size: 14px; }
        .beautiful-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .table-row:hover { background-color: #f8fbff; }
        
        .batch-name-highlight { font-weight: bold; color: #003580; }
        .route-info { line-height: 1.4; }
        .route-info strong { color: #0284c7; font-size: 13px; }
        .port-text { font-size: 11px; color: #64748b; }
        
        .status-badge { padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .status-badge.warehouse-received { background: #e0f2fe; color: #0369a1; }
        .status-badge.arrived { background: #dcfce7; color: #15803d; }
        .status-badge.processing { background: #fef3c7; color: #92400e; }
        
        .count-badge { background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-weight: bold; color: #475569; }
        
        .action-buttons { display: flex; gap: 10px; }
        .btn-view { background: #003580; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
        .btn-delete { background: #fee2e2; color: #ef4444; border: none; padding: 8px; border-radius: 6px; cursor: pointer; }

        /* Modal Styles Updates */
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .modal-content { width: 550px; }
        .modal-content select { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; background: #fff; font-family: inherit; }
      `}</style>
    </div>
  );
}
