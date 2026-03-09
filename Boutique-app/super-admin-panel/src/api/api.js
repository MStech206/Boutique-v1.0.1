import axios from "axios";
import { logout } from "./auth";

const api = axios.create({
    baseURL: "/api", // relative path, works for same port
    withCredentials: false, // JWT → no cookies
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url || "";

        const isAuthApi =
            url.includes("/auth/login") ||
            url.includes("/auth/forgot-password") ||
            url.includes("/auth/reset-password");

        if ((status === 401 || status === 403) && !isAuthApi) {
            console.warn("Unauthorized request. Token may be invalid or expired.");
            // Optional: show toast instead of logging out
            // logout();
        }

        console.error("API Error:", error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default api;