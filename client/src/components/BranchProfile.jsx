//src/components/BranchProfile.jsx

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./BranchProfile.css"; // Assuming you have a CSS file for styling

export default function BranchProfile() {
  const [searchParams] = useSearchParams();
  const markFromUrl = searchParams.get("mark");
  const navigate = useNavigate();

  // Basic States
  const [activeMark, setActiveMark] = useState("");
  const [summary, setSummary] = useState(null);
  const [allItems, setAllItems] = useState([]); // pendingItems এর বদলে allItems
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Tab & History States
  const [activeTab, setActiveTab] = useState("pending");
  const [invoiceHistory, setInvoiceHistory] = useState([]);

  // Pending Actions States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatch, setSelectedBatch] = useState(""); // ✅ ব্যাচ ফিল্টার করার জন্য স্টেট
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState(""); // ✅ ইনভয়েস হিস্ট্রি ফিল্টার করার জন্য স্টেট
  const [selectedIds, setSelectedIds] = useState([]);
  const [globalRate, setGlobalRate] = useState("");
  const [discount, setDiscount] = useState(0);

  // Modal States
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  useEffect(() => {
    if (markFromUrl) {
      fetchBranchData(markFromUrl);
    }
  }, [markFromUrl]);

  // Fetch Summary and All Items (Billed + Unbilled)
  const fetchBranchData = async (mark) => {
    setLoading(true);
    try {
      // শুধু এই একটি এপিআই কল করলেই summary এর ভেতর billed, paid, due সব চলে আসবে
      const summaryRes = await axios.get(`/api/branches/summary/${mark}`);
      const itemsRes = await axios.get(`/api/branches/all-items/${mark}`);

      setSummary(summaryRes.data.summary); // ব্যাকএন্ড থেকে আসা সম্পূর্ণ সামারি সেভ

      const itemsWithRate = itemsRes.data.items.map((item) => ({
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
        `/api/branches/invoice-history/${activeMark}`,
      );
      if (res.data.success) {
        setInvoiceHistory(res.data.history);
      }
    } catch (error) {
      console.error("History fetch error", error);
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

  // ✅ ডাইনামিকভাবে ব্যাচের আসল নাম বের করা
  const uniqueBatches = useMemo(() => {
    const batches = allItems.map((item) => {
      // populate হয়ে আসলে এখান থেকে নামটা নেবে
      if (item.batchId && item.batchId.batchName) return item.batchId.batchName;
      if (item.batch && item.batch.batchName) return item.batch.batchName;

      // যদি populate না হয় বা সরাসরি আইডি/স্ট্রিং থাকে
      return item.batchName || item.batchId || item.batch;
    });
    return [...new Set(batches)].filter(Boolean); // ফাঁকা ডাটা রিমুভ করবে
  }, [allItems]);

  // ✅ ফিল্টার লজিক
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // আইটেমের ব্যাচ নাম সঠিকভাবে ধরা
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

  // ✅ ৩. ইনভয়েস হিস্ট্রি ফিল্টার করা (Batch, Invoice ID বা Tracking Number দিয়ে)
  const filteredHistory = useMemo(() => {
    return invoiceHistory.filter((inv) => {
      // ১. ব্যাচ ফিল্টার: চেক করা হচ্ছে ইনভয়েসের ভেতরের কোনো আইটেম সিলেক্টেড ব্যাচের কি না
      let batchMatch = true;
      if (selectedBatch) {
        batchMatch = inv.items.some((item) => {
          let itemBatch = "";
          // populate হয়ে আসলে অবজেক্ট থেকে নাম নেবে, নাহলে সরাসরি ফিল্ড থেকে নেবে
          if (item.batchId && item.batchId.batchName)
            itemBatch = item.batchId.batchName;
          else if (item.batch && item.batch.batchName)
            itemBatch = item.batch.batchName;
          else itemBatch = item.batchName || item.batchId || item.batch;

          return itemBatch === selectedBatch;
        });
      }

      // ২. টেক্সট সার্চ ফিল্টার: Invoice ID বা Tracking Number
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

      // দুটো শর্ত (ব্যাচ এবং সার্চ) পূরণ হলেই ইনভয়েসটি দেখাবে
      return batchMatch && searchMatch;
    });
  }, [invoiceHistory, invoiceSearchTerm, selectedBatch]); // ⚠️ selectedBatch ডিপেন্ডেন্সিতে যোগ করা হয়েছে

  // Checkbox Selection (Only for unbilled items)
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    const unbilledFiltered = filteredItems.filter((item) => !item.isBilled);
    if (
      selectedIds.length === unbilledFiltered.length &&
      unbilledFiltered.length > 0
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unbilledFiltered.map((item) => item._id));
    }
  };

  // Rate Calculations (Only apply to Unbilled)
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

  // Revert (Undo) a billed item
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
        fetchBranchData(activeMark); // ডেটা রিফ্রেশ
      }
    } catch (error) {
      alert("রিভার্ট করতে সমস্যা হয়েছে!");
    }
  };

  // Edit a billed item
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

  // Generate Invoice
  const handleGenerateInvoice = async () => {
    const itemsToBill = allItems.filter(
      (item) =>
        selectedIds.includes(item._id) && !item.isBilled && item.rate > 0,
    );
    if (itemsToBill.length === 0)
      return alert("নতুন কোনো আইটেমে রেট বসানো হয়নি!");

    setSubmitting(true);
    try {
      const payload = {
        shippingMark: activeMark,
        items: itemsToBill.map((item) => ({
          id: item._id,
          rate: item.rate,
          total: item.total,
        })),
        invoiceTotal: totalBillAmount - discount,
        discount: discount,
      };

      const res = await axios.post("/api/branches/generate-invoice", payload);
      if (res.data.success) {
        setInvoiceData({
          invoiceId: res.data.invoiceId,
          date: new Date().toLocaleDateString("en-GB"),
          customerMark: activeMark,
          items: itemsToBill,
          totalWeight: totalWeightSum,
          subTotal: totalBillAmount,
          discount: discount,
          netPayable: totalBillAmount - discount,
        });

        setIsInvoiceModalOpen(true);
        fetchBranchData(activeMark);
        setDiscount(0);
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
        <h2>
          Customer Profile: <span className="mark-tag">{activeMark}</span>
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
      </div>

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
      </div>

      {activeTab === "pending" && (
        <div className="tab-content">
          <div className="controls-bar">
            {/* ✅ ব্যাচ ড্রপডাউন এবং সার্চ বক্স */}
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

            <div className="bulk-side">
              <input
                type="number"
                placeholder="Rate (৳)"
                value={globalRate}
                onChange={(e) => setGlobalRate(e.target.value)}
              />
              <button onClick={applyRateToSelected}>
                ⚡ Apply to Selected
              </button>
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
                  <th>Tracking/Carton</th>
                  <th>Weight</th>
                  <th>Rate (৳)</th>
                  <th>Total (৳)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, idx) => {
                    const isCompleted = item.isBilled;
                    return (
                      <tr
                        key={item._id}
                        className={`
                          ${selectedIds.includes(item._id) ? "row-selected" : ""}
                          ${isCompleted ? "billed-row-style" : ""}
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
                          {/* ✅ ব্যাচ ব্যাজ */}
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
                        <td>{item.calcWeight.toFixed(2)} KG</td>

                        {/* Rate Column */}
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

                        {/* Action Column */}
                        <td>
                          {isCompleted ? (
                            <div className="action-group">
                              <button
                                className="edit-mini-btn"
                                onClick={() => handleEditBilledItem(item)}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                className="undo-mini-btn"
                                onClick={() => handleRevertItem(item._id)}
                              >
                                ↩️ Undo
                              </button>
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
                    <td colSpan="8" className="no-data">
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
                <span>Discount:</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              <div className="f-row grand">
                <span>Current Payable:</span>
                <h3>৳ {(totalBillAmount - discount).toLocaleString()}</h3>
              </div>
              <button
                className="main-invoice-btn"
                onClick={handleGenerateInvoice}
                disabled={submitting}
              >
                {submitting ? "Processing..." : "📄 Confirm & Generate Invoice"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= HISTORY TAB ================= */}
      {activeTab === "history" && (
        <div className="tab-content">
          {/* ✅ ইনভয়েস হিস্ট্রি সার্চ বার এবং ব্যাচ ফিল্টার */}
          <div
            className="controls-bar"
            style={{ marginBottom: "20px", display: "flex", gap: "15px" }}
          >
            {/* ✅ হিস্ট্রির জন্য ব্যাচ ড্রপডাউন */}
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="filter-input"
              style={{ width: "220px", fontWeight: "bold" }}
            >
              <option value="">📦 All Batches</option>
              {uniqueBatches.map((batch) => (
                <option key={batch} value={batch}>
                  Batch: {batch}
                </option>
              ))}
            </select>

            {/* টেক্সট সার্চ */}
            <input
              type="text"
              placeholder="Search by Invoice ID or Tracking No..."
              value={invoiceSearchTerm}
              onChange={(e) => setInvoiceSearchTerm(e.target.value)}
              className="filter-input"
              style={{ width: "100%", maxWidth: "400px" }}
            />
          </div>

          <div className="table-card">
            <table className="pro-table history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice ID</th>
                  <th>Total Items</th>
                  <th>Total Weight</th>
                  <th>Total Billed</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((inv) => (
                    <tr key={inv._id}>
                      <td>{new Date(inv.date).toLocaleDateString("en-GB")}</td>
                      <td>
                        <strong>{inv._id}</strong>
                      </td>
                      <td>{inv.items.length} PCS</td>
                      <td>{inv.totalWeight.toFixed(2)} KG</td>
                      <td className="row-total">
                        ৳ {inv.totalAmount.toLocaleString()}
                      </td>
                      <td>
                        <button
                          className="view-btn"
                          onClick={() => {
                            setInvoiceData({
                              invoiceId: inv._id,
                              date: new Date(inv.date).toLocaleDateString(
                                "en-GB",
                              ),
                              customerMark: activeMark,
                              items: inv.items.map((it) => ({
                                ...it,
                                calcWeight:
                                  Number(it.actualWeight) ||
                                  Number(it.grossWeight) ||
                                  0,
                                rate: it.perKgRate,
                                total: it.totalBill,
                              })),
                              totalWeight: inv.totalWeight,
                              subTotal: inv.totalAmount,
                              discount: 0,
                              netPayable: inv.totalAmount,
                            });
                            setIsInvoiceModalOpen(true);
                          }}
                        >
                          👁️ View Memo
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="no-data">
                      কোনো ইনভয়েস হিস্ট্রি পাওয়া যায়নি
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* ✅ Invoice View / Print Modal */}
      {isInvoiceModalOpen && invoiceData && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div id="print-area" className="invoice-box">
              <div
                style={{
                  textAlign: "center",
                  marginBottom: "20px",
                  borderBottom: "2px solid #000",
                  paddingBottom: "10px",
                }}
              >
                <h1 style={{ margin: "0", fontSize: "24px" }}>
                  SABA & RIHAN ENTERPRISE
                </h1>
                <p style={{ margin: "5px 0", fontSize: "14px" }}>
                  GOVT.AUTHORISED CUSTOMS, CLEARING & FORWARDING (C&F) AGENT
                </p>
                <h2 style={{ fontSize: "18px", textDecoration: "underline" }}>
                  INVOICE / MEMO
                </h2>
              </div>

              <div className="inv-meta">
                <div>
                  <p>
                    <strong>Invoice No:</strong> {invoiceData.invoiceId}
                  </p>
                  <p>
                    <strong>Date:</strong> {invoiceData.date}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p>
                    <strong>Customer / Mark:</strong>{" "}
                    <span
                      style={{
                        background: "#e2e8f0",
                        padding: "4px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      {invoiceData.customerMark}
                    </span>
                  </p>
                </div>
              </div>

              <table className="inv-table">
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th>Item Description</th>
                    <th>Weight</th>
                    <th>Rate</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.items.map((it, i) => (
                    <tr key={i}>
                      <td>
                        {it.productName || "General Item"}
                        {/* প্রিন্ট মেমোতেও ব্যাচ নাম দেখালে ভালো হয় */}
                        {it.batchName && (
                          <div style={{ fontSize: "11px", color: "#666" }}>
                            Batch: {it.batchName}
                          </div>
                        )}
                      </td>
                      <td>{it.calcWeight.toFixed(2)} KG</td>
                      <td>{it.rate} ৳</td>
                      <td>{it.total.toLocaleString()} ৳</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="inv-summary">
                <p>
                  Total Weight:{" "}
                  <strong>{invoiceData.totalWeight.toFixed(2)} KG</strong>
                </p>
                <p>
                  Subtotal:{" "}
                  <strong>{invoiceData.subTotal.toLocaleString()} ৳</strong>
                </p>
                {invoiceData.discount > 0 && (
                  <p style={{ color: "red" }}>
                    Discount:{" "}
                    <strong>- {invoiceData.discount.toLocaleString()} ৳</strong>
                  </p>
                )}
                <h3 style={{ borderTop: "2px solid #000", paddingTop: "10px" }}>
                  Net Payable: {invoiceData.netPayable.toLocaleString()} ৳
                </h3>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "60px",
                  fontSize: "14px",
                }}
              >
                <div
                  style={{
                    borderTop: "1px dashed #000",
                    width: "150px",
                    textAlign: "center",
                    paddingTop: "5px",
                  }}
                >
                  Customer Signature
                </div>
                <div
                  style={{
                    borderTop: "1px dashed #000",
                    width: "150px",
                    textAlign: "center",
                    paddingTop: "5px",
                  }}
                >
                  Authority Signature
                </div>
              </div>
            </div>

            <div className="modal-btns">
              <button onClick={() => window.print()} className="print-btn">
                🖨️ Print Memo
              </button>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="close-btn"
              >
                ✖ Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
