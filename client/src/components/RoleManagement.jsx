//src/components/RoleManagement.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
// 🔥 এটি নতুন করে যুক্ত করতে হবে
import { Link } from "react-router-dom";

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // এডিট করার জন্য নতুন স্টেট
  const [editRoleId, setEditRoleId] = useState(null);
  const [roleName, setRoleName] = useState("");

  // 🔥 আপডেট করা ডিফল্ট পারমিশন স্টেট (Branch & Payment আপডেট সহ)
  const defaultPermissions = {
    batch: { view: false, create: false, edit: false, delete: false },
    shipment: { view: false, create: false, edit: false, delete: false },
    branch: { view: false, create: false, edit: false, delete: false }, // Manage সরিয়ে CRUD দেওয়া হলো
    billing: { view: false, create: false, revert: false },
    payment: { view: false, create: false, delete: false }, // নতুন পেমেন্ট মডিউল
  };

  const [permissions, setPermissions] = useState(defaultPermissions);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await axios.get("/api/roles");
      setRoles(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching roles", err);
      setLoading(false);
    }
  };

  // চেকবক্স চেঞ্জ করার ফাংশন
  const handleCheckboxChange = (module, action) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module][action],
      },
    }));
  };

  // ফর্ম সাবমিট (Create & Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roleName) return alert("রোলের নাম দিতে হবে!");

    setSubmitting(true);
    try {
      if (editRoleId) {
        // 🔥 Update Request
        const res = await axios.put(`/api/roles/${editRoleId}`, {
          roleName,
          permissions,
        });
        if (res.data.success) {
          alert("রোল সফলভাবে আপডেট হয়েছে!");
        }
      } else {
        // 🔥 Create Request
        const res = await axios.post("/api/roles", {
          roleName,
          permissions,
        });
        if (res.data.success) {
          alert("নতুন রোল সফলভাবে তৈরি হয়েছে!");
        }
      }
      resetForm();
      fetchRoles();
    } catch (err) {
      alert(err.response?.data?.error || "রোল সেভ করতে সমস্যা হয়েছে!");
    } finally {
      setSubmitting(false);
    }
  };

  // 🔥 ডিলিট ফাংশন
  const handleDelete = async (id) => {
    if (!window.confirm("আপনি কি নিশ্চিত যে এই রোলটি ডিলিট করতে চান?")) return;
    try {
      const res = await axios.delete(`/api/roles/${id}`);
      if (res.data.success) {
        alert("রোল ডিলিট হয়েছে!");
        fetchRoles();
      }
    } catch (err) {
      alert("ডিলিট করতে সমস্যা হয়েছে!");
    }
  };

  // 🔥 এডিট বাটনে ক্লিক করলে ফর্ম ফিলআপ হবে
  const handleEdit = (role) => {
    setEditRoleId(role._id);
    setRoleName(role.roleName);

    // পুরানো পারমিশনগুলোর সাথে নতুন ফরম্যাট মার্চ করা (যাতে এরর না আসে)
    const mergedPermissions = JSON.parse(JSON.stringify(defaultPermissions));
    if (role.permissions) {
      Object.keys(role.permissions).forEach((mod) => {
        if (mergedPermissions[mod]) {
          Object.keys(role.permissions[mod]).forEach((act) => {
            // যদি আগে 'manage' থেকে থাকে, তবে সেটি ইগনোর করবে বা নতুনটিতে ম্যাপ করবে
            if (mergedPermissions[mod][act] !== undefined) {
              mergedPermissions[mod][act] = role.permissions[mod][act];
            }
          });
        }
      });
    }
    setPermissions(mergedPermissions);

    // পেজের উপরে স্ক্রল করা
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ফর্ম রিসেট
  const resetForm = () => {
    setRoleName("");
    setPermissions(defaultPermissions);
    setEditRoleId(null);
  };

  return (
    <div className="role-page">
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <div>
          <h1
            style={{ color: "#0f172a", fontSize: "28px", margin: "0 0 8px 0" }}
          >
            🛡️ Role & Permission Management
          </h1>
          <p style={{ color: "#64748b", fontSize: "15px", margin: 0 }}>
            সিস্টেমের বিভিন্ন পদের জন্য ক্ষমতা (Access) নির্ধারণ করুন
          </p>
        </div>

        {/* 🔥 নতুন যুক্ত করা বাটন */}
        <Link to="/admin/users" className="goto-user-btn">
          👥 Manage Users (স্টাফ তালিকা)
        </Link>
      </div>
      <div className="role-grid">
        {/* বাম পাশ: রোল তৈরির/এডিট ফর্ম */}
        <div className="role-form-card">
          <h2>{editRoleId ? "✏️ Edit Role" : "➕ Create New Role"}</h2>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Role Name (e.g. China Admin, BD Cashier)</label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="Enter role name..."
                required
              />
            </div>

            <div className="permissions-section">
              <h3>Set Permissions</h3>

              {/* Batch Permissions */}
              <div className="perm-module">
                <h4>📦 Batch Module</h4>
                <div className="checkbox-group">
                  {Object.keys(permissions.batch).map((action) => (
                    <label key={`batch-${action}`} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={permissions.batch[action]}
                        onChange={() => handleCheckboxChange("batch", action)}
                      />
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              {/* Shipment Permissions */}
              <div className="perm-module">
                <h4>🚚 Shipment Module</h4>
                <div className="checkbox-group">
                  {Object.keys(permissions.shipment).map((action) => (
                    <label
                      key={`shipment-${action}`}
                      className="checkbox-label"
                    >
                      <input
                        type="checkbox"
                        checked={permissions.shipment[action]}
                        onChange={() =>
                          handleCheckboxChange("shipment", action)
                        }
                      />
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              {/* Branch Permissions */}
              <div className="perm-module">
                <h4>🏢 Branch Profile</h4>
                <div className="checkbox-group">
                  {Object.keys(permissions.branch).map((action) => (
                    <label key={`branch-${action}`} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={permissions.branch[action]}
                        onChange={() => handleCheckboxChange("branch", action)}
                      />
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              {/* Billing Permissions */}
              <div className="perm-module">
                <h4>💵 Billing & Invoice</h4>
                <div className="checkbox-group">
                  {Object.keys(permissions.billing).map((action) => (
                    <label key={`billing-${action}`} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={permissions.billing[action]}
                        onChange={() => handleCheckboxChange("billing", action)}
                      />
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Permissions */}
              <div className="perm-module">
                <h4>💰 Payment Allocation</h4>
                <div className="checkbox-group">
                  {Object.keys(permissions.payment).map((action) => (
                    <label key={`payment-${action}`} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={permissions.payment[action]}
                        onChange={() => handleCheckboxChange("payment", action)}
                      />
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="submit-btn"
                disabled={submitting}
              >
                {submitting
                  ? "Saving..."
                  : editRoleId
                    ? "💾 Update Role"
                    : "💾 Save Role"}
              </button>
              {editRoleId && (
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

        {/* ডান পাশ: তৈরি করা রোলের লিস্ট */}
        <div className="role-list-card">
          <h2>📜 Existing Roles</h2>
          {loading ? (
            <p>Loading roles...</p>
          ) : roles.length === 0 ? (
            <p className="no-data">কোনো রোল তৈরি করা হয়নি।</p>
          ) : (
            <div className="role-list">
              {roles.map((role) => (
                <div key={role._id} className="role-item">
                  <div className="role-item-header">
                    <h3>{role.roleName}</h3>
                    <div className="action-btns">
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(role)}
                        title="Edit Role"
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(role._id)}
                        title="Delete Role"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="role-badges">
                    {Object.entries(role.permissions).map(
                      ([module, actions]) => {
                        const activeActions = Object.keys(actions).filter(
                          (k) => actions[k] === true,
                        );
                        if (activeActions.length === 0) return null;
                        return (
                          <div key={module} className="badge-group">
                            <span className="badge-module">
                              {module.toUpperCase()}:
                            </span>
                            {activeActions.map((act) => (
                              <span key={act} className="badge-action">
                                {act}
                              </span>
                            ))}
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 💅 CSS Styles */}
      <style>{`

      /* Go to User Button Style */
        .goto-user-btn {
          background: #10b981; /* সুন্দর সবুজ কালার */
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
          transition: all 0.3s ease;
        }
        .goto-user-btn:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 6px 10px -1px rgba(16, 185, 129, 0.3);
        }
        .role-page { padding: 30px; max-width: 1200px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .page-header { margin-bottom: 30px; }
        .page-header h1 { color: #0f172a; font-size: 28px; margin: 0 0 8px 0; }
        .page-header p { color: #64748b; font-size: 15px; margin: 0; }

        .role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; align-items: start; }
        @media (max-width: 768px) { .role-grid { grid-template-columns: 1fr; } }

        .role-form-card, .role-list-card { background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        h2 { color: #1e293b; font-size: 20px; margin-top: 0; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }

        .input-group label { display: block; font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 8px; }
        .input-group input { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 15px; margin-bottom: 20px; }
        .input-group input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

        .permissions-section h3 { font-size: 16px; color: #334155; margin-bottom: 15px; }
        .perm-module { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 15px; }
        .perm-module h4 { margin: 0 0 10px 0; font-size: 14px; color: #0f172a; }
        
        .checkbox-group { display: flex; flex-wrap: wrap; gap: 15px; }
        .checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #475569; cursor: pointer; }
        .checkbox-label input { width: 16px; height: 16px; cursor: pointer; accent-color: #2563eb; }

        .form-actions { display: flex; gap: 10px; margin-top: 15px; }
        .submit-btn { flex: 1; background: #2563eb; color: white; border: none; padding: 14px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        .submit-btn:hover:not(:disabled) { background: #1d4ed8; }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .cancel-btn { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 14px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        .cancel-btn:hover { background: #e2e8f0; color: #0f172a; }

        /* Role List Styles */
        .role-list { display: flex; flex-direction: column; gap: 15px; }
        .role-item { padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; transition: box-shadow 0.2s; }
        .role-item:hover { box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .role-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }
        .role-item-header h3 { margin: 0; color: #0f172a; font-size: 16px; font-weight: 700; }
        
        /* Edit & Delete Buttons */
        .action-btns { display: flex; gap: 8px; }
        .action-btns button { background: none; border: none; cursor: pointer; font-size: 16px; padding: 5px; border-radius: 6px; transition: background 0.2s; }
        .edit-btn:hover { background: #dbeafe; }
        .delete-btn:hover { background: #fee2e2; }

        .role-badges { display: flex; flex-direction: column; gap: 8px; }
        .badge-group { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
        .badge-module { font-size: 11px; font-weight: 700; color: #475569; width: 75px; }
        .badge-action { background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
      `}</style>
    </div>
  );
}
