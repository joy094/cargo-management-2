// src/components/PieChart.jsx
import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ProductTypePieChart({ data, title }) {
  // ডিফল্ট কালার প্যালেট (বাকি ক্যাটাগরির জন্য)
  const DEFAULT_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#64748b"];

  return (
    <div
      className="reusable-chart-card"
      style={{
        background: "#fff",
        padding: "15px",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
        marginBottom: "20px",
      }}
    >
      {title && (
        <h3 style={{ marginTop: 0, color: "#334155", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
          {title}
        </h3>
      )}

      {data && data.length > 0 ? (
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                labelLine={true}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {data.map((entry, index) => {
                  let color;
                  // 🔥 সেন্ট্রালাইজড কালার লজিক (সব জায়গায় একই কালার দেখাবে)
                  if (entry.name === "Copy") {
                    color = "#ef4444"; // লাল
                  } else if (entry.name === "General") {
                    color = "#10b981"; // সবুজ
                  } else {
                    color = DEFAULT_COLORS[index % DEFAULT_COLORS.length];
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
        <p style={{ textAlign: "center", color: "#94a3b8", padding: "20px 0" }}>
          No data available for chart.
        </p>
      )}
    </div>
  );
}