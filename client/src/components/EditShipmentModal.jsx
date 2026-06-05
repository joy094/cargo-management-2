//src/components/EditShipmentModal.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";
import { translateToChinese } from "../utils/translate"; // 🇨🇳 নতুন: ট্রান্সলেট ফাংশন ইম্পোর্ট

export default function EditShipmentModal({
  isOpen,
  onClose,
  shipment,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: "By Sea",
    shippingMark: "",
    customerName: "",
    productName: "",
    productNameCn: "", // 🇨🇳 নতুন ফিল্ড
    chinaTrackingNo: "",
    cartonNo: "",
    quantity: 1,
    grossWeight: "",
    length: 0,
    width: 0,
    height: 0,
    cbm: 0,
    packagingCost: 0,
    receivingCost: 0,
    note: "",
    receivedDate: "",
  });

  useEffect(() => {
    if (shipment) {
      setFormData({
        category: shipment.category || "By Sea",
        shippingMark: shipment.shippingMark || "",
        customerName: shipment.customerName || "",
        productName: shipment.productName || "",
        productNameCn: shipment.productNameCn || "", // 🇨🇳 ডাটাবেস থেকে রিসিভ করা
        chinaTrackingNo: shipment.chinaTrackingNo || "",
        cartonNo: shipment.cartonNo || "",
        quantity: shipment.quantity || 1,
        grossWeight: shipment.grossWeight || "",
        length: shipment.dimensions?.length || 0,
        width: shipment.dimensions?.width || 0,
        height: shipment.dimensions?.height || 0,
        cbm: shipment.cbm || 0,
        packagingCost: shipment.packagingCost || 0,
        receivingCost: shipment.receivingCost || 0,
        note: shipment.note || "",
        receivedDate: shipment.receivedDate
          ? new Date(shipment.receivedDate).toISOString().split("T")[0]
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

  // 🇨🇳 নতুন: প্রোডাক্ট নেম ট্রান্সলেট করার হ্যান্ডলার
  const handleProductBlur = async (e) => {
    const text = e.target.value;
    if (text) {
      // যদি আগে থেকে কোনো চায়নিজ নাম না থাকে অথবা ইংরেজি নাম পরিবর্তন করা হয়
      const translatedText = await translateToChinese(text);
      setFormData((prev) => ({ ...prev, productNameCn: translatedText }));
    }
  };

  const handleUpdate = async () => {
    if (!formData.shippingMark)
      return alert("Shipping Mark দেওয়া বাধ্যতামূলক!");
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
      alert("সফলভাবে আপডেট হয়েছে!");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert("আপডেট করতে সমস্যা হয়েছে।");
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
            <label>Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="All">🌍 All Categories</option>
              <option value="By Air">✈️ By Air CN </option>
              <option value="By Air Mix Box CN">✈️ By Air Mix Box CN </option>
              <option value="By Air HK">✈️ By Air HK</option>
              <option value="By Air Mix Box HK">✈️ By Air Mix Box HK</option>
              <option value="Hand Carry">💼 Hand Carry</option>
              <option value="By Sea">🚢 By Sea </option>
              <option value="Other">🚢 Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Shipping Mark *</label>
            <input
              type="text"
              name="shippingMark"
              value={formData.shippingMark}
              onChange={handleChange}
              style={{ border: "1px solid #0ea5e9" }}
            />
          </div>

          <div className="form-group">
            <label>Customer Name</label>
            <input
              type="text"
              name="customerName"
              value={formData.customerName}
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
            <label>Product Name (EN)</label>
            <input
              type="text"
              name="productName"
              value={formData.productName}
              onChange={handleChange}
              onBlur={handleProductBlur} // 👈 ফোকাস সরালেই ট্রান্সলেট হবে
            />
          </div>

          {/* 🇨🇳 Product Name (Chinese) */}
          <div className="form-group">
            <label>Product Name (CN)</label>
            <input
              type="text"
              name="productNameCn"
              value={formData.productNameCn}
              onChange={handleChange}
              style={{ border: "1px solid #10b981", background: "#f0fdf4" }}
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
            <label>Packaging Cost (¥)</label>
            <input
              type="number"
              name="packagingCost"
              value={formData.packagingCost}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Receiving Cost (¥)</label>
            <input
              type="number"
              name="receivingCost"
              value={formData.receivingCost}
              onChange={handleChange}
            />
          </div>

          {/* 📅 Received Date Field */}
          <div className="form-group">
            <label>Received Date</label>
            <input
              type="date"
              name="receivedDate"
              value={formData.receivedDate}
              onChange={handleChange}
              style={{ border: "1px solid #10b981" }}
            />
          </div>

          <div className="form-group">
            <label>Note / Remarks</label>
            <input
              type="text"
              name="note"
              placeholder="Any specific instructions..."
              value={formData.note}
              onChange={handleChange}
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
        .fixed-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 9999; }
        .fixed-modal-content { background: #fff; width: 90%; max-width: 650px; padding: 25px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto; animation: modalFadeIn 0.3s ease-in-out; }
        @keyframes modalFadeIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        .modal-header { border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px; }
        .modal-header h2 { margin: 0; font-size: 20px; color: #0f172a; }
        .modal-header p { margin: 5px 0 0; font-size: 13px; color: #64748b; }
        .edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-group label { font-size: 12px; font-weight: bold; color: #475569; }
        .form-group input, .form-group select { padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; transition: 0.2s; }
        .form-group input:focus, .form-group select:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1); }
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
