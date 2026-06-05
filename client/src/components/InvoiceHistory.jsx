//src/components/InvoiceHistory.jsx

import React from "react";

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
                      onClick={() => onViewInvoice(inv)}
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
  );
}
