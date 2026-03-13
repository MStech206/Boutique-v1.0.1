import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import "./Login.css";
import logo from '../../assets/logo.png';

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 🔥 Firebase login (Super Admin) — uses provided credentials
      // Email: mstechno2323@gmail.com, Password: superadmin@123
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // 🔐 Get fresh Firebase ID token
      const token = await userCredential.user.getIdToken(true);

      // 💾 Store token in localStorage for Axios
      localStorage.setItem('token', token);
      localStorage.setItem('firebaseToken', token);

      // store user meta
      localStorage.setItem('user', JSON.stringify({ id: userCredential.user.uid, email }));

      // ✅ Redirect to dashboard
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      alert(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="login-container">
        <div className="card shadow-lg p-4 login-card">
          {/* Logo */}
          <div className="text-center mb-3">
            <img 
              src={logo}
              alt="SAPTHALA Logo" 
              style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '12px', marginBottom: '10px' }}
            />
          </div>
          
           <p className="text-center mb-4 text-muted">Super Admin Portal</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
              />
            </div>

            {/* 🔹 Forgot password link */}
            <p
                className="text-primary text-center mt-2"
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/forgot-password")}
            >
              Forgot password?
            </p>

            <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
  );
}

export default Login;
