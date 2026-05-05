//src/components/BatchDetails.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import SubItemModal from "./SubItemModal";
import EditShipmentModal from "./EditShipmentModal";
import BatchSummary from "./BatchSummary";

export default function BatchDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [shipments, setShipments] = useState([]);

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [shipmentToEdit, setShipmentToEdit] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [bills, setBills] = useState({
    airBill: 0,
    loadUnload: 0,
    customs: 0,
    otherCost: 0,
  });

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
    if (!window.confirm(`স্ট্যাটাস পরিবর্তন করে "${newStatus}" করবেন?`)) return;
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
      return alert("Shipping Mark অবশ্যই দিতে হবে!");
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

  const handleDelete = async (shipmentId, isMaster) => {
    const msg = isMaster
      ? "এটি একটি মাস্টার বক্স! এটি ডিলিট করলে এর ভেতরের সব সাব-বক্সও ডিলিট হয়ে যাবে। আপনি কি নিশ্চিত?"
      : "আপনি কি এই পার্সেলটি ডিলিট করতে চান?";
    if (!window.confirm(msg)) return;

    try {
      await axios.delete(`/api/shipments/${shipmentId}`);
      fetchData();
    } catch (err) {
      alert("ডিলিট করতে সমস্যা হয়েছে!");
    }
  };

  const filteredList = shipments.filter((s) =>
    s.shippingMark?.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const masterCartons = filteredList.filter((s) => s.isMasterCarton);
  const subItems = filteredList.filter((s) => !s.isMasterCarton && s.parentId);
  const standaloneItems = filteredList.filter(
    (s) => !s.isMasterCarton && !s.parentId,
  );
  const displayList = [...masterCartons, ...standaloneItems];

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
    return {
      hasChildren: false,
      qty: shipment.quantity || 1,
      gross,
      actual,
      missing: gross - actual,
    };
  };

  let totalGross = 0,
    totalActual = 0;
  const totalCbm = displayList.reduce(
    (sum, s) => sum + (Number(s.cbm) || 0),
    0,
  );
  displayList.forEach((s) => {
    const stats = getCalculatedStats(s);
    totalGross += stats.gross;
    totalActual += stats.actual;
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
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="Shipping Mark দিয়ে খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="action-btns">
            <button className="excel-btn" onClick={exportToExcel}>
              📊 Export Excel
            </button>
            {!isLocked && (
              <button
                className={`bulk-toggle-btn ${showBulkEntry ? "active" : ""}`}
                onClick={() => setShowBulkEntry(!showBulkEntry)}
              >
                {showBulkEntry ? "Close Entry" : "📥 Quick Bulk Entry"}
              </button>
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
                    <th>Carton</th>
                    <th>Qty</th>
                    <th>Wt(KG)</th>
                    <th>L</th>
                    <th>W</th>
                    <th>H</th>
                    <th>CBM</th>
                    <th>Date</th>
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
                  <input type="checkbox" />
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
                    <tr className={s.isMasterCarton ? "master-row" : ""}>
                      <td>
                        <input type="checkbox" />
                      </td>
                      <td>{idx + 1}</td>
                      <td>{s.chinaTrackingNo || "-"}</td>
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
                      </td>
                      <td>{s.productName || "-"}</td>
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
                          <button
                            onClick={() => {
                              setSelectedMaster(s);
                              setIsSubModalOpen(true);
                            }}
                            className="add-sub-btn"
                          >
                            📦+Sub
                          </button>
                          <button
                            onClick={() => {
                              setShipmentToEdit(s);
                              setIsEditModalOpen(true);
                            }}
                            className="edit-btn"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(s._id, s.isMasterCarton)
                            }
                            className="delete-btn"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expandedRows[s._id] &&
                      subItems
                        .filter((sub) => sub.parentId === s._id)
                        .map((sub) => {
                          const subActual =
                            Number(sub.actualWeight) ||
                            Number(sub.grossWeight) ||
                            0;
                          const subMissing =
                            (Number(sub.grossWeight) || 0) - subActual;
                          return (
                            <tr key={sub._id} className="sub-item-row">
                              <td></td>
                              <td></td>
                              <td className="sub-tracking">
                                {sub.chinaTrackingNo || "-"}
                              </td>
                              <td className="sub-mark">
                                ↪️ {sub.shippingMark}
                              </td>
                              <td>{sub.productName || "-"}</td>
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
                                  className="input-editable-small"
                                />
                                {subMissing > 0 && (
                                  <span className="sub-missing-alert">
                                    -{subMissing.toFixed(2)}
                                  </span>
                                )}
                              </td>
                              <td>-</td>
                              <td>
                                <div style={{ display: "flex", gap: "5px" }}>
                                  <button
                                    onClick={() => {
                                      setShipmentToEdit(sub);
                                      setIsEditModalOpen(true);
                                    }}
                                    className="edit-btn"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDelete(sub._id, false)}
                                    className="delete-btn"
                                  >
                                    🗑️
                                  </button>
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

      <style>{`
        input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none !important; margin: 0 !important; }
        input[type="number"] { -moz-appearance: textfield !important; }
        
        .modern-batch-container { padding: 30px; background: #f4f7fa; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 25px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 25px; }
        .main-card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .batch-tag { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; }
        .dashboard-header h1 { margin: 10px 0 5px; font-size: 28px; color: #0f172a; }
        .status-select-box { padding: 12px; border-radius: 8px; border: 2px solid #e2e8f0; font-weight: bold; width: 220px; outline: none; }
        
        .master-row { background-color: #e0f2fe !important; border-left: 4px solid #0284c7 !important; transition: 0.3s; }
        .sub-item-row { background-color: #f8fafc; }
        .sub-item-row td { border-left: 2px solid #cbd5e1; font-size: 13px; color: #475569; }
        .sub-mark { padding-left: 30px !important; font-weight: bold; color: #0369a1; font-style: italic; }
        
        .data-table { width: 100%; border-collapse: collapse; white-space: nowrap; }
        .data-table th { text-align: left; padding: 15px; background: #f8fafc; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
        .data-table td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; }
        .mark-cell { color: #0369a1; font-weight: 700; }
        
        .expand-btn { background: none; border: none; cursor: pointer; margin-right: 8px; color: #0ea5e9; font-weight: bold; font-size: 14px; transition: 0.2s; }
        .add-sub-btn { background: #0369a1; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; }
        
        .excel-btn { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: 0.2s; margin-right: 10px; }
        .excel-btn:hover { background: #059669; }
        .edit-btn { background: #f59e0b; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; }
        .delete-btn { background: #ef4444; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; }
        
        .input-editable { width: 75px; padding: 6px; border: 1px solid #16a34a; border-radius: 6px; text-align: center; font-weight: bold; background: white; }
        .input-editable-small { width: 60px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center; font-size: 12px; }
        
        .toolbar { display: flex; justify-content: space-between; margin-bottom: 25px; gap: 15px; }
        .search-wrapper input { padding: 12px 20px; border: 1px solid #e2e8f0; border-radius: 10px; width: 300px; }
        .bulk-toggle-btn { background: #0f172a; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; }
        
        /* ✅ Quick Bulk Entry Panel CSS (আপনার ফাইলে এটি ছিল না) */
        .bulk-entry-panel { background: #f8fafc; padding: 20px; border-radius: 12px; border: 2px dashed #0ea5e9; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .table-scroll-wrapper { overflow-x: auto; width: 100%; }
        .bulk-table { width: 100%; border-collapse: collapse; min-width: 1000px; margin-top: 10px; }
        .bulk-table th { text-align: left; padding: 10px; font-size: 12px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
        .bulk-table td { padding: 8px 5px; }
        .bulk-table input { width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 13px; outline: none; }
        .bulk-table input:focus { border-color: #0ea5e9; }
        .small-input { width: 100% !important; text-align: center; }
        .dim-input { width: 100% !important; text-align: center; background: #fffbeb !important; border-color: #fde68a !important; }
        .cbm-text { font-weight: 800; color: #0284c7; text-align: center; font-size: 14px; }
        .remove-row-btn { background: #fee2e2; color: #ef4444; border: none; width: 25px; height: 25px; border-radius: 50%; cursor: pointer; font-size: 12px; font-weight: bold; }
        .bulk-footer { display: flex; justify-content: space-between; margin-top: 15px; }
        .add-row-btn { background: #fff; border: 2px solid #0f172a; color: #0f172a; padding: 8px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .save-all-btn { background: #16a34a; color: white; border: none; padding: 8px 30px; border-radius: 8px; font-weight: bold; cursor: pointer; }

        .summary-section { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-top: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; } 
        .stat-card { background: #fff; padding: 25px; border-radius: 16px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-bottom: 5px solid #eee; }
        .stat-card.blue { border-color: #3b82f6; }
        .stat-card.green { border-color: #10b981; }
        .stat-card.red { border-color: #ef4444; }
        .stat-card label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; }
        .stat-card .value { font-size: 24px; font-weight: 900; margin-top: 10px; color: #0f172a; }
        .costing-card { background: #0f172a; color: white; padding: 25px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .cost-inputs { display: grid; grid-template-columns: 1fr 1fr 1.5fr; gap: 20px; align-items: center; }
        .cost-box label { display: block; font-size: 11px; opacity: 0.7; margin-bottom: 5px; }
        .cost-box input { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 10px; border-radius: 8px; width: 100%; }
        .total-expense { text-align: right; }
        .total-expense .amt { font-size: 28px; font-weight: 900; color: #22c55e; }
        .avg-cost-bar { margin-top: 20px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 10px; text-align: center; font-size: 15px; border: 1px dashed rgba(255,255,255,0.2); }
        .calculated-weight-box { background: #f1f5f9; padding: 6px; border-radius: 6px; border: 1px dashed #cbd5e1; text-align: center; font-size: 13px; color: #0f172a; }
        .missing-alert, .sub-missing-alert { color: #ef4444; font-size: 11px; font-weight: bold; display: block; margin-top: 2px; }
      `}</style>
    </div>
  );
}
