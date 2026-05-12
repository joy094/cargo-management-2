import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import CanAccess from "./CanAccess";

export default function AddBranch() {
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    branchName: "",
    shippingMark: "",
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);

  // Edit এর জন্য নতুন স্টেট
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await axios.get("/api/branches");
      if (res.data.success) {
        setBranches(res.data.branches);
      }
    } catch (error) {
      console.error("Failed to fetch branches", error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.branchName || !formData.shippingMark) {
      return alert("Branch Name এবং Shipping Mark অবশ্যই দিতে হবে!");
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        shippingMark: formData.shippingMark.toUpperCase(),
      };

      if (isEditing) {
        // Edit API Call
        const res = await axios.put(`/api/branches/${editId}`, payload);
        if (res.data.success) alert("ব্রাঞ্চ সফলভাবে আপডেট হয়েছে!");
      } else {
        // Create API Call
        const res = await axios.post("/api/branches", payload);
        if (res.data.success) alert("ব্রাঞ্চ সফলভাবে যুক্ত হয়েছে!");
      }

      // ফর্ম রিসেট এবং ডেটা রিফ্রেশ
      resetForm();
      fetchBranches();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "ডেটা সেভ করতে সমস্যা হয়েছে!");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (branch) => {
    setFormData({
      branchName: branch.branchName,
      shippingMark: branch.shippingMark,
      phone: branch.phone || "",
      address: branch.address || "",
    });
    setIsEditing(true);
    setEditId(branch._id);
  };

  const resetForm = () => {
    setFormData({ branchName: "", shippingMark: "", phone: "", address: "" });
    setIsEditing(false);
    setEditId(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই ব্রাঞ্চটি ডিলিট করতে চান?"))
      return;
    try {
      await axios.delete(`/api/branches/${id}`);
      fetchBranches();
    } catch (error) {
      alert("ডিলিট করতে সমস্যা হয়েছে!");
    }
  };

  return (
    <div className="manage-branch-container">
      <div className="header-section">
        <h2>🏢 Branch & Customer Management</h2>
        <p>
          একই পেজ থেকে কাস্টমার যুক্ত করুন, এডিট করুন এবং তাদের প্রোফাইল দেখুন
        </p>
      </div>

      <div className="content-grid">
        {/* Left Side: Form */}
        <div className="form-card">
          <h3>{isEditing ? "✏️ Edit Branch" : "➕ Add New Branch"}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Branch / Customer Name *</label>
              <input
                type="text"
                name="branchName"
                value={formData.branchName}
                onChange={handleInputChange}
                placeholder="e.g. Jamal Traders"
                required
              />
            </div>
            <div className="form-group">
              <label>Shipping Mark (Unique) *</label>
              <input
                type="text"
                name="shippingMark"
                value={formData.shippingMark}
                onChange={handleInputChange}
                placeholder="e.g. JAMAL"
                required
                style={{ textTransform: "uppercase" }}
                disabled={isEditing} // এডিট করার সময় শিপিং মার্ক চেঞ্জ করা বন্ধ রাখা ভালো
                title={isEditing ? "শিপিং মার্ক পরিবর্তন করা যাবে না" : ""}
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="e.g. 017XXXXX..."
              />
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Branch Location..."
                rows="3"
              />
            </div>

            <div className="form-actions">

              <CanAccess module="branch" action={isEditing ? "edit" : "create"}>
              <button
                type="submit"
                className={`submit-btn ${isEditing ? "update-btn" : ""}`}
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : isEditing
                    ? "💾 Update Data"
                    : "➕ Save Branch"}
              </button>
              </CanAccess>
              {isEditing && (
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={resetForm}
                >
                  ✖ Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Side: List */}
        <div className="list-card">
          <div className="list-header">
            <h3>Registered Branches ({branches.length})</h3>
          </div>
          <div className="table-responsive">
            <table className="branch-table">
              <thead>
                <tr>
                  <th>SL</th>
                  <th>Customer Details</th>
                  <th>Shipping Mark</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.length > 0 ? (
                  branches.map((branch, index) => (
                    <tr key={branch._id}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{branch.branchName}</strong>
                        <br />
                        <small className="contact-text">
                          📞 {branch.phone || "N/A"}
                        </small>
                      </td>
                      <td>
                        <span className="mark-badge">
                          {branch.shippingMark}
                        </span>
                      </td>
                      <td className="action-btns">
                        <button
                          className="action-btn profile-btn"
                          onClick={() =>
                            navigate(
                              `/branch-profile?mark=${branch.shippingMark}`,
                            )
                          }
                        >
                          👤 Profile
                        </button>

                        <CanAccess module="branch" action="edit">
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEditClick(branch)}
                            title="Edit Info"
                          >
                            ✏️
                          </button>
                        </CanAccess>

                        <CanAccess module="branch" action="delete">
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete(branch._id)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </CanAccess>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="no-data">
                      কোনো ব্রাঞ্চ এখনো যুক্ত করা হয়নি।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CSS Styles */}
      <style>{`
        .manage-branch-container { padding: 30px; background: #f4f7fa; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .header-section { margin-bottom: 25px; }
        .header-section h2 { margin: 0; color: #0f172a; font-size: 26px; }
        .header-section p { margin: 5px 0 0; color: #64748b; font-size: 14px; }

        .content-grid { display: grid; grid-template-columns: 350px 1fr; gap: 25px; align-items: start; }
        
        .form-card, .list-card { background: white; padding: 25px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); }
        .form-card h3, .list-card h3 { margin: 0 0 20px; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }

        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 6px; }
        .form-group input, .form-group textarea { width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; transition: 0.2s; }
        .form-group input:focus, .form-group textarea:focus { border-color: #0ea5e9; }
        .form-group input:disabled { background: #f1f5f9; cursor: not-allowed; opacity: 0.7; }
        
        .form-actions { display: flex; gap: 10px; margin-top: 15px; }
        .submit-btn { flex: 1; background: #0ea5e9; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .submit-btn:hover { background: #0284c7; }
        .update-btn { background: #f59e0b; }
        .update-btn:hover { background: #d97706; }
        .cancel-btn { background: #f1f5f9; color: #475569; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .cancel-btn:hover { background: #e2e8f0; }

        .list-card { max-height: calc(100vh - 150px); display: flex; flex-direction: column; }
        .table-responsive { overflow-y: auto; flex: 1; padding-right: 5px; }
        .branch-table { width: 100%; border-collapse: collapse; }
        .branch-table th { background: #f8fafc; padding: 15px; text-align: left; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0; position: sticky; top: 0; z-index: 1; }
        .branch-table td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; color: #0f172a; vertical-align: middle; }
        
        .contact-text { color: #64748b; font-size: 12px; font-family: monospace; }
        .mark-badge { background: #e0f2fe; color: #0369a1; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 900; letter-spacing: 1px; }
        
        .action-btns { display: flex; gap: 8px; }
        .action-btn { border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.2s; }
        .profile-btn { background: #8b5cf6; color: white; }
        .profile-btn:hover { background: #7c3aed; }
        .edit-btn { background: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
        .edit-btn:hover { background: #fde68a; }
        .delete-btn { background: #fee2e2; color: #ef4444; }
        .delete-btn:hover { background: #fca5a5; }

        .no-data { text-align: center; color: #64748b; padding: 30px !important; }

        /* Custom Scrollbar for the table */
        .table-responsive::-webkit-scrollbar { width: 6px; }
        .table-responsive::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .table-responsive::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        @media (max-width: 1000px) {
          .content-grid { grid-template-columns: 1fr; }
          .list-card { max-height: none; }
        }
      `}</style>
    </div>
  );
}
