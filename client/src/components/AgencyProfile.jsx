//src/components/AgencyProfile.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function AgencyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [agency, setAgency] = useState(null);
  const [shipments, setShipments] = useState([]); // Hajji -> Shipments
  const [ledger, setLedger] = useState([]);

  /* =============================
      Load Data Function
  ============================== */
  const loadData = async () => {
    try {
      // 1️⃣ Agency info + Shipments under this branch
      const res1 = await axios.get(`/api/agencies/${id}`);
      setAgency(res1.data.agency);
      setShipments(res1.data.shipments || res1.data.hajji || []); // ব্যাকএন্ড কী পরিবর্তন অনুযায়ী অ্যাডজাস্টমেন্ট

      // 2️⃣ Agency/Branch Ledger
      const res2 = await axios.get(`/api/reports/agency-ledger/${id}`);
      setLedger(res2.data);
    } catch (err) {
      console.error("Failed to load branch profile:", err);
      if (err.response && err.response.status === 401) {
        localStorage.clear();
        navigate("/login");
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [id, navigate]);

  /* =============================
      Delete Statement Handler
  ============================== */
  const handleDeleteStatement = async (statementId, statementNo) => {
    const confirmDelete = window.confirm(
      `সতর্কবার্তা!\nআপনি কি নিশ্চিত যে আপনি স্টেটমেন্ট "${statementNo}" ডিলিট করতে চান?\nএটি ডিলিট করলে এই স্টেটমেন্টের সাথে যুক্ত সকল কারগো শিপমেন্টের পেমেন্ট রোলব্যাক হয়ে যাবে।`,
    );

    if (confirmDelete) {
      try {
        await axios.delete(`/api/statements/${statementId}`);
        alert("স্টেটমেন্টটি সফলভাবে ডিলিট করা হয়েছে।");
        loadData();
      } catch (err) {
        alert(err.response?.data?.error || "ডিলিট করতে সমস্যা হয়েছে।");
      }
    }
  };

  if (!agency) return <p className="loading">Loading Branch Data...</p>;

  /* =============================
      Calculations
  ============================== */
  const totalCharge = shipments.reduce((s, sh) => s + (sh.totalCharge || 0), 0);
  const totalPaid = shipments.reduce((s, sh) => s + (sh.paidAmount || 0), 0);
  const totalWeight = shipments.reduce((s, sh) => s + (sh.weight || 0), 0);
  const totalDue = totalCharge - totalPaid;

  const printStatement = () => {
    window.print();
  };

  return (
    <div className="agency-profile">
      <div className="profile-header">
        <h2>{agency.name} – Branch Profile</h2>
        <button className="print-btn" onClick={printStatement}>
          🖨 Print Report
        </button>
      </div>

      {/* ================= SUMMARY CARDS ================= */}
      <div className="summary">
        <div className="card ship-count">
          Total Shipments
          <br />
          <span>{shipments.length}</span>
        </div>
        <div className="card weight">
          Total Weight
          <br />
          <span>{totalWeight.toFixed(2)} KG</span>
        </div>
        <div className="card charge">
          Total Charge
          <br />
          <span>৳ {totalCharge.toLocaleString()}</span>
        </div>
        <div className="card paid">
          Total Paid
          <br />
          <span>৳ {totalPaid.toLocaleString()}</span>
        </div>
        <div className="card due">
          Balance Due
          <br />
          <span>৳ {totalDue.toLocaleString()}</span>
        </div>
      </div>

      {/* ================= SHIPMENT TABLE ================= */}
      <div className="section-header">
        <h3>📦 Shipment List</h3>
      </div>
      <table>
        <thead>
          <tr>
            <th>Tracking No</th>
            <th>Customer</th>
            <th>Item</th>
            <th>Weight</th>

            <th>Total Charge</th>
            <th>Paid</th>
            <th>Due</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {shipments.map((sh) => (
            <tr key={sh._id}>
              <td>
                <strong>{sh.trackingNumber}</strong>
              </td>
              <td>{sh.shipmentLabel || sh.customer?.fullName || "N/A"}</td>
              <td>{sh.itemName}</td>

              <td>{sh.weight} KG</td>
              <td>৳ {sh.totalCharge}</td>
              <td>৳ {sh.paidAmount}</td>
              <td
                className={
                  sh.totalCharge - sh.paidAmount > 0 ? "text-danger" : ""
                }
              >
                ৳ {sh.totalCharge - sh.paidAmount}
              </td>
              <td>
                <span className={`status-badge ${sh.status}`}>{sh.status}</span>
              </td>
            </tr>
          ))}
          {shipments.length === 0 && (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                No Shipments Found for this Branch.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ================= LEDGER ================= */}
      <div className="section-header">
        <h3>🧾 Payment Ledger (Branch Wise)</h3>
      </div>

      {ledger.length === 0 ? (
        <p className="no-data">No payment records found for this branch.</p>
      ) : (
        ledger.map((s) => (
          <div key={s.statementId} className="statement-box">
            <div className="statement-header">
              <div className="statement-info">
                <strong>Statement No:</strong> {s.statementNo} |
                <strong> Mode:</strong> {s.paymentType.toUpperCase()} |
                <strong> Bank Name:</strong> {s.sourceName.toUpperCase()} |
                <strong> Date:</strong>{" "}
                {new Date(s.receivedDate).toLocaleDateString()}
              </div>

              <div className="statement-actions">
                <span className="total-tag">৳ {s.totalAmount}</span>
                <button
                  onClick={() =>
                    handleDeleteStatement(s.statementId, s.statementNo)
                  }
                  className="delete-statement-btn"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>

            <table className="inner-table">
              <thead>
                <tr>
                  <th>Shipment (Tracking)</th>
                  <th>Customer</th>
                  <th>Allocated Amount</th>
                </tr>
              </thead>
              <tbody>
                {s.hajjiList?.map((h, idx) => (
                  <tr key={idx}>
                    <td>{h.trackingNumber || "N/A"}</td>
                    <td>{h.name}</td>
                    <td>৳ {h.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {/* ================= CSS ================= */}
      <style>{`
        .agency-profile { background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 2px 15px rgba(0,0,0,0.05); }
        .profile-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px; }
        .profile-header h2 { margin: 0; color: #2c3e50; }
        
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .card { padding: 20px; border-radius: 10px; color: #fff; text-align: center; font-size: 14px; }
        .card span { font-size: 20px; font-weight: bold; display: block; margin-top: 5px; }
        
        .ship-count { background: #3498db; }
        .weight { background: #9b59b6; }
        .charge { background: #f39c12; }
        .paid { background: #27ae60; }
        .due { background: #e74c3c; }

        .section-header { margin-top: 40px; border-left: 5px solid #3498db; padding-left: 15px; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
        th { background: #f8f9fa; color: #333; padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status-badge.Delivered { background: #d4edda; color: #155724; }
        .status-badge.Booked { background: #fff3cd; color: #856404; }
        
        .statement-box { border: 1px solid #ddd; border-radius: 8px; margin-top: 20px; overflow: hidden; }
        .statement-header { background: #f8f9fa; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
        .total-tag { background: #2c3e50; color: #fff; padding: 5px 12px; border-radius: 20px; font-weight: bold; margin-right: 10px; }
        
        .delete-statement-btn { background: #ff4757; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
        .inner-table { margin: 0; border-radius: 0; }
        .inner-table th { background: #eee; color: #555; }
        
        .text-danger { color: #e74c3c; font-weight: bold; }
        .print-btn { background: #2c3e50; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
        
        @media print {
          .print-btn, .delete-statement-btn { display: none; }
          .agency-profile { box-shadow: none; padding: 0; }
        }
      `}</style>
    </div>
  );
}
