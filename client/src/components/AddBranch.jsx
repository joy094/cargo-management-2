//src/components/AddBranch.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import CanAccess from "./CanAccess";
import * as XLSX from "xlsx"; // 🔥 এক্সেল রিড করার জন্য

export default function AddBranch() {
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    branchName: "",
    shippingMark: "", // কমা দিয়ে লেখা হবে
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Excel Upload State
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelData, setExcelData] = useState([]);
  const [uploading, setUploading] = useState(false);

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

    // 🔥 কমা দিয়ে ভাগ করে Array তৈরি করা
    const marksArray = formData.shippingMark
      .split(",")
      .map((mark) => mark.trim().toUpperCase())
      .filter((mark) => mark.length > 0);

    if (marksArray.length === 0) {
      return alert("সঠিক শিপিং মার্ক দিন!");
    }

    setLoading(true);
    try {
      const payload = {
        branchName: formData.branchName,
        shippingMarks: marksArray, // Array পাঠানো হচ্ছে
        phone: formData.phone || null,
        address: formData.address,
      };

      if (isEditing) {
        const res = await axios.put(`/api/branches/${editId}`, payload);
        if (res.data.success) alert("ব্রাঞ্চ সফলভাবে আপডেট হয়েছে!");
      } else {
        const res = await axios.post("/api/branches", payload);
        if (res.data.success) alert("ব্রাঞ্চ সফলভাবে যুক্ত হয়েছে!");
      }

      resetForm();
      fetchBranches();
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "ডেটা সেভ করতে সমস্যা হয়েছে!",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (branch) => {
    // 🔥 পুরানো (String) এবং নতুন (Array) দুই ধরনের ডেটাই হ্যান্ডেল করা হলো
    let marksToEdit = "";
    if (branch.shippingMarks && branch.shippingMarks.length > 0) {
      marksToEdit = branch.shippingMarks.join(", ");
    } else if (branch.shippingMark) {
      marksToEdit = branch.shippingMark;
    }

    setFormData({
      branchName: branch.branchName,
      shippingMark: marksToEdit,
      phone: branch.phone || "",
      address: branch.address || "",
    });
    setIsEditing(true);
    setEditId(branch._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      alert("ডিলিট করতে সমস্যা হয়েছে!");
    }
  };

  // ===================== EXCEL LOGIC =====================
  const downloadTemplate = () => {
    const templateData = [
      {
        "Branch/Customer Name": "Jamal Traders",
        "Shipping Marks (Comma Separated)": "JAMAL, JAMAL-VIP, J-SKL",
        Phone: "01711111111",
        Address: "Dhaka, Bangladesh",
      },
      {
        "Branch/Customer Name": "Rony Fashion",
        "Shipping Marks (Comma Separated)": "RONY",
        Phone: "",
        Address: "Chittagong",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Branches");
    XLSX.writeFile(workbook, "branch_upload_template.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      const mappedData = json
        .map((row) => {
          const rawMarks = String(
            row["Shipping Marks (Comma Separated)"] || "",
          );
          const marksArray = rawMarks
            .split(",")
            .map((m) => m.trim().toUpperCase())
            .filter((m) => m);

          return {
            branchName: row["Branch/Customer Name"] || "Unknown",
            shippingMarks: marksArray,
            phone: row["Phone"] || null,
            address: row["Address"] || "",
          };
        })
        .filter((item) => item.shippingMarks.length > 0);

      setExcelData(mappedData);
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkImport = async () => {
    if (excelData.length === 0) return alert("ফাইল আপলোড করুন!");
    setUploading(true);
    try {
      const res = await axios.post("/api/branches/bulk-import", {
        branches: excelData,
      });
      alert(res.data.message || "সফলভাবে আপলোড হয়েছে!");
      setIsExcelModalOpen(false);
      setExcelData([]);
      fetchBranches();
    } catch (error) {
      alert(error.response?.data?.error || "আপলোড করতে সমস্যা হয়েছে!");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="manage-branch-container">
      <div
        className="header-section"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2>🏢 Branch & Customer Management</h2>
          <p>
            একই পেজ থেকে কাস্টমার যুক্ত করুন, এডিট করুন এবং তাদের প্রোফাইল দেখুন
          </p>
        </div>

        <CanAccess module="branch" action="create">
          <button
            onClick={() => setIsExcelModalOpen(true)}
            style={{
              background: "#10b981",
              color: "white",
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            📤 Excel Bulk Upload
          </button>
        </CanAccess>
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
              <label>Shipping Marks (Comma separated) *</label>
              <textarea
                name="shippingMark"
                value={formData.shippingMark}
                onChange={handleInputChange}
                placeholder="e.g. JAMAL, JAMAL-VIP, JAMAL-AIR"
                required
                rows="2"
                style={{ textTransform: "uppercase" }}
              />
              <small style={{ color: "#64748b", fontSize: "11px" }}>
                একাধিক মার্ক থাকলে কমা (,) দিয়ে লিখুন।
              </small>
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
                placeholder="Location..."
                rows="2"
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
                  <th>Shipping Marks</th>
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
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "5px",
                          }}
                        >
                          {/* 🔥 পুরানো এবং নতুন দুই ফরম্যাটের ব্যাজ সাপোর্ট */}
                          {branch.shippingMarks &&
                          branch.shippingMarks.length > 0 ? (
                            branch.shippingMarks.map((mark, i) => (
                              <span key={i} className="mark-badge">
                                {mark}
                              </span>
                            ))
                          ) : branch.shippingMark ? (
                            <span className="mark-badge">
                              {branch.shippingMark}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="action-btns">
                        <button
                          className="action-btn profile-btn"
                          onClick={() => {
                            // প্রোফাইলে যাওয়ার সময় প্রথম মার্কটা নিয়ে যাবে
                            const markToPass =
                              branch.shippingMarks &&
                              branch.shippingMarks.length > 0
                                ? branch.shippingMarks[0]
                                : branch.shippingMark;
                            navigate(`/branch-profile?mark=${markToPass}`);
                          }}
                        >
                          👤
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
                      কোনো ব্রাঞ্চ এখনো যুক্ত করা হয়নি।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ✅ Excel Upload Modal */}
      {isExcelModalOpen && (
        <div
          className="fixed-modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="fixed-modal-content"
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "12px",
              width: "500px",
              maxWidth: "90%",
            }}
          >
            <h3 style={{ marginTop: 0 }}>📤 Bulk Upload Customers</h3>
            <p
              style={{
                color: "#64748b",
                fontSize: "14px",
                marginBottom: "20px",
              }}
            >
              এক ক্লিকে একাধিক ব্রাঞ্চ/কাস্টমার যুক্ত করুন
            </p>

            <button
              onClick={downloadTemplate}
              style={{
                width: "100%",
                background: "#34495e",
                color: "white",
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                marginBottom: "20px",
                fontWeight: "bold",
              }}
            >
              📥 1. Download Excel Format
            </button>

            <div
              style={{
                border: "2px dashed #0ea5e9",
                padding: "20px",
                textAlign: "center",
                borderRadius: "8px",
                background: "#f0f9ff",
                position: "relative",
              }}
            >
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  top: 0,
                  left: 0,
                  opacity: 0,
                  cursor: "pointer",
                }}
              />
              <strong style={{ color: "#0ea5e9" }}>
                2. Select Filled Excel File
              </strong>
            </div>

            {excelData.length > 0 && (
              <div
                style={{
                  marginTop: "20px",
                  background: "#f1f5f9",
                  padding: "15px",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                <strong>{excelData.length} Customers Found!</strong>
                <button
                  onClick={handleBulkImport}
                  disabled={uploading}
                  style={{
                    width: "100%",
                    background: "#10b981",
                    color: "white",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    marginTop: "10px",
                    fontWeight: "bold",
                  }}
                >
                  {uploading ? "Uploading..." : "🚀 Confirm & Upload"}
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setIsExcelModalOpen(false);
                setExcelData([]);
              }}
              style={{
                width: "100%",
                background: "#f1f5f9",
                color: "#475569",
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                marginTop: "15px",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
        .mark-badge { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 900; border: 1px solid #bae6fd; }
        
        .action-btns { display: flex; gap: 8px; }
        .action-btn { border: none; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.2s; }
        .profile-btn { background: #8b5cf6; color: white; }
        .profile-btn:hover { background: #7c3aed; }
        .edit-btn { background: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
        .edit-btn:hover { background: #fde68a; }
        .delete-btn { background: #fee2e2; color: #ef4444; }
        .delete-btn:hover { background: #fca5a5; }

        .no-data { text-align: center; color: #64748b; padding: 30px !important; }

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
