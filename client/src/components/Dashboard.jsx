import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [agencies, setAgencies] = useState([]);
  const [shipments, setShipments] = useState([]); // Hajjis -> Shipments
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    // ব্রাঞ্চ বা এজেন্সি সামারি লোড করা
    axios
      .get("/api/agencies")
      .then((res) => setAgencies(res.data))
      .catch((err) => console.error(err));

    // সকল শিপমেন্ট ডাটা লোড করা
    axios
      .get("/api/shipments")
      .then((res) => setShipments(res.data))
      .catch((err) => console.error(err));

    // সাম্প্রতিক পেমেন্টগুলো লোড করা
    axios
      .get("/api/payments/recent")
      .then((res) => setPayments(res.data))
      .catch((err) => console.error(err));
  }, []);

  // ক্যালকুলেশনস
  const totalShipments = shipments.length;
  const totalBranches = agencies.length;
  const totalWeight = shipments.reduce((s, ship) => s + (ship.weight || 0), 0);
  const totalPaid = shipments.reduce(
    (s, ship) => s + (ship.paidAmount || 0),
    0,
  );
  const totalDue = shipments.reduce(
    (s, ship) => s + (ship.totalCharge - ship.paidAmount),
    0,
  );

  return (
    <div className="dashboard">
      <div className="header-bar">
        <h1>📊 Cargo Business Overview</h1>
        <p>ব্যবসায়িক কার্যক্রমের রিয়েল-টাইম আপডেট</p>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card agencies">
          <h3>BRANCH</h3>
          <p>{totalBranches}</p>
        </div>
        <div className="card shipments">
          <h3>Total Shipments</h3>
          <p>{totalShipments}</p>
        </div>
        <div className="card weight">
          <h3>Total Weight</h3>
          <p>{totalWeight.toFixed(2)} KG</p>
        </div>
        <div className="card paid">
          <h3>Total Collected</h3>
          <p>৳ {totalPaid.toLocaleString()}</p>
        </div>
        <div className="card due">
          <h3>Total Outstanding</h3>
          <p>৳ {totalDue.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid-tables">
        {/* Recent Shipments */}
        <div className="table-container">
          <h2>📦 Recent Bookings</h2>
          <table className="recent-table">
            <thead>
              <tr>
                <th>Tracking</th>
                <th>Sender</th>
                <th>Weight</th>
                <th>Charge</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shipments
                .slice(-5)
                .reverse()
                .map((s) => (
                  <tr key={s._id}>
                    <td>
                      <strong>{s.trackingNumber}</strong>
                    </td>
                    <td>{s.customer?.fullName || "N/A"}</td>
                    <td>{s.weight} KG</td>
                    <td>৳ {s.totalCharge}</td>
                    <td>
                      <span className={`status-pill ${s.status}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Recent Payments */}
        <div className="table-container">
          <h2>💳 Recent Transactions</h2>
          <table className="recent-table">
            <thead>
              <tr>
                <th>Statement No</th>
                <th>Party</th>
                <th>Amount</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {payments
                .slice(-5)
                .reverse()
                .map((p) => (
                  <tr key={p._id}>
                    <td>{p.statement?.statementNo || "N/A"}</td>
                    <td>{p.agency?.name || "-"}</td>
                    <td>৳ {p.amount}</td>
                    <td>{p.statement?.paymentType}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSS STYLES */}
      <style>{`
        .dashboard { max-width: 1200px; margin: 20px auto; padding: 20px; font-family: "Tiro Bangla", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; }
        .header-bar { margin-bottom: 25px; border-left: 5px solid #0d6efd; padding-left: 15px; }
        .header-bar h1 { margin: 0; font-size: 28px; color: #2c3e50; }
        .header-bar p { margin: 5px 0 0; color: #7f8c8d; }

        .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .card { padding: 25px; border-radius: 12px; color: #fff; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1); transition: 0.3s; }
        .card:hover { transform: translateY(-5px); }
        
        .card.agencies { background: linear-gradient(135deg, #3498db, #2980b9); }
        .card.shipments { background: linear-gradient(135deg, #9b59b6, #8e44ad); }
        .card.weight { background: linear-gradient(135deg, #f1c40f, #f39c12); }
        .card.paid { background: linear-gradient(135deg, #2ecc71, #27ae60); }
        .card.due { background: linear-gradient(135deg, #e74c3c, #c0392b); }

        .card h3 { margin: 0; font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
        .card p { margin: 10px 0 0; font-size: 26px; font-weight: bold; }

        .grid-tables { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .table-container { background: #fff; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        h2 { font-size: 18px; color: #34495e; margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px; }

        .recent-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .recent-table th, .recent-table td { padding: 12px; text-align: left; border-bottom: 1px solid #f1f1f1; }
        .recent-table th { color: #7f8c8d; font-weight: 600; }
        
        .status-pill { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; }
        .status-pill.Booked { background: #fff3cd; color: #856404; }
        .status-pill.Delivered { background: #d4edda; color: #155724; }
        .status-pill.In-Transit { background: #d1ecf1; color: #0c5460; }

        @media (max-width: 900px) {
          .grid-tables { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
