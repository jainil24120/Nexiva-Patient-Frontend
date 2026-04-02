import axios from "axios";

const API_BASE_URL = "http://localhost:4000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request (patient-specific key with legacy fallback)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("patientToken") || localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses — retry once before logging out
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    // 503 = DB temporarily unavailable — retry once
    if (status === 503 && !error.config._retried503) {
      error.config._retried503 = true;
      await new Promise((r) => setTimeout(r, 2000));
      return api(error.config);
    }

    // 401 = token might be expired or transient error
    // Skip for login endpoints — 401 there means wrong credentials, not expired token
    const url = error.config?.url || "";
    const isLoginRoute = url.includes("/auth/login");

    if (status === 401 && !isLoginRoute) {
      // Retry once if token exists (could be a transient backend issue)
      if (!error.config._retried401 && localStorage.getItem("token")) {
        error.config._retried401 = true;
        await new Promise((r) => setTimeout(r, 1000));
        return api(error.config);
      }

      // After retry still 401 — token is truly invalid, clear and reload
      localStorage.removeItem("patientToken");
      localStorage.removeItem("patientProfile");
      localStorage.removeItem("token");
      localStorage.removeItem("userProfile");
      window.location.reload();
    }

    return Promise.reject(error);
  }
);

// ── Auth ──
export const loginUser = (data) => api.post("/auth/login", data);
export const registerUser = (data) => api.post("/auth/register", data);
export const forgotPassword = (email, role = "patient") => api.post("/auth/forgot-password", { email, role });
export const verifyOtp = (email, otp, role = "patient") => api.post("/auth/verify-otp", { email, otp, role });
export const resetPassword = (email, otp, newPassword, role = "patient") =>
  api.post("/auth/reset-password", { email, otp, newPassword, role });
export const changePassword = (currentPassword, newPassword) =>
  api.put("/auth/change-password", { currentPassword, newPassword });
export const getMe = () => api.get("/auth/me");

// ── Patient Profile ──
export const getPatientProfile = () => api.get("/patient/profile");
export const createPatientProfile = (data) => api.post("/patient/profile", data);
export const updatePatientProfile = (data) => api.patch("/patient/profile", data);

// ── Allergies ──
export const getAllergies = () => api.get("/patient/allergies");
export const addAllergy = (data) => api.post("/patient/allergies", data);
export const updateAllergy = (allergyId, data) => api.put(`/patient/allergies/${allergyId}`, data);
export const deleteAllergy = (allergyId) => api.delete(`/patient/allergies/${allergyId}`);

// ── My Data ──
export const getMyHospitals = () => api.get("/patient/my-hospitals");
export const getMyVisits = () => api.get("/patient/my-visits");
export const getMyReports = () => api.get("/patient/my-reports");
export const getMyPrescriptions = () => api.get("/prescriptions");

// ── Reports ──
export const uploadReport = (formData) =>
  api.post("/report/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const downloadReport = (reportId) =>
  api.get(`/report/download/${reportId}`, { responseType: "blob" });

// ── Appointments ──
export const bookAppointment = (data) => api.post("/appointment/book", data);
export const getMyAppointments = () => api.get("/appointment/my-appointments");

export default api;
