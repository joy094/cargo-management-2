// src/components/AddBranch.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import CanAccess from "./CanAccess";
import * as XLSX from "xlsx";
import "./AddBranch.css"; // 🔥 নতুন CSS ফাইল ইম্পোর্ট

export default function AddBranch() {
  const [branches, setBranches] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");

  const [formData, setFormData] = useState({
    branchName: "",
    shippingMark: "",
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

  const [unassignedCount, setUnassignedCount] = useState(0);

  useEffect(() => {
    fetchBranches();
    fetchBatches();
    fetchUnassignedCount(); // এটি নতুন যুক্ত হয়েছে
  }, []);

  const fetchUnassignedCount = async () => {
    try {
      const res = await axios.get("/api/branches/unassigned-shipments");
      if (Array.isArray(res.data)) {
        setUnassignedCount(res.data.length);
      }
    } catch (err) {
      console.error("Error fetching unassigned count:", err);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await axios.get("/api/batches");
      if (res.data.success) {
        setBatches(res.data.batches || res.data.data);
      } else if (Array.isArray(res.data)) {
        setBatches(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch batches", error);
    }
  };

  const fetchBranches = async (batchId = "") => {
    try {
      const url = batchId ? `/api/branches?batch=${batchId}` : "/api/branches";
      const res = await axios.get(url);
      if (res.data.success) {
        setBranches(res.data.branches);
      }
    } catch (error) {
      console.error("Failed to fetch branches", error);
    }
  };

  const handleBatchChange = (e) => {
    const batchId = e.target.value;
    setSelectedBatch(batchId);
    fetchBranches(batchId);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.branchName || !formData.shippingMark) {
      return alert("Branch Name এবং Shipping Mark অবশ্যই দিতে হবে!");
    }

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
        shippingMarks: marksArray,
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
      fetchBranches(selectedBatch);
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
      fetchBranches(selectedBatch);
    } catch (error) {
      alert("ডিলিট করতে সমস্যা হয়েছে!");
    }
  };

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
      fetchBranches(selectedBatch);
    } catch (error) {
      alert(error.response?.data?.error || "আপলোড করতে সমস্যা হয়েছে!");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="manage-branch-container">
      {/* 🔥 Animated Missing Shipping Mark Alert */}
      {unassignedCount > 0 && (
        <div
          className="unassigned-alert-banner"
          onClick={() => navigate("/unassigned")}
        >
          <span className="alert-icon">⚠️</span>
          <div className="alert-text">
            <strong>{unassignedCount}</strong> Unassigned Shipping Mark(s)
            detected! Please assign them to a branch.
          </div>
          <span className="arrow-action">View All ➡️</span>
        </div>
      )}

      {/* Header Section */}
      <div className="header-section">
        <div className="header-text">
          <h2>🏢 Branch & Customer Management</h2>
          <p>
            
          </p>
        </div>

        <CanAccess module="branch" action="create">
          <button
            className="excel-upload-btn"
            onClick={() => setIsExcelModalOpen(true)}
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
              <small className="help-text">
                একাধিক মার্ক থাকলে কমা (,) দিয়ে লিখুন।
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

        {/* Right Side: List Table */}
        <div className="list-card">
          <div className="list-header">
            <h3>Registered Branches ({branches.length})</h3>

            <div className="filter-group">
              <span>Filter:</span>
              <select value={selectedBatch} onChange={handleBatchChange}>
                <option value="">🌍 All Batches</option>
                {batches &&
                  batches.length > 0 &&
                  batches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.batchName || b.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="table-responsive-container">
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
                        <div className="mark-badge-container">
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
                          title="Open Profile in New Tab"
                          onClick={() => {
                            const markToPass =
                              branch.shippingMarks &&
                              branch.shippingMarks.length > 0
                                ? branch.shippingMarks[0]
                                : branch.shippingMark;
                            const url = `/branch-profile?mark=${encodeURIComponent(markToPass)}`;
                            window.open(url, "_blank", "noopener,noreferrer");
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
                      কোনো ব্রাঞ্চ পাওয়া যায়নি।
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
        <div className="modal-overlay">
          <div className="excel-modal-content">
            <h3>📤 Bulk Upload Customers</h3>
            <p className="modal-desc">
              এক ক্লিকে একাধিক ব্রাঞ্চ/কাস্টমার যুক্ত করুন
            </p>

            <button className="download-btn" onClick={downloadTemplate}>
              📥 1. Download Excel Format
            </button>

            <div className="upload-box">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
              />
              <strong>2. Select Filled Excel File</strong>
            </div>

            {excelData.length > 0 && (
              <div className="upload-summary">
                <strong>{excelData.length} Customers Found!</strong>
                <button
                  onClick={handleBulkImport}
                  disabled={uploading}
                  className="confirm-upload-btn"
                >
                  {uploading ? "Uploading..." : "🚀 Confirm & Upload"}
                </button>
              </div>
            )}

            <button
              className="modal-cancel-btn"
              onClick={() => {
                setIsExcelModalOpen(false);
                setExcelData([]);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
