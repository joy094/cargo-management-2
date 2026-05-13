// src/components/UploadExcelModal.jsx

import React, { useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";

export default function UploadExcelModal({
  isOpen,
  onClose,
  batchId,
  onSuccess,
}) {
  const [excelData, setExcelData] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // ✅ নতুন টেমপ্লেট ডাউনলোড (Master & Sub-box সাপোর্টেড)
  const downloadTemplate = () => {
    const templateData = [
      {
        "Shipping Mark": "SKL-RONY",
        "Carton No": "100",
        "Box Type": "Master", // Master নাকি Sub-box
        "Parent Carton No": "", // Sub-box হলে এখানে মাস্টার বক্সের কার্টন নাম্বার দিতে হবে
        "Product Name": "Garments",
        Quantity: 1,
        "Gross Weight": 45.5,
        L: 55,
        W: 45,
        H: 60,
        "China Tracking": "SF123456789",
        "Customer Name": "Rony",
        Mobile: "01712345678",
      },
      {
        "Shipping Mark": "SKL-RONY",
        "Carton No": "100-1",
        "Box Type": "Sub-box", // এটি একটি সাব-বক্স
        "Parent Carton No": "100", // এটি 100 নাম্বার কার্টনের ভেতরের মাল
        "Product Name": "T-shirt",
        Quantity: 1,
        "Gross Weight": 20.0,
        L: "",
        W: "",
        H: "",
        "China Tracking": "YT987654321",
        "Customer Name": "Rony",
        Mobile: "01712345678",
      },
      {
        "Shipping Mark": "SKL-RONY",
        "Carton No": "100-2",
        "Box Type": "Sub-box",
        "Parent Carton No": "100",
        "Product Name": "Jeans",
        Quantity: 1,
        "Gross Weight": 25.5,
        L: "",
        W: "",
        H: "",
        "China Tracking": "ZT123456789",
        "Customer Name": "Rony",
        Mobile: "01712345678",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shipment List");

    XLSX.writeFile(workbook, "cargo_master_sub_template.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet);

      // ✅ এক্সেল ডাটা ম্যাপিং লজিক
      const mappedData = json.map((row) => {
        const l = Number(row["L"]) || 0;
        const w = Number(row["W"]) || 0;
        const h = Number(row["H"]) || 0;
        const calculatedCbm =
          l > 0 && w > 0 && h > 0 ? (l * w * h) / 1000000 : 0;

        // বক্স টাইপ ডিটেকশন
        const rawBoxType = String(row["Box Type"] || "").toLowerCase();
        const isMaster = rawBoxType !== "sub-box"; // বাই ডিফল্ট মাস্টার বক্স ধরে নিবে

        return {
          shippingMark: row["Shipping Mark"] || "",
          cartonNo: String(row["Carton No"] || ""),
          productName: row["Product Name"] || "",
          quantity: row["Quantity"] || 1,
          grossWeight: row["Gross Weight"] || 0,
          length: l,
          width: w,
          height: h,
          cbm: calculatedCbm.toFixed(3),
          chinaTrackingNo:
            row["China Tracking"] || row["Tracking Number"] || "",
          customerName: row["Customer Name"] || "Unknown",
          customerMobile: row["Mobile"] || "",

          // 🔥 সাব-বক্সের জন্য স্পেশাল ফিল্ড
          isMasterCarton: isMaster,
          parentCartonNo: String(row["Parent Carton No"] || ""),
        };
      });

      setExcelData(mappedData);
    };

    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (excelData.length === 0) {
      alert("দয়া করে ফাইল আপলোড করুন!");
      return;
    }

    setLoading(true);
    try {
      // ডেটার সাথে অটোমেটিকভাবে বর্তমান Batch ID পাঠানো হচ্ছে
      const payload = {
        shipments: excelData,
        batchId: batchId, // Auto-assigned
      };

      const res = await axios.post("/api/bulk-import-excel", payload);
      alert(res.data.message || "সফলভাবে ইমপোর্ট হয়েছে!");

      setExcelData([]);
      onSuccess(); // ব্যাচ ডিটেইলস পেজের ডাটা রিফ্রেশ করবে
      onClose(); // পপআপ বন্ধ করবে
    } catch (err) {
      alert(err.response?.data?.error || "ইম্পোর্ট করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed-modal-overlay">
      <div
        className="fixed-modal-content"
        style={{ maxWidth: "900px", width: "95%" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ margin: 0, color: "#0f172a" }}>
            🚀 Upload Master & Sub-Boxes
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "#ef4444",
            }}
          >
            ✖
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <p style={{ color: "#64748b", margin: 0, alignSelf: "center" }}>
            বর্তমান ব্যাচে সরাসরি ডাটা যুক্ত হবে।
          </p>
          <button
            onClick={downloadTemplate}
            style={{
              background: "#34495e",
              color: "white",
              padding: "8px 15px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            📥 Download Format
          </button>
        </div>

        <div
          className="upload-area"
          style={{
            border: "2px dashed #0369a1",
            padding: "30px",
            borderRadius: "10px",
            textAlign: "center",
            background: "#f0f9ff",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              top: 0,
              left: 0,
              opacity: 0,
              cursor: "pointer",
            }}
          />
          <p style={{ color: "#0369a1", fontWeight: "bold", margin: 0 }}>
            এক্সেল ফাইলটি এখানে সিলেক্ট করুন
          </p>
        </div>

        {excelData.length > 0 && (
          <div className="preview-section" style={{ marginTop: "25px" }}>
            <h3 style={{ marginBottom: "15px", color: "#0f172a" }}>
              📊 Data Preview ({excelData.length} items)
            </h3>
            <div
              style={{
                overflowX: "auto",
                maxHeight: "300px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  whiteSpace: "nowrap",
                }}
              >
                <thead style={{ background: "#003580", color: "white" }}>
                  <tr>
                    <th style={{ padding: "10px" }}>Mark</th>
                    <th style={{ padding: "10px" }}>Carton</th>
                    <th style={{ padding: "10px" }}>Type</th>
                    <th style={{ padding: "10px" }}>Parent</th>
                    <th style={{ padding: "10px" }}>Weight</th>
                    <th style={{ padding: "10px" }}>CBM</th>
                  </tr>
                </thead>
                <tbody>
                  {excelData.slice(0, 10).map((row, index) => (
                    <tr
                      key={index}
                      style={{
                        borderBottom: "1px solid #e2e8f0",
                        background: row.isMasterCarton ? "white" : "#f8fafc",
                      }}
                    >
                      <td style={{ padding: "10px", fontWeight: "bold" }}>
                        {row.shippingMark}
                      </td>
                      <td style={{ padding: "10px" }}>{row.cartonNo}</td>
                      <td style={{ padding: "10px" }}>
                        {row.isMasterCarton ? (
                          <span
                            style={{
                              background: "#dcfce7",
                              color: "#166534",
                              padding: "3px 8px",
                              borderRadius: "5px",
                              fontSize: "12px",
                            }}
                          >
                            Master
                          </span>
                        ) : (
                          <span
                            style={{
                              background: "#fef3c7",
                              color: "#b45309",
                              padding: "3px 8px",
                              borderRadius: "5px",
                              fontSize: "12px",
                            }}
                          >
                            Sub-box
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px" }}>
                        {row.parentCartonNo || "-"}
                      </td>
                      <td style={{ padding: "10px" }}>{row.grossWeight} kg</td>
                      <td
                        style={{
                          padding: "10px",
                          color: "#16a34a",
                          fontWeight: "bold",
                        }}
                      >
                        {row.cbm > 0 ? row.cbm : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {excelData.length > 10 && (
                <p
                  style={{
                    textAlign: "center",
                    color: "#64748b",
                    margin: "10px 0",
                  }}
                >
                  ...and {excelData.length - 10} more rows
                </p>
              )}
            </div>

            <button
              onClick={handleImport}
              disabled={loading}
              style={{
                width: "100%",
                padding: "15px",
                background: "#16a34a",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                marginTop: "20px",
              }}
            >
              {loading
                ? "Saving Data..."
                : `🚀 Confirm & Save ${excelData.length} Shipments`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
