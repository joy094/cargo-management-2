//src/components/PaymentAllocation.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import CanAccess from "./CanAccess";
export default function PaymentAllocation() {
  const [searchParams] = useSearchParams();
  const urlMark = searchParams.get("mark");

  // States
  const [allBranches, setAllBranches] = useState([]);
  const [activeMark, setActiveMark] = useState(urlMark || "");
  const [totalBilled, setTotalBilled] = useState(0);
  const [ledgerHistory, setLedgerHistory] = useState([]);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    amount: "",
    type: "PAYMENT",
    paymentMethod: "CASH",
    transactionId: "",
    allocatedInvoice: "",
    remarks: "",
  });

  useEffect(() => {
    fetchAllBranches();
    if (urlMark) {
      loadCustomerLedger(urlMark);
    }
  }, [urlMark]);

  const fetchAllBranches = async () => {
    try {
      const res = await axios.get("/api/branches");
      if (res.data.success) setAllBranches(res.data.branches);
    } catch (error) {
      console.error("Failed to fetch branches");
    }
  };

  const playWarningSound = () => {
    try {
      const audio = new Audio("/sounds/error.mp3");
      audio.play();
    } catch (e) {
      console.log(e);
    }
  };

  const loadCustomerLedger = async (mark) => {
    if (!mark) return;
    setLoading(true);
    setActiveMark(mark);
    try {
      const summaryRes = await axios.get(`/api/branches/summary/${mark}`);
      setTotalBilled(summaryRes.data.summary?.totalBilled || 0);

      const paymentRes = await axios.get(`/api/payments/history/${mark}`);
      if (paymentRes.data.success) setLedgerHistory(paymentRes.data.payments);

      const invoiceRes = await axios.get(
        `/api/branches/invoice-history/${mark}`,
      );
      if (invoiceRes.data.success) setCustomerInvoices(invoiceRes.data.history);
    } catch (error) {
      alert("ডেটা লোড করতে সমস্যা হয়েছে!");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = (e) => {
    const mark = e.target.value;
    setActiveMark(mark);
    if (mark) loadCustomerLedger(mark);
  };

  // ✅ স্মার্ট ইনপুট হ্যান্ডলার (ডিসকাউন্টের জন্য অটো-আইডি জেনারেটর)
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "type") {
      if (value === "DISCOUNT" || value === "ADJUSTMENT") {
        // ইউনিক স্টেটমেন্ট আইডি জেনারেট (STMT-তারিখ-র্যান্ডম)
        const autoId = `STMT-${Date.now().toString().slice(-6)}`;
        setFormData({ ...formData, type: value, transactionId: autoId });
      } else {
        setFormData({ ...formData, type: value, transactionId: "" });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // ✅ স্ট্রং ডুপ্লিকেট চেক (Case & Space Insensitive)
  const checkDuplicate = (id) => {
    if (!id) return false;
    const cleanId = id.trim().toLowerCase();
    return ledgerHistory.some(
      (txn) =>
        txn.transactionId && txn.transactionId.trim().toLowerCase() === cleanId,
    );
  };

  // ✅ ডিলিট পেমেন্ট ফাংশন
  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "আপনি কি নিশ্চিত এটি ডিলিট করবেন? এটি ডিলিট করলে কাস্টমারের বকেয়া (Due) আবার বেড়ে যাবে।",
      )
    )
      return;

    try {
      const res = await axios.delete(`/api/payments/delete/${id}`);
      if (res.data.success) {
        alert("রেকর্ডটি ডিলিট করা হয়েছে এবং ব্যালেন্স অ্যাডজাস্ট হয়েছে।");
        loadCustomerLedger(activeMark);
      }
    } catch (error) {
      alert("ডিলিট করতে সমস্যা হয়েছে!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountVal = parseFloat(formData.amount);
    if (!amountVal || amountVal <= 0) return alert("সঠিক টাকার পরিমাণ দিন!");

    // ট্রানজেকশন আইডি ট্রিম করা
    const finalTxnId = formData.transactionId.trim();

    if (finalTxnId && checkDuplicate(finalTxnId)) {
      playWarningSound();
      return alert(
        `⚠️ ডুপ্লিকেট এন্ট্রি! "${finalTxnId}" আইডিটি ইতিমধ্যে ডাটাবেজে আছে।`,
      );
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        transactionId: finalTxnId,
        shippingMark: activeMark,
        amount: amountVal,
      };

      const res = await axios.post("/api/payments/add-payment", payload);

      if (res.data.success) {
        alert("পেমেন্ট সফলভাবে এন্ট্রি হয়েছে!");
        setFormData({
          amount: "",
          type: "PAYMENT",
          paymentMethod: "CASH",
          transactionId: "",
          allocatedInvoice: "",
          remarks: "",
        });
        loadCustomerLedger(activeMark);
      }
    } catch (error) {
      playWarningSound();
      alert(
        error.response?.data?.message || "ট্রানজেকশন সেভ করতে সমস্যা হয়েছে!",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const totalPaid = ledgerHistory
    .filter((txn) => txn.type === "PAYMENT")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalDiscount = ledgerHistory
    .filter((txn) => txn.type === "DISCOUNT" || txn.type === "ADJUSTMENT")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const currentDue = totalBilled - totalPaid - totalDiscount;

  return (
    <div className="payment-allocation-container">
      <div className="header-section">
        <h2>💰 Payment Allocation & Ledger</h2>
        <p>কাস্টমার সিলেক্ট করুন এবং তাদের বকেয়া বা ডিসকাউন্ট ম্যানেজ করুন</p>
      </div>

      <div className="search-card">
        <label>Select Customer / Shipping Mark:</label>
        <select
          value={activeMark}
          onChange={handleCustomerChange}
          className="smart-select"
        >
          <option value="">-- কাস্টমার সিলেক্ট করুন --</option>
          {allBranches.map((branch) => (
            <option key={branch._id} value={branch.shippingMark}>
              {branch.shippingMark} - {branch.branchName}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="loading-text">ডেটা লোড হচ্ছে...</div>}

      {activeMark && !loading && (
        <>
          <div className="ledger-stats-grid">
            <div className="stat-card blue">
              <span>Total Billed</span>
              <h3>৳ {totalBilled.toLocaleString()}</h3>
            </div>
            <div className="stat-card green">
              <span>Total Paid</span>
              <h3>৳ {totalPaid.toLocaleString()}</h3>
            </div>
            <div className="stat-card orange">
              <span>Total Discount</span>
              <h3>৳ {totalDiscount.toLocaleString()}</h3>
            </div>
            <div className={`stat-card ${currentDue > 0 ? "red" : "gray"}`}>
              <span>Current Due</span>
              <h3>৳ {currentDue.toLocaleString()}</h3>
            </div>
          </div>

          <div className="main-grid">
            <div className="form-card">
              <h3>➕ Add New Transaction</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group highlight-group">
                  <label>Allocate to Specific Invoice (Optional)</label>
                  <select
                    name="allocatedInvoice"
                    value={formData.allocatedInvoice}
                    onChange={handleInputChange}
                  >
                    <option value="">General Payment / Advance</option>
                    {customerInvoices.map((inv) => (
                      <option key={inv._id} value={inv._id}>
                        {inv._id} (Bill: ৳ {inv.totalAmount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount (৳) *</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-flex-row">
                  <div className="form-group w-50">
                    <label>Transaction Type</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                    >
                      <option value="PAYMENT">Payment Receipt</option>
                      <option value="DISCOUNT">Discount (ছাড়)</option>
                      <option value="ADJUSTMENT">Adjustment</option>
                    </select>
                  </div>
                  <div className="form-group w-50">
                    <label>Payment Method</label>
                    <select
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleInputChange}
                    >
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank</option>
                      <option value="BKASH">bKash</option>
                      <option value="NAGAD">Nagad</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Receipt / Statement ID *</label>
                  <input
                    type="text"
                    name="transactionId"
                    value={formData.transactionId}
                    onChange={handleInputChange}
                    placeholder="e.g. BKS-789456"
                    className={
                      formData.type !== "PAYMENT" ? "auto-id-input" : ""
                    }
                    required
                  />
                  {formData.type !== "PAYMENT" && (
                    <small style={{ color: "#0ea5e9" }}>
                      ✨ অটো-জেনারেটেড আইডি ব্যবহার করা হচ্ছে
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label>Remarks / Note</label>
                  <input
                    type="text"
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    placeholder="Write note here..."
                  />
                </div>
                <CanAccess module="payment" action="create">
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "💾 Save Transaction"}
                  </button>
                </CanAccess>
              </form>
            </div>

            <div className="table-card">
              <h3>📜 Account Statement / Ledger</h3>
              <div className="table-responsive">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type/Inv.</th>
                      <th>Ref ID</th>
                      <th> Remarks</th>
                      <th className="text-right">Amount (৳)</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerHistory.map((txn) => (
                      <tr key={txn._id}>
                        <td>
                          {new Date(txn.date).toLocaleDateString("en-GB")}
                        </td>
                        <td>
                          <span
                            className={`type-badge ${txn.type.toLowerCase()}`}
                          >
                            {txn.type}
                          </span>
                          {txn.allocatedInvoice && (
                            <div className="inv-badge">
                              Inv: {txn.allocatedInvoice}
                            </div>
                          )}
                        </td>
                        <td>
                          <strong>{txn.transactionId || "-"}</strong>
                        </td>
                        <td>
                          {txn.remarks && (
                            <div className="remarks-badge">{txn.remarks}</div>
                          )}
                        </td>
                        <td className="text-right fw-bold text-green">
                          + {txn.amount.toLocaleString()}
                        </td>
                        <td className="text-center">
                          <CanAccess module="payment" action="delete">
                            <button
                              className="delete-row-btn"
                              onClick={() => handleDelete(txn._id)}
                            >
                              🗑️
                            </button>
                          </CanAccess>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* CSS Styles */}
      <style>{`
        .payment-allocation-container { padding: 30px; background: #f4f7fa; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .header-section { margin-bottom: 25px; }
        .header-section h2 { margin: 0; color: #0f172a; font-size: 26px; }
        .header-section p { margin: 5px 0 0; color: #64748b; font-size: 14px; }

        .search-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-bottom: 25px; max-width: 600px; }
        .search-card label { font-weight: bold; color: #475569; display: block; margin-bottom: 10px; }
        .smart-select { width: 100%; padding: 12px 15px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 15px; font-weight: bold; outline: none; cursor: pointer; }
        .smart-select:focus { border-color: #0ea5e9; }

        .ledger-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 25px; }
        .stat-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border-left: 5px solid; }
        .stat-card span { font-size: 13px; font-weight: bold; color: #64748b; }
        .stat-card h3 { margin: 10px 0 0; font-size: 24px; color: #0f172a; }
        .stat-card.blue { border-color: #3b82f6; }
        .stat-card.green { border-color: #10b981; }
        .stat-card.orange { border-color: #f59e0b; }
        .stat-card.red { border-color: #ef4444; }
        .stat-card.gray { border-color: #94a3b8; }

        .main-grid { display: grid; grid-template-columns: 400px 1fr; gap: 25px; align-items: start; }
        .form-card, .table-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
        .form-card h3, .table-card h3 { margin: 0 0 20px; padding-bottom: 15px; border-bottom: 2px solid #f1f5f9; color: #0f172a; }

        .form-group { margin-bottom: 15px; }
        .highlight-group { background: #f0f9ff; padding: 15px; border-radius: 8px; border: 1px solid #bae6fd; }
        .form-group label { display: block; font-weight: bold; font-size: 13px; color: #475569; margin-bottom: 5px; }
        .form-group input, .form-group select { width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 6px; font-size: 14px; outline: none; }
        .form-group input:focus, .form-group select:focus { border-color: #0ea5e9; }
        .form-flex-row { display: flex; gap: 15px; }
        .w-50 { width: 50%; }
        .submit-btn { width: 100%; background: #10b981; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 15px; cursor: pointer; margin-top: 10px; transition: 0.2s; }
        .submit-btn:hover { background: #059669; }

        .table-responsive { overflow-x: auto; max-height: 550px; overflow-y: auto; }
        .ledger-table { width: 100%; border-collapse: collapse; }
        .ledger-table th { background: #f8fafc; padding: 12px; text-align: left; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0; position: sticky; top: 0; }
        .ledger-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; }
        
        .type-badge { font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 12px; }
        .type-badge.payment { background: #dcfce7; color: #166534; }
        .type-badge.discount { background: #fef3c7; color: #d97706; }
        .type-badge.adjustment { background: #e0f2fe; color: #0369a1; }
        .inv-badge { font-size: 11px; color: #3b82f6; margin-top: 4px; font-weight: bold; }
        
        .text-right { text-align: right; }
        .fw-bold { font-weight: bold; }
        .text-green { color: #10b981; }
        .no-data { text-align: center; color: #94a3b8; padding: 30px !important; }

        /* ... আপনার আগের স্টাইলগুলো থাকবে ... */
        .auto-id-input { background-color: #f0f9ff; border-color: #0ea5e9 !important; font-weight: bold; color: #0369a1; }
        .delete-row-btn { background: none; border: none; cursor: pointer; font-size: 18px; transition: 0.2s; padding: 5px; }
        .delete-row-btn:hover { background: #fee2e2; border-radius: 4px; transform: scale(1.1); }
        .text-center { text-align: center; }
        /* বাকি স্টাইল আপনার আগের মতোই */
      `}</style>
    </div>
  );
}
