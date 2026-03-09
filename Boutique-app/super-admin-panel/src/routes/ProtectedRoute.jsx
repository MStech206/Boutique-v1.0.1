import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const ProtectedRoute = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            // ✅ Refresh Firebase token on session restore — prevents 401 on refresh
            const token = await user.getIdToken(true);
            localStorage.setItem("firebaseToken", token);
            setAuthenticated(true);
          } catch {
            setAuthenticated(false);
          }
        } else {
          localStorage.removeItem("firebaseToken");
          setAuthenticated(false);
        }
        setChecking(false);
      });

    return () => unsubscribe();
  }, []);

  if (checking) return null; // or spinner

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
