import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./BatchDetails.css";

export default function BatchDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    try {
      const res = await axios.get(`/api/batches/${id}`);
      setBatch(res.data.batch);
      setShipments(res.data.shipments);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // ব্যাচে নেই এমন শিপমেন্টগুলো লোড করা
  const fetchUnassigned = async () => {
    const res = await axios.get("/api/shipments");
    // শুধু সেই শিপমেন্টগুলো ফিল্টার করা যেগুলোতে কোনো ব্যাচ নেই
    const filtered = res.data.filter((s) => !s.batch);
    setUnassigned(filtered);
    setShowAddModal(true);
  };

  const handleStatusUpdate = async (newStatus) => {
    if (window.confirm(`আপনি কি পুরো ব্যাচটি "${newStatus}" করতে চান?`)) {
      await axios.put(`/api/batches/${id}/status`, { status: newStatus });
      fetchDetails();
    }
  };

  const assignShipments = async () => {
    await axios.put(`/api/batches/${id}/assign`, { shipmentIds: selectedIds });
    setShowAddModal(false);
    setSelectedIds([]);
    fetchDetails();
  };

  if (loading) return <div className="loader">লোডিং...</div>;

  // মোট ওজন ও বক্স ক্যালকুলেশন
  const totalWeight = shipments.reduce((sum, s) => sum + (s.weight || 0), 0);
  const totalBoxes = shipments.reduce((sum, s) => sum + (s.boxCount || 0), 0);

  return (
    <div className="batch-details-page">
      {/* Header Card */}
      <div className="detail-header-card">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate("/batches")}>
            ⬅ ব্যাচ লিস্ট
          </button>
          <h1>{batch?.batchName}</h1>
          <p>
            ✈️ ফ্লাইট: {batch?.flightNumber} | 📅 তারিখ:{" "}
            {new Date(batch?.flightDate).toLocaleDateString("bn-BD")}
          </p>
        </div>
        <div className="header-right">
          <div className={`status-badge ${batch?.status.toLowerCase()}`}>
            {batch?.status}
          </div>
          <select
            className="status-select"
            onChange={(e) => handleStatusUpdate(e.target.value)}
          >
            <option value="">স্ট্যাটাস পরিবর্তন করুন</option>
            <option value="Loaded">Loaded</option>
            <option value="In-Transit">In-Transit</option>
            <option value="Arrived">Arrived</option>
            <option value="Released">Released</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="batch-stats">
        <div className="stat-item">
          <span>মোট শিপমেন্ট</span>
          <strong>{shipments.length} টি</strong>
        </div>
        <div className="stat-item">
          <span>মোট ওজন</span>
          <strong>{totalWeight.toFixed(2)} KG</strong>
        </div>
        <div className="stat-item">
          <span>মোট বক্স</span>
          <strong>{totalBoxes} টি</strong>
        </div>
      </div>

      {/* Shipment Table */}
      <div className="shipment-list-section">
        <div className="section-header">
          <h2>📦 এই ব্যাচের মালপত্রের তালিকা</h2>
          <button className="assign-btn" onClick={fetchUnassigned}>
            + নতুন মাল যুক্ত করুন
          </button>
        </div>

        <table className="details-table">
          <thead>
            <tr>
              <th>ট্র্যাকিং নং</th>
              <th>কাস্টমার ও আইটেম</th>
              <th>ওজন</th>
              <th>বক্স</th>
              <th>শিপিং মার্ক</th>
              <th>বিল</th>
              <th>জমা</th>
              <th>বকেয়া</th>
              <th>অবস্থা</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => (
              <tr key={s._id}>
                <td className="trk-text">{s.trackingNumber}</td>
                <td>
                  <strong>{s.shipmentLabel}</strong> <br />
                  <small>{s.itemName}</small>
                </td>
                <td>{s.weight} KG</td>
                <td>{s.boxCount}</td>
                <td>{s.shippingMark || "-"}</td>
                <td>৳ {s.totalCharge}</td>
                <td>৳ {s.paidAmount}</td>
                <td>৳ {s.totalCharge - s.paidAmount}</td>
                

                <td>
                  <span className={`pill ${s.status.toLowerCase()}`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assignment Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <h3>শিপমেন্ট সিলেক্ট করুন</h3>
            <div className="unassigned-list">
              {unassigned.map((s) => (
                <div key={s._id} className="selectable-item">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelectedIds([...selectedIds, s._id]);
                      else
                        setSelectedIds(
                          selectedIds.filter((id) => id !== s._id),
                        );
                    }}
                  />
                  <span>
                    {s.trackingNumber} - {s.shipmentLabel} ({s.weight}kg)
                  </span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowAddModal(false)}>বাতিল</button>
              <button className="confirm-btn" onClick={assignShipments}>
                ব্যাচে যুক্ত করুন ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
