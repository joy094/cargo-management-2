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

  // 🚀 Customer Mapping & Category Filter
  const [customerMap, setCustomerMap] = useState({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");

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

  // 🚀 ডিফল্ট ভ্যালুসহ ইনিশিয়াল রো স্ট্রাকচার
  const initialRow = {
    category: "By Sea",
    chinaTrackingNo: "",
    shippingMark: "",
    customerName: "",
    productName: "",
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
    receivedDate: new Date().toISOString().split("T")[0],
  };

  const [newRows, setNewRows] = useState([{ ...initialRow }]);

  useEffect(() => {
    fetchWarehouseData();
    fetchCustomerMap();
  }, []);

  // 🚀 কাস্টমার ম্যাপ ফেচ করা (আপনার ব্যাকএন্ড রাউট অনুযায়ী লিংক নিশ্চিত করুন, যেমন: /api/customer-map)
  const fetchCustomerMap = async () => {
    try {
      const res = await axios.get("/api/customer-map"); // যদি কাজ না করে তবে /api/branches/customer-map দিন
      if (res.data.success) {
        setCustomerMap(res.data.customerMap);
      }
    } catch (error) {
      console.error("Customer map fetch error:", error);
    }
  };

  // 🚀 আপনার অরিজিনাল /api/unassigned রাউট ফিরিয়ে আনা হয়েছে
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

  const safeLower = (str) => (str ? String(str).toLowerCase() : "");
  const lowerSearch = searchTerm.toLowerCase();

  // 🚀 ফিল্টারিং লজিক
  const filteredItems = useMemo(() => {
    let items = unassignedItems;

    if (selectedCategoryFilter !== "All") {
      items = items.filter((s) => s.category === selectedCategoryFilter);
    }

    return items.filter(
      (s) =>
        safeLower(s.shippingMark).includes(lowerSearch) ||
        safeLower(s.chinaTrackingNo).includes(lowerSearch) ||
        safeLower(s.productName).includes(lowerSearch) ||
        safeLower(s.customerName).includes(lowerSearch) ||
        safeLower(s.cartonNo).includes(lowerSearch),
    );
  }, [unassignedItems, lowerSearch, selectedCategoryFilter]);

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

    // ✨ ম্যাজিক অটো-ফিল কাস্টমার নেম লজিক
    if (field === "shippingMark") {
      const markUpper = value.trim().toUpperCase();
      if (customerMap[markUpper]) {
        rows[index].customerName = customerMap[markUpper];
      } else {
        rows[index].customerName = ""; // কাস্টমার না পাওয়া গেলে খালি থাকবে যেন ম্যানুয়ালি লেখা যায়
      }
    }

    if (["length", "width", "height"].includes(field)) {
      const l = Number(rows[index].length) || 0;
      const w = Number(rows[index].width) || 0;
      const h = Number(rows[index].height) || 0;
      rows[index].cbm = ((l * w * h) / 1000000).toFixed(3);
    }
    setNewRows(rows);
  };

  const addNewRow = () => {
    setNewRows([...newRows, { ...initialRow }]);
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
      setNewRows([{ ...initialRow }]);
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

  const handleBatchChange = async (e) => {
    const batchId = e.target.value;
    setTargetBatch(batchId);
    setSelectedMasterBox("");
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

  const handlePushToBatch = async () => {
    if (selectedIds.length === 0)
      return alert("দয়া করে অন্তত একটি মাল সিলেক্ট করুন!");
    if (!targetBatch) return alert("দয়া করে একটি টার্গেট ব্যাচ সিলেক্ট করুন!");

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
        masterBoxId: selectedMasterBox || null,
      });

      if (res.data.success) {
        alert("সফলভাবে ব্যাচে যুক্ত করা হয়েছে! 🚀");
        setSelectedIds([]);
        setTargetBatch("");
        setSelectedMasterBox("");
        setMasterBoxes([]);
        fetchWarehouseData();
      }
    } catch (error) {
      alert("ব্যাচে পুশ করতে সমস্যা হয়েছে!");
    } finally {
      setIsPushing(false);
    }
  };

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
        setSelectedIds([]);
        fetchWarehouseData();
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
        {/* 🛠️ Action Toolbar */}
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
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                outline: "none",
                fontWeight: "bold",
                color: "#0f172a",
                background: "white",
              }}
            >
              <option value="All">🌍 All Categories</option>
              <option value="By Sea">🚢 By Sea</option>
              <option value="By Air">✈️ By Air</option>
              <option value="Hand Carry">💼 Hand Carry</option>
              <option value="HONG KONG PRODUCT">🇭🇰 Hong Kong Product</option>
            </select>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
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
                  <option value="">-- Loose Item --</option>
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
                }}
              >
                {isPushing ? "..." : "🚀 PUSH"}
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
                {showBulkEntry ? "✖ Close Entry" : "📥  Entry"}
              </button>

              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  style={{
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    padding: "10px 15px",
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
              📥 Add Shipments
            </h3>
            <div
              className="table-scroll-wrapper"
              style={{ overflowX: "auto", paddingBottom: "10px" }}
            >
              <table
                className="bulk-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  whiteSpace: "nowrap",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#cbd5e1",
                      textAlign: "left",
                      fontSize: "13px",
                    }}
                  >
                    <th style={{ padding: "8px" }}>Category</th>
                    <th style={{ padding: "8px" }}>Tracking(CN)</th>
                    <th style={{ padding: "8px" }}>Mark*</th>
                    <th style={{ padding: "8px" }}>Customer Name</th>
                    <th style={{ padding: "8px" }}>Product</th>
                    <th style={{ padding: "8px" }}>Carton No</th>
                    <th style={{ padding: "8px" }}>Qty</th>
                    <th style={{ padding: "8px" }}>Wt(KG)</th>
                    <th style={{ padding: "8px" }}>L</th>
                    <th style={{ padding: "8px" }}>W</th>
                    <th style={{ padding: "8px" }}>H</th>
                    <th style={{ padding: "8px" }}>CBM</th>
                    <th style={{ padding: "8px" }}>Pkg Cost</th>
                    <th style={{ padding: "8px" }}>Rcv Cost</th>
                    <th style={{ padding: "8px" }}>Note</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {newRows.map((row, index) => (
                    <tr key={index}>
                      <td style={{ padding: "4px" }}>
                        <select
                          value={row.category}
                          onChange={(e) =>
                            handleInputChange(index, "category", e.target.value)
                          }
                          className="compact-input"
                          style={{ width: "110px" }}
                        >
                          <option value="By Sea">By Sea</option>
                          <option value="By Air">By Air</option>
                          <option value="Hand Carry">Hand Carry</option>
                          <option value="HONG KONG PRODUCT">
                            Hong Kong Product
                          </option>
                        </select>
                      </td>
                      <td style={{ padding: "4px" }}>
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
                          className="compact-input"
                          style={{ width: "110px" }}
                        />
                      </td>
                      <td style={{ padding: "4px" }}>
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
                          className="compact-input"
                          style={{
                            width: "100px",
                            border: "1px solid #0ea5e9",
                          }}
                        />
                      </td>
                      <td style={{ padding: "4px" }}>
                        <input
                          type="text"
                          value={row.customerName}
                          onChange={(e) =>
                            handleInputChange(
                              index,
                              "customerName",
                              e.target.value,
                            )
                          }
                          className="compact-input"
                          style={{ width: "110px" }}
                          placeholder="Manual/Auto"
                        />
                      </td>
                      <td style={{ padding: "4px" }}>
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
                          className="compact-input"
                          style={{ width: "100px" }}
                        />
                      </td>
                      <td style={{ padding: "4px" }}>
                        <input
                          type="text"
                          value={row.cartonNo}
                          onChange={(e) =>
                            handleInputChange(index, "cartonNo", e.target.value)
                          }
                          className="compact-input"
                          style={{ width: "65px" }}
                        />
                      </td>
                      <td style={{ padding: "4px" }}>
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={(e) =>
                            handleInputChange(index, "quantity", e.target.value)
                          }
                          className="compact-input"
                          style={{ width: "50px" }}
                        />
                      </td>
                      <td style={{ padding: "4px" }}>
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
                          className="compact-input"
                          style={{ width: "65px" }}
                        />
                      </td>
                      <td style={{ padding: "4px" }}>
                        <input
                          type="number"
                          value={row.length}
                          onChange={(e) =>
                            handleInputChange(index, "length", e.target.value)
                          }
                          className="compact-input"
                          style={{ width: "45px" }}
                        />
                      </td>
                      <td style={{ padding: "4px" }}>
                        <input
                          type="number"
                          value={row.width}
                          onChange={(e) =>
                            handleInputChange(index, "width", e.target.value)
                          }
                          className="compact-input"
                          style={{ width: "45px" }}
                        />
                      </td>
                      <td style={{ padding: "4px" }}>
                        <input
                          type="number"
                          value={row.height}
                          onChange={(e) =>
                            handleInputChange(index, "height", e.target.value)
                          }
                          className="compact-input"
                          style={{ width: "45px" }}
                        />
                      </td>
                      <td
                        style={{
                          padding: "4px",
                          fontWeight: "bold",
                          textAlign: "center",
                          fontSize: "12px",
                        }}
                      >
                        {row.cbm}
                      </td>
                      <td style={{ padding: "4px" }}>
                        <input
                          type="number"
                          value={row.packagingCost}
                          onChange={(e) =>
                            handleInputChange(
                              index,
                              "packagingCost",
                              e.target.value,
                            )
                          }
                          className="compact-input"
                          style={{ width: "65px" }}
                        />
                      </td>
                      <td style={{ padding: "4px" }}>
                        <input
                          type="number"
                          value={row.receivingCost}
                          onChange={(e) =>
                            handleInputChange(
                              index,
                              "receivingCost",
                              e.target.value,
                            )
                          }
                          className="compact-input"
                          style={{ width: "65px" }}
                        />
                      </td>
                      <td style={{ padding: "4px" }}>
                        <input
                          type="text"
                          value={row.note}
                          onChange={(e) =>
                            handleInputChange(index, "note", e.target.value)
                          }
                          className="compact-input"
                          style={{ width: "120px" }}
                          placeholder="Note..."
                        />
                      </td>
                      <td style={{ padding: "4px" }}>
                        {newRows.length > 1 && (
                          <button
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
            <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
              <button
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
        <div className="table-responsive" style={{ overflowX: "auto" }}>
          <table
            className="data-table"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              whiteSpace: "nowrap",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  textAlign: "left",
                  fontSize: "13px",
                }}
              >
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
                  Category
                </th>
                <th
                  style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}
                >
                  Tracking
                </th>
                <th
                  style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}
                >
                  Shipping Mark
                </th>
                <th
                  style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}
                >
                  Customer
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
                  style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}
                >
                  Pkg Cost
                </th>
                <th
                  style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}
                >
                  Rcv Cost
                </th>
                <th
                  style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}
                >
                  Note
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
                    colSpan="15"
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
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: "13px",
                    }}
                  >
                    <td style={{ padding: "12px" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s._id)}
                        onChange={() => handleSelectBox(s._id)}
                      />
                    </td>
                    <td>{idx + 1}</td>

                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          background:
                            s.category === "By Sea"
                              ? "#e0f2fe"
                              : s.category === "By Air"
                                ? "#fef3c7"
                                : "#f3e8ff",
                          color:
                            s.category === "By Sea"
                              ? "#0369a1"
                              : s.category === "By Air"
                                ? "#b45309"
                                : "#7e22ce",
                          padding: "3px 6px",
                          borderRadius: "4px",
                          fontWeight: "bold",
                          fontSize: "11px",
                        }}
                      >
                        {s.category || "By Sea"}
                      </span>
                    </td>

                    <td>
                      <strong>{s.chinaTrackingNo || "-"}</strong>
                    </td>
                    <td style={{ fontWeight: "bold", color: "#0f172a" }}>
                      {s.shippingMark}
                    </td>
                    <td style={{ color: "#475569", fontWeight: "500" }}>
                      {s.customerName || "-"}
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
                          width: "65px",
                          padding: "4px 6px",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          fontSize: "12px",
                        }}
                      />
                    </td>

                    <td>
                      <span className="cbm-badge">{s.cbm || 0}</span>
                    </td>
                    <td style={{ color: "#ef4444", fontWeight: "bold" }}>
                      ৳{s.packagingCost || 0}
                    </td>
                    <td style={{ color: "#f59e0b", fontWeight: "bold" }}>
                      ৳{s.receivingCost || 0}
                    </td>

                    <td
                      style={{
                        maxWidth: "150px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={s.note}
                    >
                      {s.note || "-"}
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
                            ✏️
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
                    colSpan="15"
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
        .compact-input { padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; outline: none; box-sizing: border-box; }
        .compact-input:focus { border-color: #0ea5e9; }
        .table-responsive::-webkit-scrollbar, .table-scroll-wrapper::-webkit-scrollbar { height: 8px; }
        .table-responsive::-webkit-scrollbar-thumb, .table-scroll-wrapper::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .table-responsive::-webkit-scrollbar-track, .table-scroll-wrapper::-webkit-scrollbar-track { background: #f1f5f9; }
      `}</style>
    </div>
  );
}
