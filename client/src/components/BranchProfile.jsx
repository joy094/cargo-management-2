//src/components/BranchProfile.jsx

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./BranchProfile.css";
import CanAccess from "./CanAccess";
import DirectBulkEntry from "./DirectBulkEntry";
import EditShipmentModal from "./EditShipmentModal";
import InvoicePrintModal from "./InvoicePrintModal"; // 🔥 নতুন ইমপোর্ট যোগ করুন
import InvoiceHistory from "./InvoiceHistory"; //🔥 নতুন ইমপোর্ট যোগ করুন
import PaymentLedger from "./PaymentLedger"; // 🔥 নতুন ইমপোর্ট
export default function BranchProfile() {
  const [searchParams] = useSearchParams();
  const markFromUrl = searchParams.get("mark");
  const navigate = useNavigate();

  // Basic States
  const [activeMark, setActiveMark] = useState("");
  const [summary, setSummary] = useState(null);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Tab & History States
  const [activeTab, setActiveTab] = useState("pending");
  const [invoiceHistory, setInvoiceHistory] = useState([]);

  // Pending Actions States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [globalRate, setGlobalRate] = useState("");
  const [discount, setDiscount] = useState(0);
  const [transportCost, setTransportCost] = useState(0);

  // Modal States
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  const [showDirectEntry, setShowDirectEntry] = useState(false);

  // Edit Shipment Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);

  useEffect(() => {
    if (markFromUrl) {
      fetchBranchData(markFromUrl);
    }
  }, [markFromUrl]);

  // Fetch Summary and All Items (Billed + Unbilled)
  const fetchBranchData = async (mark) => {
    setLoading(true);
    try {
      const summaryRes = await axios.get(
        `/api/branches/summary/${encodeURIComponent(mark)}`,
      );
      const itemsRes = await axios.get(
        `/api/branches/all-items/${encodeURIComponent(mark)}`,
      );

      setSummary(summaryRes.data.summary);

      // স্মার্ট ফিল্টার: শুধু দেশে পৌঁছানো মালগুলো ফিল্টার করা হচ্ছে
      const arrivedItems = itemsRes.data.items.filter(
        (item) =>
          item.status !== "Warehouse Received" &&
          item.status !== "In-Transit" &&
          item.isMasterCarton !== true &&
          item.isHeld !== true,
      );

      const itemsWithRate = arrivedItems.map((item) => ({
        ...item,
        rate: item.perKgRate || 0,
        total:
          (Number(item.actualWeight) || Number(item.grossWeight) || 0) *
          (item.perKgRate || 0),
        calcWeight: Number(item.actualWeight) || Number(item.grossWeight) || 0,
      }));

      setAllItems(itemsWithRate);
      setActiveMark(mark);
      setSelectedIds([]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceHistory = async () => {
    try {
      const res = await axios.get(
        `/api/branches/invoice-history/${encodeURIComponent(activeMark)}`,
      );
      if (res.data.success) {
        setInvoiceHistory(res.data.history);
      }
    } catch (error) {
      console.error("History fetch error", error);
    }
  };

  const handleEditManualShipment = (shipment) => {
    setEditingShipment(shipment);
    setShowEditModal(true);
  };

  const handleDeleteManualShipment = async (id) => {
    if (
      window.confirm(
        "আপনি কি নিশ্চিত যে এই ম্যানুয়াল এন্ট্রিটি ডিলিট করতে চান?",
      )
    ) {
      try {
        await axios.delete(`/api/shipments/${id}`);
        alert("সফলভাবে ডিলিট হয়েছে!");
        fetchBranchData(activeMark);
      } catch (err) {
        alert("ডিলিট করতে সমস্যা হয়েছে!");
      }
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "history") {
      fetchInvoiceHistory();
    } else {
      fetchBranchData(activeMark);
    }
  };

  const uniqueBatches = useMemo(() => {
    const batches = allItems.map((item) => {
      if (item.batchId && item.batchId.batchName) return item.batchId.batchName;
      if (item.batch && item.batch.batchName) return item.batch.batchName;
      return item.batchName || item.batchId || item.batch;
    });
    return [...new Set(batches)].filter(Boolean);
  }, [allItems]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      let itemBatch = "";
      if (item.batchId && item.batchId.batchName)
        itemBatch = item.batchId.batchName;
      else if (item.batch && item.batch.batchName)
        itemBatch = item.batch.batchName;
      else itemBatch = item.batchName || item.batchId || item.batch;

      const batchMatch = selectedBatch ? itemBatch === selectedBatch : true;

      const searchMatch =
        item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.chinaTrackingNo?.toLowerCase().includes(searchTerm.toLowerCase());

      return batchMatch && searchMatch;
    });
  }, [searchTerm, selectedBatch, allItems]);

  const filteredHistory = useMemo(() => {
    return invoiceHistory.filter((inv) => {
      let batchMatch = true;
      if (selectedBatch) {
        batchMatch = inv.items.some((item) => {
          let itemBatch = "";
          if (item.batchId && item.batchId.batchName)
            itemBatch = item.batchId.batchName;
          else if (item.batch && item.batch.batchName)
            itemBatch = item.batch.batchName;
          else itemBatch = item.batchName || item.batchId || item.batch;

          return itemBatch === selectedBatch;
        });
      }

      let searchMatch = true;
      if (invoiceSearchTerm) {
        const term = invoiceSearchTerm.toLowerCase();
        const idMatch = inv._id.toLowerCase().includes(term);
        const itemMatch = inv.items.some(
          (item) =>
            item.productName?.toLowerCase().includes(term) ||
            item.chinaTrackingNo?.toLowerCase().includes(term),
        );
        searchMatch = idMatch || itemMatch;
      }

      return batchMatch && searchMatch;
    });
  }, [invoiceHistory, invoiceSearchTerm, selectedBatch]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    // 🔥 এখন এটি বিল্ড এবং আনবিল্ড সব আইটেমই সিলেক্ট করতে পারবে
    if (
      selectedIds.length === filteredItems.length &&
      filteredItems.length > 0
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((item) => item._id));
    }
  };

  const applyRateToSelected = () => {
    const rateVal = parseFloat(globalRate);
    if (!rateVal || rateVal <= 0) return alert("সঠিক রেট লিখুন!");
    const updatedItems = allItems.map((item) => {
      if (selectedIds.includes(item._id) && !item.isBilled) {
        return { ...item, rate: rateVal, total: item.calcWeight * rateVal };
      }
      return item;
    });
    setAllItems(updatedItems);
  };

  const handleRateChange = (idx, newRate) => {
    const updatedItems = [...allItems];
    const rateVal = parseFloat(newRate) || 0;
    updatedItems[idx].rate = rateVal;
    updatedItems[idx].total = updatedItems[idx].calcWeight * rateVal;
    setAllItems(updatedItems);
  };

  const handleRevertItem = async (itemId) => {
    if (
      !window.confirm(
        "আপনি কি নিশ্চিত? এটি ইনভয়েস থেকে বাদ পড়ে আবার আনবিল্ড হয়ে যাবে।",
      )
    )
      return;
    try {
      const res = await axios.post("/api/branches/revert-item", { itemId });
      if (res.data.success) {
        alert("সফলভাবে রিভার্ট করা হয়েছে!");
        fetchBranchData(activeMark);
      }
    } catch (error) {
      alert("রিভার্ট করতে সমস্যা হয়েছে!");
    }
  };

  // 🔥 একসাথে একাধিক সিলেক্টেড আইটেম আনডু (Bulk Undo) করার ফাংশন
  const handleBulkRevert = async () => {
    const billedItemsToRevert = allItems.filter(
      (item) => selectedIds.includes(item._id) && item.isBilled,
    );

    if (billedItemsToRevert.length === 0) {
      return alert(
        "সিলেক্ট করা আইটেমগুলোর মধ্যে কোনো বিল্ড (Billed) আইটেম নেই!",
      );
    }

    if (
      !window.confirm(
        `আপনি কি নিশ্চিত? সিলেক্ট করা ${billedItemsToRevert.length}টি আইটেম ইনভয়েস থেকে বাদ পড়ে আবার আনবিল্ড হয়ে যাবে।`,
      )
    )
      return;

    setSubmitting(true);
    try {
      const promises = billedItemsToRevert.map((item) =>
        axios.post("/api/branches/revert-item", { itemId: item._id }),
      );

      await Promise.all(promises);

      alert("সিলেক্ট করা সব আইটেম সফলভাবে রিভার্ট করা হয়েছে!");
      fetchBranchData(activeMark);
      setSelectedIds([]);
    } catch (error) {
      console.error(error);
      alert("আইটেমগুলো রিভার্ট করতে সমস্যা হয়েছে!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditBilledItem = async (item) => {
    const newRate = prompt(
      "এই আইটেমের জন্য নতুন রেট দিন (৳):",
      item.rate || item.perKgRate,
    );
    if (newRate === null || newRate === "") return;

    const rateVal = parseFloat(newRate);
    if (isNaN(rateVal) || rateVal <= 0) return alert("সঠিক রেট ইনপুট দিন!");

    try {
      const newTotal = rateVal * item.calcWeight;
      const res = await axios.put(
        `/api/branches/update-billed-item/${item._id}`,
        {
          rate: rateVal,
          total: newTotal,
        },
      );
      if (res.data.success) {
        alert("রেট সফলভাবে আপডেট হয়েছে!");
        fetchBranchData(activeMark);
      }
    } catch (error) {
      alert("আপডেট করতে সমস্যা হয়েছে!");
    }
  };

  const handleOpeningBalance = async (amount, note) => {
    try {
      const res = await axios.post("/api/branches/manual-due", {
        shippingMark: activeMark,
        amount: parseFloat(amount),
        note: note || "Opening Balance",
      });

      if (res.data.success) {
        alert("বকেয়া সফলভাবে যুক্ত হয়েছে!");
        fetchBranchData(activeMark);
      }
    } catch (err) {
      alert("এন্ট্রি দিতে সমস্যা হয়েছে!");
    }
  };

  const handleGenerateInvoice = async () => {
    const itemsToBill = allItems.filter(
      (item) =>
        selectedIds.includes(item._id) && !item.isBilled && item.rate > 0,
    );
    if (itemsToBill.length === 0)
      return alert("নতুন কোনো আইটেমে রেট বসানো হয়নি!");

    setSubmitting(true);
    try {
      const tCost = parseFloat(transportCost) || 0;
      const dCost = parseFloat(discount) || 0;

      const payload = {
        shippingMark: activeMark,
        items: itemsToBill.map((item) => ({
          id: item._id,
          rate: item.rate,
          total: item.total,
        })),
        transportBill: tCost, // 🔥 ফিক্সড: ব্যাকএন্ডের expected নাম transportBill এ রিনেম করা হয়েছে
        discount: dCost,
        invoiceTotal: totalBillAmount - dCost + tCost,
      };

      const res = await axios.post("/api/branches/generate-invoice", payload);
      if (res.data.success) {
        setInvoiceData({
          invoiceId: res.data.invoiceId,
          date: new Date().toLocaleDateString("en-GB"),
          customerMark:
            summary?.shippingMarks && summary.shippingMarks.length > 0
              ? summary.shippingMarks.join(", ")
              : activeMark,
          items: itemsToBill,
          totalWeight: totalWeightSum,
          subTotal: totalBillAmount,
          discount: dCost,
          transportCost: tCost,
          netPayable: totalBillAmount - dCost + tCost,
          previousDue: currentDue || 0,
        });

        setIsInvoiceModalOpen(true);
        fetchBranchData(activeMark);
        setDiscount(0);
        setTransportCost(0);
      }
    } catch (error) {
      alert("ইনভয়েস তৈরিতে সমস্যা হয়েছে!");
    } finally {
      setSubmitting(false);
    }
  };

  const unbilledItems = allItems.filter((item) => !item.isBilled);
  const selectedUnbilledItems = unbilledItems.filter((item) =>
    selectedIds.includes(item._id),
  );

  const totalWeightSum = selectedUnbilledItems.reduce(
    (acc, item) => acc + item.calcWeight,
    0,
  );
  const totalBillAmount = selectedUnbilledItems.reduce(
    (acc, item) => acc + item.total,
    0,
  );

  const lifetimeBilled = summary?.totalBilled || 0;
  const lifetimePaid = summary?.totalPaid || 0;
  const lifetimeDiscount = summary?.totalDiscount || 0;
  const currentDue = summary?.currentDue || 0;

  return (
    <div className="profile-container">
      <div className="header-flex">
        <button className="back-btn" onClick={() => navigate("/branch/new")}>
          ⬅ Back
        </button>
        <h2
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            margin: 0,
          }}
        >
          Customer Profile:
          {summary?.shippingMarks && summary.shippingMarks.length > 0 ? (
            summary.shippingMarks.map((m, i) => (
              <span key={i} className="mark-tag">
                {m}
              </span>
            ))
          ) : (
            <span className="mark-tag">{activeMark}</span>
          )}
        </h2>
      </div>
      <div className="stats-grid">
        <div className="stat-card blue">
          <span>Total Billed Amount</span>
          <h3>৳ {lifetimeBilled.toLocaleString()}</h3>
        </div>
        <div className="stat-card green">
          <span>Total Paid</span>
          <h3>৳ {lifetimePaid.toLocaleString()}</h3>
        </div>
        <div className="stat-card orange">
          <span>Total Discount</span>
          <h3>৳ {lifetimeDiscount.toLocaleString()}</h3>
        </div>
        <div className={`stat-card ${currentDue > 0 ? "red" : "gray"}`}>
          <span>Current Due (বকেয়া)</span>
          <h3>৳ {currentDue.toLocaleString()}</h3>
        </div>

        <div
          className="action-bar"
          style={{ display: "flex", gap: "10px", margin: "20px 0" }}
        >
          <CanAccess module="branch" action="create">
            <button
              className="direct-entry-btn"
              onClick={() => setShowDirectEntry(!showDirectEntry)}
              style={{
                background: showDirectEntry ? "#ef4444" : "#3b82f6",
                color: "white",
                padding: "10px 15px",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              {showDirectEntry ? "✖ Close Direct Entry" : "📥 Add Direct Entry"}
            </button>
          </CanAccess>
        </div>
      </div>
      {showDirectEntry && (
        <div
          className="direct-entry-wrapper"
          style={{
            background: "#f8fafc",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            marginBottom: "20px",
          }}
        >
          <DirectBulkEntry
            fixedShippingMark={activeMark}
            onSuccess={() => {
              fetchBranchData(activeMark);
              setShowDirectEntry(false);
            }}
            onClose={() => setShowDirectEntry(false)}
          />
        </div>
      )}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => handleTabChange("pending")}
        >
          📦 All Shipments / Billing
        </button>
        <button
          className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => handleTabChange("history")}
        >
          📜 Invoice History
        </button>

        {/* 🔥 নতুন 3rd Tab বাটন */}
        <button
          className={`tab-btn ${activeTab === "ledger" ? "active" : ""}`}
          onClick={() => handleTabChange("ledger")}
        >
          💳 Statement / Ledger
        </button>
      </div>
      {activeTab === "pending" && (
        <div className="tab-content">
          <div className="controls-bar">
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="filter-input"
                style={{ width: "200px", fontWeight: "bold" }}
              >
                <option value="">📦 All Batches</option>
                {uniqueBatches.map((batch) => (
                  <option key={batch} value={batch}>
                    Batch: {batch}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Search (Name/Tracking)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="bulk-side" style={{ display: "flex", gap: "10px" }}>
              <input
                type="number"
                placeholder="Rate (৳)"
                value={globalRate}
                onChange={(e) => setGlobalRate(e.target.value)}
              />
              <button onClick={applyRateToSelected}>
                ⚡ Apply to Selected
              </button>

              {/* 🔥 Bulk Undo Button */}
              {allItems.some(
                (item) => selectedIds.includes(item._id) && item.isBilled,
              ) && (
                <button
                  onClick={handleBulkRevert}
                  disabled={submitting}
                  style={{
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    padding: "0 15px",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    transition: "0.2s",
                  }}
                  onMouseOver={(e) => (e.target.style.background = "#b91c1c")}
                  onMouseOut={(e) => (e.target.style.background = "#dc2626")}
                >
                  {submitting ? "Undoing..." : "↩️ Bulk Undo"}
                </button>
              )}
            </div>
          </div>

          <div className="table-card">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={
                        selectedIds.length ===
                          filteredItems.filter((i) => !i.isBilled).length &&
                        selectedIds.length > 0
                      }
                    />
                  </th>
                  <th>SL</th>
                  <th>Product Name</th>

                  <th>Tracking(CN)</th>
                  <th>Shiping Mark</th>
                  <th>Carton No</th>
                  <th>Weight</th>
                  <th>Status</th>
                  <th>Rate (৳)</th>
                  <th>Total (৳)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, idx) => {
                    const isCompleted = item.isBilled;
                    const isManual = !item.batch && !item.batchId;

                    return (
                      <tr
                        key={item._id}
                        className={`
                          ${selectedIds.includes(item._id) ? "row-selected" : ""}
                          ${isCompleted ? "billed-row-style" : ""}
                          ${isManual ? "row-manual" : ""} 
                        `}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item._id)}
                            onChange={() => toggleSelect(item._id)}
                            disabled={isCompleted}
                          />
                        </td>
                        <td>{idx + 1}</td>
                        <td>
                          {item.productName}
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#666",
                              marginTop: "2px",
                            }}
                          >
                            Qty: {item.quantity}
                          </div>

                          {item.batchName && (
                            <div
                              style={{
                                fontSize: "10px",
                                color: "#8b5cf6",
                                marginTop: "4px",
                                fontWeight: "bold",
                              }}
                            >
                              📦 {item.batchName}
                            </div>
                          )}
                          {isManual && (
                            <div style={{ marginTop: "4px" }}>
                              <span className="badge-manual">MANUAL</span>
                            </div>
                          )}
                          {isCompleted && (
                            <span
                              className="status-badge"
                              style={{ marginLeft: 0, marginTop: "4px" }}
                            >
                              ✅ Billed ({item.invoiceId})
                            </span>
                          )}
                        </td>
                        <td>
                          <small>{item.chinaTrackingNo}</small>
                        </td>
                        <td>{item.shippingMark} </td>
                        <td>{item.cartonNo} </td>
                        <td>{item.calcWeight.toFixed(2)} KG</td>
                        <td>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              backgroundColor:
                                item.status === "Delivered"
                                  ? "#dcfce7"
                                  : "#e0f2fe",
                              color:
                                item.status === "Delivered"
                                  ? "#15803d"
                                  : "#0369a1",
                              textTransform: "uppercase",
                            }}
                          >
                            {item.status || "Arrived"}
                          </span>
                        </td>
                        <td>
                          {isCompleted ? (
                            <span className="locked-val">
                              {item.rate || item.perKgRate} ৳
                            </span>
                          ) : (
                            <input
                              type="number"
                              className="inline-rate"
                              value={item.rate || ""}
                              onChange={(e) =>
                                handleRateChange(idx, e.target.value)
                              }
                            />
                          )}
                        </td>
                        <td className="row-total">
                          ৳{" "}
                          {isCompleted
                            ? item.totalBill?.toLocaleString() || 0
                            : item.total.toLocaleString()}
                        </td>
                        <td>
                          {isCompleted ? (
                            <div className="action-group">
                              <CanAccess module="branch" action="edit">
                                <button
                                  className="edit-mini-btn"
                                  onClick={() => handleEditBilledItem(item)}
                                >
                                  ✏️ Edit
                                </button>
                              </CanAccess>
                              <CanAccess module="billing" action="revert">
                                <button
                                  className="undo-mini-btn"
                                  onClick={() => handleRevertItem(item._id)}
                                >
                                  ↩️ Undo
                                </button>
                              </CanAccess>
                            </div>
                          ) : isManual ? (
                            <div className="manual-actions">
                              <CanAccess module="shipment" action="edit">
                                <button
                                  className="btn-mini-edit"
                                  onClick={() => handleEditManualShipment(item)}
                                  title="Edit Manual Entry"
                                >
                                  ✏️
                                </button>
                              </CanAccess>
                              <CanAccess module="shipment" action="delete">
                                <button
                                  className="btn-mini-delete"
                                  onClick={() =>
                                    handleDeleteManualShipment(item._id)
                                  }
                                  title="Delete Manual Entry"
                                >
                                  🗑️
                                </button>
                              </CanAccess>
                            </div>
                          ) : (
                            <span
                              style={{ fontSize: "12px", color: "#64748b" }}
                            >
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="11" className="no-data">
                      কোনো আইটেম নেই
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {unbilledItems.length > 0 && (
            <div className="billing-footer-card">
              <div className="f-row">
                <span>Unbilled Items:</span>
                <strong>{selectedUnbilledItems.length} PCS</strong>
              </div>
              <div className="f-row">
                <span>Unbilled Sub-Total:</span>
                <strong>৳ {totalBillAmount.toLocaleString()}</strong>
              </div>
              <div className="f-row">
                <span>Transport/Other Cost:</span>
                <input
                  type="number"
                  value={transportCost}
                  onChange={(e) => setTransportCost(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="f-row">
                <span>Discount:</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="f-row grand">
                <span>Current Payable:</span>
                <h3>
                  ৳{" "}
                  {(
                    totalBillAmount -
                    (parseFloat(discount) || 0) +
                    (parseFloat(transportCost) || 0)
                  ).toLocaleString()}
                </h3>
              </div>
              <CanAccess module="billing" action="create">
                <button
                  className="main-invoice-btn"
                  onClick={handleGenerateInvoice}
                  disabled={submitting}
                >
                  {submitting
                    ? "Processing..."
                    : "📄 Confirm & Generate Invoice"}
                </button>
              </CanAccess>
            </div>
          )}
        </div>
      )}
      {/* ================= HISTORY TAB ================= */}

      {activeTab === "history" && (
        <InvoiceHistory
          historyData={invoiceHistory}
          filteredHistory={filteredHistory}
          invoiceSearchTerm={invoiceSearchTerm}
          setInvoiceSearchTerm={setInvoiceSearchTerm}
          selectedBatch={selectedBatch}
          setSelectedBatch={setSelectedBatch}
          uniqueBatches={uniqueBatches}
          onViewInvoice={(inv) => {
            // এখানে আগেকার সেই লজিকটি বসবে যা মডালের জন্য ডাটা সেট করে
            const subTotal = inv.totalAmount;
            const discountAmt = inv.discount || 0;
            const transportAmt = inv.transportBill || 0;
            const finalTotal = subTotal + transportAmt - discountAmt;

            setInvoiceData({
              invoiceId: inv._id,
              date: new Date(inv.date).toLocaleDateString("en-GB"),
              customerMark: activeMark,
              items: inv.items.map((it) => ({
                ...it,
                calcWeight:
                  Number(it.actualWeight) || Number(it.grossWeight) || 0,
                rate: it.perKgRate,
                total: it.totalBill,
              })),
              totalWeight: inv.totalWeight,
              subTotal: subTotal,
              discount: discountAmt,
              transportCost: transportAmt,
              netPayable: finalTotal,
            });
            setIsInvoiceModalOpen(true);
          }}
        />
      )}

      {/* ================= LEDGER TAB ================= */}
      {activeTab === "ledger" && (
        <PaymentLedger
          activeMark={activeMark}
          summary={summary}
          invoiceHistory={invoiceHistory}
        />
      )}
      {/* ✅ একদম নিচে থাকা পুরানো বিশাল কোডটি সরিয়ে শুধু এই লাইনটি বসান */}
      <InvoicePrintModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        invoiceData={invoiceData}
        summary={summary}
      />
    </div>
  );
}
