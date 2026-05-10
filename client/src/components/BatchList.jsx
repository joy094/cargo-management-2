//src/components/BatchList.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./BatchList.css";

export default function BatchList() {
  const [batches, setBatches] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // ✅ Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);

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
    shipmentType: "Air",
    originPort: "Guangzhou (CAN)",
  });

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await axios.get("/api/batches");
      // 🔥 এই লাইনটি বসান:
      console.log("Backend Data:", res.data);

      // 🔥 চেক করা হচ্ছে ব্যাকএন্ড থেকে সঠিক ডাটা (Array) আসছে কি না
      if (!Array.isArray(res.data)) {
        console.error("Backend Error:", res.data);
        alert("ব্যাকএন্ড এরর: " + (res.data.error || "Unknown Error"));
        return;
      }

      const sortedData = res.data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
      setBatches(sortedData);
    } catch (err) {
      console.error("Error fetching batches:", err);
      alert("সার্ভারের সাথে কানেক্ট করা যাচ্ছে না বা সার্ভার বন্ধ আছে!");
    }
  };

  // ✅ রুট পরিবর্তন (Create)
  const handleRouteSelect = (e) => {
    const selectedRoute = e.target.value;
    setNewBatch({
      ...newBatch,
      shipmentType: selectedRoute,
      originPort: portOptions[selectedRoute][0],
    });
  };

  // ✅ রুট পরিবর্তন (Edit)
  const handleEditRouteSelect = (e) => {
    const selectedRoute = e.target.value;
    setEditingBatch({
      ...editingBatch,
      shipmentType: selectedRoute,
      originPort: portOptions[selectedRoute][0],
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

  // ✅ এডিট সেভ করার ফাংশন
  const handleUpdateBatch = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/batches/${editingBatch._id}`, editingBatch);
      setShowEditModal(false);
      setEditingBatch(null);
      fetchBatches();
    } catch (err) {
      alert("ব্যাচ আপডেট করতে সমস্যা হয়েছে।");
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
              // 🔥 যদি heldCount > 0 হয়, তাহলে রো-এর ব্যাকগ্রাউন্ড হালকা লাল হবে
              <tr
                key={b._id}
                className={`table-row ${b.heldCount > 0 ? "has-held-items" : ""}`}
              >
                <td>
                  <span className="batch-name-highlight">📦 {b.batchName}</span>
                  {/* 🔥 হোল্ড করা বক্স থাকলে লাল ব্যাজ দেখাবে */}
                  {b.heldCount > 0 && (
                    <div className="held-badge">
                      ⚠️ {b.heldCount} Boxes Held
                    </div>
                  )}
                </td>
                <td>
                  <div className="route-info">
                    <strong>{b.shipmentType || "Air"}</strong>
                    <br />
                    <span className="port-text">{b.originPort || "-"}</span>
                  </div>
                </td>
                <td className="flight-no">{b.flightNumber || "N/A"}</td>

                {/* ✅ ফ্লাইট তারিখ ইংরেজিতে কনভার্ট করা হয়েছে */}
                <td className="date-text">
                  {b.flightDate
                    ? new Date(b.flightDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </td>

                <td>
                  <span className="count-badge">{b.shipmentCount || 0} টি</span>
                </td>
                <td>
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
                      📂
                    </button>
                    {/* ✅ এডিট বাটন */}
                    <button
                      className="btn-edit"
                      onClick={() => {
                        // তারিখটাকে input type="date" এর ফরম্যাটে (YYYY-MM-DD) সাজানো হচ্ছে
                        const formattedDate = b.flightDate
                          ? new Date(b.flightDate).toISOString().split("T")[0]
                          : "";
                        setEditingBatch({ ...b, flightDate: formattedDate });
                        setShowEditModal(true);
                      }}
                    >
                      ✏️
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

      {/* ✅ Create New Batch Modal */}
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

      {/* ✅ Edit Batch Modal */}
      {showEditModal && editingBatch && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>ব্যাচ আপডেট করুন</h2>
            <form onSubmit={handleUpdateBatch}>
              <div className="input-group">
                <label>ব্যাচের নাম *</label>
                <input
                  required
                  value={editingBatch.batchName}
                  onChange={(e) =>
                    setEditingBatch({
                      ...editingBatch,
                      batchName: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>Route (রুট) *</label>
                  <select
                    value={editingBatch.shipmentType || "Air"}
                    onChange={handleEditRouteSelect}
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
                    value={editingBatch.originPort}
                    onChange={(e) =>
                      setEditingBatch({
                        ...editingBatch,
                        originPort: e.target.value,
                      })
                    }
                    required
                  >
                    {portOptions[editingBatch.shipmentType || "Air"].map(
                      (p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>ফ্লাইট নম্বর</label>
                  <input
                    value={editingBatch.flightNumber}
                    onChange={(e) =>
                      setEditingBatch({
                        ...editingBatch,
                        flightNumber: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="input-group">
                  <label>ফ্লাইট তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={editingBatch.flightDate}
                    onChange={(e) =>
                      setEditingBatch({
                        ...editingBatch,
                        flightDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBatch(null);
                  }}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="save-btn"
                  style={{ background: "#eab308" }}
                >
                  আপডেট করুন
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
        
        /* 🔥 Hold Warning CSS */
        .has-held-items { background-color: #fef2f2 !important; }
        .held-badge { background: #ef4444; color: white; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; margin-top: 5px; display: inline-block; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2); }
        
        .batch-name-highlight { font-weight: bold; color: #003580; font-size: 15px; }
        .route-info { line-height: 1.4; }
        .route-info strong { color: #0284c7; font-size: 13px; }
        .port-text { font-size: 11px; color: #64748b; }
        
        .status-badge { padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .status-badge.warehouse-received { background: #e0f2fe; color: #0369a1; }
        .status-badge.arrived { background: #dcfce7; color: #15803d; }
        .status-badge.processing { background: #fef3c7; color: #92400e; }
        
        .count-badge { background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-weight: bold; color: #475569; }
        
        .action-buttons { display: flex; gap: 8px; }
        .btn-view { background: #003580; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; }
        .btn-edit { background: #eab308; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; }
        .btn-delete { background: #fee2e2; color: #ef4444; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; }

        .btn-view:hover { background: #002255; }
        .btn-edit:hover { background: #ca8a04; }
        .btn-delete:hover { background: #fca5a5; }

        /* Modal Styles Updates */
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .modal-content { width: 550px; }
        .modal-content select { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; background: #fff; font-family: inherit; }
      `}</style>
    </div>
  );
}
