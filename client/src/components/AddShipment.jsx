import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

// ✅ ১. রুট অনুযায়ী পোর্টের লিস্ট
const originPorts = {
  Air: [
    "Guangzhou (CAN)",
    "Hong Kong (HKG)",
    "Shenzhen (SZX)",
    "Beijing (PEK)",
  ],
  Sea: ["Guangzhou Port", "Ningbo Port", "Shanghai Port", "Shenzhen Port"],
  Road: ["Benapole Border", "Burimari Border", "Direct Truck"],
};

export default function AddShipment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [agencies, setAgencies] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    customerName: "",
    customerMobile: "",
    agency: "",
    receiverName: "",
    receiverMobile: "",
    receiverAddress: "",
    productName: "",
    batch: "",
    shippingMark: "",

    chinaTrackingNo: "",
    cartonNo: "",
    quantity: 1,
    length: "",
    width: "",
    height: "",
    cbm: "",

    grossWeight: "",
    boxCount: 1,
    shipmentType: "Air", // এটি রুট ক্যাটাগরি হিসেবে কাজ করবে
    originPort: "", // ✅ নতুন ফিল্ড: অরিজিন পোর্ট
    totalCharge: "",
    status: "Booked",
    notes: "",
  });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [agencyRes, batchRes] = await Promise.all([
          axios.get("/api/agencies"),
          axios.get("/api/batches"),
        ]);
        setAgencies(agencyRes.data);

        const activeBatches = batchRes.data.filter(
          (b) => b.status === "Draft" || b.status === "Loaded",
        );
        setBatches(activeBatches);
      } catch (err) {
        handleError(err);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!id) return;

    const loadShipment = async () => {
      try {
        const res = await axios.get(`/api/reports/shipment-ledger/${id}`);
        const s = res.data.shipment;
        setForm({
          customerName: s.customer?.fullName || "",
          customerMobile: s.customer?.phoneNumber || "",
          agency: s.agency?._id || "",
          receiverName: s.receiverName,
          receiverMobile: s.receiverMobile,
          receiverAddress: s.receiverAddress || "",
          productName: s.productName || "",
          batch: s.batch?._id || s.batch || "",
          shippingMark: s.shippingMark || "",

          chinaTrackingNo: s.chinaTrackingNo || "",
          cartonNo: s.cartonNo || "",
          quantity: s.quantity || 1,
          length: s.dimensions?.length || "",
          width: s.dimensions?.width || "",
          height: s.dimensions?.height || "",
          cbm: s.cbm || "",

          grossWeight: s.grossWeight || "",
          boxCount: s.boxCount || 1,
          shipmentType: s.shipmentType || "Air",
          originPort: s.originPort || "", // ✅ এডিটে পোর্ট লোড করা
          totalCharge: s.totalCharge,
          status: s.status,
          notes: s.notes || "",
        });
      } catch (err) {
        handleError(err);
      }
    };
    loadShipment();
  }, [id]);

  useEffect(() => {
    const l = parseFloat(form.length) || 0;
    const w = parseFloat(form.width) || 0;
    const h = parseFloat(form.height) || 0;

    if (l > 0 && w > 0 && h > 0) {
      const calculatedCbm = (l * w * h) / 1000000;
      setForm((prev) => ({ ...prev, cbm: calculatedCbm.toFixed(3) }));
    }
  }, [form.length, form.width, form.height]);

  const handleError = (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      navigate("/login");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCustomerSearch = async (phone) => {
    if (!phone || phone.length < 11) return;
    try {
      const res = await axios.get(`/api/customers/search/${phone}`);
      if (res.data) {
        const cleanName = res.data.fullName
          .replace(/\s*\(\s*শিপমেন্ট\s*\d+\s*\)/g, "")
          .trim();
        setForm((prev) => ({
          ...prev,
          customerName: `${cleanName} (শিপমেন্ট ${res.data.nextShipmentNumber})`,
          customerMobile: res.data.phoneNumber,
          agency: res.data.agency || prev.agency,
        }));
      }
    } catch (err) {
      const cleanName = form.customerName
        .replace(/\s*\(\s*শিপমেন্ট\s*\d+\s*\)/g, "")
        .trim();
      setForm((prev) => ({
        ...prev,
        customerName: cleanName ? `${cleanName} (শিপমেন্ট 1)` : "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      customerData: {
        fullName: form.customerName || form.shippingMark, // নাম না থাকলে শিপিং মার্ক কাস্টমার নাম হবে
        phoneNumber: form.customerMobile || "", // ফোন নম্বর এখন অপশনাল
      },
      shipmentData: {
        agency: form.agency || null,
        receiverName: form.receiverName,
        receiverMobile: form.receiverMobile,
        receiverAddress: form.receiverAddress,
        productName: form.productName,
        batch: form.batch || null,
        shippingMark: form.shippingMark,

        chinaTrackingNo: form.chinaTrackingNo,
        cartonNo: form.cartonNo,
        quantity: parseInt(form.quantity) || 1,
        dimensions: {
          length: parseFloat(form.length) || 0,
          width: parseFloat(form.width) || 0,
          height: parseFloat(form.height) || 0,
        },
        cbm: parseFloat(form.cbm) || 0,

        grossWeight: parseFloat(form.grossWeight) || 0,
        boxCount: parseInt(form.boxCount) || 1,
        shipmentType: form.shipmentType,
        originPort: form.originPort, // ✅ ব্যাকএন্ডে পোর্ট পাঠানো হচ্ছে
        totalCharge: parseFloat(form.totalCharge) || 0,
        status: form.status,
        notes: form.notes,
      },
    };

    try {
      const url = id ? `/api/shipments/${id}` : "/api/shipments";
      const method = id ? "put" : "post";
      await axios[method](url, payload);
      alert(
        id ? "শিপমেন্ট আপডেট হয়েছে" : "নতুন শিপমেন্ট বুকিং সম্পন্ন হয়েছে",
      );
      navigate("/shipment-list");
    } catch (err) {
      alert(err.response?.data?.error || "সেভ করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shipment-form-container">
      <div className="form-card">
        <h2>{id ? "📝 Edit Shipment" : "📦 New Cargo Booking"}</h2>

        <form onSubmit={handleSubmit}>
          {/* Section 1: Sender */}
          <div className="form-section">
            <h3>👤 Sender Information</h3>
            <div className="grid-2">
              <div>
                {/* ✅ ফোন নম্বর এখন অপশনাল */}
                <label>Sender Mobile (ঐচ্ছিক - থাকলে সার্চ করুন)</label>
                <input
                  name="customerMobile"
                  placeholder="017XXXXXXXX"
                  value={form.customerMobile}
                  onChange={handleChange}
                  onBlur={(e) => handleCustomerSearch(e.target.value)}
                />
              </div>
              <div>
                <label>Sender Name / Shipping Mark *</label>
                <input
                  name="customerName"
                  placeholder="নাম বা শিপিং মার্ক লিখুন"
                  value={form.customerName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <label>Booking Branch/Party *</label>
            <select name="agency" value={form.agency} onChange={handleChange}>
              <option value="">Select Branch</option>
              {agencies.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section 2: Receiver */}
          <div className="form-section">
            <h3>📍 Receiver Information</h3>
            <div className="grid-2">
              <div>
                <label>Receiver Name *</label>
                <input
                  name="receiverName"
                  value={form.receiverName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Receiver Mobile *</label>
                <input
                  name="receiverMobile"
                  value={form.receiverMobile}
                  onChange={handleChange}
                />
              </div>
            </div>
            <label>Delivery Address</label>
            <textarea
              name="receiverAddress"
              value={form.receiverAddress}
              onChange={handleChange}
            />
          </div>

          {/* ✅ Section 3: Route & Port Selection (New Conditional UI) */}
          <div className="form-section highlight-section">
            <h3>✈️ Route & Port Selection</h3>
            <div className="grid-2">
              <div>
                <label>Route Category (শিপমেন্টের মাধ্যম)</label>
                <select
                  name="shipmentType"
                  value={form.shipmentType}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      shipmentType: e.target.value,
                      originPort: "",
                    });
                  }}
                >
                  <option value="Air">🚀 Air Cargo</option>
                  <option value="Sea">🚢 Sea Cargo</option>
                  <option value="Road">🚛 Road / Hand Carry</option>
                </select>
              </div>
              <div>
                <label>{form.shipmentType} Origin Port (লোকেশন)</label>
                <select
                  name="originPort"
                  value={form.originPort}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Select Port/Location --</option>
                  {originPorts[form.shipmentType]?.map((port) => (
                    <option key={port} value={port}>
                      {port}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Cargo & Packing Details */}
          <div className="form-section">
            <h3>⚖️ Cargo & Packing Details</h3>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "#007bff" }}>
                Assign to Flight/Batch (চালান সিলেক্ট করুন)
              </label>
              <select name="batch" value={form.batch} onChange={handleChange}>
                <option value="">
                  কোনো ব্যাচ ছাড়াই বুকিং দিন (Later Assign)
                </option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.batchName} -{" "}
                    {new Date(b.flightDate).toLocaleDateString("bn-BD")}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid-3" style={{ marginBottom: "15px" }}>
              <div>
                <label>China Tracking No</label>
                <input
                  type="text"
                  name="chinaTrackingNo"
                  value={form.chinaTrackingNo}
                  onChange={handleChange}
                  placeholder="যেমন: SF123456"
                  className="highlight-input"
                />
              </div>
              <div>
                <label>Carton No (বক্স নং)</label>
                <input
                  type="text"
                  name="cartonNo"
                  value={form.cartonNo}
                  onChange={handleChange}
                  placeholder="যেমন: 5"
                />
              </div>
              <div>
                <label>Shipping Mark</label>
                <input
                  type="text"
                  name="shippingMark"
                  value={form.shippingMark}
                  onChange={(e) => {
                    // শিপিং মার্ক লিখলে অটোমেটিক কাস্টমার নামেও বসে যাবে যদি নাম ফাঁকা থাকে
                    setForm({
                      ...form,
                      shippingMark: e.target.value,
                      customerName:
                        form.customerName === ""
                          ? e.target.value
                          : form.customerName,
                    });
                  }}
                  placeholder="যেমন: SKL/RONY"
                />
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label>Product Name</label>
                <input
                  type="text"
                  name="productName"
                  value={form.productName}
                  onChange={handleChange}
                  placeholder="যেমন: phone case"
                />
              </div>
              <div>
                <label>Quantity (পিস)</label>
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  className="no-spin"
                />
              </div>
            </div>

            <div className="grid-4" style={{ marginTop: "15px" }}>
              <div>
                <label>Length (cm)</label>
                <input
                  type="number"
                  name="length"
                  value={form.length}
                  onChange={handleChange}
                  className="no-spin"
                  placeholder="L"
                />
              </div>
              <div>
                <label>Width (cm)</label>
                <input
                  type="number"
                  name="width"
                  value={form.width}
                  onChange={handleChange}
                  className="no-spin"
                  placeholder="W"
                />
              </div>
              <div>
                <label>Height (cm)</label>
                <input
                  type="number"
                  name="height"
                  value={form.height}
                  onChange={handleChange}
                  className="no-spin"
                  placeholder="H"
                />
              </div>
              <div>
                <label style={{ color: "#d35400" }}>Total CBM</label>
                <input
                  type="number"
                  name="cbm"
                  value={form.cbm}
                  onChange={handleChange}
                  className="cbm-input no-spin"
                  placeholder="0.000"
                  step="0.001"
                />
              </div>
            </div>

            <div className="grid-2" style={{ marginTop: "15px" }}>
              <div>
                <label>Gross Weight (KG)</label>
                <input
                  type="number"
                  name="grossWeight"
                  className="no-spin"
                  value={form.grossWeight}
                  onChange={handleChange}
                  step="0.01"
                />
              </div>
              <div>
                <label>Total Boxes</label>
                <input
                  type="number"
                  name="boxCount"
                  className="no-spin"
                  value={form.boxCount}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid-2" style={{ marginTop: "15px" }}>
              <div>
                <label>Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="Booked">Booked</option>
                  <option value="In-Transit">In-Transit</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label>Total Charge (Amount) *</label>
                <input
                  type="number"
                  name="totalCharge"
                  className="total-input no-spin"
                  value={form.totalCharge}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-save" disabled={loading}>
            {loading
              ? "Processing..."
              : id
                ? "Update Shipment"
                : "Confirm Booking"}
          </button>
        </form>
      </div>

      <style>{`
        .shipment-form-container { background: #f0f2f5; padding: 30px; min-height: 100vh; display: flex; justify-content: center; }

        .form-card { background: #fff; padding: 25px; border-radius: 12px; width: 100%; max-width: 800px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .form-section { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff; }
        
        /* ✅ নতুন হাইলাইট সেকশনের ডিজাইন */
        .highlight-section { border-left: 4px solid #f39c12 !important; background: #fffdf5 !important; }
        .highlight-section h3 { color: #d35400 !important; }

        h2 { color: #333; margin-bottom: 20px; text-align: center; }
        h3 { font-size: 16px; color: #007bff; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
        .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; }
        
        label { display: block; margin-top: 10px; font-weight: 600; font-size: 13px; color: #555; }
        input, select, textarea { width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
        select:focus { border-color: #007bff; box-shadow: 0 0 8px rgba(0, 123, 255, 0.2); }
        
        .total-input { border: 2px solid #007bff; font-weight: bold; font-size: 18px; color: #007bff; }
        .highlight-input { border: 1px solid #e67e22; background: #fffdfa; }
        .cbm-input { border: 2px solid #e67e22; font-weight: bold; color: #d35400; background: #fffaf0; }
        
        .btn-save { margin-top: 25px; padding: 15px; width: 100%; background: #007bff; color: #fff; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .btn-save:hover { background: #0056b3; }
        .btn-save:disabled { background: #ccc; }
        .no-spin::-webkit-outer-spin-button, .no-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

        @media (max-width: 600px) {
          .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
