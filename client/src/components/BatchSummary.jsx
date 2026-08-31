import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./BatchSummary.css";

export default function BatchSummary({
  totalGross,
  totalActual,
  totalCbm,
  totalQuantity,
  bills,
  setBills,
  pieChartData, // 🔥 এই প্রপটি রিসিভ করা হলো
}) {
  const totalBill = Object.values(bills).reduce(
    (a, b) => Number(a) + Number(b),
    0,
  );

  const handleBillChange = (e) => {
    setBills({ ...bills, [e.target.name]: e.target.value });
  };

  // চার্টের জন্য কিছু সুন্দর কালার
  const COLORS = [
    "#0dcbec",
    "#f59e0b",
    "#3033ec",
    "#3b82f6",
    "#8b5cf6",
    "#64748b",
  ];

  return (
    <div className="batch-summary-compact">
      {/* 📊 নতুন অংশ: পাই চার্ট সেকশন */}
      <div
        className="chart-section"
        style={{
          background: "#fff",
          padding: "15px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          marginBottom: "20px",
        }}
      >
        <h3
          style={{
            marginTop: 0,
            color: "#334155",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: "10px",
          }}
        >
          📊 Product Categories by Weight
        </h3>

        {pieChartData && pieChartData.length > 0 ? (
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  labelLine={true} // বাইরের দিকে লাইন দেখাবে
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                  position="outside" // 🔥 পার্সেন্টেজগুলো চার্টের বাইরে দেখাবে
                >
                 {pieChartData.map((entry, index) => {
                    // 🔥 কাস্টম কালার লজিক
                    let color;
                    if (entry.name === "Copy") {
                      color = "#ef4444"; // লাল (Red)
                    } else if (entry.name === "General") {
                      color = "#10b981"; // সবুজ (Green)
                    } else {
                      color = COLORS[index % COLORS.length];
                    }
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Pie>
                <Tooltip formatter={(value) => `${value} KG`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ textAlign: "center", color: "#94a3b8" }}>
            No product types data available.
          </p>
        )}
      </div>

      {/* 🟢 আপনার আগের টেবিল এবং বিলিং সেকশন */}
      <div className="summary-table-wrapper">
        <table className="summary-compact-table">
          <tbody>
            {/* প্রথম সারি: পার্সেল এবং ওজনের হিসাব */}
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

            {/* দ্বিতীয় সারি: খরচের (বিলের) ইনপুট */}
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

      {/* 🔴 তৃতীয় সারি: প্রতি কেজির গড় খরচ */}
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
