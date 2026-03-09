import React, { useState, useEffect } from "react";
import api from "../../utils/axiosConfig";
import "./Vendors.css";

function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState([
    { label: "Total Vendors", value: 0, color: "primary" },
    { label: "Active Vendors", value: 0, color: "success" },
    { label: "Inactive Vendors", value: 0, color: "warning" }
  ]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    status: "Active"
  });

  const apiBase ="/super-admin/vendors";

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await api.get(apiBase);
      // Handle both array and object responses
      const data = Array.isArray(res.data) ? res.data : (res.data?.vendors || []);

      setVendors(data);
      setStats([
        { label: "Total Vendors", value: data.length, color: "primary" },
        { label: "Active Vendors", value: data.filter(v => v.status === "Active").length, color: "success" },
        { label: "Inactive Vendors", value: data.filter(v => v.status !== "Active").length, color: "warning" }
      ]);
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
      setError("Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleChange = (e) =>
      setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVendor) {
        await api.put(`${apiBase}/${editingVendor.id}`, formData);
      } else {
        await api.post(apiBase, formData);
      }
      setFormData({ name: "", email: "", status: "Active" });
      setEditingVendor(null);
      setShowForm(false);
      fetchVendors();
    } catch (err) {
      console.error("Failed to save vendor:", err);
      alert("Failed to save vendor");
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      email: vendor.email,
      status: vendor.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vendor?")) return;
    try {
      await api.delete(`${apiBase}/${id}`);
      fetchVendors();
    } catch (err) {
      console.error("Failed to delete vendor:", err);
      alert("Failed to delete vendor");
    }
  };

  if (loading) return <p>Loading vendors...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
      <div className="vendors-page">
        <h2 className="page-title">Vendors</h2>

        <div className="stats-cards mb-3">
          {stats.map((stat, idx) => (
              <div key={idx} className={`card bg-${stat.color} text-white`}>
                <div className="card-body text-center">
                  <h5>{stat.label}</h5>
                  <p className="fs-3">{stat.value}</p>
                </div>
              </div>
          ))}
        </div>

        <button
            className="btn btn-primary mb-3"
            onClick={() => {
              setShowForm(!showForm);
              setEditingVendor(null);
              setFormData({ name: "", email: "", status: "Active" });
            }}
        >
          {showForm ? "Cancel" : "Add Vendor"}
        </button>

        {showForm && (
            <div className="card mb-3 p-3 form-card">
              <h5>{editingVendor ? "Edit Vendor" : "Add Vendor"}</h5>
              <form onSubmit={handleSubmit}>
                <input
                    className="form-control mb-2"
                    name="name"
                    placeholder="Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />
                <input
                    className="form-control mb-2"
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />
                <select
                    className="form-control mb-2"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <button className="btn btn-success">
                  {editingVendor ? "Update" : "Add"}
                </button>
              </form>
            </div>
        )}

        <div className="vendors-table card p-3">
          <h5>Vendor List</h5>
          <table className="table table-striped table-hover table-bordered">
            <thead className="table-dark">
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
            </thead>
            <tbody>
            {vendors.length > 0 ? (
                vendors.map(vendor => (
                    <tr key={vendor.id}>
                      <td>{vendor.id}</td>
                      <td>{vendor.name}</td>
                      <td>{vendor.email}</td>
                      <td>{vendor.status}</td>
                      <td>
                        <button
                            className="btn btn-sm btn-warning me-2"
                            onClick={() => handleEdit(vendor)}
                        >
                          Edit
                        </button>
                        <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(vendor.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                ))
            ) : (
                <tr>
                  <td colSpan="5" className="text-center text-muted">
                    No vendors found
                  </td>
                </tr>
            )}
            </tbody>
          </table>
        </div>
      </div>
  );
}

export default Vendors;
