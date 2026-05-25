//src/components/ChinaWarehouse.jsx

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "./BatchDetails.css";
import CanAccess from "./CanAccess";
import EditShipmentModal from "./EditShipmentModal";
import Search from "./Search";
import UploadExcelModal from "./UploadExcelModal";

export default function ChinaWarehouse() {
  const [unassignedItems, setUnassignedItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection & Push States
  const [selectedIds, setSelectedIds] = useState([]);
  const [targetBatch, setTargetBatch] = useState("");
  const [isPushing, setIsPushing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 🔥 Master Box States
  const [masterBoxes, setMasterBoxes] = useState([]);
  const [selectedMasterBox, setSelectedMasterBox] = useState("");

  // CRUD & Modals
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [shipmentToEdit, setShipmentToEdit] = useState(null);
  const [isUploadExcelOpen, setIsUploadExcelOpen] = useState(false);

  const [newRows, setNewRows] = useState([
    {
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
      receivedDate: new Date().toISOString().split("T")[0],
    },
  ]);

  useEffect(() => {
    fetchWarehouseData();
  }, []);

  const fetchWarehouseData = async () => {
    setLoading(true);
    try {
      const itemsRes = await axios.get("/api/unassigned");
      if (itemsRes.data.success) {
        setUnassignedItems(itemsRes.data.shipments);
      }
      const batchRes = await axios.get("/api/batches");
      if (Array.isArray(batchRes.data)) {
        setBatches(batchRes.data);
      }
    } catch (error) {
      console.error("Data fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ স্মার্ট সার্চ লজিক
  const safeLower = (str) => (str ? String(str).toLowerCase() : "");
  const lowerSearch = searchTerm.toLowerCase();

  const filteredItems = useMemo(() => {
    return unassignedItems.filter(
      (s) =>
        safeLower(s.shippingMark).includes(lowerSearch) ||
        safeLower(s.chinaTrackingNo).includes(lowerSearch) ||
        safeLower(s.productName).includes(lowerSearch) ||
        safeLower(s.cartonNo).includes(lowerSearch),
    );
  }, [unassignedItems, lowerSearch]);

  const { totalQuantity, totalGross, totalCbm } = useMemo(() => {
    let qty = 0,
      gross = 0,
      cbm = 0;
    filteredItems.forEach((s) => {
      qty += Number(s.quantity) || 1;
      gross += Number(s.grossWeight) || 0;
      cbm += Number(s.cbm) || 0;
    });
    return { totalQuantity: qty, totalGross: gross, totalCbm: cbm };
  }, [filteredItems]);

  const handleSelectBox = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((boxId) => boxId !== id) : [...prev, id],
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(filteredItems.map((s) => s._id));
    else setSelectedIds([]);
  };

  const handleInputChange = (index, field, value) => {
    const rows = [...newRows];
    rows[index][field] = value;
    if (["length", "width", "height"].includes(field)) {
      const l = Number(rows[index].length) || 0;
      const w = Number(rows[index].width) || 0;
      const h = Number(rows[index].height) || 0;
      rows[index].cbm = ((l * w * h) / 1000000).toFixed(3);
    }
    setNewRows(rows);
  };

  const addNewRow = () => {
    setNewRows([
      ...newRows,
      {
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
        receivedDate: new Date().toISOString().split("T")[0],
      },
    ]);
  };

  const removeNewRow = (index) => {
    const rows = [...newRows];
    rows.splice(index, 1);
    setNewRows(rows);
  };

  const handleBulkSave = async () => {
    if (newRows.some((r) => !r.shippingMark))
      return alert("Shipping Mark অবশ্যই দিতে হবে!");
    setLoading(true);
    try {
      await axios.post("/api/shipments/bulk-import", {
        shipments: newRows.map((r) => ({ ...r, status: "Warehouse Received" })),
        batchId: null,
      });
      setNewRows([
        {
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
          receivedDate: new Date().toISOString().split("T")[0],
        },
      ]);
      setShowBulkEntry(false);
      fetchWarehouseData();
    } catch (err) {
      alert("Error saving data");
    } finally {
      setLoading(false);
    }
  };

  const updateWeight = async (shipmentId, val) => {
    try {
      await axios.put(`/api/shipments/${shipmentId}/weight`, {
        actualWeight: parseFloat(val) || 0,
      });
      fetchWarehouseData();
    } catch (err) {
      alert("Weight update failed");
    }
  };

  const handleDelete = async (shipmentId) => {
    if (
      !window.confirm(
        "আপনি কি নিশ্চিত যে এই ওয়্যারহাউজ এন্ট্রিটি ডিলিট করতে চান?",
      )
    )
      return;
    try {
      await axios.delete(`/api/shipments/${shipmentId}`);
      fetchWarehouseData();
    } catch (err) {
      alert("ডিলিট করতে সমস্যা হয়েছে!");
    }
  };

  // 🔥 ব্যাচ সিলেক্ট করলে মাস্টার বক্সগুলো ফেচ করার লজিক
  const handleBatchChange = async (e) => {
    const batchId = e.target.value;
    setTargetBatch(batchId);
    setSelectedMasterBox(""); // রিজেট করা হলো
    setMasterBoxes([]);

    if (batchId) {
      try {
        const res = await axios.get(`/api/batches/${batchId}/master-boxes`);
        if (res.data.success) {
          setMasterBoxes(res.data.masterBoxes);
        }
      } catch (err) {
        console.error("Failed to fetch master boxes");
      }
    }
  };

  // 🚀 Push to Batch Logic (আপডেটেড)
  const handlePushToBatch = async () => {
    if (selectedIds.length === 0)
      return alert("দয়া করে অন্তত একটি মাল সিলেক্ট করুন!");
    if (!targetBatch) return alert("দয়া করে একটি টার্গেট ব্যাচ সিলেক্ট করুন!");

    const masterName = selectedMasterBox
      ? masterBoxes.find((m) => m._id === selectedMasterBox)?.cartonNo ||
        "Selected Master Box"
      : "Loose Items";

    if (
      !window.confirm(
        `সিলেক্ট করা ${selectedIds.length}টি মাল "${masterName}" হিসেবে ব্যাচে পুশ করতে চান?`,
      )
    )
      return;

    setIsPushing(true);
    try {
      const res = await axios.put(`/api/batches/${targetBatch}/assign`, {
        shipmentIds: selectedIds,
        masterBoxId: selectedMasterBox || null, // 🔥 মাস্টার বক্স থাকলে পাঠাবে
      });

      if (res.data.success) {
        alert("সফলভাবে ব্যাচে যুক্ত করা হয়েছে! 🚀");
        setSelectedIds([]);
        setTargetBatch("");
        setSelectedMasterBox("");
        setMasterBoxes([]);
        fetchWarehouseData();
      }
    } catch (error) {
      alert("ব্যাচে পুশ করতে সমস্যা হয়েছে!");
    } finally {
      setIsPushing(false);
    }
  };

  // 🗑️ Bulk Delete Logic
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0)
      return alert("দয়া করে অন্তত একটি মাল সিলেক্ট করুন!");
    if (
      !window.confirm(
        `আপনি কি নিশ্চিত যে সিলেক্ট করা ${selectedIds.length}টি মাল ডিলিট করতে চান?`,
      )
    )
      return;

    setLoading(true);
    try {
      const res = await axios.post("/api/bulk-delete", {
        shipmentIds: selectedIds,
      });
      if (res.data.success) {
        alert("সফলভাবে ডিলিট করা হয়েছে! 🗑️");
        setSelectedIds([]); // সিলেকশন ক্লিয়ার করা
        fetchWarehouseData(); // ডাটা রিফ্রেশ করা
      }
    } catch (error) {
      alert("ডিলিট করতে সমস্যা হয়েছে!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modern-batch-container">
      <div
        className="dashboard-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
        }}
      >
        <div className="batch-meta">
          <span
            className="batch-tag"
            style={{
              background: "#fef3c7",
              color: "#d97706",
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "bold",
              textTransform: "uppercase",
            }}
          >
            Central Pool
          </span>
          <h1 style={{ margin: "5px 0 0", fontSize: "28px", color: "#0f172a" }}>
            🏠 China Warehouse
          </h1>
          <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "14px" }}>
            আনঅ্যাসাইনড মাল রিসিভ করুন এবং ব্যাচে বা মাস্টার বক্সে পুশ করুন
          </p>
        </div>
      </div>

      <div
        className="ledger-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          marginBottom: "25px",
        }}
      >
        <div
          className="stat-card blue"
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
            borderLeft: "5px solid #3b82f6",
          }}
        >
          <span
            style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b" }}
          >
            ITEMS IN WAREHOUSE
          </span>
          <h3
            style={{ margin: "10px 0 0", fontSize: "24px", color: "#0f172a" }}
          >
            {totalQuantity}{" "}
            <small style={{ fontSize: "14px", color: "#94a3b8" }}>Pcs</small>
          </h3>
        </div>
        <div
          className="stat-card orange"
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
            borderLeft: "5px solid #f59e0b",
          }}
        >
          <span
            style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b" }}
          >
            TOTAL GROSS WEIGHT
          </span>
          <h3
            style={{ margin: "10px 0 0", fontSize: "24px", color: "#0f172a" }}
          >
            {totalGross.toFixed(2)}{" "}
            <small style={{ fontSize: "14px", color: "#94a3b8" }}>KG</small>
          </h3>
        </div>
        <div
          className="stat-card purple"
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
            borderLeft: "5px solid #8b5cf6",
          }}
        >
          <span
            style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b" }}
          >
            TOTAL CBM
          </span>
          <h3
            style={{ margin: "10px 0 0", fontSize: "24px", color: "#0f172a" }}
          >
            {totalCbm.toFixed(3)}{" "}
            <small style={{ fontSize: "14px", color: "#94a3b8" }}>m³</small>
          </h3>
        </div>
      </div>

      <div
        className="main-card"
        style={{
          background: "white",
          padding: "25px",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
        }}
      >
        <div
          className="toolbar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            gap: "15px",
            flexWrap: "wrap",
            background: "#f8fafc",
            padding: "15px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
          }}
        >
          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            {/* 🔥 Push to Batch & Master Box Section */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "white",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <span
                style={{
                  fontWeight: "bold",
                  color: "#0369a1",
                  fontSize: "14px",
                }}
              >
                Push ({selectedIds.length}):
              </span>

              {/* Batch Dropdown */}
              <select
                value={targetBatch}
                onChange={handleBatchChange}
                style={{
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #94a3b8",
                  outline: "none",
                  fontWeight: "bold",
                  background: "#f8fafc",
                }}
              >
                <option value="">-- Target Batch --</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.batchName}
                  </option>
                ))}
              </select>

              {/* Master Box Dropdown (Visible only if Batch is selected) */}
              {targetBatch && (
                <select
                  value={selectedMasterBox}
                  onChange={(e) => setSelectedMasterBox(e.target.value)}
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid #10b981",
                    outline: "none",
                    fontWeight: "bold",
                    background: "#f0fdf4",
                    color: "#166534",
                  }}
                >
                  <option value="">-- Loose Item (No Master) --</option>
                  {masterBoxes.map((mb) => (
                    <option key={mb._id} value={mb._id}>
                      📦{" "}
                      {mb.cartonNo ? `Carton: ${mb.cartonNo}` : mb.shippingMark}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={handlePushToBatch}
                disabled={isPushing || selectedIds.length === 0 || !targetBatch}
                style={{
                  background:
                    selectedIds.length > 0 && targetBatch
                      ? "#10b981"
                      : "#94a3b8",
                  color: "white",
                  border: "none",
                  padding: "8px 18px",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor:
                    selectedIds.length > 0 && targetBatch
                      ? "pointer"
                      : "not-allowed",
                  transition: "0.2s",
                  transform:
                    selectedIds.length > 0 && targetBatch
                      ? "scale(1.05)"
                      : "none",
                }}
              >
                {isPushing ? "Pushing..." : "🚀 PUSH"}
              </button>
            </div>

            <CanAccess module="shipment" action="create">
              <button
                className="excel-btn"
                style={{
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
                onClick={() => setIsUploadExcelOpen(true)}
              >
                📤 Upload Excel
              </button>
              <button
                className={`bulk-toggle-btn ${showBulkEntry ? "active" : ""}`}
                style={{
                  background: showBulkEntry ? "#ef4444" : "#3b82f6",
                  color: "white",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
                onClick={() => setShowBulkEntry(!showBulkEntry)}
              >
                {showBulkEntry ? "✖ Close Entry" : "📥 Quick Bulk Entry"}
              </button>

              {/* Push Button-এর ঠিক ডানপাশে এই Bulk Delete বাটনটি বসবে */}
              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  style={{
                    background: "#ef4444", // লাল রঙ
                    color: "white",
                    border: "none",
                    padding: "8px 15px",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    marginLeft: "10px",
                  }}
                >
                  🗑️ Delete Selected ({selectedIds.length})
                </button>
              )}
            </CanAccess>
          </div>
        </div>

        {/* 📥 Quick Bulk Entry Panel */}
        {showBulkEntry && (
          <div
            className="bulk-entry-panel"
            style={{
              padding: "20px",
              background: "#f0f9ff",
              borderRadius: "10px",
              border: "1px solid #bae6fd",
              marginBottom: "20px",
            }}
          >
            <h3 style={{ margin: "0 0 15px", color: "#0369a1" }}>
              📥 Add Shipments to Warehouse Pool
            </h3>
            <div className="table-scroll-wrapper" style={{ overflowX: "auto" }}>
              <table
                className="bulk-table"
                style={{ width: "100%", borderCollapse: "collapse" }}
              >
                <thead>
                  <tr style={{ background: "#cbd5e1", textAlign: "left" }}>
                    <th style={{ padding: "8px" }}>Tracking No(CN)</th>
                    <th style={{ padding: "8px" }}>Shipping Mark*</th>
                    <th style={{ padding: "8px" }}>Product</th>
                    <th style={{ padding: "8px" }}>Carton No</th>
                    <th style={{ padding: "8px" }}>Qty</th>
                    <th style={{ padding: "8px" }}>Wt(KG)</th>
                    <th style={{ padding: "8px" }}>L</th>
                    <th style={{ padding: "8px" }}>W</th>
                    <th style={{ padding: "8px" }}>H</th>
                    <th style={{ padding: "8px" }}>CBM</th>
                    <th style={{ padding: "8px" }}>Received Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {newRows.map((row, index) => (
                    <tr key={index}>
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
                          style={{
                            padding: "6px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            width: "120px",
                          }}
                        />
                      </td>
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
                          style={{
                            padding: "6px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            width: "100px",
                          }}
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
                          style={{
                            padding: "6px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            width: "120px",
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.cartonNo}
                          onChange={(e) =>
                            handleInputChange(index, "cartonNo", e.target.value)
                          }
                          style={{
                            padding: "6px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            width: "70px",
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={(e) =>
                            handleInputChange(index, "quantity", e.target.value)
                          }
                          style={{
                            padding: "6px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            width: "60px",
                          }}
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
                          style={{
                            padding: "6px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            width: "70px",
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.length}
                          onChange={(e) =>
                            handleInputChange(index, "length", e.target.value)
                          }
                          style={{
                            padding: "6px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            width: "50px",
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.width}
                          onChange={(e) =>
                            handleInputChange(index, "width", e.target.value)
                          }
                          style={{
                            padding: "6px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            width: "50px",
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.height}
                          onChange={(e) =>
                            handleInputChange(index, "height", e.target.value)
                          }
                          style={{
                            padding: "6px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            width: "50px",
                          }}
                        />
                      </td>
                      <td style={{ fontWeight: "bold", textAlign: "center" }}>
                        {row.cbm}
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
                          style={{
                            padding: "5px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                          }}
                        />
                      </td>
                      <td>
                        {newRows.length > 1 && (
                          <button
                            className="remove-row-btn"
                            onClick={() => removeNewRow(index)}
                            style={{
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              padding: "5px 8px",
                              cursor: "pointer",
                            }}
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
            <div
              className="bulk-footer"
              style={{ marginTop: "15px", display: "flex", gap: "10px" }}
            >
              <button
                className="add-row-btn"
                onClick={addNewRow}
                style={{
                  background: "#475569",
                  color: "white",
                  padding: "8px 15px",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                + Add New Row
              </button>
              <button
                className="save-all-btn"
                onClick={handleBulkSave}
                style={{
                  background: "#10b981",
                  color: "white",
                  padding: "8px 15px",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                {loading ? "Saving..." : "Save All Items"}
              </button>
            </div>
          </div>
        )}

        {/* 📊 Main Data Table */}
        <div className="table-responsive">
          <table
            className="data-table"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th
                  style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}
                >
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      filteredItems.length > 0 &&
                      selectedIds.length === filteredItems.length
                    }
                  />
                </th>
                <th
                  style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}
                >
                  SL
                </th>
                <th
                  style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}
                >
                  Tracking (China)
                </th>
                <th
                  style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}
                >
                  Shipping Mark
                </th>
                <th
                  style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}
                >
                  Product
                </th>
                <th
                  style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}
                >
                  Carton No
                </th>
                <th
                  style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}
                >
                  Qty
                </th>
                <th
                  style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}
                >
                  Gross Wt.
                </th>
                <th
                  style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}
                >
                  CBM
                </th>
                <th
                  style={{
                    textAlign: "center",
                    borderBottom: "2px solid #e2e8f0",
                  }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="10"
                    style={{
                      textAlign: "center",
                      padding: "30px",
                      color: "#64748b",
                    }}
                  >
                    Loading Warehouse Pool...
                  </td>
                </tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((s, idx) => (
                  <tr
                    key={s._id}
                    className={
                      selectedIds.includes(s._id) ? "row-selected" : ""
                    }
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td style={{ padding: "12px" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s._id)}
                        onChange={() => handleSelectBox(s._id)}
                      />
                    </td>
                    <td>{idx + 1}</td>
                    <td>
                      <strong>{s.chinaTrackingNo || "-"}</strong>
                    </td>
                    <td style={{ fontWeight: "bold", color: "#0f172a" }}>
                      {s.shippingMark}
                    </td>
                    <td>{s.productName || "-"}</td>
                    <td>
                      <span
                        style={{
                          background: "#f1f5f9",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        {s.cartonNo || "-"}
                      </span>
                    </td>
                    <td>
                      <strong>{s.quantity || 1}</strong>
                    </td>
                    <td>
                      <input
                        type="number"
                        defaultValue={s.grossWeight || 0}
                        onBlur={(e) => updateWeight(s._id, e.target.value)}
                        style={{
                          width: "80px",
                          padding: "5px 8px",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                        }}
                      />
                    </td>
                    <td>
                      <span className="cbm-badge">{s.cbm || 0}</span>
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "5px",
                          justifyContent: "center",
                        }}
                      >
                        <CanAccess module="shipment" action="edit">
                          <button
                            onClick={() => {
                              setShipmentToEdit(s);
                              setIsEditModalOpen(true);
                            }}
                            className="edit-btn"
                            style={{
                              background: "#e0f2fe",
                              color: "#0369a1",
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontWeight: "bold",
                            }}
                          >
                            ✏️ Edit
                          </button>
                        </CanAccess>
                        <CanAccess module="shipment" action="delete">
                          <button
                            onClick={() => handleDelete(s._id)}
                            className="delete-btn"
                            style={{
                              background: "#fee2e2",
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                          >
                            🗑️
                          </button>
                        </CanAccess>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="10"
                    style={{
                      textAlign: "center",
                      padding: "30px",
                      color: "#94a3b8",
                    }}
                  >
                    চায়না ওয়্যারহাউজে কোনো মাল নেই
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditShipmentModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setShipmentToEdit(null);
        }}
        shipment={shipmentToEdit}
        onSuccess={fetchWarehouseData}
      />

      <UploadExcelModal
        isOpen={isUploadExcelOpen}
        onClose={() => setIsUploadExcelOpen(false)}
        batchId={null}
        onSuccess={fetchWarehouseData}
      />

      <style>{`
        .row-selected { background-color: #eff6ff !important; }
        .input-editable:focus { border-color: #0ea5e9 !important; outline: none; }
        .cbm-badge { background: #f3e8ff; color: #7e22ce; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
      `}</style>
    </div>
  );
}
