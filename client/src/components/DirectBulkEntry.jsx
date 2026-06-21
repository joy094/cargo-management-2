import React, { useState } from "react";
import axios from "axios";
import "./DirectBulkEntry.css"; // (ঐচ্ছিক: যদি আলাদা সিএসএস ফাইল ব্যবহার করেন)

export default function DirectBulkEntry({
  fixedShippingMark,
  onSuccess,
  // onClose এখন আর এই ফাইলের ভেতরে দরকার নেই
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
        onSuccess(); // প্রোফাইলের ডাটা রিফ্রেশ করবে এবং মডাল ক্লোজ করবে
      }
    } catch (err) {
      alert("সেভ করতে সমস্যা হয়েছে!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="direct-bulk-container">
      {/* 🚀 হেডার আপডেট করা হলো, ক্লোজ বাটন রিমুভ করা হয়েছে */}
      <div className="bulk-header">
        <h3>📥 Direct Quick Entry</h3>
        <p>
          এই কাস্টমারের জন্য ম্যানুয়াল বা মিসিং এন্ট্রিগুলো এখানে যুক্ত করুন
        </p>
      </div>

      <div className="table-responsive">
        <table className="modern-bulk-table">
          <thead>
            <tr>
              <th>Tracking No</th>
              <th>Shipping Mark</th>
              <th>Product</th>
              <th>Carton No</th>
              <th>Qty</th>
              <th>Weight (KG)</th>
              <th className="text-center">Action</th>
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
                    placeholder="Tracking..."
                    className="bulk-input"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={fixedShippingMark}
                    disabled
                    className="bulk-input disabled-input"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.productName}
                    onChange={(e) =>
                      handleChange(i, "productName", e.target.value)
                    }
                    placeholder="Product..."
                    className="bulk-input"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.cartonNo}
                    onChange={(e) =>
                      handleChange(i, "cartonNo", e.target.value)
                    }
                    placeholder="Box-1"
                    className="bulk-input"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) =>
                      handleChange(i, "quantity", e.target.value)
                    }
                    className="bulk-input short-input"
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
                    className="bulk-input short-input"
                  />
                </td>
                <td className="text-center">
                  <button
                    className="delete-row-btn"
                    onClick={() => {
                      if (rows.length > 1) {
                        const newRows = rows.filter((_, idx) => idx !== i);
                        setRows(newRows);
                      } else {
                        alert("কমপক্ষে একটি সারি (Row) থাকতে হবে!");
                      }
                    }}
                    title="Remove Row"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bulk-actions-footer">
        <button onClick={addRow} className="add-row-modern-btn">
          ➕ Add Another Row
        </button>
        <button
          onClick={handleSave}
          className="save-bulk-modern-btn"
          disabled={saving}
        >
          {saving ? "⏳ Saving..." : "💾 Save All Items"}
        </button>
      </div>
    </div>
  );
}
