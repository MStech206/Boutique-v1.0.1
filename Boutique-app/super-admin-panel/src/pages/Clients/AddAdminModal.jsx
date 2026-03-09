import React, { useState } from "react";
import api from "../../utils/axiosConfig";
import "./AddAdminModal.css";

function AddAdminModal({ clientId, onClose, onAdminAdded }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "admin",
    status: "Active",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ✅ Correct endpoint: POST /api/super-admin/admins
      // ✅ Payload matches Firestore /users/{username} structure
      await api.post(`/super-admin/admins`, {
        clientId,                          // which boutique this admin belongs to
        name: formData.name,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: formData.role,               // "admin" | "sub-admin"
        status: formData.status,
        // ✅ Permissions matching Firestore structure from image
        permissions: {
          canEdit: true,
          canDelete: true,
          canViewReports: true,
          canManageStaff: true,
          canManageAdmins: formData.role === "admin",
        },
        isActive: formData.status === "Active",
        branch: "",
        lastLogin: null,
      });

      onAdminAdded();
      onClose();
    } catch (err) {
      console.error("Failed to add admin:", err);
      const msg = err?.response?.data?.error || "Failed to add admin. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop d-flex justify-content-center align-items-center">
      <div className="modal-card card shadow-sm p-4">
        <div className="modal-header mb-3">
          <h5 className="modal-title">Add Boutique Admin</h5>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>

        {error && (
          <div className="alert alert-danger py-2 mb-3">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="mb-3">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              className="form-control"
              placeholder="e.g. Rakesh Kumar"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Email */}
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-control"
              placeholder="e.g. admin@rakesh.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Username — used as Firestore doc ID in /users/{username} */}
          <div className="mb-3">
            <label className="form-label">
              Username <small className="text-muted">(used for login)</small>
            </label>
            <input
              type="text"
              name="username"
              className="form-control"
              placeholder="e.g. admin"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          {/* Password */}
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-control"
              placeholder="Min 6 characters"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          {/* Role */}
          <div className="mb-3">
            <label className="form-label">Role</label>
            <select
              name="role"
              className="form-select"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="admin">Admin (full access)</option>
              <option value="sub-admin">Sub Admin (limited access)</option>
            </select>
          </div>

          {/* Status */}
          <div className="mb-3">
            <label className="form-label">Status</label>
            <select
              name="status"
              className="form-select"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <button
              type="submit"
              className="btn btn-success"
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Admin"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddAdminModal;