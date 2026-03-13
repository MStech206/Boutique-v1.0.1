import Sidebar from "../components/Sidebar/Sidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { logout } from "../utils/auth";
import logo from "../assets/logo.png";
import "./AdminLayout.css";

function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div className="app-wrapper">
      {/* Header */}
      <header className="admin-header px-4">
        {/* Logo + Title (clickable) */}
        <div
          className="d-flex align-items-center header-left"
          onClick={() => navigate("/")}
        >
          <img
            src={logo}
            alt="SAPTHALA Super Admin"
            className="admin-logo"
            style={{ width: '50px', height: '50px', objectFit: 'contain', borderRadius: '8px' }}
          />
          <span className="admin-title">Super Admin</span>
        </div>

        {/* Logout */}
        <button className="btn btn-danger btn-sm logout-btn" onClick={logout}>
          Logout
        </button>
      </header>

      <div className="layout-body">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
