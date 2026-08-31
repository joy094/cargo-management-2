//src/components/ChinaWarehouse.jsx

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "./BatchDetails.css";
import CanAccess from "./CanAccess";
import EditShipmentModal from "./EditShipmentModal";
import Search from "./Search";
import UploadExcelModal from "./UploadExcelModal";
import { translateToChinese } from "../utils/translate"; // উপরে ইম্পোর্ট করুন
import ProductTypePieChart from "./PieChart";

export default function ChinaWarehouse() {
  const [unassignedItems, setUnassignedItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Customer Mapping & Category Filter
  const [customerMap, setCustomerMap] = useState({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");

  // Selection & Push States
  const [selectedIds, setSelectedIds] = useState([]);
  const [targetBatch, setTargetBatch] = useState("");
  const [isPushing, setIsPushing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Master Box States
  const [masterBoxes, setMasterBoxes] = useState([]);
  const [selectedMasterBox, setSelectedMasterBox] = useState("");

  // CRUD & Modals
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [shipmentToEdit, setShipmentToEdit] = useState(null);
  const [isUploadExcelOpen, setIsUploadExcelOpen] = useState(false);

  // 🚀 নতুন: সিঙ্গেল ফর্ম ডাটার জন্য Initial State
  const initialForm = {
    category: "By Sea",
    chinaTrackingNo: "",
    shippingMark: "",
    customerName: "",
    productName: "",
    productNameCn: "", // 🇨🇳 নতুন ফিল্ড
    productType: "General", // 🔥 এই নতুন ফিল্ডটি ইনিশিয়াল স্টেটে যুক্ত করবেন
    cartonNo: "",
    quantity: 1,
    grossWeight: "",
    length: "",
    width: "",
    height: "",
    cbm: 0,
    packagingCost: 0,
    receivingCost: 0,
    note: "",
    receivedDate: new Date().toISOString().split("T")[0],
  };

  const [formData, setFormData] = useState({ ...initialForm });

  useEffect(() => {
    fetchWarehouseData();
    fetchCustomerMap();
  }, []);

  const fetchCustomerMap = async () => {
    try {
      const res = await axios.get("/api/customer-map");
      if (res.data.success) {
        setCustomerMap(res.data.customerMap);
      }
    } catch (error) {
      console.error("Customer map fetch error:", error);
    }
  };

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

  // 🚀 নতুন: সিঙ্গেল ইনপুট চেঞ্জ হ্যান্ডলার
  const handleEntryChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    // Customer Name Auto-fill
    if (name === "shippingMark") {
      const markUpper = value.trim().toUpperCase();
      if (customerMap[markUpper]) {
        newFormData.customerName = customerMap[markUpper];
      } else {
        newFormData.customerName = "";
      }
    }

    // CBM Calculation
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
    if (text && !formData.productNameCn) {
      const translatedText = await translateToChinese(text);
      setFormData((prev) => ({ ...prev, productNameCn: translatedText }));
    }
  };

  // 🚀 নতুন: সিঙ্গেল ফর্ম সেভ করার লজিক
  const handleSingleSave = async () => {
    if (!formData.shippingMark) return alert("Shipping Mark অবশ্যই দিতে হবে!");
    setLoading(true);
    try {
      await axios.post("/api/shipments/bulk-import", {
        shipments: [{ ...formData, status: "Warehouse Received" }],
        batchId: null,
      });
      setFormData({ ...initialForm }); // ফর্ম রিসেট
      setShowBulkEntry(false); // মোডাল বন্ধ
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
      !window.confirm("Are you sure you want to delete this warehouse entry?")
    )
      return;
    try {
      await axios.delete(`/api/shipments/${shipmentId}`);
      fetchWarehouseData();
    } catch (err) {
      alert("Failed to delete shipment!");
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
      return alert("Please select at least one shipment!");
    if (!targetBatch) return alert("Please select a target batch!");

    const masterName = selectedMasterBox
      ? masterBoxes.find((m) => m._id === selectedMasterBox)?.cartonNo ||
        "Selected Master Box"
      : "Loose Items";

    if (
      !window.confirm(
        `Selected ${selectedIds.length} shipments to be pushed to batch "${masterName}"?`,
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
        alert("Successfully pushed to batch! 🚀");
        setSelectedIds([]);
        setTargetBatch("");
        setSelectedMasterBox("");
        setMasterBoxes([]);
        fetchWarehouseData();
      }
    } catch (error) {
      alert("Failed to push shipments to batch!");
    } finally {
      setIsPushing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0)
      return alert("Please select at least one shipment to delete!");
    if (
      !window.confirm(
        `Are you sure you want to delete the selected ${selectedIds.length} shipments?`,
      )
    )
      return;

    setLoading(true);
    try {
      const res = await axios.post("/api/bulk-delete", {
        shipmentIds: selectedIds,
      });
      if (res.data.success) {
        alert("Successfully deleted shipments! 🗑️");
        setSelectedIds([]);
        fetchWarehouseData();
      }
    } catch (error) {
      alert("Failed to delete shipments!");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 চায়না ওয়ারহাউজের স্টক মালের ওপর ভিত্তি করে পাই চার্ট ডাটা ক্যালকুলেশন
  const warehouseTypeStats = filteredItems.reduce((acc, item) => {
    const type = item.productType || "General";
    acc[type] = (acc[type] || 0) + (Number(item.grossWeight) || 0);
    return acc;
  }, {});

  const warehousePieChartData = Object.keys(warehouseTypeStats).map((key) => ({
    name: key,
    value: parseFloat(warehouseTypeStats[key].toFixed(2)),
  }));

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
            Receive unassigned shipments and push them to batches or master
            boxes
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
              <option value="By Air">✈️ By Air CN </option>
              <option value="By Air Mix Box CN">✈️ By Air Mix Box CN </option>
              <option value="By Air HK">✈️ By Air HK</option>
              <option value="By Air Mix Box HK">✈️ By Air Mix Box HK</option>
              <option value="Hand Carry">💼 Hand Carry</option>
              <option value="By Sea">🚢 By Sea </option>
              <option value="Other">🚢 Other</option>
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
                className="bulk-toggle-btn"
                style={{
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
                onClick={() => setShowBulkEntry(true)}
              >
                📥 Entry
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

        {/* 📥 🚀 নতুন আপডেট: এডিট মোডালের মতো সিঙ্গেল এন্ট্রি ফর্ম */}
        {showBulkEntry && (
          <div className="fixed-modal-overlay">
            <div
              className="fixed-modal-content"
              style={{ maxWidth: "650px", width: "95%" }}
            >
              <div
                className="modal-header"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                  borderBottom: "2px solid #f1f5f9",
                  paddingBottom: "15px",
                }}
              >
                <h2 style={{ margin: 0, color: "#0369a1", fontSize: "20px" }}>
                  📥 Add New Packaging
                </h2>
                <button
                  onClick={() => {
                    setFormData({ ...initialForm });
                    setShowBulkEntry(false);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "24px",
                    cursor: "pointer",
                    color: "#ef4444",
                    fontWeight: "bold",
                  }}
                >
                  ✖
                </button>
              </div>

              <div className="modal-body edit-grid">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleEntryChange}
                  >
                    <option value="By Air">✈️ By Air CN </option>
                    <option value="By Air Mix Box CN">
                      ✈️ By Air Mix Box CN
                    </option>
                    <option value="By Air HK">✈️ By Air HK</option>
                    <option value="By Air Mix Box HK">
                      ✈️ By Air Mix Box HK
                    </option>
                    <option value="By Sea">🚢 By Sea </option>
                    <option value="Hand Carry">💼 Hand Carry</option>
                    <option value="Other">🚢 Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Shipping Mark *</label>
                  <input
                    type="text"
                    name="shippingMark"
                    value={formData.shippingMark}
                    onChange={handleEntryChange}
                    style={{ border: "1px solid #0ea5e9" }}
                  />
                </div>

                <div className="form-group">
                  <label>Customer Name</label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleEntryChange}
                    placeholder="Auto-fills if match found"
                  />
                </div>
                <div className="form-group">
                  <label>Carton No.</label>
                  <input
                    type="text"
                    name="cartonNo"
                    value={formData.cartonNo}
                    onChange={handleEntryChange}
                  />
                </div>

                <div className="form-group">
                  <label>Product Name (EN)</label>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleEntryChange}
                    onBlur={handleProductBlur} // 👈 ফোকাস সরালেই ট্রান্সলেট হবে
                  />
                </div>
                {/* Product Name (Chinese) */}
                <div className="form-group">
                  <label>Product Name (CN)</label>
                  <input
                    type="text"
                    name="productNameCn"
                    value={formData.productNameCn}
                    onChange={handleEntryChange}
                    placeholder="Auto translates..."
                    style={{
                      border: "1px solid #10b981",
                      background: "#f0fdf4",
                    }}
                  />
                </div>
                {/* 🔥 নতুন: Product Type ড্রপডাউনটি এখানে বসান */}
                <div className="form-group">
                  <label>Product Type</label>
                  <select
                    name="productType"
                    value={formData.productType}
                    onChange={handleEntryChange}
                    style={{ fontWeight: "bold", color: "#0f172a" }}
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
                    onChange={handleEntryChange}
                  />
                </div>

                <div className="form-group">
                  <label>Gross Weight (KG)</label>
                  <input
                    type="number"
                    name="grossWeight"
                    value={formData.grossWeight}
                    onChange={handleEntryChange}
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
                      onChange={handleEntryChange}
                    />
                    <input
                      type="number"
                      name="width"
                      placeholder="W"
                      value={formData.width}
                      onChange={handleEntryChange}
                    />
                    <input
                      type="number"
                      name="height"
                      placeholder="H"
                      value={formData.height}
                      onChange={handleEntryChange}
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
                    onChange={handleEntryChange}
                    placeholder="If Multiple Tracking separate by (,)"
                  />
                </div>
                <div className="form-group">
                  <label>Packaging Cost (৳)</label>
                  <input
                    type="number"
                    name="packagingCost"
                    value={formData.packagingCost}
                    onChange={handleEntryChange}
                  />
                </div>

                <div className="form-group">
                  <label>Receiving Cost (৳)</label>
                  <input
                    type="number"
                    name="receivingCost"
                    value={formData.receivingCost}
                    onChange={handleEntryChange}
                  />
                </div>

                <div className="form-group">
                  <label>Received Date</label>
                  <input
                    type="date"
                    name="receivedDate"
                    value={formData.receivedDate}
                    onChange={handleEntryChange}
                  />
                </div>

                <div className="form-group">
                  <label>Note / Remarks</label>
                  <input
                    type="text"
                    name="note"
                    value={formData.note}
                    onChange={handleEntryChange}
                    placeholder="Any instructions..."
                  />
                </div>
              </div>

              <div
                className="modal-footer"
                style={{
                  marginTop: "25px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  borderTop: "2px solid #f1f5f9",
                  paddingTop: "15px",
                }}
              >
                <button
                  onClick={() => {
                    setFormData({ ...initialForm });
                    setShowBulkEntry(false);
                  }}
                  className="cancel-btn"
                >
                  ✖ Cancel
                </button>
                <button
                  onClick={handleSingleSave}
                  className="save-btn"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "💾 Save "}
                </button>
              </div>
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
                  Carton No
                </th>
                <th
                  style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}
                >
                  Product
                </th>

                {/* 🔥 এই নতুন হেডিংটি যুক্ত করুন */}
                <th
                  style={{
                    padding: "12px",
                    borderBottom: "2px solid #e2e8f0",
                    color: "#0369a1",
                  }}
                >
                  Type
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
                  Tracking
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
                  Rcv Date
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
                    colSpan="16"
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
                    <td style={{ padding: "12px" }}>{idx + 1}</td>

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

                    <td
                      style={{
                        padding: "12px",
                        fontWeight: "bold",
                        color: "#0f172a",
                      }}
                    >
                      {s.shippingMark}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        color: "#475569",
                        fontWeight: "500",
                      }}
                    >
                      {s.customerName || "-"}
                    </td>

                    <td style={{ padding: "12px" }}>
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

                    <td
                      className="product-name-cell"
                      style={{ padding: "12px" }}
                    >
                      <div style={{ fontWeight: "bold", color: "#0f172a" }}>
                        {s.productName || "-"}
                      </div>
                      {s.productNameCn && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#10b981",
                            marginTop: "2px",
                          }}
                        >
                          🇨🇳 {s.productNameCn}
                        </div>
                      )}
                    </td>

                    {/* ✅ সঠিক কোড (সরাসরি টেবিল থেকে ডাটাবেজে আপডেট করার লজিকসহ) */}
                    <td style={{ padding: "12px" }}>
                      <select
                        value={s.productType || "General"}
                        onChange={async (e) => {
                          try {
                            // সরাসরি ডাটাবেজে টাইপ আপডেট করার লজিক (ওজন আপডেটের মতো)
                            await axios.put(`/api/shipments/edit/${s._id}`, {
                              ...s,
                              productType: e.target.value,
                            });
                            fetchWarehouseData(); // ডাটা রিফ্রেশ এবং পাই চার্ট আপডেট
                          } catch (error) {
                            alert("Failed to update Product Type!");
                          }
                        }}
                        style={{
                          padding: "5px",
                          borderRadius: "4px",
                          border: "1px solid #cbd5e1",
                          outline: "none",
                          background: "#f8fafc",
                        }}
                      >
                        <option value="General">General</option>
                        <option value="Copy">Copy</option>
                        <option value="Liquid">Liquid</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Fragile">Fragile</option>
                        <option value="Magnetic">Magnetic</option>
                      </select>
                    </td>

                    <td style={{ padding: "12px" }}>
                      <strong>{s.quantity || 1}</strong>
                    </td>

                    <td style={{ padding: "12px" }}>
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

                    <td style={{ padding: "12px" }}>
                      <span className="cbm-badge">{s.cbm || 0}</span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <strong>{s.chinaTrackingNo || "-"}</strong>
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        color: "#ef4444",
                        fontWeight: "bold",
                      }}
                    >
                      ¥{s.packagingCost || 0}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        color: "#f59e0b",
                        fontWeight: "bold",
                      }}
                    >
                      ¥{s.receivingCost || 0}
                    </td>

                    <td style={{ padding: "12px" }}>
                      <span
                        className="recivedDate"
                        style={{ fontWeight: "bold", color: "#10b981" }}
                      >
                        {s.receivedDate
                          ? (() => {
                              const d = new Date(s.receivedDate);
                              const day = String(d.getDate()).padStart(2, "0");
                              const month = String(d.getMonth() + 1).padStart(
                                2,
                                "0",
                              );
                              const year = d.getFullYear();
                              return `${day}-${month}-${year}`;
                            })()
                          : "-"}
                      </span>
                    </td>

                    <td
                      style={{
                        padding: "12px",
                        maxWidth: "150px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={s.note}
                    >
                      {s.note || "-"}
                    </td>

                    <td style={{ padding: "12px", textAlign: "center" }}>
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
                    colSpan="16"
                    style={{
                      textAlign: "center",
                      padding: "30px",
                      color: "#94a3b8",
                    }}
                  >
                    No shipment boxes found in warehouse.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <ProductTypePieChart
            data={warehousePieChartData}
            title="📊 Warehouse Stock Analysis (By China Wt.)"
          />
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
        .cbm-badge { background: #f3e8ff; color: #7e22ce; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
        .table-responsive::-webkit-scrollbar { height: 8px; }
        .table-responsive::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .table-responsive::-webkit-scrollbar-track { background: #f1f5f9; }

        /* 🔥 নতুন: ফর্ম মোডালের জন্য CSS */
        .edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-group label { font-size: 12px; font-weight: bold; color: #475569; }
        .form-group input, .form-group select { padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; transition: 0.2s; width: 100%; box-sizing: border-box; }
        .form-group input:focus, .form-group select:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1); }
        .dimensions-group { grid-column: span 2; }
        .cancel-btn { background: #f1f5f9; color: #475569; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .cancel-btn:hover { background: #e2e8f0; color: #0f172a; }
        .save-btn { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .save-btn:hover { background: #059669; }
        .save-btn:disabled { background: #94a3b8; cursor: not-allowed; }

        /* ==========================================
   Responsive Table Scroll Fix
========================================== */
.table-responsive {
  width: 100%;
  overflow-x: auto; /* এটি ডান-বামে স্ক্রলবার আনবে */
  -webkit-overflow-scrolling: touch; /* মোবাইলে স্মুথ স্ক্রলিংয়ের জন্য */
  
  /* টেবিলের নিচে স্ক্রলবারের জায়গা রাখার জন্য হালকা প্যাডিং */
  padding-bottom: 10px; 
}

/* নিশ্চিত করুন টেবিলটি যেন পুরো জায়গা নেয় এবং কলামগুলো ঠিকমতো আচরণ করে */
.data-table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap; /* ডিফল্টভাবে টেক্সট যেন না ভাঙে, শুধু নির্দিষ্ট কলাম ছাড়া */
}

/* ==========================================
   Product Name Text Wrap Fix
========================================== */
.product-name-cell {
  /* কলামের সর্বোচ্চ এবং সর্বনিম্ন প্রস্থ নির্ধারণ */
  max-width: 150px; 
  min-width: 120px;
  
  /* লম্বা টেক্সটকে ভেঙে নিচে নামতে বাধ্য করা */
  white-space: normal; 
  word-wrap: break-word; 
  overflow-wrap: break-word;
  word-break: break-all; /* অতিরিক্ত বড় শব্দ (যাতে কোনো স্পেস নেই) ভাঙার জন্য */
  
  /* দেখতে সুন্দর লাগার জন্য হালকা প্যাডিং এবং লাইন হাইট */
  padding: 8px !important;
  line-height: 1.4;
}

/* চাইলে Shipping Mark এর কলামেও একই স্টাইল দিতে পারেন যদি সেটিও বড় হয়ে যায় */
.mark-cell {
  max-width: 180px;
  white-space: normal;
  word-wrap: break-word;
}
      `}</style>
    </div>
  );
}
