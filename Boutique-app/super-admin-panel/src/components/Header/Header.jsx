import Sidebar from "../components/Sidebar/Sidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { logout } from "../../utils/auth";
import logo from '../../assets/logo.png';
import './AdminLayout.css';

function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout(); // auth.js handles redirect to /super-admin/#/login
  };

  return (
      <div className="app-wrapper">
        <header className="admin-header d-flex align-items-center justify-content-between px-4 py-2 shadow-sm bg-light">
          <div className="d-flex align-items-center">
            <img
              src={logo}
              alt="Super Admin Logo"
              className="admin-logo rounded-circle me-3 border border-2 border-secondary"
              onClick={() => navigate("/")}
            />
            <h2 className="m-0 fw-bold">Super Admin</h2>
          </div>

          <button
              className="btn btn-danger"
              onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <div className="d-flex">
          <Sidebar />
          <div className="main-content flex-grow-1 p-4">
            <Outlet />
          </div>
        </div>
      </div>
  );
}

export default AdminLayout;
