import React from "react";
import "./BatchSummary.css"; // 🔥 নতুন CSS ফাইল ইম্পোর্ট

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

  const handleBillChange = (e) => {
    setBills({ ...bills, [e.target.name]: e.target.value });
  };

  return (
    <div className="batch-summary-compact">
      <div className="summary-table-wrapper">
        <table className="summary-compact-table">
          <tbody>
            {/* 🟢 প্রথম সারি: পার্সেল এবং ওজনের হিসাব */}
            <tr className="stats-row">
              <th>Quantity</th>
              <td>
                <strong>{totalQuantity}</strong> Pcs
              </td>

              <th>China Wt.</th>
              <td>
                <strong>{totalGross.toFixed(2)}</strong> KG
              </td>

              <th>BD Office Wt.</th>
              <td>
                <strong>{totalActual.toFixed(2)}</strong> KG
              </td>

              <th>Missing Wt.</th>
              <td style={{ color: "#ef4444" }}>
                <strong>{(totalGross - totalActual).toFixed(2)}</strong> KG
              </td>

              <th>Total CBM</th>
              <td>
                <strong>{totalCbm.toFixed(3)}</strong>
              </td>
            </tr>

            {/* 🔵 দ্বিতীয় সারি: খরচের (বিলের) ইনপুট */}
            <tr className="billing-row">
              <th>Air Bill (৳)</th>
              <td>
                <input
                  type="number"
                  name="airBill"
                  value={bills.airBill || ""}
                  onChange={handleBillChange}
                  className="summary-input"
                  placeholder="0"
                />
              </td>

              <th>Customs (৳)</th>
              <td>
                <input
                  type="number"
                  name="customs"
                  value={bills.customs || ""}
                  onChange={handleBillChange}
                  className="summary-input"
                  placeholder="0"
                />
              </td>

              <th>Load/Unload (৳)</th>
              <td>
                <input
                  type="number"
                  name="loadUnload"
                  value={bills.loadUnload || ""}
                  onChange={handleBillChange}
                  className="summary-input"
                  placeholder="0"
                />
              </td>

              <th>Other Cost (৳)</th>
              <td>
                <input
                  type="number"
                  name="other"
                  value={bills.other || ""}
                  onChange={handleBillChange}
                  className="summary-input"
                  placeholder="0"
                />
              </td>

              <th className="total-highlight">Total Expense</th>
              <td className="total-highlight-val">
                ৳ {totalBill.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 🔴 তৃতীয় সারি: প্রতি কেজির গড় খরচ */}
      <div className="avg-cost-footer">
        Average Cost Per KG:
        <strong>
          {" "}
          ৳ {(totalActual > 0 ? totalBill / totalActual : 0).toFixed(2)}
        </strong>
      </div>
    </div>
  );
}
