import { NavLink, useNavigate } from 'react-router-dom';
import './Sidebar.css';
import { logout } from '../../utils/auth'; // ✅ no need to check isAuthenticated here

function Sidebar() {
  const navigate = useNavigate();

  // 🔒 Logout handler
  const handleLogout = () => {
    logout(); // clear token/session
    navigate('/login'); // redirect to login
  };

  return (
    <div className="sidebar">
       <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active-link' : ''}>
          Dashboard
        </NavLink>
        <NavLink to="/clients" className={({ isActive }) => isActive ? 'active-link' : ''}>
          Clients
        </NavLink>
        <NavLink to="/admins" className={({ isActive }) => isActive ? 'active-link' : ''}>
          Boutique Admins
        </NavLink>
        <NavLink to="/vendors" className={({ isActive }) => isActive ? 'active-link' : ''}>
          Others
        </NavLink>
        <NavLink to="/users" className={({ isActive }) => isActive ? 'active-link' : ''}>
          Others feature
        </NavLink>

        
      </nav>
    </div>
  );
}

export default Sidebar;
