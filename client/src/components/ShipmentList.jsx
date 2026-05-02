//src/components/ShipmentList.jsx

//src/components/ShipmentList.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function ShipmentList() {
  const [shipments, setShipments] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [batches, setBatches] = useState([]); // ✅ ব্যাচের জন্য স্টেট

  const [filterAgency, setFilterAgency] = useState("");
  const [filterBatch, setFilterBatch] = useState(""); // ✅ ব্যাচ ফিল্টারের স্টেট
  const [searchTerm, setSearchTerm] = useState("");

  const navigate = useNavigate();

  // ১. ব্রাঞ্চ/এজেন্সি લોড করা
  const loadAgencies = async () => {
    try {
      const res = await axios.get("/api/agencies");
      setAgencies(res.data);
    } catch (err) {
      console.error("Error loading agencies:", err);
      if (err.response?.status === 401) handleLogout();
    }
  };

  // ২. ব্যাচ লিস্ট লোড করা (✅ নতুন লজিক)
  const loadBatches = async () => {
    try {
      const res = await axios.get("/api/batches");
      setBatches(res.data);
    } catch (err) {
      console.error("Error loading batches:", err);
    }
  };

  // ৩. সকল শিপমেন্ট লোড করা
  const loadShipments = async () => {
    try {
      const res = await axios.get("/api/shipments");
      let list = Array.isArray(res.data) ? res.data : [];

      // ফিল্টার লজিক (ব্রাঞ্চ অনুযায়ী)
      if (filterAgency) {
        list = list.filter((s) => {
          const agencyId = s.agency?._id || s.agency;
          return String(agencyId) === String(filterAgency);
        });
      }

      // ফিল্টার লজিক (ব্যাচ অনুযায়ী ✅)
      if (filterBatch) {
        list = list.filter((s) => {
          const batchId = s.batch?._id || s.batch;
          return String(batchId) === String(filterBatch);
        });
      }

      // সার্চ লজিক (নাম বা ট্র্যাকিং নম্বর অনুযায়ী)
      if (searchTerm) {
        list = list.filter(
          (s) =>
            s.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.customer?.fullName
              .toLowerCase()
              .includes(searchTerm.toLowerCase()),
        );
      }

      setShipments(list);
    } catch (err) {
      console.error("Error loading shipments:", err);
      if (err.response?.status === 401) handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // কম্পোনেন্ট লোড হওয়ার সময় ব্রাঞ্চ এবং ব্যাচ কল করবে
  useEffect(() => {
    loadAgencies();
    loadBatches(); // ✅ ব্যাচ কল করা হলো
  }, []);

  // ডিপেন্ডেন্সি অ্যারে-তে filterBatch যুক্ত করা হয়েছে ✅
  useEffect(() => {
    loadShipments();
  }, [filterAgency, filterBatch, searchTerm]);

  // ৪. শিপমেন্ট ডিলিট করা
  const deleteShipment = async (id) => {
    if (
      !window.confirm("আপনি কি নিশ্চিত যে এই শিপমেন্ট রেকর্ডটি ডিলিট করতে চান?")
    )
      return;
    try {
      await axios.delete(`/api/shipments/${id}`);
      loadShipments();
    } catch (err) {
      alert("ডিলিট করতে সমস্যা হয়েছে।");
    }
  };

  return (
    <div className="shipment-list">
      <div className="top-bar">
        <h2>📦 Cargo Shipments</h2>
        <button
          className="btn-primary"
          onClick={() => navigate("/shipment/new")}
        >
          + New Shipment
        </button>
      </div>

      <div className="filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by Tracking or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* ✅ ব্যাচ ফিল্টার ড্রপডাউন */}
        <div className="filter-box">
          <label>Batch/Flight:</label>
          <select
            value={filterBatch}
            onChange={(e) => setFilterBatch(e.target.value)}
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.batchName}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-box">
          <label>Branch:</label>
          <select
            value={filterAgency}
            onChange={(e) => setFilterAgency(e.target.value)}
          >
            <option value="">All Branches</option>
            {agencies.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Tracking No</th>
              <th>Customer Name</th>
              <th>Branch</th>
              <th>Item</th>
              <th>Weight</th>
              <th>Shipping Mark</th>
              <th>Box Count</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => (
              <tr key={s._id}>
                <td className="tracking-id">{s.trackingNumber}</td>

                {/* পরিবর্তন এখানে: যদি shipmentLabel থাকে তবে সেটা দেখাবে, না থাকলে মেইন নাম */}
                <td>{s.shipmentLabel || s.customer?.fullName || "Unknown"}</td>

                <td>{s.agency?.name || "-"}</td>
                <td>{s.itemName || "-"}</td>
                <td>{s.weight} KG</td>
                <td>{s.shippingMark || "-"}</td>
                <td>{s.boxCount || "-"}</td>
                <td>৳ {s.totalCharge}</td>
                <td className="paid-amt">৳ {s.paidAmount}</td>
                <td>
                  <span className={`status-tag ${s.status}`}>{s.status}</span>
                </td>
                <td className="actions">
                  <button
                    className="view"
                    onClick={() => navigate(`/shipment-profile/${s._id}`)}
                  >
                    View
                  </button>
                  <button
                    className="edit"
                    onClick={() => navigate(`/shipment/${s._id}`)}
                  >
                    Edit
                  </button>
                  <button
                    className="delete"
                    onClick={() => deleteShipment(s._id)}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}

            {shipments.length === 0 && (
              <tr className="empty-row">
                <td colSpan="11" style={{ textAlign: "center" }}>
                  No shipments found matching criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        :root { --primary: #4834d4; --success: #2ecc71; --warning: #f1c40f; --danger: #eb4d4b; }
        
        .shipment-list { padding: 10px; background: #fff; border-radius: 15px; box-shadow: 0 5px 25px rgba(0,0,0,0.05); }
        .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .top-bar h2 { font-size: 24px; color: #2d3436; }

        .btn-primary { padding: 10px 20px; background: var(--primary); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(72, 52, 212, 0.3); }

        .filter-section { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 10px; align-items: flex-end; }
        .search-box input { padding: 8px 15px; border: 1px solid #ddd; border-radius: 6px; width: 250px; }
        .filter-box { display: flex; flex-direction: column; gap: 5px; }
        .filter-box label { font-size: 13px; font-weight: bold; color: #555; }
        .filter-box select { padding: 8px; border: 1px solid #ddd; border-radius: 6px; min-width: 150px; }

        .table-responsive { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #f1f2f6; padding: 12px; text-align: left; color: #636e72; font-size: 14px; }
        td { padding: 15px 12px; border-bottom: 1px solid #f1f2f6; font-size: 14px; }
        
        .tracking-id { font-weight: bold; color: var(--primary); }
        .paid-amt { color: var(--success); font-weight: 600; }

        .status-tag { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .status-tag.Booked { background: #dff9fb; color: #130f40; }
        .status-tag.Delivered { background: #badc58; color: #2d3436; }
        .status-tag.In-Transit { background: #f9ca24; color: #2d3436; }

        .actions { display: flex; gap: 8px; }
        .actions button { padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px; }
        .view { background: #ebf3ff; color: #007bff; }
        .edit { background: #fff4e0; color: #ff9f43; }
        .delete { background: #ffebeb; color: #ff4757; }

        @media (max-width: 768px) {
          .filter-section { flex-direction: column; align-items: stretch; }
          .search-box input { width: 100%; }
        }
      `}</style>
    </div>
  );
}
