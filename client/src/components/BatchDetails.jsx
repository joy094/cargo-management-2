// BatchDetails.jsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function BatchDetails() {
  const { id } = useParams();
  const [batch, setBatch] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [selectedShipments, setSelectedShipments] = useState([]);
  const [targetAgency, setTargetAgency] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const [bills, setBills] = useState({
    airBill: 0,
    loadUnload: 0,
    customs: 0,
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [batchRes, agencyRes] = await Promise.all([
        axios.get(`/api/batches/${id}`),
        axios.get("/api/agencies"),
      ]);
      setBatch(batchRes.data.batch);
      setShipments(batchRes.data.shipments);
      setAgencies(agencyRes.data);
    } catch (err) {
      console.error("ডেটা লোড করতে সমস্যা:", err);
    }
  };

  const toggleSelect = (shipId) => {
    setSelectedShipments((prev) =>
      prev.includes(shipId)
        ? prev.filter((i) => i !== shipId)
        : [...prev, shipId],
    );
  };

  const handleBulkAssign = async () => {
    if (!targetAgency || selectedShipments.length === 0) {
      return alert("দয়া করে মাল সিলেক্ট করুন এবং একটি ব্রাঞ্চ বেছে নিন।");
    }
    setLoading(true);
    try {
      await axios.put("/api/shipments/bulk-assign-agency", {
        shipmentIds: selectedShipments,
        agencyId: targetAgency,
      });
      alert("সফলভাবে ব্রাঞ্চ অ্যাসাইন করা হয়েছে!");
      setSelectedShipments([]);
      fetchData();
    } catch (err) {
      alert("অ্যাসাইন করতে সমস্যা হয়েছে!");
    } finally {
      setLoading(false);
    }
  };

  const updateWeight = async (shipmentId, newValue) => {
    const weight = parseFloat(newValue) || 0;
    try {
      await axios.put(`/api/shipments/${shipmentId}/weight`, {
        actualWeight: weight,
      });
      fetchData();
    } catch (err) {
      console.error(err);
      alert("ওজন আপডেট করা যায়নি!");
    }
  };

  // --- ক্যালকুলেশন লজিক ---
  const totalGrossWeight = shipments.reduce(
    (sum, s) => sum + (Number(s.grossWeight) || 0),
    0,
  );
  const totalActualWeight = shipments.reduce(
    (sum, s) => sum + (Number(s.actualWeight) || 0),
    0,
  );
  const totalCbm = shipments.reduce((sum, s) => sum + (Number(s.cbm) || 0), 0);
  const missingWeight = totalGrossWeight - totalActualWeight;
  const totalInvoiceBill =
    Number(bills.airBill) + Number(bills.loadUnload) + Number(bills.customs);
  const averageCostPerKg =
    totalActualWeight > 0
      ? (totalInvoiceBill / totalActualWeight).toFixed(2)
      : 0;

  const handleBillChange = (e) => {
    setBills({ ...bills, [e.target.name]: e.target.value });
  };

  const filteredList = shipments.filter((s) =>
    s.shippingMark?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="batch-details-page">
      <div className="batch-info-card">
        <h2>✈️ Batch: {batch?.batchName}</h2>
        <p>
          ফ্লাইট তারিখ:{" "}
          {batch?.flightDate
            ? new Date(batch.flightDate).toLocaleDateString("bn-BD")
            : "N/A"}
        </p>
      </div>

      <div className="bulk-action-bar">
        <div className="search-box">
          <input
            placeholder="Shipping Mark দিয়ে সার্চ করুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="assign-box">
          <select
            value={targetAgency}
            onChange={(e) => setTargetAgency(e.target.value)}
          >
            <option value="">ব্রাঞ্চ সিলেক্ট করুন</option>
            {agencies.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
          <button onClick={handleBulkAssign} disabled={loading}>
            {loading
              ? "অ্যাসাইন হচ্ছে..."
              : `নির্বাচিত ${selectedShipments.length} টি মাল অ্যাসাইন করুন`}
          </button>
        </div>
      </div>

      <div className="shipment-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked)
                      setSelectedShipments(filteredList.map((s) => s._id));
                    else setSelectedShipments([]);
                  }}
                />
              </th>
              <th>Shipping Mark</th>
              <th>Tracking (China)</th>
              <th>Product</th>
              <th>China Wt.</th>
              <th>Office Wt. (Edit)</th>
              <th>Current Agency</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((s) => (
              <tr key={s._id} className={s.agency ? "assigned" : "unassigned"}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedShipments.includes(s._id)}
                    onChange={() => toggleSelect(s._id)}
                  />
                </td>
                <td className="mark-text">{s.shippingMark}</td>
                <td>{s.chinaTrackingNo}</td>
                <td>{s.productName || s.itemName || "-"}</td>
                <td>{s.grossWeight || s.weight || 0} KG</td>
                <td>
                  <input
                    type="number"
                    defaultValue={
                      s.actualWeight || s.grossWeight || s.weight || 0
                    }
                    onBlur={(e) => updateWeight(s._id, e.target.value)}
                    className="weight-edit-input"
                  />{" "}
                  KG
                </td>
                <td>
                  {s.agency?.name ? (
                    <span className="badge success">{s.agency.name}</span>
                  ) : (
                    <span className="badge warning">Not Assigned</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="summary-section">
        <div className="weight-summary-grid">
          <div className="sum-card">
            <label>Total China Weight</label>
            <div className="sum-val">{totalGrossWeight.toFixed(2)} KG</div>
          </div>
          <div className="sum-card">
            <label>Total Office Weight</label>
            <div className="sum-val">{totalActualWeight.toFixed(2)} KG</div>
          </div>
          <div className="sum-card">
            <label>Missing Weight</label>
            <div className="sum-val danger-text">
              {missingWeight.toFixed(2)} KG
            </div>
          </div>
          <div className="sum-card">
            <label>Total CBM</label>
            <div className="sum-val info-text">{totalCbm.toFixed(3)} m³</div>
          </div>
        </div>

        <div className="costing-panel">
          <h3>💰 Batch Costing Analysis</h3>
          <div className="costing-grid">
            <div className="input-group">
              <label>Total Air Bill (৳)</label>
              <input
                type="number"
                name="airBill"
                value={bills.airBill}
                onChange={handleBillChange}
              />
            </div>
            <div className="input-group">
              <label>Load-Unload (৳)</label>
              <input
                type="number"
                name="loadUnload"
                value={bills.loadUnload}
                onChange={handleBillChange}
              />
            </div>
            <div className="input-group">
              <label>Customs/VAT (৳)</label>
              <input
                type="number"
                name="customs"
                value={bills.customs}
                onChange={handleBillChange}
              />
            </div>
            <div className="result-card">
              <div className="final-label">Total Expense</div>
              <div className="final-value">৳ {totalInvoiceBill}</div>
            </div>
          </div>

          <div className="avg-cost-banner">
            Average Costing for this Batch:{" "}
            <span>৳ {averageCostPerKg} / KG</span>
          </div>
        </div>
      </div>

      <style>{`
        .batch-details-page { padding: 25px; background: #f8fafc; min-height: 100vh; font-family: sans-serif; }
        .batch-info-card { background: #003580; color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
        .bulk-action-bar { display: flex; justify-content: space-between; background: white; padding: 15px; border-radius: 10px; margin-bottom: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .search-box input { padding: 10px; width: 280px; border: 1px solid #ddd; border-radius: 6px; }
        .assign-box { display: flex; gap: 10px; }
        .assign-box select { padding: 10px; border-radius: 6px; border: 1px solid #ddd; }
        .assign-box button { background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }
        .shipment-table-wrapper { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; padding: 15px; text-align: left; font-size: 13px; color: #475569; }
        td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .weight-edit-input { width: 75px; padding: 6px; border: 1px solid #27ae60; border-radius: 4px; font-weight: bold; text-align: center; }
        .mark-text { font-weight: bold; color: #003580; }
        .badge { padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        .badge.success { background: #dcfce7; color: #166534; }
        .badge.warning { background: #fff7ed; color: #9a3412; }

        .summary-section { margin-top: 35px; border-top: 2px solid #e2e8f0; padding-top: 25px; }
        .weight-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 25px; }
        .sum-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
        .sum-card label { display: block; font-size: 12px; color: #64748b; margin-bottom: 8px; font-weight: bold; text-transform: uppercase; }
        .sum-val { font-size: 22px; font-weight: 800; color: #1e293b; }
        .danger-text { color: #dc2626; }
        .info-text { color: #2563eb; }

        .costing-panel { background: #fff; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .costing-panel h3 { margin: 0 0 20px 0; color: #003580; font-size: 18px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; }
        .costing-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; align-items: end; }
        .input-group label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px; color: #475569; }
        .input-group input { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 16px; font-weight: bold; }
        .result-card { background: #003580; color: white; padding: 18px; border-radius: 10px; text-align: center; }
        .final-label { font-size: 11px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
        .final-value { font-size: 24px; font-weight: bold; margin-top: 4px; }
        .avg-cost-banner { margin-top: 25px; background: #fffbeb; border: 1px dashed #f59e0b; padding: 18px; text-align: center; border-radius: 10px; font-size: 18px; font-weight: bold; }
        .avg-cost-banner span { color: #d97706; font-size: 26px; margin-left: 10px; text-decoration: underline; }
      `}</style>
    </div>
  );
}
