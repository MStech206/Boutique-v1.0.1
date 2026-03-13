import React, { useState, useEffect } from 'react';
import api from "../../utils/axiosConfig";
import './BoutiqueAdmins.css';

function BoutiqueAdmins() {
  const [admins, setAdmins] = useState([]);
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState([
    { label: "Total Admins", value: 0, color: "primary" },
    { label: "Active Admins", value: 0, color: "success" },
    { label: "Inactive Admins", value: 0, color: "warning" },
  ]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);

  const emptyForm = {
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'admin',        // ✅ lowercase matches Firestore + server
    status: 'Active',
    clientId: '',
  };

  const [formData, setFormData] = useState(emptyForm);

  const API_URL = "/super-admin/admins";
  const CLIENTS_URL = "/super-admin/clients";

  // ── Fetch admins from /users flat collection ──────────────
  const fetchAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(API_URL);
      const raw = Array.isArray(res.data) ? res.data : (res.data?.admins || []);
      const data = raw.filter(a => a.role === 'admin');
      setAdmins(data);
      setStats([
        { label: "Total Admins", value: data.length, color: "primary" },
        { label: "Active Admins", value: data.filter(a => a.status === "Active" || a.isActive).length, color: "success" },
        { label: "Inactive Admins", value: data.filter(a => a.status !== "Active" && !a.isActive).length, color: "warning" },
      ]);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch admins");
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch clients for dropdown ────────────────────────────
  const fetchClients = async () => {
    try {
      const res = await api.get(CLIENTS_URL);
      const data = Array.isArray(res.data) ? res.data : (res.data?.clients || []);
      setClients(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAdmins();
    fetchClients();
  }, []);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingAdmin(null);
    setShowForm(false);
    setError(null);
  };

  // ── Save admin ────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingAdmin) {
        // ✅ PUT /api/super-admin/admins/:adminId (username is the doc ID)
        await api.put(`${API_URL}/${editingAdmin.id}`, {
          name: formData.name,
          email: formData.email,
          status: formData.status,
          role: formData.role,
          isActive: formData.status === 'Active',
        });
      } else {
        // ✅ POST /api/super-admin/admins — saves to /users/{username}
        await api.post(API_URL, {
          clientId: formData.clientId,
          name: formData.name,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          role: formData.role,
          status: formData.status,
          permissions: {
            canEdit: true,
            canDelete: true,
            canViewReports: true,
            canManageStaff: true,
            canManageAdmins: formData.role === 'admin',
          },
          isActive: formData.status === 'Active',
          branch: '',
          lastLogin: null,
        });
      }

      resetForm();
      fetchAdmins();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || "Failed to save admin";
      setError(msg);
    }
  };

  const handleEdit = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name || '',
      email: admin.email || '',
      username: admin.username || admin.id || '',
      password: '',               // never pre-fill password
      role: admin.role || 'admin',
      status: admin.status || (admin.isActive ? 'Active' : 'Inactive'),
      clientId: admin.clientId || admin.adminId || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ DELETE /api/super-admin/admins/:adminId
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this admin?")) return;
    try {
      await api.delete(`${API_URL}/${id}`);
      fetchAdmins();
    } catch (err) {
      console.error(err);
      setError("Failed to delete admin");
    }
  };

  if (loading) return <p>Loading admins...</p>;

  return (
    <div className="admins-page">
      <h2 className="page-title">Boutique Admins</h2>

      {/* ── Stats ── */}
      <div className="stats-cards">
        {stats.map((stat, idx) => (
          <div key={idx} className={`card bg-${stat.color} text-white`}>
            <div className="card-body text-center">
              <h5>{stat.label}</h5>
              <p className="fs-3">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add/Cancel button ── */}
      <button
        className="btn btn-primary mb-3"
        onClick={() => {
          if (showForm) { resetForm(); } else { setShowForm(true); }
        }}
      >
        {showForm ? 'Cancel' : '+ Add Admin'}
      </button>

      {/* ── Error ── */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* ── Form ── */}
      {showForm && (
        <div className="card mb-3 p-3 form-card">
          <h5>{editingAdmin ? "Edit Admin" : "Add Admin"}</h5>
          <form onSubmit={handleSubmit}>

            <input
              className="form-control mb-2"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Full Name"
              required
            />

            <input
              className="form-control mb-2"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              required
            />

            <input
              className="form-control mb-2"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Username (used for login)"
              required
              disabled={!!editingAdmin}  // username is doc ID — cannot change
            />

            <input
              className="form-control mb-2"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={editingAdmin ? "Leave blank to keep password" : "Password"}
              required={!editingAdmin}
              minLength={6}
            />

            {/* ✅ Role values match Firestore: "admin" | "sub-admin" */}
            <select
              className="form-control mb-2"
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="admin">Admin</option>
              <option value="sub-admin">Sub Admin</option>
            </select>

            <select
              className="form-control mb-2"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            {/* Client dropdown — only for new admin */}
            {!editingAdmin && (
              <select
                className="form-control mb-2"
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                required
              >
                <option value="">Select Client / Boutique</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.boutiqueName}
                  </option>
                ))}
              </select>
            )}

            <button className="btn btn-success" type="submit">
              {editingAdmin ? "Update" : "Add Admin"}
            </button>
          </form>
        </div>
      )}

      {/* ── Admin Table ── */}
      <div className="admins-table card p-3">
        <h5>Admin List</h5>
        {admins.length === 0 ? (
          <p className="text-muted">No admins found.</p>
        ) : (
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Boutique</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin.id}>
                  <td><code>{admin.id}</code></td>
                  <td>{admin.name || '—'}</td>
                  <td>{admin.email}</td>
                  <td>
                    <span className={`badge bg-${admin.role === 'admin' ? 'primary' : 'secondary'}`}>
                      {admin.role}
                    </span>
                  </td>
                  <td>
                    {admin.boutiqueName ? (
                      <span className="badge bg-info text-dark">{admin.boutiqueName}</span>
                    ) : admin.adminId ? (
                      <span className="badge bg-light text-dark">{admin.adminId}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge bg-${admin.isActive || admin.status === 'Active' ? 'success' : 'warning'}`}>
                      {admin.isActive || admin.status === 'Active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-warning me-2"
                      onClick={() => handleEdit(admin)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(admin.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default BoutiqueAdmins;