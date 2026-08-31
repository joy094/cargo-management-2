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

  const [errorMessage, setErrorMessage] = useState(""); // 🔥 নতুন এরর স্টেট

  if (!isOpen) return null;

  // 📥 ডায়নামিক টেমপ্লেট ডাউনলোড লজিক
  const downloadTemplate = () => {
    let templateData;
    let fileName;
    const today = new Date().toISOString().split("T")[0];

    if (batchId) {
      templateData = [
        {
          "Received Date": today,
          "Shipping Mark": "SKL-RONY",
          "Carton No": "100",
          "Box Type": "Master",
          "Parent Carton No": "",
          "Product Name": "Garments",
          "Product Type": "General", // 🔥 এই লাইনটি যুক্ত করুন
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
          "Product Type": "Copy", // 🔥 এই লাইনটি যুক্ত করুন
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
      templateData = [
        {
          Category: "By Sea",
          "Received Date": today,
          "China Tracking": "YT123456789",
          "Shipping Mark": "JAMAL-01",
          "Customer Name": "Jamal",
          "Product Name": "Shoes",
          "Product Type": "General", // 🔥 এই লাইনটি যুক্ত করুন
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
          "Product Name": "Shoes",
          "Product Type": "Copy", // 🔥 এই লাইনটি যুক্ত করুন
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


           {
          Category: "By Air",
          "Received Date": today,
          "China Tracking": "ZTO987654322",
          "Shipping Mark": "RONY",
          "Customer Name": "Md Rony",
          "Product Name": "Electronics",
          "Product Type": "Electronics", // 🔥 এই লাইনটি যুক্ত করুন
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

      const mappedData = json.map((row) => {
        const l = Number(row["L"]) || 0;
        const w = Number(row["W"]) || 0;
        const h = Number(row["H"]) || 0;
        const calculatedCbm =
          l > 0 && w > 0 && h > 0 ? (l * w * h) / 1000000 : 0;

        let isMaster = false;
        let parentCartonNo = "";

        if (batchId) {
          const rawBoxType = String(row["Box Type"] || "").toLowerCase();
          isMaster = rawBoxType !== "sub-box";
          parentCartonNo = String(row["Parent Carton No"] || "");
        }

        const defaultDate = new Date().toISOString().split("T")[0];
        let parsedDate = row["Received Date"] || defaultDate;
        if (typeof parsedDate === "number") {
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
          productType: row["Product Type"] || "General", // 🔥 এই নতুন লাইনটি যুক্ত করুন
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
          receivedDate: parsedDate,
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
      // alert(...) এর বদলে এটি দিন
      setErrorMessage(
        err.response?.data?.error ||
          "ইম্পোর্ট করতে কোনো অপ্রত্যাশিত সমস্যা হয়েছে।",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="excel-modal-overlay">
      <div className="excel-modal-container">
        {/* 📌 Header Component */}
        <div className="excel-modal-header">
          <h2>
            {batchId
              ? "🚀 Upload Master & Sub-Boxes"
              : "🏠 Upload Warehouse Shipments"}
          </h2>
          <button className="close-modal-btn" onClick={onClose}>
            ✖
          </button>
        </div>

        {/* 📜 Scrollable Content Area */}
        <div className="excel-modal-body">
          <div className="template-info-row">
            <p>
              {batchId
                ? "বর্তমান ব্যাচে সরাসরি ডাটা যুক্ত হবে।"
                : "Will be added to the warehouse as loose goods."}
            </p>
            <button
              className="download-template-btn"
              onClick={downloadTemplate}
            >
              📥 Download Template
            </button>
          </div>

          {/* Drag & Drop Area */}
          <div className="excel-upload-zone">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
            <p>📁 Click or Drag Excel File Here to Upload</p>
          </div>

          {/* 📊 Preview Section */}
          {excelData.length > 0 && (
            <div className="excel-preview-section">
              <h3>📊 Data Preview ({excelData.length} items)</h3>
              <div className="excel-table-wrapper">
                <table className="excel-preview-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Rcv Date</th>
                      <th>Mark</th>
                      <th>Carton</th>
                      <th>Product Type</th>
                      {batchId && <th>Type</th>}
                      {batchId && <th>Parent</th>}
                      <th>Qty / Weight</th>
                      <th>CBM</th>
                      {!batchId && <th>Note</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {excelData.map((row, index) => (
                      <tr
                        key={index}
                        className={
                          row.isMasterCarton ? "row-master" : "row-sub"
                        }
                      >
                        <td>
                          <span className="badge-category">{row.category}</span>
                        </td>
                        <td className="text-date">{row.receivedDate}</td>
                        <td className="text-bold">{row.shippingMark}</td>
                        <td>{row.cartonNo}</td>
                        <td>
                          <span className="badge-category">
                            {row.productType}
                          </span>
                        </td>{" "}
                        {/* 🔥 এই লাইনটি যুক্ত করুন */}
                        {batchId && (
                          <>
                            <td>
                              <span
                                className={
                                  row.isMasterCarton ? "tag-master" : "tag-sub"
                                }
                              >
                                {row.isMasterCarton ? "Master" : "Sub-box"}
                              </span>
                            </td>
                            <td>{row.parentCartonNo || "-"}</td>
                          </>
                        )}
                        <td>
                          {row.quantity} Pcs / {row.grossWeight} kg
                        </td>
                        <td className="text-cbm">
                          {row.cbm > 0 ? row.cbm : "-"}
                        </td>
                        {!batchId && (
                          <td className="text-note" title={row.note}>
                            {row.note || "-"}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ❌ Error Message Alert */}
        {errorMessage && (
          <div
            style={{
              margin: "0 24px 15px 24px",
              padding: "12px",
              background: "#fee2e2",
              borderLeft: "4px solid #ef4444",
              color: "#b91c1c",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            ⚠️ Upload Failed: {errorMessage}
          </div>
        )}
        {/* 📌 Sticky Footer Action Button */}
        {excelData.length > 0 && (
          <div className="excel-modal-footer">
            <button
              className="excel-save-btn"
              onClick={handleImport}
              disabled={loading}
            >
              {loading
                ? "⏳ Saving Data, Please Wait..."
                : `🚀 Confirm & Save ${excelData.length} Shipments`}
            </button>
          </div>
        )}
      </div>

      {/* 🎨 fully responsive internal CSS */}
      <style>{`
        .excel-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 15px;
        }

        .excel-modal-container {
          background: #ffffff;
          width: 100%;
          max-width: 1100px;
          max-height: 90vh;
          border-radius: 14px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: modalFadeIn 0.3s ease-out;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .excel-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #f1f5f9;
          background: #f8fafc;
        }
        .excel-modal-header h2 { margin: 0; font-size: 1.4rem; color: #0f172a; font-weight: 700; }
        .close-modal-btn { background: none; border: none; fontSize: 22px; cursor: pointer; color: #ef4444; }

        .excel-modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .template-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 15px;
        }
        .template-info-row p { color: #64748b; margin: 0; font-size: 14px; }
        
        .download-template-btn {
          background: #334155; color: white; padding: 10px 16px;
          border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 13px;
          transition: background 0.2s; white-space: nowrap;
        }
        .download-template-btn:hover { background: #1e293b; }

        .excel-upload-zone {
          border: 2px dashed #0284c7; padding: 30px 20px; border-radius: 10px;
          text-align: center; background: #f0f9ff; position: relative; transition: all 0.2s;
        }
        .excel-upload-zone:hover { background: #e0f2fe; border-color: #0369a1; }
        .excel-upload-zone input { position: absolute; width: 100%; height: 100%; top: 0; left: 0; opacity: 0; cursor: pointer; }
        .excel-upload-zone p { color: #0369a1; font-weight: 600; margin: 0; font-size: 15px; }

        .excel-preview-section { margin-top: 25px; }
        .excel-preview-section h3 { margin: 0 0 15px 0; font-size: 1.1rem; color: #1e293b; font-weight: 700; }

        /* 🚀 Dynamic Table Scroll Controller */
        .excel-table-wrapper {
          overflow-x: auto;
          overflow-y: auto;
          max-height: 280px; /* টেবিলটি এখানে স্ক্রল লক হবে */
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
        }

        .excel-preview-table { width: 100%; border-collapse: collapse; white-space: nowrap; text-align: left; }
        
        /* Fixed Headers on Scroll */
        .excel-preview-table thead th {
          position: sticky; top: 0; background: #003580; color: white;
          padding: 12px 14px; font-size: 13px; font-weight: 600; z-index: 5;
        }

        .excel-preview-table tbody td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .excel-preview-table tbody .row-master { background: #ffffff; }
        .excel-preview-table tbody .row-sub { background: #f8fafc; }

        .badge-category { background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; }
        .text-date { font-weight: 600; color: #10b981; }
        .text-bold { font-weight: 700; color: #0f172a; }
        .text-cbm { color: #16a34a; font-weight: 700; }
        .text-note { max-width: 150px; overflow: hidden; text-overflow: ellipsis; color: #64748b; }

        .tag-master { background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .tag-sub { background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }

        .excel-modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .excel-save-btn {
          width: 100%; padding: 14px; background: #16a34a; color: white;
          border: none; border-radius: 8px; font-size: 16px; font-weight: 700;
          cursor: pointer; transition: background 0.2s, transform 0.1s;
          box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.2);
        }
        .excel-save-btn:hover:not(:disabled) { background: #15803d; }
        .excel-save-btn:active:not(:disabled) { transform: scale(0.99); }
        .excel-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* 📱 Responsive Adjustments */
        @media screen and (max-width: 768px) {
          .excel-modal-container { max-height: 95vh; }
          .excel-modal-header { padding: 15px; }
          .excel-modal-header h2 { font-size: 1.1rem; }
          .excel-modal-body { padding: 15px; }
          .template-info-row { flex-direction: column; align-items: flex-start; gap: 10px; }
          .download-template-btn { width: 100%; text-align: center; }
          .excel-table-wrapper { max-height: 220px; } /* ছোট স্ক্রিনে টেবিল স্ক্রল হাইট কমবে */
          .excel-modal-footer { padding: 12px 15px; }
          .excel-save-btn { font-size: 14px; padding: 12px; }
        }
      `}</style>
    </div>
  );
}
