import axios from "axios";
import { logout } from "./auth";
import { getFirebaseToken } from "../firebase";

// ==============================
// ✅ SUPER ADMIN AXIOS INSTANCE
// ==============================
const api = axios.create({
    // Use same-origin API by default so dev server (node) or packaged server handles /api
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',

    withCredentials: false // Firebase → no cookies
});

// ==============================
// ✅ REQUEST INTERCEPTOR
// ==============================
api.interceptors.request.use(
    async (config) => {
        // ✅ Always attach Firebase ID token (stored by Login component)
        // Server will verify it with firebase-admin and map to User role
        const token = localStorage.getItem('token') || localStorage.getItem('firebaseToken');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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

        // 🔐 ONLY logout on 401 (token expired / invalid)
        if (status === 401) {
            console.warn("Firebase token expired → logging out");
            logout();

            // prevent UI crash
            return Promise.resolve({ data: null });
        }

        // 🚫 403 = NOT super admin → do NOT logout
        if (status === 403) {
            console.warn("Forbidden: user is not SUPER_ADMIN");
            return Promise.reject(error);
        }

        console.error("API Error:", error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default api;
