import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function AddShipment() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);

  // গ্লোবাল সেটিংস (যা সব রো-এর জন্য এক থাকবে)
  const [globalInfo, setGlobalInfo] = useState({
    batch: "",
    routeCategory: "Air",
    originPort: "",
  });

  // শিপমেন্ট রো-এর স্টেট (Array of Objects)
  const [rows, setRows] = useState([
    {
      shippingMark: "",
      productName: "",
      chinaTrackingNo: "",
      cartonNo: "",
      grossWeight: "",
      receivedDate: new Date().toISOString().split("T")[0], // আজকের তারিখ ডিফল্ট
      length: 0,
      width: 0,
      height: 0,
      cbm: 0,
    },
  ]);

  useEffect(() => {
    axios.get("/api/batches").then((res) => setBatches(res.data));
  }, []);

  const originPorts = {
    Air: ["Guangzhou (CAN)", "Hong Kong (HKG)", "Shenzhen (SZX)"],
    Sea: ["Guangzhou Port", "Ningbo Port", "Shanghai Port"],
    "Hand Carry": ["Special Hand Carry", "Airport Collection"],
  };

  // রো যোগ করার ফাংশন
  const addRow = () => {
    setRows([
      ...rows,
      {
        shippingMark: "",
        productName: "",
        chinaTrackingNo: "",
        cartonNo: "",
        grossWeight: "",
        receivedDate: new Date().toISOString().split("T")[0],
        length: 0,
        width: 0,
        height: 0,
        cbm: 0,
      },
    ]);
  };

  // রো ডিলিট করার ফাংশন
  const removeRow = (index) => {
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows);
  };

  // ইনপুট হ্যান্ডেল এবং CBM ক্যালকুলেশন
  const handleInputChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;

    // যদি L, W, H চেঞ্জ হয় তবে CBM আপডেট হবে
    if (["length", "width", "height"].includes(field)) {
      const { length, width, height } = updatedRows[index];
      const calculatedCbm = (length * width * height) / 1000000;
      updatedRows[index].cbm = calculatedCbm.toFixed(3);
    }

    setRows(updatedRows);
  };

  const handleGlobalChange = (e) => {
    setGlobalInfo({ ...globalInfo, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!globalInfo.batch) return alert("দয়া করে ব্যাচ সিলেক্ট করুন!");

    setLoading(true);
    try {
      // সব রো-এর সাথে গ্লোবাল ইনফো যোগ করে পেলোড তৈরি
      const finalData = rows.map((row) => ({
        ...row,
        ...globalInfo,
        dimensions: {
          length: row.length,
          width: row.width,
          height: row.height,
        },
      }));

      await axios.post("/api/shipments/bulk-import", {
        shipments: finalData,
        batchId: globalInfo.batch,
      });

      alert(`${rows.length} টি শিপমেন্ট সফলভাবে সেভ হয়েছে!`);
      navigate("/shipments");
    } catch (err) {
      alert("সেভ করতে সমস্যা হয়েছে!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bulk-add-container">
      <div className="form-header">
        <h2>🚀 Bulk Cargo Entry (Excel Style)</h2>
        <p>একসাথে অনেকগুলো মাল এন্ট্রি করুন এবং সময় বাঁচান</p>
      </div>

      <div className="global-settings">
        <div className="grid-3">
          <div>
            <label>Select Batch *</label>
            <select
              name="batch"
              value={globalInfo.batch}
              onChange={handleGlobalChange}
              required
            >
              <option value="">-- ব্যাচ বেছে নিন --</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.batchName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Route</label>
            <select
              name="routeCategory"
              value={globalInfo.routeCategory}
              onChange={handleGlobalChange}
            >
              <option value="Air">Air Cargo</option>
              <option value="Sea">Sea Cargo</option>
              <option value="Hand Carry">Hand Carry</option>
            </select>
          </div>
          <div>
            <label>Origin Port</label>
            <select
              name="originPort"
              value={globalInfo.originPort}
              onChange={handleGlobalChange}
            >
              <option value="">-- পোর্ট বেছে নিন --</option>
              {originPorts[globalInfo.routeCategory]?.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="table-wrapper">
          <table className="bulk-table">
            <thead>
              <tr>
                <th>Shipping Mark *</th>
                <th>Product Name *</th>
                <th>Tracking (China)</th>
                <th>Box No</th>
                <th>Weight (KG)</th>
                <th>Recv. Date</th>
                <th>L</th>
                <th>W</th>
                <th>H</th>
                <th>CBM</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      required
                      className="mark-input"
                      value={row.shippingMark}
                      onChange={(e) =>
                        handleInputChange(index, "shippingMark", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      required
                      value={row.productName}
                      onChange={(e) =>
                        handleInputChange(index, "productName", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.chinaTrackingNo}
                      onChange={(e) =>
                        handleInputChange(
                          index,
                          "chinaTrackingNo",
                          e.target.value,
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="small-input"
                      value={row.cartonNo}
                      onChange={(e) =>
                        handleInputChange(index, "cartonNo", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      className="small-input"
                      value={row.grossWeight}
                      onChange={(e) =>
                        handleInputChange(index, "grossWeight", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={row.receivedDate}
                      onChange={(e) =>
                        handleInputChange(index, "receivedDate", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="dim-input"
                      onChange={(e) =>
                        handleInputChange(index, "length", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="dim-input"
                      onChange={(e) =>
                        handleInputChange(index, "width", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="dim-input"
                      onChange={(e) =>
                        handleInputChange(index, "height", e.target.value)
                      }
                    />
                  </td>
                  <td className="cbm-text">{row.cbm}</td>
                  <td>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => removeRow(index)}
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

        <div className="form-footer">
          <button type="button" className="btn-add-row" onClick={addRow}>
            + Add More Row
          </button>
          <button type="submit" className="btn-save-all" disabled={loading}>
            {loading ? "Saving..." : `✅ Save All ${rows.length} Shipments`}
          </button>
        </div>
      </form>

      <style>{`
        .bulk-add-container { padding: 20px; background: #fff; border-radius: 12px; }
        .global-settings { background: #f1f5f9; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        
        .table-wrapper { overflow-x: auto; margin-bottom: 20px; }
        .bulk-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .bulk-table th { background: #003580; color: white; padding: 10px; text-align: left; }
        .bulk-table td { border: 1px solid #ddd; padding: 5px; }
        
        .bulk-table input { width: 100%; border: 1px solid #ccc; padding: 8px; border-radius: 4px; outline: none; }
        .mark-input { font-weight: bold; color: #d35400; text-transform: uppercase; }
        .small-input { width: 60px !important; }
        .dim-input { width: 45px !important; }
        .cbm-text { font-weight: bold; color: #003580; text-align: center; }
        
        .form-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
        .btn-add-row { background: #34495e; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
        .btn-save-all { background: #27ae60; color: white; border: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; }
        .btn-remove { background: #ff4757; color: white; border: none; border-radius: 4px; cursor: pointer; padding: 5px 10px; }
      `}</style>
    </div>
  );
}
