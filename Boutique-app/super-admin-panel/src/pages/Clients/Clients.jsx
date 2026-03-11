import React, { useEffect, useState } from "react";
import api from "../../utils/axiosConfig";
import "./Clients.css";
import AddAdminModal from "./AddAdminModal";

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const emptyForm = {
    boutiqueName: "",
    adminEmail: "",
    adminPhone: "",
    address: "",
    status: "active",
  };

  const [formData, setFormData] = useState(emptyForm);
  const [editingClientId, setEditingClientId] = useState(null);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);

  const [expandedClientId, setExpandedClientId] = useState(null);
  const [subAdminsByClient, setSubAdminsByClient] = useState({});

  // Edit Admin modal state
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editAdminForm, setEditAdminForm] = useState({ username: "", password: "" });
  const [editAdminError, setEditAdminError] = useState("");
  const [editAdminLoading, setEditAdminLoading] = useState(false);

  const apiBase = "/super-admin/clients";

  const fetchClients = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(apiBase);
      setClients(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
      setError("Failed to load clients.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubAdmins = async (clientId) => {
    if (subAdminsByClient[clientId]) return;
    try {
      const res = await api.get(`/super-admin/clients/${clientId}/sub-admins`);
      setSubAdminsByClient(prev => ({
        ...prev,
        [clientId]: res.data?.subAdmins || [],
      }));
    } catch (err) {
      console.error("Failed to fetch sub-admins:", err);
      setSubAdminsByClient(prev => ({ ...prev, [clientId]: [] }));
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editingClientId) {
        await api.put(`${apiBase}/${editingClientId}`, formData);
        setEditingClientId(null);
      } else {
        await api.post(apiBase, formData);
      }
      setFormData(emptyForm);
      fetchClients();
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to save client.";
      setError(msg);
    }
  };

  const handleEdit = (client) => {
    setEditingClientId(client.id);
    setFormData({
      boutiqueName: client.boutiqueName || "",
      adminEmail:   client.adminEmail   || "",
      adminPhone:   client.adminPhone   || "",
      address:      client.address      || "",
      status:       client.status       || "active",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingClientId(null);
    setFormData(emptyForm);
    setError("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    try {
      await api.delete(`${apiBase}/${id}`);
      fetchClients();
    } catch (err) {
      console.error("Failed to delete client:", err);
      setError("Failed to delete client.");
    }
  };

  const openEditAdmin = async (clientId) => {
    setEditAdminError("");
    setEditAdminLoading(true);
    setEditingAdmin(null);
    setEditAdminForm({ name: "", email: "", password: "" });
    setShowEditAdminModal(true);
    try {
      const res = await api.get(`/super-admin/clients/${clientId}/main-admin`);
      const admin = res.data?.admin;
      if (admin) {
        setEditingAdmin(admin);
        setEditAdminForm({ name: admin.name || "", email: admin.email || "", password: "" });
      } else {
        setEditAdminError("No main admin found for this client.");
      }
    } catch (err) {
      setEditAdminError(err?.response?.data?.error || "Failed to load admin details.");
    } finally {
      setEditAdminLoading(false);
    }
  };

  const handleSaveAdmin = async () => {
    if (!editingAdmin) return;
    setEditAdminError("");
    setEditAdminLoading(true);
    try {
      const payload = { username: editAdminForm.username.trim() };
      if (editAdminForm.password.trim()) payload.newPassword = editAdminForm.password;
      await api.put(`/super-admin/admins/${editingAdmin.id}/details`, payload);
      setShowEditAdminModal(false);
      fetchClients();
    } catch (err) {
      setEditAdminError(err?.response?.data?.error || "Failed to update admin.");
    } finally {
      setEditAdminLoading(false);
    }
  };

 const formatDate = (ts) => {
     if (!ts) return "—";
     let ms;
     if (ts?._seconds)      ms = ts._seconds * 1000;       // Firestore serialized
     else if (ts?.seconds)  ms = ts.seconds * 1000;        // Firestore SDK
     else if (typeof ts === "string" || typeof ts === "number") ms = new Date(ts).getTime();
     else return "—";
     const d = new Date(ms);
     if (isNaN(d.getTime())) return "—";
     return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
 };

  return (
    <div className="clients-page">
      <h2>Clients</h2>

      {/* ADD / EDIT CLIENT FORM */}
      <div className="client-form card">
        <h5>{editingClientId ? "Edit Client" : "Add Client"}</h5>
        {error && <p style={{ color: "red", marginBottom: 8 }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <input type="text"  name="boutiqueName" placeholder="Boutique Name *"
            value={formData.boutiqueName} onChange={handleChange} required />
          <input type="email" name="adminEmail"   placeholder="Admin Email *"
            value={formData.adminEmail}   onChange={handleChange} required />
          <input type="text"  name="adminPhone"   placeholder="Admin Phone"
            value={formData.adminPhone}   onChange={handleChange} />
          <input type="text"  name="address"      placeholder="Address"
            value={formData.address}      onChange={handleChange} />
          <select name="status" value={formData.status} onChange={handleChange}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button type="submit">{editingClientId ? "Update" : "Add"}</button>
          {editingClientId && (
            <button type="button" onClick={handleCancelEdit}>Cancel</button>
          )}
        </form>
      </div>

      {/* CLIENT CARDS */}
      <div className="clients-list">
        {loading ? (
          <p>Loading...</p>
        ) : clients.length === 0 ? (
          <p>No clients found.</p>
        ) : (
          <div className="clients-grid">
            {clients.map((client) => (
              <div key={client.id} className="client-wrapper">

                <div
                  className={`client-card ${expandedClientId === client.id ? "active" : ""}`}
                  onClick={() => {
                    const next = expandedClientId === client.id ? null : client.id;
                    setExpandedClientId(next);
                    if (next) fetchSubAdmins(client.id);
                  }}
                >
                  <div className="client-header">
                    <h3>{client.boutiqueName}</h3>
                    <span className={`status ${(client.status || "").toLowerCase()}`}>
                      {client.status}
                    </span>
                  </div>

                  <p><strong>Admin Email:</strong> {client.adminEmail}</p>
                  {client.adminPhone && <p><strong>Phone:</strong> {client.adminPhone}</p>}
                  {client.address    && <p className="address">{client.address}</p>}
                  <p><strong>Plan:</strong> {client.plan || "starter"}</p>

                  <div className="client-actions" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleEdit(client)}>Edit Client</button>
                    <button
                      className="secondary"
                      onClick={() => openEditAdmin(client.id)}
                    >
                      Edit Admin
                    </button>
                    <button className="danger" onClick={() => handleDelete(client.id)}>Delete</button>
                    <button className="success" onClick={() => {
                      setSelectedClientId(client.id);
                      setShowAdminModal(true);
                    }}>
                      Add Admin
                    </button>
                  </div>
                </div>

                {/* Expanded: Sub-Admins table */}
                {expandedClientId === client.id && (
                  <div className="branches">
                    <div className="branch-card">
                      <h4>👤 Sub Admins</h4>

                      {!subAdminsByClient[client.id] ? (
                        <p className="muted">Loading...</p>
                      ) : subAdminsByClient[client.id].length === 0 ? (
                        <p className="muted">No sub-admins yet for this client.</p>
                      ) : (
                        <table className="sub-admins-table">
                          <thead>
                            <tr>
                              <th>Username</th>
                              <th>Branch</th>
                              <th>Status</th>
                              <th>Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subAdminsByClient[client.id].map((sa) => (
                              <tr key={sa.id || sa.username}>
                                <td>
                                  <span className="chip">{sa.username || sa.id}</span>
                                </td>
                                <td>{sa.branch || "—"}</td>
                                <td>
                                  <span className={`status ${sa.isActive ? "active" : "inactive"}`}>
                                    {sa.isActive ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td>{formatDate(sa.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD ADMIN MODAL */}
      {showAdminModal && selectedClientId && (
        <AddAdminModal
          clientId={selectedClientId}
          onClose={() => setShowAdminModal(false)}
          onAdminAdded={fetchClients}
        />
      )}

      {/* EDIT MAIN ADMIN MODAL */}
      {showEditAdminModal && (
        <div className="modal-overlay" onClick={() => setShowEditAdminModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Edit Main Admin</h4>
              <button className="modal-close" onClick={() => setShowEditAdminModal(false)}>✕</button>
            </div>

            {editAdminLoading ? (
              <p className="muted" style={{ textAlign: "center", padding: "20px 0" }}>
                Loading admin details…
              </p>
            ) : (
              <>
                {editingAdmin && (
                  <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
                    Editing: <strong>{editingAdmin.username || editingAdmin.id}</strong>
                  </p>
                )}

                <label>Username</label>
                <input
                  type="text"
                  value={editAdminForm.username}
                  onChange={e => setEditAdminForm(p => ({ ...p, username: e.target.value }))}
                  placeholder="Username"
                  autoComplete="off"
                />

                <label>
                  New Password{" "}
                  <span className="muted" style={{ fontSize: 11 }}>(leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={editAdminForm.password}
                  onChange={e => setEditAdminForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="New password"
                  autoComplete="new-password"
                />

                {editAdminError && (
                  <p style={{ color: "red", marginTop: 8, fontSize: 13 }}>{editAdminError}</p>
                )}

                <div className="modal-footer">
                  <button onClick={() => setShowEditAdminModal(false)}>Cancel</button>
                  <button
                    className="success"
                    onClick={handleSaveAdmin}
                    disabled={editAdminLoading}
                  >
                    {editAdminLoading ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Clients;