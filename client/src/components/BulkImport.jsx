// src/components/BulkImport.jsx

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function BulkImport() {
  const [excelData, setExcelData] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedAgency, setSelectedAgency] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");

  // ✅ গ্লোবাল রুট এবং পোর্ট সেটিংস যুক্ত করা হলো
  const portOptions = {
    Air: ["Guangzhou (CAN)", "Hong Kong (HKG)", "Shenzhen (SZX)"],
    Sea: ["Guangzhou Port", "Ningbo Port", "Shanghai Port"],
    "Hand Carry": ["Special Hand Carry", "Airport Collection"],
  };
  const [selectedRoute, setSelectedRoute] = useState("Air");
  const [selectedPort, setSelectedPort] = useState("Guangzhou (CAN)");

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get("/api/agencies").then((res) => setAgencies(res.data));
    axios.get("/api/batches").then((res) => setBatches(res.data));
  }, []);

  // রুট পরিবর্তন হলে পোর্ট অটোমেটিক আপডেট হবে
  const handleRouteSelect = (e) => {
    const route = e.target.value;
    setSelectedRoute(route);
    setSelectedPort(portOptions[route][0]);
  };

  // ✅ টেমপ্লেট ডাউনলোড আপডেট (সঠিক ফিল্ড নামসহ)
  const downloadTemplate = () => {
    const templateData = [
      {
        "Shipping Mark": "SKL/RONY",
        "Carton No": "1",
        "Product Name": "glasses",
        Quantity: 500,
        "Gross Weight": 25.5,
        L: 55,
        W: 31,
        H: 74,
        "China Tracking": "SF789948847", // আপডেট করা হয়েছে
        "Customer Name": "Zakir Hossen",
        Mobile: "01712345678",
        "Received Date": new Date().toISOString().split("T")[0],
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Packing List");

    XLSX.writeFile(workbook, "cargo_packing_list_template.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const data = event.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet);

      // ✅ এক্সেল ম্যাপিং এবং অটো CBM ক্যালকুলেশন
      const mappedData = json.map((row) => {
        const l = Number(row["L"]) || 0;
        const w = Number(row["W"]) || 0;
        const h = Number(row["H"]) || 0;
        const calculatedCbm = (l * w * h) / 1000000;

        return {
          shippingMark: row["Shipping Mark"] || "",
          cartonNo: row["Carton No"] || "",
          productName: row["Product Name"] || "",
          quantity: row["Quantity"] || 1,
          grossWeight: row["Gross Weight"] || 0,
          length: l,
          width: w,
          height: h,
          cbm: calculatedCbm.toFixed(3), // অটো CBM
          chinaTrackingNo:
            row["China Tracking"] || row["Tracking Number"] || "",
          customerName: row["Customer Name"] || "Unknown",
          customerMobile: row["Mobile"] || "",
          receivedDate: row["Received Date"] || new Date(),
        };
      });
      setExcelData(mappedData);
    };

    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (excelData.length === 0) {
      alert("দয়া করে ব্রাঞ্চ সিলেক্ট করুন এবং ফাইল আপলোড করুন!");
      return;
    }

    setLoading(true);
    try {
      // ডেটা সেভ করার আগে রুট এবং পোর্ট জুড়ে দেওয়া হচ্ছে
      const finalShipments = excelData.map((item) => ({
        ...item,
        shipmentType: selectedRoute,
        originPort: selectedPort,
      }));

      const payload = {
        shipments: finalShipments,
        agencyId: selectedAgency,
        batchId: selectedBatch,
      };

      const res = await axios.post("/api/shipments/bulk-import", payload);
      alert(res.data.message || "সফলভাবে ইমপোর্ট হয়েছে!");
      navigate("/shipment-list");
    } catch (err) {
      alert(err.response?.data?.error || "ইম্পোর্ট করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bulk-import-container">
      <div className="import-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2>🚀 Excel Packing List Importer</h2>
          <button
            onClick={downloadTemplate}
            style={{
              background: "#34495e",
              color: "white",
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            📥 Download Format
          </button>
        </div>

        {/* ✅ গ্লোবাল সেটিংস সেকশন */}
        <div className="setup-section">
          <div className="input-group">
            <label>Select Branch (ব্রাঞ্চ) *</label>
            <select
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value)}
             
            >
              <option value="">-- Choose Branch --</option>
              {agencies.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Assign to Batch (ফ্লাইট/ব্যাচ)</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
            >
              <option value="">-- No Batch (Direct Entry) --</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.batchName}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Route Category (রুট) *</label>
            <select value={selectedRoute} onChange={handleRouteSelect} required>
              <option value="Air">🚀 Air Cargo</option>
              <option value="Sea">🚢 Sea Cargo</option>
              <option value="Hand Carry">💼 Hand Carry</option>
            </select>
          </div>

          <div className="input-group">
            <label>Origin Port (পোর্ট) *</label>
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              required
            >
              {portOptions[selectedRoute].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="upload-area">
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <p>এক্সেল ফাইলটি এখানে ড্র্যাগ করে ছাড়ুন অথবা সিলেক্ট করুন</p>
        </div>

        {excelData.length > 0 && (
          <div className="preview-section">
            <h3>📊 Data Preview ({excelData.length} items found)</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Mark</th>
                    <th>Carton</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Weight</th>
                    <th>L x W x H</th>
                    <th>CBM</th>
                    <th>China Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {excelData.slice(0, 10).map((row, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: "bold", color: "#0369a1" }}>
                        {row.shippingMark}
                      </td>
                      <td>{row.cartonNo}</td>
                      <td>{row.productName}</td>
                      <td>{row.quantity}</td>
                      <td>{row.grossWeight} kg</td>
                      <td style={{ fontSize: "11px", color: "#64748b" }}>
                        {row.length} x {row.width} x {row.height}
                      </td>
                      <td style={{ fontWeight: "bold", color: "#16a34a" }}>
                        {row.cbm}
                      </td>
                      <td>{row.chinaTrackingNo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {excelData.length > 10 && (
                <p className="more-text">
                  ...and {excelData.length - 10} more rows
                </p>
              )}
            </div>
            <button
              className="import-btn"
              onClick={handleImport}
              disabled={loading}
            >
              {loading
                ? "Importing Data..."
                : `Confirm & Save ${excelData.length} Shipments`}
            </button>
          </div>
        )}
      </div>

      <style>{`
        .bulk-import-container { padding: 30px; background: #f4f7fa; min-height: 100vh; display: flex; justify-content: center; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .import-card { background: white; padding: 30px; border-radius: 20px; width: 100%; max-width: 1000px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); border-top: 6px solid #003580; }
        
        /* ✅ সেটিংস গ্রিড আপডেট করা হয়েছে */
        .setup-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 25px 0; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .input-group label { display: block; font-weight: bold; margin-bottom: 8px; color: #475569; font-size: 13px; }
        select { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; font-weight: 600; color: #1e293b; }
        
        .upload-area { border: 2px dashed #0369a1; padding: 40px; border-radius: 12px; text-align: center; background: #f0f9ff; cursor: pointer; transition: 0.3s; position: relative; }
        .upload-area input { position: absolute; width: 100%; height: 100%; top: 0; left: 0; opacity: 0; cursor: pointer; }
        .upload-area p { color: #0369a1; font-weight: bold; font-size: 16px; margin: 0; }
        .upload-area:hover { background: #e0f2fe; border-color: #0284c7; }
        
        .preview-section { margin-top: 35px; border-top: 2px solid #f1f5f9; padding-top: 25px; }
        .preview-section h3 { color: #0f172a; margin-bottom: 15px; }
        .table-wrapper { overflow-x: auto; max-height: 400px; margin-bottom: 20px; border-radius: 10px; border: 1px solid #e2e8f0; }
        table { width: 100%; border-collapse: collapse; white-space: nowrap; }
        th { background: #003580; color: white; padding: 15px; text-align: left; font-size: 13px; position: sticky; top: 0; z-index: 5; }
        td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; }
        .more-text { text-align: center; font-style: italic; color: #64748b; margin-top: 10px; font-weight: bold; }
        
        .import-btn { width: 100%; padding: 18px; background: #16a34a; color: white; border: none; border-radius: 10px; font-size: 18px; font-weight: bold; cursor: pointer; transition: 0.3s; box-shadow: 0 4px 15px rgba(22, 163, 74, 0.2); }
        .import-btn:hover { background: #15803d; transform: translateY(-2px); }
        .import-btn:disabled { background: #94a3b8; cursor: not-allowed; transform: none; }
      `}</style>
    </div>
  );
}
