//src/components/UserManagement.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [editUserId, setEditUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get("/api/users"),
        axios.get("/api/roles"),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      console.error("Error fetching data", err);
    } finally {
      setLoading(false);
    }
  };

  // নতুন ইউজার তৈরি বা আপডেট
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !selectedRole) {
      return alert("ইউজারনেম এবং রোল সিলেক্ট করা আবশ্যক!");
    }
    if (!editUserId && !password) {
      return alert("নতুন ইউজারের জন্য পাসওয়ার্ড দেওয়া আবশ্যক!");
    }

    setSubmitting(true);
    try {
      const payload = { username, role: selectedRole };
      if (password) payload.password = password; // পাসওয়ার্ড দিলে তবেই পাঠাবে

      if (editUserId) {
        // 🔥 Update User
        const res = await axios.put(`/api/users/${editUserId}`, payload);
        if (res.data.success) {
          alert("ইউজারের তথ্য সফলভাবে আপডেট হয়েছে!");
        }
      } else {
        // 🔥 Create New User
        const res = await axios.post("/api/users", payload);
        if (res.data.success) {
          alert("নতুন ইউজার সফলভাবে তৈরি হয়েছে!");
        }
      }
      resetForm();
      fetchData(); // লিস্ট আপডেট
    } catch (err) {
      alert(err.response?.data?.error || "ইউজার সেভ করতে সমস্যা হয়েছে!");
    } finally {
      setSubmitting(false);
    }
  };

  // এডিট বাটনে ক্লিক করলে
  const handleEdit = (user) => {
    setEditUserId(user._id);
    setUsername(user.username);
    setPassword(""); // এডিটের সময় পাসওয়ার্ড খালি দেখাবে
    setSelectedRole(user.role ? user.role._id : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ডিলিট বাটনে ক্লিক করলে
  const handleDelete = async (userId) => {
    if (!window.confirm("আপনি কি নিশ্চিত যে এই ইউজারকে ডিলিট করতে চান?"))
      return;
    try {
      const res = await axios.delete(`/api/users/${userId}`);
      if (res.data.success) {
        alert("ইউজার সফলভাবে ডিলিট হয়েছে!");
        fetchData();
      }
    } catch (err) {
      alert("ডিলিট করতে সমস্যা হয়েছে!");
    }
  };

  // ফর্ম রিসেট
  const resetForm = () => {
    setEditUserId(null);
    setUsername("");
    setPassword("");
    setSelectedRole("");
  };

  // ইউজারের স্ট্যাটাস পরিবর্তন
  const toggleUserStatus = async (userId, currentStatus) => {
    const action = currentStatus ? "Disable" : "Active";
    if (
      !window.confirm(`আপনি কি নিশ্চিত যে এই অ্যাকাউন্টটি ${action} করতে চান?`)
    )
      return;

    try {
      const res = await axios.put(`/api/users/${userId}/status`);
      if (res.data.success) fetchData();
    } catch (err) {
      alert("স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে!");
    }
  };

  return (
    <div className="user-page">
      <div className="page-header">
        <h1>👥 User Management</h1>
        <p>নতুন স্টাফ অ্যাকাউন্ট তৈরি করুন এবং তাদের এক্সেস নিয়ন্ত্রণ করুন</p>
      </div>

      <div className="user-grid">
        {/* বাম পাশ: ফর্ম */}
        <div className="form-card">
          <h2>{editUserId ? "✏️ Edit Staff" : "➕ Create New Staff"}</h2>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. rahim_china"
                required
              />
            </div>

            <div className="input-group">
              <label>
                {editUserId
                  ? "New Password (খালি রাখলে আগেরটাই থাকবে)"
                  : "Password"}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  editUserId
                    ? "Leave blank to keep unchanged"
                    : "Enter a strong password"
                }
                required={!editUserId} // এডিটের সময় required নয়
              />
            </div>

            <div className="input-group">
              <label>Assign Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                required
              >
                <option value="" disabled>
                  -- সিলেক্ট করুন --
                </option>
                {roles.map((role) => (
                  <option key={role._id} value={role._id}>
                    {role.roleName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="submit-btn"
                disabled={submitting}
              >
                {submitting
                  ? "Saving..."
                  : editUserId
                    ? "💾 Update User"
                    : "🚀 Create User"}
              </button>
              {editUserId && (
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

        {/* ডান পাশ: ইউজার লিস্ট */}
        <div className="list-card">
          <h2>📋 Staff List</h2>
          {loading ? (
            <p>Loading users...</p>
          ) : users.length === 0 ? (
            <p className="no-data">কোনো স্টাফ অ্যাকাউন্ট পাওয়া যায়নি।</p>
          ) : (
            <div className="table-responsive">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user._id}
                      className={!user.isActive ? "disabled-row" : ""}
                    >
                      <td>
                        <strong>{user.username}</strong>
                      </td>
                      <td>
                        <span className="role-badge">
                          {user.role ? user.role.roleName : "No Role"}
                        </span>
                      </td>
                      <td>
                        {user.isActive ? (
                          <span className="status-badge active">✅ Active</span>
                        ) : (
                          <span className="status-badge inactive">
                            🚫 Disabled
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className={`toggle-btn ${user.isActive ? "btn-warning" : "btn-success"}`}
                            onClick={() =>
                              toggleUserStatus(user._id, user.isActive)
                            }
                            title={
                              user.isActive ? "Disable User" : "Enable User"
                            }
                          >
                            {user.isActive ? "⏸️" : "▶️"}
                          </button>
                          <button
                            className="edit-icon-btn"
                            onClick={() => handleEdit(user)}
                            title="Edit User"
                          >
                            ✏️
                          </button>
                          <button
                            className="delete-icon-btn"
                            onClick={() => handleDelete(user._id)}
                            title="Delete User"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 💅 CSS Styles */}
      <style>{`
        .user-page { padding: 30px; max-width: 1200px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .page-header { margin-bottom: 30px; }
        .page-header h1 { color: #0f172a; font-size: 28px; margin: 0 0 8px 0; }
        .page-header p { color: #64748b; font-size: 15px; margin: 0; }

        .user-grid { display: grid; grid-template-columns: 350px 1fr; gap: 30px; align-items: start; }
        @media (max-width: 850px) { .user-grid { grid-template-columns: 1fr; } }

        .form-card, .list-card { background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        h2 { color: #1e293b; font-size: 18px; margin-top: 0; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }

        .input-group label { display: block; font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 8px; }
        .input-group input, .input-group select { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 15px; margin-bottom: 20px; background: #fff; }
        .input-group input:focus, .input-group select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

        .form-actions { display: flex; gap: 10px; }
        .submit-btn { flex: 1; background: #2563eb; color: white; border: none; padding: 14px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        .submit-btn:hover:not(:disabled) { background: #1d4ed8; }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .cancel-btn { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 14px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .cancel-btn:hover { background: #e2e8f0; color: #0f172a; }

        /* Table Styles */
        .table-responsive { overflow-x: auto; }
        .user-table { width: 100%; border-collapse: collapse; text-align: left; }
        .user-table th { background: #f8fafc; color: #475569; padding: 12px 15px; font-size: 14px; border-bottom: 2px solid #e2e8f0; }
        .user-table td { padding: 15px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; color: #1e293b; font-size: 14px; }
        
        .disabled-row { background-color: #fef2f2; opacity: 0.8; }

        .role-badge { background: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
        
        .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status-badge.active { background: #dcfce7; color: #166534; }
        .status-badge.inactive { background: #fee2e2; color: #991b1b; }

        /* Action Buttons */
        .action-buttons { display: flex; gap: 8px; align-items: center; }
        .toggle-btn, .edit-icon-btn, .delete-icon-btn { border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; transition: 0.2s; font-size: 14px; }
        
        .btn-warning { background: #f59e0b; color: white; }
        .btn-warning:hover { background: #d97706; }
        .btn-success { background: #22c55e; color: white; }
        .btn-success:hover { background: #16a34a; }

        .edit-icon-btn { background: #f1f5f9; }
        .edit-icon-btn:hover { background: #dbeafe; }
        
        .delete-icon-btn { background: #f1f5f9; }
        .delete-icon-btn:hover { background: #fee2e2; }
      `}</style>
    </div>
  );
}
