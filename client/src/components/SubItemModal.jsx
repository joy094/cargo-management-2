import React, { useState } from "react";
import axios from "axios";

export default function SubItemModal({
  isOpen,
  onClose,
  masterCarton,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([
    {
      shippingMark: "",
      productName: "",
      chinaTrackingNo: "",
      quantity: 1,
      grossWeight: "",
    },
  ]);

  if (!isOpen || !masterCarton) return null;

  const handleInputChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        shippingMark: "",
        productName: "",
        chinaTrackingNo: "",
        quantity: 1,
        grossWeight: "",
      },
    ]);
  };

  const removeRow = (index) => {
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
  };

  const handleSave = async () => {
    // ভ্যালিডেশন: অন্তত একটি মার্কিং থাকতে হবে
    if (rows.some((r) => !r.shippingMark)) {
      return alert("দয়া করে সব পার্সেলের Shipping Mark দিন!");
    }

    setLoading(true);
    try {
      await axios.post("/api/shipments/add-sub-items", {
        items: rows,
        parentId: masterCarton._id, // মাস্টার বক্সের আইডি
      });

      alert("পার্সেলগুলো সফলভাবে যুক্ত হয়েছে!");
      setRows([
        {
          shippingMark: "",
          productName: "",
          chinaTrackingNo: "",
          quantity: 1,
          grossWeight: "",
        },
      ]);
      onSuccess(); // পেজ রিফ্রেশ করার জন্য
      onClose(); // মডাল বন্ধ করার জন্য
    } catch (err) {
      console.error(err);
      alert("সেভ করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sub-item-modal-overlay">
      <div className="sub-item-modal-content">
        <div className="modal-header">
          <h2>📦 Add Parcels to Master Carton</h2>
          <p>
            Master Box Marking: <strong>{masterCarton.shippingMark}</strong>
          </p>
          <button className="close-btn" onClick={onClose}>
            ✖
          </button>
        </div>

        <div className="modal-body table-responsive">
          <table className="bulk-table">
            <thead>
              <tr>
                <th>Shipping Mark *</th>
                <th>Product</th>
                <th>China Tracking</th>
                <th style={{ width: "60px" }}>Qty</th>
                <th style={{ width: "80px" }}>Wt (KG)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td>
                    <input
                      type="text"
                      value={row.shippingMark}
                      onChange={(e) =>
                        handleInputChange(idx, "shippingMark", e.target.value)
                      }
                      placeholder="Mark"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.productName}
                      onChange={(e) =>
                        handleInputChange(idx, "productName", e.target.value)
                      }
                      placeholder="Item"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.chinaTrackingNo}
                      onChange={(e) =>
                        handleInputChange(
                          idx,
                          "chinaTrackingNo",
                          e.target.value,
                        )
                      }
                      placeholder="Tracking"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="small-input"
                      value={row.quantity}
                      onChange={(e) =>
                        handleInputChange(idx, "quantity", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="small-input"
                      value={row.grossWeight}
                      onChange={(e) =>
                        handleInputChange(idx, "grossWeight", e.target.value)
                      }
                    />
                  </td>
                  <td className="center-cell">
                    {rows.length > 1 && (
                      <button
                        className="remove-row-btn"
                        onClick={() => removeRow(idx)}
                      >
                        ✖
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modal-footer">
          <button className="add-row-btn" onClick={addRow}>
            + Add Row
          </button>
          <div className="action-btns">
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="save-btn"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Parcels"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .sub-item-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.7);  display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(4px); }
        .sub-item-modal-content { background: #fff; width: auto; max-width: 95%; border-radius: 16px; padding: 25px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
        .modal-header { display: flex; flex-direction: column; position: relative; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; }
        .modal-header h2 { margin: 0; color: #0f172a; font-size: 20px; }
        .modal-header p { margin: 5px 0 0; color: #64748b; font-size: 13px; }
        .close-btn { position: absolute; right: 0; top: 0; background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: #475569; font-weight: bold; }
        .close-btn:hover { background: #fee2e2; color: #ef4444; }
        
        .bulk-table input { width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; outline: none; }

        .small-input { text-align: center; }
        .remove-row-btn { background: #fee2e2; color: #ef4444; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; }
        
        .modal-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 25px; padding-top: 15px; border-top: 2px solid #f1f5f9; }
        .action-btns { display: flex; gap: 10px; }
        .add-row-btn { background: #f8fafc; border: 2px dashed #cbd5e1; color: #475569; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .add-row-btn:hover { border-color: #94a3b8; color: #0f172a; }
        .cancel-btn { background: #f1f5f9; color: #475569; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .save-btn { background: #0ea5e9; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }

        .save-btn:disabled { background: #94a3b8; cursor: not-allowed; }
        
      `}</style>
    </div>
  );
}
