//src/components/BranchProfile.jsx

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./BranchProfile.css";
import CanAccess from "./CanAccess";
import DirectBulkEntry from "./DirectBulkEntry";
import EditShipmentModal from "./EditShipmentModal";

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
  const [transportCost, setTransportCost] = useState(0); // 🔥 নতুন স্টেট
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
      // 🔥 এখানে encodeURIComponent যুক্ত করা হয়েছে
      const summaryRes = await axios.get(
        `/api/branches/summary/${encodeURIComponent(mark)}`,
      );
      const itemsRes = await axios.get(
        `/api/branches/all-items/${encodeURIComponent(mark)}`,
      );

      setSummary(summaryRes.data.summary);

      // 🔥 স্মার্ট ফিল্টার: শুধু দেশে পৌঁছানো মালগুলো ফিল্টার করা হচ্ছে
      // "Warehouse Received" এবং "In-Transit" বাদে বাকি সব (Arrived থেকে Delivered পর্যন্ত) দেখাবে
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
      // 🔥 এখানে encodeURIComponent যুক্ত করা হয়েছে
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

  // 🔥 ম্যানুয়াল শিপমেন্ট এডিট করার ফাংশন
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
        fetchBranchData(activeMark); // ডাটা রিফ্রেশ
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

  // ✅ ডাইনামিকভাবে ব্যাচের আসল নাম বের করা
  const uniqueBatches = useMemo(() => {
    const batches = allItems.map((item) => {
      if (item.batchId && item.batchId.batchName) return item.batchId.batchName;
      if (item.batch && item.batch.batchName) return item.batch.batchName;
      return item.batchName || item.batchId || item.batch;
    });
    return [...new Set(batches)].filter(Boolean);
  }, [allItems]);

  // ✅ ফিল্টার লজিক
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

  // ✅ ইনভয়েস হিস্ট্রি ফিল্টার করা
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
  // 🔥 রিভার্ট ফাংশন: বিল করা আইটেমকে আবার আনবিল্ড করা
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
  // 🔥 বিল করা আইটেমের রেট এডিট করার ফাংশন
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
  // 🔥 পূর্বের বকেয়া এন্ট্রি করার ফাংশন
  const handleOpeningBalance = async (amount, note) => {
    try {
      const res = await axios.post("/api/branches/manual-due", {
        shippingMark: activeMark,
        amount: parseFloat(amount),
        note: note || "Opening Balance",
      });

      if (res.data.success) {
        alert("বকেয়া সফলভাবে যুক্ত হয়েছে!");
        fetchBranchData(activeMark); // ডাটা রিফ্রেশ করবে
      }
    } catch (err) {
      alert("এন্ট্রি দিতে সমস্যা হয়েছে!");
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
      const tCost = parseFloat(transportCost) || 0; // ট্রান্সপোর্ট খরচ
      const dCost = parseFloat(discount) || 0; // ডিসকাউন্ট

      const payload = {
        shippingMark: activeMark,
        items: itemsToBill.map((item) => ({
          id: item._id,
          rate: item.rate,
          total: item.total,
        })),
        transportCost: tCost, // 🔥 ব্যাকএন্ডে পাঠাচ্ছি
        discount: dCost,
        invoiceTotal: totalBillAmount - dCost + tCost, // 🔥 নতুন টোটাল
      };

      const res = await axios.post("/api/branches/generate-invoice", payload);
      if (res.data.success) {
        setInvoiceData({
          invoiceId: res.data.invoiceId,
          date: new Date().toLocaleDateString("en-GB"),
          // 🔥 ইনভয়েসে সবগুলো মার্ক কমা দিয়ে দেখাবে
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
        setTransportCost(0); // সাবমিট শেষে জিরো করে দিলাম
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

  // টাকাকে কথায় (Words) রূপান্তর করার ফাংশন
  const numberToWords = (num) => {
    if (num === 0) return "Zero Taka Only";
    const a = [
      "",
      "One ",
      "Two ",
      "Three ",
      "Four ",
      "Five ",
      "Six ",
      "Seven ",
      "Eight ",
      "Nine ",
      "Ten ",
      "Eleven ",
      "Twelve ",
      "Thirteen ",
      "Fourteen ",
      "Fifteen ",
      "Sixteen ",
      "Seventeen ",
      "Eighteen ",
      "Nineteen ",
    ];
    const b = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    if ((num = num.toString()).length > 9) return "Overflow";
    const n = ("000000000" + num)
      .substr(-9)
      .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return;
    let str = "";
    str +=
      n[1] != 0
        ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + "Crore "
        : "";
    str +=
      n[2] != 0
        ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + "Lakh "
        : "";
    str +=
      n[3] != 0
        ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + "Thousand "
        : "";
    str +=
      n[4] != 0
        ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + "Hundred "
        : "";
    str +=
      n[5] != 0
        ? (str != "" ? "and " : "") +
          (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]])
        : "";
    return str.trim() + " Taka Only";
  };

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
          {/* 🔥 একাধিক মার্ক থাকলে সবগুলো ব্যাজ হিসেবে দেখাবে */}
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
          {/* শুধুমাত্র shipment তৈরি করার ক্ষমতা থাকলে এই বাটন দেখবে */}
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

      {/* ডাইরেক্ট এন্ট্রি টেবিল */}
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
            fixedShippingMark={activeMark} // ব্রাঞ্চের শিপিং মার্ক পাস করে দিচ্ছি
            onSuccess={() => {
              fetchBranchData(activeMark); // সেভ হওয়ার পর প্রোফাইল রিফ্রেশ হবে
              setShowDirectEntry(false); // টেবিল বন্ধ হয়ে যাবে
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
                  {/* 🔥 নতুন স্ট্যাটাস কলাম */}
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
                    const isManual = !item.batch && !item.batchId; // 🔥 ব্যাচ না থাকলে এটি ম্যানুয়াল

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

                          {/* 🔥 ম্যানুয়াল ব্যাজ */}
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
                        <td>{item.calcWeight.toFixed(2)} KG</td>

                        {/* স্ট্যাটাস ব্যাজ */}
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
                          {/* 🔥 অ্যাকশন বাটন লজিক */}
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
                            // /* 🔥 ম্যানুয়াল এন্ট্রি হলে স্পেশাল এডিট/ডিলিট বাটন দেখাবে */ shipment module
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
                            /* সাধারণ ব্যাচ আইটেমের ক্ষেত্রে */
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
                    <td colSpan="9" className="no-data">
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
              {/* 🔥 নতুন ট্রান্সপোর্ট খরচ ইনপুট */}
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
        <div className="tab-content">
          <div
            className="controls-bar"
            style={{ marginBottom: "20px", display: "flex", gap: "15px" }}
          >
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
                              subTotal: inv.totalAmount, // ব্যাকএন্ডে ডিসকাউন্ট/ট্রান্সপোর্ট সেভ থাকলে সেটা আসবে
                              discount: inv.discount || 0,
                              transportCost: inv.transportCost || 0,
                              netPayable: inv.totalAmount,
                            });
                            setIsInvoiceModalOpen(true);
                          }}
                        >
                          👁️ View Invoice
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

      {/* ✅ Professional Invoice View / Print Modal */}
      {isInvoiceModalOpen && invoiceData && (
        <div className="modal-overlay">
          <div className="modal-content pro-modal-width">
            <div id="print-area" className="pro-invoice-wrapper">
              {/* 🌟 Header Section with Gradient & Logo Placeholder */}
              {/* 🌟 Header Section with Gradient & Logo Image */}
              <div className="pro-inv-header">
                <div className="pro-logo-container">
                  {/* আপনার লোগো ফাইলটি public ফোল্ডারে রেখে এখানে ফাইলের নাম দিন */}
                  <img
                    src="/SABA_&_RIHAN_LOGO.jpeg"
                    alt="Company Logo"
                    className="pro-main-logo"
                    onError={(e) => {
                      // যদি ছবি খুঁজে না পায় তবে যেন ভেঙে না যায়
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                  {/* ছবি লোড না হলে নিচের বক্সটি দেখাবে */}
                  <div
                    className="pro-logo-placeholder"
                    style={{ display: "none" }}
                  >
                    <span>LOGO</span>
                  </div>
                </div>

                <div className="pro-company-details">
                  <h1 className="gradient-company-name">
                    SABA & RIHAN ENTERPRISE
                  </h1>
                  <p className="pro-tagline">
                    GOVT. AUTHORISED CUSTOMS, CLEARING & FORWARDING (C&F) AGENT
                  </p>
                  <p className="pro-address">
                    Door to Door (Cargo) • China • Hongkong • Dubai • Malaysia
                  </p>
                </div>
              </div>

              <div className="pro-inv-title-bar">
                <h2>COMMERCIAL INVOICE</h2>
              </div>

              {/* 👤 Customer & Invoice Meta Info */}
              {/* 🔥 Billed To এবং Date/Invoice No সেকশন */}
              <div className="pro-invoice-meta">
                {/* বাম পাশ: কাস্টমার ইনফো */}
                <div className="pro-bill-to">
                  <h4 className="info-title">BILLED TO:</h4>
                  <table className="info-table">
                    <tbody>
                      <tr>
                        <td className="lbl">Shipping Mark</td>
                        <td>
                          : <strong>{invoiceData.customerMark}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td className="lbl">Customer Name</td>
                        <td>
                          :
                          <strong
                            contentEditable
                            suppressContentEditableWarning
                            className="editable-print-text"
                          >
                            {summary?.branchName || "Enter Name"}
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td className="lbl">Phone Number</td>
                        <td>
                          :
                          <strong
                            contentEditable
                            suppressContentEditableWarning
                            className="editable-print-text"
                          >
                            {summary?.phone || "Enter Phone"}
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td className="lbl">Address</td>
                        <td>
                          :
                          <strong
                            contentEditable
                            suppressContentEditableWarning
                            className="editable-print-text"
                          >
                            {summary?.address || "Enter Address"}
                          </strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ডান পাশ: ইনভয়েস ইনফো (Date & Invoice No) */}
                <div className="pro-date-info">
                  <table className="info-table">
                    <tbody>
                      <tr>
                        <td className="lbl">Invoice No</td>
                        <td>
                          :{" "}
                          <strong>
                            {invoiceData.invoiceId ||
                              `INV-${Date.now().toString().slice(-6)}`}
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td className="lbl">Date</td>
                        <td>
                          :{" "}
                          <strong>
                            {invoiceData.date ||
                              new Date().toLocaleDateString("en-GB")}
                          </strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              {/* 📦 Invoice Items Table */}
              <table className="pro-item-table">
                <thead>
                  <tr>
                    <th width="5%">SL</th>
                    <th width="45%">Description of Goods</th>
                    <th width="15%">Weight (KG)</th>
                    <th width="15%">Rate (৳)</th>
                    <th width="20%">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.items.map((it, i) => (
                    <tr key={i}>
                      <td className="center">{i + 1}</td>
                      <td>
                        <strong className="item-name">
                          {it.productName || "General Cargo Item"}
                        </strong>
                        <div className="item-meta">
                          {it.batchName && (
                            <span className="batch-pill">
                              Batch: {it.batchName}
                            </span>
                          )}
                          {it.chinaTrackingNo && (
                            <span className="trk-text">
                              Trk: {it.chinaTrackingNo}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="center">{it.calcWeight.toFixed(2)}</td>
                      <td className="center">{it.rate}</td>
                      <td className="right">৳ {it.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 💰 Calculations & Amount in Words */}
              <div className="pro-calc-section">
                <div className="amount-in-words">
                  <p>
                    <strong>Amount in Words:</strong>
                  </p>
                  <p className="words-text">
                    {/* 🔥 এখন শুধু netPayable কে কথায় কনভার্ট করবে */}
                    {typeof numberToWords === "function"
                      ? numberToWords(invoiceData.netPayable || 0)
                      : "Total amount in words will appear here."}
                  </p>
                </div>

                <div className="pro-totals">
                  <table className="totals-table">
                    <tbody>
                      <tr>
                        <td>Subtotal</td>
                        <td className="right">
                          ৳ {invoiceData.subTotal.toLocaleString()}
                        </td>
                      </tr>

                      {invoiceData.discount > 0 && (
                        <tr className="text-red">
                          <td>Discount</td>
                          <td className="right">
                            - ৳ {invoiceData.discount.toLocaleString()}
                          </td>
                        </tr>
                      )}

                      {invoiceData.transportCost > 0 && (
                        <tr>
                          <td>Transport / Other Cost</td>
                          <td className="right">
                            + ৳{" "}
                            {(invoiceData.transportCost || 0).toLocaleString()}
                          </td>
                        </tr>
                      )}

                      {/* 🔥 Previous Due এর রো পুরোপুরি বাদ দেওয়া হয়েছে */}

                      <tr className="grand-total-row">
                        <td>Grand Total</td>
                        <td className="right">
                          ৳ {(invoiceData.netPayable || 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 🏦 Bank & Payment Information */}
              <div className="pro-bank-info">
                <h4>Payment Information</h4>
                <div className="bank-grid">
                  <div className="bank-card">
                    <strong>Dutch Bangla Bank</strong>
                    <p>A/C Name: SABA AND RIHAN ENTERPRISE</p>
                    <p>A/C No: 2021100054999</p>
                    <p>Branch: Hazicamp, Askona</p>
                  </div>
                  <div className="bank-card">
                    <strong>BRAC Bank</strong>
                    <p>A/C Name: SABA AND RIHAN ENTER PRISE</p>
                    <p>A/C No: 2077416900001</p>
                    <p>Branch: Dakshin Khan Sub Br.</p>
                  </div>
                  <div className="bank-card">
                    <strong>Southeast Bank PLC</strong>
                    <p>A/C Name: SABA AND RIHAN ENTERPRIS</p>
                    <p>A/C No: 003011100006291</p>
                    <p>Branch: Aganagor</p>
                  </div>
                </div>
              </div>

              {/* ✍️ Signatures */}
              {/* <div className="pro-signatures">
                <div className="sig-line">Customer Signature</div>
                <div className="sig-line">Authorised Signature</div>
              </div> */}
              {/* ⚠️ Warning Note with Tiro Bangla Font */}
              <div className="invoice-warning-note">
                <span className="warning-icon">⚠️</span>
                <span>
                  <strong>সতর্কতা:</strong> বাংলাদেশের ওয়ারহাউজে পণ্য আসার ৭ দিন পর কোনো প্রকার ক্ষয়ক্ষতি বা নিরাপত্তার দায় কর্তৃপক্ষ বহন করবে না। 
                </span>
              </div>

              <div className="pro-footer-note">
                Thank you for your business! Goods once sold will not be taken
                back.
              </div>
            </div>

            {/* 🖨️ Modal Actions */}
            <div className="modal-btns no-print">
              <button onClick={() => window.print()} className="print-btn">
                🖨️ Print Invoice
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
