//src/components/BatchDetails.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import SubItemModal from "./SubItemModal";
import EditShipmentModal from "./EditShipmentModal";
import BatchSummary from "./BatchSummary";
import Search from "./Search";
import { QRCodeCanvas } from "qrcode.react";
import CanAccess from "./CanAccess";
import "./BatchDetails.css";
import UploadExcelModal from "./UploadExcelModal";
export default function BatchDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [shipments, setShipments] = useState([]);

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [shipmentToEdit, setShipmentToEdit] = useState(null);

  const [isUploadExcelOpen, setIsUploadExcelOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [isMasterMode, setIsMasterMode] = useState(false); // 👈 নতুন স্টেট
  const [expandedRows, setExpandedRows] = useState({});
  const [bills, setBills] = useState({
    airBill: 0,
    loadUnload: 0,
    customs: 0,
    otherCost: 0,
  });
  // ✅ Exception Handling States
  const [selectedBoxIds, setSelectedBoxIds] = useState([]);
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [allBatches, setAllBatches] = useState([]);
  const [exceptionData, setExceptionData] = useState({
    action: "HOLD",
    reason: "Customs Hold",
    targetBatchId: "",
  });

  // ✅ Checkbox Select Logic
  const handleSelectBox = (id) => {
    setSelectedBoxIds((prev) =>
      prev.includes(id) ? prev.filter((boxId) => boxId !== id) : [...prev, id],
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = displayList.map((s) => s._id);
      setSelectedBoxIds(allIds);
    } else {
      setSelectedBoxIds([]);
    }
  };

  // ✅ Exception Modal Open ও Data Fetch
  const openExceptionModal = async () => {
    try {
      const res = await axios.get("/api/batches");
      // বর্তমান ব্যাচ বাদে বাকিগুলো ফিল্টার করা
      setAllBatches(res.data.filter((b) => b._id !== id));
      setIsExceptionModalOpen(true);
    } catch (err) {
      alert("Failed to load batch list.");
    }
  };

  // ✅ Exception & Push Warehouse Submit Logic
  const handleExceptionSubmit = async () => {
    if (exceptionData.action === "MOVE" && !exceptionData.targetBatchId) {
      return alert("Please select a target batch!");
    }

    try {
      // 🔥 যদি ইউজার Push Warehouse সিলেক্ট করে
      if (exceptionData.action === "PUSH_WAREHOUSE") {
        // সবগুলো সিলেক্টেড বক্সের জন্য আমাদের তৈরি করা পুশ এপিআই-তে রিকোয়েস্ট পাঠানো
        const pushPromises = selectedBoxIds.map((id) =>
          axios.put(`/api/shipments/push-warehouse/${id}`),
        );
        await Promise.all(pushPromises);
        alert("Selected boxes successfully pushed back to warehouse! ↩️");
      }
      // 🔥 অন্যান্য এক্সেপশন (Hold, Release, Move) এর জন্য
      else {
        await axios.put("/api/batches/manage-exception", {
          shipmentIds: selectedBoxIds,
          action: exceptionData.action,
          reason: exceptionData.reason,
          targetBatchId: exceptionData.targetBatchId,
        });
        alert("Action completed successfully!");
      }

      setIsExceptionModalOpen(false);
      setSelectedBoxIds([]); // সিলেকশন ক্লিয়ার করা
      fetchData(); // টেবিল রিফ্রেশ করা
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to complete action. Please try again.",
      );
    }
  };
  const toggleRow = (rowId) =>
    setExpandedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }));

  const [newRows, setNewRows] = useState([
    {
      shippingMark: "",
      productName: "",
      chinaTrackingNo: "",
      cartonNo: "",
      quantity: 1,
      grossWeight: "",
      length: 0,
      width: 0,
      height: 0,
      cbm: 0,
      receivedDate: new Date().toISOString().split("T")[0],
    },
  ]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`/api/batches/${id}`);
      setBatch(res.data.batch);
      setShipments(res.data.shipments);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBatchStatusChange = async (newStatus) => {
    if (!window.confirm(`Change status to "${newStatus}"?`)) return;
    try {
      await axios.put(`/api/batches/${id}/status`, { status: newStatus });
      fetchData();
    } catch (err) {
      alert("Error updating status");
    }
  };

  const handleInputChange = (index, field, value) => {
    const rows = [...newRows];
    rows[index][field] = value;
    if (["length", "width", "height"].includes(field)) {
      const l = Number(rows[index].length) || 0;
      const w = Number(rows[index].width) || 0;
      const h = Number(rows[index].height) || 0;
      rows[index].cbm = ((l * w * h) / 1000000).toFixed(3);
    }
    setNewRows(rows);
  };

  const addNewRow = () => {
    setNewRows([
      ...newRows,
      {
        shippingMark: "",
        productName: "",
        chinaTrackingNo: "",
        cartonNo: "",
        quantity: 1,
        grossWeight: "",
        length: 0,
        width: 0,
        height: 0,
        cbm: 0,
        receivedDate: new Date().toISOString().split("T")[0],
      },
    ]);
  };

  const removeNewRow = (index) => {
    const rows = [...newRows];
    rows.splice(index, 1);
    setNewRows(rows);
  };

  const handleBulkSave = async () => {
    if (newRows.some((r) => !r.shippingMark))
      return alert("Shipping Mark is required!");
    setLoading(true);
    try {
      await axios.post("/api/shipments/bulk-import", {
        shipments: newRows,
        batchId: id,
      });
      setNewRows([
        {
          shippingMark: "",
          productName: "",
          chinaTrackingNo: "",
          cartonNo: "",
          quantity: 1,
          grossWeight: "",
          length: 0,
          width: 0,
          height: 0,
          cbm: 0,
          receivedDate: new Date().toISOString().split("T")[0],
        },
      ]);
      setShowBulkEntry(false);
      fetchData();
    } catch (err) {
      alert("Error saving data");
    } finally {
      setLoading(false);
    }
  };

  const updateWeight = async (shipmentId, val) => {
    try {
      await axios.put(`/api/shipments/${shipmentId}/weight`, {
        actualWeight: parseFloat(val) || 0,
      });
      fetchData();
    } catch (err) {
      alert("Weight update failed");
    }
  };

  // ✅ বিদ্যমান বক্সকে মাস্টার বক্সে রূপান্তর করার ফাংশন
  const handleMakeMasterBox = async () => {
    if (selectedBoxIds.length === 0) {
      return alert("Please select items to make them Master Boxes!");
    }

    if (
      !window.confirm(
        `Are you sure you want to convert ${selectedBoxIds.length} selected item(s) into Master Box(es)?`,
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await axios.put("/api/make-master", {
        shipmentIds: selectedBoxIds,
      });

      if (res.data.success) {
        alert("Successfully converted to Master Box! 📦");
        setSelectedBoxIds([]); // সিলেকশন ক্লিয়ার করা
        fetchData(); // টেবিল রিফ্রেশ করা
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to convert to master box");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBoxIds.length === 0)
      return alert("No items selected! Please select items to delete.");
    if (
      !window.confirm(
        `Are you sure you want to delete the selected ${selectedBoxIds.length} items?`,
      )
    )
      return;

    setLoading(true);
    try {
      // আপনার ব্যাকএন্ডের রাউট অনুযায়ী API কলটি করবেন
      await axios.post("/api/bulk-delete", {
        shipmentIds: selectedBoxIds,
      });
      alert("Selected items successfully deleted! 🗑️");
      setSelectedBoxIds([]); // সিলেক্টেড আইডিগুলো ক্লিয়ার করা
      fetchData(); // টেবিল রিফ্রেশ করা
    } catch (error) {
      alert("Failed to delete items!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (shipmentId, isMaster) => {
    const msg = isMaster
      ? "This is a master box! Deleting it will also delete all its sub-boxes. Are you sure?"
      : "Are you sure you want to delete this parcel?";
    if (!window.confirm(msg)) return;

    try {
      await axios.delete(`/api/shipments/${shipmentId}`);
      fetchData();
    } catch (err) {
      alert("Failed to delete!");
    }
  };

  // ✅ ১. স্মার্ট সার্চ লজিক (null ভ্যালু থাকলেও ক্র্যাশ করবে না)
  const safeLower = (str) => (str ? String(str).toLowerCase() : "");
  const lowerSearch = searchTerm.toLowerCase();

  const matchedShipments = shipments.filter(
    (s) =>
      safeLower(s.shippingMark).includes(lowerSearch) ||
      safeLower(s.chinaTrackingNo).includes(lowerSearch) ||
      safeLower(s.productName).includes(lowerSearch) ||
      safeLower(s.cartonNo).includes(lowerSearch),
  );

  // সার্চ হওয়া মালের প্যারেন্ট আইডিগুলো বের করা
  const matchedParentIds = new Set(
    matchedShipments.filter((s) => s.parentId).map((s) => s.parentId),
  );

  // ফাইনাল লিস্ট: সরাসরি ম্যাচ হওয়া মাল + ম্যাচ হওয়া সাব-বক্সের মাস্টার বক্স
  const finalFilteredList = shipments.filter(
    (s) =>
      matchedShipments.some((ms) => ms._id === s._id) ||
      matchedParentIds.has(s._id),
  );

  // 🔥 সিরিয়াল ঠিক রাখার জন্য পরিবর্তন করা হলো:
  // সাব-বক্সগুলোকে আলাদা করা হলো (যেগুলো মাস্টার বক্সের ভেতরে দেখাবে)
  const subItems = shipments.filter((s) => !s.isMasterCarton && s.parentId);

  // যাদের কোনো প্যারেন্ট নেই (অর্থাৎ মাস্টার বক্স এবং সাধারণ বক্স),
  // তাদেরকে একসাথে রাখা হলো যাতে এক্সেলের অরিজিনাল সিরিয়াল ব্রেক না হয়!
  const displayList = finalFilteredList.filter((s) => !s.parentId);

  // ✅ ২. সার্চ করলে সাব-বক্স অটোমেটিক খোলার লজিক
  useEffect(() => {
    if (searchTerm.trim() !== "") {
      const parentsToExpand = matchedShipments
        .filter((s) => !s.isMasterCarton && s.parentId)
        .map((s) => s.parentId);

      if (parentsToExpand.length > 0) {
        setExpandedRows((prev) => {
          const newExpanded = { ...prev };
          parentsToExpand.forEach((pid) => (newExpanded[pid] = true));
          return newExpanded;
        });
      }
    }
  }, [searchTerm, shipments]);

  // ✅ ৩. ক্যালকুলেশন লজিক (টোটাল কোয়ান্টিটি সহ)
  const getCalculatedStats = (shipment) => {
    if (shipment.isMasterCarton) {
      const children = subItems.filter((sub) => sub.parentId === shipment._id);
      if (children.length > 0) {
        const qty = children.reduce(
          (sum, c) => sum + (Number(c.quantity) || 1),
          0,
        );
        const gross = children.reduce(
          (sum, c) => sum + (Number(c.grossWeight) || 0),
          0,
        );
        const actual = children.reduce(
          (sum, c) =>
            sum + (Number(c.actualWeight) || Number(c.grossWeight) || 0),
          0,
        );
        return {
          hasChildren: true,
          qty,
          gross,
          actual,
          missing: gross - actual,
        };
      }
    }
    const gross = Number(shipment.grossWeight) || 0;
    const actual = Number(shipment.actualWeight) || gross;
    const qty = Number(shipment.quantity) || 1;
    return { hasChildren: false, qty, gross, actual, missing: gross - actual };
  };

  let totalGross = 0,
    totalActual = 0,
    totalQuantity = 0; // ✅ কোয়ান্টিটি ভেরিয়েবল
  const totalCbm = displayList.reduce(
    (sum, s) => sum + (Number(s.cbm) || 0),
    0,
  );

  displayList.forEach((s) => {
    const stats = getCalculatedStats(s);
    totalGross += stats.gross;
    totalActual += stats.actual;
    totalQuantity += stats.qty; // ✅ কোয়ান্টিটি যোগ হচ্ছে
  });

  const exportToExcel = () => {
    const excelData = [];
    displayList.forEach((s, idx) => {
      const stats = getCalculatedStats(s);
      excelData.push({
        SL: idx + 1,
        "Tracking (China)": s.chinaTrackingNo || "-",
        "Shipping Mark": s.shippingMark,
        Product: s.productName || "-",
        "Carton No": s.cartonNo || "-",
        Quantity: stats.qty,
        "China Wt (KG)": stats.gross.toFixed(2),
        "Office Wt (KG)": stats.actual.toFixed(2),
        "Missing (KG)": stats.missing > 0 ? stats.missing.toFixed(2) : 0,
        CBM: s.cbm || 0,
        Status: s.status,
        Type: s.isMasterCarton ? "Master Box" : "General",
      });

      if (s.isMasterCarton) {
        subItems
          .filter((sub) => sub.parentId === s._id)
          .forEach((sub, subIdx) => {
            const subActual =
              Number(sub.actualWeight) || Number(sub.grossWeight) || 0;
            excelData.push({
              SL: `  ↪ ${idx + 1}.${subIdx + 1}`,
              "Tracking (China)": sub.chinaTrackingNo || "-",
              "Shipping Mark": sub.shippingMark,
              Product: sub.productName || "-",
              "Carton No": "-",
              Quantity: sub.quantity || 1,
              "China Wt (KG)": (Number(sub.grossWeight) || 0).toFixed(2),
              "Office Wt (KG)": subActual.toFixed(2),
              "Missing (KG)":
                (Number(sub.grossWeight) || 0) - subActual > 0
                  ? ((Number(sub.grossWeight) || 0) - subActual).toFixed(2)
                  : 0,
              CBM: "-",
              Status: "-",
              Type: `Sub-box of ${s.cartonNo || "Master"}`,
            });
          });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shipments");
    XLSX.writeFile(workbook, `Batch_${batch?.batchName || "Data"}.xlsx`);
  };

  // ✅ Bulk QR Print Logic
  const handleBulkQRPrint = () => {
    // শুধু মাস্টার বক্স এবং সাধারণ বক্সগুলো (যাদের প্যারেন্ট নেই) ফিল্টার করছি
    const itemsToPrint = displayList.filter((s) => !s.parentId);
    if (itemsToPrint.length === 0) {
      return alert("প্রিন্ট করার মতো কোনো বক্স নেই!");
    }

    let printHtml = `
      <html>
        <head>
          <title>Bulk Print QR Codes</title>
          <style>
            body { font-family: 'Arial', sans-serif; text-align: center; margin: 0; padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
            .sticker { padding: 20px; border: 2px dashed #000; border-radius: 10px; page-break-inside: avoid; background: white; }
            h1 { font-size: 40px; margin: 0 0 10px; color: black; font-weight: 900; }
            h2 { font-size: 55px; margin: 15px 0 0; color: black; font-weight: bold; }
            img { width: 220px; height: 220px; }
            @media print { 
              @page { margin: 10mm; } 
              .sticker { border: 1px solid #ccc; break-inside: avoid; } 
            }
          </style>
        </head>
        <body>
    `;

    itemsToPrint.forEach((item) => {
      const qrLink = `${window.location.origin}/box-details/${item._id}`;
      // Canvas রেন্ডারিং ঝামেলা এড়াতে আমরা সরাসরি লাইভ QR API ব্যবহার করছি
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrLink)}`;

      printHtml += `
        <div class="sticker">
          <h1>${item.shippingMark}</h1>
          <img src="${qrImageUrl}" alt="QR Code" crossorigin="anonymous" />
          <h2>Carton: ${item.cartonNo || "-"}</h2>
        </div>
      `;
    });

    printHtml += `
          <script>
            // সব ছবি লোড হওয়ার জন্য ২ সেকেন্ড সময় দিচ্ছি
            setTimeout(() => { window.print(); }, 2000);
            window.onafterprint = () => { window.close(); };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  const isLocked = batch?.status === "Arrived" || batch?.status === "Delivered";

  return (
    <div className="modern-batch-container">
      <div className="dashboard-header">
        <div className="batch-meta">
          <span className="batch-tag">FLIGHT BATCH</span>
          <h1>{batch?.batchName}</h1>
        </div>
        <div className="status-control">
          <select
            value={batch?.status}
            onChange={(e) => handleBatchStatusChange(e.target.value)}
            className={`status-select-box ${batch?.status?.toLowerCase().replace(" ", "-")}`}
          >
            {[
              "Warehouse Received",
              "Processing",
              "Ready to Ship",
              "Dispatched",
              "In-Transit",
              "Customs Clearing",
              "Arrived",
              "Delivered",
            ].map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="main-card">
        <div className="toolbar">
          {/* ✅ আলাদা করা সার্চ কম্পোনেন্ট */}
          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <div className="action-btns">
            {/* ✅ নতুন Upload Excel বাটন */}
            <CanAccess module="batch" action="create">
              <button
                className="excel-btn"
                style={{
                  background: "#10b981",
                  color: "white",
                  borderColor: "#059669",
                }}
                onClick={() => setIsUploadExcelOpen(true)}
              >
                📤 Upload Excel
              </button>
            </CanAccess>

            {/* ✅ নতুন Bulk Delete বাটন */}

            <CanAccess module="batch" action="delete">
              {selectedBoxIds.length > 0 && (
                <button
                  className="bulk-toggle-btn"
                  style={{
                    background: "#ef4444",
                    color: "white",
                    marginLeft: "10px",
                  }}
                  onClick={handleBulkDelete}
                >
                  🗑️ Delete Selected ({selectedBoxIds.length})
                </button>
              )}
            </CanAccess>
            {/* ✅ নতুন Manage Exception বাটন (যখন বক্স সিলেক্ট করা হবে তখন দেখাবে) */}
            {selectedBoxIds.length > 0 && (
              <button
                className="bulk-toggle-btn"
                style={{ background: "#ef4444", color: "white" }}
                onClick={openExceptionModal}
              >
                ⚠️ Manage Exceptions ({selectedBoxIds.length})
              </button>
            )}

            {/* ✅ Make Master Box Button */}
            {selectedBoxIds.length > 0 && (
              <CanAccess module="shipment" action="edit">
                <button
                  className="bulk-toggle-btn"
                  style={{
                    background: "#0284c7",
                    color: "white",
                    marginLeft: "10px",
                  }}
                  onClick={handleMakeMasterBox}
                  disabled={loading}
                >
                  📦 Make Master ({selectedBoxIds.length})
                </button>
              </CanAccess>
            )}

            {/* ✅ নতুন Bulk QR Print বাটন */}
            <button className="bulk-qr-btn" onClick={handleBulkQRPrint}>
              🖨️ Bulk Print QR
            </button>
            <button className="excel-btn" onClick={exportToExcel}>
              📊 Export Excel
            </button>
            {!isLocked && (
              <CanAccess module="shipment" action="create">
                <button
                  className={`bulk-toggle-btn ${showBulkEntry ? "active" : ""}`}
                  onClick={() => setShowBulkEntry(!showBulkEntry)}
                >
                  {showBulkEntry ? "Close Entry" : "📥 Bulk Entry"}
                </button>
              </CanAccess>
            )}
          </div>
        </div>

        {/* ✅ আপনার কোডে এই ফর্মটুকু মিসিং ছিল, তাই বাটনে ক্লিক করলে হাইড দেখাচ্ছিল */}
        {showBulkEntry && (
          <div className="bulk-entry-panel">
            <div className="table-scroll-wrapper">
              <table className="bulk-table">
                <thead>
                  <tr>
                    <th>Tracking No(CN)</th>
                    <th>Shipping Mark*</th>
                    <th>Product</th>
                    <th>Carton No</th>
                    <th>Qty</th>
                    <th>Wt(KG)</th>
                    <th>L</th>
                    <th>W</th>
                    <th>H</th>
                    <th>CBM</th>
                    <th>Received Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {newRows.map((row, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          value={row.chinaTrackingNo}
                          onChange={(e) =>
                            handleInputChange(
                              index,
                              "chinaTrackingNo",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.shippingMark}
                          onChange={(e) =>
                            handleInputChange(
                              index,
                              "shippingMark",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.productName}
                          onChange={(e) =>
                            handleInputChange(
                              index,
                              "productName",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="small-input"
                          value={row.cartonNo}
                          onChange={(e) =>
                            handleInputChange(index, "cartonNo", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="small-input"
                          value={row.quantity}
                          onChange={(e) =>
                            handleInputChange(index, "quantity", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="small-input"
                          value={row.grossWeight}
                          onChange={(e) =>
                            handleInputChange(
                              index,
                              "grossWeight",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="dim-input"
                          value={row.length}
                          onChange={(e) =>
                            handleInputChange(index, "length", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="dim-input"
                          value={row.width}
                          onChange={(e) =>
                            handleInputChange(index, "width", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="dim-input"
                          value={row.height}
                          onChange={(e) =>
                            handleInputChange(index, "height", e.target.value)
                          }
                        />
                      </td>
                      <td className="cbm-text">{row.cbm}</td>
                      <td>
                        <input
                          type="date"
                          value={row.receivedDate}
                          onChange={(e) =>
                            handleInputChange(
                              index,
                              "receivedDate",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="center-cell">
                        {newRows.length > 1 && (
                          <button
                            className="remove-row-btn"
                            onClick={() => removeNewRow(index)}
                          >
                            ✖
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bulk-footer">
              <button className="add-row-btn" onClick={addNewRow}>
                + Add New Row
              </button>
              <button className="save-all-btn" onClick={handleBulkSave}>
                {loading ? "Saving..." : "Save All Items"}
              </button>
            </div>
          </div>
        )}

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      displayList.length > 0 &&
                      selectedBoxIds.length === displayList.length
                    }
                  />
                </th>
                <th>SL</th>
                <th>Tracking (China)</th>
                <th>Shipping Mark</th>
                <th>Product</th>
                <th>Carton No</th>
                <th>Quantity</th>
                <th>China Wt.</th>
                <th>Office Wt. (Edit)</th>
                <th>CBM</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map((s, idx) => {
                const stats = getCalculatedStats(s);
                return (
                  <React.Fragment key={s._id}>
                    <tr
                      className={`${s.isMasterCarton ? "master-row" : ""} ${s.isHeld ? "held-row" : ""}`}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedBoxIds.includes(s._id)}
                          onChange={() => handleSelectBox(s._id)}
                        />
                      </td>
                      <td>{idx + 1}</td>
                      <td className="tracking-cell">
                        {s.chinaTrackingNo || "-"}
                      </td>
                      <td className="mark-cell">
                        {s.isMasterCarton && (
                          <button
                            onClick={() => toggleRow(s._id)}
                            className="expand-btn"
                          >
                            {expandedRows[s._id] ? "▼" : "▶"}
                          </button>
                        )}
                        {s.shippingMark}
                        {s.isHeld && (
                          <span
                            style={{
                              background: "#ef4444",
                              color: "white",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "10px",
                              marginLeft: "5px",
                              fontWeight: "bold",
                            }}
                          >
                            🛑 {s.exceptionStatus}
                          </span>
                        )}
                      </td>
                      <td className="product-name-cell">
                        {s.productName || "-"}
                      </td>
                      <td>{s.cartonNo || "-"}</td>
                      <td>
                        <strong>{stats.qty}</strong>
                      </td>
                      <td>
                        <strong>{stats.gross.toFixed(2)}</strong> KG
                      </td>
                      <td>
                        {stats.hasChildren ? (
                          <div className="calculated-weight-box">
                            <strong>{stats.actual.toFixed(2)}</strong> KG
                            {stats.missing > 0 && (
                              <span className="missing-alert">
                                Missing: {stats.missing.toFixed(2)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <input
                            type="number"
                            defaultValue={stats.actual}
                            onBlur={(e) => updateWeight(s._id, e.target.value)}
                            className={
                              isLocked ? "input-disabled" : "input-editable"
                            }
                          />
                        )}
                      </td>
                      <td className="cbm-badge">{s.cbm || 0}</td>

                      <td>
                        <div style={{ display: "flex", gap: "5px" }}>
                          <CanAccess module="shipment" action="create">
                            <button
                              onClick={() => {
                                setSelectedMaster(s);
                                setIsSubModalOpen(true);
                              }}
                              className="add-sub-btn"
                            >
                              📦+Sub
                            </button>
                          </CanAccess>
                          <CanAccess module="batch" action="edit">
                            <button
                              onClick={() => {
                                setShipmentToEdit(s);
                                setIsEditModalOpen(true);
                              }}
                              className="edit-btn"
                            >
                              ✏️
                            </button>
                          </CanAccess>
                          {/* <CanAccess module="batch" action="delete">
                            <button
                              onClick={() =>
                                handleDelete(s._id, s.isMasterCarton)
                              }
                              className="delete-btn"
                            >
                              🗑️
                            </button>
                          </CanAccess> */}

                          {!s.parentId && (
                            <button
                              onClick={() => {
                                setQrData(s);
                                setIsQrModalOpen(true);
                              }}
                              style={{
                                background: "#8b5cf6",
                                color: "white",
                                border: "none",
                                padding: "6px 10px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                            >
                              🖨️ QR
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedRows[s._id] &&
                      subItems
                        .filter((sub) => sub.parentId === s._id)
                        .map((sub, subIdx) => {
                          // 🔥 subIdx যুক্ত করা হলো সিরিয়ালের জন্য
                          const subActual =
                            Number(sub.actualWeight) ||
                            Number(sub.grossWeight) ||
                            0;
                          const subMissing =
                            (Number(sub.grossWeight) || 0) - subActual;

                          return (
                            <tr
                              key={sub._id}
                              className={`sub-item-row ${sub.isHeld ? "held-row" : ""}`}
                            >
                              {/* 🔥 ১. সাব-বক্সের জন্য চেকবক্স */}
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedBoxIds.includes(sub._id)}
                                  onChange={() => handleSelectBox(sub._id)}
                                />
                              </td>

                              {/* 🔥 ২. সাব-বক্সের সিরিয়াল নাম্বার (যেমন: 1.1, 1.2) */}
                              <td>
                                <span
                                  style={{
                                    fontSize: "12px",
                                    color: "#64748b",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {idx + 1}.{subIdx + 1}
                                </span>
                              </td>

                              <td className="sub-tracking tracking-cell">
                                {sub.chinaTrackingNo || "-"}
                              </td>
                              <td className="sub-mark">
                                ↪️ {sub.shippingMark}
                                {/* 🔥 ৩. সাব-বক্স হোল্ড করা হলে স্ট্যাটাস দেখাবে */}
                                {sub.isHeld && (
                                  <span
                                    style={{
                                      background: "#ef4444",
                                      color: "white",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      fontSize: "10px",
                                      marginLeft: "5px",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    🛑 {sub.exceptionStatus}
                                  </span>
                                )}
                              </td>
                              <td className="product-name-cell">
                                {sub.productName || "-"}
                              </td>
                              <td>-</td>
                              <td>{sub.quantity || 1}</td>
                              <td>{sub.grossWeight || 0} KG</td>
                              <td>
                                <input
                                  type="number"
                                  defaultValue={subActual}
                                  onBlur={(e) =>
                                    updateWeight(sub._id, e.target.value)
                                  }
                                  className={
                                    isLocked
                                      ? "input-disabled"
                                      : "input-editable-small"
                                  }
                                />
                                {subMissing > 0 && (
                                  <span className="sub-missing-alert">
                                    -{subMissing.toFixed(2)}
                                  </span>
                                )}
                              </td>
                              <td className="cbm-badge">-</td>
                              <td>
                                <div style={{ display: "flex", gap: "5px" }}>
                                  <CanAccess module="shipment" action="edit">
                                    <button
                                      onClick={() => {
                                        setShipmentToEdit(sub);
                                        setIsEditModalOpen(true);
                                      }}
                                      className="edit-btn"
                                    >
                                      ✏️
                                    </button>
                                  </CanAccess>
                                  {/* <CanAccess module="batch" action="delete">
                                    <button
                                      onClick={() =>
                                        handleDelete(sub._id, false)
                                      }
                                      className="delete-btn"
                                    >
                                      🗑️
                                    </button>
                                  </CanAccess> */}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <BatchSummary
        totalGross={totalGross}
        totalActual={totalActual}
        totalCbm={totalCbm}
        totalQuantity={totalQuantity} // ✅ Total Quantity পাঠানো হচ্ছে
        bills={bills}
        setBills={setBills}
      />

      <SubItemModal
        isOpen={isSubModalOpen}
        onClose={() => {
          setIsSubModalOpen(false);
          setSelectedMaster(null);
        }}
        masterCarton={selectedMaster}
        onSuccess={fetchData}
      />

      <EditShipmentModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setShipmentToEdit(null);
        }}
        shipment={shipmentToEdit}
        onSuccess={fetchData}
      />

      <UploadExcelModal
        isOpen={isUploadExcelOpen}
        onClose={() => setIsUploadExcelOpen(false)}
        batchId={id}
        onSuccess={fetchData}
      />
      {/* ✅ QR Code Print Modal */}
      {isQrModalOpen && qrData && (
        <div className="fixed-modal-overlay">
          <div
            className="fixed-modal-content"
            style={{ textAlign: "center", width: "320px" }}
          >
            <div
              style={{
                padding: "20px",
                border: "2px dashed #cbd5e1",
                borderRadius: "10px",
                background: "white",
              }}
            >
              <h2
                style={{
                  margin: "0 0 10px",
                  fontSize: "24px",
                  color: "#0f172a",
                }}
              >
                {qrData.shippingMark}
              </h2>

              <QRCodeCanvas
                id="qr-canvas"
                value={`${window.location.origin}/box-details/${qrData._id}`}
                size={200}
                level={"H"}
              />

              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#475569",
                }}
              >
                Carton: {qrData.cartonNo || "-"}
              </p>
            </div>

            <div
              className="modal-footer"
              style={{ marginTop: "20px", justifyContent: "center" }}
            >
              <button
                className="cancel-btn"
                onClick={() => setIsQrModalOpen(false)}
              >
                ✖ Close
              </button>

              <button
                className="save-btn"
                style={{ background: "#8b5cf6" }}
                onClick={() => {
                  const canvas = document.getElementById("qr-canvas");
                  const pngUrl = canvas.toDataURL("image/png");
                  const printWindow = window.open("", "_blank");
                  printWindow.document.write(`
                    <html>
                      <head><title>Print QR</title></head>
                      <body style="text-align: center; font-family: 'Arial', sans-serif; padding-top: 20px;">
                        <h1 style="font-size: 50px; margin-bottom: 10px; color: black;">${qrData.shippingMark}</h1>
                        <img src="${pngUrl}" style="width: 300px; height: 300px;" />
                        <h2 style="font-size: 35px; margin-top: 15px; color: black;">Carton: ${qrData.cartonNo || "-"}</h2>
                        <script>
  setTimeout(() => { window.print(); }, 500);
  window.onafterprint = () => { window.close(); };
</script>
                      </body>
                    </html>
                  `);
                }}
              >
                🖨️ Print Sticker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Exception Management Modal */}
      {isExceptionModalOpen && (
        <div className="fixed-modal-overlay">
          <div className="fixed-modal-content" style={{ width: "400px" }}>
            <h2 style={{ marginBottom: "15px", color: "#0f172a" }}>
              ⚠️ Manage Exception
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#64748b",
                marginBottom: "20px",
              }}
            >
              Total Selected Boxes: <strong>{selectedBoxIds.length}</strong>
            </p>

            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: "bold",
                  marginBottom: "5px",
                }}
              >
                Action Type:
              </label>
              <select
                value={exceptionData.action}
                onChange={(e) =>
                  setExceptionData({ ...exceptionData, action: e.target.value })
                }
                className="filter-input"
                style={{ width: "100%", padding: "10px" }}
              >
                <option value="HOLD">
                  ⏸️ Hold Box (Customs or Other Reasons)
                </option>
                <option value="RELEASE">
                  ▶️ Release Box (Release from Hold)
                </option>

                {/* 🚀 নতুন যুক্ত করা হলো */}
                <option value="PUSH_WAREHOUSE">↩️ Push to Warehouse</option>
                <option value="MOVE">
                  ✈️Move to Another Batch (If Flight Missed)
                </option>
              </select>
            </div>

            {exceptionData.action === "HOLD" && (
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: "bold",
                    marginBottom: "5px",
                  }}
                >
                  Hold Reason:
                </label>
                <input
                  type="text"
                  value={exceptionData.reason}
                  onChange={(e) =>
                    setExceptionData({
                      ...exceptionData,
                      reason: e.target.value,
                    })
                  }
                  className="filter-input"
                  style={{ width: "100%", padding: "10px" }}
                  placeholder="e.g. Customs Hold, Damaged..."
                />
              </div>
            )}

            {exceptionData.action === "MOVE" && (
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: "bold",
                    marginBottom: "5px",
                  }}
                >
                  Select Target Batch:
                </label>
                <select
                  value={exceptionData.targetBatchId}
                  onChange={(e) =>
                    setExceptionData({
                      ...exceptionData,
                      targetBatchId: e.target.value,
                    })
                  }
                  className="filter-input"
                  style={{ width: "100%", padding: "10px" }}
                >
                  <option value="">-- ব্যাচ সিলেক্ট করুন --</option>
                  {allBatches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.batchName} ({b.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div
              className="modal-footer"
              style={{
                marginTop: "25px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                className="cancel-btn"
                onClick={() => setIsExceptionModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="save-btn"
                style={{ background: "#ef4444" }}
                onClick={handleExceptionSubmit}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
