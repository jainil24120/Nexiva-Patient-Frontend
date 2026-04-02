import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FiUser,
  FiEdit3,
  FiSave,
  FiCamera,
  FiShield,
  FiKey
} from "react-icons/fi";
import { getPatientProfile, updatePatientProfile, changePassword, forgotPassword, verifyOtp, resetPassword } from "../../api/api";
import AadhaarVerify from "../AadhaarVerify/AadhaarVerify";
import "./Profile.css";

const Profile = ({ user: globalUser, onUpdate }) => {
  const [user, setUser] = useState({
    name: globalUser?.name || "",
    email: globalUser?.email || "",
    phone: globalUser?.phone || "",
    gender: globalUser?.gender || "",
    dateOfBirth: globalUser?.dateOfBirth || "",
    bloodGroup: globalUser?.bloodGroup || "",
    avatar: globalUser?.avatar || localStorage.getItem("userAvatar") || "",
    patientId: globalUser?.userId || "",
    aadharNumber: globalUser?.aadharNumber || "",
    address: "",
    heightCm: "",
    weightKg: "",
  });

  const [activeTab, setActiveTab] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");
  const [aadhaarVerification, setAadhaarVerification] = useState(null);

  const tabs = [
    { id: "personal", name: "Personal Info", icon: <FiUser /> },
    { id: "medical", name: "Medical History", icon: <FiShield /> },
    { id: "security", name: "Security", icon: <FiKey /> }
  ];

  // Fetch patient profile on mount
  useEffect(() => {
    getPatientProfile()
      .then((res) => {
        const p = res.data.data;
        setUser((prev) => ({
          ...prev,
          phone: p.phone || prev.phone,
          gender: p.gender || prev.gender,
          dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split("T")[0] : prev.dateOfBirth,
          bloodGroup: p.bloodGroup || prev.bloodGroup,
          address: p.address || "",
          heightCm: p.heightCm || "",
          weightKg: p.weightKg || "",
          aadharNumber: p.adharcard_no || prev.aadharNumber,
          patientId: p.patient_id || prev.patientId,
          avatar: p.avatar || prev.avatar,
        }));
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg("");
    try {
      await updatePatientProfile({
        phone: user.phone,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        bloodGroup: user.bloodGroup,
        address: user.address,
        heightCm: user.heightCm ? Number(user.heightCm) : undefined,
        weightKg: user.weightKg ? Number(user.weightKg) : undefined,
        avatar: user.avatar || undefined,
      });
      setIsEditing(false);
      setStatusMsg("Profile updated successfully!");
      if (onUpdate) {
        onUpdate({
          ...globalUser,
          phone: user.phone,
          gender: user.gender,
          dateOfBirth: user.dateOfBirth,
          bloodGroup: user.bloodGroup,
          avatar: user.avatar,
          address: user.address,
          heightCm: user.heightCm,
          weightKg: user.weightKg,
        });
      }
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err) {
      setStatusMsg(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pwStep, setPwStep] = useState("current"); // "current" | "email-otp" | "otp" | "new"
  const [currentPw, setCurrentPw] = useState("");
  const [otpEmail, setOtpEmail] = useState(user.email || globalUser?.email || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePasswordDirect = async () => {
    if (!currentPw || !newPassword || !confirmPassword) { setPwError("Fill all fields"); return; }
    if (newPassword !== confirmPassword) { setPwError("Passwords do not match"); return; }
    if (newPassword.length < 8) { setPwError("Min 8 characters"); return; }
    setPwLoading(true);
    setPwError("");
    try {
      await changePassword(currentPw, newPassword);
      alert("Password changed successfully!");
      setShowPasswordDialog(false);
      resetPwState();
    } catch (err) {
      setPwError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setPwLoading(false);
    }
  };

  const handleForgotSendOtp = async () => {
    setPwLoading(true);
    setPwError("");
    try {
      await forgotPassword(otpEmail);
      setPwStep("otp");
    } catch (err) {
      setPwError(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setPwLoading(false);
    }
  };

  const handleOtpVerifyAndReset = async () => {
    if (!otp || !newPassword || !confirmPassword) { setPwError("Fill all fields"); return; }
    if (newPassword !== confirmPassword) { setPwError("Passwords do not match"); return; }
    if (newPassword.length < 8) { setPwError("Min 8 characters"); return; }
    setPwLoading(true);
    setPwError("");
    try {
      await resetPassword(otpEmail, otp, newPassword);
      alert("Password changed successfully!");
      setShowPasswordDialog(false);
      resetPwState();
    } catch (err) {
      setPwError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setPwLoading(false);
    }
  };

  const resetPwState = () => {
    setPwStep("current");
    setCurrentPw("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setPwError("");
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Profile picture must be less than 2MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      if (base64.length > 4000000) { alert("Image too large."); return; }
      setUser((prev) => ({ ...prev, avatar: base64 }));
      localStorage.setItem("userAvatar", base64);
      // Propagate avatar to App state so Sidebar updates immediately
      if (onUpdate) {
        onUpdate({ ...globalUser, avatar: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  const firstName = user.name?.split(" ")[0] || globalUser?.name?.split(" ")[0] || "";
  const lastName = user.name?.split(" ").slice(1).join(" ") || "";

  return (
    <motion.div className="profile-container">
      {/* HEADER */}
      <div className="profile-header">
        <h1 className="page-title">Profile Settings</h1>
        <button
          className="btn-primary"
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          disabled={saving}
        >
          {isEditing ? (
            <>{saving ? "Saving..." : <><FiSave /> Save Changes</>}</>
          ) : (
            <><FiEdit3 /> Edit Profile</>
          )}
        </button>
      </div>

      {statusMsg && (
        <div style={{ padding: "8px 16px", margin: "0 0 16px", borderRadius: 8, background: statusMsg.includes("success") ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: statusMsg.includes("success") ? "#22c55e" : "#ef4444", fontSize: 13 }}>
          {statusMsg}
        </div>
      )}

      {/* PROFILE CARD */}
      <div className="profile-main-card">
        <div className="profile-avatar-section">
          <div className="avatar-container">
            {user.avatar ? (
              <img src={user.avatar} alt="Profile" />
            ) : (
              <div className="avatar-initial">{(user.name || "P").charAt(0).toUpperCase()}</div>
            )}
            {isEditing && (
              <>
                <input type="file" accept="image/*" id="avatarUpload" style={{ display: "none" }} onChange={handleAvatarChange} />
                <label htmlFor="avatarUpload" className="avatar-upload"><FiCamera /></label>
              </>
            )}
          </div>
          <div className="profile-basic-info">
            <h2>{user.name || `${firstName} ${lastName}`}</h2>
            <p>{user.email}</p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="profile-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`profile-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="tab-content">
        {loadingProfile && (
          <div style={{ textAlign: "center", padding: 20, color: "#64748b" }}>Loading profile...</div>
        )}

        {/* PERSONAL INFO */}
        {activeTab === "personal" && !loadingProfile && (
          <div className="form-grid">
            <div className="form-section">
              <h3>Basic Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input name="name" value={user.name} onChange={handleChange} disabled />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input name="email" value={user.email} onChange={handleChange} disabled />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input type="date" name="dateOfBirth" value={user.dateOfBirth} onChange={handleChange} disabled={!isEditing} />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select name="gender" value={user.gender} onChange={handleChange} disabled={!isEditing}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Patient ID</label>
                  <input value={user.patientId} disabled />
                </div>
                <div className="form-group">
                  <label>Aadhar Number</label>
                  <input value={user.aadharNumber ? `****-****-${user.aadharNumber.slice(-4)}` : ""} disabled />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Contact Information</h3>
              <div className="form-group">
                <label>Phone</label>
                <input name="phone" value={user.phone} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input name="address" value={user.address} onChange={handleChange} disabled={!isEditing} />
              </div>
            </div>

            {/* Aadhaar Verification */}
            <div className="form-section" style={{ gridColumn: "1 / -1" }}>
              <h3>Aadhaar Verification</h3>
              <AadhaarVerify
                formData={{
                  name: user.name,
                  dob: user.dateOfBirth,
                  gender: user.gender,
                  aadharNumber: user.aadharNumber,
                }}
                onVerified={(result) => setAadhaarVerification(result)}
              />
            </div>
          </div>
        )}

        {/* MEDICAL HISTORY */}
        {activeTab === "medical" && !loadingProfile && (
          <div className="medical-history">
            <div className="medical-card">
              <h3>Medical Information</h3>
              <div className="medical-grid">
                <div className="medical-item">
                  <label>Blood Group</label>
                  <input name="bloodGroup" value={user.bloodGroup} onChange={handleChange} disabled={!isEditing} />
                </div>
                <div className="medical-item">
                  <label>Height (cm)</label>
                  <input name="heightCm" value={user.heightCm} onChange={handleChange} disabled={!isEditing} />
                </div>
                <div className="medical-item">
                  <label>Weight (kg)</label>
                  <input name="weightKg" value={user.weightKg} onChange={handleChange} disabled={!isEditing} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY */}
        {activeTab === "security" && (
          <div className="security-settings">
            <div className="security-card">
              <h3>Password</h3>
              <p>Change your account password</p>
              <button className="btn-outline" onClick={() => { setShowPasswordDialog(true); resetPwState(); }}>
                Change Password
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PASSWORD CHANGE DIALOG */}
      {showPasswordDialog && (
        <div className="password-dialog-overlay">
          <div className="password-dialog">
            <h2>Change Password</h2>

            {/* Method: Direct (know current password) */}
            {pwStep === "current" && (
              <>
                <label>Current Password</label>
                <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Enter current password" />
                <label>New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
                <label>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />

                {pwError && <p style={{ color: "#ef4444", fontSize: 13, margin: "8px 0" }}>{pwError}</p>}

                <button className="btn-primary" onClick={handleChangePasswordDirect} disabled={pwLoading}>
                  {pwLoading ? "Updating..." : "Update Password"}
                </button>
                <p style={{ fontSize: 12, color: "#64748b", margin: "12px 0 4px", textAlign: "center" }}>
                  Forgot your current password?{" "}
                  <button style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 12 }} onClick={() => { setPwStep("email-otp"); setPwError(""); setOtpEmail(user.email); }}>
                    Reset via OTP
                  </button>
                </p>
              </>
            )}

            {/* Method: OTP - send email */}
            {pwStep === "email-otp" && (
              <>
                <label>Email</label>
                <input type="email" value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} placeholder="Your email" />
                {pwError && <p style={{ color: "#ef4444", fontSize: 13, margin: "8px 0" }}>{pwError}</p>}
                <button className="btn-primary" onClick={handleForgotSendOtp} disabled={pwLoading}>
                  {pwLoading ? "Sending..." : "Send OTP"}
                </button>
              </>
            )}

            {/* Method: OTP - enter OTP + new password */}
            {pwStep === "otp" && (
              <>
                <label>OTP (check your email)</label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit OTP" />
                <label>New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
                <label>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
                {pwError && <p style={{ color: "#ef4444", fontSize: 13, margin: "8px 0" }}>{pwError}</p>}
                <button className="btn-primary" onClick={handleOtpVerifyAndReset} disabled={pwLoading}>
                  {pwLoading ? "Resetting..." : "Reset Password"}
                </button>
              </>
            )}

            <button className="btn-outline" onClick={() => setShowPasswordDialog(false)}>Cancel</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Profile;
