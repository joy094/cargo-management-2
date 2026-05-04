//src/components/BatchDetails.jsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function BatchDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [selectedShipments, setSelectedShipments] = useState([]);
  const [targetAgency, setTargetAgency] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBulkEntry, setShowBulkEntry] = useState(false);

  const statusOptions = [
    "Warehouse Received",
    "Processing",
    "Ready to Ship",
    "Dispatched",
    "In-Transit",
    "Customs Clearing",
    "Arrived",
    "Delivered",
  ];

  const [newRows, setNewRows] = useState([
    {
      shippingMark: "",
      productName: "",
      chinaTrackingNo: "",
      grossWeight: "",
      receivedDate: new Date().toISOString().split("T")[0],
    },
  ]);

  const [bills, setBills] = useState({
    airBill: 0,
    loadUnload: 0,
    customs: 0,
    otherCost: 0,
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [batchRes, agencyRes] = await Promise.all([
        axios.get(`/api/batches/${id}`),
        axios.get("/api/agencies"),
      ]);

      setBatch(batchRes.data.batch);
      setShipments(batchRes.data.shipments);

      setAgencies(agencyRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ ব্যাচ স্ট্যাটাস আপডেট
  const handleBatchStatusChange = async (newStatus) => {
    if (!window.confirm(`স্ট্যাটাস পরিবর্তন করে "${newStatus}" করবেন?`)) return;
    try {
      await axios.put(`/api/batches/${id}/status`, { status: newStatus });
      fetchData();
    } catch (err) {
      alert("Error updating status");
    }
  };

  // ✅ নতুন রো হ্যান্ডেল করা
  const addNewRow = () => {
    setNewRows([
      ...newRows,
      {
        shippingMark: "",
        productName: "",
        chinaTrackingNo: "",
        grossWeight: "",
        receivedDate: new Date().toISOString().split("T")[0],
      },
    ]);
  };

  // ✅ রো রিমুভ করার ফাংশন (ক্রস বাটন)
  const removeNewRow = (index) => {
    const rows = [...newRows];
    rows.splice(index, 1);
    setNewRows(rows);
  };

  const handleInputChange = (index, field, value) => {
    const rows = [...newRows];
    rows[index][field] = value;
    setNewRows(rows);
  };

  const handleBulkSave = async () => {
    if (newRows.some((r) => !r.shippingMark))
      return alert("Shipping Mark অবশ্যই দিতে হবে!");
    setLoading(true);
    try {
      await axios.post("/api/shipments/bulk-import", {
        shipments: newRows,
        batchId: id,
      });
      alert("সফলভাবে যুক্ত হয়েছে!");
      setNewRows([
        {
          shippingMark: "",
          productName: "",
          chinaTrackingNo: "",
          grossWeight: "",
          receivedDate: new Date().toISOString().split("T")[0],
        },
      ]);
      setShowBulkEntry(false);
      fetchData();
    } catch (err) {
      alert("Error saving data");
    } finally {
      setLoading(false);
    }
  };

  const isLocked = batch?.status === "Arrived" || batch?.status === "Delivered";

  const updateWeight = async (shipmentId, val) => {
    try {
      await axios.put(`/api/shipments/${shipmentId}/weight`, {
        actualWeight: parseFloat(val) || 0,
      });
      fetchData();
    } catch (err) {
      alert("Weight update failed");
    }
  };

  const totalGross = shipments.reduce(
    (sum, s) => sum + (Number(s.grossWeight) || 0),
    0,
  );
  const totalActual = shipments.reduce(
    (sum, s) => sum + (Number(s.actualWeight) || 0),
    0,
  );
  const totalBill = Object.values(bills).reduce(
    (a, b) => Number(a) + Number(b),
    0,
  );

  const filteredList = shipments.filter((s) =>
    s.shippingMark?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="modern-batch-container">
      {/* 🚀 Header: Dashboard Style */}
      <div className="dashboard-header">
        <div className="batch-meta">
          <span className="batch-tag">FLIGHT BATCH</span>
          <h1>{batch?.batchName}</h1>
          <p className="date-sub">
            📅{" "}
            {batch?.flightDate
              ? new Date(batch.flightDate).toLocaleDateString("bn-BD")
              : "N/A"}
          </p>
        </div>

        <div className="status-control">
          <div className="status-label">Batch Life-cycle</div>
          <select
            value={batch?.status}
            onChange={(e) => handleBatchStatusChange(e.target.value)}
            className={`status-select-box ${batch?.status?.toLowerCase().replace(" ", "-")}`}
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {isLocked && <div className="locked-info">🔒 System Locked</div>}
        </div>
      </div>

      {/* 📦 Main Operations Card */}
      <div className="main-card">
        <div className="toolbar">
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="Shipping Mark দিয়ে খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="action-btns">
            {!isLocked && (
              <button
                className={`bulk-toggle-btn ${showBulkEntry ? "active" : ""}`}
                onClick={() => setShowBulkEntry(!showBulkEntry)}
              >
                {showBulkEntry ? "Close Entry" : "📥 Quick Bulk Entry"}
              </button>
            )}
            <select
              className="agency-select"
              value={targetAgency}
              onChange={(e) => setTargetAgency(e.target.value)}
            >
              <option value="">ব্রাঞ্চ সিলেক্ট করুন</option>
              {agencies.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button className="assign-btn" onClick={() => {}}>
              Assign ({selectedShipments.length})
            </button>
          </div>
        </div>

        {/* 📥 Bulk Entry Form: Excel Like */}
        {showBulkEntry && (
          <div className="bulk-entry-panel">
            <table className="bulk-table">
              <thead>
                <tr>
                  <th>Shipping Mark *</th>
                  <th>Product Name</th>
                  <th>China Tracking</th>
                  <th>China Weight</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {newRows.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        value={row.shippingMark}
                        onChange={(e) =>
                          handleInputChange(
                            index,
                            "shippingMark",
                            e.target.value,
                          )
                        }
                        placeholder="Marking"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.productName}
                        onChange={(e) =>
                          handleInputChange(
                            index,
                            "productName",
                            e.target.value,
                          )
                        }
                        placeholder="Product"
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
                        placeholder="Tracking"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={row.grossWeight}
                        onChange={(e) =>
                          handleInputChange(
                            index,
                            "grossWeight",
                            e.target.value,
                          )
                        }
                        placeholder="KG"
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        value={row.receivedDate}
                        onChange={(e) =>
                          handleInputChange(
                            index,
                            "receivedDate",
                            e.target.value,
                          )
                        }
                      />
                    </td>
                    <td className="center-cell">
                      {newRows.length > 1 && (
                        <button
                          className="remove-row-btn"
                          onClick={() => removeNewRow(index)}
                        >
                          ✖
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bulk-footer">
              <button className="add-row-btn" onClick={addNewRow}>
                + Add New Row
              </button>
              <button className="save-all-btn" onClick={handleBulkSave}>
                {loading ? "Saving..." : "Save All Item"}
              </button>
            </div>
          </div>
        )}

        {/* 📋 Data Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" />
                </th>
                <th>SL</th>
                <th>Shipping Mark</th>
                <th>Tracking (China)</th>
                <th>China Wt.</th>
                <th>Office Wt. (Edit)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((s, idx) => (
                <tr key={s._id}>
                  <td>
                    <input type="checkbox" />
                  </td>
                  <td>{idx + 1}</td>
                  <td className="mark-cell">{s.shippingMark}</td>
                  <td>{s.chinaTrackingNo}</td>
                  <td>{s.grossWeight} KG</td>
                  <td>
                    <input
                      type="number"
                      defaultValue={s.actualWeight || s.grossWeight}
                      onBlur={(e) => updateWeight(s._id, e.target.value)}
                      disabled={isLocked}
                      className={isLocked ? "input-disabled" : "input-editable"}
                    />
                  </td>
                  <td>
                    <span
                      className={`status-pill ${s.status?.toLowerCase().replace(" ", "-")}`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📊 Summary Grid */}
      <div className="summary-section">
        <div className="stats-grid">
          <div className="stat-card blue">
            <label>Total China Weight</label>
            <div className="value">
              {totalGross.toFixed(2)} <span>KG</span>
            </div>
          </div>
          <div className="stat-card green">
            <label>Total Office Weight</label>
            <div className="value">
              {totalActual.toFixed(2)} <span>KG</span>
            </div>
          </div>
          <div className="stat-card red">
            <label>Missing Weight</label>
            <div className="value">
              {(totalGross - totalActual).toFixed(2)} <span>KG</span>
            </div>
          </div>
        </div>

        <div className="costing-card">
          <div className="cost-inputs">
            <div className="cost-box">
              <label>Air Bill</label>
              <input
                type="number"
                value={bills.airBill}
                onChange={(e) =>
                  setBills({ ...bills, airBill: e.target.value })
                }
              />
            </div>
            <div className="cost-box">
              <label>Customs</label>
              <input
                type="number"
                value={bills.customs}
                onChange={(e) =>
                  setBills({ ...bills, customs: e.target.value })
                }
              />
            </div>

            <div className="cost-box">
              <label>Load Unload bill</label>
              <input
                type="number"
                value={bills.loadUnload}
                onChange={(e) =>
                  setBills({ ...bills, loadUnload: e.target.value })
                }
              />
            </div>

            <div className="cost-box">
              <label>Other bill</label>
              <input
                type="number"
                value={bills.other}
                onChange={(e) => setBills({ ...bills, other: e.target.value })}
              />
            </div>

            <div className="total-expense">
              <label>Total Expense</label>
              <div className="amt">৳ {totalBill}</div>
            </div>
          </div>
          <div className="avg-cost-bar">
            Average Cost Per KG:{" "}
            <strong>
              ৳ {(totalActual > 0 ? totalBill / totalActual : 0).toFixed(2)}
            </strong>
          </div>
        </div>
      </div>

      <style>{`
        .modern-batch-container { padding: 30px; background: #f0f2f5; min-height: 100vh; font-family: 'Inter', sans-serif; color: #1e293b; }
        
        /* Header */
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 25px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 25px; }
        .batch-tag { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; }
        .dashboard-header h1 { margin: 10px 0 5px; font-size: 28px; color: #0f172a; }
        .date-sub { color: #64748b; font-size: 14px; }
        
        .status-select-box { padding: 12px; border-radius: 8px; border: 2px solid #e2e8f0; font-weight: bold; width: 220px; margin-top: 5px; outline: none; transition: 0.3s; }
        .status-select-box.arrived { background: #dcfce7; color: #15803d; border-color: #15803d; }
        .locked-info { color: #ef4444; font-size: 12px; font-weight: bold; margin-top: 5px; text-align: center; }

        /* Main Card & Toolbar */
        .main-card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .toolbar { display: flex; justify-content: space-between; margin-bottom: 25px; gap: 15px; }
        .search-wrapper input { padding: 12px 20px; border: 1px solid #e2e8f0; border-radius: 10px; width: 300px; }
        .action-btns { display: flex; gap: 10px; }
        .bulk-toggle-btn { background: #0f172a; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .bulk-toggle-btn.active { background: #ef4444; }

        /* Bulk Entry Panel */
        .bulk-entry-panel { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px dashed #cbd5e1; margin-bottom: 25px; }
        .bulk-table { width: 100%; border-collapse: collapse; }
        .bulk-table th { text-align: left; padding: 10px; font-size: 12px; color: #64748b; }
        .bulk-table input { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; }
        .remove-row-btn { background: #fee2e2; color: #ef4444; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; transition: 0.2s; }
        .remove-row-btn:hover { background: #ef4444; color: #fff; }
        .bulk-footer { display: flex; justify-content: space-between; margin-top: 15px; }
        .add-row-btn { background: #fff; border: 2px solid #0f172a; color: #0f172a; padding: 8px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .save-all-btn { background: #16a34a; color: white; border: none; padding: 8px 30px; border-radius: 8px; font-weight: bold; cursor: pointer; }

        /* Data Table */
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th { text-align: left; padding: 15px; background: #f8fafc; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
        .data-table td { padding: 15px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .mark-cell { font-weight: 700; color: #0369a1; }
        .input-editable { width: 80px; padding: 6px; border: 1px solid #16a34a; border-radius: 6px; text-align: center; font-weight: bold; }
        .input-disabled { width: 80px; padding: 6px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; color: #94a3b8; cursor: not-allowed; }
        
        .status-pill { padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; }
        .status-pill.arrived { background: #dcfce7; color: #15803d; }
        .status-pill.customs-clearing { background: #fef3c7; color: #92400e; }

        /* Summary Stats */
        .summary-section { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-top: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .stat-card { background: #fff; padding: 25px; border-radius: 16px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-bottom: 5px solid #eee; }
        .stat-card.blue { border-color: #3b82f6; }
        .stat-card.green { border-color: #10b981; }
        .stat-card.red { border-color: #ef4444; }
        .stat-card label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; }
        .stat-card .value { font-size: 24px; font-weight: 900; margin-top: 10px; color: #0f172a; }
        .stat-card .value span { font-size: 14px; color: #94a3b8; }

        .costing-card { background: #0f172a; color: white; padding: 25px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .cost-inputs { display: grid; grid-template-columns: 1fr 1fr 1.5fr; gap: 20px; align-items: center; }
        .cost-box label { display: block; font-size: 11px; opacity: 0.7; margin-bottom: 5px; }
        .cost-box input { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 10px; border-radius: 8px; width: 100%; }
        .total-expense { text-align: right; }
        .total-expense .amt { font-size: 28px; font-weight: 900; color: #22c55e; }
        .avg-cost-bar { margin-top: 20px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 10px; text-align: center; font-size: 15px; border: 1px dashed rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
