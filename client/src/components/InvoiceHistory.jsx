// src/components/InvoiceHistory.jsx

import React from "react";
// আপনার যদি আলাদা CSS থাকে তাহলে ইমপোর্ট করুন, অথবা BranchProfile.css তেই কাজ করবে

export default function InvoiceHistory({
  historyData,
  filteredHistory,
  invoiceSearchTerm,
  setInvoiceSearchTerm,
  selectedBatch,
  setSelectedBatch,
  uniqueBatches,
  onViewInvoice,
}) {
  return (
    <div className="tab-content">
      {/* ফিল্টার এবং সার্চ বার */}
      <div
        className="controls-bar"
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "15px",
        }}
      >
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
          placeholder="Search Invoice ID / Tracking..."
          value={invoiceSearchTerm}
          onChange={(e) => setInvoiceSearchTerm(e.target.value)}
          className="filter-input"
        />
      </div>

      {/* ইনভয়েস হিস্ট্রি টেবিল */}
      <div className="table-card">
        <table className="pro-table">
          <thead>
            <tr>
              <th>SL</th>
              <th>Date</th>
              <th>Invoice ID</th>
              <th>Total Items</th>
              <th>Weight (KG)</th>
              <th>Net Bill (৳)</th>
              <th>Paid (৳)</th>
              <th>Due (৳)</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.length > 0 ? (
              filteredHistory.map((inv, idx) => {
                // 🧮 ইনভয়েসের মোট বিল, পেইড এবং ডিউ ক্যালকুলেশন
                const subTotal = inv.totalAmount || 0;
                const discountAmt = inv.discount || 0;
                const transportAmt = inv.transportBill || 0;
                const rCost = inv.invoiceReceivingCost || 0;
                const pCost = inv.invoicePackagingCost || 0;

                const finalTotal =
                  subTotal + transportAmt + rCost + pCost - discountAmt;
                const paidAmt = inv.paidAmount || 0;
                const dueAmt = Math.max(0, finalTotal - paidAmt);

                // স্ট্যাটাস লজিক
                const isFullyPaid = dueAmt === 0 && finalTotal > 0;
                const isPartial = paidAmt > 0 && dueAmt > 0;

                return (
                  <tr key={inv._id}>
                    <td>{idx + 1}</td>
                    <td>{new Date(inv.date).toLocaleDateString("en-GB")}</td>
                    <td style={{ fontWeight: "bold", color: "#0369a1" }}>
                      {inv._id}
                    </td>
                    <td>{inv.items?.length || 0} PCS</td>

                    <td>
                      {inv.items
                        ?.reduce(
                          (acc, it) =>
                            acc +
                            (Number(it.actualWeight) ||
                              Number(it.grossWeight) ||
                              0),
                          0,
                        )
                        .toFixed(2)}{" "}
                      KG
                    </td>

                    <td style={{ fontWeight: "bold" }}>
                      ৳ {finalTotal.toLocaleString()}
                    </td>
                    <td style={{ color: "#16a34a", fontWeight: "bold" }}>
                      ৳ {paidAmt.toLocaleString()}
                    </td>
                    <td style={{ color: "#dc2626", fontWeight: "bold" }}>
                      ৳ {dueAmt.toLocaleString()}
                    </td>

                    {/* 🔥 স্ট্যাটাস ব্যাজ */}
                    <td>
                      {isFullyPaid ? (
                        <span
                          style={{
                            background: "#dcfce7",
                            color: "#15803d",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            border: "1px solid #bbf7d0",
                          }}
                        >
                          ✅ PAID
                        </span>
                      ) : isPartial ? (
                        <span
                          style={{
                            background: "#fef3c7",
                            color: "#b45309",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            border: "1px solid #fde68a",
                          }}
                        >
                          ⏳ PARTIAL
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "#fee2e2",
                            color: "#b91c1c",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            border: "1px solid #fecaca",
                          }}
                        >
                          ❌ UNPAID
                        </span>
                      )}
                    </td>

                    <td>
                      <button
                        onClick={() => onViewInvoice(inv)}
                        style={{
                          background: "#3b82f6",
                          color: "white",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "5px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "bold",
                        }}
                      >
                        👁️ View
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="10"
                  className="no-data"
                  style={{ textAlign: "center", padding: "20px" }}
                >
                  কোনো ইনভয়েস পাওয়া যায়নি
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
