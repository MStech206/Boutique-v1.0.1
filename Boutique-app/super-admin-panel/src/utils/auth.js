// src/utils/auth.js
import axios from "axios";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
// ==============================
// ✅ AUTH HELPERS
// ==============================

// ✅ Check if user is logged in (Firebase-safe + JWT-safe)
export const isAuthenticated = () => {
    const token =
        localStorage.getItem("firebaseToken") ||
        localStorage.getItem("token"); // backward compatible

    if (!token) return false;

    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const now = Math.floor(Date.now() / 1000);

        // ⏰ Token expired
        if (payload.exp && payload.exp < now) {
            logout();
            return false;
        }

        return true;
    } catch (err) {
        logout();
        return false;
    }
};

// ✅ Login: store token + user info
// type: "superadmin" | "staff"
export const login = ({ id, name, email, token, type = "superadmin" }) => {
    // keep old behavior (do NOT remove)
    localStorage.setItem("token", token);

    if (type === "superadmin") {
        localStorage.setItem("firebaseToken", token);
    }

    if (type === "staff") {
        localStorage.setItem("staffToken", token);
    }

    localStorage.setItem(
        "user",
        JSON.stringify({ id, name, email, type })
    );
};
export const logout = async () => {
    try {
        // 🔥 IMPORTANT: Kill Firebase session
        await signOut(auth);
    } catch (e) {
        console.warn("Firebase signOut failed:", e);
    }

    // 🧹 Clear local storage
    localStorage.removeItem("token");
    localStorage.removeItem("firebaseToken");
    localStorage.removeItem("staffToken");
    localStorage.removeItem("user");

    // 🔁 Force redirect
window.location.replace("/super-admin/#/login");
};

// ==============================
// ✅ AXIOS INSTANCE
// ==============================
            const api = axios.create({
                baseURL: window.location.hostname === 'localhost'
                    ? 'http://localhost:3000/api'
                    : '/api',
                withCredentials: false
            });
// ==============================
// ✅ REQUEST INTERCEPTOR
// ==============================
api.interceptors.request.use(
    (config) => {
        const url = config.url || "";

        // 👷 STAFF APIs → JWT ONLY
        if (url.startsWith("/staff")) {
            const staffToken = localStorage.getItem("staffToken");
            if (staffToken) {
                config.headers.Authorization = `Bearer ${staffToken}`;
            }
            return config;
        }

        // 👑 SUPER ADMIN APIs → FIREBASE ONLY
        const firebaseToken = localStorage.getItem("firebaseToken");
        if (firebaseToken) {
            config.headers.Authorization = `Bearer ${firebaseToken}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ==============================
// ✅ RESPONSE INTERCEPTOR
// ==============================
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url || "";

        const isAuthApi =
            url.includes("/auth/login") ||
            url.includes("/staff/auth");

        // 🔒 Logout ONLY on 401 (expired / invalid token)
        if (status === 401 && !isAuthApi) {
            console.warn("Unauthorized. Logging out...");
            logout();
            return Promise.resolve({ data: null });
        }

        // 🚫 403 = forbidden (do NOT logout)
        if (status === 403) {
            console.warn("Forbidden: insufficient permissions");
        }

        return Promise.reject(error);
    }
);

export default api;
