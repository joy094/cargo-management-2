// src/components/Search.jsx
import React from "react";

export default function Search({ searchTerm, setSearchTerm }) {
  return (
    <div className="search-wrapper">
      <input
        type="text"
        placeholder=" Find by Shipping Mark, Tracking, Product or Carton No  ..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          padding: "12px 20px",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          width: "350px",
          outline: "none",
          transition: "0.2s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
        onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
      />
    </div>
  );
}
