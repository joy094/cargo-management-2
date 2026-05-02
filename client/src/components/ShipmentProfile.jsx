import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

export default function ShipmentProfile() {
  const { id } = useParams();
  const [shipment, setShipment] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredStatement, setHoveredStatement] = useState(null);

  useEffect(() => {
    const fetchShipmentData = async () => {
      try {
        setLoading(true);
        // শিপমেন্টের লেজার এবং পেমেন্ট ডাটা ফেচ করা
        const res = await axios.get(`/api/reports/shipment-ledger/${id}`);
        setShipment(res.data.shipment);
        setPayments(res.data.payments || []);
      } catch (error) {
        console.error("Error fetching Shipment profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchShipmentData();
  }, [id]);

  if (loading)
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>লোড হচ্ছে...</div>
    );

  if (!shipment)
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        শিপমেন্টের তথ্য পাওয়া যায়নি।
      </div>
    );

  const dueAmount = shipment.totalCharge - (shipment.paidAmount || 0);

  return (
    <div style={styles.container}>
      <div style={styles.headerRow} className="no-print">
        <h2 style={styles.title}>📦 Shipment Details</h2>
        <button onClick={() => window.print()} style={styles.printBtn}>
          🖨 Print Invoice / Ledger
        </button>
      </div>

      {/* শিপমেন্ট ইনফরমেশন গ্রিড */}
      <div style={styles.profileGrid}>
        <div style={styles.infoBox}>
          <h4 style={styles.sectionTitle}>👤 Sender (প্রেরক)</h4>
          <p>
            <strong>Name:</strong> {shipment.customer?.fullName}
          </p>
          <p>
            <strong>Mobile:</strong> {shipment.customer?.phoneNumber}
          </p>
          <p>
            <strong>Branch:</strong> {shipment.agency?.name}
          </p>
        </div>

        <div style={styles.infoBox}>
          <h4 style={styles.sectionTitle}>📍 Receiver (প্রাপক)</h4>
          <p>
            <strong>Name:</strong> {shipment.receiverName}
          </p>
          <p>
            <strong>Mobile:</strong> {shipment.receiverMobile}
          </p>
          <p>
            <strong>Address:</strong> {shipment.receiverAddress || "N/A"}
          </p>
        </div>
      </div>

      {/* কারগো স্পেসিফিকেশন */}
      <div style={styles.cargoDetails}>
        <div style={styles.detailItem}>
          <strong>Tracking No:</strong>{" "}
          <span style={styles.trackingText}>{shipment.trackingNumber}</span>
        </div>
        <div style={styles.detailItem}>
          <strong>Item:</strong> {shipment.itemName || "N/A"}
        </div>
        <div style={styles.detailItem}>
          <strong>Weight:</strong> {shipment.weight} KG
          
        </div>
        <div style={styles.detailItem}>
          <strong>Shipping Mark:</strong> {shipment.shippingMark || "N/A"}
        </div>
        <div style={styles.detailItem}>
          <strong>Box Count:</strong> {shipment.boxCount || "N/A"}
        </div>

        <div style={styles.detailItem}>
          <strong>Status:</strong>{" "}
          <span style={{ ...styles.statusBadge, ...styles[shipment.status] }}>
            {shipment.status}
          </span>
        </div>
      </div>

      {/* পেমেন্ট সামারি কার্ডস */}
      <div style={styles.summaryGrid}>
        <div style={styles.packageCard}>
          <strong>Total Charge:</strong> <br />৳ {shipment.totalCharge}
        </div>
        <div style={styles.paidCard}>
          <strong>Total Paid:</strong> <br />৳ {shipment.paidAmount}
        </div>
        <div
          style={{ ...styles.dueCard, color: dueAmount > 0 ? "red" : "green" }}
        >
          <strong>Balance Due:</strong> <br />৳ {dueAmount}
        </div>
      </div>

      {/* পেমেন্ট হিস্ট্রি টেবিল */}
      <h3
        style={{
          marginTop: "40px",
          fontSize: "18px",
          borderBottom: "1px solid #eee",
          paddingBottom: "10px",
        }}
      >
        💳 Payment History
      </h3>
      <table style={styles.table}>
        <thead>
          <tr style={{ backgroundColor: "#f8f9fa" }}>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Statement/Receipt No</th>
            <th style={styles.th}>Payment Method</th>
            <th style={styles.th}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {payments.length > 0 ? (
            payments.map((p) => {
              // গ্রুপ চেক লজিক (একই স্টেটমেন্টে একাধিক শিপমেন্টের পেমেন্ট থাকলে)
              const memberCount = p.statement?.hajjiList?.length || 0;
              const isGroup =
                p.statement?.allocatedAmount > p.amount || memberCount > 1;

              return (
                <tr
                  key={p._id}
                  style={styles.tr}
                  onMouseEnter={() => isGroup && setHoveredStatement(p._id)}
                  onMouseLeave={() => setHoveredStatement(null)}
                >
                  <td style={styles.td}>
                    {new Date(p.paymentDate).toLocaleDateString()}
                  </td>
                  <td style={styles.td}>{p.statement?.statementNo || "N/A"}</td>
                  <td style={{ ...styles.td, position: "relative" }}>
                    <span style={{ textTransform: "capitalize" }}>
                      {p.statement?.paymentType || "N/A"}
                    </span>
                    {isGroup && (
                      <span style={styles.groupBadge}>👥 Multi-Shipment</span>
                    )}

                    {/* হোভার টুলটিপ */}
                    {hoveredStatement === p._id && (
                      <div style={styles.tooltip}>
                        <div style={styles.tooltipHeader}>
                          Allocation Breakdown
                        </div>
                        <div style={styles.tooltipInfo}>
                          Total Statement: ৳ {p.statement?.totalAmount}
                        </div>
                        <table style={styles.innerTable}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #eee" }}>
                              <th style={{ textAlign: "left" }}>
                                Tracking/Name
                              </th>
                              <th style={{ textAlign: "right" }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.statement?.hajjiList?.map((h, i) => (
                              <tr
                                key={i}
                                style={{
                                  backgroundColor:
                                    h.trackingNumber === shipment.trackingNumber
                                      ? "#f0faff"
                                      : "transparent",
                                }}
                              >
                                <td>{h.name}</td>
                                <td style={{ textAlign: "right" }}>
                                  ৳ {h.amount}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </td>
                  <td style={{ ...styles.td, fontWeight: "bold" }}>
                    ৳ {p.amount}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan="4"
                style={{ textAlign: "center", padding: "20px", color: "#999" }}
              >
                No payment records found for this shipment.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <style>{`
        @media print { 
          .no-print { display: none; } 
          body { padding: 0; background: white; }
          #container { box-shadow: none; margin: 0; max-width: 100%; width: 100%; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
    background: "#fff",
    borderRadius: "12px",
    margin: "20px auto",
    maxWidth: "1120px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: { color: "#2c3e50", margin: 0 },
  profileGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginTop: "20px",
  },
  infoBox: {
    padding: "15px",
    border: "1px solid #eee",
    borderRadius: "8px",
    background: "#fcfcfc",
  },
  sectionTitle: {
    margin: "0 0 10px 0",
    fontSize: "14px",
    color: "#007bff",
    borderBottom: "1px solid #eee",
    paddingBottom: "5px",
  },
  cargoDetails: {
    display: "flex",
    justifyContent: "space-between",
    background: "#34495e",
    color: "white",
    padding: "15px",
    borderRadius: "8px",
    marginTop: "20px",
  },
  trackingText: { color: "#f1c40f", fontWeight: "bold", fontSize: "18px" },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "15px",
    marginTop: "20px",
  },
  packageCard: {
    background: "#eef6ff",
    padding: "15px",
    borderRadius: "8px",
    textAlign: "center",
    fontWeight: "bold",
  },
  paidCard: {
    background: "#eafff2",
    padding: "15px",
    borderRadius: "8px",
    textAlign: "center",
    fontWeight: "bold",
    color: "#27ae60",
  },
  dueCard: {
    background: "#fff0f0",
    padding: "15px",
    borderRadius: "8px",
    textAlign: "center",
    fontWeight: "bold",
  },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "15px" },
  th: {
    borderBottom: "2px solid #eee",
    padding: "12px",
    textAlign: "left",
    color: "#666",
    fontSize: "13px",
  },
  td: { borderBottom: "1px solid #f5f5f5", padding: "12px", fontSize: "14px" },
  statusBadge: {
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  Booked: { background: "#f39c12" },
  Delivered: { background: "#2ecc71" },
  "In-Transit": { background: "#3498db" },
  groupBadge: {
    marginLeft: "10px",
    background: "#6c757d",
    color: "white",
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "10px",
  },
  tooltip: {
    position: "absolute",
    top: "100%",
    left: "0",
    background: "white",
    border: "1px solid #ddd",
    padding: "15px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
    zIndex: 10,
    minWidth: "280px",
    borderRadius: "8px",
  },
  tooltipHeader: {
    fontWeight: "bold",
    color: "#007bff",
    marginBottom: "5px",
    fontSize: "12px",
  },
  innerTable: {
    width: "100%",
    fontSize: "11px",
    marginTop: "10px",
    borderCollapse: "collapse",
  },
  printBtn: {
    padding: "10px 20px",
    background: "#2c3e50",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};
