//src/components/EditShipmentModal.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";

export default function EditShipmentModal({
  isOpen,
  onClose,
  shipment,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shippingMark: "",
    productName: "",
    chinaTrackingNo: "",
    cartonNo: "",
    quantity: 1,
    grossWeight: "",
    length: 0,
    width: 0,
    height: 0,
    cbm: 0,
    receivedDate: "",
  });

  useEffect(() => {
    if (shipment) {
      setFormData({
        shippingMark: shipment.shippingMark || "",
        productName: shipment.productName || "",
        chinaTrackingNo: shipment.chinaTrackingNo || "",
        cartonNo: shipment.cartonNo || "",
        quantity: shipment.quantity || 1,
        grossWeight: shipment.grossWeight || "",
        length: shipment.dimensions?.length || 0,
        width: shipment.dimensions?.width || 0,
        height: shipment.dimensions?.height || 0,
        cbm: shipment.cbm || 0,
        receivedDate: shipment.receivedDate
          ? shipment.receivedDate.split("T")[0]
          : "",
      });
    }
  }, [shipment]);

  if (!isOpen || !shipment) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    if (["length", "width", "height"].includes(name)) {
      const l = Number(newFormData.length) || 0;
      const w = Number(newFormData.width) || 0;
      const h = Number(newFormData.height) || 0;
      newFormData.cbm = ((l * w * h) / 1000000).toFixed(3);
    }
    setFormData(newFormData);
  };

  const handleUpdate = async () => {
    if (!formData.shippingMark)
      return alert("Shipping Mark দেওয়া বাধ্যতামূলক!");
    setLoading(true);
    try {
      await axios.put(`/api/shipments/edit/${shipment._id}`, {
        ...formData,
        dimensions: {
          length: formData.length,
          width: formData.width,
          height: formData.height,
        },
      });
      alert("সফলভাবে আপডেট হয়েছে!");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert("আপডেট করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed-modal-overlay">
      <div className="fixed-modal-content">
        <div className="modal-header">
          <h2>✏️ Edit Shipment</h2>
          <p>
            Editing:{" "}
            <strong style={{ color: "#0369a1" }}>
              {formData.shippingMark}
            </strong>
          </p>
        </div>

        <div className="modal-body edit-grid">
          <div className="form-group">
            <label>Shipping Mark *</label>
            <input
              type="text"
              name="shippingMark"
              value={formData.shippingMark}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Tracking Number (China)</label>
            <input
              type="text"
              name="chinaTrackingNo"
              value={formData.chinaTrackingNo}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Product Name</label>
            <input
              type="text"
              name="productName"
              value={formData.productName}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Carton No.</label>
            <input
              type="text"
              name="cartonNo"
              value={formData.cartonNo}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Gross Weight (KG)</label>
            <input
              type="number"
              name="grossWeight"
              value={formData.grossWeight}
              onChange={handleChange}
            />
          </div>

          <div className="form-group dimensions-group">
            <label>Dimensions (L x W x H)</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="number"
                name="length"
                placeholder="L"
                value={formData.length}
                onChange={handleChange}
              />
              <input
                type="number"
                name="width"
                placeholder="W"
                value={formData.width}
                onChange={handleChange}
              />
              <input
                type="number"
                name="height"
                placeholder="H"
                value={formData.height}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label>CBM (Auto)</label>
            <input
              type="text"
              value={formData.cbm}
              readOnly
              style={{
                background: "#f1f5f9",
                fontWeight: "bold",
                color: "#0284c7",
              }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            ✖ Cancel
          </button>
          <button
            className="save-btn"
            onClick={handleUpdate}
            disabled={loading}
          >
            {loading ? "Updating..." : "💾 Update Details"}
          </button>
        </div>
      </div>

      <style>{`
        /* ✅ স্ক্রিনের মাঝখানে ভাসিয়ে রাখার CSS */
        .fixed-modal-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
          display: flex; justify-content: center; align-items: center; z-index: 9999;
        }
        .fixed-modal-content {
          background: #fff; width: 90%; max-width: 600px; padding: 25px; border-radius: 16px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;
          animation: modalFadeIn 0.3s ease-in-out;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ভেতরের ডিজাইনের CSS */
        .modal-header { border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px; }
        .modal-header h2 { margin: 0; font-size: 20px; color: #0f172a; }
        .modal-header p { margin: 5px 0 0; font-size: 13px; color: #64748b; }
        
        .edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-group label { font-size: 12px; font-weight: bold; color: #475569; }
        .form-group input { padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; transition: 0.2s; }
        .form-group input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1); }
        .dimensions-group { grid-column: span 2; }
        
        .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px; padding-top: 15px; border-top: 2px solid #f1f5f9; }
        .cancel-btn { background: #f1f5f9; color: #475569; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .cancel-btn:hover { background: #e2e8f0; color: #0f172a; }
        .save-btn { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .save-btn:hover { background: #059669; }
        .save-btn:disabled { background: #94a3b8; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
