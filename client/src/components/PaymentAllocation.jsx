//src/PaymentsAllowcations.jsx

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

export default function PaymentAllocation() {
  const [paymentType, setPaymentType] = useState("");
  const [statementNo, setStatementNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [mobileBank, setMobileBank] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [amount, setAmount] = useState("");
  const [shipmentList, setShipmentList] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [selectedShipments, setSelectedShipments] = useState([]);
  const [receivedDate, setReceivedDate] = useState("");

  const [agencyList, setAgencyList] = useState([]);
  const [selectedAgency, setSelectedAgency] = useState("");

  // ✅ ব্যাচের জন্য নতুন স্টেট
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");

  // App source updated for Cargo
  const APP_SOURCE = "CARGO";

  const errorAudioRef = useRef(null);

  // ১. রেফারেন্স নম্বর নরমালাইজ করা
  const normalizeRef = (value = "") => {
    return value
      .toString()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .trim();
  };

  // ২. শিপমেন্ট লিস্ট লোড করা
  useEffect(() => {
    axios
      .get("/api/shipments")
      .then((res) => {
        setShipmentList(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => console.error("Error fetching Shipment list:", err));
  }, []);

  // ৩. ব্রাঞ্চ/এজেন্সি লিস্ট লোড করা
  useEffect(() => {
    axios
      .get("/api/agencies")
      .then((res) => {
        setAgencyList(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => console.error("Error fetching agencies:", err));
  }, []);

  // ✅ ৪. ব্যাচ লিস্ট লোড করা
  useEffect(() => {
    axios
      .get("/api/batches")
      .then((res) => {
        setBatches(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => console.error("Error fetching batches:", err));
  }, []);

  // ৫. শিপমেন্ট সিলেকশন হ্যান্ডলার
  const handleShipmentSelect = (shipmentId) => {
    setSelectedShipments((prev) =>
      prev.includes(shipmentId)
        ? prev.filter((id) => id !== shipmentId)
        : [...prev, shipmentId],
    );
    setAllocations((prev) => {
      if (!prev.find((a) => a.shipmentId === shipmentId)) {
        return [...prev, { shipmentId, amount: "" }];
      }
      return prev;
    });
  };

  // ৬. ইন্ডিভিজুয়াল পেমেন্ট ইনপুট হ্যান্ডলার
  const handleAmountChange = (shipmentId, value) => {
    setAllocations((prev) =>
      prev.map((a) =>
        a.shipmentId === shipmentId
          ? { ...a, amount: value === "" ? "" : parseFloat(value) || 0 }
          : a,
      ),
    );
  };

  // ৭. সাবমিট লজিক
  const handleSubmit = async () => {
    if (!paymentType || !receivedDate || !amount) {
      alert("Please fill all basic payment info!");
      return;
    }

    if (selectedShipments.length === 0) {
      alert("Select at least one Shipment to allocate money");
      return;
    }

    const totalAllocated = allocations
      .filter((a) => selectedShipments.includes(a.shipmentId))
      .reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);

    if (totalAllocated !== parseFloat(amount)) {
      alert(
        `Error: Allocated sum (৳${totalAllocated}) doesn't match Total Amount (৳${amount})`,
      );
      return;
    }

    const payload = {
      paymentType,
      receivedDate,
      totalAmount: Number(amount),
      appSource: APP_SOURCE,
      allocations: allocations
        .filter((a) => selectedShipments.includes(a.shipmentId))
        .map((a) => ({
          shipmentId: a.shipmentId,
          amount: Number(a.amount),
        })),
    };

    if (paymentType === "bank") {
      if (!statementNo || !bankName) return alert("Bank details required");
      payload.statementNo = normalizeRef(statementNo);
      payload.bankName = bankName;
    } else if (paymentType === "mobile") {
      if (!transactionId || !mobileBank)
        return alert("Mobile banking details required");
      payload.statementNo = normalizeRef(transactionId);
      payload.mobileBank = mobileBank;
    } else {
      if (!receiptNo) return alert("Receipt Number required");
      payload.statementNo = normalizeRef(receiptNo);
    }

    try {
      const res = await axios.post("/api/payments/allocate", payload);
      alert(res.data.message || "Payment allocated successfully!");
      window.location.reload();
    } catch (err) {
      const msg = err.response?.data?.error || "Error in allocation";
      // ✅ এখন মেসেজের ভেতর বাংলা শব্দ খুঁজবে
      if (msg.includes("ইতিমধ্যে") || msg.includes("ব্যবহার করা হয়েছে")) {
        // সাউন্ড প্লে করা
        const errorSound = new Audio("/sounds/error.mp3");
        errorSound.play().catch((e) => console.log("Audio Error:", e));

        // আধা সেকেন্ড ডিলে করে অ্যালার্ট দেখানো
        setTimeout(() => {
          alert(msg);
        }, 500);
      } else {
        alert(msg);
      }
    }
  };

  // ✅ ৮. মাল্টিপল ফিল্টার লজিক (ব্রাঞ্চ এবং ব্যাচ)
  const filteredShipments = shipmentList.filter((s) => {
    const matchAgency = selectedAgency
      ? s.agency?._id === selectedAgency
      : true;
    const matchBatch = selectedBatch
      ? (s.batch?._id || s.batch) === selectedBatch
      : true;
    return matchAgency && matchBatch;
  });

  return (
    <div className="payment-allocation">
      <div className="header-flex">
        <h2>💳 Payment Allocation (Cargo)</h2>
        <span className="source-tag">{APP_SOURCE} SYSTEM</span>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>Payment Method:</label>
          <select
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value)}
          >
            <option value="">-- Choose --</option>
            <option value="bank">🏦 Bank Transfer</option>
            <option value="mobile">📱 Mobile Banking (Bkash/Nagad)</option>
            <option value="cash">💵 Cash / Receipt</option>
          </select>
        </div>

        <div className="form-group">
          <label>Received Date:</label>
          <input
            type="date"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div className="form-group">
          <label>Total Amount to Allocate:</label>
          <input
            type="number"
            className="total-amt-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="৳ 0.00"
          />
        </div>
      </div>

      <div className="dynamic-fields">
        {paymentType === "bank" && (
          <div className="grid-2">
            <input
              placeholder="Statement / Check No"
              value={statementNo}
              onChange={(e) => setStatementNo(e.target.value)}
            />
            <input
              placeholder="Bank Name"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>
        )}
        {paymentType === "mobile" && (
          <div className="grid-2">
            <input
              placeholder="Transaction ID (TrxID)"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            />
            <input
              placeholder="Mobile Bank (e.g. Bkash)"
              value={mobileBank}
              onChange={(e) => setMobileBank(e.target.value)}
            />
          </div>
        )}
        {paymentType === "cash" && (
          <input
            placeholder="Voucher / Receipt Number"
            value={receiptNo}
            onChange={(e) => setReceiptNo(e.target.value)}
          />
        )}
      </div>

      <hr />

      <div className="shipment-selection-area">
        <h3>📦 Select Shipments for Allocation</h3>

        {/* ✅ ফিল্টার অপশনগুলো (ব্রাঞ্চ এবং ব্যাচ) */}
        <div className="filter-row">
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
          >
            <option value="">All Batches / Flights</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.batchName}
              </option>
            ))}
          </select>

          <select
            value={selectedAgency}
            onChange={(e) => setSelectedAgency(e.target.value)}
          >
            <option value="">All Branches / Agencies</option>
            {agencyList.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrapper">
          <table className="cargo-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Tracking No</th>
                <th>Sender / Customer</th>
                <th>Branch</th>
                <th>Charge</th>
                <th>Due</th>
                <th>Allocate</th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.map((s) => {
                const due = s.totalCharge - s.paidAmount;
                return (
                  <tr
                    key={s._id}
                    className={
                      selectedShipments.includes(s._id) ? "selected-row" : ""
                    }
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedShipments.includes(s._id)}
                        onChange={() => handleShipmentSelect(s._id)}
                      />
                    </td>
                    <td className="trk-no">{s.trackingNumber}</td>
                    <td>
                      {s.shipmentLabel || s.customer?.fullName || "Unknown"}
                    </td>
                    <td>{s.agency?.name}</td>
                    <td>৳ {s.totalCharge}</td>
                    <td className="due-text">৳ {due}</td>
                    <td>
                      <input
                        type="number"
                        className="cell-input"
                        placeholder="0"
                        disabled={!selectedShipments.includes(s._id)}
                        value={
                          allocations.find((a) => a.shipmentId === s._id)
                            ?.amount || ""
                        }
                        onChange={(e) =>
                          handleAmountChange(s._id, e.target.value)
                        }
                      />
                    </td>
                  </tr>
                );
              })}

              {filteredShipments.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    style={{ textAlign: "center", padding: "15px" }}
                  >
                    No unpaid shipments found for the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <button className="submit-btn" onClick={handleSubmit}>
        ✅ Finalize Allocation
      </button>
      <audio ref={errorAudioRef} src="/sounds/error.mp3" preload="auto" />

      <style>{`
        .payment-allocation { max-width: 1000px; margin: auto; padding: 25px; background: #fff; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header-flex { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
        .source-tag { background: #6c5ce7; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        
        .form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #444; }
        input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
        
        .total-amt-input { border: 2px solid #6c5ce7; font-size: 18px; font-weight: bold; color: #6c5ce7; }
        .dynamic-fields { margin: 20px 0; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }

        .filter-row { display: flex; gap: 15px; margin-bottom: 15px; }
        .filter-row select { flex: 1; }

        .table-wrapper { max-height: 400px; overflow-y: auto; margin-top: 15px; border: 1px solid #eee; border-radius: 10px; }
        .cargo-table { width: 100%; border-collapse: collapse; }
        .cargo-table th { background: #f8f9fa; position: sticky; top: 0; padding: 12px; text-align: left; font-size: 13px; z-index: 10; }
        .cargo-table td { padding: 12px; border-bottom: 1px solid #f1f1f1; font-size: 14px; }
        
        .selected-row { background: #f0f7ff; }
        .trk-no { font-weight: bold; color: #0d6efd; }
        .due-text { color: #e74c3c; font-weight: bold; }
        .cell-input { width: 100px; border: 1px solid #6c5ce7; }

        .submit-btn { width: 100%; padding: 15px; margin-top: 25px; background: linear-gradient(135deg, #6c5ce7, #a29bfe); color: #fff; border: none; border-radius: 10px; font-size: 18px; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .submit-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(108, 92, 231, 0.3); }

        @media (max-width: 600px) {
          .filter-row { flex-direction: column; }
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
