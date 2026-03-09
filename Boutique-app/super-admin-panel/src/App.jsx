import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";import Dashboard from "./pages/Dashboard/Dashboard";
import Clients from "./pages/Clients/Clients";
import Users from "./pages/Users/Users";
import BoutiqueAdmins from "./pages/BoutiqueAdmins/BoutiqueAdmins";
import Vendors from "./pages/Vendors/Vendors";
import Login from "./pages/Login/Login";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./routes/ProtectedRoute";

import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

function App() {
  return (
      <Router>
        <Routes>

          {/* 🔓 PUBLIC ROUTES */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* 🔒 PROTECTED SUPER ADMIN ROUTES */}
          <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
          >
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="users" element={<Users />} />
            <Route path="admins" element={<BoutiqueAdmins />} />
            <Route path="vendors" element={<Vendors />} />
          </Route>

          {/* 🚫 FALLBACK */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </Router>
  );
}

export default App;
