import { useState, useRef, useEffect } from "react";
import { loginUser, registerUser, forgotPassword, verifyOtp, resetPassword } from "../../api/api";
import api from "../../api/api";
import AadhaarVerify from "../AadhaarVerify/AadhaarVerify";
import "./Auth.css";

// Constants
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Reusable Field
function Field({ label, name, type = "text", placeholder, options, value, onChange, error }) {
  return (
    <div className="auth-field">
      <label className="auth-label">{label}</label>
      {options ? (
        <select
          className={`auth-input${error ? " auth-input--error" : ""}`}
          value={value}
          onChange={e => onChange(name, e.target.value)}
        >
          <option value="" disabled hidden>{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          className={`auth-input${type === "date" ? " auth-input-date" : ""}${error ? " auth-input--error" : ""}`}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(name, e.target.value)}
        />
      )}
      {error && <span className="auth-field-error">{error}</span>}
    </div>
  );
}

// Main Auth Component
export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState("signin");
  const [apiLoading, setApiLoading] = useState(false);

  // Sign In
  const [signinData, setSigninData] = useState({ username: "", password: "" });
  const [signinError, setSigninError] = useState("");
  const [showSigninPass, setShowSigninPass] = useState(false);

  // Sign Up
  const [signupData, setSignupData] = useState({
    fullName: "", phone: "",
    gender: "", dob: "", bloodGroup: "",
    email: "", aadharNumber: "", password: "",
    patientId: "",
  });
  const [signupErrors, setSignupErrors] = useState({});
  const [showSignupPass, setShowSignupPass] = useState(false);
  const [aadhaarVerification, setAadhaarVerification] = useState(null);
  const [idStatus, setIdStatus] = useState(""); // "available" | "taken" | "invalid" | ""
  const [idChecking, setIdChecking] = useState(false);

  // OTP / Reset
  const [otpInput, setOtpInput] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [timer, setTimer] = useState(60);

  // Forgot / Reset Password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [resetError, setResetError] = useState("");

  const timerRef = useRef(null);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (mode === "otp" && !otpSuccess && timer > 0) {
      timerRef.current = setTimeout(() => setTimer(t => t - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [mode, otpSuccess, timer]);

  // Handlers
  const switchTo = (m) => {
    setMode(m);
    setSigninError("");
    setSignupErrors({});
  };

  const idCheckTimer = useRef(null);

  const handleSignupChange = (field, val) => {
    // Force lowercase for patientId
    if (field === "patientId") val = val.toLowerCase().replace(/[^a-z0-9._]/g, "");
    setSignupData(d => ({ ...d, [field]: val }));
    if (signupErrors[field]) setSignupErrors(e => ({ ...e, [field]: "" }));

    // Live check patient ID availability
    if (field === "patientId") {
      setIdStatus("");
      if (idCheckTimer.current) clearTimeout(idCheckTimer.current);
      if (val.length >= 3) {
        setIdChecking(true);
        idCheckTimer.current = setTimeout(async () => {
          try {
            const res = await api.post("/auth/check-userid", { userId: val, role: "patient" });
            if (res.data.available) setIdStatus("available");
            else setIdStatus(res.data.error || "taken");
          } catch {
            setIdStatus("");
          } finally {
            setIdChecking(false);
          }
        }, 500);
      }
    }
  };

  const validateSignup = () => {
    const errs = {};
    if (!signupData.fullName.trim()) errs.fullName = "Required";
    if (!/^\d{10}$/.test(signupData.phone)) errs.phone = "Enter valid 10-digit number";
    if (!signupData.gender) errs.gender = "Required";
    if (!signupData.dob) errs.dob = "Required";
    if (!signupData.bloodGroup) errs.bloodGroup = "Required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupData.email)) errs.email = "Enter valid email";
    if (!/^\d{12}$/.test(signupData.aadharNumber)) errs.aadharNumber = "Enter valid 12-digit Aadhar number";
    if (signupData.password.length < 8) errs.password = "Min 8 characters";
    return errs;
  };

  const handleSignupSubmit = async () => {
    const errs = validateSignup();
    if (Object.keys(errs).length > 0) { setSignupErrors(errs); return; }
    setSignupErrors({});
    setApiLoading(true);

    try {
      const res = await registerUser({
        name: signupData.fullName.trim(),
        email: signupData.email.trim().toLowerCase(),
        password: signupData.password,
        role: "patient",
        phone: signupData.phone,
        gender: signupData.gender.toLowerCase(),
        dob: signupData.dob,
        dateOfBirth: signupData.dob,
        bloodGroup: signupData.bloodGroup,
        aadharNumber: signupData.aadharNumber,
        patientId: signupData.patientId || undefined,
      });

      setMode("success");
      setTimeout(() => {
        onAuthenticated(res.data.user, res.data.token);
      }, 1500);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || data?.error || "Registration failed. Please try again.";
      // Show as a general signup error so it's clearly visible
      setSignupErrors({ _general: msg });
    } finally {
      setApiLoading(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const arr = [...otpInput]; arr[i] = val; setOtpInput(arr);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKey = (i, e) => {
    if (e.key === "Backspace" && !otpInput[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleVerifyOtp = async () => {
    const otp = otpInput.join("");
    if (otp.length !== 6) { setOtpError("Please enter the full 6-digit OTP."); return; }
    setApiLoading(true);

    try {
      await verifyOtp(forgotEmail, otp);
      setOtpSuccess(true);
      setOtpError("");
      setTimeout(() => {
        setMode("reset");
        setOtpSuccess(false);
      }, 1500);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Incorrect OTP. Please try again.");
    } finally {
      setApiLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotError("Please enter a valid email.");
      return;
    }
    setForgotError("");
    setApiLoading(true);

    try {
      await forgotPassword(forgotEmail);
      setTimer(60);
      setOtpInput(["", "", "", "", "", ""]);
      setOtpError("");
      setOtpSuccess(false);
      setMode("otp");
    } catch (err) {
      setForgotError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setApiLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }
    setResetError("");
    setApiLoading(true);

    try {
      const otp = otpInput.join("");
      await resetPassword(forgotEmail, otp, newPassword);
      setMode("reset-success");
      setTimeout(() => {
        setMode("signin");
        setForgotEmail("");
        setNewPassword("");
      }, 2000);
    } catch (err) {
      setResetError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setApiLoading(false);
    }
  };

  const handleResend = async () => {
    setApiLoading(true);
    try {
      await forgotPassword(forgotEmail);
      setTimer(60);
      setOtpInput(["", "", "", "", "", ""]);
      setOtpError("");
      setOtpSuccess(false);
    } catch (err) {
      setOtpError("Failed to resend OTP.");
    } finally {
      setApiLoading(false);
    }
  };

  const handleSignin = async (e) => {
    e.preventDefault();
    if (!signinData.username || !signinData.password) {
      setSigninError("Please enter both email/ID and password.");
      return;
    }
    setSigninError("");
    setApiLoading(true);

    try {
      const res = await loginUser({
        email: signinData.username,
        identifier: signinData.username,
        password: signinData.password,
        role: "patient",
      });

      onAuthenticated(res.data.user, res.data.token);
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed. Please try again.";
      setSigninError(msg);
    } finally {
      setApiLoading(false);
    }
  };

  // Render
  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow--tr" />
      <div className="auth-glow auth-glow--bl" />
      <div className="auth-glow auth-glow--mid" />

      <div className="auth-container">
        {/* Brand */}
        <div className="auth-brand">
          <img src='../src/assets/logo.png' alt="NEXIVA Logo" className="auth-logo-img" />
          <h1 className="auth-brand-name">NEXIVA</h1>
          <p className="auth-brand-sub">Patient Management Portal</p>
        </div>

        {/* Card */}
        <div className="auth-card">

          {/* SIGN IN */}
          {mode === "signin" && (
            <div>
              <h2 className="auth-heading">Welcome back</h2>
              <p className="auth-subheading">Sign in to your patient account</p>

              <form className="auth-form" onSubmit={handleSignin}>
                <div className="auth-field">
                  <label className="auth-label">Email or Patient ID</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Enter your email or patient ID"
                    value={signinData.username}
                    onChange={e => setSigninData(d => ({ ...d, username: e.target.value }))}
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-wrap">
                    <input
                      type={showSigninPass ? "text" : "password"}
                      className="auth-input"
                      placeholder="Enter your password"
                      value={signinData.password}
                      onChange={e => setSigninData(d => ({ ...d, password: e.target.value }))}
                    />
                    <button type="button" className="auth-eye-btn" onClick={() => setShowSigninPass(p => !p)}>
                      {showSigninPass ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {signinError && (
                  <div className="auth-alert"><p>{signinError}</p></div>
                )}

                <div className="auth-forgot">
                  <button type="button" className="auth-link-btn" onClick={() => setMode("forgot")}>
                    Forgot password?
                  </button>
                </div>

                <button type="submit" className="auth-btn-primary" disabled={apiLoading}>
                  {apiLoading ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <div className="auth-switch">
                <p>
                  Don't have an account?{" "}
                  <button className="auth-link-btn" onClick={() => switchTo("signup")}>
                    Click here to Sign Up
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* SIGN UP */}
          {mode === "signup" && (
            <div>
              <h2 className="auth-heading">Create Account</h2>
              <p className="auth-subheading">Register as a new patient on NEXIVA</p>

              <div className="auth-fields">
                <Field label="Full Name" name="fullName" placeholder="John Doe"
                  value={signupData.fullName} onChange={handleSignupChange} error={signupErrors.fullName} />

                <div className="auth-grid-2">
                  <Field label="Phone Number" name="phone" type="tel" placeholder="10-digit number"
                    value={signupData.phone} onChange={handleSignupChange} error={signupErrors.phone} />
                  <Field label="Gender" name="gender" placeholder="Select gender"
                    options={["Male", "Female", "Other"]}
                    value={signupData.gender} onChange={handleSignupChange} error={signupErrors.gender} />
                </div>

                <div className="auth-grid-2">
                  <Field label="Date of Birth" name="dob" type="date" placeholder=""
                    value={signupData.dob} onChange={handleSignupChange} error={signupErrors.dob} />
                  <Field label="Blood Group" name="bloodGroup" placeholder="Select"
                    options={BLOOD_GROUPS}
                    value={signupData.bloodGroup} onChange={handleSignupChange} error={signupErrors.bloodGroup} />
                </div>

                <Field label="Email ID" name="email" type="email" placeholder="you@example.com"
                  value={signupData.email} onChange={handleSignupChange} error={signupErrors.email} />

                {/* Patient ID — optional, like Instagram username */}
                <div className="auth-field">
                  <label className="auth-label">Choose Your ID <span style={{ color: "#64748b", fontWeight: 400 }}>(optional)</span></label>
                  <input
                    type="text"
                    className={`auth-input${signupErrors.patientId ? " auth-input--error" : ""}`}
                    placeholder="e.g. jainil.jain or rahul_99"
                    value={signupData.patientId}
                    onChange={e => handleSignupChange("patientId", e.target.value)}
                  />
                  {signupData.patientId.length >= 3 && (
                    <span style={{
                      fontSize: 12,
                      fontWeight: 600,
                      marginTop: 4,
                      display: "block",
                      color: idChecking ? "#64748b" : idStatus === "available" ? "#22c55e" : "#ef4444"
                    }}>
                      {idChecking ? "Checking..." : idStatus === "available" ? "Available!" : idStatus || ""}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "#64748b", marginTop: 2, display: "block" }}>
                    Lowercase letters, numbers, dots & underscores. Leave empty for auto-generated ID.
                  </span>
                  {signupErrors.patientId && <span className="auth-field-error">{signupErrors.patientId}</span>}
                </div>

                <Field label="Aadhar Number" name="aadharNumber" placeholder="12-digit number"
                  value={signupData.aadharNumber} onChange={handleSignupChange} error={signupErrors.aadharNumber} />

                {/* Aadhaar OCR Verification */}
                <AadhaarVerify
                  formData={{
                    fullName: signupData.fullName,
                    dob: signupData.dob,
                    gender: signupData.gender?.toLowerCase(),
                    aadharNumber: signupData.aadharNumber,
                  }}
                  onVerified={(result) => setAadhaarVerification(result)}
                />

                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-wrap">
                    <input
                      type={showSignupPass ? "text" : "password"}
                      className={`auth-input${signupErrors.password ? " auth-input--error" : ""}`}
                      placeholder="Min. 8 characters"
                      value={signupData.password}
                      onChange={e => handleSignupChange("password", e.target.value)}
                    />
                    <button type="button" className="auth-eye-btn" onClick={() => setShowSignupPass(p => !p)}>
                      {showSignupPass ? "Hide" : "Show"}
                    </button>
                  </div>
                  {signupErrors.password && <span className="auth-field-error">{signupErrors.password}</span>}
                </div>

                {signupErrors._general && (
                  <div className="auth-alert"><p>{signupErrors._general}</p></div>
                )}

                <button className="auth-btn-primary" onClick={handleSignupSubmit} disabled={apiLoading}>
                  {apiLoading ? "Creating Account..." : "Create Account"}
                </button>
              </div>

              <div className="auth-switch">
                <p>
                  Already have an account?{" "}
                  <button className="auth-link-btn" onClick={() => switchTo("signin")}>
                    Click here to Login
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* FORGOT PASSWORD */}
          {mode === "forgot" && (
            <div className="auth-forgot-panel">
              <h2 className="auth-heading">Forgot Password?</h2>
              <p className="auth-subheading">Enter your email to receive a verification code</p>

              <form className="auth-form" onSubmit={handleForgotSubmit}>
                <div className="auth-field">
                  <label className="auth-label">Email Address</label>
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                  />
                  {forgotError && <span className="auth-field-error">{forgotError}</span>}
                </div>

                <button type="submit" className="auth-btn-primary" disabled={apiLoading}>
                  {apiLoading ? "Sending..." : "Send OTP"}
                </button>
              </form>

              <div className="auth-switch">
                <button className="auth-link-btn" onClick={() => setMode("signin")}>
                  Back to Login
                </button>
              </div>
            </div>
          )}

          {/* OTP VERIFICATION */}
          {mode === "otp" && !otpSuccess && (
            <div className="auth-otp">
              <h2 className="auth-heading">Verify Your Email</h2>
              <p style={{ color: "#3d5280", fontSize: 13, marginBottom: 4, fontWeight: 500 }}>
                We sent a 6-digit OTP to
              </p>
              <p className="auth-otp-email">{forgotEmail}</p>

              <div className="auth-otp-boxes">
                {otpInput.map((v, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text"
                    maxLength={1}
                    value={v}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    className={[
                      "auth-otp-box",
                      v ? "auth-otp-box--filled" : "",
                      otpError && !v ? "auth-otp-box--error" : "",
                    ].join(" ").trim()}
                  />
                ))}
              </div>

              {otpError && (
                <div className="auth-alert" style={{ marginBottom: 14 }}>
                  <p>{otpError}</p>
                </div>
              )}

              <button className="auth-btn-primary" onClick={handleVerifyOtp} disabled={apiLoading}>
                {apiLoading ? "Verifying..." : "Verify OTP"}
              </button>

              <p className="auth-otp-resend" style={{ marginTop: 14 }}>
                {timer > 0
                  ? <>Resend in <span>{timer}s</span></>
                  : <button className="auth-link-btn" onClick={handleResend} disabled={apiLoading}>Resend OTP</button>
                }
              </p>
              <button className="auth-otp-back" onClick={() => setMode("forgot")}>
                Back
              </button>
            </div>
          )}

          {/* NEW PASSWORD */}
          {mode === "reset" && (
            <div className="auth-reset-panel">
              <h2 className="auth-heading">Set New Password</h2>
              <p className="auth-subheading">Choose a strong password for your account</p>

              <form className="auth-form" onSubmit={handleResetPassword}>
                <div className="auth-field">
                  <label className="auth-label">New Password</label>
                  <div className="auth-input-wrap">
                    <input
                      type={showNewPass ? "text" : "password"}
                      className="auth-input"
                      placeholder="Min. 8 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                    <button type="button" className="auth-eye-btn" onClick={() => setShowNewPass(p => !p)}>
                      {showNewPass ? "Hide" : "Show"}
                    </button>
                  </div>
                  {resetError && <span className="auth-field-error">{resetError}</span>}
                </div>

                <button type="submit" className="auth-btn-primary" disabled={apiLoading}>
                  {apiLoading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </div>
          )}

          {/* SUCCESS STATES */}
          {otpSuccess && (
            <div className="auth-success">
              <div className="auth-success-icon">✓</div>
              <h2>Verified!</h2>
              <p>Your email has been successfully verified.</p>
            </div>
          )}

          {mode === "success" && (
            <div className="auth-success">
              <div className="auth-success-icon">✓</div>
              <h2>Welcome to NEXIVA!</h2>
              <p>Account created! Redirecting to dashboard...</p>
            </div>
          )}

          {mode === "reset-success" && (
            <div className="auth-success">
              <div className="auth-success-icon">✓</div>
              <h2>Password Reset!</h2>
              <p>Your password has been updated. Returning to login...</p>
            </div>
          )}

        </div>

        <p className="auth-footer">&copy; 2026 NEXIVA - Secure Patient Portal</p>
      </div>
    </div>
  );
}
