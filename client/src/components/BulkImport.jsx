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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get("/api/agencies").then((res) => setAgencies(res.data));
    axios.get("/api/batches").then((res) => setBatches(res.data));
  }, []);

  // ✅ টেমপ্লেট ডাউনলোড করার ফাংশন
  const downloadTemplate = () => {
    const templateData = [
      {
        "Shipping Mark": "SKL/RONY",
        "Carton No": "1",
        "Product Name": "glasses",
        "Quantity": 500,
        "Gross Weight": 25.5,
        "L": 55,
        "W": 31,
        "H": 74,
        "Tracking Number": "SF789948847",
        "Customer Name": "Zakir Hossen",
        "Mobile": "01712345678",
        "Received Date": "2026-05-01"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Packing List");
    
    // ফাইলটি ডাউনলোড হবে
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
      
      const mappedData = json.map((row) => ({
        shippingMark: row["Shipping Mark"] || "",
        cartonNo: row["Carton No"] || "",
        productName: row["Product Name"] || "",
        quantity: row["Quantity"] || 1,
        grossWeight: row["Gross Weight"] || 0,
        length: row["L"] || 0,
        width: row["W"] || 0,
        height: row["H"] || 0,
        trackingNumber: row["Tracking Number"] || "",
        customerName: row["Customer Name"] || "Unknown",
        customerMobile: row["Mobile"] || "",
        receivedDate: row["Received Date"] || new Date(),
      }));
      setExcelData(mappedData);
    };

    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!selectedAgency || excelData.length === 0) {
      alert("দয়া করে ব্রাঞ্চ সিলেক্ট করুন এবং ফাইল আপলোড করুন!");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        shipments: excelData,
        agencyId: selectedAgency,
        batchId: selectedBatch,
      };

      const res = await axios.post("/api/shipments/bulk-import", payload);
      alert(res.data.message);
      navigate("/shipment-list");
    } catch (err) {
      alert(err.response?.data?.error || "ইম্পোর্ট করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bulk-import-container">
      <div className="import-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>🚀 Excel Packing List Importer</h2>
          {/* ✅ ডাউনলোড বাটন */}
          <button 
            onClick={downloadTemplate}
            style={{ background: '#34495e', color: 'white', padding: '8px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '12px' }}
          >
            📥 Download Format
          </button>
        </div>
        
        <div className="setup-section">
          <div className="input-group">
            <label>Select Branch (ব্রাঞ্চ সিলেক্ট করুন) *</label>
            <select value={selectedAgency} onChange={(e) => setSelectedAgency(e.target.value)} required>
              <option value="">-- Choose Branch --</option>
              {agencies.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label>Assign to Batch (ফ্লাইট/ব্যাচ)</label>
            <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
              <option value="">-- No Batch --</option>
              {batches.map((b) => <option key={b._id} value={b._id}>{b.batchName}</option>)}
            </select>
          </div>
        </div>

        <div className="upload-area">
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <p>এক্সেল ফাইলটি এখানে ড্র্যাগ করে ছাড়ুন অথবা সিলেক্ট করুন</p>
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
                    <th>Tracking (China)</th>
                  </tr>
                </thead>
                <tbody>
                  {excelData.slice(0, 10).map((row, index) => (
                    <tr key={index}>
                      <td>{row.shippingMark}</td>
                      <td>{row.cartonNo}</td>
                      <td>{row.productName}</td>
                      <td>{row.quantity}</td>
                      <td>{row.grossWeight} kg</td>
                      <td>{row.trackingNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {excelData.length > 10 && <p className="more-text">...and {excelData.length - 10} more rows</p>}
            </div>
            <button className="import-btn" onClick={handleImport} disabled={loading}>
              {loading ? "Importing..." : `Confirm & Save ${excelData.length} Shipments`}
            </button>
          </div>
        )}
      </div>

      <style>{`
        .bulk-import-container { padding: 30px; background: #f4f7fa; min-height: 100vh; display: flex; justify-content: center; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .import-card { background: white; padding: 30px; border-radius: 20px; width: 100%; max-width: 950px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); border-top: 6px solid #003580; }
        .setup-section { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin: 25px 0; }
        .input-group label { display: block; font-weight: bold; margin-bottom: 8px; color: #34495e; font-size: 14px; }
        select { width: 100%; padding: 12px; border: 1.5px solid #ddd; border-radius: 8px; outline: none; }
        .upload-area { border: 2px dashed #003580; padding: 40px; border-radius: 12px; text-align: center; background: #f8fbff; cursor: pointer; transition: 0.3s; }
        .upload-area:hover { background: #eef5ff; border-color: #2980b9; }
        .preview-section { margin-top: 35px; border-top: 1px solid #eee; padding-top: 25px; }
        .table-wrapper { overflow-x: auto; max-height: 350px; margin-bottom: 20px; border-radius: 10px; border: 1px solid #eee; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #003580; color: white; padding: 12px; text-align: left; font-size: 13px; position: sticky; top: 0; z-index: 5; }
        td { padding: 12px; border-bottom: 1px solid #f1f1f1; font-size: 13px; color: #2c3e50; }
        .import-btn { width: 100%; padding: 18px; background: #27ae60; color: white; border: none; border-radius: 10px; font-size: 18px; font-weight: bold; cursor: pointer; transition: 0.3s; box-shadow: 0 5px 15px rgba(39, 174, 96, 0.2); }
        .import-btn:hover { background: #2ecc71; transform: translateY(-3px); }
        .import-btn:disabled { background: #bdc3c7; transform: none; }
      `}</style>
    </div>
  );
}