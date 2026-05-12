import React, { useState, useEffect } from "react";
import axios from "axios";

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [roleName, setRoleName] = useState("");

  // ডিফল্ট পারমিশন স্টেট
  const defaultPermissions = {
    batch: { view: false, create: false, edit: false, delete: false },
    shipment: { view: false, create: false, edit: false, delete: false },
    branch: { view: false, manage: false },
    billing: { view: false, create: false, revert: false },
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

  // নতুন রোল তৈরি করা
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roleName) return alert("রোলের নাম দিতে হবে!");

    setSubmitting(true);
    try {
      const res = await axios.post("/api/roles", {
        roleName,
        permissions,
      });

      if (res.data.success) {
        alert("নতুন রোল সফলভাবে তৈরি হয়েছে!");
        setRoleName("");
        setPermissions(defaultPermissions); // ফর্ম রিসেট
        fetchRoles(); // লিস্ট আপডেট
      }
    } catch (err) {
      alert(err.response?.data?.error || "রোল তৈরি করতে সমস্যা হয়েছে!");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="role-page">
      <div className="page-header">
        <h1>🛡️ Role & Permission Management</h1>
        <p>সিস্টেমের বিভিন্ন পদের জন্য ক্ষমতা (Access) নির্ধারণ করুন</p>
      </div>

      <div className="role-grid">
        {/* বাম পাশ: নতুন রোল তৈরির ফর্ম */}
        <div className="role-form-card">
          <h2>➕ Create New Role</h2>
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
            </div>

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? "Saving..." : "💾 Save Role"}
            </button>
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
                  </div>
                  <div className="role-badges">
                    {/* একটি ছোট্ট লজিক দিয়ে দেখানো হচ্ছে এই রোলে কী কী পারমিশন আছে */}
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

        .submit-btn { width: 100%; background: #2563eb; color: white; border: none; padding: 14px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; margin-top: 10px; }
        .submit-btn:hover:not(:disabled) { background: #1d4ed8; }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        /* Role List Styles */
        .role-list { display: flex; flex-direction: column; gap: 15px; }
        .role-item { padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
        .role-item-header h3 { margin: 0 0 10px 0; color: #0f172a; font-size: 16px; }
        
        .role-badges { display: flex; flex-direction: column; gap: 8px; }
        .badge-group { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
        .badge-module { font-size: 11px; font-weight: 700; color: #475569; width: 70px; }
        .badge-action { background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
      `}</style>
    </div>
  );
}
