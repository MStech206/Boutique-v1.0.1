import React, { useEffect, useState } from "react";
import api from "../../utils/axiosConfig";
import "./Users.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    status: "Active"
  });
  const [editingUserId, setEditingUserId] = useState(null);

  const apiBase = "/super-admin/users";

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get(apiBase);
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        await api.put(`${apiBase}/${editingUserId}`, formData);
      } else {
        await api.post(apiBase, formData);
      }
      fetchUsers();
      setFormData({ name: "", email: "", status: "Active" });
      setEditingUserId(null);
    } catch (err) {
      console.error("Failed to save user:", err);
      alert("Failed to save user");
    }
  };

  const handleEdit = (user) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      status: user.status
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`${apiBase}/${id}`);
      fetchUsers();
    } catch (err) {
      console.error("Failed to delete user:", err);
      alert("Failed to delete user");
    }
  };

  return (
      <div className="users-page">
        <h2>Users</h2>

        <div className="user-form card p-3 mb-3">
          <h5>{editingUserId ? "Edit User" : "Add User"}</h5>
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

            <button className="btn btn-success me-2">
              {editingUserId ? "Update" : "Add"}
            </button>

            {editingUserId && (
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingUserId(null);
                      setFormData({ name: "", email: "", status: "Active" });
                    }}
                >
                  Cancel
                </button>
            )}
          </form>
        </div>

        <div className="users-list card p-3">
          <h5>Users List</h5>
          {loading ? (
              <p>Loading...</p>
          ) : users.length > 0 ? (
              <table className="table table-striped table-hover table-bordered">
                <thead className="table-dark">
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.status}</td>
                      <td>
                        <button
                            className="btn btn-sm btn-warning me-2"
                            onClick={() => handleEdit(user)}
                        >
                          Edit
                        </button>
                        <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(user.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
          ) : (
              <p>No users found.</p>
          )}
        </div>
      </div>
  );
}

export default Users;
