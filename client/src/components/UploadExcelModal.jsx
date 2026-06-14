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

    // আজকের তারিখ বের করে টেমপ্লেটে দেওয়ার জন্য
    const today = new Date().toISOString().split("T")[0];

    if (batchId) {
      // 📦 ব্যাচ পেজের জন্য মাস্টার/সাব-বক্স টেমপ্লেট
      templateData = [
        {
          "Received Date": today, // 📅 নতুন কলাম
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
          "Received Date": today,
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
      // 🏠 ওয়্যারহাউজের জন্য লুজ মাল টেমপ্লেট
      templateData = [
        {
          Category: "By Sea",
          "Received Date": today, // 📅 নতুন কলাম
          "China Tracking": "YT123456789",
          "Shipping Mark": "JAMAL-01",
          "Customer Name": "Jamal",
          "Product Name": "Shoes",
          "Carton No": "5",
          Quantity: 2,
          "Gross Weight": 30.5,
          L: 40,
          W: 30,
          H: 50,
          "Packaging Cost": 150,
          "Receiving Cost": 50,
          Note: "Fragile items",
        },
        {
          Category: "By Air",
          "Received Date": today,
          "China Tracking": "ZTO987654321",
          "Shipping Mark": "KAMAL-02",
          "Customer Name": "Kamal",
          "Product Name": "Electronics",
          "Carton No": "1",
          Quantity: 5,
          "Gross Weight": 15.0,
          L: 20,
          W: 20,
          H: 20,
          "Packaging Cost": 0,
          "Receiving Cost": 0,
          Note: "",
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

        let isMaster = false;
        let parentCartonNo = "";

        // 📦 ব্যাচ পেজ থেকে আপলোড হলে
        if (batchId) {
          const rawBoxType = String(row["Box Type"] || "").toLowerCase();
          isMaster = rawBoxType !== "sub-box";
          parentCartonNo = String(row["Parent Carton No"] || "");
        }

        // 📅 এক্সেলে ডেট থাকলে নিবে, না থাকলে আজকের ডেট বসিয়ে দিবে (Format: YYYY-MM-DD)
        const defaultDate = new Date().toISOString().split("T")[0];

        // এক্সেল সিরিয়াল ডেট ফরম্যাট ফিক্স করার ছোট লজিক (যদি ক্লায়েন্ট ডেট ফরম্যাট ভুল দেয়)
        let parsedDate = row["Received Date"] || defaultDate;
        if (typeof parsedDate === "number") {
          // Excel Serial Date Conversion
          parsedDate = new Date(Math.round((parsedDate - 25569) * 86400 * 1000))
            .toISOString()
            .split("T")[0];
        }

        return {
          category: row["Category"] || "By Sea",
          chinaTrackingNo:
            row["China Tracking"] || row["Tracking Number"] || "",
          shippingMark: row["Shipping Mark"] || "",
          customerName: row["Customer Name"] || "Unknown",
          productName: row["Product Name"] || "Various Items",
          cartonNo: String(row["Carton No"] || ""),
          quantity: Number(row["Quantity"]) || 1,
          grossWeight: Number(row["Gross Weight"]) || 0,
          length: l,
          width: w,
          height: h,
          cbm: calculatedCbm.toFixed(3),
          packagingCost: Number(row["Packaging Cost"]) || 0,
          receivingCost: Number(row["Receiving Cost"]) || 0,
          note: row["Note"] || "",
          receivedDate: parsedDate, // 📅 নতুন ফিল্ড

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
      const payload = {
        shipments: excelData.map((item) => ({
          ...item,
          status: batchId ? undefined : "Warehouse Received",
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
        style={{ maxWidth: "1050px", width: "95%" }}
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
              fontSize: "24px",
              cursor: "pointer",
              color: "#ef4444",
              fontWeight: "bold",
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
              : "Will be added to the warehouse as loose goods."}
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
            📥 Download {batchId ? "Master/Sub" : "Warehouse"} Format
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
            Click or Drag Excel File Here to Upload
          </p>
        </div>

        {excelData.length > 0 && (
          <div className="preview-section">
            <h3>📊 Data Preview ({excelData.length} items)</h3>
            <div className="table-responsive-container">
              <table className="excel-preview-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Rcv Date</th>
                    <th>Mark</th>
                    <th>Carton</th>
                    {batchId && <th>Type</th>}
                    {batchId && <th>Parent</th>}
                    <th>Qty/Wt</th>
                    <th>CBM</th>
                    {!batchId && <th>Note</th>}
                  </tr>
                </thead>
                <tbody>
                  {excelData.map((row, index) => (
                    <tr
                      key={index}
                      className={row.isMasterCarton ? "master-row" : "sub-row"}
                    >
                      <td>
                        <span className="category-tag">{row.category}</span>
                      </td>
                      <td className="date-col">{row.receivedDate}</td>
                      <td className="bold-col">{row.shippingMark}</td>
                      <td>{row.cartonNo}</td>
                      {batchId && (
                        <>
                          <td>
                            {row.isMasterCarton ? (
                              <span className="type-master">Master</span>
                            ) : (
                              <span className="type-sub">Sub-box</span>
                            )}
                          </td>
                          <td>{row.parentCartonNo || "-"}</td>
                        </>
                      )}
                      <td>
                        {row.quantity} Pcs / {row.grossWeight} kg
                      </td>
                      <td className="cbm-col">{row.cbm > 0 ? row.cbm : "-"}</td>
                      {!batchId && (
                        <td className="note-col" title={row.note}>
                          {row.note || "-"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              className="confirm-upload-btn"
              onClick={handleImport}
              disabled={loading}
            >
              {loading
                ? "⏳ Saving Data..."
                : `🚀 Confirm & Save ${excelData.length} Shipments`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
