// components/DirectBulkEntry.jsx
import React, { useState } from "react";
import axios from "axios";

export default function DirectBulkEntry({
  fixedShippingMark,
  onSuccess,
  onClose,
}) {
  const [rows, setRows] = useState([
    {
      chinaTrackingNo: "",
      productName: "",
      cartonNo: "",
      quantity: 1,
      actualWeight: "",
      length: 0,
      width: 0,
      height: 0,
      cbm: 0,
    },
  ]);
  const [saving, setSaving] = useState(false);

  // নতুন রো যোগ করা
  const addRow = () => {
    setRows([
      ...rows,
      {
        chinaTrackingNo: "",
        productName: "",
        cartonNo: "",
        quantity: 1,
        actualWeight: "",
        length: 0,
        width: 0,
        height: 0,
        cbm: 0,
      },
    ]);
  };

  // ডাটা আপডেট করা
  const handleChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;
    setRows(updatedRows);
  };

  // সার্ভারে সেভ করা
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.post("/api/direct-bulk", {
        shippingMark: fixedShippingMark,
        items: rows,
      });
      if (res.data.success) {
        alert("সফলভাবে যোগ হয়েছে!");
        setRows([
          {
            chinaTrackingNo: "",
            productName: "",
            cartonNo: "",
            quantity: 1,
            actualWeight: "",
            length: 0,
            width: 0,
            height: 0,
            cbm: 0,
          },
        ]);
        onSuccess(); // প্রোফাইলের ডাটা রিফ্রেশ করবে
      }
    } catch (err) {
      alert("সেভ করতে সমস্যা হয়েছে!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="direct-bulk-container">
      <div className="flex-between">
        <h3>📥 Direct Quick Entry</h3>
        <button className="close-btn" onClick={onClose}>
          ✖ Close
        </button>
      </div>

      <table className="bulk-table">
        <thead>
          <tr>
            <th>Tracking No</th>
            <th>Shipping Mark</th> {/* এটি ফিক্সড থাকবে */}
            <th>Product</th>
            <th>Carton No</th>
            <th>Qty</th>
            <th>Weight (KG)</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>
                <input
                  type="text"
                  value={row.chinaTrackingNo}
                  onChange={(e) =>
                    handleChange(i, "chinaTrackingNo", e.target.value)
                  }
                  placeholder="Tracking"
                />
              </td>
              <td>
                {/* 🔥 শিপিং মার্ক ফিক্সড এবং Read-Only */}
                <input
                  type="text"
                  value={fixedShippingMark}
                  disabled
                  className="disabled-input"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={row.productName}
                  onChange={(e) =>
                    handleChange(i, "productName", e.target.value)
                  }
                  placeholder="Product"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={row.cartonNo}
                  onChange={(e) => handleChange(i, "cartonNo", e.target.value)}
                  placeholder="Box-1"
                />
              </td>
              <td>
                <input
                  type="number"
                  value={row.quantity}
                  onChange={(e) => handleChange(i, "quantity", e.target.value)}
                  style={{ width: "60px" }}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={row.actualWeight}
                  onChange={(e) =>
                    handleChange(i, "actualWeight", e.target.value)
                  }
                  placeholder="0.00"
                  style={{ width: "80px" }}
                />
              </td>
              <td>
                <button
                  onClick={() => {
                    const newRows = rows.filter((_, idx) => idx !== i);
                    setRows(newRows);
                  }}
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bulk-actions">
        <button onClick={addRow} className="add-row-btn">
          + Add New Row
        </button>
        <button onClick={handleSave} className="save-btn" disabled={saving}>
          {saving ? "Saving..." : "💾 Save All Items"}
        </button>
      </div>
    </div>
  );
}
