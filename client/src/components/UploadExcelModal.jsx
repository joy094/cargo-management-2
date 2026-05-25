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

  // 📥 ডায়নামিক টেমপ্লেট ডাউনলোড লজিক
  const downloadTemplate = () => {
    let templateData;
    let fileName;

    if (batchId) {
      // 📦 ব্যাচ পেজের জন্য মাস্টার/সাব-বক্স টেমপ্লেট
      templateData = [
        {
          "Shipping Mark": "SKL-RONY",
          "Carton No": "100",
          "Box Type": "Master",
          "Parent Carton No": "",
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
          "Box Type": "Sub-box",
          "Parent Carton No": "100",
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
      ];
      fileName = "batch_master_sub_template.xlsx";
    } else {
      // 🏠 চায়না ওয়্যারহাউজের জন্য সিম্পল লুজ মাল টেমপ্লেট
      templateData = [
        {
          "Shipping Mark": "JAMAL-01",
          "Carton No": "5",
          "Product Name": "Shoes",
          Quantity: 2,
          "Gross Weight": 30.5,
          L: 40,
          W: 30,
          H: 50,
          "China Tracking": "YT123456789",
          "Customer Name": "Jamal",
          Mobile: "01812345678",
        },
        {
          "Shipping Mark": "KAMAL-02",
          "Carton No": "1",
          "Product Name": "Electronics",
          Quantity: 5,
          "Gross Weight": 15.0,
          L: 20,
          W: 20,
          H: 20,
          "China Tracking": "ZTO987654321",
          "Customer Name": "Kamal",
          Mobile: "01912345678",
        },
      ];
      fileName = "warehouse_loose_items_template.xlsx";
    }

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shipment List");

    XLSX.writeFile(workbook, fileName);
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

      // ✅ ডায়নামিক এক্সেল ডাটা ম্যাপিং লজিক
      const mappedData = json.map((row) => {
        const l = Number(row["L"]) || 0;
        const w = Number(row["W"]) || 0;
        const h = Number(row["H"]) || 0;
        const calculatedCbm =
          l > 0 && w > 0 && h > 0 ? (l * w * h) / 1000000 : 0;

        let isMaster = true; // ওয়্যারহাউজের জন্য বাই ডিফল্ট সব মাস্টার/লুজ
        let parentCartonNo = "";

        // 📦 শুধুমাত্র ব্যাচ পেজ থেকে আপলোড হলে বক্স টাইপ চেক করবে
        if (batchId) {
          const rawBoxType = String(row["Box Type"] || "").toLowerCase();
          isMaster = rawBoxType !== "sub-box";
          parentCartonNo = String(row["Parent Carton No"] || "");
        }

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

          isMasterCarton: isMaster,
          parentCartonNo: parentCartonNo,
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
      // ওয়্যারহাউজের জন্য batchId null হবে, তাই স্ট্যাটাস ম্যানুয়ালি পাঠিয়ে দিচ্ছি
      const payload = {
        shipments: excelData.map((item) => ({
          ...item,
          status: batchId ? undefined : "Warehouse Received", // ওয়্যারহাউজের জন্য ডিফল্ট স্ট্যাটাস
        })),
        batchId: batchId || null,
      };

      const res = await axios.post("/api/bulk-import-excel", payload);
      alert(res.data.message || "সফলভাবে ইমপোর্ট হয়েছে!");

      setExcelData([]);
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || "ইম্পোর্ট করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed-modal-overlay" style={{ zIndex: 1000 }}>
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
            {batchId
              ? "🚀 Upload Master & Sub-Boxes"
              : "🏠 Upload Warehouse Shipments"}
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
            alignItems: "center",
          }}
        >
          <p style={{ color: "#64748b", margin: 0 }}>
            {batchId
              ? "বর্তমান ব্যাচে সরাসরি ডাটা যুক্ত হবে।"
              : "ওয়্যারহাউজে লুজ মাল হিসেবে যুক্ত হবে।"}
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
            📥 Download {batchId ? "Master/Sub" : "Simple"} Format
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
                    {batchId && <th style={{ padding: "10px" }}>Type</th>}
                    {batchId && <th style={{ padding: "10px" }}>Parent</th>}
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

                      {/* ব্যাচ পেজ হলে Type এবং Parent দেখাবে */}
                      {batchId && (
                        <>
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
                        </>
                      )}

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
