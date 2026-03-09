import { signOut } from "firebase/auth";
import { auth } from "../../firebase"; // ✅ adjust path if needed

const LogoutButton = () => {

  const handleLogout = async () => {
    try {
      // ✅ Sign out from Firebase — clears Firebase session
      await signOut(auth);
    } catch (e) {
      console.warn("Firebase signOut error:", e.message);
    }

    // ✅ Clear all stored tokens and user data
    localStorage.removeItem("token");
    localStorage.removeItem("firebaseToken");
    localStorage.removeItem("user");

    // ✅ Force full page reload to /super-admin/#/login
    // Using window.location.replace instead of navigate()
    // so Firebase Auth state is fully reset before React re-renders
    window.location.replace("/super-admin/#/login");
  };

  return (
    <button
      className="btn btn-danger w-100"
      onClick={handleLogout}
    >
      Logout
    </button>
  );
};

export default LogoutButton;