//src/components/BatchSummary.jsx

import React from "react";

export default function BatchSummary({
  totalGross,
  totalActual,
  totalCbm,
  totalQuantity,
  bills,
  setBills,
}) {
  const totalBill = Object.values(bills).reduce(
    (a, b) => Number(a) + Number(b),
    0,
  );

  return (
    <div className="summary-section">
      {/* ✅ কলাম সংখ্যা ৪ থেকে ৫ করা হয়েছে */}
      <div
        className="stats-grid"
        style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
      >
        <div className="stat-card blue">
          <label>Total China Wt.</label>
          <div className="value">
            {totalGross.toFixed(2)} <span>KG</span>
          </div>
        </div>
        <div className="stat-card green">
          <label>Total Office Wt.</label>
          <div className="value">
            {totalActual.toFixed(2)} <span>KG</span>
          </div>
        </div>
        <div className="stat-card red">
          <label>Missing Weight</label>
          <div className="value">
            {(totalGross - totalActual).toFixed(2)} <span>KG</span>
          </div>
        </div>
        <div className="stat-card blue">
          <label>Total CBM</label>
          <div className="value">
            {totalCbm.toFixed(3)} <span>CBM</span>
          </div>
        </div>
        {/* ✅ নতুন Total Quantity Card যুক্ত করা হলো */}
        <div className="stat-card" style={{ borderBottomColor: "#f59e0b" }}>
          <label>Total Quantity</label>

          <div className="value" style={{ color: "#d97706" }}>
            {totalQuantity} <span style={{ color: "#fcd34d" }}>PCS</span>
          </div>
        </div>
      </div>

      <div className="costing-card">
        <div className="cost-inputs">
          <div className="cost-box">
            <label>Air Bill</label>
            <input
              type="number"
              value={bills.airBill}
              onChange={(e) => setBills({ ...bills, airBill: e.target.value })}
            />
          </div>
          <div className="cost-box">
            <label>Customs</label>
            <input
              type="number"
              value={bills.customs}
              onChange={(e) => setBills({ ...bills, customs: e.target.value })}
            />
          </div>
          <div className="cost-box">
            <label>Load Unload</label>
            <input
              type="number"
              value={bills.loadUnload}
              onChange={(e) =>
                setBills({ ...bills, loadUnload: e.target.value })
              }
            />
          </div>
          <div className="cost-box">
            <label>Other bill</label>
            <input
              type="number"
              value={bills.other}
              onChange={(e) => setBills({ ...bills, other: e.target.value })}
            />
          </div>
          <div className="total-expense">
            <label>Total Expense</label>
            <div className="amt">৳ {totalBill}</div>
          </div>
        </div>
        <div className="avg-cost-bar">
          Average Cost Per KG:{" "}
          <strong>
            ৳ {(totalActual > 0 ? totalBill / totalActual : 0).toFixed(2)}
          </strong>
        </div>
      </div>
    </div>
  );
}
