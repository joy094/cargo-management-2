// src/components/EditShipmentModal.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";
import { translateToChinese } from "../utils/translate";
import "./EditModal.css";

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
    productNameCn: "",
    productType: "General", // 🔥 নতুন ফিল্ড
    chinaTrackingNo: "",
    cartonNo: "",
    quantity: 1,
    grossWeight: "",
    actualWeight: "", // 🔥 নতুন: Actual Weight স্টেট
    length: 0,
    width: 0,
    height: 0,
    cbm: 0,
    packagingCost: 0,
    receivingCost: 0,
    note: "",
    receivedDate: "",
  });

  const [customerMap, setCustomerMap] = useState({});

  useEffect(() => {
    if (isOpen) {
      axios
        .get("/api/customer-map")
        .then((res) => {
          if (res.data.success) {
            setCustomerMap(res.data.customerMap);
          }
        })
        .catch((err) => console.error("Customer map fetch error:", err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (shipment) {
      setFormData({
        category: shipment.category || "By Sea",
        shippingMark: shipment.shippingMark || "",
        customerName: shipment.customerName || "",
        productName: shipment.productName || "",
        productNameCn: shipment.productNameCn || "",
        productType: shipment.productType || "General", // 🔥 ডেটা লোড করা
        chinaTrackingNo: shipment.chinaTrackingNo || "",
        cartonNo: shipment.cartonNo || "",
        quantity: shipment.quantity || 1,
        grossWeight: shipment.grossWeight || "",
        actualWeight: shipment.actualWeight || "", // 🔥 নতুন: ডাটাবেস থেকে Actual Weight আনা
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

    if (name === "shippingMark") {
      const markUpper = value.trim().toUpperCase();
      if (customerMap[markUpper]) {
        newFormData.customerName = customerMap[markUpper];
      } else {
        newFormData.customerName = "";
      }
    }

    if (["length", "width", "height"].includes(name)) {
      const l = Number(newFormData.length) || 0;
      const w = Number(newFormData.width) || 0;
      const h = Number(newFormData.height) || 0;
      newFormData.cbm = ((l * w * h) / 1000000).toFixed(3);
    }

    setFormData(newFormData);
  };

  const handleProductBlur = async (e) => {
    const text = e.target.value;
    if (text) {
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
        // 🔥 নিশ্চিত করা হচ্ছে যেন ওজনগুলো Number হিসেবে ডাটাবেসে যায়
        grossWeight: Number(formData.grossWeight) || 0,
        actualWeight: Number(formData.actualWeight) || 0,
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
              onBlur={handleProductBlur}
            />
          </div>

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
            <label>Product Type</label>
            <select
              name="productType"
              value={formData.productType}
              onChange={handleChange}
              style={{ border: "1px solid #10b981" }}
            >
              <option value="General">General</option>
              <option value="Copy">Copy</option>
              <option value="Liquid">Liquid</option>
              <option value="Electronics">Electronics</option>
              <option value="Fragile">Fragile</option>
              <option value="Magnetic">Magnetic</option>
            </select>
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

          {/* 🔥 Gross Weight (চীন থেকে আসা ওজন) */}
          <div className="form-group">
            <label>Gross Weight (CN) (KG)</label>
            <input
              type="number"
              name="grossWeight"
              value={formData.grossWeight}
              onChange={handleChange}
            />
          </div>

          {/* 🔥 Actual / Office Weight (অফিসে মাপা ওজন) */}
          <div className="form-group">
            <label>Actual / Office Weight (KG)</label>
            <input
              type="number"
              name="actualWeight"
              value={formData.actualWeight}
              onChange={handleChange}
              style={{ border: "1px solid #f59e0b", background: "#fef3c7" }} // হালকা হলুদ ব্যাকগ্রাউন্ড
            />
          </div>

          <div className="form-group dimensions-group">
            <label>Dimensions (L x W x H)</label>
            <div className="dimensions-inputs">
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
    </div>
  );
}
