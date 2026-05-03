// src/components/ShipmentProfile.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function ShipmentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`/api/reports/shipment-ledger/${id}`);
        setData(res.data);
      } catch (err) {
        console.error("Error fetching profile:", err);
        alert("প্রোফাইল লোড করতে সমস্যা হয়েছে।");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) return <div className="loading">Loading Profile...</div>;
  if (!data) return <div className="error">No Data Found</div>;

  const { shipment, payments } = data;
  const due = shipment.totalCharge - shipment.paidAmount;

  return (
    <div className="profile-container">
      {/* Header Section */}
      <div className="profile-header">
        <div className="id-badge">
          <span>Tracking ID</span>
          <h1>{shipment.trackingNumber}</h1>
        </div>
        <div className="status-box">
          <span className={`status-tag ${shipment.status}`}>
            {shipment.status}
          </span>
          <p>
            Booking Date:{" "}
            {new Date(shipment.createdAt).toLocaleDateString("bn-BD")}
          </p>
        </div>
      </div>

      <div className="info-grid">
        {/* Section 1: Customer & Agency */}
        <div className="info-card">
          <h3>👤 Sender & Agency</h3>
          <div className="detail-row">
            <span className="label">Sender Name:</span>
            <span className="value">
              {shipment.shipmentLabel || shipment.customer?.fullName}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Mobile:</span>
            <span className="value">
              {shipment.customer?.phoneNumber || "N/A"}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Branch:</span>
            <span className="value">
              {shipment.agency?.name || "Unassigned"}
            </span>
          </div>
        </div>

        {/* Section 2: Receiver (Optional Handling) */}
        <div className="info-card receiver-card">
          <h3>📍 Receiver Information</h3>
          {shipment.receiverName ? (
            <>
              <div className="detail-row">
                <span className="label">Name:</span>
                <span className="value">{shipment.receiverName}</span>
              </div>
              <div className="detail-row">
                <span className="label">Mobile:</span>
                <span className="value">{shipment.receiverMobile}</span>
              </div>
              <div className="detail-row">
                <span className="label">Address:</span>
                <span className="value">{shipment.receiverAddress}</span>
              </div>
            </>
          ) : (
            <div className="empty-receiver">
              <p>
                Sent to: <strong>Default Cargo Warehouse</strong>
              </p>
              <small>(No specific receiver assigned)</small>
            </div>
          )}
        </div>

        {/* Section 3: Logistics Details */}
        <div className="info-card accent-card">
          <h3>✈️ Logistics Details</h3>
          <div className="detail-row">
            <span className="label">Shipping Mark:</span>
            <span className="value highlight">
              {shipment.shippingMark || "-"}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">China Tracking:</span>
            <span className="value">{shipment.chinaTrackingNo || "N/A"}</span>
          </div>
          <div className="detail-row">
            <span className="label">Route:</span>
            <span className="value">
              {shipment.routeCategory} ({shipment.originPort})
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Carton No:</span>
            <span className="value">{shipment.cartonNo || "-"}</span>
          </div>
        </div>

        {/* Section 4: Item & Dimensions */}
        <div className="info-card">
          <h3>📦 Item & Measurement</h3>
          <div className="detail-row">
            <span className="label">Product Name:</span>
            <span className="value">{shipment.itemName || "-"}</span>
          </div>
          <div className="detail-row">
            <span className="label">Quantity:</span>
            <span className="value">{shipment.quantity} Pcs</span>
          </div>
          <div className="detail-row">
            <span className="label">Dimensions (L x W x H):</span>
            <span className="value">
              {shipment.dimensions?.length || 0} x{" "}
              {shipment.dimensions?.width || 0} x{" "}
              {shipment.dimensions?.height || 0} cm
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Total CBM:</span>
            <span className="value cbm-text">{shipment.cbm} m³</span>
          </div>
        </div>
      </div>

      {/* Payment Summary Section */}
      <div className="payment-summary">
        <div className="summary-box">
          <label>Total Charge</label>
          <h2>৳ {shipment.totalCharge}</h2>
        </div>
        <div className="summary-box success">
          <label>Paid Amount</label>
          <h2>৳ {shipment.paidAmount}</h2>
        </div>
        <div className="summary-box danger">
          <label>Due Amount</label>
          <h2>৳ {due}</h2>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="profile-actions">
        <button
          className="btn-edit"
          onClick={() => navigate(`/shipment/${shipment._id}`)}
        >
          Edit Record
        </button>
        <button className="btn-back" onClick={() => navigate(-1)}>
          Back to List
        </button>
      </div>

      <style>{`
        .profile-container { max-width: 1000px; margin: 30px auto; padding: 25px; background: #fff; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); font-family: 'Segoe UI', sans-serif; }
        
        .profile-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f1f1; padding-bottom: 20px; margin-bottom: 30px; }
        .id-badge h1 { margin: 0; color: #003580; font-size: 28px; letter-spacing: 1px; }
        .id-badge span { color: #888; text-transform: uppercase; font-size: 12px; font-weight: bold; }
        
        .status-tag { padding: 6px 15px; border-radius: 20px; font-weight: bold; font-size: 12px; text-transform: uppercase; }
        .status-tag.Booked { background: #e3f2fd; color: #1976d2; }
        .status-tag.In-Transit { background: #fff8e1; color: #f57c00; }
        .status-tag.Delivered { background: #e8f5e9; color: #2e7d32; }

        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .info-card { background: #fcfcfc; border: 1px solid #eee; padding: 20px; border-radius: 12px; }
        .info-card h3 { margin-top: 0; font-size: 16px; color: #444; border-bottom: 1.5px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
        
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
        .label { color: #777; }
        .value { font-weight: 600; color: #222; }
        .highlight { color: #003580; font-weight: 800; font-size: 16px; }
        .cbm-text { color: #d35400; font-weight: bold; }

        .receiver-card { background: #fdfdfd; }
        .empty-receiver { text-align: center; padding: 10px; color: #888; }
        .empty-receiver p { margin: 0; color: #555; }

        .accent-card { background: #f0f7ff; border-color: #d0e7ff; }

        .payment-summary { display: flex; gap: 15px; margin-top: 30px; }
        .summary-box { flex: 1; padding: 20px; border-radius: 12px; background: #f8fafc; text-align: center; }
        .summary-box h2 { margin: 5px 0 0; font-size: 24px; color: #333; }
        .summary-box.success h2 { color: #27ae60; }
        .summary-box.danger h2 { color: #e74c3c; }

        .profile-actions { display: flex; gap: 10px; margin-top: 30px; justify-content: center; }
        .btn-edit { padding: 12px 30px; background: #003580; color: #white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; color: white;}
        .btn-back { padding: 12px 30px; background: #eee; color: #333; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }

        @media (max-width: 768px) { .info-grid { grid-template-columns: 1fr; } .payment-summary { flex-direction: column; } }
      `}</style>
    </div>
  );
}
